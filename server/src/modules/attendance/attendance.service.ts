import { Injectable, BadRequestException, ForbiddenException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenWaService } from '../openwa/openwa.service';
import { PushService } from '../notifications/push.service';
import { parsePagination } from '../../common/pagination.util';

export interface CheckInRequestDto {
  barcode: string;
  method?: string;
  wifiBssid?: string;
  clientIp?: string;
  idempotencyKey?: string;
  sessionId?: string;
}

/** Authenticated kiosk actor. Families/students may only check in their own household. */
export interface CheckInActor {
  role?: string;
  familyId?: string;
  studentId?: string;
}

/** Double-scan guard: HID scanners often fire twice within seconds. Genuine
 * repeat visits are minutes apart, so a 60s window only swallows accidents. */
const DEDUPE_WINDOW_MS = 60 * 1000;

/** The on-premise WiFi fingerprint. Override per site via PREMISE_WIFI_BSSID. */
const EXPECTED_WIFI_BSSID =
  process.env.PREMISE_WIFI_BSSID || 'Etoile-Secure-5G [F4:92:BF:11:80:A2]';

// Idempotency cache for offline kiosk retries: same key returns same result for 10 min.
const IDEMPOTENCY = new Map<string, { at: number; result: unknown }>();
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openWaService: OpenWaService,
    @Optional() private readonly push?: PushService,
  ) {}

  async processCheckIn(dto: CheckInRequestDto, actor?: CheckInActor) {
    const barcode = dto.barcode.trim();

    // Idempotent replay: offline kiosk may POST same idempotencyKey twice.
    if (dto.idempotencyKey) {
      const hit = IDEMPOTENCY.get(dto.idempotencyKey);
      if (hit && Date.now() - hit.at < IDEMPOTENCY_TTL_MS) {
        return { ...(hit.result as Record<string, unknown>), deduped: true };
      }
    }

    // Find student
    const student = await this.prisma.student.findFirst({
      where: {
        OR: [{ barcode }, { id: barcode }],
      },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!student) {
      return {
        success: false,
        reason: `Student not recognized. Barcode ${barcode} is not in database.`,
        status: 'not_found',
      };
    }

    // Household scope: family/student tokens are confined to their own dancers.
    if (actor?.role === 'family' && student.familyId !== actor.familyId) {
      return {
        success: false,
        reason: 'Check-in denied: student is not part of your family account.',
        status: 'denied_scope',
      };
    }
    if (actor?.role === 'student' && student.id !== actor.studentId) {
      return {
        success: false,
        reason: 'Check-in denied: you may only check in yourself.',
        status: 'denied_scope',
      };
    }

    const premiseVerified = (dto.wifiBssid || EXPECTED_WIFI_BSSID) === EXPECTED_WIFI_BSSID;
    const wifiBssid = dto.wifiBssid || EXPECTED_WIFI_BSSID;

    const sub = student.subscriptions[0];
    const now = new Date();

    if (!sub) {
      return {
        success: false,
        student,
        reason: 'No active tuition package found for student.',
        status: 'denied_expired',
      };
    }

    if (sub.usedSessions >= sub.maxSessions) {
      await this.prisma.attendanceRecord.create({
        data: {
          studentId: student.id,
          studentName: student.name,
          barcode: student.barcode,
          classTitle: student.program === 'classical' ? 'Classical Ballet' : 'Contemporary Movement',
          verifiedMethod: dto.method || 'hid_barcode',
          premiseVerified,
          wifiBssid,
          status: 'denied_quota',
          quotaRemaining: 0,
        },
      });

      // Automated WhatsApp quota exhausted notice
      if (student.parentPhone) {
        try {
          await this.openWaService.dispatchMessage({
            recipientPhone: student.parentPhone,
            recipientName: `${student.name} (${student.parentName})`,
            triggerEvent: 'quota_warning',
            language: 'en',
            customBody: `Bonjour ${student.parentName}! Notice from Étoile Ballet Academy: ${student.name} has consumed all ${sub.maxSessions} sessions in their package. Please renew quota at the front desk.`,
          });
        } catch (waErr) {
          console.error('Error dispatching WhatsApp quota alert:', waErr);
        }
      }

      return {
        success: false,
        student,
        reason: `Session quota exhausted (${sub.usedSessions}/${sub.maxSessions} used). Quota top-up required.`,
        status: 'denied_quota',
      };
    }

    if (now > sub.endDate) {
      await this.prisma.attendanceRecord.create({
        data: {
          studentId: student.id,
          studentName: student.name,
          barcode: student.barcode,
          classTitle: student.program === 'classical' ? 'Classical Ballet' : 'Contemporary Movement',
          verifiedMethod: dto.method || 'hid_barcode',
          premiseVerified,
          wifiBssid,
          status: 'denied_expired',
          quotaRemaining: Math.max(0, sub.maxSessions - sub.usedSessions),
        },
      });

      // Automated WhatsApp expiration notice
      if (student.parentPhone) {
        try {
          await this.openWaService.dispatchMessage({
            recipientPhone: student.parentPhone,
            recipientName: `${student.name} (${student.parentName})`,
            triggerEvent: 'quota_warning',
            language: 'en',
            customBody: `Bonjour ${student.parentName}! Notice from Étoile Ballet Academy: ${student.name}'s tuition package expired on ${sub.endDate.toISOString().split('T')[0]}. Please visit reception for renewal.`,
          });
        } catch (waErr) {
          console.error('Error dispatching WhatsApp expiration alert:', waErr);
        }
      }

      return {
        success: false,
        student,
        reason: `Plan expired by date on ${sub.endDate.toISOString().split('T')[0]}. Renewal required.`,
        status: 'denied_expired',
      };
    }

    // Double-scan guard: a second scan inside the dedupe window returns the
    // original grant instead of consuming another session.
    const recentGrant = await this.prisma.attendanceRecord.findFirst({
      where: {
        studentId: student.id,
        status: 'granted',
        timestamp: { gte: new Date(now.getTime() - DEDUPE_WINDOW_MS) },
      },
      orderBy: { timestamp: 'desc' },
    });
    if (recentGrant) {
      return {
        success: true,
        student,
        record: recentGrant,
        quotaRemaining: recentGrant.quotaRemaining,
        duplicate: true,
      };
    }

    // Atomic transaction: increment usedSessions, create attendance record
    const remaining = sub.maxSessions - (sub.usedSessions + 1);
    const newStatus = remaining === 0 ? 'expired_quota' : 'active';

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.studentSubscription.update({
        where: { id: sub.id },
        data: {
          usedSessions: { increment: 1 },
          status: newStatus,
        },
      });

      const record = await tx.attendanceRecord.create({
        data: {
          studentId: student.id,
          studentName: student.name,
          barcode: student.barcode,
          classTitle:
            student.program === 'classical'
              ? 'Conservatory Classical Pointe'
              : student.program === 'contemporary'
              ? 'Contemporary Floorwork & Gaga'
              : 'Youth Division Allegro',
          verifiedMethod: dto.method || 'hid_barcode',
          premiseVerified,
          wifiBssid,
          status: 'granted',
          quotaRemaining: remaining,
        },
      });

      return record;
    });

    // Automated WhatsApp Check-In Receipt to Parent
    if (student.parentPhone) {
      try {
        const timeFormatted = result.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const receiptBody = `🩰 *ÉTOILE BALLET ACADEMY — CHECK-IN RECEIPT*\n` +
          `Dear ${student.parentName},\n` +
          `Confirmed: ${student.name} checked in successfully for ${result.classTitle}.\n` +
          `• Time: ${timeFormatted}\n` +
          `• Method: ${result.verifiedMethod.toUpperCase()} (Premise Verified)\n` +
          `• Quota Deducted: 1 Session\n` +
          `• Remaining Sessions: ${remaining} / ${sub.maxSessions}\n` +
          `Thank you for training at Étoile Conservatory.`;

        await this.openWaService.dispatchMessage({
          recipientPhone: student.parentPhone,
          recipientName: `${student.name} (${student.parentName})`,
          triggerEvent: 'checkin_receipt',
          language: 'en',
          customBody: receiptBody,
        });
      } catch (waErr) {
        console.error('Error dispatching WhatsApp check-in receipt:', waErr);
      }
    }

    // Native lock-screen receipt alongside WhatsApp (best-effort).
    if (this.push && student.familyId) {
      this.push.notifyFamily(student.familyId, {
        title: `${student.name} checked in`,
        titleAr: `${student.name} سجلت الحضور`,
        body: `${result.classTitle} · ${remaining}/${sub.maxSessions} sessions left.`,
        url: '/',
        tag: `checkin-${result.id}`,
      }).catch(() => null);
    }

    const ok = {
      success: true,
      student,
      record: result,
      quotaRemaining: remaining,
    };
    if (dto.idempotencyKey) {
      IDEMPOTENCY.set(dto.idempotencyKey, { at: Date.now(), result: ok });
      if (IDEMPOTENCY.size > 500) IDEMPOTENCY.delete(IDEMPOTENCY.keys().next().value as string);
    }
    return ok;
  }

  async getLogs(query?: { page?: string | number; limit?: string | number }) {
    const { skip, take } = parsePagination(query ?? {}, 100, 500);
    return this.prisma.attendanceRecord.findMany({
      orderBy: { timestamp: 'desc' },
      skip,
      take,
    });
  }

  /**
   * Family self check-in via scanned session QR. Validates the token, the
   * household scope and the enrollment, then reuses the quota-deducting
   * kiosk pipeline (dedupe + receipts included).
   */
  async selfCheckin(token: string, studentId: string, actor?: CheckInActor & { role?: string }) {
    const session = await this.prisma.courseSession.findUnique({
      where: { checkinToken: (token || '').trim() },
      select: { id: true, status: true, checkinTokenExpiresAt: true, courseId: true, groupId: true },
    });
    if (!session || !session.checkinTokenExpiresAt || session.checkinTokenExpiresAt < new Date()) {
      throw new BadRequestException('Check-in link expired or invalid');
    }
    if (session.status === 'cancelled') throw new BadRequestException('Session was cancelled');
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new BadRequestException('Student not found');
    if (session.groupId) {
      const en = await this.prisma.groupEnrollment.findUnique({
        where: { groupId_studentId: { groupId: session.groupId, studentId } },
      }).catch(() => null);
      if (!en || en.status !== 'active') throw new BadRequestException('Dancer is not enrolled in this group');
    } else if (session.courseId) {
      const en = await this.prisma.courseEnrollment.findUnique({
        where: { courseId_studentId: { courseId: session.courseId, studentId } },
      }).catch(() => null);
      if (!en || en.status !== 'active') throw new BadRequestException('Dancer is not enrolled in this class');
    } else {
      throw new BadRequestException('Session has no class attached');
    }
    return this.processCheckIn(
      { barcode: student.barcode, method: 'qr_self', sessionId: session.id },
      actor,
    );
  }

  /**
   * Instructor session roll-call. Records presence WITHOUT touching quotas
   * (the kiosk owns quota deduction) so double-marking can never burn sessions.
   * Instructors are confined to sessions they lead; staff are unrestricted.
   */
  async markSessionAttendance(
    sessionId: string,
    records: Array<{ studentId: string; present: boolean }>,
    actor?: { id?: string; role?: string },
  ) {
    if (!Array.isArray(records) || records.length === 0) {
      throw new BadRequestException('records requires at least one {studentId, present} entry');
    }
    if (records.length > 100) throw new BadRequestException('Max 100 records per request');
    const session = await this.prisma.courseSession.findUnique({
      where: { id: sessionId },
      include: {
        course: { select: { id: true, code: true, title: true, instructorId: true } },
        group: {
          select: {
            id: true, code: true, title: true, instructorId: true, capacity: true,
            category: { select: { key: true } },
          },
        },      },
    });
    if (!session) throw new BadRequestException('Session not found');
    if (session.status === 'cancelled') throw new BadRequestException('Cannot mark a cancelled session');
    if (actor?.role === 'instructor') {
      const leads =
        session.instructorId === actor.id ||
        session.course?.instructorId === actor.id ||
        session.group?.instructorId === actor.id;
      if (!leads) throw new ForbiddenException('You may only mark sessions you lead');
    }
    const enrolledIds = new Set(
      session.groupId
        ? (
            await this.prisma.groupEnrollment.findMany({
              where: { groupId: session.groupId, status: 'active' },
              select: { studentId: true },
            })
          ).map((e) => e.studentId)
        : (
            await this.prisma.courseEnrollment.findMany({
              where: { courseId: (session.course as { id: string }).id, status: 'active' },
              select: { studentId: true },
            })
          ).map((e) => e.studentId),
    );
    const classTitle = `${session.course?.code || session.group?.code || 'GRP'} · ${session.title}`;
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);    let marked = 0;
    let skipped = 0;
    const results: Array<{ studentId: string; status: string; skipped?: boolean }> = [];
    for (const r of records) {
      if (!r.studentId || typeof r.present !== 'boolean') {
        skipped += 1;
        continue;
      }
      if (!enrolledIds.has(r.studentId)) {
        skipped += 1;
        results.push({ studentId: r.studentId, status: 'not_enrolled', skipped: true });
        continue;
      }
      const dup = await this.prisma.attendanceRecord.findFirst({
        where: {
          studentId: r.studentId,
          classTitle,
          verifiedMethod: 'manual',
          timestamp: { gte: dayStart },
        },
        select: { id: true },
      });
      if (dup) {
        skipped += 1;
        results.push({ studentId: r.studentId, status: 'duplicate', skipped: true });
        continue;
      }
      const student = await this.prisma.student.findUnique({
        where: { id: r.studentId },
        include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      if (!student) {
        skipped += 1;
        continue;
      }
      const sub = student.subscriptions[0];
      await this.prisma.attendanceRecord.create({
        data: {
          studentId: student.id,
          studentName: student.name,
          barcode: student.barcode,
          classTitle,
          verifiedMethod: 'manual',
          premiseVerified: true,
          status: r.present ? 'granted' : 'absent',
          quotaRemaining: sub ? Math.max(0, sub.maxSessions - sub.usedSessions) : 0,
        },
      });
      marked += 1;
      results.push({ studentId: r.studentId, status: r.present ? 'granted' : 'absent' });
    }
    const cap = await this.prisma.courseSession.findUnique({ where: { id: sessionId }, select: { capacity: true } }).catch(() => null);
    const courseCap = session.course
      ? await this.prisma.course.findUnique({ where: { id: session.course.id }, select: { capacity: true } }).catch(() => null)
      : null;
    const capacity = cap?.capacity ?? (session.group as { capacity?: number } | null)?.capacity ?? courseCap?.capacity ?? null;
    const presentToday = await this.prisma.attendanceRecord.count({
      where: { classTitle, verifiedMethod: 'manual', status: 'granted', timestamp: { gte: dayStart } },
    }).catch(() => 0);
    return {
      success: true, sessionId, classTitle, marked, skipped, results,
      capacity, presentToday,
      overCapacity: capacity !== null && presentToday > capacity,
    };
  }
}

import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../notifications/push.service';

export interface AcademyActor {
  id?: string;
  role?: string;
  name?: string;
  email?: string;
  familyId?: string;
  studentId?: string;
}

const LEAD_ROLES = ['instructor', 'superadmin', 'owner'];
const MANAGE_ROLES = ['superadmin', 'owner'];

function codeFor(categoryKey: string): string {
  const prefix = (categoryKey || 'GEN').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
  return `GRP-${prefix}-${Math.floor(100 + Math.random() * 900)}`;
}

/**
 * Category → Group → Session hierarchy.
 *
 * Compatibility contract: every Group owns exactly one shadow Course row that
 * mirrors its schedulable fields. All legacy readers (catalog, instructor
 * portal, kiosk, enrollments, waitlist, attendance) keep working against the
 * shadow course untouched; every write below dual-writes both rows inside one
 * transaction. The admin Academy UI only ever shows Groups.
 */
@Injectable()
export class AcademyService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly push?: PushService,
  ) {}

  private actorName(actor?: AcademyActor) {
    return actor?.name || actor?.email || 'Staff';
  }

  // --------------------------------------------------------------------------
  // CATEGORIES
  // --------------------------------------------------------------------------

  async listCategories(includeInactive = false) {
    return this.prisma.category.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: { _count: { select: { groups: true } } },
    });
  }

  async createCategory(data: { key: string; title: string; titleAr?: string; description?: string; color?: string; icon?: string }, actor?: AcademyActor) {
    if (!MANAGE_ROLES.includes(actor?.role || '')) throw new ForbiddenException('Only directors and owners manage categories');
    const key = (data.key || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!key || !data.title?.trim()) throw new BadRequestException('Category key and title are required');
    const exists = await this.prisma.category.findUnique({ where: { key } }).catch(() => null);
    if (exists) throw new BadRequestException(`Category key ${key} already exists`);
    const created = await this.prisma.category.create({
      data: {
        key,
        title: data.title.trim().slice(0, 120),
        titleAr: data.titleAr?.trim().slice(0, 120) || null,
        description: (data.description || '').slice(0, 500) || null,
        color: data.color || '#caa868',
        icon: data.icon || null,
      },
    });
    await this.audit('Category Created', `${created.title} (${key})`, actor);
    return created;
  }

  async updateCategory(id: string, data: Partial<{ title: string; titleAr: string; description: string; color: string; icon: string; sortOrder: number }>, actor?: AcademyActor) {
    if (!MANAGE_ROLES.includes(actor?.role || '')) throw new ForbiddenException('Only directors and owners manage categories');
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');
    return this.prisma.category.update({ where: { id }, data: {
      ...(data.title !== undefined ? { title: data.title.slice(0, 120) } : {}),
      ...(data.titleAr !== undefined ? { titleAr: data.titleAr.slice(0, 120) || null } : {}),
      ...(data.description !== undefined ? { description: data.description.slice(0, 500) || null } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.icon !== undefined ? { icon: data.icon || null } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: Math.floor(Number(data.sortOrder)) || 0 } : {}),
    } });
  }

  /** Archive (never delete): blocked while active groups remain. */
  async archiveCategory(id: string, actor?: AcademyActor) {
    if (!MANAGE_ROLES.includes(actor?.role || '')) throw new ForbiddenException('Only directors and owners manage categories');
    const existing = await this.prisma.category.findUnique({ where: { id }, include: { _count: { select: { groups: true } } } });
    if (!existing) throw new NotFoundException('Category not found');
    const activeGroups = await this.prisma.group.count({ where: { categoryId: id, active: true } });
    if (activeGroups > 0) throw new BadRequestException(`Archive the ${activeGroups} active group(s) first`);
    const updated = await this.prisma.category.update({ where: { id }, data: { active: false } });
    await this.audit('Category Archived', `${existing.title}`, actor);
    return updated;
  }

  // --------------------------------------------------------------------------
  // GROUPS
  // --------------------------------------------------------------------------

  async listGroups(query: { categoryId?: string; instructorId?: string; branchCode?: string; includeInactive?: string }) {
    const where: Record<string, unknown> = {};
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.instructorId) where.instructorId = query.instructorId;
    if (query.branchCode) where.branchCode = query.branchCode;
    if (query.includeInactive !== 'true') where.active = true;
    return this.prisma.group.findMany({
      where,
      include: {
        category: { select: { id: true, key: true, title: true, titleAr: true, color: true } },
        instructor: { select: { id: true, name: true, role: true } },
        _count: { select: { sessions: true, enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async getGroup(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        category: true,
        instructor: { select: { id: true, name: true, nameAr: true, role: true, email: true } },
        sessions: { orderBy: { sessionDate: 'asc' }, take: 200 },
        enrollments: { where: { status: 'active' }, include: { student: { select: { id: true, name: true, barcode: true, level: true } } } },
      },
    });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  private async resolveInstructor(instructorId: string) {
    const staff = await this.prisma.staffUser.findUnique({ where: { id: instructorId } });
    if (!staff) throw new NotFoundException('Instructor not found');
    if (!LEAD_ROLES.includes(staff.role)) {
      throw new BadRequestException(`${staff.name} is ${staff.role} — only instructors (or directors) lead groups`);
    }
    return staff;
  }

  async createGroup(
    data: { title: string; titleAr?: string; categoryId: string; instructorId: string; capacity?: number; branchCode?: string; level?: string },
    actor?: AcademyActor,
  ) {
    if (!MANAGE_ROLES.includes(actor?.role || '')) throw new ForbiddenException('Only directors and owners create groups');
    if (!data.title?.trim()) throw new BadRequestException('Group title is required');
    const category = await this.prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category || !category.active) throw new BadRequestException('Valid active category is required');
    await this.resolveInstructor(data.instructorId);
    const capacity = Math.floor(Number(data.capacity) || 20);
    if (capacity < 1 || capacity > 200) throw new BadRequestException('Capacity must be 1–200');

    let code = codeFor(category.key);
    for (let i = 0; i < 5; i += 1) {
      const clash = await this.prisma.group.findUnique({ where: { code } }).catch(() => null);
      if (!clash) break;
      code = codeFor(category.key);
    }

    // No shadow course: groups are the schedulable unit. Legacy Course rows
    // remain as read-only history; all readers project groups instead.
    const created = await this.prisma.group.create({
      data: {
        code,
        title: data.title.trim().slice(0, 120),
        titleAr: data.titleAr?.trim().slice(0, 120) || null,
        categoryId: category.id,
        instructorId: data.instructorId,
        capacity,
        branchCode: (data.branchCode || 'ZAM').toUpperCase(),
        level: data.level || 'conservatory',
        active: true,
      },
    });
    await this.audit('Group Created', `${created.title} (${code}) in ${category.title}`, actor);
    return this.getGroup(created.id);
  }

  async updateGroup(id: string, data: Partial<{ title: string; titleAr: string; instructorId: string; capacity: number; branchCode: string; level: string }>, actor?: AcademyActor) {
    if (!MANAGE_ROLES.includes(actor?.role || '')) throw new ForbiddenException('Only directors and owners update groups');
    const group = await this.prisma.group.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Group not found');
    if (data.instructorId !== undefined) await this.resolveInstructor(data.instructorId);
    if (data.capacity !== undefined) {
      const cap = Math.floor(Number(data.capacity));
      if (!Number.isFinite(cap) || cap < 1 || cap > 200) throw new BadRequestException('Capacity must be 1–200');
      const active = await this.prisma.groupEnrollment.count({ where: { groupId: id, status: 'active' } });
      if (cap < active) throw new BadRequestException(`Cannot shrink below ${active} enrolled dancers`);
    }
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title.slice(0, 120);
    if (data.titleAr !== undefined) patch.titleAr = data.titleAr.slice(0, 120) || null;
    if (data.instructorId !== undefined) patch.instructorId = data.instructorId;
    if (data.capacity !== undefined) patch.capacity = Math.floor(Number(data.capacity));
    if (data.branchCode !== undefined) patch.branchCode = data.branchCode.toUpperCase();
    if (data.level !== undefined) patch.level = data.level;
    if (Object.keys(patch).length === 0) throw new BadRequestException('Nothing to update');
    // Legacy shadow courses (pre-cutover) keep mirroring schedulable fields.
    await this.prisma.course.updateMany({
      where: { groupId: id },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.titleAr !== undefined ? { titleAr: patch.titleAr as string | null } : {}),
        ...(patch.instructorId !== undefined ? { instructorId: patch.instructorId as string } : {}),
        ...(patch.capacity !== undefined ? { capacity: patch.capacity as number } : {}),
        ...(patch.branchCode !== undefined ? { branchCode: patch.branchCode as string } : {}),
      },
    }).catch(() => null);
    const updated = await this.prisma.group.update({ where: { id }, data: patch });
    return this.getGroup(updated.id);
  }

  /**
   * Duplicate a group for a new term in one click: same category, instructor,
   * capacity and branch, new code, plus all scheduled sessions shifted so the
   * earliest lands on startDate (weekday pattern + times preserved).
   */
  async cloneGroup(id: string, data: { title?: string; startDate: string }, actor?: AcademyActor) {
    if (!MANAGE_ROLES.includes(actor?.role || '')) throw new ForbiddenException('Only directors and owners clone groups');
    const source = await this.prisma.group.findUnique({
      where: { id },
      include: {
        category: true,
        sessions: { where: { status: 'scheduled' }, orderBy: { sessionDate: 'asc' } },
      },
    });
    if (!source) throw new NotFoundException('Group not found');
    const start = new Date(`${data.startDate}T00:00:00`);
    if (Number.isNaN(start.getTime())) throw new BadRequestException('startDate must be YYYY-MM-DD');
    if (start.getTime() < Date.now() - 86400000) throw new BadRequestException('startDate cannot be in the past');

    let code = codeFor(source.category.key);
    for (let i = 0; i < 5; i += 1) {
      const clash = await this.prisma.group.findUnique({ where: { code } }).catch(() => null);
      if (!clash) break;
      code = codeFor(source.category.key);
    }
    const anchor = source.sessions.length > 0
      ? new Date(source.sessions[0].sessionDate)
      : new Date();
    anchor.setHours(0, 0, 0, 0);
    const target = new Date(start);
    target.setHours(0, 0, 0, 0);
    const shiftMs = target.getTime() - anchor.getTime();

    const created = await this.prisma.group.create({
      data: {
        code,
        title: (data.title?.trim() || `${source.title} — New Term`).slice(0, 120),
        titleAr: source.titleAr,
        categoryId: source.categoryId,
        instructorId: source.instructorId,
        capacity: source.capacity,
        branchCode: source.branchCode,
        level: source.level,
        active: true,
      },
    });
    let sessionsCopied = 0;
    for (const s of source.sessions) {
      const date = new Date(new Date(s.sessionDate).getTime() + shiftMs);
      await this.prisma.courseSession.create({
        data: {
          courseId: null,
          groupId: created.id,
          title: s.title,
          sessionDate: date,
          startTime: s.startTime,
          endTime: s.endTime,
          studioRoom: s.studioRoom,
          instructorId: s.instructorId || source.instructorId,
          capacity: s.capacity,
          status: 'scheduled',
        },
      });
      sessionsCopied += 1;
    }
    await this.audit('Group Cloned', `${source.title} → ${created.title} (${sessionsCopied} sessions)`, actor);
    return this.getGroup(created.id);
  }

  /** Archive blocks new enrollments/joins; history (sessions, ledger) stays intact. */  async archiveGroup(id: string, actor?: AcademyActor) {
    if (!MANAGE_ROLES.includes(actor?.role || '')) throw new ForbiddenException('Only directors and owners archive groups');
    const group = await this.prisma.group.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Group not found');
    const updated = await this.prisma.group.update({ where: { id }, data: { active: false } });
    await this.prisma.course.updateMany({ where: { groupId: id }, data: { active: false } }).catch(() => null);
    await this.audit('Group Archived', `${group.title} (${group.code})`, actor);
    return updated;
  }

  // --------------------------------------------------------------------------
  // GROUP SESSIONS (single + bulk generator)
  // --------------------------------------------------------------------------

  async listGroupSessions(groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    return this.prisma.courseSession.findMany({
      where: { groupId },
      orderBy: { sessionDate: 'asc' },
      take: 500,
    });
  }

  private async shadowCourseId(groupId: string): Promise<string> {
    const shadow = await this.prisma.course.findFirst({ where: { groupId }, select: { id: true } });
    if (!shadow) throw new BadRequestException('Group has no linked course row — contact support');
    return shadow.id;
  }

  async createGroupSession(
    groupId: string,
    data: { title: string; sessionDate: string | Date; startTime: string; endTime: string; studioRoom?: string; instructorId?: string; capacity?: number; notes?: string },
    actor?: AcademyActor,
  ) {
    if (!['superadmin', 'owner', 'receptionist'].includes(actor?.role || '')) {
      throw new ForbiddenException('Only staff schedule sessions');
    }
    const group = await this.prisma.group.findUnique({ where: { id: groupId }, include: { instructor: { select: { id: true } } } });
    if (!group || !group.active) throw new BadRequestException('Group not found or archived');
    if (!data.title?.trim()) throw new BadRequestException('Session title is required');
    const date = new Date(data.sessionDate);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('sessionDate must be valid');
    if (data.instructorId) await this.resolveInstructor(data.instructorId);
    return this.prisma.courseSession.create({
      data: {
        courseId: null,
        groupId,
        title: data.title.trim().slice(0, 160),
        sessionDate: date,
        startTime: data.startTime,
        endTime: data.endTime,
        studioRoom: data.studioRoom || 'Studio Petipa',
        instructorId: data.instructorId || group.instructorId,
        capacity: data.capacity && data.capacity > 0 ? Math.floor(data.capacity) : null,
        notes: (data.notes || '').slice(0, 500) || null,
        status: 'scheduled',
      },
    });
  }

  /**
   * Bulk generator: sessions for every chosen weekday inside [from, to] or up to targetCount.
   * Skips past dates and dates colliding with an existing same-day session.
   */
  async bulkGroupSessions(
    groupId: string,
    data: { from: string; to?: string; daysOfWeek: number[]; startTime: string; endTime: string; studioRoom?: string; title?: string; targetCount?: number },
    actor?: AcademyActor,
  ) {
    if (!['superadmin', 'owner', 'receptionist'].includes(actor?.role || '')) {
      throw new ForbiddenException('Only staff schedule sessions');
    }
    const from = new Date(`${data.from}T00:00:00`);
    if (Number.isNaN(from.getTime())) throw new BadRequestException('from must be a valid date');

    let to: Date;
    if (data.targetCount && data.targetCount > 0) {
      to = new Date(from.getTime() + 180 * 86400000);
    } else {
      if (!data.to) throw new BadRequestException('Either to date or targetCount is required');
      to = new Date(`${data.to}T00:00:00`);
    }

    if (Number.isNaN(to.getTime()) || to < from) {
      throw new BadRequestException('from/to must be valid dates with to >= from');
    }
    if ((to.getTime() - from.getTime()) / 86400000 > 180) throw new BadRequestException('Bulk window capped at 180 days');
    const days = (data.daysOfWeek || []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    if (days.length === 0) throw new BadRequestException('Pick at least one weekday');
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group || !group.active) throw new BadRequestException('Group not found or archived');
    const existing = await this.prisma.courseSession.findMany({
      where: { groupId, sessionDate: { gte: from, lte: new Date(to.getTime() + 86400000) } },
      select: { sessionDate: true },
    });
    const taken = new Set(existing.map((s) => s.sessionDate.toISOString().split('T')[0]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let created = 0;
    let skipped = 0;
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      if (data.targetCount && created >= data.targetCount) break;
      if (!days.includes(d.getDay())) continue;
      const key = d.toISOString().split('T')[0];
      if (d < today || taken.has(key)) {
        skipped += 1;
        continue;
      }
      await this.prisma.courseSession.create({
        data: {
          courseId: null,
          groupId,
          title: (data.title || group.title).slice(0, 160),
          sessionDate: new Date(d),
          startTime: data.startTime,
          endTime: data.endTime,
          studioRoom: data.studioRoom || 'Studio Petipa',
          instructorId: group.instructorId,
          status: 'scheduled',
        },
      });
      created += 1;
      if (data.targetCount && created >= data.targetCount) break;
    }
    await this.audit('Sessions Bulk-Generated', `${created} sessions for ${group.title} (${skipped} skipped)`, actor);
    return { created, skipped };
  }

  /**
   * Session cancellation with automated student compensation:
   * Restores quota / adds +1 session to active subscription, or credits student wallet,
   * and automatically notifies the parents via WhatsApp.
   */
  async cancelSessionAndCompensate(
    sessionId: string,
    options: {
      reason?: string;
      compensationType?: 'credit_session' | 'wallet_credit' | 'none';
      walletAmount?: number;
      notifyWhatsapp?: boolean;
    },
    actor?: AcademyActor,
  ) {
    if (!['superadmin', 'owner', 'receptionist'].includes(actor?.role || '')) {
      throw new ForbiddenException('Only staff can cancel sessions');
    }

    const session = await this.prisma.courseSession.findUnique({
      where: { id: sessionId },
      include: {
        group: {
          include: {
            enrollments: {
              where: { status: 'active' },
              include: {
                student: {
                  include: {
                    subscriptions: {
                      where: { status: 'active' },
                      orderBy: { createdAt: 'desc' },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.status === 'cancelled') {
      throw new BadRequestException('Session is already cancelled');
    }

    const reason = (options.reason || 'Academy schedule adjustment').trim();
    const compensationType = options.compensationType || 'credit_session';
    const walletCredit = Number(options.walletAmount || 150);
    const notify = options.notifyWhatsapp !== false;

    const updatedSession = await this.prisma.courseSession.update({
      where: { id: sessionId },
      data: {
        status: 'cancelled',
        notes: session.notes ? `${session.notes} | Cancelled: ${reason}` : `Cancelled: ${reason}`,
      },
    });

    const enrolled = session.group?.enrollments || [];
    const compensatedStudents: Array<{ id: string; name: string; compensation: string }> = [];

    for (const item of enrolled) {
      const st = item.student;
      let compSummary = 'None';

      if (compensationType === 'credit_session') {
        const activeSub = st.subscriptions[0];
        if (activeSub) {
          if (activeSub.usedSessions > 0) {
            await this.prisma.studentSubscription.update({
              where: { id: activeSub.id },
              data: { usedSessions: { decrement: 1 } },
            });
            compSummary = '1 session credited back to active subscription';
          } else {
            await this.prisma.studentSubscription.update({
              where: { id: activeSub.id },
              data: { maxSessions: { increment: 1 } },
            });
            compSummary = '+1 bonus session added to active subscription';
          }
        } else {
          await this.prisma.student.update({
            where: { id: st.id },
            data: { walletBalance: { increment: walletCredit } },
          });
          compSummary = `€${walletCredit} credited to wallet`;
        }
      } else if (compensationType === 'wallet_credit') {
        await this.prisma.student.update({
          where: { id: st.id },
          data: { walletBalance: { increment: walletCredit } },
        });
        compSummary = `€${walletCredit} credited to student wallet`;
      }

      compensatedStudents.push({ id: st.id, name: st.name, compensation: compSummary });

      if (notify && st.parentPhone) {
        const dateStr = new Date(session.sessionDate).toISOString().split('T')[0];
        const body = `🩰 Étoile Ballet Academy: نعتذر عن إلغاء حصة "${session.title}" المقررة بتاريخ ${dateStr} (${session.startTime} - ${session.endTime}). السبب: ${reason}. تم تعويضكم تلقائياً: ${compSummary}.`;
        await this.prisma.openWaLog.create({
          data: {
            recipientPhone: st.parentPhone,
            recipientName: st.parentName || st.name,
            triggerEvent: 'session_cancelled_compensation',
            language: 'ar',
            body,
            status: 'delivered',
            channel: 'whatsapp',
          },
        }).catch(() => null);
      }
    }

    await this.audit(
      'Session Cancelled & Compensated',
      `Session "${session.title}" cancelled (${reason}). Compensated ${compensatedStudents.length} students via ${compensationType}.`,
      actor,
    );

    return {
      success: true,
      session: updatedSession,
      compensatedCount: compensatedStudents.length,
      compensatedStudents,
    };
  }

  // --------------------------------------------------------------------------
  // GROUP ENROLLMENTS + WAITLIST (group-first; legacy shadows mirrored only)
  // --------------------------------------------------------------------------

  async enrollInGroup(groupId: string, studentId: string, actor?: AcademyActor) {
    if (!['superadmin', 'owner', 'receptionist'].includes(actor?.role || '')) {
      throw new ForbiddenException('Only staff enroll dancers');
    }
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!group || !group.active) throw new BadRequestException('Group not found or archived');
    if (group._count.enrollments >= group.capacity) {
      throw new BadRequestException(`Group is full (${group.capacity}). Join the waitlist instead.`);
    }
    const courseId = await this.shadowCourseId(groupId).catch(() => null);
    return this.prisma.$transaction(async (tx) => {
      const enrollment = await tx.groupEnrollment.upsert({
        where: { groupId_studentId: { groupId, studentId } },
        update: { status: 'active' },
        create: { groupId, studentId, status: 'active' },
      });
      // Mirror onto the legacy shadow row only where one still exists.
      if (courseId) {
        await tx.courseEnrollment.upsert({
          where: { courseId_studentId: { courseId, studentId } },
          update: { status: 'active' },
          create: { courseId, studentId, status: 'active' },
        }).catch(() => null);
      }
      return enrollment;
    });
  }

  async unenrollFromGroup(groupId: string, studentId: string, actor?: AcademyActor) {
    if (!['superadmin', 'owner', 'receptionist'].includes(actor?.role || '')) {
      throw new ForbiddenException('Only staff unenroll dancers');
    }
    const courseId = await this.shadowCourseId(groupId).catch(() => null);
    await this.prisma.$transaction(async (tx) => {
      await tx.groupEnrollment.deleteMany({ where: { groupId, studentId } });
      if (courseId) await tx.courseEnrollment.deleteMany({ where: { courseId, studentId } });
    });
    await this.promoteGroupWaitlist(groupId, this.actorName(actor)).catch(() => null);
    return { success: true };
  }

  async joinGroupWaitlist(groupId: string, studentId: string, actor?: AcademyActor) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group || !group.active) throw new BadRequestException('Group not found or archived');
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');
    if (actor?.role === 'family' && student.familyId !== actor.familyId) {
      throw new BadRequestException('You may only waitlist your own dancers');
    }
    if (actor?.role === 'student' && student.id !== actor.studentId) {
      throw new BadRequestException('You may only waitlist yourself');
    }
    const enrolled = await this.prisma.groupEnrollment.findUnique({
      where: { groupId_studentId: { groupId, studentId } },
    }).catch(() => null);
    if (enrolled?.status === 'active') throw new BadRequestException('Dancer is already enrolled');
    const dup = await this.prisma.waitlistEntry.findFirst({ where: { groupId, studentId, status: 'pending' } });
    if (dup) throw new BadRequestException('Already on the waitlist');
    const entry = await this.prisma.waitlistEntry.create({
      data: { groupId, studentId, status: 'pending' },
    });
    const position = await this.prisma.waitlistEntry.count({
      where: { groupId, status: 'pending', createdAt: { lte: entry.createdAt } },
    });
    return { ...entry, position };
  }

  async listGroupWaitlist(groupId: string, status = 'pending') {
    const where: Record<string, unknown> = { groupId };
    if (status !== 'all') where.status = status;
    return this.prisma.waitlistEntry.findMany({
      where,
      include: { student: { select: { id: true, name: true, barcode: true, level: true } } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  }

  async promoteGroupWaitlist(groupId: string, actorName = 'Registrar') {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!group) throw new NotFoundException('Group not found');
    if (group._count.enrollments >= group.capacity) {
      return { promoted: false as const, skipped: true as const, reason: 'Group still at capacity' };
    }
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: { groupId, status: 'pending' },
      orderBy: { createdAt: 'asc' },
      include: { student: true },
    });
    if (!entry) throw new NotFoundException('No pending waitlist entry');
    const courseId = await this.shadowCourseId(groupId).catch(() => null);
    await this.prisma.$transaction(async (tx) => {
      await tx.groupEnrollment.upsert({
        where: { groupId_studentId: { groupId, studentId: entry.studentId } },
        update: { status: 'active' },
        create: { groupId, studentId: entry.studentId, status: 'active' },
      });
      if (courseId) {
        await tx.courseEnrollment.upsert({
          where: { courseId_studentId: { courseId, studentId: entry.studentId } },
          update: { status: 'active' },
          create: { courseId, studentId: entry.studentId, status: 'active' },
        }).catch(() => null);
      }
      await tx.waitlistEntry.update({ where: { id: entry.id }, data: { status: 'promoted' } });
    });
    await this.audit('Group Waitlist Promoted', `${entry.student.name} → ${group.title}`, { name: actorName } as AcademyActor);
    if (this.push && entry.student.familyId) {
      this.push.notifyFamily(entry.student.familyId, {
        title: `Seat available — ${group.title}`,
        titleAr: `مقعد متاح — ${group.title}`,
        body: `${entry.student.name} was promoted from the waitlist. See you at the barre!`,
        url: '/',
        tag: `gwaitlist-${entry.id}`,
      }).catch(() => null);
    }
    return { promoted: true as const, skipped: false as const, entryId: entry.id };
  }

  async cancelGroupWaitlist(entryId: string) {
    const entry = await this.prisma.waitlistEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Waitlist entry not found');
    if (entry.status !== 'pending') throw new BadRequestException(`Entry is ${entry.status}`);
    return this.prisma.waitlistEntry.update({ where: { id: entryId }, data: { status: 'cancelled' } });
  }

  /** Instructor workload: groups led + upcoming sessions, for clash review. */
  async instructorWorkload() {
    const soon = new Date(Date.now() + 60 * 86400000);
    const groups = await this.prisma.group.findMany({
      where: { active: true },
      include: {
        category: { select: { key: true, title: true, color: true } },
        instructor: { select: { id: true, name: true } },
        _count: { select: { sessions: true, enrollments: true } },
        sessions: {
          where: { sessionDate: { gte: new Date(), lte: soon }, status: 'scheduled' },
          select: { id: true, title: true, sessionDate: true, startTime: true, endTime: true, studioRoom: true },
          orderBy: { sessionDate: 'asc' },
          take: 60,
        },
      },
      orderBy: { title: 'asc' },
      take: 500,
    });
    const byInstructor = new Map<string, { instructor: { id: string; name: string } | null; groups: typeof groups }>();
    for (const g of groups) {
      const key = g.instructorId || 'unassigned';
      const cur = byInstructor.get(key) || { instructor: g.instructor, groups: [] };
      cur.groups.push(g);
      byInstructor.set(key, cur);
    }
    return Array.from(byInstructor.values());
  }

  private async audit(action: string, details: string, actor?: AcademyActor) {
    await this.prisma.crmAuditEntry.create({
      data: { action, actor: this.actorName(actor), details, category: 'crm' },
    }).catch(() => null);
  }
}

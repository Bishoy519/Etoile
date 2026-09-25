import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenWaService } from '../openwa/openwa.service';
import { PushService } from '../notifications/push.service';

export interface RenewalQueueItem {
  studentId: string;
  name: string;
  phone: string;
  reason: 'no_package' | 'expired' | 'expiring_soon' | 'low_quota';
  priority: 'high' | 'medium' | 'low';
  left?: number;
  endDate?: string;
}

export interface ScheduleConflict {
  type: 'room' | 'instructor';
  day: string;
  studioRoom?: string;
  instructorId?: string;
  instructorName?: string;
  sessionIds: string[];
  message: string;
}

const DAY_MS = 86400000;

function toMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = String(t).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function dayKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

@Injectable()
export class OpsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly openWa?: OpenWaService,
    @Optional() private readonly push?: PushService,
  ) {}

  /**
   * Renewal watchlist: dancers whose package is missing, expired, expiring
   * within 7 days, or down to ≤2 sessions. High priority first.
   */
  async getRenewalQueue(): Promise<{ queue: RenewalQueueItem[] }> {
    const students = await this.prisma.student.findMany({
      include: {
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { id: 'asc' },
      take: 500,
    });

    const now = new Date();
    const queue: RenewalQueueItem[] = [];

    for (const s of students) {
      const sub = s.subscriptions[0];
      if (!sub) {
        queue.push({
          studentId: s.id,
          name: s.name,
          phone: s.parentPhone,
          reason: 'no_package',
          priority: 'high',
        });
        continue;
      }
      const left = Math.max(0, sub.maxSessions - sub.usedSessions);
      const endDate = sub.endDate.toISOString().split('T')[0];
      if (sub.status !== 'active' || now > sub.endDate || left <= 0) {
        queue.push({ studentId: s.id, name: s.name, phone: s.parentPhone, reason: 'expired', priority: 'high', left, endDate });
        continue;
      }
      const daysToExpiry = Math.ceil((sub.endDate.getTime() - now.getTime()) / DAY_MS);
      if (daysToExpiry <= 7) {
        queue.push({ studentId: s.id, name: s.name, phone: s.parentPhone, reason: 'expiring_soon', priority: 'medium', left, endDate });
        continue;
      }
      if (left <= 2) {
        queue.push({ studentId: s.id, name: s.name, phone: s.parentPhone, reason: 'low_quota', priority: 'medium', left, endDate });
      }
    }

    const rank = { high: 0, medium: 1, low: 2 };
    queue.sort(
      (a, b) => rank[a.priority] - rank[b.priority] || (a.left ?? 99) - (b.left ?? 99),
    );
    return { queue };
  }

  /**
   * Double-booking detector over scheduled (non-cancelled) sessions:
   * same studio + overlapping times → room conflict; same instructor +
   * overlapping times → instructor conflict. Grouped per calendar day.
   */
  async getScheduleConflicts(): Promise<{ total: number; conflicts: ScheduleConflict[] }> {
    const sessions = await this.prisma.courseSession.findMany({
      where: { status: { not: 'cancelled' } },
      include: {
        course: { select: { id: true, title: true } },
        instructor: { select: { id: true, name: true } },
      },
      orderBy: { sessionDate: 'asc' },
      take: 1000,
    });

    const byDay = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const key = dayKey(new Date(s.sessionDate));
      const list = byDay.get(key) || [];
      list.push(s);
      byDay.set(key, list);
    }

    const conflicts: ScheduleConflict[] = [];
    for (const [day, list] of byDay) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          const aStart = toMinutes(a.startTime);
          const aEnd = toMinutes(a.endTime);
          const bStart = toMinutes(b.startTime);
          const bEnd = toMinutes(b.endTime);
          if (aStart === null || aEnd === null || bStart === null || bEnd === null) continue;
          if (aEnd <= aStart || bEnd <= bStart) continue;
          const overlap = Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
          if (!overlap) continue;

          if (a.studioRoom && b.studioRoom && a.studioRoom === b.studioRoom) {
            conflicts.push({
              type: 'room',
              day,
              studioRoom: a.studioRoom,
              sessionIds: [a.id, b.id],
              message: `${a.studioRoom} double-booked: "${a.title}" overlaps "${b.title}"`,
            });
          }
          const aIns = a.instructorId || a.instructor?.id;
          const bIns = b.instructorId || b.instructor?.id;
          if (aIns && bIns && aIns === bIns) {
            conflicts.push({
              type: 'instructor',
              day,
              instructorId: aIns,
              instructorName: a.instructor?.name || b.instructor?.name,
              sessionIds: [a.id, b.id],
              message: `${a.instructor?.name || 'Instructor'} double-booked: "${a.title}" overlaps "${b.title}"`,
            });
          }
          if (conflicts.length >= 50) break;
        }
        if (conflicts.length >= 50) break;
      }
    }

    return { total: conflicts.length, conflicts };
  }

  /**
   * Admissions funnel SLA: leads stuck in early stages past their response
   * window. Breach = new_inquiry older than 48h, trial_scheduled older than
   * 7 days without advancing. Used by the ops desk + analytics engagement.
   */
  async getFunnelSla(): Promise<{
    total: number;
    breached: number;
    items: Array<{ id: string; dancer: string; stage: string; phone: string; ageHours: number }>;
  }> {
    const leads = await this.prisma.admissionLead.findMany({
      where: { stage: { in: ['new_inquiry', 'trial_scheduled', 'audition_scheduled', 'evaluated'] } },
      select: { id: true, dancerName: true, stage: true, parentPhone: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });
    const now = Date.now();
    const items = leads
      .map((l) => ({ ...l, ageHours: (now - new Date(l.createdAt).getTime()) / 3600000 }))
      .filter((l) => (l.stage === 'new_inquiry' && l.ageHours > 48) || (l.stage !== 'new_inquiry' && l.ageHours > 168))
      .map((l) => ({ id: l.id, dancer: l.dancerName, stage: l.stage, phone: l.parentPhone, ageHours: Math.round(l.ageHours) }));
    return { total: leads.length, breached: items.length, items };
  }

  /** Append-only audit trail reader (CrmAuditEntry across crm/financial/cms/pos). */
  async getAuditLog(query: { page?: string | number; limit?: string | number; category?: string; search?: string }) {    const page = Math.max(1, parseInt(String(query.page || '1'), 10));
    const limit = Math.min(200, Math.max(1, parseInt(String(query.limit || '50'), 10)));
    const where: Record<string, unknown> = {};
    if (query.category) where.category = query.category;
    const search = String(query.search || '').trim().slice(0, 120);
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { actor: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [total, items] = await Promise.all([
      this.prisma.crmAuditEntry.count({ where }),
      this.prisma.crmAuditEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /** Privacy oversight: erasure requests awaiting grace expiry or done. */
  async getDeletionRequests() {
    return this.prisma.deletionRequest.findMany({ orderBy: { requestedAt: 'desc' }, take: 100 }).catch(() => []);
  }

  // --------------------------------------------------------------------------
  // CELEBRATIONS (academy anniversaries — no birthdates stored, by design)
  // --------------------------------------------------------------------------
  /** Dancers whose enrollment anniversary falls within the next `days` days. */
  async upcomingCelebrations(days = 30) {
    const students = await this.prisma.student.findMany({
      select: { id: true, name: true, nameAr: true, parentName: true, parentPhone: true, familyId: true, createdAt: true, birthDate: true },
      take: 2000,
    });
    const now = new Date();
    const out: Array<{
      studentId: string; name: string; nameAr: string; parentName: string; parentPhone: string;
      familyId: string; kind: string; years: number | null; date: string; sent: boolean;
    }> = [];
    const push = async (
      s: (typeof students)[number], kind: 'anniversary' | 'birthday', years: number | null, date: Date,
    ) => {
      const logged = await this.prisma.celebrationLog.findUnique({
        where: { studentId_kind_year: { studentId: s.id, kind, year: date.getFullYear() } },
      }).catch(() => null);
      out.push({
        studentId: s.id,
        name: s.name,
        nameAr: s.nameAr,
        parentName: s.parentName,
        parentPhone: s.parentPhone,
        familyId: s.familyId,
        kind,
        years,
        date: date.toISOString().split('T')[0],
        sent: !!logged,
      });
    };
    for (const s of students) {
      // Academy anniversary (years since enrollment).
      const start = new Date(s.createdAt);
      let years = now.getFullYear() - start.getFullYear();
      if (years >= 1) {
        const anniv = new Date(now.getFullYear(), start.getMonth(), start.getDate());
        if (anniv.getTime() < now.getTime() - DAY_MS) {
          years += 1;
          anniv.setFullYear(anniv.getFullYear() + 1);
        }
        if (anniv.getTime() - now.getTime() <= days * DAY_MS) {
          await push(s, 'anniversary', years, anniv);
        }
      }
      // Real birthday (no year count — just the day).
      if (s.birthDate) {
        const dob = new Date(s.birthDate);
        const bday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
        if (bday.getTime() < now.getTime() - DAY_MS) bday.setFullYear(bday.getFullYear() + 1);
        if (bday.getTime() - now.getTime() <= days * DAY_MS) {
          await push(s, 'birthday', null, bday);
        }
      }
    }
    out.sort((a, b) => a.date.localeCompare(b.date));
    return { items: out, total: out.length };
  }

  /** Dispatch anniversary + birthday greetings (WhatsApp + push) with once-per-year guard. */
  async dispatchCelebrations(days = 7, actorName?: string) {
    const { items } = await this.upcomingCelebrations(days);
    let sent = 0;
    let skipped = 0;
    for (const c of items) {
      if (c.sent) {
        skipped += 1;
        continue;
      }
      const body = c.kind === 'birthday'
        ? `🩰 *Étoile Ballet Academy*\n\nHappy birthday, ${c.name}! Wishing you a year of beautiful dancing — see you at the barre.`
        : `🩰 *Étoile Ballet Academy*\n\nHappy ${c.years}-year academy anniversary, ${c.name}! ` +
          `Thank you for dancing with us — here's to another year of beautiful ballet.`;
      try {
        await this.openWa?.dispatchMessage({
          recipientPhone: c.parentPhone,
          recipientName: `${c.name} (${c.parentName})`,
          triggerEvent: 'announcement',
          language: 'en',
          customBody: body,
        });
        if (this.push) {
          await this.push.notifyFamily(c.familyId, {
            title: c.kind === 'birthday' ? `Happy birthday, ${c.name}!` : `Happy ${c.years}-year anniversary, ${c.name}!`,
            titleAr: c.kind === 'birthday' ? `عيد ميلاد سعيد ${c.name}!` : `ذكرى سنوية سعيدة ${c.name}!`,
            body: c.kind === 'birthday'
              ? 'Have a magical day — enjoy a birthday treat at reception.'
              : 'Thank you for dancing with Étoile — enjoy a renewal gift at reception.',
            url: '/',
            tag: `${c.kind === 'birthday' ? 'bday' : 'anniv'}-${c.studentId}-${new Date().getFullYear()}`,
          }).catch(() => null);
        }
        await this.prisma.celebrationLog.create({
          data: { studentId: c.studentId, kind: c.kind, year: new Date(c.date).getFullYear() },
        }).catch(() => null);
        sent += 1;
      } catch {
        skipped += 1;
      }
    }
    await this.prisma.crmAuditEntry.create({
      data: { action: 'Celebrations Dispatched', actor: actorName || 'Staff', details: `${sent} sent, ${skipped} skipped`, category: 'crm' },
    }).catch(() => null);
    return { sent, skipped };
  }
}

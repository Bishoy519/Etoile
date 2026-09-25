import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toNumber } from '../../common/money.util';

export interface FeedItem {
  id: string;
  kind: 'message' | 'quota' | 'invoice' | 'session' | 'attendance' | 'crm' | 'finance' | 'system';
  severity: 'info' | 'warning' | 'urgent';
  title: string;
  titleAr: string;
  body: string;
  createdAt: string;
  isRead?: boolean;
}

/** Unified notification feed: WhatsApp history + quota + billing + sessions + staff activity. */
@Injectable()
export class NotificationsService {
  private readonly staffLastReadMap = new Map<string, Date>();

  constructor(private readonly prisma: PrismaService) {}

  markStaffAllRead(userId?: string) {
    const now = new Date();
    if (userId) this.staffLastReadMap.set(userId, now);
    this.staffLastReadMap.set('global', now);
    return { success: true, timestamp: now.toISOString() };
  }

  async mine(user: { familyId?: string; studentId?: string; role?: string; sub?: string; id?: string }) {
    const isStaff = ['superadmin', 'owner', 'receptionist', 'instructor'].includes(user.role || '');
    if (isStaff) {
      return this.staffFeed(user.id || user.sub);
    }

    const familyId = user.familyId || (user.role === 'family' ? user.sub || user.id : undefined);
    const items: FeedItem[] = [];
    if (!familyId) return { items };

    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: {
        students: {
          include: {
            subscriptions: { orderBy: { createdAt: 'desc' }, take: 2 },
            courseEnrollments: {
              where: { status: 'active' },
              include: {
                course: {
                  include: {
                    sessions: {
                      where: { sessionDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
                      orderBy: { sessionDate: 'asc' },
                      take: 6,
                    },
                  },
                },
              },
            },
          },
        },
        invoices: { orderBy: { dueDate: 'asc' }, take: 20, include: { payments: false } as never },
      },
    }).catch(() => null);
    if (!family) return { items };

    const phones = new Set<string>();
    if (family.parentPhone) phones.add(family.parentPhone.trim());
    for (const s of family.students) {
      if (s.parentPhone) phones.add(s.parentPhone.trim());
    }

    // 1. Recent WhatsApp messages to this household's numbers.
    if (phones.size > 0) {
      const logs = await this.prisma.openWaLog.findMany({
        where: { recipientPhone: { in: Array.from(phones) } },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }).catch(() => []);
      for (const l of logs) {
        items.push({
          id: `msg-${l.id}`,
          kind: 'message',
          severity: 'info',
          title: `WhatsApp: ${l.triggerEvent.replace(/_/g, ' ')}`,
          titleAr: `واتساب: ${l.recipientName}`,
          body: String(l.body || '').slice(0, 160),
          createdAt: l.createdAt.toISOString(),
        });
      }
    }

    // 2. Low-quota warnings (server-computed, not toast-only).
    for (const s of family.students) {
      const sub = s.subscriptions[0];
      if (!sub || sub.status !== 'active') continue;
      const left = sub.maxSessions - sub.usedSessions;
      if (left <= 2) {
        items.push({
          id: `quota-${s.id}-${sub.id}`,
          kind: 'quota',
          severity: left <= 0 ? 'urgent' : 'warning',
          title: `${s.name}: ${left} session${left === 1 ? '' : 's'} left`,
          titleAr: `${s.name}: متبقٍ ${left} من الحصص`,
          body: `Package ${sub.planName} ends ${sub.endDate.toISOString().split('T')[0]}. Renew to keep the seat.`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 3. Unpaid / overdue invoices.
    for (const inv of (family as unknown as { invoices: Array<{ id: string; invoiceNumber: string; status: string; dueDate: Date; total: unknown; remainingDue: unknown }> }).invoices || []) {
      if (inv.status === 'paid' || inv.status === 'cancelled') continue;
      const overdue = inv.status === 'overdue' || new Date(inv.dueDate).getTime() < Date.now();
      items.push({
        id: `inv-${inv.id}`,
        kind: 'invoice',
        severity: overdue ? 'urgent' : 'warning',
        title: `Invoice ${inv.invoiceNumber}: EGP ${toNumber(inv.remainingDue)} due`,
        titleAr: `فاتورة ${inv.invoiceNumber}: مستحق ${toNumber(inv.remainingDue)} ج.م`,
        body: `Due ${new Date(inv.dueDate).toISOString().split('T')[0]} — pay online from Billing.`,
        createdAt: new Date(inv.dueDate).toISOString(),
      });
    }

    // 4. Upcoming sessions (next 7 days across enrolled courses).
    const weekOut = Date.now() + 7 * 24 * 60 * 60 * 1000;
    for (const s of family.students) {
      for (const e of s.courseEnrollments) {
        for (const sess of e.course.sessions.filter((x) => x.sessionDate.getTime() <= weekOut)) {
          items.push({
            id: `sess-${s.id}-${sess.id}`,
            kind: 'session',
            severity: 'info',
            title: `${s.name} — ${e.course.title}`,
            titleAr: `${s.name} — ${e.course.titleAr || e.course.title}`,
            body: `${sess.sessionDate.toISOString().split('T')[0]} ${sess.startTime} · ${sess.studioRoom}`,
            createdAt: sess.sessionDate.toISOString(),
          });
        }
      }
    }

    items.sort((a, b) => (a.severity === b.severity ? b.createdAt.localeCompare(a.createdAt) : a.severity === 'urgent' ? -1 : 1));
    return { items: items.slice(0, 40) };
  }

  private async staffFeed(userId?: string): Promise<{ items: FeedItem[] }> {
    const items: FeedItem[] = [];
    const [attendances, lowQuotas, invoices, waLogs, leads, orders] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        orderBy: { timestamp: 'desc' },
        take: 15,
        include: { student: { select: { id: true, name: true, nameAr: true } } },
      }).catch(() => []),
      this.prisma.studentSubscription.findMany({
        where: { status: 'active' },
        orderBy: { updatedAt: 'desc' },
        take: 25,
        include: { student: { select: { id: true, name: true, nameAr: true } } },
      }).catch(() => []),
      this.prisma.invoice.findMany({
        where: { status: { in: ['pending', 'overdue', 'partially_paid'] } },
        orderBy: { dueDate: 'asc' },
        take: 15,
        include: { family: { select: { id: true, parentName: true } } },
      }).catch(() => []),
      this.prisma.openWaLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 15,
      }).catch(() => []),
      this.prisma.admissionLead.findMany({
        where: { stage: { in: ['new_inquiry', 'audition_scheduled'] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }).catch(() => []),
      this.prisma.boutiqueOrder.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { student: { select: { id: true, name: true } } },
      }).catch(() => []),
    ]);

    for (const a of attendances) {
      items.push({
        id: `att-${a.id}`,
        kind: 'attendance',
        severity: a.status === 'granted' ? 'info' : 'urgent',
        title: `Check-in: ${a.student?.name || a.studentId}`,
        titleAr: `تسجيل حضور: ${a.student?.nameAr || a.student?.name || a.studentId}`,
        body: `${a.classTitle} · ${a.status} · ${a.quotaRemaining ?? 0} sessions remaining`,
        createdAt: a.timestamp.toISOString(),
      });
    }

    for (const sub of lowQuotas) {
      const left = sub.maxSessions - sub.usedSessions;
      if (left <= 2) {
        items.push({
          id: `quota-${sub.id}`,
          kind: 'quota',
          severity: left <= 0 ? 'urgent' : 'warning',
          title: `Quota Watch: ${sub.student?.name || 'Student'}`,
          titleAr: `مراقبة الحصص: ${sub.student?.nameAr || sub.student?.name || 'طالب'}`,
          body: `${left} session${left === 1 ? '' : 's'} remaining on package ${sub.planName}.`,
          createdAt: sub.updatedAt.toISOString(),
        });
      }
    }

    for (const inv of invoices) {
      const overdue = inv.status === 'overdue' || new Date(inv.dueDate).getTime() < Date.now();
      items.push({
        id: `inv-${inv.id}`,
        kind: 'invoice',
        severity: overdue ? 'urgent' : 'warning',
        title: `Invoice ${inv.invoiceNumber} Pending`,
        titleAr: `فاتورة ${inv.invoiceNumber} معلقة`,
        body: `EGP ${toNumber(inv.remainingDue || inv.total)} due for ${inv.family?.parentName || 'Household'}`,
        createdAt: inv.createdAt.toISOString(),
      });
    }

    for (const l of waLogs) {
      items.push({
        id: `msg-${l.id}`,
        kind: 'message',
        severity: l.status === 'failed' ? 'urgent' : 'info',
        title: `WhatsApp: ${l.triggerEvent.replace(/_/g, ' ')}`,
        titleAr: `واتساب: ${l.recipientName}`,
        body: `${l.recipientPhone} · ${l.status}: ${String(l.body || '').slice(0, 100)}`,
        createdAt: l.createdAt.toISOString(),
      });
    }

    for (const l of leads) {
      items.push({
        id: `lead-${l.id}`,
        kind: 'crm',
        severity: 'info',
        title: `New Lead: ${l.dancerName}`,
        titleAr: `طلب قبول: ${l.dancerName}`,
        body: `${l.preferredProgram || 'Ballet'} · Parent: ${l.parentName} (${l.parentPhone})`,
        createdAt: l.createdAt.toISOString(),
      });
    }

    for (const o of orders) {
      items.push({
        id: `ord-${o.id}`,
        kind: 'finance',
        severity: 'info',
        title: `Boutique Order #${o.id.slice(-6).toUpperCase()}`,
        titleAr: `طلب متجر #${o.id.slice(-6).toUpperCase()}`,
        body: `Total: EGP ${toNumber(o.totalAmount)} · ${o.paymentMethod || 'cash'} · ${o.student?.name || 'Direct Sale'}`,
        createdAt: o.createdAt.toISOString(),
      });
    }

    const lastRead = userId
      ? this.staffLastReadMap.get(userId) || this.staffLastReadMap.get('global')
      : this.staffLastReadMap.get('global');

    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      items: items.slice(0, 60).map((i) => ({
        ...i,
        isRead: lastRead ? new Date(i.createdAt).getTime() <= lastRead.getTime() : false,
      })),
    };
  }
}

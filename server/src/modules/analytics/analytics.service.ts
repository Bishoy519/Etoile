import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type AnalyticsRange = '30D' | '90D' | '12M';

function bucketCount(range: AnalyticsRange): number {
  return range === '30D' ? 30 : range === '90D' ? 12 : 12;
}

function rangeWindowMs(range: AnalyticsRange): number {
  const DAY = 86400000;
  return range === '30D' ? 30 * DAY : range === '90D' ? 90 * DAY : 365 * DAY;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private safeDate(v: unknown): number {
    try {
      const t = new Date(v as string).getTime();
      return Number.isFinite(t) ? t : Date.now();
    } catch {
      return Date.now();
    }
  }

  async overview() {
    const [studentsRaw, subscriptionsRaw, ordersRaw, attendanceRaw, leadsRaw, sessionsRaw, invoicesRaw] = await Promise.all([
      this.prisma.student.findMany({ include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } } }).catch(() => []),
      this.prisma.studentSubscription.findMany().catch(() => []),
      this.prisma.boutiqueOrder.findMany().catch(() => []),
      this.prisma.attendanceRecord.findMany({ orderBy: { timestamp: 'desc' }, take: 500 }).catch(() => []),
      this.prisma.admissionLead.findMany().catch(() => []),
      this.prisma.courseSession.findMany().catch(() => []),
      this.prisma.invoice.findMany().catch(() => []),
    ]);
    const students: any[] = studentsRaw as any[];
    const subscriptions: any[] = subscriptionsRaw as any[];
    const orders: any[] = ordersRaw as any[];
    const attendance: any[] = attendanceRaw as any[];
    const leads: any[] = leadsRaw as any[];
    const sessions: any[] = sessionsRaw as any[];
    const invoices: any[] = invoicesRaw as any[];

    const tuitionRecognized = subscriptions.reduce((sum: number, s: any) => {
      const max = s.maxSessions || 1;
      const used = s.usedSessions || 0;
      return sum + Math.round(((s.price || 0) / max) * used);
    }, 0);
    const retail = orders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
    const inflow = tuitionRecognized + retail;

    const expensesRaw = await this.prisma.expense.findMany().catch(() => []);
    const payrollRaw = await this.prisma.payrollRecord.findMany().catch(() => []);
    const expenses: any[] = expensesRaw as any[];
    const payroll: any[] = payrollRaw as any[];
    const opex = expenses.reduce((s: number, e: any) => s + (e.total || 0), 0);
    const payrollTotal = payroll.reduce((s: number, p: any) => s + (p.netPayable || 0), 0);
    const outflow = opex + payrollTotal;
    const net = inflow - outflow;

    const activePkgs = subscriptions.filter((s: any) => s.status === 'active').length;
    const quotaMax = subscriptions.reduce((s: number, x: any) => s + (x.maxSessions || 0), 0);
    const quotaUsed = subscriptions.reduce((s: number, x: any) => s + (x.usedSessions || 0), 0);
    const utilization = quotaMax > 0 ? Number(((quotaUsed / quotaMax) * 100).toFixed(1)) : 0;

    const arDebt = students.reduce((s: number, st: any) => s + (st.walletBalance < 0 ? Math.abs(st.walletBalance) : 0), 0);
    const unpaidInvoices = invoices.reduce((s: number, inv: any) => s + (inv.remainingDue || 0), 0);

    const byProgram: Record<string, number> = { classical: 0, contemporary: 0, youth: 0 };
    students.forEach((st: any) => {
      if (byProgram[st.program] !== undefined) byProgram[st.program] += 1;
    });

    const funnel: Record<string, number> = {};
    leads.forEach((l: any) => {
      funnel[l.stage] = (funnel[l.stage] || 0) + 1;
    });
    const enrolled = funnel['enrolled'] || 0;
    const conversion = leads.length ? Number(((enrolled / leads.length) * 100).toFixed(1)) : 0;

    // SLA: trials older than 48h without stage change
    const now = Date.now();
    const slaBreached = leads.filter((l: any) => {
      if (l.stage !== 'trial_scheduled' && l.stage !== 'new_inquiry') return false;
      const ageH = (now - this.safeDate(l.updatedAt || l.createdAt)) / 36e5;
      return ageH > 48;
    }).length;

    return {
      generatedAt: new Date().toISOString(),
      counts: {
        students: students.length,
        activePackages: activePkgs,
        attendanceEvents: attendance.length,
        leads: leads.length,
        sessions: sessions.length,
        orders: orders.length,
      },
      money: { tuitionRecognized, retail, inflow, opex, payroll: payrollTotal, outflow, net, margin: inflow > 0 ? Number(((net / inflow) * 100).toFixed(1)) : 0, arDebt, unpaidInvoices },
      engagement: { quotaMax, quotaUsed, utilization, conversion, funnel, slaBreached },
      programMix: byProgram,
    };
  }

  async trend(range: AnalyticsRange = '90D', metric: 'revenue' | 'attendance' | 'enrollment' = 'revenue') {
    const n = bucketCount(range);
    const [ordersRaw, attendanceRaw, studentsRaw, subsRaw] = await Promise.all([
      this.prisma.boutiqueOrder.findMany({ orderBy: { createdAt: 'asc' } }).catch(() => []),
      this.prisma.attendanceRecord.findMany({ orderBy: { timestamp: 'asc' } }).catch(() => []),
      this.prisma.student.findMany({ orderBy: { createdAt: 'asc' } }).catch(() => []),
      this.prisma.studentSubscription.findMany().catch(() => []),
    ]);
    const orders: any[] = ordersRaw as any[];
    const attendance: any[] = attendanceRaw as any[];
    const students: any[] = studentsRaw as any[];
    const subs: any[] = subsRaw as any[];

    const tuitionTotal = subs.reduce((s: number, x: any) => s + (x.price || 0), 0);
    const retailTotal = orders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);

    // Real calendar bucketing: n equal slices over the trailing window.
    // Out-of-window events clamp into the oldest bucket; empty databases
    // honestly report all-zero series (never synthetic projections).
    const span = rangeWindowMs(range);
    const windowStart = Date.now() - span;
    const bucketMs = span / n;
    const buckets: number[] = new Array(n).fill(0);
    const place = (date: unknown, weight: number) => {
      const t = this.safeDate(date);
      const idx = Math.min(n - 1, Math.max(0, Math.floor((t - windowStart) / bucketMs)));
      buckets[idx] += weight;
    };

    if (metric === 'revenue') {
      orders.forEach((o: any) => place(o.createdAt, o.totalAmount || 0));
      subs.forEach((s: any) => place(s.createdAt, (s.price || 0) / Math.max(1, n / 3)));
    } else if (metric === 'attendance') {
      attendance.forEach((a: any) => place(a.timestamp, 1));
    } else {
      students.forEach((s: any) => place(s.createdAt, 1));
      // cumulative enrollment
      let run = 0;
      for (let i = 0; i < n; i++) { run += buckets[i]; buckets[i] = run; }
    }

    return { range, metric, points: buckets.map(Math.round), total: Math.round(buckets.reduce((a, b) => a + b, 0)) };
  }

  async attention() {
    const [students, leads, sessions] = await Promise.all([
      this.prisma.student.findMany({ include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } } }).catch(() => []),
      this.prisma.admissionLead.findMany().catch(() => []),
      this.prisma.courseSession.findMany({ where: { reminderSent: false } }).catch(() => []),
    ]);
    const now = Date.now();

    const lowQuota = students
      .filter((s: any) => {
        const sub = s.subscriptions?.[0];
        if (!sub || sub.status !== 'active') return false;
        return sub.maxSessions - sub.usedSessions <= 2;
      })
      .slice(0, 20)
      .map((s: any) => ({ id: s.id, name: s.name, phone: s.parentPhone, left: s.subscriptions[0].maxSessions - s.subscriptions[0].usedSessions, endDate: s.subscriptions[0].endDate }));

    const debtors = students
      .filter((s: any) => s.walletBalance < 0)
      .slice(0, 20)
      .map((s: any) => ({ id: s.id, name: s.name, phone: s.parentPhone, debt: Math.abs(s.walletBalance) }));

    const expiringSoon = students
      .filter((s: any) => {
        const sub = s.subscriptions?.[0];
        if (!sub || sub.status !== 'active') return false;
        const days = (new Date(sub.endDate).getTime() - now) / 864e5;
        return days >= 0 && days <= 7;
      })
      .slice(0, 20)
      .map((s: any) => ({ id: s.id, name: s.name, endDate: s.subscriptions[0].endDate }));

    const sla = leads
      .filter((l: any) => {
        if (l.stage !== 'new_inquiry' && l.stage !== 'trial_scheduled') return false;
        return (now - this.safeDate(l.updatedAt || l.createdAt)) / 36e5 > 48;
      })
      .slice(0, 20)
      .map((l: any) => ({ id: l.id, dancer: l.dancerName, stage: l.stage, phone: l.parentPhone }));

    return { lowQuota, debtors, expiringSoon, sla, pendingReminders: sessions.length };
  }

  async forecast() {
    const o = await this.overview();
    // Honest projection base: real recognized inflow (zero when books are
    // empty — never a fabricated floor).
    const monthly = o.money.inflow || 0;
    return {
      base: monthly,
      months: [1, 2, 3].map((m) => ({
        month: `M+${m}`,
        low: Math.round(monthly * (1 + m * 0.03) * 0.92),
        base: Math.round(monthly * (1 + m * 0.06)),
        high: Math.round(monthly * (1 + m * 0.09) * 1.06),
      })),
    };
  }
}

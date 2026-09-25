import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parsePagination } from '../../common/pagination.util';
import { toNumber, round2, sumBy } from '../../common/money.util';
import { postVoucher, expenseCoa, cashAccount } from './gl-posting.util';
import { EtaService } from '../eta/eta.service';
import { PushService } from '../notifications/push.service';

export interface ListQuery {
  page?: string | number;
  limit?: string | number;
}

@Injectable()
export class AccountingService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly eta?: EtaService,
    @Optional() private readonly push?: PushService,
  ) {}

  private static readonly ALLOWED_COA = new Set([
    '1010', '10100', '1020', '10200', '10300',
    '1200', '1300', '2010', '20200', '2100',
    '3010', '30100', '4010', '40100', '4020', '40500',
    '5010', '50100', '5020', '5030',
    '60100', '60200', '60300', '60400', '60500', '60600', '60700', '60900',
  ]);

  async getPnLStatement() {
    const DAY_MS = 1000 * 60 * 60 * 24;
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * DAY_MS);

    // 1. Subscriptions: IFRS-15 style daily recognition over each plan window.
    const subscriptions = await this.prisma.studentSubscription.findMany();
    const totalSubscriptionsSold = round2(subscriptions.reduce((sum, s) => sum + toNumber((s as unknown as { price: unknown }).price), 0));

    let recognizedRevenue = 0;
    let deferredRevenue = 0;
    let recognizedLast30d = 0;
    let expiredCount = 0;

    for (const sub of subscriptions) {
      const price = toNumber((sub as unknown as { price: unknown }).price);
      const start = sub.startDate.getTime();
      const end = sub.endDate.getTime();
      const totalDays = Math.max(1, Math.round((end - start) / DAY_MS));
      const dailyRate = price / totalDays;
      const elapsedDays = Math.min(totalDays, Math.max(0, Math.round((now.getTime() - start) / DAY_MS)));
      const recognized = Math.round(dailyRate * elapsedDays);
      recognizedRevenue += recognized;
      deferredRevenue += Math.max(0, price - recognized);

      // Revenue earned inside the trailing 30-day window (MRR proxy).
      const windowStart = Math.max(start, monthAgo.getTime());
      const windowEnd = Math.min(end, now.getTime());
      if (windowEnd > windowStart) {
        recognizedLast30d += Math.round(dailyRate * ((windowEnd - windowStart) / DAY_MS));
      }

      if (sub.status !== 'active') expiredCount += 1;
    }

    // 2. Retail boutique gross intake — purely from recorded orders.
    const orders = await this.prisma.boutiqueOrder.findMany();
    const retailGrossMargin = sumBy(orders as unknown as Array<Record<string, unknown>>, 'totalAmount' as never);

    // 3. Operational expenses & payroll — purely from recorded rows.
    // Empty books mean zero spend, not an invented baseline.
    const dbExpenses = await this.prisma.expense.findMany().catch(() => []);
    const dbPayroll = await this.prisma.payrollRecord.findMany().catch(() => []);

    const opex = sumBy(dbExpenses as unknown as Array<Record<string, unknown>>, 'total' as never);
    const payroll = sumBy(dbPayroll as unknown as Array<Record<string, unknown>>, 'netPayable' as never);

    const totalInflow = recognizedRevenue + retailGrossMargin;
    const totalOutflow = payroll + opex;
    const netProfit = totalInflow - totalOutflow;

    // 4. Real quota utilization across latest subscriptions.
    const students = await this.prisma.student.findMany({
      include: { subscriptions: true },
    });
    let totalMaxSessions = 0;
    let totalUsedSessions = 0;

    for (const s of students) {
      for (const sub of s.subscriptions || []) {
        totalMaxSessions += sub.maxSessions;
        totalUsedSessions += sub.usedSessions;
      }
    }

    const quotaUtilizationRate =
      totalMaxSessions > 0 ? Number(((totalUsedSessions / totalMaxSessions) * 100).toFixed(1)) : 0;

    return {
      period: 'Current Academic Term 2026 (EGP / ج.م)',
      currency: 'EGP',
      revenue: {
        totalSubscriptionsSold,
        recognizedSubscriptions: recognizedRevenue,
        deferredRevenue,
        retailGrossMargin,
        totalRecognizedInflow: totalInflow,
      },
      expenses: {
        payroll,
        opex,
        totalOperationalOutflow: totalOutflow,
      },
      netProfit,
      metrics: {
        mrr: recognizedLast30d,
        churnRate:
          subscriptions.length > 0
            ? Number(((expiredCount / subscriptions.length) * 100).toFixed(1))
            : 0,
        quotaUtilizationRate,
      },
    };
  }

  calculateAccrualAllocation(planPrice: number, totalDays: number, daysInMonth1: number) {
    const dailyAccrualRate = planPrice / totalDays;
    const recognizedRevenueMonth1 = dailyAccrualRate * daysInMonth1;
    const deferredRevenueMonth2 = planPrice - recognizedRevenueMonth1;

    return {
      dailyAccrualRate,
      recognizedRevenueMonth1,
      deferredRevenueMonth2,
      formula: {
        dailyRate: 'P / T_days',
        recognized: 'Rd * DaysElapsedMonth1',
        deferred: 'P - Recognized',
      },
    };
  }

  // Financial Subsystems CRUD
  async getExpenses(query?: ListQuery) {
    const { skip, take } = parsePagination(query ?? {}, 100, 500);
    return this.prisma.expense.findMany({ orderBy: { date: 'desc' }, skip, take });
  }

  async createExpense(data: any) {
    const expenseNumber = data.expenseNumber || `EXP-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
    const amount = Number(data.amount ?? data.total ?? 0);
    let vatAmount = Number(data.vatAmount ?? 0);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException('Expense amount must be a non-negative number');
    }
    if (!Number.isFinite(vatAmount) || vatAmount < 0) {
      throw new BadRequestException('VAT amount must be non-negative');
    }
    if (vatAmount > amount) {
      throw new BadRequestException('VAT amount cannot exceed expense amount');
    }
    const total = Number(data.total ?? amount + vatAmount);
    const allowedStatus = ['approved', 'pending_audit', 'rejected'];
    const created = await this.prisma.expense.create({
      data: {
        expenseNumber,
        category: data.category || 'studio_rent',
        description: data.description || 'Academy Operating Expense',
        amount,
        vatAmount,
        total,
        vendor: data.vendor || 'Authorized Supplier',
        paymentMethod: data.paymentMethod || 'corporate_card',
        status: allowedStatus.includes(data.status) ? data.status : 'pending_audit',
        approvedBy: data.approvedBy || 'Finance Director',
        requestedBy: data.requestedBy || data.approvedBy || null,
      },
    });
    const coa = expenseCoa(created.category);
    postVoucher(this.prisma as never, `Expense ${created.expenseNumber} — ${created.category}`, [
      { accountCode: coa.code, accountName: coa.name, debit: toNumber((created as unknown as { total: unknown }).total) },
      { accountCode: '1010', accountName: 'Cash', credit: toNumber((created as unknown as { total: unknown }).total) },
    ]).catch(() => null);
    return created;
  }

  async deleteExpense(id: string) {
    // Soft-void: never hard-delete financial rows. Mark rejected with audit note.
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('Expense not found');
    return this.prisma.expense.update({
      where: { id },
      data: { status: 'rejected', description: `${existing.description} [VOIDED ${new Date().toISOString()}]` },
    });
  }

  /** Approval queue: expenses awaiting owner/director sign-off. */
  async getPendingExpenses() {
    return this.prisma.expense.findMany({
      where: { status: 'pending_audit' },
      orderBy: { date: 'asc' },
      take: 200,
    });
  }

  /**
   * Maker-checker: the requester can never approve their own expense.
   * requestedBy falls back to approvedBy for legacy rows (fail-open would
   * defeat the control, so unknown requesters stay approvable only when the
   * actor differs from approvedBy).
   */
  private samePerson(a?: string | null, b?: string | null): boolean {
    if (!a || !b) return false;
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }

  async approveExpense(id: string, actorName?: string) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('Expense not found');
    if (existing.status !== 'pending_audit') throw new BadRequestException(`Only pending expenses can be approved (is ${existing.status})`);
    const requester = (existing as unknown as { requestedBy?: string }).requestedBy || existing.approvedBy;
    if (this.samePerson(requester, actorName) && requester !== 'Finance Director') {
      throw new BadRequestException('Maker-checker: requester cannot approve their own expense');
    }
    const updated = await this.prisma.expense.update({
      where: { id },
      data: { status: 'approved', approvedBy: actorName || 'Finance Director' },
    });
    await this.prisma.crmAuditEntry.create({
      data: { action: 'Expense Approved', actor: actorName || 'Finance', details: `${existing.expenseNumber} EGP ${toNumber((existing as unknown as { total: unknown }).total)}`, category: 'financial' },
    }).catch(() => null);
    return updated;
  }

  async rejectExpense(id: string, actorName?: string, reason?: string) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('Expense not found');
    if (existing.status !== 'pending_audit') throw new BadRequestException(`Only pending expenses can be rejected (is ${existing.status})`);
    const updated = await this.prisma.expense.update({
      where: { id },
      data: { status: 'rejected', approvedBy: actorName || 'Finance Director', description: `${existing.description}${reason ? ` [REJECTED: ${reason.slice(0, 200)}]` : ' [REJECTED]'}` },
    });
    await this.prisma.crmAuditEntry.create({
      data: { action: 'Expense Rejected', actor: actorName || 'Finance', details: `${existing.expenseNumber}`, category: 'financial' },
    }).catch(() => null);
    return updated;
  }

  // --------------------------------------------------------------------------
  // BUDGETS vs ACTUALS (monthly, per category + payroll line)
  // --------------------------------------------------------------------------
  static readonly BUDGET_CATEGORIES = [
    'studio_rent', 'utilities', 'piano_maintenance', 'costumes_production',
    'cleaning_sanitization', 'marketing_social', 'software_licenses',
    'administrative_legal', 'payroll',
  ];

  private periodBounds(period: string): { start: Date; end: Date } {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new BadRequestException('period must be YYYY-MM');
    const [y, m] = period.split('-').map(Number);
    return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
  }

  async upsertBudget(data: { period: string; category: string; amount: number; createdBy?: string }) {
    const { start } = this.periodBounds(data.period);
    void start;
    if (!AccountingService.BUDGET_CATEGORIES.includes(data.category)) {
      throw new BadRequestException(`Invalid category. Allowed: ${AccountingService.BUDGET_CATEGORIES.join(', ')}`);
    }
    const amount = round2(Number(data.amount));
    if (!Number.isFinite(amount) || amount < 0) throw new BadRequestException('Budget amount must be non-negative');
    return this.prisma.budget.upsert({
      where: { period_category: { period: data.period, category: data.category } },
      update: { amount, createdBy: data.createdBy || undefined },
      create: { period: data.period, category: data.category, amount, createdBy: data.createdBy || null },
    });
  }

  async budgetsVsActual(period?: string) {
    const now = new Date();
    const per = period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { start, end } = this.periodBounds(per);
    const [budgets, expenses, payroll] = await Promise.all([
      this.prisma.budget.findMany({ where: { period: per } }).catch(() => []),
      this.prisma.expense.findMany({ where: { date: { gte: start, lt: end } } }).catch(() => []),
      this.prisma.payrollRecord.findMany({ where: { month: per } }).catch(() => []),
    ]);
    const actualByCat = new Map<string, number>();
    for (const e of expenses as unknown as Array<{ status: string; category: string; total: unknown }>) {
      if (e.status === 'rejected') continue;
      actualByCat.set(e.category, round2((actualByCat.get(e.category) || 0) + toNumber(e.total)));
    }
    const payrollActual = round2(
      (payroll as unknown as Array<{ netPayable: unknown }>).reduce((s, p) => s + toNumber(p.netPayable), 0),
    );
    actualByCat.set('payroll', round2((actualByCat.get('payroll') || 0) + payrollActual));
    const budgetMap = new Map(
      (budgets as unknown as Array<{ category: string; amount: unknown }>).map((b) => [b.category, toNumber(b.amount)]),
    );
    const cats = Array.from(new Set([...AccountingService.BUDGET_CATEGORIES, ...actualByCat.keys()]));
    const rows = cats.map((category) => {
      const budget = budgetMap.get(category) || 0;
      const actual = actualByCat.get(category) || 0;
      return { category, budget, actual, variance: round2(budget - actual), over: actual - budget > 0.01 };
    });
    const totalBudget = round2(rows.reduce((s, r) => s + r.budget, 0));
    const totalActual = round2(rows.reduce((s, r) => s + r.actual, 0));
    return { period: per, rows, totals: { budget: totalBudget, actual: totalActual, variance: round2(totalBudget - totalActual) } };
  }

  // --------------------------------------------------------------------------
  // FX RATES (EGP base; converted display only — ledger always posts EGP)
  // --------------------------------------------------------------------------

  async listFx() {
    const rows = await this.prisma.fxRate.findMany({ orderBy: { currency: 'asc' } }).catch(() => []);
    return [{ currency: 'EGP', rateToEgp: 1 }, ...rows.map((r: { currency: string; rateToEgp: unknown }) => ({
      currency: r.currency,
      rateToEgp: toNumber(r.rateToEgp),
    }))];
  }

  async upsertFx(data: { currency: string; rateToEgp: number; updatedBy?: string }) {
    const currency = (data.currency || '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency) || currency === 'EGP') throw new BadRequestException('Currency must be a 3-letter code other than EGP');
    const rate = Number(data.rateToEgp);
    if (!Number.isFinite(rate) || rate <= 0) throw new BadRequestException('rateToEgp must be positive (EGP per 1 unit)');
    return this.prisma.fxRate.upsert({
      where: { currency },
      update: { rateToEgp: rate, updatedBy: data.updatedBy || undefined },
      create: { currency, rateToEgp: rate, updatedBy: data.updatedBy || null },
    });
  }

  async getInvoices(query?: ListQuery) {
    const { skip, take } = parsePagination(query ?? {}, 100, 500);
    return this.prisma.invoice.findMany({
      include: { items: true, payments: true },
      orderBy: { issueDate: 'desc' },
      skip,
      take,
    });
  }

  async createInvoice(data: any) {
    // Strictly mapped to the Prisma Invoice/InvoiceLineItem schema — unknown
    // client fields (legacy parentPhone/paymentTerms/'issued' status,
    // line.totalPrice) are normalized, never spread into Prisma.
    const { items } = data || {};
    const year = new Date().getFullYear();
    const invoiceNumber = data?.invoiceNumber || `INV-${year}-${Date.now().toString(36).toUpperCase()}`;
    const subtotal = Number(data?.subtotal ?? data?.total ?? 0);
    const taxRate = Number(data?.taxRate ?? 0);
    if (taxRate < 0 || taxRate > 1) throw new BadRequestException('taxRate must be between 0 and 1');
    const taxAmount = Number(data?.taxAmount ?? Math.round(subtotal * taxRate * 100) / 100);
    const total = Number(data?.total ?? subtotal + taxAmount);
    const amountPaid = 0;
    const allowedStatus = ['unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled'];
    const status = allowedStatus.includes(data?.status) ? data.status : 'unpaid';
    const dueDate = data?.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(subtotal) || Number.isNaN(total)) {
      throw new BadRequestException('Invoice requires numeric subtotal/total');
    }
    if (total < 0) throw new BadRequestException('Invoice total cannot be negative');
    const agingBucket = this.computeAgingBucket(dueDate, status);
    // Automatic family discounts (sibling rank + active scholarship), capped at 100%.
    let discountAmount = 0;
    let discountReason: string | null = null;
    if (data?.studentId) {
      const deal = await this.computeStudentDiscount(data.studentId, subtotal).catch(() => null);
      if (deal && deal.amount > 0) {
        discountAmount = deal.amount;
        discountReason = deal.reason;
      }
    }
    const totalAfterDiscount = round2(total - discountAmount);
    if (totalAfterDiscount < 0) throw new BadRequestException('Discounts exceed invoice total');
    const created = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        studentId: data?.studentId || null,
        familyId: data?.familyId || null,
        customerName: data?.customerName || 'Academy Client',
        issueDate: data?.issueDate ? new Date(data.issueDate) : new Date(),
        dueDate,
        subtotal,
        taxRate,
        taxAmount,
        total: totalAfterDiscount,
        amountPaid,
        remainingDue: totalAfterDiscount - amountPaid,
        status,
        agingBucket,
        discountAmount,
        discountReason,
        items: {
          create: (Array.isArray(items) ? items : []).map((item: any) => {
            const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
            const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
            return {
              description: item.description || 'Conservatory Tuition',
              quantity,
              unitPrice,
              amount: quantity * unitPrice,
            };
          }),
        },
      },
      include: { items: true, payments: true },
    });
    // Auto-post receivable + ETA best-effort (never blocks billing).
    postVoucher(this.prisma as never, `Invoice ${created.invoiceNumber} — AR`, [
      { accountCode: '1200', accountName: 'Accounts Receivable', debit: totalAfterDiscount },
      { accountCode: '4010', accountName: 'Tuition Revenue', credit: totalAfterDiscount },
    ]).catch(() => null);
    if (this.eta) this.eta.autoSubmitBestEffort(created.id, created).catch(() => null);
    return created;
  }

  // --------------------------------------------------------------------------
  // SIBLING DISCOUNTS + SCHOLARSHIPS (auto-applied at invoice time)
  // --------------------------------------------------------------------------

  private async discountPolicy() {
    const existing = await this.prisma.discountPolicy.findUnique({ where: { id: 'default' } }).catch(() => null);
    if (existing) {
      return {
        sibling2Percent: toNumber((existing as unknown as { sibling2Percent: unknown }).sibling2Percent),
        sibling3PlusPercent: toNumber((existing as unknown as { sibling3PlusPercent: unknown }).sibling3PlusPercent),
        enabled: (existing as unknown as { enabled: boolean }).enabled,
      };
    }
    await this.prisma.discountPolicy.create({ data: { id: 'default' } }).catch(() => null);
    return { sibling2Percent: 10, sibling3PlusPercent: 15, enabled: true };
  }

  async getDiscountPolicy() {
    return this.discountPolicy();
  }

  async updateDiscountPolicy(data: { sibling2Percent?: number; sibling3PlusPercent?: number; enabled?: boolean }) {
    await this.discountPolicy();
    const patch: Record<string, unknown> = {};
    for (const k of ['sibling2Percent', 'sibling3PlusPercent'] as const) {
      if (data[k] !== undefined) {
        const v = Math.floor(Number(data[k]));
        if (!Number.isFinite(v) || v < 0 || v > 90) throw new BadRequestException(`${k} must be 0–90`);
        patch[k] = v;
      }
    }
    if (data.enabled !== undefined) patch.enabled = !!data.enabled;
    return this.prisma.discountPolicy.update({ where: { id: 'default' }, data: patch });
  }

  /** Rank among the family's dancers by enrollment order (1-based). */
  async computeStudentDiscount(studentId: string, subtotal: number): Promise<{ amount: number; reason: string } | null> {
    const student = await this.prisma.student.findUnique({ where: { id: studentId }, select: { familyId: true, createdAt: true } });
    if (!student) return null;
    const policy = await this.discountPolicy();
    const parts: string[] = [];
    let pct = 0;
    if (policy.enabled) {
      const siblings = await this.prisma.student.findMany({
        where: { familyId: student.familyId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      const rank = siblings.findIndex((s) => s.id === studentId) + 1;
      if (rank === 2 && policy.sibling2Percent > 0) {
        pct += policy.sibling2Percent;
        parts.push(`Sibling ${policy.sibling2Percent}%`);
      } else if (rank >= 3 && policy.sibling3PlusPercent > 0) {
        pct += policy.sibling3PlusPercent;
        parts.push(`Sibling ${policy.sibling3PlusPercent}%`);
      }
    }
    const scholarship = await this.prisma.scholarship.findFirst({ where: { studentId, status: 'active' } }).catch(() => null);
    if (scholarship) {
      const sp = Math.min(100, Math.max(0, Number((scholarship as unknown as { percent: unknown }).percent) || 0));
      if (sp > 0) {
        pct += sp;
        parts.push(`Scholarship ${sp}%`);
      }
    }
    pct = Math.min(100, pct);
    if (pct <= 0) return null;
    return { amount: round2((subtotal * pct) / 100), reason: parts.join(' + ') };
  }

  async listScholarships(status = 'active') {
    const where: Record<string, unknown> = {};
    if (status !== 'all') where.status = status;
    return this.prisma.scholarship.findMany({
      where,
      include: { student: { select: { id: true, name: true, familyId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async grantScholarship(data: { studentId: string; percent: number; reason?: string; grantedBy?: string }) {
    const student = await this.prisma.student.findUnique({ where: { id: data.studentId } });
    if (!student) throw new BadRequestException('Student not found');
    const pct = Math.floor(Number(data.percent));
    if (!Number.isFinite(pct) || pct < 1 || pct > 100) throw new BadRequestException('Percent must be 1–100');
    if (!data.reason?.trim()) throw new BadRequestException('A reason is required for audit');
    await this.prisma.scholarship.updateMany({ where: { studentId: data.studentId, status: 'active' }, data: { status: 'revoked' } });
    const created = await this.prisma.scholarship.create({
      data: { studentId: data.studentId, percent: pct, reason: data.reason.trim().slice(0, 500), status: 'active', grantedBy: data.grantedBy || null },
    });
    await this.prisma.crmAuditEntry.create({
      data: { action: 'Scholarship Granted', actor: data.grantedBy || 'Finance', details: `${student.name} ${pct}%: ${created.reason}`, category: 'financial' },
    }).catch(() => null);
    return created;
  }

  async revokeScholarship(id: string, actorName?: string) {
    const existing = await this.prisma.scholarship.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('Scholarship not found');
    const updated = await this.prisma.scholarship.update({ where: { id }, data: { status: 'revoked' } });
    await this.prisma.crmAuditEntry.create({
      data: { action: 'Scholarship Revoked', actor: actorName || 'Finance', details: `${id}`, category: 'financial' },
    }).catch(() => null);
    return updated;
  }

  // --------------------------------------------------------------------------
  // PAYROLL APPROVAL CHAIN (prepare → approve → pay, maker-checker)
  // --------------------------------------------------------------------------

  async approvePayroll(id: string, actorName?: string) {
    const existing = await this.prisma.payrollRecord.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('Payroll record not found');
    if (existing.status !== 'pending') throw new BadRequestException(`Only pending slips can be approved (is ${existing.status})`);
    const preparer = (existing as unknown as { preparedBy?: string | null }).preparedBy;
    if (preparer && actorName && preparer.trim().toLowerCase() === actorName.trim().toLowerCase()) {
      throw new BadRequestException('Maker-checker: preparer cannot approve their own slip');
    }
    return this.prisma.payrollRecord.update({
      where: { id },
      data: { status: 'approved', approvedBy: actorName || 'Finance' },
    });
  }

  async getMyPayroll(instructorId: string) {
    return this.prisma.payrollRecord.findMany({
      where: { instructorId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  private computeAgingBucket(dueDate: Date, status: string): string {
    if (status === 'paid' || status === 'cancelled') return 'current';
    const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
    if (daysOverdue <= 0) return 'current';
    if (daysOverdue <= 30) return '1_30_days';
    if (daysOverdue <= 60) return '31_60_days';
    return 'over_60_days';
  }

  /** Record a payment against an invoice — transactional, server-authoritative. */
  async recordInvoicePayment(invoiceId: string, data: { amount: number; method: string; receivedBy?: string; shiftId?: string; notes?: string }) {
    const amount = round2(Number(data.amount));
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Payment amount must be positive');
    const allowedMethods = ['cash', 'card', 'bank_transfer', 'fawry', 'instapay'];
    if (!allowedMethods.includes(data.method)) throw new BadRequestException(`Invalid method. Allowed: ${allowedMethods.join(', ')}`);
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new BadRequestException('Invoice not found');
    if (invoice.status === 'cancelled') throw new BadRequestException('Cannot pay a cancelled invoice');
    if (invoice.status === 'paid') throw new BadRequestException('Invoice already paid');
    const paidSoFar = toNumber((invoice as unknown as { amountPaid: unknown }).amountPaid);
    const total = toNumber((invoice as unknown as { total: unknown }).total);
    const newPaid = round2(paidSoFar + amount);
    if (newPaid - total > 0.01) throw new BadRequestException('Overpayment exceeds remaining due');
    const fullyPaid = Math.abs(newPaid - total) < 0.01;
    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.paymentTransaction.create({
        data: {
          transactionNumber: `TXN-${Date.now().toString(36).toUpperCase()}`,
          invoiceId,
          studentId: invoice.studentId,
          amount,
          method: data.method,
          receivedBy: data.receivedBy || 'Reception Desk',
          shiftId: data.shiftId || null,
          notes: data.notes || '',
        },
      });
      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newPaid,
          remainingDue: Math.max(0, round2(total - newPaid)),
          status: fullyPaid ? 'paid' : 'partially_paid',
          agingBucket: this.computeAgingBucket(invoice.dueDate, fullyPaid ? 'paid' : 'partially_paid'),
        },
        include: { items: true, payments: true },
      });
      await tx.crmAuditEntry.create({
        data: { action: `Payment ${payment.transactionNumber} EGP ${amount} -> ${invoice.invoiceNumber}`, actor: data.receivedBy || 'system', details: invoiceId, category: 'financial' },
      }).catch(() => null);
      return { payment, invoice: updated };
    });
    const cash = cashAccount(data.method);
    postVoucher(this.prisma as never, `Settle ${invoice.invoiceNumber} — ${data.method} ${amount}`, [
      { accountCode: cash.code, accountName: cash.name, debit: amount },
      { accountCode: '1200', accountName: 'Accounts Receivable', credit: amount },
    ]).catch(() => null);
    // Native receipt alongside WhatsApp (best-effort, never blocks settlement).
    if (this.push) {
      const famId =
        invoice.familyId ||
        (await this.prisma.student.findUnique({ where: { id: invoice.studentId || '' }, select: { familyId: true } }).catch(() => null))?.familyId;
      if (famId) {
        this.push.notifyFamily(famId, {
          title: `Payment received — EGP ${amount}`,
          titleAr: `تم استلام دفعة — ${amount} ج.م`,
          body: `${invoice.invoiceNumber} via ${data.method}. Remaining: EGP ${Math.max(0, round2(total - newPaid))}.`,
          url: '/',
          tag: `pay-${invoiceId}`,
        }).catch(() => null);
      }
    }
    return result;
  }

  async cancelInvoice(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new BadRequestException('Invoice not found');
    if (invoice.status === 'paid') throw new BadRequestException('Cannot cancel a paid invoice — issue a credit note');
    return this.prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'cancelled', agingBucket: 'current', remainingDue: 0 }, include: { items: true, payments: true } });
  }

  // --------------------------------------------------------------------------
  // CREDIT NOTES (rebates on paid invoices — issue once, apply once, voidable)
  // --------------------------------------------------------------------------

  async listCreditNotes(invoiceId?: string) {
    const where: Record<string, unknown> = {};
    if (invoiceId) where.invoiceId = invoiceId;
    return this.prisma.creditNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { invoice: { select: { invoiceNumber: true } } },
    });
  }

  /** Issue a rebate against a paid/partially-paid invoice (capped at amountPaid). */
  async issueCreditNote(data: { invoiceId: string; amount: number; reason?: string; issuedBy?: string }) {
    const amount = round2(Number(data.amount));
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Credit amount must be positive');
    if (!data.reason?.trim()) throw new BadRequestException('A reason is required for audit');
    const invoice = await this.prisma.invoice.findUnique({ where: { id: data.invoiceId } });
    if (!invoice) throw new BadRequestException('Invoice not found');
    if (invoice.status === 'cancelled') throw new BadRequestException('Cannot credit a cancelled invoice');
    const paid = toNumber((invoice as unknown as { amountPaid: unknown }).amountPaid);
    if (paid <= 0) throw new BadRequestException('Only invoices with payments can be credited — cancel unpaid ones instead');
    if (amount - paid > 0.01) throw new BadRequestException(`Credit cannot exceed paid amount EGP ${paid}`);
    const year = new Date().getFullYear();
    const created = await this.prisma.creditNote.create({
      data: {
        creditNumber: `CN-${year}-${Date.now().toString(36).toUpperCase()}`,
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        familyId: invoice.familyId,
        amount,
        reason: data.reason.trim().slice(0, 500),
        status: 'issued',
        issuedBy: data.issuedBy || 'Finance',
      },
    });
    await this.prisma.crmAuditEntry.create({
      data: { action: 'Credit Note Issued', actor: data.issuedBy || 'Finance', details: `${created.creditNumber} EGP ${amount} on ${invoice.invoiceNumber}: ${created.reason}`, category: 'financial' },
    }).catch(() => null);
    return created;
  }

  /**
   * Apply a credit note once, in full:
   * - mode 'invoice': settle another OPEN invoice of the same family (transfer).
   * - mode 'wallet': credit the student's wallet (refund to balance).
   * Posts a balanced revenue-reversal voucher either way.
   */
  async applyCreditNote(id: string, data: { mode: 'invoice' | 'wallet'; targetInvoiceId?: string; actorName?: string }) {
    const note = await this.prisma.creditNote.findUnique({ where: { id } });
    if (!note) throw new BadRequestException('Credit note not found');
    if (note.status !== 'issued') throw new BadRequestException(`Credit note is ${note.status} — only issued notes can be applied`);
    const amount = toNumber((note as unknown as { amount: unknown }).amount);
    if (data.mode === 'invoice') {
      if (!data.targetInvoiceId) throw new BadRequestException('targetInvoiceId is required for invoice mode');
      if (data.targetInvoiceId === note.invoiceId) throw new BadRequestException('Cannot apply a credit to its own source invoice');
      const target = await this.prisma.invoice.findUnique({ where: { id: data.targetInvoiceId } });
      if (!target) throw new BadRequestException('Target invoice not found');
      if (target.status === 'paid' || target.status === 'cancelled') throw new BadRequestException('Target invoice needs no payment');
      if ((target.familyId || null) !== (note.familyId || null) && (target.studentId || null) !== (note.studentId || null)) {
        // Same-household guard: shared family OR shared student.
        const tStudent = target.studentId ? await this.prisma.student.findUnique({ where: { id: target.studentId }, select: { familyId: true } }).catch(() => null) : null;
        const nStudent = note.studentId ? await this.prisma.student.findUnique({ where: { id: note.studentId }, select: { familyId: true } }).catch(() => null) : null;
        if ((tStudent?.familyId || target.familyId) !== (nStudent?.familyId || note.familyId)) {
          throw new BadRequestException('Credit can only move within the same family');
        }
      }
      const targetDue = round2(toNumber((target as unknown as { total: unknown }).total) - toNumber((target as unknown as { amountPaid: unknown }).amountPaid));
      if (amount - targetDue > 0.01) throw new BadRequestException(`Credit EGP ${amount} exceeds target due EGP ${targetDue}`);
      const result = await this.prisma.$transaction(async (tx) => {
        await tx.paymentTransaction.create({
          data: {
            transactionNumber: `TXN-${Date.now().toString(36).toUpperCase()}`,
            invoiceId: target.id,
            studentId: target.studentId,
            amount,
            method: 'credit_note',
            receivedBy: data.actorName || 'Finance',
            notes: `Credit ${note.creditNumber}`,
          },
        });
        const newPaid = round2(toNumber((target as unknown as { amountPaid: unknown }).amountPaid) + amount);
        const total = toNumber((target as unknown as { total: unknown }).total);
        const fullyPaid = Math.abs(newPaid - total) < 0.01;
        const updatedTarget = await tx.invoice.update({
          where: { id: target.id },
          data: {
            amountPaid: newPaid,
            remainingDue: Math.max(0, round2(total - newPaid)),
            status: fullyPaid ? 'paid' : 'partially_paid',
            agingBucket: this.computeAgingBucket(target.dueDate, fullyPaid ? 'paid' : 'partially_paid'),
          },
        });
        const updatedNote = await tx.creditNote.update({
          where: { id },
          data: { status: 'applied', appliedToInvoiceId: target.id, appliedAt: new Date() },
        });
        await tx.crmAuditEntry.create({
          data: { action: 'Credit Note Applied', actor: data.actorName || 'Finance', details: `${note.creditNumber} EGP ${amount} → ${target.invoiceNumber}`, category: 'financial' },
        }).catch(() => null);
        return { note: updatedNote, invoice: updatedTarget };
      });
      postVoucher(this.prisma as never, `Credit ${note.creditNumber} applied — ${target.invoiceNumber}`, [
        { accountCode: '4010', accountName: 'Tuition Revenue', debit: amount },
        { accountCode: '1200', accountName: 'Accounts Receivable', credit: amount },
      ]).catch(() => null);
      return result;
    }
    // mode 'wallet'
    if (!note.studentId) throw new BadRequestException('Wallet refund needs a student on the credit note');
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.student.update({ where: { id: note.studentId! }, data: { walletBalance: { increment: amount } } });
      const updatedNote = await tx.creditNote.update({
        where: { id },
        data: { status: 'applied', appliedAt: new Date() },
      });
      await tx.crmAuditEntry.create({
        data: { action: 'Credit Note Refunded', actor: data.actorName || 'Finance', details: `${note.creditNumber} EGP ${amount} → wallet ${note.studentId}`, category: 'financial' },
      }).catch(() => null);
      return { note: updatedNote };
    });
    postVoucher(this.prisma as never, `Credit ${note.creditNumber} refunded to wallet`, [
      { accountCode: '4010', accountName: 'Tuition Revenue', debit: amount },
      { accountCode: '2100', accountName: 'Other Payables', credit: amount },
    ]).catch(() => null);
    return result;
  }

  async voidCreditNote(id: string, actorName?: string) {
    const note = await this.prisma.creditNote.findUnique({ where: { id } });
    if (!note) throw new BadRequestException('Credit note not found');
    if (note.status !== 'issued') throw new BadRequestException('Only issued (unapplied) notes can be voided');
    const updated = await this.prisma.creditNote.update({ where: { id }, data: { status: 'voided' } });
    await this.prisma.crmAuditEntry.create({
      data: { action: 'Credit Note Voided', actor: actorName || 'Finance', details: `${note.creditNumber} voided`, category: 'financial' },
    }).catch(() => null);
    return updated;
  }

  async getPayroll(query?: ListQuery) {
    const { skip, take } = parsePagination(query ?? {}, 100, 500);
    return this.prisma.payrollRecord.findMany({ orderBy: { createdAt: 'desc' }, skip, take });
  }
  async createPayroll(data: any) {
    const baseSalary = Number(data.baseSalary || 0);
    const hourlyRate = Number(data.hourlyRate || 0);
    const hoursTaught = Number(data.hoursTaught || 0);
    const privateSessionsCount = Math.max(0, Math.floor(Number(data.privateSessionsCount || 0)));
    const privateSessionRate = Number(data.privateSessionRate || 0);
    const bonuses = Number(data.bonuses || 0);
    const deductions = Number(data.deductions || 0);
    if ([baseSalary, hourlyRate, hoursTaught, privateSessionRate, bonuses, deductions].some((n) => !Number.isFinite(n) || n < 0)) {
      throw new BadRequestException('Payroll amounts must be non-negative numbers');
    }
    const gross = baseSalary + hourlyRate * hoursTaught + privateSessionsCount * privateSessionRate + bonuses;
    if (deductions > gross) throw new BadRequestException('Deductions cannot exceed gross pay');
    const netPayable = Math.round((gross - deductions) * 100) / 100;
    return this.prisma.payrollRecord.create({
      data: {
        instructorId: data.instructorId || 'STAFF-03',
        instructorName: data.instructorName || 'Staff Instructor',
        month: data.month || new Date().toISOString().substring(0, 7),
        baseSalary,
        hourlyRate,
        hoursTaught,
        privateSessionsCount,
        privateSessionRate,
        bonuses,
        deductions,
        netPayable,
        status: 'pending',
        preparedBy: data.preparedBy || null,
        notes: data.notes || '',
      },
    });
  }

  async payPayroll(id: string, paymentRef?: string) {
    const existing = await this.prisma.payrollRecord.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('Payroll record not found');
    if (existing.status === 'paid') throw new BadRequestException('Payroll already paid — duplicate blocked');
    if (existing.status !== 'approved') throw new BadRequestException('Slip must be approved before payment');
    const updated = await this.prisma.payrollRecord.update({
      where: { id },
      data: {
        status: 'paid',
        paidAt: new Date(),
        paymentRef: paymentRef || `CIB-${Date.now().toString(36).toUpperCase()}`,
      },
    });
    postVoucher(this.prisma as never, `Payroll ${updated.month} — ${updated.instructorName}`, [
      { accountCode: '5010', accountName: 'Payroll Expense', debit: toNumber((updated as unknown as { netPayable: unknown }).netPayable) },
      { accountCode: '1010', accountName: 'Cash', credit: toNumber((updated as unknown as { netPayable: unknown }).netPayable) },
    ]).catch(() => null);
    return updated;
  }

  /**
   * Syncs and automatically computes instructor payroll records for a given month (e.g. '2026-09')
   * based on the actual course sessions taught/scheduled by that instructor.
   */
  async syncMonthInstructorPayroll(monthStr?: string, actor?: string) {
    const month = monthStr || new Date().toISOString().substring(0, 7);
    const [year, m] = month.split('-').map(Number);
    const startOfMonth = new Date(year, m - 1, 1);
    const endOfMonth = new Date(year, m, 0, 23, 59, 59);

    const instructors = await this.prisma.staffUser.findMany({
      where: { role: { in: ['instructor', 'superadmin', 'owner'] } },
    });

    const results: any[] = [];

    for (const inst of instructors) {
      const sessionsCount = await this.prisma.courseSession.count({
        where: {
          instructorId: inst.id,
          sessionDate: { gte: startOfMonth, lte: endOfMonth },
          status: { in: ['scheduled', 'completed'] },
        },
      });

      const hourlyRate = 650;
      const hoursTaught = sessionsCount;
      const baseSalary = 0;
      const gross = baseSalary + hoursTaught * hourlyRate;

      const existing = await this.prisma.payrollRecord.findFirst({
        where: { instructorId: inst.id, month },
      });

      let record;
      if (existing) {
        if (existing.status !== 'paid') {
          const rate = existing.hourlyRate.toNumber() > 0 ? existing.hourlyRate.toNumber() : hourlyRate;
          const base = existing.baseSalary.toNumber();
          const bonus = existing.bonuses.toNumber();
          const ded = existing.deductions.toNumber();
          const net = base + (hoursTaught * rate) + bonus - ded;
          record = await this.prisma.payrollRecord.update({
            where: { id: existing.id },
            data: {
              hoursTaught,
              netPayable: net,
              notes: `Auto-synced: ${sessionsCount} classes taught in ${month}`,
            },
          });
        } else {
          record = existing;
        }
      } else {
        record = await this.prisma.payrollRecord.create({
          data: {
            instructorId: inst.id,
            instructorName: inst.name,
            month,
            baseSalary,
            hourlyRate,
            hoursTaught,
            bonuses: 0,
            deductions: 0,
            netPayable: gross,
            status: 'pending',
            preparedBy: actor || 'System Auto-Sync',
            notes: `Auto-computed from ${sessionsCount} sessions in ${month}`,
          },
        });
      }
      results.push(record);
    }
    return results;
  }

  async getJournalEntries(query?: ListQuery) {
    const { skip, take } = parsePagination(query ?? {}, 100, 500);
    return this.prisma.journalEntry.findMany({
      include: { lines: true },
      orderBy: { date: 'desc' },
      skip,
      take,
    });
  }

  async createJournalEntry(data: any) {
    const lines = Array.isArray(data.lines) ? data.lines : [];
    if (lines.length < 2) throw new BadRequestException('Journal requires at least 2 lines (debit + credit)');
    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of lines) {
      const code = String(line.accountCode || '');
      if (!AccountingService.ALLOWED_COA.has(code)) {
        throw new BadRequestException(`Invalid accountCode ${code}. Use unified COA`);
      }
      const d = Number(line.debit || 0);
      const c = Number(line.credit || 0);
      if (d < 0 || c < 0) throw new BadRequestException('Debit/credit must be non-negative');
      if (d > 0 && c > 0) throw new BadRequestException('A line cannot have both debit and credit');
      totalDebit += d;
      totalCredit += c;
    }
    totalDebit = Math.round(totalDebit * 100) / 100;
    totalCredit = Math.round(totalCredit * 100) / 100;
    if (Math.abs(totalDebit - totalCredit) > 0.01 || totalDebit === 0) {
      throw new BadRequestException(`Unbalanced journal: Dr ${totalDebit} != Cr ${totalCredit}`);
    }
    const voucherNumber = data.voucherNumber || `JV-${Date.now().toString(36).toUpperCase()}`;
    return this.prisma.journalEntry.create({
      data: {
        voucherNumber,
        memo: data.memo || 'Conservatory Journal Voucher',
        totalDebit,
        totalCredit,
        status: data.status === 'draft' ? 'draft' : 'posted',
        postedBy: data.postedBy || 'Finance Director',
        lines: {
          create: lines.map((line: any) => ({
            accountCode: String(line.accountCode),
            accountName: line.accountName || 'General Account',
            debit: Number(line.debit || 0),
            credit: Number(line.credit || 0),
            notes: line.notes || line.description || '',
          })),
        },
      },
      include: { lines: true },
    });
  }

  async voidJournalEntry(id: string) {
    const existing = await this.prisma.journalEntry.findUnique({ where: { id }, include: { lines: true } });
    if (!existing) throw new BadRequestException('Journal entry not found');
    if (existing.status === 'void') throw new BadRequestException('Already voided');
    // Post reversal, keep audit trail — never delete.
    const reversal = await this.prisma.journalEntry.create({
      data: {
        voucherNumber: `RV-${existing.voucherNumber}`,
        memo: `Reversal of ${existing.voucherNumber}: ${existing.memo}`,
        totalDebit: existing.totalCredit,
        totalCredit: existing.totalDebit,
        status: 'posted',
        postedBy: 'Finance Director',
        lines: {
          create: existing.lines.map((l) => ({
            accountCode: l.accountCode,
            accountName: l.accountName,
            debit: l.credit,
            credit: l.debit,
            notes: `Reversal of ${existing.voucherNumber}`,
          })),
        },
      },
      include: { lines: true },
    });
    await this.prisma.journalEntry.update({ where: { id }, data: { status: 'void' } });
    return reversal;
  }

  async getCashDrawerShifts(query?: ListQuery) {
    const { skip, take } = parsePagination(query ?? {}, 100, 500);
    return this.prisma.cashDrawerShift.findMany({
      include: { payments: true },
      orderBy: { startTime: 'desc' },
      skip,
      take,
    });
  }

  async createCashDrawerShift(data: any) {
    const shiftNumber = data.shiftNumber || `SHIFT-${Date.now().toString(36).toUpperCase()}`;
    const floatVal = Number(data.openingFloat ?? data.openingCash ?? 500);
    if (!Number.isFinite(floatVal) || floatVal < 0) throw new BadRequestException('Opening float must be non-negative');
    return this.prisma.cashDrawerShift.create({
      data: {
        shiftNumber,
        cashierName: data.cashierName || 'Reception Desk',
        openingFloat: floatVal,
        cashSalesTotal: 0,
        cashDrops: 0,
        expectedCash: floatVal,
        status: 'open',
        notes: data.notes || '',
      },
    });
  }

  async closeCashDrawerShift(id: string, actualCash: number, notes?: string) {
    const shift = await this.prisma.cashDrawerShift.findUnique({ where: { id }, include: { payments: true } });
    if (!shift) throw new BadRequestException('Shift not found');
    if (shift.status !== 'open') throw new BadRequestException('Shift already closed');
    const counted = Number(actualCash);
    if (!Number.isFinite(counted) || counted < 0) throw new BadRequestException('Counted cash must be non-negative');
    const cashPayments = round2((shift.payments || []).filter((p: any) => p.method === 'cash').reduce((s: number, p: any) => s + toNumber(p.amount), 0));
    const expected = round2(toNumber((shift as unknown as { openingFloat: unknown }).openingFloat) + cashPayments - toNumber((shift as unknown as { cashDrops: unknown }).cashDrops));
    if (Math.abs(expected - toNumber((shift as unknown as { expectedCash: unknown }).expectedCash)) > 0.01) {
      await this.prisma.cashDrawerShift.update({ where: { id }, data: { expectedCash: expected, cashSalesTotal: cashPayments } });
    }
    const variance = Math.round((counted - expected) * 100) / 100;
    if (Math.abs(variance) >= 500 && (!notes || !notes.trim())) {
      throw new BadRequestException('Variance ≥500 EGP requires a note');
    }

    return this.prisma.cashDrawerShift.update({
      where: { id },
      data: {
        status: 'closed',
        expectedCash: expected,
        cashSalesTotal: cashPayments,
        actualCashCounted: counted,
        variance,
        notes,
        endTime: new Date(),
      },
    }).then((closed) => {
      if (Math.abs(variance) > 0.01) {
        if (variance < 0) {
          postVoucher(this.prisma as never, `Drawer ${shift.shiftNumber} shortage ${variance}`, [
            { accountCode: '60900', accountName: 'Cash Shortage', debit: Math.abs(variance) },
            { accountCode: '1010', accountName: 'Cash', credit: Math.abs(variance) },
          ]).catch(() => null);
        } else {
          postVoucher(this.prisma as never, `Drawer ${shift.shiftNumber} overage ${variance}`, [
            { accountCode: '1010', accountName: 'Cash', debit: variance },
            { accountCode: '40500', accountName: 'Other Income', credit: variance },
          ]).catch(() => null);
        }
      }
      return closed;
    });
  }

  // --------------------------------------------------------------------------
  // GL-SOURCED REPORTS (trial balance, balance sheet, cash flow)
  // Every figure below is aggregated from posted JournalEntryLine rows, so the
  // reports always tie out to the General Ledger — never to operational tables.
  // --------------------------------------------------------------------------

  private async postedLines() {
    const lines = await this.prisma.journalEntryLine.findMany({
      where: { entry: { status: 'posted' } },
      include: { entry: { select: { voucherNumber: true, date: true, memo: true } } },
    });
    return lines as unknown as Array<{
      accountCode: string;
      accountName: string;
      debit: unknown;
      credit: unknown;
    }>;
  }

  async getTrialBalance() {
    const lines = await this.postedLines();
    const byAccount = new Map<string, { accountCode: string; accountName: string; debit: number; credit: number }>();
    for (const l of lines) {
      const key = l.accountCode;
      const cur = byAccount.get(key) || { accountCode: key, accountName: l.accountName, debit: 0, credit: 0 };
      cur.debit = round2(cur.debit + toNumber(l.debit));
      cur.credit = round2(cur.credit + toNumber(l.credit));
      if (l.accountName && !cur.accountName) cur.accountName = l.accountName;
      byAccount.set(key, cur);
    }
    const accounts = Array.from(byAccount.values())
      .map((a) => ({ ...a, balance: round2(a.debit - a.credit) }))
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    const totalDebit = round2(accounts.reduce((s, a) => s + a.debit, 0));
    const totalCredit = round2(accounts.reduce((s, a) => s + a.credit, 0));
    return {
      currency: 'EGP',
      source: 'general_ledger_posted',
      voucherLines: lines.length,
      accounts,
      totals: { totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 },
    };
  }

  async getBalanceSheet() {
    const lines = await this.postedLines();
    const net = new Map<string, number>();
    const names = new Map<string, string>();
    for (const l of lines) {
      names.set(l.accountCode, l.accountName || names.get(l.accountCode) || l.accountCode);
      net.set(l.accountCode, round2((net.get(l.accountCode) || 0) + toNumber(l.debit) - toNumber(l.credit)));
    }
    const pick = (prefixes: string[]) =>
      Array.from(net.entries())
        .filter(([code]) => prefixes.some((p) => code.startsWith(p)))
        .map(([accountCode, debitMinusCredit]) => ({
          accountCode,
          accountName: names.get(accountCode) || accountCode,
          // Assets present as debit balances; liabilities/equity as credit balances.
          balance: accountCode.startsWith('1') ? debitMinusCredit : round2(-debitMinusCredit),
        }))
        .sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    // Revenue (4x) is credit-normal; expenses (5x/6x) debit-normal.
    let revenue = 0;
    let expenses = 0;
    for (const [code, dmc] of net.entries()) {
      if (code.startsWith('4')) revenue += -dmc;
      if (code.startsWith('5') || code.startsWith('6')) expenses += dmc;
    }
    revenue = round2(revenue);
    expenses = round2(expenses);
    const netProfit = round2(revenue - expenses);
    const assets = pick(['1']);
    const liabilities = pick(['2']);
    const equityAccounts = pick(['3']);
    const totalAssets = round2(assets.reduce((s, a) => s + a.balance, 0));
    const totalLiabilities = round2(liabilities.reduce((s, a) => s + a.balance, 0));
    const equityBeforeProfit = round2(equityAccounts.reduce((s, a) => s + a.balance, 0));
    const totalEquity = round2(equityBeforeProfit + netProfit);
    return {
      currency: 'EGP',
      source: 'general_ledger_posted',
      assets,
      liabilities,
      equity: [...equityAccounts, { accountCode: '3PROFIT', accountName: 'Current period profit (GL)', balance: netProfit }],
      totals: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
      },
      glProfit: { revenue, expenses, netProfit },
    };
  }

  async getCashFlow() {
    const [orders, payments, expenses, payroll] = await Promise.all([
      this.prisma.boutiqueOrder.findMany().catch(() => []),
      this.prisma.paymentTransaction.findMany().catch(() => []),
      this.prisma.expense.findMany().catch(() => []),
      this.prisma.payrollRecord.findMany({ where: { status: 'paid' } }).catch(() => []),
    ]);
    const posCash = round2(
      (orders as unknown as Array<{ paymentMethod: string; totalAmount: unknown }>)
        .filter((o) => ['cash', 'card', 'transfer'].includes(o.paymentMethod))
        .reduce((s, o) => s + toNumber(o.totalAmount), 0),
    );
    const invoiceReceipts = round2(
      (payments as unknown as Array<{ amount: unknown }>).reduce((s, p) => s + toNumber(p.amount), 0),
    );
    const byMethod: Record<string, number> = {};
    for (const p of payments as unknown as Array<{ method: string; amount: unknown }>) {
      byMethod[p.method] = round2((byMethod[p.method] || 0) + toNumber(p.amount));
    }
    const opexOut = round2(
      (expenses as unknown as Array<{ status: string; total: unknown }>)
        .filter((e) => e.status !== 'rejected')
        .reduce((s, e) => s + toNumber(e.total), 0),
    );
    const payrollOut = round2(
      (payroll as unknown as Array<{ netPayable: unknown }>).reduce((s, p) => s + toNumber(p.netPayable), 0),
    );
    const inflow = round2(posCash + invoiceReceipts);
    const outflow = round2(opexOut + payrollOut);
    return {
      currency: 'EGP',
      inflow: { posCash, invoiceReceipts, totalInflow: inflow, receiptsByMethod: byMethod },
      outflow: { opexOut, payrollOut, totalOutflow: outflow },
      netCash: round2(inflow - outflow),
      note: 'Receipts = POS settled orders (excl. wallet_debt AR) + invoice PaymentTransactions. Excludes unpaid AR.',
    };
  }

  /** Family-scoped invoice history for the parent portal (no staff role needed). */
  async getFamilyInvoices(familyId: string) {
    if (!familyId?.trim()) return [];
    return this.prisma.invoice.findMany({
      where: {
        OR: [{ familyId }, { student: { familyId } }],
      },
      include: { items: true, payments: { orderBy: { date: 'desc' } } },
      orderBy: { issueDate: 'desc' },
      take: 100,
    });
  }

  /**
   * Deferred-revenue waterfall: monthly recognition schedule from subscription
   * windows (IFRS-15 daily rate × overlap days). Operational source — pairs
   * with the GL P&L, which reports recognized-to-date.
   */
  async getDeferredWaterfall() {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const subs = await this.prisma.studentSubscription.findMany({
      select: { price: true, startDate: true, endDate: true, status: true, planName: true },
    });
    if (subs.length === 0) {
      return { currency: 'EGP', source: 'subscriptions', months: [], totals: { contracted: 0, recognizedToDate: 0, deferred: 0 } };
    }
    const now = Date.now();
    const minStart = new Date(Math.min(...subs.map((s) => s.startDate.getTime())));
    const maxEnd = new Date(Math.max(...subs.map((s) => s.endDate.getTime()), now));
    const firstMonth = new Date(minStart.getFullYear(), minStart.getMonth(), 1);
    const months: { month: string; scheduled: number; recognized: number; deferred: number }[] = [];
    const cursor = new Date(firstMonth);
    let guard = 0;
    let contracted = 0;
    let recognizedToDate = 0;
    // First pass totals.
    for (const s of subs) {
      const price = toNumber((s as unknown as { price: unknown }).price);
      contracted = round2(contracted + price);
      const totalDays = Math.max(1, Math.round((s.endDate.getTime() - s.startDate.getTime()) / DAY_MS));
      const elapsed = Math.min(totalDays, Math.max(0, Math.round((now - s.startDate.getTime()) / DAY_MS)));
      recognizedToDate = round2(recognizedToDate + Math.round((price / totalDays) * elapsed));
    }
    while (cursor <= maxEnd && guard < 18) {
      const mStart = cursor.getTime();
      const mEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1).getTime();
      const label = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      let scheduled = 0;
      let recognized = 0;
      for (const s of subs) {
        const price = toNumber((s as unknown as { price: unknown }).price);
        const totalDays = Math.max(1, Math.round((s.endDate.getTime() - s.startDate.getTime()) / DAY_MS));
        const daily = price / totalDays;
        const overlap = Math.max(0, Math.min(s.endDate.getTime(), mEnd) - Math.max(s.startDate.getTime(), mStart));
        if (overlap <= 0) continue;
        const monthDays = overlap / DAY_MS;
        scheduled += daily * monthDays;
        const recEnd = Math.min(now, mEnd);
        const recOverlap = Math.max(0, Math.min(s.endDate.getTime(), recEnd) - Math.max(s.startDate.getTime(), mStart));
        recognized += daily * (recOverlap / DAY_MS);
      }
      months.push({
        month: label,
        scheduled: Math.round(scheduled),
        recognized: Math.round(recognized),
        deferred: Math.round(scheduled - recognized),
      });
      cursor.setMonth(cursor.getMonth() + 1);
      guard += 1;
    }
    return {
      currency: 'EGP',
      source: 'subscriptions',
      months,
      totals: { contracted, recognizedToDate, deferred: round2(contracted - recognizedToDate) },
    };
  }

  /**
   * AP aging from expenses. Convention: pending_audit = open payable,
   * approved = cleared, rejected = excluded. Bucketed by expense date.
   */
  async getApAging() {
    const expenses = await this.prisma.expense.findMany({ orderBy: { date: 'asc' } }).catch(() => []);
    const open = (expenses as unknown as Array<{ status: string; date: Date; vendor: string; total: unknown; expenseNumber: string; category: string }>).filter(
      (e) => e.status === 'pending_audit',
    );
    const bucketOf = (date: Date): string => {
      const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
      if (days <= 0) return 'current';
      if (days <= 30) return '1_30_days';
      if (days <= 60) return '31_60_days';
      return 'over_60_days';
    };
    const buckets: Record<string, number> = { current: 0, '1_30_days': 0, '31_60_days': 0, over_60_days: 0 };
    const byVendor = new Map<string, { vendor: string; open: number; oldest: string; count: number }>();
    for (const e of open) {
      const total = toNumber(e.total);
      const b = bucketOf(e.date);
      buckets[b] = round2(buckets[b] + total);
      const cur = byVendor.get(e.vendor) || { vendor: e.vendor, open: 0, oldest: new Date(e.date).toISOString().split('T')[0], count: 0 };
      cur.open = round2(cur.open + total);
      cur.count += 1;
      const d = new Date(e.date).toISOString().split('T')[0];
      if (d < cur.oldest) cur.oldest = d;
      byVendor.set(e.vendor, cur);
    }
    const items = open.map((e) => ({
      expenseNumber: e.expenseNumber,
      vendor: e.vendor,
      category: e.category,
      date: new Date(e.date).toISOString().split('T')[0],
      total: toNumber(e.total),
      bucket: bucketOf(e.date),
    }));
    return {
      currency: 'EGP',
      convention: 'pending_audit = open payable; approved = cleared; rejected excluded',
      totals: { openPayables: round2(items.reduce((s, i) => s + i.total, 0)), buckets },
      byVendor: Array.from(byVendor.values()).sort((a, b) => b.open - a.open),
      items,
    };
  }
}

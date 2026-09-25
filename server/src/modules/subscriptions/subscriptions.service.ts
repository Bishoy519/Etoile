import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parsePagination } from '../../common/pagination.util';

export interface EvaluatePlanDto {
  maxSessions: number;
  usedSessions: number;
  startDate: string;
  cycleDays: number;
  scanDate?: string;
  price?: number;
}

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailablePlans(query?: { page?: string | number; limit?: string | number }) {
    const { skip, take } = parsePagination(query ?? {}, 100, 500);
    return this.prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { price: 'desc' },
      skip,
      take,
    });
  }

  async createPlan(data: {
    name: string;
    nameAr: string;
    program: string;
    maxSessions: number;
    durationDays?: number;
    price: number;
    description?: string;
  }) {
    const count = await this.prisma.subscriptionPlan.count();
    const id = `PLAN-${Date.now().toString(36).toUpperCase()}`;

    return this.prisma.subscriptionPlan.create({
      data: {
        id,
        name: data.name,
        nameAr: data.nameAr,
        program: data.program,
        maxSessions: data.maxSessions,
        durationDays: data.durationDays || 30,
        price: data.price,
        description: data.description,
      },
    });
  }

  evaluatePlan(dto: EvaluatePlanDto) {    const start = new Date(dto.startDate);
    const end = new Date(start.getTime() + dto.cycleDays * 24 * 60 * 60 * 1000);
    const scan = dto.scanDate ? new Date(dto.scanDate) : new Date();

    let status: 'active' | 'expired_quota' | 'expired_date' = 'active';
    let allowed = true;
    let reason = 'Subscription verified and valid.';

    if (scan > end) {
      status = 'expired_date';
      allowed = false;
      reason = `Plan Expired by Time: Current Date (${scan.toISOString().split('T')[0]}) exceeds Cycle End Date (${end.toISOString().split('T')[0]}).`;
    } else if (dto.usedSessions >= dto.maxSessions) {
      status = 'expired_quota';
      allowed = false;
      reason = `Quota Exhausted: Used ${dto.usedSessions} of ${dto.maxSessions} sessions.`;
    } else {
      status = 'active';
      allowed = true;
      reason = `Access Approved: ${dto.maxSessions - dto.usedSessions} sessions remaining.`;
    }

    const price = dto.price || 480;
    const dailyAccrualRate = price / dto.cycleDays;
    const daysRemaining = Math.max(0, Math.ceil((end.getTime() - scan.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      status,
      allowed,
      reason,
      endDate: end.toISOString().split('T')[0],
      sessionsRemaining: Math.max(0, dto.maxSessions - dto.usedSessions),
      daysRemaining,
      dailyAccrualRate,
    };
  }

  // --------------------------------------------------------------------------
  // PROMO CODES (manual discounts on subscription reservations)
  // --------------------------------------------------------------------------

  async listPromos() {
    return this.prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  }

  async createPromo(data: { code: string; percent: number; maxUses?: number; expiresAt?: string; createdBy?: string }) {
    const code = (data.code || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!code || code.length < 3) throw new BadRequestException('Code must be 3+ letters/digits');
    const percent = Math.floor(Number(data.percent));
    if (!Number.isFinite(percent) || percent < 1 || percent > 100) throw new BadRequestException('Percent must be 1–100');
    const existing = await this.prisma.promoCode.findUnique({ where: { code } }).catch(() => null);
    if (existing) throw new BadRequestException(`Code ${code} already exists`);
    return this.prisma.promoCode.create({
      data: {
        code,
        percent,
        maxUses: data.maxUses !== undefined ? Math.max(1, Math.floor(Number(data.maxUses))) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        active: true,
        createdBy: data.createdBy || null,
      },
    });
  }

  async setPromoActive(code: string, active: boolean) {
    const existing = await this.prisma.promoCode.findUnique({ where: { code } });
    if (!existing) throw new NotFoundException(`Promo ${code} not found`);
    return this.prisma.promoCode.update({ where: { code }, data: { active } });
  }

  private async validatePromo(code?: string) {
    if (!code?.trim()) return null;
    const promo = await this.prisma.promoCode.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (!promo || !promo.active) throw new BadRequestException('Promo code is invalid or disabled');
    if (promo.expiresAt && promo.expiresAt < new Date()) throw new BadRequestException('Promo code expired');
    if (promo.maxUses !== null && promo.uses >= promo.maxUses) throw new BadRequestException('Promo code fully redeemed');
    return promo;
  }

  /**
   * Reserve a subscription package for a dancer with an optional promo code.
   * Price + discount are server-computed; uses increment atomically.
   */
  async reserve(data: { studentId: string; planId: string; promoCode?: string; actorName?: string }) {
    const student = await this.prisma.student.findUnique({ where: { id: data.studentId } });
    if (!student) throw new NotFoundException('Student not found');
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: data.planId } });
    if (!plan || !plan.active) throw new BadRequestException('Plan is not available');
    const base = Number((plan as unknown as { price: unknown }).price);
    const promo = await this.validatePromo(data.promoCode);
    const discount = promo ? Math.round((base * promo.percent) / 100) : 0;
    const price = Math.max(0, base - discount);
    const startDate = new Date();
    const endDate = new Date(Date.now() + (plan.durationDays || 30) * 24 * 60 * 60 * 1000);
    const result = await this.prisma.$transaction(async (tx) => {
      const sub = await tx.studentSubscription.create({
        data: {
          studentId: student.id,
          planId: plan.id,
          planName: plan.name,
          planNameAr: plan.nameAr,
          startDate,
          endDate,
          maxSessions: plan.maxSessions,
          usedSessions: 0,
          price,
          dailyAccrualRate: price / Math.max(1, plan.durationDays || 30),
          status: 'active',
          promoCode: promo?.code || null,
          discountAmount: discount,
        },
      });
      if (promo) await tx.promoCode.update({ where: { code: promo.code }, data: { uses: { increment: 1 } } });
      await tx.crmAuditEntry.create({
        data: {
          action: 'Subscription Reserved',
          actor: data.actorName || 'Staff',
          details: `${student.name} → ${plan.name} EGP ${price}${promo ? ` (promo ${promo.code} -${promo.percent}%)` : ''}`,
          category: 'crm',
        },
      }).catch(() => null);
      return sub;
    });
    return result;
  }
}

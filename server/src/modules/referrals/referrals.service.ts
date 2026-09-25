import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toNumber, round2 } from '../../common/money.util';

function makeCode(familyId: string): string {
  const fam = familyId.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8) || 'FAM';
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ETL-${fam}-${rand}`;
}

/** Family referral loop: share code → friend books with code → converts → staff rewards. */
@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lazy-issue a family's share code (idempotent). */
  async myCode(familyId: string) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) throw new NotFoundException('Family not found');
    if ((family as unknown as { referralCode?: string }).referralCode) {
      return { code: (family as unknown as { referralCode: string }).referralCode };
    }
    for (let i = 0; i < 5; i += 1) {
      const code = makeCode(familyId);
      try {
        await this.prisma.family.update({ where: { id: familyId }, data: { referralCode: code } as never });
        return { code };
      } catch {
        // collision — retry with fresh randomness
      }
    }
    throw new BadRequestException('Could not issue referral code, try again');
  }

  async myStats(familyId: string) {
    const [code, rows] = await Promise.all([
      this.myCode(familyId).catch(() => ({ code: null as string | null })),
      this.prisma.referral.findMany({ where: { referrerFamilyId: familyId }, orderBy: { createdAt: 'desc' } }),
    ]);
    const byStatus = (s: string) => rows.filter((r) => r.status === s).length;
    return {
      code: (code as { code: string | null }).code,
      pending: byStatus('pending'),
      converted: byStatus('converted'),
      rewarded: byStatus('rewarded'),
      referrals: rows.map((r) => ({
        id: r.id,
        referredName: r.referredName,
        status: r.status,
        rewardAmount: toNumber((r as unknown as { rewardAmount: unknown }).rewardAmount),
        createdAt: r.createdAt,
      })),
    };
  }

  /** Attach a validated code to a fresh lead; invalid codes are ignored upstream. */
  async attachToLead(code: string | undefined, leadId: string, referredName: string) {
    if (!code?.trim()) return null;
    const family = await this.prisma.family.findUnique({ where: { referralCode: code.trim().toUpperCase() } }).catch(() => null);
    if (!family) return null;
    return this.prisma.referral.create({
      data: {
        referrerFamilyId: family.id,
        referredName: referredName.slice(0, 120),
        leadId,
        status: 'pending',
      },
    }).catch(() => null);
  }

  async markConverted(leadId: string, studentId: string) {
    await this.prisma.referral.updateMany({
      where: { leadId, status: 'pending' },
      data: { studentId, status: 'converted' },
    }).catch(() => null);
  }

  async list(status?: string) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const rows = await this.prisma.referral.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { referrer: { select: { id: true, parentName: true } } },
    });
    return rows.map((r) => ({
      ...r,
      rewardAmount: toNumber((r as unknown as { rewardAmount: unknown }).rewardAmount),
    }));
  }

  /** Staff-approved wallet credit to one of the referrer's dancers (capped). */
  async reward(id: string, studentId: string, amount: number, actorName?: string) {
    const ref = await this.prisma.referral.findUnique({ where: { id } });
    if (!ref) throw new NotFoundException('Referral not found');
    if (ref.status === 'rewarded') throw new BadRequestException('Already rewarded');
    if (ref.status !== 'converted') throw new BadRequestException('Only converted referrals can be rewarded');
    const credit = round2(Number(amount));
    if (!Number.isFinite(credit) || credit <= 0 || credit > 1000) {
      throw new BadRequestException('Reward must be between 1 and 1000 EGP');
    }
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.familyId !== ref.referrerFamilyId) {
      throw new BadRequestException('Reward student must belong to the referring family');
    }
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.student.update({ where: { id: studentId }, data: { walletBalance: { increment: credit } } });
      const updated = await tx.referral.update({
        where: { id },
        data: { status: 'rewarded', rewardAmount: credit, rewardedStudentId: studentId },
      });
      await tx.crmAuditEntry.create({
        data: {
          action: 'Referral Rewarded',
          actor: actorName || 'Staff',
          details: `EGP ${credit} wallet credit to ${student.name} for referral ${ref.id}`,
          category: 'financial',
        },
      }).catch(() => null);
      return updated;
    });
    return { ...result, rewardAmount: credit };
  }
}

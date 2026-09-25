import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

function bucketFor(dueDate: Date, status: string): string {
  if (status === 'paid' || status === 'cancelled') return 'current';
  const days = Math.floor((Date.now() - dueDate.getTime()) / 86400000);
  if (days <= 0) return 'current';
  if (days <= 30) return '1_30_days';
  if (days <= 60) return '31_60_days';
  return 'over_60_days';
}

/** Nightly maintenance: AR aging/overdue + PayLink expiry.
 * Runs on a 6h interval inside the API (no extra infra) and is also
 * triggerable via POST /api/ops/nightly and `npm run cron:nightly`.
 */
@Injectable()
export class SchedulerService {
  private readonly log = new Logger('Nightly');
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auth?: AuthService,
  ) {}

  onModuleInit() {
    if (process.env.NIGHTLY_DISABLE === 'true') return;
    // First run 60s after boot (lets DB connect), then every 6h.
    setTimeout(() => this.run().catch(() => null), 60000);
    this.timer = setInterval(() => this.run().catch(() => null), 6 * 60 * 60 * 1000);
    if ((this.timer as unknown as { unref?: () => void }).unref) {
      (this.timer as unknown as { unref: () => void }).unref();
    }
  }

  async run() {
    const aging = await this.refreshAging().catch(() => ({ updated: 0 }));
    const links = await this.expireLinks().catch(() => ({ expired: 0 }));
    const purge = this.auth ? await this.auth.purgeDueDeletions().catch(() => ({ purged: 0 })) : { purged: 0 };
    this.log.log(`nightly ok aging=${(aging as { updated: number }).updated} expiredLinks=${(links as { expired: number }).expired} purged=${purge.purged}`);
    return { aging, links, purge };
  }

  async refreshAging() {
    const invoices = await this.prisma.invoice.findMany({
      where: { status: { in: ['unpaid', 'partially_paid', 'overdue'] } },
      select: { id: true, dueDate: true, status: true, agingBucket: true },
    });
    let updated = 0;
    for (const inv of invoices) {
      const bucket = bucketFor(inv.dueDate, inv.status);
      const shouldOverdue = bucket !== 'current' && inv.status !== 'overdue';
      const nextStatus = shouldOverdue ? 'overdue' : inv.status;
      if (bucket !== inv.agingBucket || nextStatus !== inv.status) {
        await this.prisma.invoice.update({
          where: { id: inv.id },
          data: { agingBucket: bucket, status: nextStatus },
        }).catch(() => null);
        updated += 1;
      }
    }
    return { updated, checked: invoices.length };
  }

  async expireLinks() {
    const res = await this.prisma.paymentLink.updateMany({
      where: { status: 'pending', expiresAt: { lt: new Date() } },
      data: { status: 'expired' },
    }).catch(() => ({ count: 0 }));
    return { expired: (res as { count: number }).count || 0 };
  }
}

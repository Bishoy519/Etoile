import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const FALLBACK_BRANCHES = [
  { id: 'br_zam', code: 'ZAM', name: 'Zamalek — Studio Opéra', nameAr: 'الزمالك', city: 'Cairo', timezone: 'Africa/Cairo', active: true },
  { id: 'br_nc', code: 'NCAIRO', name: 'New Cairo — Studio Pavlova', nameAr: 'التجمع', city: 'Cairo', timezone: 'Africa/Cairo', active: true },
];

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    try {
      const db = await (this.prisma as any).branch.findMany().catch(() => null);
      if (db && db.length) return db;
    } catch {}
    return FALLBACK_BRANCHES;
  }

  async years() {
    try {
      const db = await (this.prisma as any).academicYear.findMany().catch(() => null);
      if (db && db.length) return db;
    } catch {}
    const now = new Date();
    const y = now.getFullYear();
    return [
      { id: 'ay_prev', label: `${y - 1}-${y}`, current: false },
      { id: 'ay_cur', label: `${y}-${y + 1}`, current: true },
    ];
  }

  /**
   * Academic-year rollover: closes the current year, opens the next
   * (Sep 1 – Aug 31), and returns a closing snapshot. Financial and
   * attendance rows are never mutated — history stays intact for audits.
   */
  async rollover(actorName?: string) {
    const years = await (this.prisma as any).academicYear.findMany({ orderBy: { label: 'desc' } }).catch(() => []);
    if (!years || years.length === 0) throw new BadRequestException('No academic years found — seed first');
    const current = years.find((y: { current: boolean }) => y.current) || years[0];
    const m = String(current.label).match(/(\d{4})-(\d{4})/);
    if (!m) throw new BadRequestException(`Unparseable year label ${current.label}`);
    const nextLabel = `${Number(m[1]) + 1}-${Number(m[2]) + 1}`;
    const exists = years.find((y: { label: string }) => y.label === nextLabel);
    if (exists) throw new BadRequestException(`${nextLabel} already exists — rollover done`);
    const startYear = Number(m[1]) + 1;
    const [students, invoices, subs, sessions] = await Promise.all([
      this.prisma.student.count().catch(() => 0),
      this.prisma.invoice.count().catch(() => 0),
      this.prisma.studentSubscription.count({ where: { status: 'active' } }).catch(() => 0),
      this.prisma.courseSession.count().catch(() => 0),
    ]);
    const created = await (this.prisma as any).academicYear.create({
      data: {
        label: nextLabel,
        startDate: new Date(`${startYear}-09-01`),
        endDate: new Date(`${startYear + 1}-08-31`),
        current: false,
      },
    });
    await this.prisma.$transaction([
      (this.prisma as any).academicYear.updateMany({ where: { current: true }, data: { current: false } }),
      (this.prisma as any).academicYear.update({ where: { id: created.id }, data: { current: true } }),
    ]);
    await this.prisma.crmAuditEntry.create({
      data: {
        action: 'Academic Year Rollover',
        actor: actorName || 'System',
        details: `${current.label} → ${nextLabel} (students=${students}, invoices=${invoices}, activeSubs=${subs}, sessions=${sessions})`,
        category: 'crm',
      },
    }).catch(() => null);
    return {
      previous: current.label,
      current: nextLabel,
      archived: { students, invoices, activeSubscriptions: subs, sessions },
      note: 'History preserved — no financial or attendance rows were modified.',
    };
  }
}

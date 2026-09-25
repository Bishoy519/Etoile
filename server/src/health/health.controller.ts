import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Unauthenticated liveness probe for Docker healthchecks, uptime monitors and CI. */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let db: 'up' | 'down' = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'up';
    } catch {
      db = 'down';
    }
    return {
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      time: new Date().toISOString(),
    };
  }

  @Get('detailed')
  async detailed() {
    const started = Date.now();
    let db: 'up' | 'down' = 'down';
    let latencyMs = 0;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      latencyMs = Date.now() - started;
      db = 'up';
    } catch {
      db = 'down';
    }
    let counts: Record<string, unknown> = {};
    try {
      const [students, attendance, invoices, leads] = await Promise.all([
        (this.prisma as unknown as { student?: { count: () => Promise<number> } }).student?.count().catch(() => 'n/a'),
        (this.prisma as unknown as { attendanceRecord?: { count: () => Promise<number> } }).attendanceRecord?.count().catch(() => 'n/a'),
        (this.prisma as unknown as { invoice?: { count: () => Promise<number> } }).invoice?.count().catch(() => 'n/a'),
        (this.prisma as unknown as { admissionLead?: { count: () => Promise<number> } }).admissionLead?.count().catch(() => 'n/a'),
      ]);
      counts = { students, attendance, invoices, leads };
    } catch {
      counts = { note: 'count unavailable' };
    }
    return {
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      dbLatencyMs: latencyMs,
      uptimeSec: Math.round(process.uptime()),
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      env: process.env.NODE_ENV || 'development',
      integrations: {
        paymob: process.env.PAYMOB_API_KEY ? 'configured' : 'mock',
        fawry: process.env.FAWRY_MERCHANT ? 'configured' : 'mock',
        eta: process.env.ETA_API_KEY ? 'configured' : 'stub',
        whatsapp: process.env.WA_PROVIDER || 'builtin_qr',
        sentry: process.env.SENTRY_DSN ? 'configured' : 'off',
      },
      counts,
      time: new Date().toISOString(),
    };
  }
}

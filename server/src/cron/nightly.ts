/** Nightly cron entrypoint (no extra deps).
 * Hits the in-API nightly endpoint OR runs Prisma directly.
 * Usage: npm run cron:nightly  (needs API running + CRON_TOKEN of a superadmin JWT,
 *   or DATABASE_URL for direct mode with CRON_DIRECT=true)
 */
const API = process.env.API_URL || 'http://localhost:3001/api';

async function viaApi() {
  const token = process.env.CRON_TOKEN || '';
  if (!token) throw new Error('CRON_TOKEN missing');
  const res = await fetch(`${API}/ops/nightly/run`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`nightly failed: ${res.status} ${await res.text()}`);
  console.log('nightly via API ok:', await res.text());
}

async function direct() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const bucketFor = (due: Date, status: string) => {
    if (status === 'paid' || status === 'cancelled') return 'current';
    const days = Math.floor((Date.now() - due.getTime()) / 86400000);
    if (days <= 0) return 'current';
    if (days <= 30) return '1_30_days';
    if (days <= 60) return '31_60_days';
    return 'over_60_days';
  };
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ['unpaid', 'partially_paid', 'overdue'] } },
  });
  let updated = 0;
  for (const inv of invoices) {
    const bucket = bucketFor(inv.dueDate, inv.status);
    const next = bucket !== 'current' && inv.status !== 'overdue' ? 'overdue' : inv.status;
    if (bucket !== inv.agingBucket || next !== inv.status) {
      await prisma.invoice.update({ where: { id: inv.id }, data: { agingBucket: bucket, status: next } }).catch(() => null);
      updated += 1;
    }
  }
  const links = await prisma.paymentLink.updateMany({
    where: { status: 'pending', expiresAt: { lt: new Date() } },
    data: { status: 'expired' },
  }).catch(() => ({ count: 0 }));
  console.log(`nightly direct ok aging=${updated} expiredLinks=${links.count || 0}`);
  await prisma.$disconnect();
}

(process.env.CRON_DIRECT === 'true' ? direct() : viaApi()).catch((e) => {
  console.error('nightly failed:', e.message);
  process.exit(1);
});

/** Money helpers for Prisma Decimal(12,2) fields.
 * Prisma returns Decimal.js-like objects at runtime; all arithmetic must go
 * through toNumber() first, and all writes through round2() numbers.
 * DB column stays exact; JS boundary stays float-safe to the piastre.
 */

export function toNumber(v: unknown, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  try {
    const n = Number((v as { toString?: () => string }).toString?.() ?? v);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** Additive sum that tolerates Decimal fields: sumBy(rows, 'total'). */
export function sumBy<T>(rows: T[], key: keyof T): number {
  let s = 0;
  for (const r of rows || []) s += toNumber((r as Record<string, unknown>)[key as string]);
  return round2(s);
}

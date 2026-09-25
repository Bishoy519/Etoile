export interface FxRate {
  currency: string;
  rateToEgp: number;
}

/** Convert an EGP ledger amount for display only — charges always settle in EGP. */
export function convertEgp(amountEgp: number, currency: string, rates: FxRate[]): number | null {
  if (currency === 'EGP') return amountEgp;
  const r = rates.find((x) => x.currency === currency);
  if (!r || !(r.rateToEgp > 0)) return null;
  return Math.round((amountEgp / r.rateToEgp) * 100) / 100;
}

export function formatApprox(amountEgp: number, currency: string, rates: FxRate[]): string | null {
  const v = convertEgp(amountEgp, currency, rates);
  if (v === null) return null;
  return `≈ ${currency} ${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

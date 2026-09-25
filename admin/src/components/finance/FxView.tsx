import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { formatCurrency } from '../../utils/currency';
import { api, errMsg } from '../../utils/api';
import { exportCsv } from '../../utils/csv';
import { Coins, Save, Search, Download } from 'lucide-react';

interface Fx {
  currency: string;
  rateToEgp: number;
}

/** FX rates (EGP base): converted display only — the ledger always posts EGP. */
export const FxView: React.FC = () => {
  const { language, showToast } = useAdmin();
  const [rates, setRates] = useState<Fx[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [rate, setRate] = useState('');
  const [fxSearch, setFxSearch] = useState('');

  const visibleRates = useMemo(() => {
    const needle = fxSearch.trim().toLowerCase();
    if (!needle) return rates;
    return rates.filter((r) => r.currency.toLowerCase().includes(needle));
  }, [rates, fxSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/accounting/fx');
      setRates(data);
      const d: Record<string, string> = {};
      for (const r of data) d[r.currency] = String(r.rateToEgp);
      setDrafts(d);
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (currency: string, value: string) => {
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0) {
      showToast('Invalid rate', 'Rate must be positive EGP per unit.', 'error');
      return;
    }
    setSaving(currency);
    try {
      await api.post('/api/accounting/fx', { currency, rateToEgp: v });
      load();
    } catch (e) {
      showToast('Save failed', errMsg(e), 'error');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-4 rounded-2xl bg-[#171d2b] border border-white/10">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-slate-300" />
          <div>
            <h4 className="font-heading font-semibold text-lg text-white">{language === 'ar' ? 'أسعار الصرف' : 'FX Rates'}</h4>
            <span className="text-[11px] text-slate-400">EGP base · display only — ledger posts EGP</span>
          </div>
        </div>
        <span className="sm:ms-auto flex items-center gap-2 flex-wrap">
          <label className="relative">
            <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              value={fxSearch}
              onChange={(e) => setFxSearch(e.target.value)}
              placeholder={language === 'ar' ? 'بحث عن عملة...' : 'Search currency...'}
              className="ps-8 pe-3 py-1.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none w-40"
              aria-label={language === 'ar' ? 'بحث العملات' : 'Search currencies'}
            />
          </label>
          <span className="text-[11px] font-mono text-slate-500">{visibleRates.length}/{rates.length}</span>
          <button
            onClick={() => exportCsv(`fx-rates-${new Date().toISOString().split('T')[0]}`, ['currency', 'rateToEgp'], visibleRates.map((r) => ({ currency: r.currency, rateToEgp: r.rateToEgp })))}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" /><span>CSV</span>
          </button>
        </span>
      </div>

      {loading ? (
        <div className="shimmer-line h-32" />
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          {visibleRates.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-500">{language === 'ar' ? 'لا عملات مطابقة.' : 'No matching currencies.'}</p>
          ) : visibleRates.map((r) => (
            <div key={r.currency} className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-white/5 last:border-0 text-xs">
              <span className="font-mono font-bold text-white w-14" dir="ltr">{r.currency}</span>
              {r.currency === 'EGP' ? (
                <span className="text-slate-500 font-mono">1 (base)</span>
              ) : (
                <>
                  <label className="flex items-center gap-1.5 text-slate-400">
                    EGP per 1
                    <input
                      value={drafts[r.currency] ?? String(r.rateToEgp)}
                      onChange={(e) => setDrafts({ ...drafts, [r.currency]: e.target.value })}
                      type="number" min={0} step="any" dir="ltr"
                      className="w-28 px-2 py-1.5 rounded-lg bg-[#111622] border border-white/10 text-xs text-white font-mono"
                      aria-label={`${r.currency} rate`}
                    />
                  </label>
                  <button onClick={() => save(r.currency, drafts[r.currency] ?? String(r.rateToEgp))} disabled={saving === r.currency} className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white disabled:opacity-50" aria-label={`Save ${r.currency}`}>
                    <Save className="w-3.5 h-3.5" />
                  </button>
                  <span className="ms-auto text-[11px] text-slate-500 font-mono" dir="ltr">EGP 1,000 ≈ {r.currency} {(1000 / r.rateToEgp).toFixed(2)}</span>
                </>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-white/[0.02]">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))} placeholder="SAR" dir="ltr" maxLength={3} className="w-20 px-2 py-1.5 rounded-lg bg-[#111622] border border-white/10 text-xs text-white font-mono" aria-label="New currency code" />
            <input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="EGP per unit" type="number" min={0} step="any" dir="ltr" className="w-36 px-2 py-1.5 rounded-lg bg-[#111622] border border-white/10 text-xs text-white font-mono" aria-label="New rate" />
            <button onClick={() => { if (code.length === 3) { save(code, rate); setCode(''); setRate(''); } }} disabled={code.length !== 3} className="px-3 py-1.5 rounded-lg bg-white text-slate-950 text-xs font-bold disabled:opacity-40">
              {language === 'ar' ? 'إضافة عملة' : 'Add currency'}
            </button>
          </div>
        </div>
      )}
      <p className="text-[11px] text-slate-500">Indicative rates — finance updates monthly. Parent invoices show ≈ equivalents; charges settle in EGP.</p>
    </div>
  );
};

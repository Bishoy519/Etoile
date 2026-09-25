import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { formatCurrency } from '../../utils/currency';
import { api, errMsg } from '../../utils/api';
import { exportCsv } from '../../utils/csv';
import { PiggyBank, Save, Search, Download } from 'lucide-react';

interface Row {
  category: string;
  budget: number;
  actual: number;
  variance: number;
  over: boolean;
}

const cur = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
};

export const BudgetView: React.FC = () => {
  const { language, showToast } = useAdmin();
  const [period, setPeriod] = useState(cur());
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ budget: 0, actual: 0, variance: 0 });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [budgetSearch, setBudgetSearch] = useState('');
  const [varianceFilter, setVarianceFilter] = useState('all');

  const visibleRows = useMemo(() => {
    const needle = budgetSearch.trim().toLowerCase();
    return rows.filter((r) => {
      if (varianceFilter === 'over' && !r.over) return false;
      if (varianceFilter === 'under' && r.over) return false;
      if (needle && !r.category.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, budgetSearch, varianceFilter]);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/accounting/budgets/vs-actual?period=${p}`);
      setRows(data.rows || []);
      setTotals(data.totals || { budget: 0, actual: 0, variance: 0 });
      const d: Record<string, string> = {};
      for (const r of data.rows || []) d[r.category] = String(r.budget);
      setDrafts(d);
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(period);
  }, [period, load]);

  const save = async (category: string) => {
    const amt = Number(drafts[category]);
    if (!Number.isFinite(amt) || amt < 0) {
      showToast('Invalid budget', 'Amount must be non-negative.', 'error');
      return;
    }
    setSaving(category);
    try {
      await api.post('/api/accounting/budgets', { period, category, amount: amt });
      load(period);
    } catch (e) {
      showToast('Save failed', errMsg(e), 'error');
    } finally {
      setSaving(null);
    }
  };

  const max = Math.max(1, ...rows.map((r) => Math.max(r.budget, r.actual)));

  return (
    <div className="space-y-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#171d2b] border border-white/10">
        <div className="flex items-center gap-2">
          <PiggyBank className="w-5 h-5 text-slate-300" />
          <h4 className="font-heading font-semibold text-lg text-white">{language === 'ar' ? 'الموازنات مقابل الفعلي' : 'Budgets vs Actuals'}</h4>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="relative">
            <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              value={budgetSearch}
              onChange={(e) => setBudgetSearch(e.target.value)}
              placeholder={language === 'ar' ? 'بحث عن بند...' : 'Search category...'}
              className="ps-8 pe-3 py-1.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none w-44"
              aria-label={language === 'ar' ? 'بحث الموازنة' : 'Search budget'}
            />
          </label>
          <select value={varianceFilter} onChange={(e) => setVarianceFilter(e.target.value)} className="px-2.5 py-1.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white" aria-label="Variance">
            <option value="all">All</option>
            <option value="over">Over budget</option>
            <option value="under">Under budget</option>
          </select>
          <span className="text-[11px] font-mono text-slate-500">{visibleRows.length}/{rows.length}</span>
          <button
            onClick={() => exportCsv(`budget-${period}`, ['category', 'budget', 'actual', 'variance'], visibleRows.map((r) => ({ category: r.category, budget: r.budget, actual: r.actual, variance: r.variance })))}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5"
            title={language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
          >
            <Download className="w-3.5 h-3.5" /><span>CSV</span>
          </button>
          <input type="month" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} className="px-3 py-1.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white" dir="ltr" aria-label="Period" />
          <span className="font-mono text-sm">
            <span className="text-slate-400">B {formatCurrency(totals.budget, language)}</span>
            {' / '}
            <span className={totals.variance < 0 ? 'text-rose-300' : 'text-emerald-300'}>A {formatCurrency(totals.actual, language)}</span>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="shimmer-line h-48" />
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          {visibleRows.length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-500">{language === 'ar' ? 'لا بنود مطابقة.' : 'No matching categories.'}</p>
          ) : visibleRows.map((r) => (
            <div key={r.category} className="px-4 py-3 border-b border-white/5 last:border-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono text-slate-300 w-44 truncate" dir="ltr">{r.category}</span>
                <label className="flex items-center gap-1.5">
                  <span className="text-slate-500">B</span>
                  <input
                    value={drafts[r.category] ?? String(r.budget)}
                    onChange={(e) => setDrafts({ ...drafts, [r.category]: e.target.value })}
                    type="number" min={0} dir="ltr"
                    className="w-24 px-2 py-1.5 rounded-lg bg-[#111622] border border-white/10 text-xs text-white font-mono"
                    aria-label={`${r.category} budget`}
                  />
                </label>
                <button onClick={() => save(r.category)} disabled={saving === r.category} className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white disabled:opacity-50" aria-label={`Save ${r.category}`}>
                  <Save className="w-3.5 h-3.5" />
                </button>
                <span className="ms-auto font-mono">
                  <span className="text-slate-400">A {formatCurrency(r.actual, language)}</span>
                  {' · '}
                  <span className={r.over ? 'text-rose-300' : 'text-emerald-300'}>
                    {r.variance >= 0 ? '+' : ''}{formatCurrency(r.variance, language)}
                  </span>
                </span>
              </div>
              <div className="relative h-1.5 rounded-full bg-white/[0.04] overflow-visible mt-2" role="img" aria-label={`${r.category} budget ${r.budget} actual ${r.actual}`}>
                <div className={`absolute inset-y-0 start-0 rounded-full ${r.over ? 'bg-rose-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(100, (r.actual / max) * 100)}%` }} />
                <div className="absolute inset-y-[-2px] w-0.5 bg-white/70" style={{ insetInlineStart: `${Math.min(100, (r.budget / max) * 100)}%` }} title="Budget" />
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-500">Bar = actual (red when over budget) · White tick = budget. Rejected expenses excluded; payroll counted in its month.</p>
    </div>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { formatCurrency } from '../../utils/currency';
import { api } from '../../utils/api';
import { exportCsv } from '../../utils/csv';
import { HandCoins, Search, Download } from 'lucide-react';

interface ApItem {
  expenseNumber: string;
  vendor: string;
  category: string;
  date: string;
  total: number;
  bucket: string;
}

const BUCKETS = ['current', '1_30_days', '31_60_days', 'over_60_days'] as const;

export const ApAgingView: React.FC = () => {
  const { language } = useAdmin();
  const [data, setData] = useState<{
    convention: string;
    totals: { openPayables: number; buckets: Record<string, number> };
    byVendor: { vendor: string; open: number; oldest: string; count: number }[];
    items: ApItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [apSearch, setApSearch] = useState('');
  const [bucketFilter, setBucketFilter] = useState('all');

  const visibleVendors = useMemo(() => {
    if (!data) return [];
    const needle = apSearch.trim().toLowerCase();
    return data.byVendor.filter((v) => !needle || v.vendor.toLowerCase().includes(needle));
  }, [data, apSearch]);

  const visibleItems = useMemo(() => {
    if (!data) return [];
    const needle = apSearch.trim().toLowerCase();
    return data.items.filter((i) => {
      if (bucketFilter !== 'all' && i.bucket !== bucketFilter) return false;
      if (needle && !`${i.expenseNumber} ${i.vendor} ${i.category}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [data, apSearch, bucketFilter]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/accounting/ap-aging');
        setData(data);
      } catch {
        // offline
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="shimmer-line h-48" />;
  if (!data) return <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-xs text-slate-500">Unavailable offline.</div>;

  return (
    <div className="space-y-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#171d2b] border border-white/10">
        <div className="flex items-center gap-2">
          <HandCoins className="w-5 h-5 text-slate-300" />
          <div>
            <h4 className="font-heading font-semibold text-lg text-white">{language === 'ar' ? 'أعمار الذمم الدائنة' : 'AP Aging — Open Payables'}</h4>
            <span className="text-[11px] text-slate-400 font-mono">{formatCurrency(data.totals.openPayables, language)} open</span>
          </div>
        </div>
        <span className="text-[11px] text-slate-500 max-w-md">{data.convention}</span>
        <span className="flex items-center gap-2 flex-wrap">
          <label className="relative">
            <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              value={apSearch}
              onChange={(e) => setApSearch(e.target.value)}
              placeholder={language === 'ar' ? 'بحث عن مورّد...' : 'Search vendor...'}
              className="ps-8 pe-3 py-1.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none w-44"
              aria-label={language === 'ar' ? 'بحث الذمم' : 'Search payables'}
            />
          </label>
          <select value={bucketFilter} onChange={(e) => setBucketFilter(e.target.value)} className="px-2.5 py-1.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white" aria-label="Bucket">
            <option value="all">All buckets</option>
            {BUCKETS.map((b) => <option key={b} value={b}>{b.replace(/_/g, ' ')}</option>)}
          </select>
          <button
            onClick={() => exportCsv(`ap-aging-${new Date().toISOString().split('T')[0]}`, ['expenseNumber', 'vendor', 'category', 'date', 'total', 'bucket'], visibleItems.map((i) => ({
              expenseNumber: i.expenseNumber, vendor: i.vendor, category: i.category, date: i.date, total: i.total, bucket: i.bucket,
            })))}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" /><span>CSV</span>
          </button>
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {BUCKETS.map((b) => (
          <div key={b} className={`rounded-2xl border p-4 ${b === 'over_60_days' ? 'border-rose-500/25 bg-rose-500/[0.04]' : 'border-white/10 bg-white/[0.02]'}`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400" dir="ltr">{b.replace(/_/g, ' ')}</p>
            <p className={`font-heading text-xl font-extrabold mt-1 ${b === 'over_60_days' ? 'text-rose-300' : 'text-white'}`}>
              {formatCurrency(data.totals.buckets[b] || 0, language)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 text-xs font-bold text-white">{language === 'ar' ? 'حسب المورّد' : 'By vendor'} <span className="ms-2 font-mono text-slate-500">({visibleVendors.length})</span></div>
          {visibleVendors.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-500">{language === 'ar' ? 'لا مستحقات مفتوحة.' : 'No open payables.'}</p>
          ) : visibleVendors.map((v) => (
            <div key={v.vendor} className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 last:border-0 text-xs">
              <span><strong className="text-white block">{v.vendor}</strong><span className="text-[11px] text-slate-500 font-mono" dir="ltr">{v.count} bills · oldest {v.oldest}</span></span>
              <span className="font-mono font-bold text-white">{formatCurrency(v.open, language)}</span>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 text-xs font-bold text-white">{language === 'ar' ? 'الفواتير المفتوحة' : 'Open bills'} <span className="ms-2 font-mono text-slate-500">({visibleItems.length})</span></div>
          <div className="max-h-[320px] overflow-y-auto">
            {visibleItems.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">—</p>
            ) : visibleItems.map((i) => (
              <div key={i.expenseNumber} className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 last:border-0 text-xs">
                <span><strong className="text-white block font-mono" dir="ltr">{i.expenseNumber}</strong><span className="text-[11px] text-slate-500">{i.vendor} · {i.category} · <span dir="ltr">{i.date}</span></span></span>
                <span className="text-end"><strong className="block font-mono text-white">{formatCurrency(i.total, language)}</strong><span className="text-[10px] font-mono text-slate-500" dir="ltr">{i.bucket.replace(/_/g, ' ')}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

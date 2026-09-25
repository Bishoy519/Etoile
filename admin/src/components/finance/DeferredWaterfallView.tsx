import React, { useEffect, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { formatCurrency } from '../../utils/currency';
import { api } from '../../utils/api';
import { exportCsv } from '../../utils/csv';
import { Waves, Download } from 'lucide-react';

interface WFMonth {
  month: string;
  scheduled: number;
  recognized: number;
  deferred: number;
}

export const DeferredWaterfallView: React.FC = () => {
  const { language } = useAdmin();
  const [data, setData] = useState<{ months: WFMonth[]; totals: { contracted: number; recognizedToDate: number; deferred: number } } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/accounting/deferred-waterfall');
        setData(data);
      } catch {
        // offline
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="shimmer-line h-48" />;
  if (!data || data.months.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-sm text-slate-400" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {language === 'ar' ? 'لا اشتراكات بعد — يظهر جدول الاستحقاق هنا.' : 'No subscriptions yet — the recognition schedule appears here.'}
      </div>
    );
  }

  const max = Math.max(1, ...data.months.map((m) => m.scheduled));

  return (
    <div className="space-y-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: language === 'ar' ? 'متعاقد عليه' : 'Contracted', v: data.totals.contracted, cls: 'text-white' },
          { label: language === 'ar' ? 'معترف به حتى اليوم' : 'Recognized to date', v: data.totals.recognizedToDate, cls: 'text-emerald-300' },
          { label: language === 'ar' ? 'مؤجل' : 'Deferred', v: data.totals.deferred, cls: 'text-amber-300' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
            <p className={`font-heading text-xl font-extrabold mt-1 ${s.cls}`}>{formatCurrency(s.v, language)}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <Waves className="w-4 h-4 text-sky-300" />
          <span className="text-xs font-bold text-white">{language === 'ar' ? 'جدول الاستحقاق الشهري (IFRS-15)' : 'Monthly recognition schedule (IFRS-15)'}</span>
          <button
            onClick={() => data && exportCsv(`deferred-waterfall-${new Date().toISOString().split('T')[0]}`, ['month', 'scheduled', 'recognized', 'deferred'], data.months.map((m) => ({
              month: m.month, scheduled: m.scheduled, recognized: m.recognized, deferred: m.deferred,
            })))}
            className="ms-auto px-3 py-1.5 rounded-xl text-[11px] font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" /><span>CSV</span>
          </button>
        </div>
        <div className="p-4 space-y-2.5 max-h-[420px] overflow-y-auto">
          {data.months.map((m) => (
            <div key={m.month}>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-mono text-slate-300" dir="ltr">{m.month}</span>
                <span className="font-mono text-slate-400">
                  <span className="text-emerald-300">{formatCurrency(m.recognized, language)}</span>
                  {' / '}
                  <span className="text-white">{formatCurrency(m.scheduled, language)}</span>
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-white/[0.04] overflow-hidden flex" role="img" aria-label={`${m.month}: recognized ${m.recognized} of ${m.scheduled}`}>
                <div className="h-full bg-emerald-400/80" style={{ width: `${(m.recognized / max) * 100}%` }} />
                <div className="h-full bg-amber-300/60" style={{ width: `${(m.deferred / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-slate-500">Green = recognized · Amber = still deferred · Bars scaled to the peak month.</p>
    </div>
  );
};

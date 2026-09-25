import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../utils/api';
import { formatCurrency } from '../../utils/currency';
import { Wallet } from 'lucide-react';

interface Slip {
  id: string;
  month: string;
  instructorName: string;
  netPayable: number;
  status: string;
  paidAt: string | null;
}

/** Instructor self-view: my pay slips, read-only. */
export const InstructorPayStrip: React.FC = () => {
  const { language } = useApp();
  const [slips, setSlips] = useState<Slip[]>([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/accounting/payroll/mine');
      if (Array.isArray(data)) setSlips(data);
    } catch {
      // offline
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (slips.length === 0) return null;

  return (
    <section aria-label={language === 'ar' ? 'رواتبي' : 'My pay'} className="rounded-2xl border border-brand-gold/20 bg-[#0c0f10] p-4 sm:p-5">
      <h3 className="font-serif text-lg text-[#fdf1c2] flex items-center gap-2 mb-3">
        <Wallet className="w-4 h-4 text-brand-gold" />
        {language === 'ar' ? 'رواتبي' : 'My pay'}
      </h3>
      <div className="space-y-2">
        {slips.slice(0, 6).map((s) => (
          <div key={s.id} className="flex items-center gap-3 text-xs p-2.5 rounded-xl bg-black/40 border border-brand-gold/10">
            <span className="font-mono text-brand-muted" dir="ltr">{s.month}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
              s.status === 'paid' ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
              : s.status === 'approved' ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
              : 'text-slate-400 border-white/15'}`}>{s.status}</span>
            <span className="ms-auto font-mono font-bold text-white" dir="ltr">{formatCurrency(s.netPayable, language)}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

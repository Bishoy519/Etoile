import React, { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { api, errMsg } from '../utils/api';
import { SectionCard } from './ui';
import { GraduationCap } from 'lucide-react';

interface Year {
  id: string;
  label: string;
  current: boolean;
}

/** Academic-year control: current year display + one-click guarded rollover. */
export const AcademicYearCard: React.FC = () => {
  const { language, showToast, currentUser } = useAdmin();
  const isRtl = language === 'ar';
  const canRollover = currentUser?.role === 'owner' || currentUser?.role === 'superadmin';
  const [years, setYears] = useState<Year[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{ previous: string; current: string; archived: Record<string, number> } | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/branches/academic-years');
      if (Array.isArray(data)) setYears(data);
    } catch {
      // offline
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rollover = async () => {
    setBusy(true);
    try {
      const { data: body } = await api.post('/api/branches/academic-years/rollover');
      setReport(body);
      setConfirming(false);
      showToast(isRtl ? 'تم فتح عام جديد' : 'New year opened', `${body.previous} → ${body.current}`, 'success');
      load();
    } catch (e) {
      showToast('Rollover failed', errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const cur = years.find((y) => y.current);

  return (
    <SectionCard title={isRtl ? 'العام الدراسي' : 'Academic year'} subtitle={isRtl ? 'الترحيل السنوي مع حفظ السجلات' : 'Yearly rollover with history preserved'} icon={<GraduationCap className="w-4 h-4 text-violet-300" />}>
      <div className="space-y-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {years.map((y) => (
            <span key={y.id} className={`px-3 py-1.5 rounded-xl border font-mono ${y.current ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-bold' : 'border-white/10 text-slate-400'}`}>
              <span dir="ltr">{y.label}</span>{y.current && ` • ${isRtl ? 'الحالي' : 'current'}`}
            </span>
          ))}
          {years.length === 0 && <span className="text-slate-500">—</span>}
        </div>
        {report && (
          <div className="p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 font-mono text-[11px] text-emerald-200" dir="ltr">
            {report.previous} → {report.current} · students {report.archived.students} · invoices {report.archived.invoices} · activeSubs {report.archived.activeSubscriptions}
          </div>
        )}
        {canRollover && (
          confirming ? (
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
              <span className="flex-1 min-w-[200px] text-amber-200">
                {isRtl ? 'سيُغلق العام الحالي ويُفتح التالي. لن تُمس أي بيانات مالية أو حضور. متابعة؟' : 'Closes the current year and opens the next. No financial or attendance data is touched. Continue?'}
              </span>
              <button onClick={rollover} disabled={busy} className="px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold disabled:opacity-50">
                {busy ? '...' : isRtl ? 'تأكيد الترحيل' : 'Confirm rollover'}
              </button>
              <button onClick={() => setConfirming(false)} className="px-4 py-2 rounded-xl border border-white/15 text-xs">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} className="px-4 py-2.5 rounded-xl border border-white/15 text-xs font-bold text-white hover:border-amber-400/50">
              {isRtl ? 'ترحيل لعام جديد' : 'Rollover to new year'}
            </button>
          )
        )}
      </div>
    </SectionCard>
  );
};

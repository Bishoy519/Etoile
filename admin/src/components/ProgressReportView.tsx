import React, { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { api, errMsg } from '../utils/api';
import { formatCurrency } from '../utils/currency';
import type { ProgressReport } from '../types';
import { TrendingUp, Printer, Award, CalendarCheck } from 'lucide-react';

/** Staff printable term progress report (server-computed payload). */
export const ProgressReportView: React.FC<{ studentId: string }> = ({ studentId }) => {
  const { language, showToast } = useAdmin();
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/students/${studentId}/progress`);
      setReport(data);
    } catch (e) {
      showToast('Report failed', errMsg(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [studentId, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="shimmer-line h-48" />;
  if (!report) return <p className="text-xs text-slate-500 text-center py-8">Unavailable offline.</p>;

  const axes = (['barre', 'center', 'allegro', 'musicality'] as const).map((k) => ({
    key: k,
    label: language === 'ar' ? { barre: 'البار', center: 'الوسط', allegro: 'الأليجرو', musicality: 'الموسيقية' }[k] : k[0].toUpperCase() + k.slice(1),
  }));

  return (
    <div className="space-y-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-base font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-300" />
          {language === 'ar' ? 'تقرير تقدم الفصل' : 'Term Progress Report'}
        </h3>
        <button onClick={() => window.print()} className="px-3.5 py-2 rounded-xl border border-white/10 text-xs text-slate-200 hover:text-white flex items-center gap-1.5">
          <Printer className="w-3.5 h-3.5" /> {language === 'ar' ? 'طباعة' : 'Print'}
        </button>
      </div>

      <div id="progress-report" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
        <div className="flex flex-wrap items-baseline gap-2 border-b border-white/10 pb-3">
          <strong className="font-heading text-xl text-white">{report.student.name}</strong>
          <span className="text-xs text-slate-400">{report.student.level} • {report.student.program}</span>
          <span className="ms-auto text-[11px] font-mono text-slate-500" dir="ltr">{String(report.generatedAt).split('T')[0]}</span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-black/30 border border-white/5 p-3">
            <p className="font-heading text-2xl font-extrabold text-emerald-300">
              {report.attendance.rate === null ? '—' : `${Math.round(report.attendance.rate * 100)}%`}
            </p>
            <p className="text-[10px] text-slate-500 uppercase">Attendance</p>
            <p className="text-[11px] font-mono text-slate-400" dir="ltr">{report.attendance.present}/{report.attendance.present + report.attendance.absent}</p>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/5 p-3">
            <p className="font-heading text-2xl font-extrabold text-white">{report.evaluations.count}</p>
            <p className="text-[10px] text-slate-500 uppercase">Evaluations</p>
            <p className="text-[11px] text-slate-400">{report.evaluations.latest ? `by ${report.evaluations.latest.evaluator}` : '—'}</p>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/5 p-3">
            <p className="font-heading text-2xl font-extrabold text-amber-300 flex items-center justify-center gap-1">
              <Award className="w-5 h-5" />{report.certificates.length}
            </p>
            <p className="text-[10px] text-slate-500 uppercase">Certificates</p>
            <p className="text-[11px] text-slate-400 truncate">{report.subscription ? `${report.subscription.used}/${report.subscription.max} used` : 'No package'}</p>
          </div>
        </div>

        {report.evaluations.latest && (
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Latest scores (0–10)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {axes.map((a) => {
                const v = (report.evaluations.latest as unknown as Record<string, number>)[a.key];
                const t = report.evaluations.trend[a.key];
                return (
                  <div key={a.key} className="rounded-xl bg-black/30 border border-white/5 p-3 text-center">
                    <p className="text-[10px] text-slate-500 uppercase">{a.label}</p>
                    <p className="font-heading text-xl font-bold text-white" dir="ltr">{v.toFixed(1)}</p>
                    {t !== null && t !== undefined && (
                      <p className={`text-[11px] font-mono ${t > 0 ? 'text-emerald-300' : t < 0 ? 'text-rose-300' : 'text-slate-500'}`} dir="ltr">
                        {t > 0 ? `+${t}` : t} trend
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {report.evaluations.history.length > 1 && (
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">History</h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {report.evaluations.history.slice().reverse().map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-[11px] p-2 rounded-lg bg-black/20 border border-white/5">
                  <span className="font-mono text-slate-500" dir="ltr">{String(e.date).split('T')[0]}</span>
                  <span className="text-slate-300">{e.evaluator}</span>
                  <span className="ms-auto font-mono text-slate-400" dir="ltr">
                    B{e.barre.toFixed(0)} C{e.center.toFixed(0)} A{e.allegro.toFixed(0)} M{e.musicality.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {report.certificates.length > 0 && (
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Certificates</h4>
            <div className="flex flex-wrap gap-1.5">
              {report.certificates.map((c) => (
                <span key={c.id} className="text-[11px] px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-200">
                  {language === 'ar' ? c.titleAr || c.title : c.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {report.latestNote && (
          <div className="rounded-xl bg-black/20 border border-white/5 p-3">
            <p className="text-[10px] uppercase text-slate-500 mb-1">Latest instructor note — {report.latestNote.author}</p>
            <p className="text-xs text-slate-200" dir="auto">{report.latestNote.text}</p>
          </div>
        )}

        <p className="text-[10px] text-slate-600 flex items-center gap-1.5">
          <CalendarCheck className="w-3 h-3" /> Last class: {report.attendance.lastClass ? String(report.attendance.lastClass).split('T')[0] : '—'}
        </p>
      </div>
    </div>
  );
};

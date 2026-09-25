import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../utils/api';
import { TrendingUp, Printer, Award } from 'lucide-react';

/** Family view of the term progress report (same server payload as staff). */
export const ProgressSection: React.FC<{ studentId: string; studentName: string }> = ({ studentId, studentName }) => {
  const { language } = useApp();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/students/${studentId}/progress`);
      setReport(data);
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="h-24 rounded-2xl bg-white/5 animate-pulse" />;
  if (!report) return null;

  const axes = (['barre', 'center', 'allegro', 'musicality'] as const).map((k) => ({
    key: k,
    label: language === 'ar' ? { barre: 'البار', center: 'الوسط', allegro: 'الأليجرو', musicality: 'الموسيقية' }[k] : k[0].toUpperCase() + k.slice(1),
  }));

  return (
    <section id="progress-report" aria-label={language === 'ar' ? 'تقرير التقدم' : 'Progress report'} className="gold-card rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-xl text-[#fdf1c2] flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-gold" />
          {language === 'ar' ? `تقدم ${studentName}` : `${studentName}'s progress`}
        </h3>
        <button onClick={() => window.print()} className="text-[11px] px-3 py-1.5 rounded-lg border border-brand-gold/30 text-brand-gold hover:bg-brand-gold/10 flex items-center gap-1.5 print:hidden">
          <Printer className="w-3.5 h-3.5" /> {language === 'ar' ? 'طباعة' : 'Print'}
        </button>
      </div>

      <div id="progress-report">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-black/40 border border-brand-gold/20 p-3">
            <p className="font-serif text-2xl font-bold text-emerald-300" dir="ltr">
              {report.attendance.rate === null ? '—' : `${Math.round(report.attendance.rate * 100)}%`}
            </p>
            <p className="text-[10px] text-brand-muted/60 uppercase">{language === 'ar' ? 'الحضور' : 'Attendance'}</p>
          </div>
          <div className="rounded-xl bg-black/40 border border-brand-gold/20 p-3">
            <p className="font-serif text-2xl font-bold text-white">{report.evaluations.count}</p>
            <p className="text-[10px] text-brand-muted/60 uppercase">{language === 'ar' ? 'تقييمات' : 'Evaluations'}</p>
          </div>
          <div className="rounded-xl bg-black/40 border border-brand-gold/20 p-3">
            <p className="font-serif text-2xl font-bold text-amber-300 flex items-center justify-center gap-1">
              <Award className="w-5 h-5" />{report.certificates.length}
            </p>
            <p className="text-[10px] text-brand-muted/60 uppercase">{language === 'ar' ? 'شهادات' : 'Awards'}</p>
          </div>
        </div>

        {report.evaluations.latest && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            {axes.map((a) => {
              const v = report.evaluations.latest[a.key];
              const t = report.evaluations.trend[a.key];
              return (
                <div key={a.key} className="rounded-xl bg-black/40 border border-brand-gold/20 p-3 text-center">
                  <p className="text-[10px] text-brand-muted/60 uppercase">{a.label}</p>
                  <p className="font-serif text-xl font-bold text-white" dir="ltr">{Number(v).toFixed(1)}</p>
                  {t !== null && t !== undefined && (
                    <p className={`text-[11px] font-mono ${t > 0 ? 'text-emerald-300' : t < 0 ? 'text-red-300' : 'text-brand-muted/50'}`} dir="ltr">
                      {t > 0 ? `+${t}` : t}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {report.latestNote && (
          <div className="rounded-xl bg-black/30 border border-brand-gold/15 p-3 mt-3">
            <p className="text-[10px] uppercase text-brand-muted/60">Latest note — {report.latestNote.author}</p>
            <p className="text-xs text-brand-muted mt-1" dir="auto">{report.latestNote.text}</p>
          </div>
        )}
      </div>
    </section>
  );
};

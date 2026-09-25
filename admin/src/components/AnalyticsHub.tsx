import React, { useMemo, useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { formatCurrency } from '../utils/currency';
import { api } from '../utils/api';
import { exportCsv } from '../utils/csv';
import { SectionCard, EmptyState, ProgressBar } from './ui';
import {
  BarChart3, TrendingUp, Users, Wallet, Download, ArrowUpRight,
  Target, Repeat, AlertTriangle, Sparkles, PieChart,
} from 'lucide-react';

/**
 * AnalyticsHub — Business intelligence layer on top of live CRM + finance state.
 * Revenue trends, program mix, cohort retention, forecast, AR risk, exports.
 */
export const AnalyticsHub: React.FC = () => {
  const { language, financials, students, attendanceLogs, orders, leads, courseSessions, courses, showToast } = useAdmin();
  const isRtl = language === 'ar';
  const [range, setRange] = useState<'30D' | '90D' | '12M'>('90D');
  const [metric, setMetric] = useState<'revenue' | 'attendance' | 'enrollment'>('revenue');
  const [livePoints, setLivePoints] = useState<number[] | null>(null);
  const [liveMode, setLiveMode] = useState(false);

  // Live server trend — replaces synthetic projection when API reachable.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: d } = await api.get(`/api/analytics/trend?range=${range}&metric=${metric}`);
        if (alive && Array.isArray(d?.points) && d.points.length) {
          setLivePoints(d.points.map((v: number) => Math.round(v)));
          setLiveMode(true);
          return;
        }
      } catch { /* offline — keep synthetic */ }
      if (alive) { setLivePoints(null); setLiveMode(false); }
    })();
    return () => { alive = false; };
  }, [range, metric]);

  const kpis = useMemo(() => {
    const tuition = financials.recognizedRevenue || 0;
    const retail = financials.retailGrossMargin || 0;
    const inflow = financials.totalInflow || tuition + retail;
    const outflow = financials.totalOutflow || 0;
    const net = financials.netProfit || inflow - outflow;
    const margin = inflow > 0 ? (net / inflow) * 100 : 0;
    const activeSubs = students.filter((s) => s.subscription?.status === 'active').length;
    const quotaUsed = students.reduce((a, s) => a + (s.subscription?.usedSessions || 0), 0);
    const quotaMax = students.reduce((a, s) => a + (s.subscription?.maxSessions || 1), 0);
    const utilization = quotaMax > 0 ? (quotaUsed / quotaMax) * 100 : 0;
    const arDebt = students.reduce((a, s) => a + (s.walletBalance < 0 ? Math.abs(s.walletBalance) : 0), 0);
    return { tuition, retail, inflow, outflow, net, margin, activeSubs, utilization, arDebt };
  }, [financials, students]);

  // Synthetic but deterministic trend derived from live totals (stable UX on empty DB)
  const synthetic = useMemo(() => {
    const base = Math.max(12000, kpis.inflow / 6 || 42000);
    const mult = range === '30D' ? 7 : range === '90D' ? 12 : 12;
    const pts: number[] = [];
    for (let i = 0; i < mult; i++) {
      const wave = Math.sin(i * 1.1) * 0.14 + Math.cos(i * 0.55) * 0.08;
      const growth = 1 + i * 0.045;
      pts.push(Math.round(base * growth * (1 + wave)));
    }
    if (metric === 'attendance') return pts.map((p) => Math.round((p / base) * Math.max(6, attendanceLogs.length || 18)));
    if (metric === 'enrollment') return pts.map((p, i) => Math.round(Math.max(1, students.length || 8) * (0.7 + (i / mult) * 0.6)));
    return pts;
  }, [kpis.inflow, range, metric, attendanceLogs.length, students.length]);
  const trend = livePoints && livePoints.length ? livePoints : synthetic;

  const max = Math.max(...trend, 1);
  const min = Math.min(...trend, 0);
  const W = 640; const H = 220; const PAD = 28;
  const stepX = (W - PAD * 2) / Math.max(1, trend.length - 1);
  const yOf = (v: number) => H - PAD - ((v - min) / Math.max(1, max - min)) * (H - PAD * 2);
  const linePath = trend.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(PAD + i * stepX).toFixed(1)} ${yOf(v).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${(W - PAD).toFixed(1)} ${(H - PAD).toFixed(1)} L ${PAD} ${(H - PAD).toFixed(1)} Z`;

  const programMix = useMemo(() => {
    const counts: Record<string, number> = { classical: 0, contemporary: 0, youth: 0 };
    students.forEach((s) => { counts[s.program] = (counts[s.program] || 0) + 1; });
    const total = Math.max(1, students.length);
    if (students.length === 0) return [
      { key: 'classical', label: isRtl ? 'كلاسيكي' : 'Classical', pct: 48, color: '#8b5cf6' },
      { key: 'contemporary', label: isRtl ? 'معاصر' : 'Contemporary', pct: 27, color: '#38bdf8' },
      { key: 'youth', label: isRtl ? 'ناشئين' : 'Youth', pct: 25, color: '#f43f5e' },
    ];
    return (Object.keys(counts) as ('classical' | 'contemporary' | 'youth')[]).map((k) => ({
      key: k,
      label: k === 'classical' ? (isRtl ? 'كلاسيكي' : 'Classical') : k === 'contemporary' ? (isRtl ? 'معاصر' : 'Contemporary') : (isRtl ? 'ناشئين' : 'Youth'),
      pct: Math.round((counts[k] / total) * 100),
      color: k === 'classical' ? '#8b5cf6' : k === 'contemporary' ? '#38bdf8' : '#f43f5e',
    }));
  }, [students, isRtl]);

  const funnel = useMemo(() => {
    const byStage: Record<string, number> = { new_inquiry: 0, trial_scheduled: 0, audition_passed: 0, enrolled: 0, waitlist: 0 };
    leads.forEach((l) => { byStage[l.stage] = (byStage[l.stage] || 0) + 1; });
    const total = Math.max(1, leads.length || 24);
    const conv = leads.length ? Math.round(((byStage.enrolled || 0) / leads.length) * 100) : 32;
    return { byStage, total: leads.length || 24, conv };
  }, [leads]);

  const forecast = useMemo(() => {
    const monthly = kpis.inflow || 88000;
    return [1, 2, 3].map((m) => ({ month: m, low: Math.round(monthly * (1 + m * 0.03) * 0.92), base: Math.round(monthly * (1 + m * 0.06)), high: Math.round(monthly * (1 + m * 0.09) * 1.06) }));
  }, [kpis.inflow]);

  const insights = useMemo(() => {
    const list: { icon: React.ReactNode; title: string; body: string; tone: string }[] = [];
    if (kpis.utilization < 55) list.push({ icon: <Target className="w-4 h-4" />, title: isRtl ? 'فرصة إشغال' : 'Quota headroom', body: isRtl ? `معدل استهلاك الحصص ${kpis.utilization.toFixed(0)}٪ — فعّل حصص تعويضية وتذكيرات واتساب.` : `Quota utilization at ${kpis.utilization.toFixed(0)}% — push make-up classes + WhatsApp nudges.`, tone: 'text-sky-300 border-sky-500/30 bg-sky-500/10' });
    if (kpis.arDebt > 0) list.push({ icon: <AlertTriangle className="w-4 h-4" />, title: isRtl ? 'ذمم مدينة مستحقة' : 'AR collection risk', body: isRtl ? `إجمالي المديونية ${formatCurrency(kpis.arDebt, language)} — ابدأ حملة تحصيل قبل نهاية الشهر.` : `${formatCurrency(kpis.arDebt, language)} in student debt — run collection sprint before month-end.`, tone: 'text-amber-300 border-amber-500/30 bg-amber-500/10' });
    list.push({ icon: <Repeat className="w-4 h-4" />, title: isRtl ? 'نمو الاشتراكات' : 'Renewal engine', body: isRtl ? `${kpis.activeSubs} اشتراك نشط — جدّد الباقات قبل 7 أيام من الانتهاء لرفع الاحتفاظ.` : `${kpis.activeSubs} active packages — renew 7 days before expiry to lift retention.`, tone: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' });
    list.push({ icon: <Sparkles className="w-4 h-4" />, title: isRtl ? 'توقع الإيراد' : 'Revenue forecast', body: isRtl ? `النموذج يتوقع ${formatCurrency(forecast[2].base, language)} للشهر الثالث بثقة متوسطة.` : `Model projects ${formatCurrency(forecast[2].base, language)} by month 3 (medium confidence).`, tone: 'text-violet-300 border-violet-500/30 bg-violet-500/10' });
    return list;
  }, [kpis, forecast, isRtl, language]);

  const exportAnalytics = () => {
    exportCsv(`etoile-analytics-${range}-${metric}`, ['period', 'value'], trend.map((v, i) => ({ period: `P${i + 1}`, value: v })), { module: 'analytics' });
    showToast('Export ready', `Analytics ${metric} ${range} downloaded as CSV.`, 'success');
  };

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Control bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex p-1 rounded-xl bg-white/[0.03] border border-white/10">
            {(['revenue', 'attendance', 'enrollment'] as const).map((m) => (
              <button key={m} onClick={() => setMetric(m)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${metric === m ? 'nav-pill-active' : 'text-slate-400 hover:text-white'}`}>
                {m === 'revenue' ? (isRtl ? 'الإيراد' : 'Revenue') : m === 'attendance' ? (isRtl ? 'الحضور' : 'Attendance') : (isRtl ? 'التسجيل' : 'Enrollment')}
              </button>
            ))}
          </div>
          <div className="flex p-1 rounded-xl bg-white/[0.03] border border-white/10">
            {(['30D', '90D', '12M'] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${range === r ? 'bg-white/[0.08] text-white border border-white/10' : 'text-slate-400 hover:text-white'}`}>{r}</button>
            ))}
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full border ${liveMode ? 'status-pill-emerald' : 'status-pill-slate'}`}>
            {liveMode ? (isRtl ? 'مباشر من الخادم' : 'Live server') : (isRtl ? 'عرض محلي' : 'Local projection')}
          </span>
        </div>
        <button onClick={exportAnalytics} className="btn-ghost px-4 py-2 text-xs font-bold flex items-center gap-2 self-start">
          <Download className="w-3.5 h-3.5" /> {isRtl ? 'تصدير CSV' : 'Export CSV'}
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: isRtl ? 'صافي الربح' : 'Net profit', value: formatCurrency(kpis.net, language), sub: `${kpis.margin.toFixed(1)}% ${isRtl ? 'هامش' : 'margin'}`, icon: <Wallet className="w-4 h-4" />, cls: 'kpi-gradient-amber' },
          { label: isRtl ? 'إجمالي التدفق' : 'Total inflow', value: formatCurrency(kpis.inflow, language), sub: `${formatCurrency(kpis.tuition, language)} ${isRtl ? 'حصص' : 'tuition'} + ${formatCurrency(kpis.retail, language)} ${isRtl ? 'متجر' : 'retail'}`, icon: <TrendingUp className="w-4 h-4" />, cls: 'kpi-gradient-blue' },
          { label: isRtl ? 'اشتراكات نشطة' : 'Active packages', value: String(kpis.activeSubs), sub: `${kpis.utilization.toFixed(0)}% ${isRtl ? 'استهلاك الحصص' : 'quota used'}`, icon: <Users className="w-4 h-4" />, cls: 'kpi-gradient-purple' },
          { label: isRtl ? 'ذمم مدينة' : 'Receivables', value: formatCurrency(kpis.arDebt, language), sub: `${orders.length} ${isRtl ? 'طلب متجر' : 'store orders'}`, icon: <Target className="w-4 h-4" />, cls: 'kpi-gradient-coral' },
        ].map((k, i) => (
          <div key={i} className={`${k.cls} p-5 min-h-[132px] flex flex-col justify-between premium-card-hover stagger-${i + 1} animate-fade-up`}>
            <div className="relative z-10 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/85">{k.label}</span>
              <span className="w-8 h-8 rounded-lg bg-white/20 border border-white/20 flex items-center justify-center text-white">{k.icon}</span>
            </div>
            <div className="relative z-10 mt-3">
              <div className="font-heading text-2xl font-extrabold text-white tracking-tight">{k.value}</div>
              <div className="text-[11px] text-white/75 mt-1 flex items-center gap-1.5"><ArrowUpRight className="w-3 h-3" />{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Main trend */}
        <SectionCard
          title={metric === 'revenue' ? (isRtl ? 'اتجاه الإيراد' : 'Revenue trajectory') : metric === 'attendance' ? (isRtl ? 'اتجاه الحضور' : 'Attendance trajectory') : (isRtl ? 'نمو التسجيل' : 'Enrollment growth')}
          subtitle={isRtl ? `النطاق ${range} • محدث لحظياً من بيانات الأكاديمية` : `${range} window • live from academy data`}
          icon={<BarChart3 className="w-4 h-4 text-emerald-300" />}
          className="xl:col-span-8"
        >
          <div className="relative">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[240px]" preserveAspectRatio="none">
              <defs>
                <linearGradient id="analyticsArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={f} x1={PAD} x2={W - PAD} y1={PAD + (H - PAD * 2) * f} y2={PAD + (H - PAD * 2) * f} className="chart-grid-line" />
              ))}
              <path d={areaPath} fill="url(#analyticsArea)" />
              <path d={linePath} fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" className="chart-neon-filter" />
              {trend.map((v, i) => (
                <circle key={i} cx={PAD + i * stepX} cy={yOf(v)} r={i === trend.length - 1 ? 5 : 2.5} fill={i === trend.length - 1 ? '#fff' : '#34d399'} stroke="#059669" strokeWidth="1.5" />
              ))}
            </svg>
            <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-2 px-1">
              <span>{range === '12M' ? 'JAN' : 'START'}</span><span>MID</span><span>{range === '12M' ? 'DEC' : 'NOW'}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/[0.06]">
            <div><p className="text-[11px] text-slate-400">{isRtl ? 'الذروة' : 'Peak'}</p><p className="text-sm font-bold text-white font-mono">{metric === 'revenue' ? formatCurrency(max, language) : max}</p></div>
            <div><p className="text-[11px] text-slate-400">{isRtl ? 'المتوسط' : 'Average'}</p><p className="text-sm font-bold text-white font-mono">{metric === 'revenue' ? formatCurrency(Math.round(trend.reduce((a, b) => a + b, 0) / trend.length), language) : Math.round(trend.reduce((a, b) => a + b, 0) / trend.length)}</p></div>
            <div><p className="text-[11px] text-slate-400">{isRtl ? 'النمو' : 'Growth'}</p><p className="text-sm font-bold text-emerald-300">+{(((trend[trend.length - 1] - trend[0]) / Math.max(1, trend[0])) * 100).toFixed(1)}%</p></div>
          </div>
        </SectionCard>

        <div className="xl:col-span-4 space-y-5">
          <SectionCard title={isRtl ? 'مزيج البرامج' : 'Program mix'} subtitle={isRtl ? 'توزيع الطلاب حسب التخصص' : 'Enrollment share by discipline'} icon={<PieChart className="w-4 h-4 text-violet-300" />}>
            <div className="space-y-3">
              {programMix.map((p) => (
                <div key={p.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold text-slate-200"><span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />{p.label}</span>
                    <span className="font-mono font-bold text-white">{p.pct}%</span>
                  </div>
                  <ProgressBar value={p.pct} tone={p.key === 'classical' ? 'violet' : p.key === 'contemporary' ? 'sky' : 'rose'} />
                </div>
              ))}
              <p className="text-[11px] text-slate-500 pt-1">{courses.length} {isRtl ? 'دورة معتمدة' : 'accredited courses'} • {courseSessions.length} {isRtl ? 'حصة مجدولة' : 'scheduled sessions'}</p>
            </div>
          </SectionCard>

          <SectionCard title={isRtl ? 'قمع القبول' : 'Admissions funnel'} subtitle={`${funnel.total} ${isRtl ? 'استفسار • تحويل' : 'inquiries'} ${funnel.conv}%`} icon={<Target className="w-4 h-4 text-amber-300" />}>
            <div className="space-y-2">
              {(['new_inquiry', 'trial_scheduled', 'audition_passed', 'enrolled'] as const).map((s, i) => {
                const v = funnel.byStage[s] || (s === 'new_inquiry' ? Math.round(funnel.total * 0.45) : s === 'trial_scheduled' ? Math.round(funnel.total * 0.28) : s === 'audition_passed' ? Math.round(funnel.total * 0.18) : Math.round(funnel.total * 0.32));
                const pct = Math.round((v / funnel.total) * 100);
                return (
                  <div key={s} className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400 w-24 truncate">{s.replace('_', ' ')}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400" style={{ width: `${Math.max(8, pct + (3 - i) * 12)}%` }} /></div>
                    <span className="text-[11px] font-mono font-bold text-white w-8 text-end">{v}</span>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <SectionCard title={isRtl ? 'توقع التدفق (3 أشهر)' : 'Cash-flow forecast (3 months)'} subtitle={isRtl ? 'سيناريوهات منخفض / أساسي / مرتفع' : 'Low / base / high scenarios'} icon={<TrendingUp className="w-4 h-4 text-emerald-300" />} className="xl:col-span-7">
          <div className="overflow-x-auto">
            <table className="w-full table-premium">
              <thead><tr><th>{isRtl ? 'الشهر' : 'Month'}</th><th>{isRtl ? 'منخفض' : 'Low'}</th><th>{isRtl ? 'أساسي' : 'Base'}</th><th>{isRtl ? 'مرتفع' : 'High'}</th><th>{isRtl ? 'الثقة' : 'Confidence'}</th></tr></thead>
              <tbody>
                {forecast.map((f) => (
                  <tr key={f.month}>
                    <td className="font-bold text-white">M+{f.month}</td>
                    <td className="font-mono text-slate-300">{formatCurrency(f.low, language)}</td>
                    <td className="font-mono font-bold text-emerald-300">{formatCurrency(f.base, language)}</td>
                    <td className="font-mono text-slate-300">{formatCurrency(f.high, language)}</td>
                    <td><span className="status-pill-blue px-2 py-0.5 rounded-full text-[10px] font-bold">{f.month === 1 ? 'High' : f.month === 2 ? 'Medium' : 'Watch'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title={isRtl ? 'رؤى ذكية' : 'Smart insights'} subtitle={isRtl ? 'توصيات مولدة من البيانات' : 'Data-generated recommendations'} icon={<Sparkles className="w-4 h-4 text-rose-300" />} className="xl:col-span-5">
          <div className="space-y-2.5">
            {insights.map((ins, i) => (
              <div key={i} className={`p-3 rounded-xl border text-xs leading-relaxed flex gap-2.5 ${ins.tone}`}>
                <span className="flex-shrink-0 mt-0.5">{ins.icon}</span>
                <span><strong className="block text-[12px]">{ins.title}</strong><span className="opacity-90">{ins.body}</span></span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {(students.length === 0 && orders.length === 0) && (
        <EmptyState
          icon={<BarChart3 className="w-5 h-5" />}
          title={isRtl ? 'التحليلات تعمل على بيانات حية' : 'Analytics runs on live data'}
          hint={isRtl ? 'أضف طلاباً وسجّل حضوراً ومبيعات لتتحول هذه الرسوم إلى مؤشرات حقيقية.' : 'Add students, log check-ins and sales — these charts will switch from projection to live academy truth.'}
        />
      )}
    </div>
  );
};

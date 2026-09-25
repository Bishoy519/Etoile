import React, { useMemo, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { AdminTabId } from '../types';
import { formatCurrency } from '../utils/currency';
import { exportCsv } from '../utils/csv';
import { SectionCard, Sparkline, ProgressBar } from './ui';
import { ViewSwitcher, useViewPrefs } from './ViewSwitcher';
import { RenewalQueue } from './RenewalQueue';
import { CelebrationsCard } from './CelebrationsCard';
import {
  Users, Scan, TrendingUp, ShoppingBag, Plus, Search, ChevronRight, ArrowUpRight,
  Clock, Sparkles, AlertTriangle, Wallet, CalendarDays, MessageSquare, GraduationCap,
  CheckCircle2, Timer, BadgeCheck, Download, LayoutGrid, Rows3,
} from 'lucide-react';

interface DashboardOverviewProps { onNavigate: (tab: AdminTabId) => void; }
type Timeframe = '1D' | '1W' | '1M' | '1Y' | 'ALL';
type ChartMetric = 'revenue' | 'attendance';

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const {
    students, attendanceLogs, financials, currentUser, userRole, roleConfigs, language,
    leads, courses, orders, courseSessions, auditLogs, showToast,
  } = useAdmin();
  const isRtl = language === 'ar';
  const roleConfig = roleConfigs[currentUser?.role || userRole] || roleConfigs.superadmin;
  const can = (t: AdminTabId) => roleConfig.allowedTabs.includes(t);
  const go = (t: AdminTabId) => {
    if (can(t)) onNavigate(t);
    else showToast(isRtl ? 'غير مصرح' : 'Access restricted', isRtl ? 'دورك لا يملك صلاحية هذه الصفحة.' : 'Your role cannot open this module.', 'warning');
  };

  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [metric, setMetric] = useState<ChartMetric>('revenue');
  const [tableSearch, setTableSearch] = useState('');

  const [tableFilter, setTableFilter] = useState<'all' | 'open' | 'completed'>('all');
  const ordersView = useViewPrefs('dashboard-orders', 'table');
  const inflow = financials.totalInflow || financials.recognizedRevenue + financials.retailGrossMargin || 0;
  const outflow = financials.totalOutflow || 0;
  const net = financials.netProfit || inflow - outflow;
  const margin = inflow > 0 ? (net / inflow) * 100 : 0;
  const activePkgs = students.filter((s) => s.subscription?.status === 'active').length;
  const lowQuota = students.filter((s) => {
    const max = s.subscription?.maxSessions || 0; const used = s.subscription?.usedSessions || 0;
    return max > 0 && max - used <= 2 && max - used >= 0;
  });
  const debtors = students.filter((s) => s.walletBalance < 0);
  const arTotal = debtors.reduce((a, s) => a + Math.abs(s.walletBalance), 0);
  const trials = leads.filter((l) => l.stage === 'trial_scheduled').length;

  const quotaUsed = students.reduce((a, s) => a + (s.subscription?.usedSessions || 0), 0);
  const quotaMax = students.reduce((a, s) => a + (s.subscription?.maxSessions || 0), 1);
  const utilization = Math.min(100, (quotaUsed / Math.max(1, quotaMax)) * 100);

  const isEmptyAcademy = students.length === 0 && attendanceLogs.length === 0 && inflow === 0;

  const displayFirstName = (full?: string, fallback = 'Director') => {
    if (!full) return fallback;
    const honorifics = new Set(['madame', 'mr', 'mrs', 'ms', 'miss', 'dr', 'sir', 'madam', 'm.', 'mme', 'mlle']);
    const parts = full.trim().split(/\s+/).filter(Boolean);
    const first = parts.find((p) => !honorifics.has(p.toLowerCase().replace(/\./g, '')));
    return first || parts[0] || fallback;
  };
  const firstName = displayFirstName(currentUser?.name, language === 'ar' ? 'إيلينا' : 'Director');

  const health = useMemo(() => {
    if (isEmptyAcademy) return 0;
    let score = 72;
    if (students.length > 0) score += 6;
    if (attendanceLogs.length > 0) score += 6;
    if (margin > 15) score += 8; else if (margin > 0) score += 4;
    if (arTotal > inflow * 0.2) score -= 8;
    if (lowQuota.length > students.length * 0.4) score -= 5;
    return Math.max(32, Math.min(98, Math.round(score)));
  }, [isEmptyAcademy, students.length, attendanceLogs.length, margin, arTotal, inflow, lowQuota.length]);

  const hasRevenue = inflow > 0;
  const hasAttendance = attendanceLogs.length > 0;
  const datasets: Record<Timeframe, { points: number[]; labels: string[]; peak: string; empty: boolean }> = useMemo(() => {
    if (metric === 'revenue' && !hasRevenue) {
      const zero = [0, 0, 0, 0, 0, 0, 0];
      return {
        '1D': { points: zero, labels: ['10a', '11a', '12p', '1p', '2p', '3p', '4p'], peak: formatCurrency(0, language), empty: true },
        '1W': { points: zero, labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], peak: formatCurrency(0, language), empty: true },
        '1M': { points: zero, labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'], peak: formatCurrency(0, language), empty: true },
        '1Y': { points: zero, labels: ['Q1', 'Q2a', 'Q2b', 'Q3', 'Q4a', 'Q4b', 'Now'], peak: formatCurrency(0, language), empty: true },
        'ALL': { points: zero, labels: ['2022', '2023', '2024', '2025', '2026a', '2026b', 'Now'], peak: formatCurrency(0, language), empty: true },
      };
    }
    if (metric === 'attendance' && !hasAttendance) {
      const zero = [0, 0, 0, 0, 0, 0, 0];
      return {
        '1D': { points: zero, labels: ['10a', '11a', '12p', '1p', '2p', '3p', '4p'], peak: '0', empty: true },
        '1W': { points: zero, labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], peak: '0', empty: true },
        '1M': { points: zero, labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'], peak: '0', empty: true },
        '1Y': { points: zero, labels: ['Q1', 'Q2a', 'Q2b', 'Q3', 'Q4a', 'Q4b', 'Now'], peak: '0', empty: true },
        'ALL': { points: zero, labels: ['2022', '2023', '2024', '2025', '2026a', '2026b', 'Now'], peak: '0', empty: true },
      };
    }
    const base = Math.max(14000, inflow / 5 || 46000);
    const mk = (n: number, grow: number) =>
      Array.from({ length: n }, (_, i) => Math.round(base * (1 + i * grow) * (1 + Math.sin(i * 1.2) * 0.12)));
    const attBase = Math.max(6, attendanceLogs.length || 18);
    const mkA = (n: number) => Array.from({ length: n }, (_, i) => Math.max(2, Math.round(attBase * (0.55 + (i / n) * 0.8 + Math.sin(i) * 0.12))));
    const pick = (rev: number[], att: number[]) => (metric === 'revenue' ? rev : att);
    return {
      '1D': { points: pick(mk(7, 0.02), mkA(7)), labels: ['10a', '11a', '12p', '1p', '2p', '3p', '4p'], peak: metric === 'revenue' ? formatCurrency(base * 1.2, language) : `${attBase + 4}`, empty: false },
      '1W': { points: pick(mk(7, 0.05), mkA(7)), labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], peak: metric === 'revenue' ? formatCurrency(base * 1.45, language) : `${attBase + 9}`, empty: false },
      '1M': { points: pick(mk(7, 0.09), mkA(7)), labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'], peak: metric === 'revenue' ? formatCurrency(base * 1.8, language) : `${attBase + 14}`, empty: false },
      '1Y': { points: pick(mk(7, 0.14), mkA(7)), labels: ['Q1', 'Q2a', 'Q2b', 'Q3', 'Q4a', 'Q4b', 'Now'], peak: metric === 'revenue' ? formatCurrency(base * 2.4, language) : `${attBase + 22}`, empty: false },
      'ALL': { points: pick(mk(7, 0.2), mkA(7)), labels: ['2022', '2023', '2024', '2025', '2026a', '2026b', 'Now'], peak: metric === 'revenue' ? formatCurrency(base * 3.1, language) : `${attBase + 30}`, empty: false },
    };
  }, [inflow, attendanceLogs.length, metric, language, hasRevenue, hasAttendance]);

  const chart = datasets[timeframe];
  const W = 620; const H = 210; const PAD = 26;
  const max = Math.max(...chart.points, 1); const min = Math.min(...chart.points, 0);
  const sx = (W - PAD * 2) / Math.max(1, chart.points.length - 1);
  const yOf = (v: number) => H - PAD - ((v - min) / Math.max(1, max - min)) * (H - PAD * 2);
  const line = chart.points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(PAD + i * sx).toFixed(1)} ${yOf(v).toFixed(1)}`).join(' ');
  const area = `${line} L ${(W - PAD).toFixed(1)} ${(H - PAD).toFixed(1)} L ${PAD} ${(H - PAD).toFixed(1)} Z`;
  const peakIdx = chart.points.indexOf(max);

  const programShare = useMemo(() => {
    if (students.length === 0) return [];
    const c: Record<string, number> = { classical: 0, contemporary: 0, youth: 0 };
    students.forEach((s) => { c[s.program] = (c[s.program] || 0) + 1; });
    const t = Math.max(1, students.length);
    // Normalize so segments always sum to exactly 100 (fixes rounding drift).
    const raw = [
      { k: 'Classical', raw: (c.classical / t) * 100, color: '#8b5cf6' },
      { k: 'Contemporary', raw: (c.contemporary / t) * 100, color: '#38bdf8' },
      { k: 'Youth', raw: (c.youth / t) * 100, color: '#f43f5e' },
    ];
    const rounded = raw.map((r) => ({ ...r, v: Math.floor(r.raw) }));
    let remainder = 100 - rounded.reduce((a, r) => a + r.v, 0);
    const order = [...rounded].sort((a, b) => (b.raw % 1) - (a.raw % 1));
    for (let i = 0; remainder > 0 && i < order.length; i++, remainder--) {
      const target = rounded.find((r) => r.k === order[i].k);
      if (target) target.v += 1;
    }
    return rounded;
  }, [students]);

  const donut = useMemo(() => {
    const C = 2 * Math.PI * 54;
    if (programShare.length === 0) return [];
    const GAP = programShare.length > 1 ? 3 : 0; // visual separation between arcs
    const segs = programShare.map((p) => ({ ...p, len: Math.max(0, (p.v / 100) * C - GAP) }));
    let off = 0;
    return segs.map((s) => { const o = off; off -= (s.len + GAP); return { ...s, dash: `${s.len.toFixed(1)} ${(C - s.len).toFixed(1)}`, off: o }; });
  }, [programShare]);

  const liveOrders = useMemo(() => (Array.isArray(orders) ? orders : []).map((o: any) => {
    const items = Array.isArray(o?.items) ? o.items : [];
    const total = Number(o?.total ?? o?.totalAmount ?? o?.amount ?? 0);
    const rawStatus = String(o?.status ?? o?.ledgerStatus ?? 'open').toLowerCase();
    return {
      id: String(o?.orderNumber || o?.id || 'UNKNOWN').slice(-6).toUpperCase(),
      customer: o?.customerName || o?.customer || (isRtl ? 'عميل' : 'Walk-in'),
      program: items.map((i: any) => i?.product?.title || i?.title || i?.name || '').filter(Boolean).slice(0, 2).join(', ') || 'Boutique',
      price: total, priceLabel: formatCurrency(total, language),
      status: rawStatus === 'completed' || rawStatus === 'settled' || rawStatus === 'charged_debt' ? 'completed' : 'open',
      time: String(o?.timestamp || o?.createdAt || o?.date || ''),
    };
  }), [orders, isRtl, language]);

  const filteredOrders = liveOrders.filter((o) => {
    const q = tableSearch.toLowerCase();
    const matchQ = !q || o.customer.toLowerCase().includes(q) || o.id.toLowerCase().includes(q) || o.program.toLowerCase().includes(q);
    const matchF = tableFilter === 'all' || o.status === tableFilter;
    return matchQ && matchF;
  });

  // Branch scope: operational lists (courses/sessions) filter by studio branch.
  // Financial KPIs stay global — money is consolidated, not branched.
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const branches = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => set.add((c.branchCode || 'ZAM').toUpperCase()));
    return ['all', ...Array.from(set).sort()];
  }, [courses]);
  const courseBranch = useMemo(() => {
    const m = new Map<string, string>();
    courses.forEach((c) => m.set(c.id, (c.branchCode || 'ZAM').toUpperCase()));
    return m;
  }, [courses]);
  const scopedCourses = useMemo(
    () => (branchFilter === 'all' ? courses : courses.filter((c) => (c.branchCode || 'ZAM').toUpperCase() === branchFilter)),
    [courses, branchFilter],
  );
  const scopedSessions = useMemo(
    () => (branchFilter === 'all' ? courseSessions : courseSessions.filter((s) => (courseBranch.get(s.courseId) || 'ZAM') === branchFilter)),
    [courseSessions, courseBranch, branchFilter],
  );

  const todaySessions = useMemo(() => scopedSessions.slice(0, 4).map((s) => ({
    id: s.id, time: String(s.startTime).slice(0, 5), title: s.title, room: s.studioRoom,
    instructor: typeof s.instructor === 'string' ? s.instructor : (s.instructor as { name?: string })?.name || 'Faculty',
    sent: s.reminderSent,
  })), [scopedSessions]);

  const feed = useMemo(() => {
    const items: { icon: React.ReactNode; title: string; sub: string; time: string; tone: string }[] = [];
    attendanceLogs.slice(0, 3).forEach((a) => items.push({
      icon: <Scan className="w-4 h-4" />, title: a.studentName, sub: `${a.classTitle} • ${a.quotaRemaining} left`, time: a.timestamp, tone: 'bg-emerald-500/12 border-emerald-500/25 text-emerald-300',
    }));
    auditLogs.slice(0, 2).forEach((a) => items.push({
      icon: <BadgeCheck className="w-4 h-4" />, title: a.action, sub: a.details.slice(0, 64), time: a.timestamp, tone: 'bg-sky-500/12 border-sky-500/25 text-sky-300',
    }));
    if (items.length === 0) {
      items.push(
        { icon: <Sparkles className="w-4 h-4" />, title: isRtl ? 'الأكاديمية جاهزة' : 'Academy ready', sub: isRtl ? 'ابدأ بتسجيل أول حضور اليوم' : 'Log the first check-in to ignite the feed', time: 'now', tone: 'bg-violet-500/12 border-violet-500/25 text-violet-300' },
        { icon: <Wallet className="w-4 h-4" />, title: isRtl ? 'المالية متزامنة' : 'Finance synced', sub: `${formatCurrency(inflow, language)} ${isRtl ? 'تدفق' : 'inflow'} • ${margin.toFixed(1)}% ${isRtl ? 'هامش' : 'margin'}`, time: 'live', tone: 'bg-amber-500/12 border-amber-500/25 text-amber-300' },
      );
    }
    return items.slice(0, 5);
  }, [attendanceLogs, auditLogs, isRtl, inflow, margin, language]);

  const quicks: { label: string; icon: React.ReactNode; tab: AdminTabId; desc: string }[] = [
    can('checkin') ? { label: isRtl ? 'تسجيل حضور' : 'Check in', icon: <Scan className="w-4 h-4" />, tab: 'checkin', desc: 'Kiosk' } : null,
    can('admissions') ? { label: isRtl ? 'استفسار' : 'Inquiry', icon: <Plus className="w-4 h-4" />, tab: 'admissions', desc: 'CRM' } : null,
    can('pos') ? { label: isRtl ? 'بيع' : 'POS sale', icon: <ShoppingBag className="w-4 h-4" />, tab: 'pos', desc: 'Retail' } : null,
    can('financials') ? { label: isRtl ? 'فاتورة' : 'Invoice', icon: <TrendingUp className="w-4 h-4" />, tab: 'financials', desc: 'AR' } : null,
    can('schedule') ? { label: isRtl ? 'الجدول' : 'Schedule', icon: <CalendarDays className="w-4 h-4" />, tab: 'schedule', desc: 'Plan' } : null,
    can('openwa') ? { label: isRtl ? 'واتساب' : 'WhatsApp', icon: <MessageSquare className="w-4 h-4" />, tab: 'openwa', desc: 'Send' } : null,
  ].filter(Boolean) as { label: string; icon: React.ReactNode; tab: AdminTabId; desc: string }[];

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Hero strip: greeting + health + quicks */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 premium-card p-5 flex flex-col sm:flex-row sm:items-center gap-5 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 55% 90% at 0% 50%, rgba(244,63,94,0.09), transparent 60%)' }} />
          <div className="relative flex items-center gap-4 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <svg viewBox="0 0 120 120" className="w-[92px] h-[92px] -rotate-90" role="img" aria-label={isEmptyAcademy ? 'No health data yet' : `Academy health ${health}`}>
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                {!isEmptyAcademy && (
                  <circle cx="60" cy="60" r="52" fill="none" stroke="url(#healthGrad)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(health / 100) * 326.7} 326.7`} />
                )}
                <defs><linearGradient id="healthGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#fb7185" /></linearGradient></defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-heading text-2xl font-extrabold text-white leading-none">{isEmptyAcademy ? '—' : health}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{isEmptyAcademy ? 'new' : 'health'}</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-rose-300">{isRtl ? 'ملخص اليوم' : "Today's Summary"}</p>
              <h2 className="font-heading text-lg sm:text-xl font-extrabold text-white tracking-tight mt-0.5">
                {isRtl ? `أهلاً يا ${firstName}` : `Welcome back, ${firstName}`}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isEmptyAcademy
                  ? (isRtl ? 'لا توجد بيانات بعد — سجّل أول طالب للبدء' : 'No data yet — enroll your first student to begin')
                  : (<>{attendanceLogs.length} {isRtl ? 'حضور اليوم' : 'check-ins'} • {activePkgs} {isRtl ? 'اشتراك نشط' : 'active packages'} • {formatCurrency(net, language)} {isRtl ? 'صافي أرباح' : 'net profit'} ({margin.toFixed(1)}%)</>)}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {quicks.map((q) => (
                  <button key={q.tab + q.label} onClick={() => onNavigate(q.tab)} className="btn-ghost px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5">
                    {q.icon}<span>{q.label}</span><span className="text-[9px] font-mono text-slate-500 bg-white/[0.05] px-1 rounded">{q.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="relative grid grid-cols-3 sm:grid-cols-1 xl:grid-cols-1 gap-2 sm:w-44 flex-shrink-0">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-2.5 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-500">{isRtl ? 'نسبة الإشغال' : 'Capacity'}</p>
              <p className="font-heading font-extrabold text-white">{utilization.toFixed(0)}%</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-2.5 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-500">{isRtl ? 'حصص تجريبية' : 'Trials'}</p>
              <p className="font-heading font-extrabold text-white">{trials}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-2.5 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-500">{isRtl ? 'مستحقات' : 'Unpaid'}</p>
              <p className="font-heading font-extrabold text-amber-300 text-sm">{formatCurrency(arTotal, language)}</p>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 premium-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-300" />{isRtl ? 'تنبيهات هامة' : 'Alerts'}</h3>
            <span className="text-[11px] font-mono text-slate-400">{isEmptyAcademy ? (isRtl ? 'إعداد' : 'setup') : `${lowQuota.length + debtors.length + (trials ? 1 : 0)} ${isRtl ? 'عنصر' : 'items'}`}</span>
          </div>
          <div className="space-y-2.5 text-xs">
            {isEmptyAcademy ? (
              <div className="p-3.5 rounded-xl bg-sky-500/[0.07] border border-sky-500/20 flex gap-2.5">
                <Sparkles className="w-4 h-4 text-sky-300 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300 leading-relaxed">{isRtl ? 'أكاديمية جديدة — أضف أول طالب وابدأ أول حضور.' : 'Brand-new academy — add your first student and log the first check-in.'}</span>
              </div>
            ) : lowQuota.length === 0 && debtors.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20 flex gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300 leading-relaxed">{isRtl ? 'كل الحصص والمحافظ سليمة — لا مخاطر عاجلة.' : 'Quotas and wallets look healthy — no urgent risk.'}</span>
              </div>
            ) : (
              <>
                {lowQuota.slice(0, 2).map((s) => (
                  <button key={s.id} onClick={() => go('students')} className="w-full p-3 rounded-xl bg-amber-500/[0.07] border border-amber-500/20 flex items-center justify-between gap-2 hover:border-amber-500/40 transition text-start">
                    <span className="min-w-0"><strong className="block text-slate-100 truncate">{s.name}</strong><span className="text-[11px] text-amber-200/80">{(s.subscription.maxSessions - s.subscription.usedSessions)} {isRtl ? 'حصص متبقية' : 'sessions left'} — {isRtl ? 'جدد الآن' : 'renew now'}</span></span>
                    <ChevronRight className="w-4 h-4 text-amber-300 rtl:rotate-180 flex-shrink-0" />
                  </button>
                ))}
                {debtors.slice(0, 2).map((s) => (
                  <button key={s.id} onClick={() => go('financials')} className="w-full p-3 rounded-xl bg-rose-500/[0.07] border border-rose-500/20 flex items-center justify-between gap-2 hover:border-rose-500/40 transition text-start">
                    <span className="min-w-0"><strong className="block text-slate-100 truncate">{s.name}</strong><span className="text-[11px] text-rose-200/80">{formatCurrency(Math.abs(s.walletBalance), language)} {isRtl ? 'مستحق' : 'overdue'}</span></span>
                    <Wallet className="w-4 h-4 text-rose-300 flex-shrink-0" />
                  </button>
                ))}
              </>
            )}
            {can('analytics') && (
              <button onClick={() => onNavigate('analytics')} className="w-full py-2 rounded-xl border border-white/10 text-slate-300 hover:text-white text-[11px] font-bold transition flex items-center justify-center gap-1.5">
                {isRtl ? 'فتح التحليلات الكاملة' : 'Open full analytics'} <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="pt-3 mt-1 border-t border-white/[0.06]">
              <RenewalQueue limit={4} onOpenStudents={() => go('students')} />
              <CelebrationsCard />
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { title: isRtl ? 'الطلاب المسجلين' : 'Students', sub: isRtl ? 'الطلاب الحاليين' : 'Enrolled students', value: `${students.length}`, delta: `+${activePkgs} ${isRtl ? 'اشتراك نشط' : 'active'}`, icon: <Users className="w-4 h-4" />, cls: 'kpi-gradient-purple', tab: 'students' as AdminTabId, spark: students.length > 0 ? [8, 12, 10, 15, 14, 18, 20] : [0, 0, 0, 0, 0, 0, 0] },
          { title: isRtl ? 'حضور اليوم' : 'Attendance', sub: isRtl ? 'عدد الحضور المسجل' : "Today's check-ins", value: `${attendanceLogs.length}`, delta: `${utilization.toFixed(0)}% ${isRtl ? 'نسبة الإشغال' : 'capacity'}`, icon: <Scan className="w-4 h-4" />, cls: 'kpi-gradient-coral', tab: 'checkin' as AdminTabId, spark: attendanceLogs.length > 0 ? [4, 7, 5, 9, 8, 12, attendanceLogs.length] : [0, 0, 0, 0, 0, 0, 0] },
          { title: isRtl ? 'إجمالي الدخل' : 'Total Revenue', sub: isRtl ? 'اشتراكات ومبيعات' : 'Subscriptions & store', value: formatCurrency(inflow, language), delta: `${margin.toFixed(1)}% ${isRtl ? 'هامش ربح' : 'margin'}`, icon: <TrendingUp className="w-4 h-4" />, cls: 'kpi-gradient-blue', tab: 'financials' as AdminTabId, spark: inflow > 0 ? [20, 28, 24, 34, 32, 40, 44] : [0, 0, 0, 0, 0, 0, 0] },
          { title: isRtl ? 'مبيعات المتجر' : 'Store Sales', sub: isRtl ? 'أرباح ومبيعات' : 'Orders & margin', value: formatCurrency(financials.retailGrossMargin, language), delta: `${orders.length} ${isRtl ? 'طلب' : 'orders'}`, icon: <ShoppingBag className="w-4 h-4" />, cls: 'kpi-gradient-amber', tab: 'pos' as AdminTabId, spark: orders.length > 0 ? [6, 9, 7, 11, 10, 13, 15] : [0, 0, 0, 0, 0, 0, 0] },
        ].map((k, i) => (
          <button key={i} onClick={() => go(k.tab)} className={`${k.cls} p-5 text-start premium-card-hover animate-fade-up stagger-${i + 1} min-h-[148px] flex flex-col justify-between min-w-0 overflow-hidden`}>
            <span className="relative z-10 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/85 truncate">{k.title}</span>
              <span className="w-8 h-8 rounded-lg bg-white/20 border border-white/20 flex items-center justify-center text-white flex-shrink-0">{k.icon}</span>
            </span>
            <span className="relative z-10 mt-2 block min-w-0">
              <span className="text-[11px] text-white/80 font-medium block truncate">{k.sub}</span>
              <span className="flex items-end justify-between gap-2 mt-1 min-w-0">
                <span className="font-heading text-[22px] font-extrabold text-white tracking-tight leading-none truncate min-w-0">{k.value}</span>
                <span className="flex-shrink-0 opacity-90"><Sparkline points={k.spark} id={`dash-${i}`} /></span>
              </span>
              <span className="inline-flex mt-2 text-[11px] font-bold bg-white/20 border border-white/20 text-white px-2 py-0.5 rounded-full whitespace-nowrap">{k.delta}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <SectionCard
          title={metric === 'revenue' ? (isRtl ? 'حركة الإيرادات' : 'Revenue Trend') : (isRtl ? 'حركة الحضور' : 'Attendance Trend')}
          subtitle={isRtl ? 'رسم بياني مباشر' : 'Live chart'}
          icon={<TrendingUp className="w-4 h-4 text-emerald-300" />}
          className="xl:col-span-8"
          action={
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <div className="flex p-1 rounded-xl bg-white/[0.03] border border-white/10">
                {(['revenue', 'attendance'] as ChartMetric[]).map((m) => (
                  <button key={m} onClick={() => setMetric(m)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${metric === m ? 'bg-white text-slate-950' : 'text-slate-400 hover:text-white'}`}>
                    {m === 'revenue' ? (isRtl ? 'الإيرادات' : 'Revenue') : (isRtl ? 'الحضور' : 'Attendance')}
                  </button>
                ))}
              </div>
              <div className="flex p-1 rounded-xl bg-white/[0.03] border border-white/10">
                {(['1D', '1W', '1M', '1Y', 'ALL'] as Timeframe[]).map((t) => (
                  <button key={t} onClick={() => setTimeframe(t)} className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${timeframe === t ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'}`}>{t}</button>
                ))}
              </div>
            </div>
          }
        >
          <div className="relative">
            {!chart.empty && (
              <div
                className="absolute z-10 pointer-events-none"
                style={{
                  left: `${Math.min(88, Math.max(8, ((PAD + peakIdx * sx) / W) * 100))}%`,
                  top: 6,
                  transform: 'translateX(-50%)',
                }}
              >
                <span className="bg-emerald-400 text-slate-950 font-extrabold text-[11px] px-2 py-1 rounded-lg shadow-lg shadow-emerald-500/30 whitespace-nowrap block max-w-[160px] truncate">{chart.peak}</span>
              </div>
            )}
            {chart.empty && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <span className="text-[11px] font-bold text-slate-500 bg-white/[0.04] border border-white/10 px-3 py-1.5 rounded-full">
                  {isRtl ? 'لا بيانات بعد لهذه الفترة' : 'No data for this period yet'}
                </span>
              </div>
            )}
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[210px]" preserveAspectRatio="none" role="img" aria-label={chart.empty ? 'Empty chart' : `Chart peak ${chart.peak}`}>
              <defs><linearGradient id="dashArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={chart.empty ? '0.05' : '0.3'} /><stop offset="100%" stopColor="#34d399" stopOpacity="0" /></linearGradient></defs>
              {[0.3, 0.55, 0.8].map((f) => (<line key={f} x1={PAD} x2={W - PAD} y1={H * f} y2={H * f} className="chart-grid-line" />))}
              <path d={area} fill="url(#dashArea)" />
              <path d={line} fill="none" stroke={chart.empty ? '#334155' : '#34d399'} strokeWidth="3" strokeLinecap="round" strokeDasharray={chart.empty ? '5 5' : undefined} className={chart.empty ? undefined : 'chart-neon-filter'} />
              {!chart.empty && <circle cx={PAD + peakIdx * sx} cy={yOf(max)} r="5.5" fill="#fff" stroke="#34d399" strokeWidth="3" />}
            </svg>
            <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-2 px-1 border-t border-white/[0.06]">
              {chart.labels.map((l, i) => (<span key={i}>{l}</span>))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/[0.06] text-center">
            <div><p className="text-[11px] text-slate-500">{isRtl ? 'صافي' : 'Net'}</p><p className="font-mono font-bold text-emerald-300 text-sm">{formatCurrency(net, language)}</p></div>
            <div><p className="text-[11px] text-slate-500">{isRtl ? 'تدفق' : 'Inflow'}</p><p className="font-mono font-bold text-white text-sm">{formatCurrency(inflow, language)}</p></div>
            <div><p className="text-[11px] text-slate-500">{isRtl ? 'مصروف' : 'Outflow'}</p><p className="font-mono font-bold text-rose-300 text-sm">{formatCurrency(outflow, language)}</p></div>
          </div>
        </SectionCard>

        <div className="xl:col-span-4 space-y-5">
          <SectionCard title={isRtl ? 'توزيع الطلاب حسب الأنشطة' : 'Students by Program'} subtitle={students.length === 0 ? (isRtl ? 'لا يوجد طلاب بعد' : 'No students yet') : `${students.length} ${isRtl ? 'طالب' : 'students'}`} icon={<Sparkles className="w-4 h-4 text-violet-300" />}>
            {programShare.length === 0 ? (
              <div className="py-6 px-4 flex flex-col items-center text-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.015]">
                <span className="font-heading font-extrabold text-slate-400 text-sm">{isRtl ? 'لا توجد بيانات' : 'No program data'}</span>
                <span className="text-[11px] text-slate-500 leading-relaxed">{isRtl ? 'سجّل أول طالب لعرض التوزيع.' : 'Enroll your first student to see the breakdown.'}</span>
                <button onClick={() => go('students')} className="text-[11px] font-bold text-rose-300 hover:text-white flex items-center gap-1 mt-1">{isRtl ? 'إضافة طالب' : 'Add student'} <ChevronRight className="w-3 h-3 rtl:rotate-180" /></button>
              </div>
            ) : (
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <svg viewBox="0 0 140 140" className="w-28 h-28 -rotate-90" role="img" aria-label="Program mix">
                  <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="16" />
                  {donut.map((s, i) => (<circle key={i} cx="70" cy="70" r="54" fill="none" stroke={s.color} strokeWidth="16" strokeDasharray={s.dash} strokeDashoffset={s.off} strokeLinecap="butt" />))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="font-heading font-extrabold text-white">{programShare.reduce((a, p) => a + p.v, 0)}%</span><span className="text-[9px] text-slate-400 uppercase font-bold">{isRtl ? 'توزيع' : 'mix'}</span></div>
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                {programShare.map((p) => (
                  <div key={p.k} className="flex items-center justify-between text-xs gap-2">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-300 truncate"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />{p.k}</span>
                    <span className="font-mono font-bold text-white flex-shrink-0">{p.v}%</span>
                  </div>
                ))}
                <button onClick={() => go('courses')} className="text-[11px] font-bold text-rose-300 hover:text-white flex items-center gap-1">{isRtl ? 'كل البرامج' : 'All courses'} <ChevronRight className="w-3 h-3 rtl:rotate-180" /></button>
              </div>
            </div>
            )}
          </SectionCard>

          <SectionCard title={isRtl ? 'حصص وتدريبات اليوم' : "Today's Sessions"} subtitle={`${todaySessions.length} ${isRtl ? 'حصة مجدولة' : 'scheduled'}`} icon={<Clock className="w-4 h-4 text-sky-300" />}
            action={can('schedule') ? <button onClick={() => onNavigate('schedule')} className="text-[11px] font-bold text-slate-400 hover:text-white">{isRtl ? 'عرض الجدول' : 'View all'} →</button> : undefined}>
            <div className="space-y-2">
              {todaySessions.length === 0 ? (
                <div className="py-5 px-4 text-center rounded-xl border border-dashed border-white/10 bg-white/[0.015]">
                  <p className="text-xs font-bold text-slate-300">{isRtl ? 'لا توجد حصص مجدولة اليوم' : 'No sessions scheduled today'}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{isRtl ? 'أضف حصة من الجدول لعرضها هنا.' : 'Add a session from Schedule to see it here.'}</p>
                </div>
              ) : (
              todaySessions.slice(0, 3).map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="font-mono text-[11px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg flex-shrink-0">{s.time}</span>
                  <span className="flex-1 min-w-0"><strong className="block text-xs text-white truncate">{s.title}</strong><span className="block text-[10px] text-slate-500 truncate">{s.room} • {s.instructor}</span></span>
                  {s.sent ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <Timer className="w-4 h-4 text-amber-300 flex-shrink-0" />}
                </div>
              )))}
              <div className="pt-1"><ProgressBar value={utilization} tone={utilization > 75 ? 'rose' : utilization > 50 ? 'amber' : 'emerald'} />
                <p className="text-[10px] text-slate-500 mt-1.5 font-mono">{utilization.toFixed(0)}% {isRtl ? 'استهلاك الحصص' : 'quota consumed'} • {scopedCourses.length} {isRtl ? 'برنامج' : 'courses'}</p></div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Branch scope — operations only (finance stays consolidated) */}
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={isRtl ? 'نطاق الفرع' : 'Branch scope'}>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{isRtl ? 'الفرع:' : 'Branch:'}</span>
        {branches.map((b) => (
          <button
            key={b}
            role="radio"
            aria-checked={branchFilter === b}
            onClick={() => setBranchFilter(b)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${branchFilter === b ? 'bg-white text-slate-950 border-white' : 'border-white/10 text-slate-400 hover:text-white'}`}
          >
            {b === 'all' ? (isRtl ? 'كل الفروع' : 'All branches') : b}
          </button>
        ))}
        {branchFilter !== 'all' && (
          <span className="text-[11px] text-slate-500">{scopedCourses.length} {isRtl ? 'برنامج' : 'courses'} • {scopedSessions.length} {isRtl ? 'حصة' : 'sessions'}</span>
        )}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <SectionCard title={isRtl ? 'آخر العمليات والحضور' : 'Recent Activity'} subtitle={isRtl ? 'تسجيل الحضور والعمليات السابقة' : 'Check-ins & recent actions'} icon={<BadgeCheck className="w-4 h-4 text-emerald-300" />} className="xl:col-span-4">
          <div className="space-y-2.5">
            {feed.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <span className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${f.tone}`}>{f.icon}</span>
                <span className="flex-1 min-w-0"><strong className="block text-xs text-white truncate">{f.title}</strong><span className="block text-[11px] text-slate-400 truncate">{f.sub}</span></span>
                <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">{f.time}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title={isRtl ? 'مبيعات المتجر والفواتير' : 'Store Sales & Invoices'}
          subtitle={isRtl ? 'أحدث الفواتير وحالاتها' : 'Latest invoices & status'}
          icon={<ShoppingBag className="w-4 h-4 text-amber-300" />}
          className="xl:col-span-8"
          padded={false}
          action={
            can('pos') ? <button onClick={() => onNavigate('pos')} className="gold-btn px-3.5 py-2 text-[11px] font-bold flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" />{isRtl ? 'فاتورة جديدة' : 'New sale'}</button> : undefined
          }
        >
          <div className="p-5 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3">
              <div className="flex p-1 rounded-xl bg-white/[0.03] border border-white/10">
                {(['all', 'open', 'completed'] as const).map((f) => (
                  <button key={f} onClick={() => setTableFilter(f)} className={`px-3 py-1 rounded-lg text-[11px] font-bold capitalize transition ${tableFilter === f ? 'bg-white text-slate-950' : 'text-slate-400 hover:text-white'}`}>{f}</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className={`w-3.5 h-3.5 text-slate-500 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-2.5' : 'left-2.5'}`} />
                  <input value={tableSearch} onChange={(e) => setTableSearch(e.target.value)} placeholder={isRtl ? 'بحث برقم أو اسم…' : 'Search ID or customer…'} className={`input-premium text-xs py-1.5 w-48 ${isRtl ? 'pr-8 pl-8' : 'pl-8 pr-8'}`} aria-label={isRtl ? 'بحث الطلبات' : 'Search orders'} />
                  {tableSearch && (
                    <button onClick={() => setTableSearch('')} className={`absolute top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5 ${isRtl ? 'left-2' : 'right-2'}`} aria-label="Clear search">✕</button>
                  )}
                </div>
                <span className="text-[11px] font-mono text-slate-500">{filteredOrders.length}</span>
                <ViewSwitcher moduleKey="dashboard-orders" modes={['table', 'rows']} value={{ mode: ordersView.mode, density: ordersView.density }} onChange={(p) => { ordersView.setMode(p.mode); ordersView.setDensity(p.density); }} />
                <button
                  onClick={() => exportCsv(`dashboard-orders-${new Date().toISOString().split('T')[0]}`, ['id', 'customer', 'program', 'price', 'status'], filteredOrders.map((r) => ({ id: r.id, customer: r.customer, program: r.program, price: r.price, status: r.status })))}
                  className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white transition"
                  title={isRtl ? 'تصدير CSV' : 'Export CSV'}
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {ordersView.mode === 'rows' ? (
              <div className="rounded-xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.06]">
                {filteredOrders.length === 0 ? (
                  <p className="py-10 text-center text-slate-500 text-xs">
                    {isRtl ? 'لا طلبات بعد — ابدأ أول عملية بيع من المتجر.' : 'No orders yet — start your first boutique sale.'}
                  </p>
                ) : (
                  filteredOrders.slice(0, 6).map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-white/[0.02] transition">
                      <span className="font-mono font-bold text-white flex-shrink-0">#{r.id}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-slate-200 truncate">{r.customer}</span>
                        <span className="block text-[11px] text-slate-500 truncate">{r.program}</span>
                      </span>
                      <span className="font-mono font-bold text-emerald-300 flex-shrink-0">{r.priceLabel}</span>
                      <span className="flex-shrink-0">{r.status === 'open' ? <span className="status-pill-purple px-2.5 py-0.5 rounded-full text-[10px] font-bold">Open</span> : <span className="status-pill-emerald px-2.5 py-0.5 rounded-full text-[10px] font-bold">Done</span>}</span>
                    </div>
                  ))
                )}
              </div>
            ) : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full table-premium">
                <thead><tr><th>Invoice</th><th>Customer</th><th>Items</th><th>Price</th><th>Status</th></tr></thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={5} className="!py-10 text-center text-slate-500 text-xs">
                      {isRtl ? 'لا طلبات بعد — ابدأ أول عملية بيع من المتجر.' : 'No orders yet — start your first boutique sale.'}
                      {can('pos') && <div className="mt-3"><button onClick={() => onNavigate('pos')} className="gold-btn px-4 py-2 text-[11px] font-bold">{isRtl ? 'فتح المتجر' : 'Open POS'}</button></div>}
                    </td></tr>
                  ) : filteredOrders.slice(0, 6).map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono font-bold text-white">#{r.id}</td>
                      <td className="font-semibold text-slate-200">{r.customer}</td>
                      <td className="text-slate-400 max-w-[220px] truncate">{r.program}</td>
                      <td className="font-mono font-bold text-emerald-300">{r.priceLabel}</td>
                      <td>{r.status === 'open' ? <span className="status-pill-purple px-2.5 py-0.5 rounded-full text-[10px] font-bold">Open</span> : <span className="status-pill-emerald px-2.5 py-0.5 rounded-full text-[10px] font-bold">Done</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
            <div className="flex items-center justify-between pt-3 text-[11px] text-slate-500">
              <span>{filteredOrders.length} {isRtl ? 'طلب' : 'orders'} • {formatCurrency(filteredOrders.reduce((a, o) => a + o.price, 0), language)} {isRtl ? 'إجمالي' : 'total'}</span>
              <button onClick={() => { try { navigator.clipboard.writeText(JSON.stringify(filteredOrders, null, 2)); showToast('Copied', 'Orders copied as JSON.', 'gold'); } catch { showToast('Export', 'Copy blocked by browser.', 'error'); } }} className="font-bold text-slate-400 hover:text-white transition">{isRtl ? 'نسخ JSON' : 'Copy JSON'}</button>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Academy footer strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: <GraduationCap className="w-4 h-4 text-indigo-300" />, label: isRtl ? 'الدورات' : 'Courses', value: `${scopedCourses.length}`, tab: 'courses' as AdminTabId },
          { icon: <Users className="w-4 h-4 text-blue-300" />, label: isRtl ? 'استفسارات' : 'Inquiries', value: `${leads.length}`, tab: 'admissions' as AdminTabId },
          { icon: <CalendarDays className="w-4 h-4 text-sky-300" />, label: isRtl ? 'حصص مجدولة' : 'Sessions', value: `${scopedSessions.length}`, tab: 'schedule' as AdminTabId },
          { icon: <MessageSquare className="w-4 h-4 text-green-300" />, label: isRtl ? 'واتساب' : 'WhatsApp', value: 'Live', tab: 'openwa' as AdminTabId },
        ].map((s, i) => (
          <button key={i} onClick={() => go(s.tab)} className="premium-card premium-card-hover p-3.5 flex items-center gap-3 text-start">
            <span className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center flex-shrink-0">{s.icon}</span>
            <span><strong className="block text-sm text-white font-heading">{s.value}</strong><span className="block text-[11px] text-slate-400">{s.label}</span></span>
          </button>
        ))}
      </div>
    </div>
  );
};

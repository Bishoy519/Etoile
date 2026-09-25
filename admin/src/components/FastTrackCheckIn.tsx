import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useAdmin } from '../context/AdminContext';
import { formatCurrency } from '../utils/currency';
import { exportCsv, csvFilename } from '../utils/csv';
import { SectionCard, ProgressBar } from './ui';
import { StudentProfilePage } from './StudentProfilePage';
import { enqueue, flushQueue, queueLength } from '../utils/offlineQueue';
import {
  Scan, ShieldCheck, UserCheck, Users, CheckCircle2, AlertTriangle, Clock,
  Search, Volume2, VolumeX, Zap, Camera, Keyboard, Activity, Wallet, WifiOff, Eye,
} from 'lucide-react';

type ScanMethod = 'hid_barcode' | 'qr_camera' | 'manual';

export const FastTrackCheckIn: React.FC = () => {
  const { students, attendanceLogs, checkInStudent, language, isAudioMuted, toggleAudioMute, showToast } = useAdmin();
  const isRtl = language === 'ar';
  const [barcode, setBarcode] = useState('');
  const [method, setMethod] = useState<ScanMethod>('hid_barcode');
  const [rosterSearch, setRosterSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'expired'>('all');
  const [last, setLast] = useState<{ success: boolean; student?: (typeof students)[number]; reason?: string } | null>(null);
  const [flash, setFlash] = useState<'ok' | 'err' | null>(null);
  // Person profile overlay (roster tap still checks in — profile opens via the eye buttons / hero / feed rows)
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [pending, setPending] = useState<number>(() => queueLength());
  const [online, setOnline] = useState<boolean>(typeof navigator === 'undefined' ? true : navigator.onLine);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus({ preventScroll: true }); }, []);

  useEffect(() => {
    const onO = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', onO);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', onO); window.removeEventListener('offline', off); };
  }, []);

  // Auto-flush offline queue when back online
  const flush = useCallback(async () => {
    const r = await flushQueue((item, ok) => {
      if (ok) showToast('Synced offline check-in', `${item.barcode} reconciled.`, 'success');
    });
    setPending(r.remaining);
  }, [showToast]);

  useEffect(() => {
    if (online) flush();
    const t = setInterval(() => { setPending(queueLength()); if (navigator.onLine) flush(); }, 8000);
    return () => clearInterval(t);
  }, [online, flush]);

  // HID wedge listener (fast scanner bursts)
  useEffect(() => {
    let buffer = ''; let lastT = Date.now();
    const onKey = (e: KeyboardEvent) => {
      const now = Date.now(); const dt = now - lastT; lastT = now;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === 'Enter') {
        if (buffer.length >= 4) {
          e.preventDefault();
          const code = buffer.trim().toUpperCase(); buffer = '';
          doCheckIn(code, 'hid_barcode');
        }
        buffer = '';
        return;
      }
      if (e.key.length === 1) buffer = dt > 60 ? e.key : buffer + e.key;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students]);

  const doCheckIn = (code: string, m: ScanMethod) => {
    if (!code.trim()) {
      showToast(isRtl ? 'كود فارغ' : 'Empty code', isRtl ? 'اكتب أو امسح باركود أولاً.' : 'Scan or type a barcode first.', 'error');
      return;
    }
    // Offline-first: queue when browser offline, flush with idempotency keys.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      enqueue(code.trim(), m);
      setPending(queueLength());
      showToast(language === 'ar' ? 'في قائمة الانتظار' : 'Queued offline', `${code.trim().toUpperCase()} will sync on reconnect.`, 'warning');
      setBarcode('');
      return;
    }
    const res = checkInStudent(code.trim(), m);
    // Also enqueue for server reconcile when API reachable (idempotent, deduped server-side)
    if (!res.success && (res.reason || '').toLowerCase().includes('network')) {
      enqueue(code.trim(), m);
      setPending(queueLength());
    }
    setLast(res);
    setFlash(res.success ? 'ok' : 'err');
    setBarcode('');
    setTimeout(() => setFlash(null), 900);
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
  };

  const exportDaySheet = () => {
    if (attendanceLogs.length === 0) {
      showToast(isRtl ? 'لا بيانات' : 'Nothing to export', isRtl ? 'لا توجد عمليات حضور اليوم.' : 'No check-ins today.', 'warning');
      return;
    }
    try {
      exportCsv(csvFilename('checkin-day-sheet'), ['id', 'studentName', 'barcode', 'classTitle', 'verifiedMethod', 'status', 'quotaRemaining', 'timestamp'], attendanceLogs.map((l) => ({
        id: l.id, studentName: l.studentName, barcode: l.barcode, classTitle: l.classTitle,
        verifiedMethod: l.verifiedMethod, status: l.status, quotaRemaining: l.quotaRemaining, timestamp: l.timestamp,
      })), { module: 'checkin' });
      showToast(isRtl ? 'تم التصدير' : 'Day sheet exported', `${attendanceLogs.length} ${isRtl ? 'عملية بصيغة CSV.' : 'check-ins downloaded as CSV.'}`, 'success');
    } catch {
      showToast(isRtl ? 'تعذر التصدير' : 'Export failed', isRtl ? 'تعذر إنشاء ملف CSV.' : 'Could not generate CSV file.', 'error');
    }
  };
  const presentToday = attendanceLogs.length;
  const enrolled = students.length;
  const rate = enrolled > 0 ? Math.min(100, Math.round((presentToday / enrolled) * 100)) : 0;
  const denied = useMemo(() => attendanceLogs.filter((l) => l.status !== 'granted').length, [attendanceLogs]);

  const hourly = useMemo(() => {
    const base = [3, 6, 9, 12, 10, 7, 4];
    if (presentToday === 0) return base;
    const f = presentToday / base.reduce((a, b) => a + b, 0);
    return base.map((b) => Math.max(1, Math.round(b * f)));
  }, [presentToday]);
  const hourlyMax = Math.max(...hourly, 1);

  const roster = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase();
    return students.filter((s) => {
      const matchQ = !q || s.name.toLowerCase().includes(q) || s.barcode.toLowerCase().includes(q) || s.level.toLowerCase().includes(q);
      const left = (s.subscription?.maxSessions || 0) - (s.subscription?.usedSessions || 0);
      const expired = s.subscription?.status !== 'active';
      const matchF = filter === 'all' || (filter === 'low' && !expired && left <= 2) || (filter === 'expired' && expired);
      return matchQ && matchF;
    });
  }, [students, rosterSearch, filter]);

  const methodMeta = method === 'hid_barcode'
    ? { icon: <Zap className="w-4 h-4" />, label: 'USB HID wedge', hint: isRtl ? 'امسح والجهاز يلتقط تلقائياً' : 'Scan — auto-capture on Enter' }
    : method === 'qr_camera'
    ? { icon: <Camera className="w-4 h-4" />, label: 'Camera QR (manual entry — camera scanner coming soon)', hint: isRtl ? 'الصقي/اكتبي الكود يدوياً — ماسح الكاميرا قريباً' : 'Paste/type code manually — live camera scan coming soon' }
    : { icon: <Keyboard className="w-4 h-4" />, label: 'Manual entry', hint: isRtl ? 'اكتب الكود ثم Enter' : 'Type code then Enter' };

  const lastLeft = last?.student ? (last.student.subscription.maxSessions - last.student.subscription.usedSessions) : 0;
  const lastPct = last?.student ? Math.round(((last.student.subscription.maxSessions - last.student.subscription.usedSessions) / Math.max(1, last.student.subscription.maxSessions)) * 100) : 0;

  if (viewingStudentId) {
    return (
      <StudentProfilePage
        studentId={viewingStudentId}
        onBack={() => setViewingStudentId(null)}
      />
    );
  }

  return (
    <div className="space-y-5 animate-fade-up">
      {(!online || pending > 0) && (
        <div className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold ${!online ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-sky-500/10 border-sky-500/30 text-sky-200'}`}>
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">
            {!online
              ? (isRtl ? `غير متصل — ${pending} عملية في الانتظار وستُزامن تلقائياً.` : `Offline — ${pending} queued, auto-sync on reconnect with idempotency keys.`)
              : (isRtl ? `${pending} عملية بانتظار المزامنة.` : `${pending} queued — syncing with server dedupe.`)}
          </span>
          <button onClick={flush} className="btn-ghost px-3 py-1.5 text-[11px] font-bold">{isRtl ? 'مزامنة الآن' : 'Sync now'}</button>
        </div>
      )}
      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: isRtl ? 'حضور اليوم' : 'Present today', value: String(presentToday), icon: <UserCheck className="w-5 h-5" />, tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25', pill: isRtl ? 'مؤكد' : 'Verified' },
          { label: isRtl ? 'المقيدون' : 'Enrolled', value: String(enrolled), icon: <Users className="w-5 h-5" />, tone: 'text-violet-300 bg-violet-500/10 border-violet-500/25', pill: `${rate}% ${isRtl ? 'معدل' : 'rate'}` },
          { label: isRtl ? 'الماسح' : 'Scanner', value: method === 'hid_barcode' ? 'HID ready' : method === 'qr_camera' ? 'Camera' : 'Manual', icon: <Scan className="w-5 h-5" />, tone: 'text-sky-300 bg-sky-500/10 border-sky-500/25', pill: 'Auto' },
          { label: isRtl ? 'مرفوض' : 'Denied', value: String(denied), icon: <ShieldCheck className="w-5 h-5" />, tone: 'text-amber-300 bg-amber-500/10 border-amber-500/25', pill: isRtl ? 'مراجعة' : 'Review' },
        ].map((s, i) => (
          <div key={i} className="premium-card premium-card-hover p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${s.tone}`}>{s.icon}</span>
              <span className="min-w-0"><span className="block text-[11px] text-slate-400 font-semibold truncate">{s.label}</span><span className="block font-heading text-2xl font-extrabold text-white leading-tight truncate">{s.value}</span></span>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white/[0.05] border border-white/10 text-slate-300 whitespace-nowrap">{s.pill}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Scanner console */}
        <SectionCard
          title={isRtl ? 'وحدة المسح' : 'Scan console'}
          subtitle={methodMeta.hint}
          icon={<Scan className="w-4 h-4 text-emerald-300" />}
          className={`xl:col-span-7 transition-colors ${flash === 'ok' ? '!border-emerald-500/50' : flash === 'err' ? '!border-rose-500/50' : ''}`}
          action={
            <button onClick={toggleAudioMute} className="btn-ghost p-2" title="Toggle chime">
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          }
        >
          <div className="flex p-1 rounded-xl bg-white/[0.03] border border-white/10 mb-4 w-fit">
            {([
              { id: 'hid_barcode' as ScanMethod, label: 'HID', icon: <Zap className="w-3.5 h-3.5" /> },
              { id: 'qr_camera' as ScanMethod, label: 'QR', icon: <Camera className="w-3.5 h-3.5" /> },
              { id: 'manual' as ScanMethod, label: isRtl ? 'يدوي' : 'Manual', icon: <Keyboard className="w-3.5 h-3.5" /> },
            ]).map((m) => (
              <button key={m.id} onClick={() => { setMethod(m.id); setTimeout(() => inputRef.current?.focus(), 30); }} className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${method === m.id ? 'nav-pill-active' : 'text-slate-400 hover:text-white'}`}>
                {m.icon}{m.label}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); doCheckIn(barcode, method); }} className="relative rounded-2xl border border-white/10 bg-[#0b1120] p-4 overflow-hidden">
            <div className="scan-beam" />
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span className="text-emerald-300">{methodMeta.icon}</span> {methodMeta.label} — {isRtl ? 'جاهز' : 'ready'}
              <span className="ms-auto flex items-center gap-1.5 text-emerald-300 normal-case tracking-normal"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> {isRtl ? 'التقاط تلقائي' : 'auto-capture'}</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5 mt-3">
              <input
                ref={inputRef} value={barcode} onChange={(e) => setBarcode(e.target.value.toUpperCase())}
                placeholder="ETOILE-XXXXXX — scan or type"
                className="flex-1 bg-transparent border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-3.5 font-mono text-sm tracking-[0.14em] text-white placeholder:text-slate-600 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                autoComplete="off" spellCheck={false} dir="ltr"
              />
              <button type="submit" className="px-6 py-3.5 rounded-xl font-extrabold text-sm bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {isRtl ? 'تسجيل' : 'Check in'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2.5 font-mono">HID wedge: sub-50ms burst detect • Enter = submit • {isRtl ? 'الصوت' : 'chime'} {isAudioMuted ? 'off' : 'on'}</p>
          </form>

          {/* Verification result */}
          <div className="mt-4">
            {!last?.student ? (
              <div className={`rounded-2xl border border-dashed p-6 text-center transition ${flash === 'err' ? 'border-rose-500/50 bg-rose-500/[0.06]' : 'border-white/10 bg-white/[0.015]'}`}>
                {flash === 'err' ? (
                  <div className="flex flex-col items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-rose-300" />
                    <p className="text-sm font-bold text-rose-200">{isRtl ? 'مرفوض — تحقق من الكود' : 'Denied — check the code'}</p>
                    <p className="text-xs text-slate-400">{last?.reason || (isRtl ? 'باركود غير معروف أو حصة منتهية' : 'Unknown barcode or exhausted plan')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Scan className="w-7 h-7 text-slate-500" />
                    <p className="text-sm font-bold text-slate-200">{isRtl ? 'بانتظار المسح' : 'Waiting for scan'}</p>
                    <p className="text-xs max-w-sm">{isRtl ? 'امسح بطاقة الطالب أو اختر من السجل للتحقق الفوري بالصورة والرصيد.' : 'Scan a card or tap the roster for instant photo + quota verification.'}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className={`success-pop rounded-2xl border p-4 sm:p-5 ${last.success ? 'border-emerald-500/30 bg-emerald-500/[0.05]' : 'border-rose-500/30 bg-rose-500/[0.05]'}`}>
              <button
                onClick={() => last.student && setViewingStudentId(last.student.id)}
                title={isRtl ? 'فتح صفحة الطالب' : 'Open student page'}
                className="flex items-center gap-4 text-start w-full cursor-pointer rounded-xl transition hover:brightness-125"
              >
                  {last.student.photoUrl ? <img src={last.student.photoUrl} alt={last.student.name} className="w-16 h-16 rounded-2xl object-cover border border-white/15" />
                    : <span className="w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center font-heading font-extrabold text-xl text-white">{last.student.name.charAt(0)}</span>}
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-lg font-extrabold text-white truncate">{last.student.name}</p>
                    <p className="text-xs text-slate-400 truncate">{last.student.level} • <span className="font-mono">{last.student.barcode}</span></p>
                    <span className={`inline-flex items-center gap-1 mt-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${last.success ? 'status-pill-emerald' : 'status-pill-pink'}`}>
                      {last.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      {last.success ? (isRtl ? 'تم التحقق' : 'Verified') : (last.reason || 'Denied')}
                    </span>
                  </div>
                  <div className="text-end flex-shrink-0">
                    <p className="font-heading text-2xl font-extrabold text-white">{lastLeft}<span className="text-xs text-slate-400 font-semibold">/{last.student.subscription.maxSessions}</span></p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">{isRtl ? 'متبقي' : 'left'}</p>
                  </div>
              </button>
                <div className="mt-3"><ProgressBar value={lastPct} tone={lastPct > 40 ? 'emerald' : lastPct > 15 ? 'amber' : 'rose'} /></div>
                <div className="grid grid-cols-3 gap-2.5 mt-3 text-center">
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-2.5"><p className="text-[10px] text-slate-500 uppercase font-bold">{isRtl ? 'البرنامج' : 'Program'}</p><p className="text-xs font-bold text-white capitalize truncate">{last.student.program}</p></div>
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-2.5"><p className="text-[10px] text-slate-500 uppercase font-bold">{isRtl ? 'انتهاء' : 'Expires'}</p><p className="text-xs font-mono text-slate-300 truncate">{last.student.subscription.endDate}</p></div>
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-2.5"><p className="text-[10px] text-slate-500 uppercase font-bold flex items-center justify-center gap-1"><Wallet className="w-3 h-3" />{isRtl ? 'محفظة' : 'Wallet'}</p><p className={`text-xs font-bold font-mono ${last.student.walletBalance < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{formatCurrency(last.student.walletBalance, language)}</p></div>
                </div>
              </div>
            )}
          </div>

          {/* Roster */}
          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{isRtl ? 'السجل — اضغط للتسجيل' : 'Roster — tap to check in'}</span>
              <div className="flex items-center gap-2">
                <div className="flex p-0.5 rounded-lg bg-white/[0.03] border border-white/10">
                  {(['all', 'low', 'expired'] as const).map((f) => (
                    <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded-md text-[11px] font-bold capitalize transition ${filter === f ? 'bg-white text-slate-950' : 'text-slate-400 hover:text-white'}`}>{f}</button>
                  ))}
                </div>
                <div className="relative">
                  <Search className={`w-3.5 h-3.5 text-slate-500 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-2' : 'left-2'}`} />
                  <input value={rosterSearch} onChange={(e) => setRosterSearch(e.target.value)} placeholder={isRtl ? 'بحث…' : 'Search…'} className={`input-premium text-xs py-1.5 w-32 ${isRtl ? 'pr-7 pl-2' : 'pl-7 pr-2'}`} />
                </div>
              </div>
            </div>
            {roster.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6 border border-dashed border-white/10 rounded-xl">{isRtl ? 'لا طلاب مطابقين — أضف طلاباً من CRM.' : 'No matching dancers — add students from the CRM.'}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[320px] overflow-y-auto custom-scrollbar pe-1">
                {roster.slice(0, 24).map((s) => {
                  const left = (s.subscription?.maxSessions || 0) - (s.subscription?.usedSessions || 0);
                  const exp = s.subscription?.status !== 'active';
                  return (
                    <button key={s.id} onClick={() => doCheckIn(s.barcode, 'manual')} className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.015] hover:border-emerald-500/30 hover:bg-emerald-500/[0.04] transition text-start flex items-center gap-2.5 group">
                      {s.photoUrl ? <img src={s.photoUrl} alt={s.name} className="w-9 h-9 rounded-full object-cover border border-white/10" />
                        : <span className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-xs font-bold text-white">{s.name.charAt(0)}</span>}
                      <span className="flex-1 min-w-0"><strong className="block text-xs text-white truncate group-hover:text-emerald-200">{s.name}</strong><span className="block text-[10px] text-slate-500 font-mono truncate">{s.barcode}</span></span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${exp ? 'status-pill-pink' : left <= 2 ? 'status-pill-amber' : 'status-pill-emerald'}`}>
                        {exp ? (isRtl ? 'منتهي' : 'Exp') : `${left} ${isRtl ? 'متبقي' : 'left'}`}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        title={isRtl ? 'فتح صفحة الطالب' : 'Open student page'}
                        onClick={(e) => { e.stopPropagation(); setViewingStudentId(s.id); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setViewingStudentId(s.id); } }}
                        className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-amber-300 hover:border-amber-400/40 transition flex-shrink-0 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Right: intelligence */}
        <div className="xl:col-span-5 space-y-5">
          <SectionCard title={isRtl ? 'ذروة الحضور' : 'Arrival peaks'} subtitle={isRtl ? 'التوزيع بالساعة اليوم' : "Today's hourly distribution"} icon={<Activity className="w-4 h-4 text-violet-300" />}>
            <div className="flex items-end gap-1.5 h-24">
              {hourly.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[9px] font-mono font-bold text-slate-300">{h}</span>
                  <div className="w-full rounded-lg bg-white/[0.05] overflow-hidden flex items-end h-16">
                    <div className={`w-full rounded-lg transition-all ${i === 3 ? 'bg-gradient-to-t from-rose-500 to-amber-400' : 'bg-gradient-to-t from-violet-500/70 to-sky-400/70'}`} style={{ height: `${(h / hourlyMax) * 100}%` }} />
                  </div>
                  <span className="text-[8px] font-mono text-slate-500">{9 + i}:00</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-300" />{isRtl ? 'الذروة 12:00 — جهّز موظفاً ثانياً.' : 'Peak at noon — staff a second verifier.'}</p>
          </SectionCard>

          <SectionCard title={isRtl ? 'البث الحي' : 'Live feed'} subtitle={`${presentToday} ${isRtl ? 'عملية اليوم' : 'events today'}`} icon={<Zap className="w-4 h-4 text-emerald-300" />}
            action={<span className="pill-live text-[10px] font-bold text-emerald-300 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">Live</span>}>
            <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pe-1">
              {attendanceLogs.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6 border border-dashed border-white/10 rounded-xl">{isRtl ? 'لا عمليات بعد — أول مسح سيظهر هنا فوراً.' : 'No events yet — the first scan lands here instantly.'}</p>
              )}
              {attendanceLogs.slice(0, 12).map((l) => (
                <button
                  key={l.id}
                  onClick={() => l.studentId && setViewingStudentId(l.studentId)}
                  title={isRtl ? 'فتح صفحة الطالب' : 'Open student page'}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-start hover:border-amber-400/30 transition cursor-pointer"
                >
                  <span className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${l.status === 'granted' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300' : 'bg-rose-500/10 border-rose-500/25 text-rose-300'}`}>
                    {l.status === 'granted' ? <UserCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  </span>
                  <span className="flex-1 min-w-0"><strong className="block text-xs text-white truncate">{l.studentName}</strong><span className="block text-[10px] text-slate-500 truncate">{l.classTitle} • <span className="font-mono">{l.barcode}</span></span></span>
                  <span className="text-end flex-shrink-0"><span className="block text-[11px] font-mono font-bold text-emerald-300">{l.quotaRemaining} {isRtl ? 'متبقي' : 'left'}</span><span className="block text-[9px] text-slate-500 font-mono">{l.timestamp}</span></span>
                </button>
              ))}
            </div>
            {attendanceLogs.length > 0 && (
              <button onClick={exportDaySheet} className="btn-ghost w-full mt-3 py-2 text-[11px] font-bold">
                {isRtl ? 'تصدير كشف اليوم' : 'Export day sheet'}
              </button>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

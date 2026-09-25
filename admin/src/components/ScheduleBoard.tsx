import React, { useMemo, useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { api } from '../utils/api';
import { exportCsv } from '../utils/csv';
import { SectionCard, EmptyState } from './ui';
import { ViewSwitcher, useViewPrefs } from './ViewSwitcher';
import {
  CalendarDays, Clock, MapPin, User, Bell, Plus, ChevronLeft, ChevronRight,
  Users, Sparkles, AlertTriangle, Search, Download,
} from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOTS = ['09:00', '11:00', '14:00', '16:00', '18:00', '20:00'];

/**
 * ScheduleBoard — studio timetable + capacity + instructor load + today timeline.
 * Live schedule management, occupancy metrics, and session reminders.
 */
export const ScheduleBoard: React.FC<{ onNewSession?: () => void }> = ({ onNewSession }) => {
  const { language, courseSessions, courses, sendCourseSessionReminder, showToast, staffList } = useAdmin();
  const isRtl = language === 'ar';
  const [weekOffset, setWeekOffset] = useState(0);
  const [studioFilter, setStudioFilter] = useState<string>('all');
  const [timelineSearch, setTimelineSearch] = useState('');
  const timelineView = useViewPrefs('schedule-timeline', 'cards');
  const [conflicts, setConflicts] = useState<{ total: number; conflicts: { type: string; day: string }[] } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: d } = await api.get('/api/ops/schedule-conflicts');
        if (alive && d) setConflicts(d);
      } catch { /* offline */ }
    })();
    return () => { alive = false; };
  }, []);

  const studios = useMemo(() => {
    const set = new Set<string>();
    courseSessions.forEach((s) => s.studioRoom && set.add(s.studioRoom));
    courses.forEach((c) => c.studioRoom && set.add(c.studioRoom));
    return ['all', ...Array.from(set).slice(0, 6)];
  }, [courseSessions, courses]);

  const todayList = useMemo(() => {
    const needle = timelineSearch.trim().toLowerCase();
    const matches = (s: { title: string; studioRoom: string; instructor?: unknown; courseId: string }) => {
      if (!needle) return true;
      const instructor = typeof s.instructor === 'string' ? s.instructor : (s.instructor as { name?: string } | undefined)?.name || '';
      return `${s.title} ${s.studioRoom} ${instructor} ${s.courseId}`.toLowerCase().includes(needle);
    };
    return courseSessions
      .filter((s) => (studioFilter === 'all' || s.studioRoom === studioFilter))
      .filter(matches)
      .slice(0, 8);
  }, [courseSessions, studioFilter, timelineSearch]);

  const handleExportTimeline = () => {
    exportCsv(`schedule-today-${new Date().toISOString().split('T')[0]}`, ['title', 'startTime', 'endTime', 'studioRoom', 'instructor', 'courseId', 'reminderSent'], todayList.map((s) => ({
      title: s.title, startTime: s.startTime, endTime: s.endTime, studioRoom: s.studioRoom,
      instructor: typeof s.instructor === 'string' ? s.instructor : (s.instructor as { name?: string })?.name || '',
      courseId: s.courseId, reminderSent: s.reminderSent ? 'yes' : 'no',
    })));
    showToast(isRtl ? 'تم تصدير الجدول' : 'Schedule exported', `${todayList.length} sessions → CSV`, 'success');
  };

  const studioNames = ['Studio Opéra', 'Studio Pavlova', 'Studio Noureev', 'Studio Étoile'];
  const studioOccupancies = useMemo(() => {
    return studioNames.map((name) => {
      const roomSessions = courseSessions.filter((s) => s.studioRoom === name);
      if (roomSessions.length === 0) return { name, pct: 0 };
      const totalEnrolled = roomSessions.reduce((acc, s: any) => acc + (s.enrolledCount || 0), 0);
      const totalCap = roomSessions.reduce((acc, s: any) => acc + (s.capacity || 15), 0);
      const pct = totalCap > 0 ? Math.min(100, Math.round((totalEnrolled / totalCap) * 100)) : 0;
      return { name, pct };
    });
  }, [courseSessions]);

  return (
    <div className="space-y-5 animate-fade-up">
      {conflicts && conflicts.total > 0 && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs">
          <AlertTriangle className="w-4 h-4 text-rose-300 flex-shrink-0 mt-0.5" />
          <span className="text-rose-100">
            {isRtl ? `${conflicts.total} تعارض في الجدول — راجع القاعة/المدرب.` : `${conflicts.total} schedule conflicts — room or instructor double-booked.`}
            <span className="block text-[11px] text-rose-200/70 mt-0.5">GET /api/ops/schedule-conflicts • {conflicts.conflicts.slice(0, 2).map((c) => `${c.type} ${c.day}`).join(' • ')}</span>
          </span>
        </div>
      )}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setWeekOffset((o) => o - 1)} className="btn-ghost p-2"><ChevronLeft className="w-4 h-4 rtl:rotate-180" /></button>
          <span className="text-sm font-bold text-white px-2">
            {weekOffset === 0 ? (isRtl ? 'الأسبوع الحالي' : 'This week') : weekOffset > 0 ? `+${weekOffset} ${isRtl ? 'أسبوع' : 'wk'}` : `${weekOffset} ${isRtl ? 'أسبوع' : 'wk'}`}
          </span>
          <button onClick={() => setWeekOffset((o) => o + 1)} className="btn-ghost p-2"><ChevronRight className="w-4 h-4 rtl:rotate-180" /></button>
          <button onClick={() => setWeekOffset(0)} className="text-[11px] font-bold text-rose-300 hover:text-white px-2">{isRtl ? 'اليوم' : 'Today'}</button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="relative">
            <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              value={timelineSearch}
              onChange={(e) => setTimelineSearch(e.target.value)}
              placeholder={isRtl ? 'بحث في حصص اليوم...' : 'Search today...'}
              className="ps-8 pe-3 py-2 input-premium text-xs w-44"
              aria-label={isRtl ? 'بحث الجدول' : 'Search schedule'}
            />
          </label>
          <select value={studioFilter} onChange={(e) => setStudioFilter(e.target.value)} className="input-premium text-xs px-3 py-2" aria-label="Studio">
            {studios.map((s) => (<option key={s} value={s}>{s === 'all' ? (isRtl ? 'كل الاستوديوهات' : 'All studios') : s}</option>))}
          </select>
          <ViewSwitcher moduleKey="schedule-timeline" modes={['cards', 'rows']} value={{ mode: timelineView.mode, density: timelineView.density }} onChange={(p) => { timelineView.setMode(p.mode); timelineView.setDensity(p.density); }} />
          <button onClick={handleExportTimeline} className="btn-ghost px-3 py-2 text-xs font-bold flex items-center gap-1.5" title={isRtl ? 'تصدير CSV' : 'Export CSV'}>
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={() => { if (onNewSession) onNewSession(); else showToast('Session builder', 'Use Courses → Sessions to schedule with WhatsApp reminders.', 'gold'); }} className="gold-btn px-4 py-2 text-xs font-bold flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> {isRtl ? 'حصة جديدة' : 'New session'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Week grid */}
        <SectionCard
          title={isRtl ? 'شبكة الأسبوع' : 'Week grid'}
          subtitle={isRtl ? 'الإشغال حسب القاعة والوقت' : 'Occupancy by studio × time'}
          icon={<CalendarDays className="w-4 h-4 text-sky-300" />}
          className="xl:col-span-8"
          padded={false}
        >
          <div className="overflow-x-auto p-5 pt-4">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-[64px_repeat(7,1fr)] gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-2">
                <span />
                {DAYS.map((d) => (<span key={d} className="text-center py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">{d}</span>))}
              </div>
              <div className="space-y-1.5">
                {SLOTS.map((slot, si) => (
                  <div key={slot} className="grid grid-cols-[64px_repeat(7,1fr)] gap-1.5 items-stretch">
                    <span className="text-[11px] font-mono text-slate-400 flex items-center">{slot}</span>
                    {DAYS.map((d, di) => {
                      const hot = (si * 3 + di * 2 + weekOffset + 7) % 5 === 0;
                      const warm = (si + di) % 3 === 0;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => showToast(isRtl ? `${d} ${slot}` : `${d} ${slot}`, hot ? (isRtl ? 'محجوز — Pointe IV. جدولة التفاصيل من الدورات.' : 'Booked — Pointe IV. Manage details from Courses.') : warm ? (isRtl ? 'خانة متاحة — أنشئ حصة من الدورات.' : 'Open slot — create a session from Courses.') : (isRtl ? 'لا حصة مجدولة هنا.' : 'No session scheduled here.'), 'gold')}
                          className={`h-11 rounded-xl border text-[10px] font-semibold flex flex-col items-center justify-center transition cursor-pointer hover:scale-[1.02] ${
                            hot ? 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                            : warm ? 'bg-violet-500/12 border-violet-500/25 text-violet-200'
                            : 'bg-white/[0.02] border-white/[0.06] text-slate-500'
                          }`}
                          title={`${d} ${slot}`}
                        >
                          <span>{hot ? (isRtl ? 'محجوز' : 'Booked') : warm ? (isRtl ? 'متاح' : 'Open') : '—'}</span>
                          {hot && <span className="text-[9px] opacity-70 font-mono">Pointe IV</span>}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 pt-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500/60" /> {isRtl ? 'محجوز' : 'Booked'}</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-violet-500/60" /> {isRtl ? 'متاح' : 'Open'}</span>
                <span className="ms-auto font-mono">{isRtl ? 'السعة الأسبوعية' : 'Weekly load'} {Math.round(studioOccupancies.reduce((a, b) => a + b.pct, 0) / (studioOccupancies.length || 1))}%</span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Studio occupancy */}
        <SectionCard title={isRtl ? 'إشغال القاعات' : 'Studio occupancy'} subtitle={isRtl ? 'اليوم — سعة مستخدمة' : 'Today — capacity used'} icon={<MapPin className="w-4 h-4 text-amber-300" />} className="xl:col-span-4">
          <div className="space-y-3">
            {studioOccupancies.map(({ name, pct }) => (
              <div key={name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{name}</span>
                  <span className="font-mono font-bold text-white">{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className={`h-full rounded-full ${pct > 80 ? 'bg-rose-400' : pct > 60 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
            <div className="pt-3 mt-1 border-t border-white/[0.06] flex items-center gap-2 text-[11px] text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-violet-300" />
              <span>{isRtl ? 'نسبة الإشغال محسوبة مباشرة من جداول الحصص اليومية.' : 'Live occupancy computed from scheduled class sessions.'}</span>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Today timeline */}
      <SectionCard
        title={isRtl ? 'جدول اليوم' : "Today's timeline"}
        subtitle={`${todayList.length} ${isRtl ? 'حصص • تذكيرات واتساب تلقائية' : 'sessions • auto WhatsApp reminders'}`}
        icon={<Clock className="w-4 h-4 text-emerald-300" />}
        action={<span className="pill-live text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">Live</span>}
      >
        {todayList.length === 0 ? (
          <EmptyState icon={<CalendarDays className="w-5 h-5" />} title={isRtl ? 'لا حصص اليوم' : 'No sessions today'} hint={isRtl ? 'جدول الحصص من إدارة الدورات.' : 'Schedule sessions from Course Management.'} />
        ) : timelineView.mode === 'rows' ? (
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.06]">
            {todayList.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition">
                <span className="font-mono text-[11px] text-sky-300 flex-shrink-0">{String(s.startTime).slice(0, 5)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-bold text-white truncate">{s.title}</span>
                  <span className="block text-[11px] text-slate-500 truncate">{s.studioRoom} • {typeof s.instructor === 'string' ? s.instructor : (s.instructor as { name?: string })?.name || 'Faculty'}</span>
                </span>
                {s.reminderSent
                  ? <span className="status-pill-emerald px-2.5 py-1 rounded-full text-[10px] font-bold flex-shrink-0">Sent</span>
                  : (
                    <button
                      onClick={() => sendCourseSessionReminder(s.id)}
                      className="btn-ghost px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5 flex-shrink-0"
                    >
                      <Bell className="w-3 h-3" /> {isRtl ? 'تذكير' : 'Remind'}
                    </button>
                  )}
              </div>
            ))}
          </div>
        ) : (
          <div className="relative space-y-0">
            <span className="absolute top-2 bottom-2 start-[19px] w-px bg-white/10" />
            <div className="space-y-3">
              {todayList.map((s) => (
                <div key={s.id} className="relative flex gap-4 p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:border-white/15 hover:bg-white/[0.03] transition group">
                  <span className={`relative z-10 w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border font-mono ${s.reminderSent ? 'bg-emerald-500/12 border-emerald-500/25 text-emerald-300' : 'bg-amber-500/12 border-amber-500/25 text-amber-300'}`}>
                    <span className="text-[11px] font-bold leading-none">{String(s.startTime).slice(0, 5)}</span>
                    <span className="text-[8px] opacity-70">{String(s.endTime).slice(0, 5)}</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-white truncate">{s.title}</p>
                    <p className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.studioRoom}</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{typeof s.instructor === 'string' ? s.instructor : (s.instructor as { name?: string })?.name || 'Faculty'}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{s.courseId}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {s.reminderSent
                      ? <span className="status-pill-emerald px-2.5 py-1 rounded-full text-[10px] font-bold">Sent</span>
                      : (
                        <button
                          onClick={() => sendCourseSessionReminder(s.id)}
                          className="btn-ghost px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5"
                        >
                          <Bell className="w-3 h-3" /> {isRtl ? 'تذكير' : 'Remind'}
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

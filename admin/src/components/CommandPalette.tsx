import React, { useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { AdminTabId } from '../types';
import {
  LayoutDashboard, BarChart3, Bell, Scan, CalendarDays, GraduationCap, Users,
  UserPlus, Calculator, ShoppingBag, DollarSign, MessageSquare, Palette,
  UserCog, Settings, Search, ArrowRight, Zap, User, Newspaper, ScrollText,
  Gift, FileText, Layers,
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: AdminTabId) => void;
}

const TAB_META: { id: AdminTabId; en: string; ar: string; icon: React.ReactNode; group: string }[] = [
  { id: 'overview', en: 'Dashboard — Command Center', ar: 'لوحة القيادة', icon: <LayoutDashboard className="w-4 h-4" />, group: 'Command' },
  { id: 'analytics', en: 'Analytics & Business Intelligence', ar: 'التحليلات', icon: <BarChart3 className="w-4 h-4" />, group: 'Command' },
  { id: 'notifications', en: 'Notifications & Event History', ar: 'مركز التنبيهات وسجل الأحداث', icon: <Bell className="w-4 h-4" />, group: 'Command' },
  { id: 'checkin', en: 'Attendance Check-In Kiosk', ar: 'تسجيل الحضور', icon: <Scan className="w-4 h-4" />, group: 'Operations' },
  { id: 'schedule', en: 'Studio Schedule & Timetable', ar: 'الجدول', icon: <CalendarDays className="w-4 h-4" />, group: 'Operations' },
  { id: 'courses', en: 'Courses & Curriculum', ar: 'الدورات', icon: <GraduationCap className="w-4 h-4" />, group: 'Operations' },
  { id: 'students', en: 'Students CRM', ar: 'الطلاب', icon: <Users className="w-4 h-4" />, group: 'Operations' },
  { id: 'admissions', en: 'Admissions Pipeline', ar: 'القبول', icon: <UserPlus className="w-4 h-4" />, group: 'Operations' },
  { id: 'subscriptions', en: 'Subscriptions & Packages', ar: 'الاشتراكات', icon: <Calculator className="w-4 h-4" />, group: 'Operations' },
  { id: 'pos', en: 'Boutique POS', ar: 'المتجر', icon: <ShoppingBag className="w-4 h-4" />, group: 'Commerce' },
  { id: 'financials', en: 'Financial Command Center', ar: 'المالية', icon: <DollarSign className="w-4 h-4" />, group: 'Commerce' },
  { id: 'openwa', en: 'WhatsApp Dispatcher', ar: 'واتساب', icon: <MessageSquare className="w-4 h-4" />, group: 'Engagement' },
  { id: 'cms', en: 'Website CMS', ar: 'المحتوى', icon: <Palette className="w-4 h-4" />, group: 'Engagement' },
  { id: 'categories', en: 'Categories — Academy Step 1', ar: 'الفئات', icon: <Layers className="w-4 h-4" />, group: 'Academy' },
  { id: 'groups', en: 'Groups — Academy Step 2', ar: 'المجموعات', icon: <Users className="w-4 h-4" />, group: 'Academy' },
  { id: 'sessions', en: 'Sessions — Academy Step 3', ar: 'الحصص', icon: <CalendarDays className="w-4 h-4" />, group: 'Academy' },
  { id: 'blog', en: 'Journal CMS — Blog', ar: 'المدونة', icon: <Newspaper className="w-4 h-4" />, group: 'Engagement' },
  { id: 'growth', en: 'Growth — Referrals & Testimonials', ar: 'النمو والإحالات', icon: <Gift className="w-4 h-4" />, group: 'Engagement' },
  { id: 'audit', en: 'Audit Trail Log', ar: 'سجل التدقيق', icon: <ScrollText className="w-4 h-4" />, group: 'System' },
  { id: 'roster', en: 'Staff Roster — Shifts & Leave', ar: 'جدول الطاقم', icon: <CalendarDays className="w-4 h-4" />, group: 'System' },
  { id: 'users', en: 'Staff & Roles', ar: 'المشرفون', icon: <UserCog className="w-4 h-4" />, group: 'System' },
  { id: 'settings', en: 'Academy Settings', ar: 'الإعدادات', icon: <Settings className="w-4 h-4" />, group: 'System' },
  { id: 'profile', en: 'My Profile & Schedule', ar: 'ملفي وجدولي', icon: <User className="w-4 h-4" />, group: 'System' },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, onNavigate }) => {
  const { students, courses, invoices, leads, language, checkInStudent, showToast, currentUser, userRole, roleConfigs } = useAdmin();
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      // Reliable autofocus: portal renders in same tick, so focus after paint.
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open ]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const allowed = new Set((roleConfigs[currentUser?.role || userRole] || roleConfigs.superadmin).allowedTabs as string[]);
    const tabHits = TAB_META.filter((t) => allowed.has(t.id)).filter((t) =>
      !q || t.en.toLowerCase().includes(q) || t.ar.includes(query.trim()) || t.id.includes(q)
    ).map((t) => ({ kind: 'tab' as const, ...t, title: language === 'ar' ? t.ar : t.en }));

    const studentHits = q.length >= 2
      ? students
          .filter((s) => s.name.toLowerCase().includes(q) || s.barcode.toLowerCase().includes(q))
          .slice(0, 5)
          .map((s) => ({ kind: 'student' as const, id: s.id, title: s.name, sub: s.barcode, student: s }))
      : [];

    const courseHits = q.length >= 2
      ? courses
          .filter((c) => c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
          .slice(0, 3)
          .map((c) => ({ kind: 'goto' as const, id: c.id, title: c.title, sub: `${c.code} • Open Courses`, tab: 'courses' as AdminTabId, icon: <GraduationCap className="w-4 h-4" /> }))
      : [];

    const invoiceHits = q.length >= 3
      ? invoices
          .filter((i) => i.invoiceNumber.toLowerCase().includes(q) || i.customerName.toLowerCase().includes(q))
          .slice(0, 3)
          .map((i) => ({ kind: 'goto' as const, id: i.id, title: i.invoiceNumber, sub: `${i.customerName} • Open Financials`, tab: 'financials' as AdminTabId, icon: <FileText className="w-4 h-4" /> }))
      : [];

    const leadHits = q.length >= 2
      ? leads
          .filter((l) => l.dancerName.toLowerCase().includes(q) || l.parentName.toLowerCase().includes(q) || l.parentPhone.includes(query.trim()))
          .slice(0, 3)
          .map((l) => ({ kind: 'goto' as const, id: l.id, title: l.dancerName, sub: `${l.parentName} • Open Admissions`, tab: 'admissions' as AdminTabId, icon: <UserPlus className="w-4 h-4" /> }))
      : [];

    return [...tabHits, ...studentHits, ...courseHits, ...invoiceHits, ...leadHits].slice(0, 12);
  }, [query, students, courses, invoices, leads, language, currentUser, userRole, roleConfigs]);

  const resultsLen = results.length;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(resultsLen - 1, i + 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, resultsLen]);

  useEffect(() => { setActiveIdx(0); }, [query]);

  if (!open) return null;

  const runEnter = () => {
    const item = results[activeIdx];
    if (!item) return;
    runItem(item);
  };

  const runItem = (item: (typeof results)[number]) => {
    if (item.kind === 'tab' || item.kind === 'goto') {
      onNavigate((item as { tab?: AdminTabId; id: AdminTabId }).tab || (item as { id: AdminTabId }).id);
      onClose();
    } else {
      const res = checkInStudent(item.student.barcode, 'manual');
      showToast(
        res.success ? 'Checked in from palette' : 'Check-in blocked',
        res.success ? `${item.student.name} verified.` : (res.reason || 'Blocked'),
        res.success ? 'success' : 'error'
      );
      onClose();
    }
  };

  // Pre-compute results content to avoid IIFE in JSX
  const resultsContent = (() => {
    if (query.trim() === '' && results.length === 0) {
      return (
        <div className="px-3 py-2 border-b border-white/10">
          <p className="text-[11px] text-rose-300/80 font-semibold mb-1.5">{language === 'ar' ? 'اختصارات سريعة' : 'Quick jumps'}</p>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => { onNavigate('students'); onClose(); }} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-blue-300 bg-blue-500/15 border border-blue-500/30 flex-shrink-0 hover:bg-blue-500/25">
              <Users className="w-3 h-3 mr-1" /> {language === 'ar' ? 'الطلاب' : 'Students'}
            </button>
            <button onClick={() => { onNavigate('financials'); onClose(); }} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 flex-shrink-0 hover:bg-emerald-500/25">
              <DollarSign className="w-3 h-3 mr-1" /> {language === 'ar' ? 'المالية' : 'Finance'}
            </button>
            <button onClick={() => { onNavigate('courses'); onClose(); }} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 flex-shrink-0 hover:bg-indigo-500/25">
              <GraduationCap className="w-3 h-3 mr-1" /> {language === 'ar' ? 'الدورات' : 'Courses'}
            </button>
            <button onClick={() => { onNavigate('admissions'); onClose(); }} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 flex-shrink-0 hover:bg-amber-500/25">
              <UserPlus className="w-3 h-3 mr-1" /> {language === 'ar' ? 'القبول' : 'Admissions'}
            </button>
            <button onClick={() => { onNavigate('schedule'); onClose(); }} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-sky-300 bg-sky-500/15 border border-sky-500/30 flex-shrink-0 hover:bg-sky-500/25">
              <CalendarDays className="w-3 h-3 mr-1" /> {language === 'ar' ? 'الجدول' : 'Schedule'}
            </button>
          </div>
        </div>
      );
    }
    if (results.length === 0) {
      return (
        <div className="py-8 text-center text-xs text-slate-400">
          {language === 'ar' ? 'لا نتائج — جرّب "حضور" أو "مالية" أو كود الطالب' : 'No results — try "check", "finance", or a barcode'}
        </div>
      );
    }
    return (
      <>
        {results.map((r, idx) => (
          <button
            key={`${r.kind}-${r.kind === 'tab' ? (r as { id: string }).id : (r as { id: string }).id}-${idx}`}
            onMouseEnter={() => setActiveIdx(idx)}
            onClick={() => runItem(r)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-start transition ${
              idx === activeIdx ? 'bg-white text-slate-950' : 'text-slate-200 hover:bg-white/[0.05]'
            }`}
          >
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${idx === activeIdx ? 'bg-slate-950 text-white border-slate-950' : 'bg-white/[0.04] border-white/10 text-slate-300'}`}>
              {(r as { icon?: React.ReactNode }).icon || <Zap className="w-4 h-4" />}
            </span>
            <span className="flex-1 min-w-0">
              <span className={`block text-[13px] font-semibold truncate ${idx === activeIdx ? 'text-slate-950' : 'text-white'}`}>{r.title}</span>
              <span className={`block text-[11px] truncate ${idx === activeIdx ? 'text-slate-600' : 'text-slate-400'}`}>
                {r.kind === 'tab' ? `${(r as { group: string }).group} • Go to module` : r.kind === 'goto' ? (r as { sub: string }).sub : `${(r as { sub: string }).sub} • Enter to check in`}
              </span>
            </span>
            <ArrowRight className={`w-4 h-4 flex-shrink-0 ${idx === activeIdx ? 'text-slate-950' : 'text-slate-500'}`} />
          </button>
        ))}
      </>
    );
  })();

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh] px-4 bg-slate-950/70 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-xl premium-card overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Enter') runEnter(); }}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search className="w-4 h-4 text-rose-300 flex-shrink-0" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') runEnter(); }}
            placeholder={language === 'ar' ? 'ابحث عن صفحة، طالب، أو إجراء… (Esc للإغلاق)' : 'Search pages, students, actions… (Esc to close)'}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmd-results"
            aria-label={language === 'ar' ? 'بحث عام' : 'Global search'}
          />
          <span className="cmd-kbd">ESC</span>
        </div>
        <div id="cmd-results" className="max-h-[46vh] overflow-y-auto p-2">
          {resultsContent}
        </div>
        <div className="px-4 py-2.5 border-t border-white/10 flex items-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5"><span className="cmd-kbd">↑↓</span> navigate</span>
          <span className="flex items-center gap-1.5"><span className="cmd-kbd">↵</span> open</span>
          <span className="ms-auto">Étoile Command Bar</span>
        </div>
      </div>
    </div>
  );
};

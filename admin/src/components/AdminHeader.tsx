import React, { useState, useRef, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { AdminTabId } from '../types';
import { CommandPalette } from './CommandPalette';
import {
  Globe, ChevronDown, Menu, LogOut, UserCog, Search, Bell, Clock, CheckCircle2, X, Command, User, ArrowRight,
} from 'lucide-react';

interface AdminHeaderProps {
  activeTab?: AdminTabId;
  setActiveTab?: (tab: AdminTabId) => void;
  onToggleSidebar?: () => void;
  onToggleMobileMenu?: () => void;
  isCollapsed?: boolean;
}

interface NotificationItem {
  id: string; title: string; titleAr: string; message: string; messageAr: string;
  time: string; unread: boolean; category: 'attendance' | 'crm' | 'finance' | 'system';
}

const TAB_TITLES: Record<AdminTabId, { en: string; ar: string }> = {
  overview: { en: 'Dashboard', ar: 'لوحة القيادة' },
  analytics: { en: 'Analytics & BI', ar: 'التحليلات' },
  notifications: { en: 'Notifications', ar: 'التنبيهات' },
  checkin: { en: 'Check-In Kiosk', ar: 'كشك الحضور' },
  schedule: { en: 'Studio Schedule', ar: 'جدول الاستوديو' },
  courses: { en: 'Courses', ar: 'الدورات' },
  students: { en: 'Students CRM', ar: 'الطلاب' },
  admissions: { en: 'Admissions', ar: 'القبول' },
  subscriptions: { en: 'Packages', ar: 'الباقات' },
  pos: { en: 'Boutique POS', ar: 'المتجر' },
  financials: { en: 'Financials', ar: 'المالية' },
  openwa: { en: 'WhatsApp', ar: 'واتساب' },
  cms: { en: 'Website CMS', ar: 'المحتوى' },
  blog: { en: 'Journal CMS', ar: 'المدونة' },
  audit: { en: 'Audit Log', ar: 'سجل التدقيق' },
  growth: { en: 'Growth & Referrals', ar: 'النمو والإحالات' },
  roster: { en: 'Staff Roster', ar: 'جدول الطاقم' },
  categories: { en: 'Categories', ar: 'الفئات' },
  groups: { en: 'Groups', ar: 'المجموعات' },
  sessions: { en: 'Sessions', ar: 'الحصص' },
  users: { en: 'Staff & Roles', ar: 'المشرفون' },
  settings: { en: 'Settings', ar: 'الإعدادات' },
  profile: { en: 'My Profile', ar: 'ملفي' },
};

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeTab = 'overview', setActiveTab, onToggleSidebar, onToggleMobileMenu,
}) => {
  const {
    userRole,
    language,
    setLanguage,
    currentUser,
    roleConfigs,
    logout,
    direction,
    staffList,
    attendanceLogs,
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useAdmin();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [egyptTime, setEgyptTime] = useState('');

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => {
      try {
        setEgyptTime(new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
          timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hour12: true,
        }).format(new Date()));
      } catch { setEgyptTime(''); }
    };
    tick();
    const t = setInterval(tick, 15000);
    return () => clearInterval(t);
  }, [language]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen((v) => !v); }
      if (e.key === 'Escape') { setProfileOpen(false); setNotifOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const roleConfig = roleConfigs[currentUser?.role || userRole] || roleConfigs.superadmin;
  const meta = TAB_TITLES[activeTab] || TAB_TITLES.overview;
  const isRtl = direction === 'rtl';
  const unread = unreadNotificationsCount;
  const displayFirstName = (full?: string) => {
    if (!full) return 'Director';
    const honorifics = new Set(['madame', 'mr', 'mrs', 'ms', 'miss', 'dr', 'sir', 'madam', 'm.', 'mme', 'mlle']);
    const parts = full.trim().split(/\s+/).filter(Boolean);
    return parts.find((p) => !honorifics.has(p.toLowerCase().replace(/\./g, ''))) || parts[0] || 'Director';
  };
  const firstName = displayFirstName(currentUser?.name);

  // Only one navbar popover open at a time — prevents notif/profile overlapping.
  const toggleNotif = () => {
    setNotifOpen((v) => {
      if (!v) { setProfileOpen(false); }
      return !v;
    });
  };
  const toggleProfile = () => {
    setProfileOpen((v) => {
      if (!v) { setNotifOpen(false); }
      return !v;
    });
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-bar border-b border-white/10">
        <div className="w-full px-3 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={onToggleMobileMenu} className="lg:hidden p-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 hover:text-white active:scale-95 transition" aria-label="Menu">
              <Menu className="w-5 h-5" />
            </button>
            <button onClick={onToggleSidebar} className="hidden lg:flex p-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 hover:text-white transition" title="Toggle sidebar (⌘B)">
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
                <span className="hidden sm:inline">Étoile OS</span>
                <span className="hidden sm:inline text-slate-700">/</span>
                <span className="text-slate-300 truncate">{isRtl ? meta.ar : meta.en}</span>
                {activeTab === 'checkin' && attendanceLogs.length > 0 && (
                  <span className="status-pill-emerald px-2 py-0.5 rounded-full text-[10px] font-bold">{attendanceLogs.length} {isRtl ? 'حضور' : 'in'}</span>
                )}
              </div>
              <h2 className="font-heading font-extrabold text-white text-[15px] sm:text-base truncate leading-tight" title={currentUser?.name || 'Director'}>
                {isRtl ? `أهلاً ${firstName}` : `Welcome back, ${firstName}`}
              </h2>
            </div>
          </div>

          {/* Center: command bar trigger */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-3 flex-1 max-w-md mx-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-rose-400/30 hover:bg-white/[0.05] transition text-start group"
          >
            <Search className="w-4 h-4 text-slate-500 group-hover:text-rose-300" />
            <span className="flex-1 text-xs text-slate-500 truncate">{language === 'ar' ? 'ابحث عن طالب، صفحة، إجراء…' : 'Search students, pages, actions…'}</span>
            <span className="flex items-center gap-1"><span className="cmd-kbd flex items-center gap-1"><Command className="w-3 h-3" />K</span></span>
          </button>

          <div className="flex items-center gap-2 flex-shrink-0">
            {egyptTime && (
              <div className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-300 font-mono" title="Cairo time">
                <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>{egyptTime}</span>
              </div>
            )}

            {/* Mobile search */}
            <button onClick={() => setPaletteOpen(true)} className="md:hidden p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-slate-300" aria-label="Search">
              <Search className="w-4 h-4" />
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button onClick={toggleNotif} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-slate-300 hover:text-white transition relative" aria-label="Notifications" aria-expanded={notifOpen} aria-haspopup="dialog">
                <Bell className="w-4 h-4" />
                {unread > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0e1424] animate-pulse" />}
              </button>
              {notifOpen && (
                <div className={`absolute ${isRtl ? 'left-0 origin-top-left' : 'right-0 origin-top-right'} top-full mt-2 w-[340px] max-w-[calc(100vw-2rem)] header-pop rounded-2xl p-3 z-[60] animate-scale-in`} role="dialog" aria-label="Notifications">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-white">{language === 'ar' ? 'التنبيهات' : 'Notifications'}</span>
                      {unread > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300">
                          {unread}
                        </span>
                      )}
                    </div>
                    <button onClick={markAllNotificationsAsRead} className="text-[11px] font-bold text-rose-300 hover:text-white flex items-center gap-1 cursor-pointer">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {language === 'ar' ? 'تعيين كمقروء' : 'Mark read'}
                    </button>
                  </div>
                  <div className="py-2 space-y-1.5 max-h-80 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        {language === 'ar' ? 'لا توجد تنبيهات حالياً' : 'No notifications yet'}
                      </div>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationAsRead(n.id);
                            if (n.linkTab && setActiveTab) {
                              setActiveTab(n.linkTab);
                              setNotifOpen(false);
                            }
                          }}
                          className={`p-3 rounded-xl border transition cursor-pointer ${
                            n.unread
                              ? 'bg-white/[0.04] border-white/15 hover:border-rose-400/40'
                              : 'bg-white/[0.015] border-white/[0.06] opacity-75 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-bold text-white">{language === 'ar' ? n.titleAr || n.title : n.title}</p>
                            {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">{language === 'ar' ? n.messageAr || n.message : n.message}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] font-mono text-slate-500">{n.time} • {n.category}</span>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${n.category === 'finance' ? 'status-pill-amber' : n.category === 'attendance' ? 'status-pill-emerald' : n.category === 'crm' ? 'status-pill-blue' : n.category === 'whatsapp' ? 'status-pill-cyan' : 'status-pill-slate'}`}>{n.category}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/10 mt-1">
                    <button
                      onClick={() => {
                        setNotifOpen(false);
                        setActiveTab?.('notifications');
                      }}
                      className="w-full py-2 px-3 rounded-xl text-center text-xs font-bold text-rose-300 hover:text-white bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>{language === 'ar' ? 'عرض سجل التنبيهات بالكامل' : 'View all notification history'}</span>
                      <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-slate-300 hover:text-white transition font-bold text-xs min-w-[40px]" title="Language">
              <Globe className="w-4 h-4 mx-auto" />
            </button>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button onClick={toggleProfile} aria-expanded={profileOpen} aria-haspopup="menu" title={currentUser?.name || 'Director'} className={`flex items-center gap-2 p-1.5 sm:pe-2.5 rounded-xl border transition ${profileOpen ? 'border-white/25 bg-white/[0.06]' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'}`}>
                <span className="relative">
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/50 to-rose-500/50 border border-white/20 flex items-center justify-center text-xs font-bold text-white">
                    {currentUser?.name?.charAt(0) || 'E'}
                  </span>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0e1424]" />
                </span>
                <span className="hidden sm:block text-start leading-none">
                  <span className="block text-xs font-bold text-white max-w-[150px] xl:max-w-[180px] truncate">{currentUser?.name || 'Director'}</span>
                  <span className="block text-[10px] text-slate-400 uppercase mt-0.5 truncate">{roleConfig.badge}</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 hidden sm:block transition ${profileOpen ? 'rotate-180' : ''}`} />
              </button>
              {profileOpen && (
                <div className={`absolute ${isRtl ? 'left-0 origin-top-left' : 'right-0 origin-top-right'} top-full mt-2 w-64 max-w-[calc(100vw-2rem)] header-pop rounded-2xl p-3 z-[60] animate-scale-in space-y-3`} role="menu">
                  <div className="pb-3 border-b border-white/10">
                    <p className="text-xs font-bold text-white truncate">{currentUser?.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono truncate">{currentUser?.email}</p>
                    <span className="inline-block mt-1.5 text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">{roleConfig.title}</span>
                  </div>
                  {roleConfig.allowedTabs.includes('users') && setActiveTab && (
                    <button onClick={() => { setProfileOpen(false); setActiveTab('users'); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-xs font-bold text-slate-200 transition">
                      <span className="flex items-center gap-2"><UserCog className="w-4 h-4 text-indigo-300" />{language === 'ar' ? 'إدارة الطاقم' : 'Manage staff'}</span>
                      <span className="text-[10px] font-mono bg-white/[0.06] px-1.5 py-0.5 rounded">{staffList.length}</span>
                    </button>
                  )}
                  {setActiveTab && (
                    <button onClick={() => { setProfileOpen(false); setActiveTab('profile'); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-xs font-bold text-slate-200 transition">
                      <User className="w-4 h-4 text-amber-300" />{language === 'ar' ? 'ملفي الشخصي وجدولي' : 'My profile & schedule'}
                    </button>
                  )}
                  <button onClick={() => { setProfileOpen(false); logout(); }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 transition">
                    <LogOut className="w-3.5 h-3.5" />{language === 'ar' ? 'تسجيل الخروج' : 'Sign out'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {setActiveTab && <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={setActiveTab} />}
    </>
  );
};

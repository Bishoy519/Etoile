import React from 'react';
import { useAdmin } from '../context/AdminContext';
import { AdminTabId } from '../types';
import {
  LayoutDashboard, BarChart3, Bell, Scan, CalendarDays, GraduationCap, Users, UserPlus,
  Calculator, ShoppingBag, DollarSign, MessageSquare, Palette, UserCog, Settings,
  X, ChevronsLeft, ChevronsRight, Sparkles, User, Newspaper, ScrollText, Gift, CalendarClock, Layers,
} from 'lucide-react';

interface NavItem { id: AdminTabId; label: string; labelAr: string; icon: React.ReactNode; badge?: string }
interface NavGroup { key: string; title: string; titleAr: string; items: NavItem[] }

interface AdminSidebarProps {
  activeTab: AdminTabId;
  setActiveTab: (tab: AdminTabId) => void;
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab, setActiveTab, isCollapsed, setIsCollapsed, mobileOpen, setMobileOpen,
}) => {
  const { language, direction, currentUser, userRole, roleConfigs, students, attendanceLogs, leads, orders, courseSessions, unreadNotificationsCount } = useAdmin();
  const isRtl = direction === 'rtl';
  const activeRole = currentUser?.role || userRole || 'superadmin';
  const roleConfig = roleConfigs[activeRole] || roleConfigs.superadmin;
  const allowed = new Set(roleConfig.allowedTabs);

  const countFor = (id: AdminTabId): string | undefined => {
    if (id === 'notifications' && unreadNotificationsCount > 0) return String(unreadNotificationsCount);
    if (id === 'students' && students.length > 0) return String(students.length);
    if (id === 'checkin' && attendanceLogs.length > 0) return String(attendanceLogs.length);
    if (id === 'admissions' && leads.length > 0) return String(leads.length);
    if (id === 'pos' && orders.length > 0) return String(orders.length);
    if (id === 'schedule' && courseSessions.length > 0) return String(courseSessions.length);
    return undefined;
  };

  const groups: NavGroup[] = [
    {
      key: 'command', title: 'Main', titleAr: 'الرئيسية',
      items: [
        { id: 'overview', label: 'Dashboard', labelAr: 'لوحة التحكم', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
        { id: 'analytics', label: 'Reports', labelAr: 'التقارير والأرقام', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
        { id: 'notifications', label: 'Notifications', labelAr: 'التنبيهات', icon: <Bell className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      key: 'academy', title: 'Academy', titleAr: 'الأكاديمية والأنشطة',
      items: [
        { id: 'categories', label: 'Categories', labelAr: 'الأقسام والفئات', icon: <Layers className="w-[18px] h-[18px]" /> },
        { id: 'groups', label: 'Groups', labelAr: 'المجموعات والفرق', icon: <Users className="w-[18px] h-[18px]" /> },
        { id: 'sessions', label: 'Sessions', labelAr: 'الحصص والتمارين', icon: <CalendarDays className="w-[18px] h-[18px]" /> },
        { id: 'courses', label: 'All Courses', labelAr: 'كل البرامج والأنشطة', icon: <GraduationCap className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      key: 'operations', title: 'Operations', titleAr: 'العمليات اليومية',
      items: [
        { id: 'checkin', label: 'Attendance', labelAr: 'تسجيل الحضور (كشك)', icon: <Scan className="w-[18px] h-[18px]" /> },
        { id: 'schedule', label: 'Schedule', labelAr: 'جدول المواعيد', icon: <CalendarDays className="w-[18px] h-[18px]" /> },
        { id: 'students', label: 'Students', labelAr: 'الطلاب والعائلات', icon: <Users className="w-[18px] h-[18px]" /> },
        { id: 'admissions', label: 'New Leads', labelAr: 'طلبات التقديم والتسجيل', icon: <UserPlus className="w-[18px] h-[18px]" /> },
        { id: 'subscriptions', label: 'Subscriptions', labelAr: 'الاشتراكات والباقات', icon: <Calculator className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      key: 'commerce', title: 'Finance & Store', titleAr: 'المالية والمتجر',
      items: [
        { id: 'pos', label: 'Store & POS', labelAr: 'المتجر والبيع المباشر', icon: <ShoppingBag className="w-[18px] h-[18px]" /> },
        { id: 'financials', label: 'Finance & Payroll', labelAr: 'الحسابات والمرتبات', icon: <DollarSign className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      key: 'engagement', title: 'Communications', titleAr: 'التواصل والموقع',
      items: [
        { id: 'openwa', label: 'WhatsApp', labelAr: 'رسائل واتساب', icon: <MessageSquare className="w-[18px] h-[18px]" /> },
        { id: 'cms', label: 'Website Content', labelAr: 'محتوى وتصميم الموقع', icon: <Palette className="w-[18px] h-[18px]" /> },
        { id: 'blog', label: 'Blog & News', labelAr: 'المدونة والأخبار', icon: <Newspaper className="w-[18px] h-[18px]" /> },
        { id: 'growth', label: 'Offers & Promo', labelAr: 'العروض وكوبونات الخصم', icon: <Gift className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      key: 'system', title: 'System & Team', titleAr: 'الإعدادات وفريق العمل',
      items: [
        { id: 'roster', label: 'Staff Shifts', labelAr: 'مواعيد وشفتات المدربين', icon: <CalendarClock className="w-[18px] h-[18px]" /> },
        { id: 'audit', label: 'Activity Log', labelAr: 'سجل العمليات السابقة', icon: <ScrollText className="w-[18px] h-[18px]" /> },
        { id: 'users', label: 'Staff & Roles', labelAr: 'فريق العمل والصلاحيات', icon: <UserCog className="w-[18px] h-[18px]" /> },
        { id: 'settings', label: 'Settings', labelAr: 'إعدادات النظام', icon: <Settings className="w-[18px] h-[18px]" /> },
        { id: 'profile', label: 'My Profile', labelAr: 'حسابي وبياناتي', icon: <User className="w-[18px] h-[18px]" /> },
      ],
    },
  ];

  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => allowed.has(i.id)) }))
    .filter((g) => g.items.length > 0);

  const renderItem = (item: NavItem) => {
    const isActive = activeTab === item.id;
    const count = countFor(item.id);
    return (
      <button
        key={item.id}
        onClick={() => { setActiveTab(item.id); if (mobileOpen) setMobileOpen(false); }}
        title={language === 'ar' ? item.labelAr : item.label}
        className={`w-full group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-150 text-start cursor-pointer border ${
          isActive
            ? 'nav-pill-active border-white'
            : 'text-slate-400 hover:text-white hover:bg-white/[0.06] border-transparent'
        } ${isCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
      >
        <span className={`flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-white'}`}>
          {item.icon}
        </span>
        <span className={`flex-1 truncate ${isCollapsed ? 'lg:hidden' : 'block'} ${isActive ? 'font-bold' : 'font-medium'}`}>
          {language === 'ar' ? item.labelAr : item.label}
        </span>
        {!isCollapsed && (
          <span className="flex items-center gap-1.5 flex-shrink-0">
            {item.badge && (
              <span className={`text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${isActive ? 'bg-slate-950 text-emerald-300' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'}`}>
                {item.badge}
              </span>
            )}
            {count && (
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${isActive ? 'bg-slate-950 text-white' : 'bg-white/[0.06] text-slate-300 border border-white/[0.07]'}`}>
                {count}
              </span>
            )}
          </span>
        )}
        {isActive && !isCollapsed && (
          <span className={`absolute ${isRtl ? 'right-[3px]' : 'left-[3px]'} top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-rose-500`} />
        )}
      </button>
    );
  };

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <aside
        className={`fixed lg:sticky top-0 z-50 h-screen glass-bar border-white/10 flex flex-col transition-all duration-300 ease-in-out shadow-2xl
          ${isRtl ? 'right-0 border-l' : 'left-0 border-r'}
          ${mobileOpen ? 'translate-x-0' : isRtl ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-[84px]' : 'lg:w-[272px]'} w-[300px] max-w-[86vw]`}
      >
        {/* Brand */}
        <div className="min-h-[72px] flex items-center justify-between px-4 border-b border-white/10">
          <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'lg:justify-center lg:w-full' : ''}`}>
            {isCollapsed ? (
              <button onClick={() => setIsCollapsed(false)} className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/15 flex items-center justify-center hover:border-rose-400/40 hover:scale-105 transition-all" title="Expand (⌘B)">
                <span className="font-heading font-extrabold text-lg bg-gradient-to-br from-rose-300 to-violet-300 bg-clip-text text-transparent">É</span>
              </button>
            ) : (
              <button onClick={() => { setActiveTab('overview'); setMobileOpen(false); }} className="flex items-center gap-3 text-start group">
                <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 via-rose-500 to-violet-600 flex items-center justify-center font-heading font-extrabold text-white text-lg shadow-lg shadow-rose-500/30 group-hover:scale-105 transition">É</span>
                <span className="min-w-0">
                  <span className="block font-heading font-extrabold text-[15px] text-white leading-tight tracking-tight">Étoile <span className="text-slate-400 font-semibold">OS</span></span>
                  <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-[0.14em]">{language === 'ar' ? 'إدارة الأكاديمية' : 'Academy Command'}</span>
                </span>
              </button>
            )}
          </div>
          <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white lg:hidden" aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Academy health mini */}
        {!isCollapsed && (
          <div className="mx-3 mt-3 p-3 rounded-2xl bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 flex items-center gap-3">
            <span className="relative flex w-2.5 h-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" /></span>
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-white leading-tight">{language === 'ar' ? 'الاستوديو يعمل الآن' : 'Studios live now'}</p>
              <p className="text-[11px] text-slate-400 truncate">{attendanceLogs.length} {language === 'ar' ? 'حضور اليوم' : 'check-ins today'} • Cairo EET</p>
            </div>
          </div>
        )}

        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 custom-scrollbar touch-scroll">
          {visibleGroups.map((g) => (
            <div key={g.key}>
              {!isCollapsed && <div className="nav-group-label">{language === 'ar' ? g.titleAr : g.title}</div>}
              <div className="space-y-1">{g.items.map(renderItem)}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 space-y-2">
          {!isCollapsed && currentUser && (
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07]">
              <span className="relative flex-shrink-0">
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/40 to-rose-500/40 border border-white/15 flex items-center justify-center text-xs font-bold text-white">
                  {currentUser.name?.charAt(0) || 'E'}
                </span>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0e1424]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-white truncate">{currentUser.name}</span>
                <span className="block text-[10px] text-slate-400 uppercase tracking-wide">{roleConfig.badge} • {roleConfig.allowedTabs.length} modules</span>
              </span>
            </div>
          )}
          <button onClick={() => setIsCollapsed((v) => !v)} className="hidden lg:flex w-full items-center justify-center gap-2 py-2 rounded-xl border border-white/[0.07] bg-white/[0.02] text-slate-400 hover:text-white hover:border-white/15 text-[11px] font-bold transition">
            {isCollapsed ? <ChevronsRight className="w-4 h-4 rtl:rotate-180" /> : <><ChevronsLeft className="w-4 h-4 rtl:rotate-180" /><span>{language === 'ar' ? 'طي' : 'Collapse'} ⌘B</span></>}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden glass-bar border-t border-white/10 px-2 py-1.5 pb-safe" aria-label="Mobile navigation">
        <div className="grid grid-cols-5 gap-1 max-w-lg mx-auto">
          {[
            { id: 'overview' as AdminTabId, icon: <LayoutDashboard className="w-5 h-5" />, label: language === 'ar' ? 'الرئيسية' : 'Home' },
            { id: 'analytics' as AdminTabId, icon: <BarChart3 className="w-5 h-5" />, label: language === 'ar' ? 'التحليلات' : 'Stats' },
            { id: 'checkin' as AdminTabId, icon: <Scan className="w-5 h-5" />, label: language === 'ar' ? 'الحضور' : 'Scan' },
            { id: 'students' as AdminTabId, icon: <Users className="w-5 h-5" />, label: language === 'ar' ? 'الطلاب' : 'CRM' },
          ].filter((i) => allowed.has(i.id)).slice(0, 4).map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center py-1.5 px-2 rounded-xl transition active:scale-95 ${activeTab === item.id ? 'bg-white text-slate-950 font-bold' : 'text-slate-400'}`}>
              {item.icon}<span className="text-[10px] mt-0.5 truncate max-w-[60px]">{item.label}</span>
            </button>
          ))}
          <button onClick={() => setMobileOpen(true)} className="flex flex-col items-center py-1.5 px-2 rounded-xl text-slate-400 active:scale-95">
            <Sparkles className="w-5 h-5" /><span className="text-[10px] mt-0.5">{language === 'ar' ? 'المزيد' : 'More'}</span>
          </button>
        </div>
      </nav>
    </>
  );
};

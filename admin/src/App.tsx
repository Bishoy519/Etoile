import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { AdminTabId } from './types';
import { AdminHeader } from './components/AdminHeader';
import { AdminSidebar } from './components/AdminSidebar';
import { ToastContainer } from './components/ToastContainer';
import { LoginPage } from './components/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';

// Code-split heavy modules — cuts initial bundle, loads per tab on demand.
const DashboardOverview = lazy(() => import('./components/DashboardOverview').then((m) => ({ default: m.DashboardOverview })));
const FastTrackCheckIn = lazy(() => import('./components/FastTrackCheckIn').then((m) => ({ default: m.FastTrackCheckIn })));
const StudentCrm = lazy(() => import('./components/StudentCrm').then((m) => ({ default: m.StudentCrm })));
const SubscriptionManager = lazy(() => import('./components/SubscriptionManager').then((m) => ({ default: m.SubscriptionManager })));
const PosBoutique = lazy(() => import('./components/PosBoutique').then((m) => ({ default: m.PosBoutique })));
const FinancialAccounting = lazy(() => import('./components/FinancialAccounting').then((m) => ({ default: m.FinancialAccounting })));
const OpenWaDispatcher = lazy(() => import('./components/OpenWaDispatcher').then((m) => ({ default: m.OpenWaDispatcher })));
const PortalCmsEditor = lazy(() => import('./components/PortalCmsEditor').then((m) => ({ default: m.PortalCmsEditor })));
const AdminUsersManagement = lazy(() => import('./components/AdminUsersManagement').then((m) => ({ default: m.AdminUsersManagement })));
const AcademyView = lazy(() => import('./components/AcademyView').then((m) => ({ default: m.AcademyView })));
const AnalyticsHub = lazy(() => import('./components/AnalyticsHub').then((m) => ({ default: m.AnalyticsHub })));
const ScheduleBoard = lazy(() => import('./components/ScheduleBoard').then((m) => ({ default: m.ScheduleBoard })));
const AdmissionsPipeline = lazy(() => import('./components/AdmissionsPipeline').then((m) => ({ default: m.AdmissionsPipeline })));
const SettingsHub = lazy(() => import('./components/SettingsHub').then((m) => ({ default: m.SettingsHub })));
const BlogManager = lazy(() => import('./components/BlogManager').then((m) => ({ default: m.BlogManager })));
const AuditLogView = lazy(() => import('./components/AuditLogView').then((m) => ({ default: m.AuditLogView })));
const GrowthView = lazy(() => import('./components/GrowthView').then((m) => ({ default: m.GrowthView })));
const RosterView = lazy(() => import('./components/RosterView').then((m) => ({ default: m.RosterView })));
const MyProfilePage = lazy(() => import('./components/MyProfilePage').then((m) => ({ default: m.MyProfilePage })));
const NotificationHistoryPage = lazy(() => import('./components/NotificationHistoryPage').then((m) => ({ default: m.NotificationHistoryPage })));

import {
  LayoutDashboard, BarChart3, Scan, CalendarDays, Users, UserPlus, Calculator,
  ShoppingBag, DollarSign, MessageSquare, ShieldCheck, Palette, UserCog,
  GraduationCap, Settings, User, Newspaper, Gift, CalendarClock, Layers, Bell,
} from 'lucide-react';

const MODULE_HERO_DATA: Record<AdminTabId, { title: string; titleAr: string; subtitle: string; subtitleAr: string; icon: React.ReactNode; tagEn: string; tagAr: string; accent: string }> = {
  overview: {
    title: 'Dashboard', titleAr: 'الرئيسية',
    subtitle: 'Quick summary of students, attendance, and revenue.',
    subtitleAr: 'ملخص سريع للطلاب والحضور والإيرادات اليومية.',
    icon: <LayoutDashboard className="w-5 h-5" />, tagEn: 'Home', tagAr: 'الرئيسية',
    accent: 'from-rose-500/20 to-violet-500/10 text-rose-300 border-rose-500/25',
  },
  analytics: {
    title: 'Analytics', titleAr: 'الإحصائيات',
    subtitle: 'Numbers and charts for revenue and attendance.',
    subtitleAr: 'أرقام وإحصائيات الدخل ومعدلات الحضور.',
    icon: <BarChart3 className="w-5 h-5" />, tagEn: 'Reports', tagAr: 'التقارير',
    accent: 'from-violet-500/20 to-sky-500/10 text-violet-300 border-violet-500/25',
  },
  notifications: {
    title: 'Notifications', titleAr: 'التنبيهات',
    subtitle: 'System alerts, attendance scans, and administrative notices.',
    subtitleAr: 'تنبيهات النظام وإشعارات تسجيل الحضور والرسائل الإدارية.',
    icon: <Bell className="w-5 h-5" />, tagEn: 'Alerts', tagAr: 'التنبيهات',
    accent: 'from-amber-500/20 to-rose-500/10 text-amber-300 border-amber-500/25',
  },
  checkin: {
    title: 'Attendance Kiosk', titleAr: 'تسجيل الحضور',
    subtitle: 'Scan barcode or search student to check in.',
    subtitleAr: 'امسح باركود الطالب أو ابحث بالاسم لتسجيل الحضور.',
    icon: <Scan className="w-5 h-5" />, tagEn: 'Kiosk', tagAr: 'الكشك',
    accent: 'from-emerald-500/20 to-teal-500/10 text-emerald-300 border-emerald-500/25',
  },
  schedule: {
    title: 'Schedule', titleAr: 'جدول الحصص',
    subtitle: 'Weekly classes and room timetable.',
    subtitleAr: 'مواعيد وقاعات الحصص خلال الأسبوع.',
    icon: <CalendarDays className="w-5 h-5" />, tagEn: 'Classes', tagAr: 'الجدول',
    accent: 'from-sky-500/20 to-blue-500/10 text-sky-300 border-sky-500/25',
  },
  courses: {
    title: 'Academy', titleAr: 'الأكاديمية',
    subtitle: 'Categories, student groups, and sessions.',
    subtitleAr: 'إدارة الأقسام والمجموعات والحصص.',
    icon: <GraduationCap className="w-5 h-5" />, tagEn: 'Academy', tagAr: 'الأكاديمية',
    accent: 'from-indigo-500/20 to-violet-500/10 text-indigo-300 border-indigo-500/25',
  },
  categories: {
    title: 'Categories', titleAr: 'الأقسام',
    subtitle: 'Main dance programs (Classical, Contemporary, etc.).',
    subtitleAr: 'الأقسام الرئيسية مثل الباليه الكلاسيكي والمعاصر.',
    icon: <Layers className="w-5 h-5" />, tagEn: 'Step 1', tagAr: 'خطوة 1',
    accent: 'from-amber-500/20 to-yellow-500/10 text-amber-300 border-amber-500/25',
  },
  groups: {
    title: 'Groups', titleAr: 'المجموعات',
    subtitle: 'Student groups and their assigned instructors.',
    subtitleAr: 'مجموعات وفصول الطلاب والمدرب المسؤول.',
    icon: <Users className="w-5 h-5" />, tagEn: 'Step 2', tagAr: 'خطوة 2',
    accent: 'from-violet-500/20 to-purple-500/10 text-violet-300 border-violet-500/25',
  },
  sessions: {
    title: 'Sessions', titleAr: 'الحصص',
    subtitle: 'Class dates, times, and studios.',
    subtitleAr: 'مواعيد وتواريخ الحصص والقاعات.',
    icon: <CalendarDays className="w-5 h-5" />, tagEn: 'Step 3', tagAr: 'خطوة 3',
    accent: 'from-sky-500/20 to-blue-500/10 text-sky-300 border-sky-500/25',
  },
  students: {
    title: 'Students', titleAr: 'الطلاب',
    subtitle: 'Student profiles, parent contacts, and balances.',
    subtitleAr: 'بيانات الطلاب وأولياء الأمور وأرصدة الحصص.',
    icon: <Users className="w-5 h-5" />, tagEn: 'Students', tagAr: 'الطلاب',
    accent: 'from-blue-500/20 to-cyan-500/10 text-blue-300 border-blue-500/25',
  },
  admissions: {
    title: 'Admissions', titleAr: 'طلبات التسجيل',
    subtitle: 'New student inquiries and trial requests.',
    subtitleAr: 'طلبات التقديم الجديدة وحصص التجربة.',
    icon: <UserPlus className="w-5 h-5" />, tagEn: 'Leads', tagAr: 'الطلبات',
    accent: 'from-amber-500/20 to-orange-500/10 text-amber-300 border-amber-500/25',
  },
  subscriptions: {
    title: 'Packages', titleAr: 'باقات الاشتراك',
    subtitle: 'Session plans, pricing, and renewals.',
    subtitleAr: 'أسعار الباقات وعدد الحصص والتجديدات.',
    icon: <Calculator className="w-5 h-5" />, tagEn: 'Plans', tagAr: 'الباقات',
    accent: 'from-cyan-500/20 to-teal-500/10 text-cyan-300 border-cyan-500/25',
  },
  pos: {
    title: 'Store', titleAr: 'المتجر',
    subtitle: 'Ballet wear, shoes, and stock management.',
    subtitleAr: 'بيع ملابس وأحذية الباليه وإدارة المخزون.',
    icon: <ShoppingBag className="w-5 h-5" />, tagEn: 'Store', tagAr: 'المتجر',
    accent: 'from-orange-500/20 to-amber-500/10 text-orange-300 border-orange-500/25',
  },
  financials: {
    title: 'Finance', titleAr: 'المالية والحسابات',
    subtitle: 'Revenues, expenses, instructor salaries, and cash.',
    subtitleAr: 'الإيرادات والمصروفات ومرتبات المدربين والخزينة.',
    icon: <DollarSign className="w-5 h-5" />, tagEn: 'Money', tagAr: 'المالية',
    accent: 'from-emerald-500/20 to-lime-500/10 text-emerald-300 border-emerald-500/25',
  },
  openwa: {
    title: 'WhatsApp', titleAr: 'رسائل واتساب',
    subtitle: 'Attendance receipts and class reminders.',
    subtitleAr: 'إشعارات الحضور وتنبيهات الحصص التلقائية.',
    icon: <MessageSquare className="w-5 h-5" />, tagEn: 'WhatsApp', tagAr: 'واتساب',
    accent: 'from-green-500/20 to-emerald-500/10 text-green-300 border-green-500/25',
  },
  cms: {
    title: 'Website Content', titleAr: 'محتوى الموقع',
    subtitle: 'Change text, pictures, and announcements on the site.',
    subtitleAr: 'تعديل الصور والنصوص في الموقع العام.',
    icon: <Palette className="w-5 h-5" />, tagEn: 'Website', tagAr: 'الموقع',
    accent: 'from-pink-500/20 to-rose-500/10 text-pink-300 border-pink-500/25',
  },
  blog: {
    title: 'Blog', titleAr: 'المدونة',
    subtitle: 'Academy news and articles.',
    subtitleAr: 'نشر الأخبار والمقالات.',
    icon: <Newspaper className="w-5 h-5" />, tagEn: 'News', tagAr: 'الأخبار',
    accent: 'from-amber-500/20 to-yellow-500/10 text-amber-300 border-amber-500/25',
  },
  audit: {
    title: 'Activity Log', titleAr: 'سجل العمليات',
    subtitle: 'List of recent updates and actions in the system.',
    subtitleAr: 'سجل بكل الحركات والتعديلات التي تمت.',
    icon: <ShieldCheck className="w-5 h-5" />, tagEn: 'Log', tagAr: 'السجل',
    accent: 'from-slate-500/20 to-gray-500/10 text-slate-300 border-white/15',
  },
  growth: {
    title: 'Referrals', titleAr: 'دعوات الأصدقاء',
    subtitle: 'Invite codes and customer reviews.',
    subtitleAr: 'أكواد الدعوة وتقييمات أولياء الأمور.',
    icon: <Gift className="w-5 h-5" />, tagEn: 'Referrals', tagAr: 'الدعوات',
    accent: 'from-amber-500/20 to-orange-500/10 text-amber-300 border-amber-500/25',
  },
  roster: {
    title: 'Staff Shifts', titleAr: 'ورديات العمل',
    subtitle: 'Weekly shift hours for staff and teachers.',
    subtitleAr: 'جدول مواعيد وورديات الموظفين والمدربين.',
    icon: <CalendarClock className="w-5 h-5" />, tagEn: 'Shifts', tagAr: 'الورديات',
    accent: 'from-sky-500/20 to-blue-500/10 text-sky-300 border-sky-500/25',
  },
  users: {
    title: 'Staff Accounts', titleAr: 'حسابات الموظفين',
    subtitle: 'System users, teachers, and permissions.',
    subtitleAr: 'إدارة مستخدمي النظام وصلاحيات كل دور.',
    icon: <UserCog className="w-5 h-5" />, tagEn: 'Users', tagAr: 'المستخدمون',
    accent: 'from-slate-500/20 to-gray-500/10 text-slate-300 border-white/15',
  },
  settings: {
    title: 'Settings', titleAr: 'الإعدادات',
    subtitle: 'Branches and general academy preferences.',
    subtitleAr: 'إعدادات الفروع والخيارات العامة.',
    icon: <Settings className="w-5 h-5" />, tagEn: 'Settings', tagAr: 'الإعدادات',
    accent: 'from-zinc-500/20 to-slate-500/10 text-zinc-300 border-white/15',
  },
  profile: {
    title: 'My Account', titleAr: 'حسابي',
    subtitle: 'Personal info and password change.',
    subtitleAr: 'بياناتك الشخصية وتغيير كلمة المرور.',
    icon: <User className="w-5 h-5" />, tagEn: 'Account', tagAr: 'الحساب',
    accent: 'from-amber-500/20 to-rose-500/10 text-amber-300 border-amber-500/25',
  },
};

const DefaultTabRedirect: React.FC = () => {
  const { currentUser, userRole, roleConfigs } = useAdmin();
  const roleConfig = roleConfigs[currentUser?.role || userRole] || roleConfigs.superadmin;
  return <Navigate to={`/${roleConfig.defaultTab || 'overview'}`} replace />;
};

const AdminLayout: React.FC = () => {
  const { currentUser, language, userRole, roleConfigs } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();

  const roleConfig = roleConfigs[currentUser?.role || userRole] || roleConfigs.superadmin;
  const pathSegment = location.pathname.replace(/^\//, '').split('/')[0] as AdminTabId;
  const activeTab: AdminTabId = pathSegment && MODULE_HERO_DATA[pathSegment]
    ? pathSegment
    : (roleConfig.defaultTab || 'overview');

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('etoile_admin_sidebar_collapsed') === 'true'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [todayStr, setTodayStr] = useState('');

  useEffect(() => {
    try { localStorage.setItem('etoile_admin_sidebar_collapsed', String(isCollapsed)); } catch { /* noop */ }
  }, [isCollapsed]);

  useEffect(() => {
    try {
      const s = new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo',
      }).format(new Date());
      setTodayStr(s);
    } catch { setTodayStr(new Date().toDateString()); }
  }, [language]);

  useEffect(() => {
    if (!currentUser) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); setIsCollapsed((v) => !v); return; }
      const order: AdminTabId[] = ['overview', 'analytics', 'checkin', 'schedule', 'courses', 'students', 'admissions', 'subscriptions', 'pos'];
      if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10);
        if (idx >= 1 && idx <= order.length) {
          const tab = order[idx - 1];
          if (roleConfig.allowedTabs.includes(tab)) navigate('/' + tab);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentUser, roleConfig, navigate]);

  const hero = MODULE_HERO_DATA[activeTab] || MODULE_HERO_DATA.overview;

  const handleTabChange = (tab: AdminTabId) => {
    navigate('/' + tab);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex antialiased selection:bg-rose-500 selection:text-white font-sans">
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          onToggleSidebar={() => setIsCollapsed(!isCollapsed)}
          onToggleMobileMenu={() => setMobileOpen(!mobileOpen)}
          isCollapsed={isCollapsed}
        />

        <main className="flex-1 w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 pb-28 lg:pb-10 space-y-5">
          {/* Premium page hero */}
          <div className="premium-card p-5 sm:p-6 overflow-hidden animate-fade-up">
            <div className="absolute inset-0 pointer-events-none opacity-60" style={{ background: 'radial-gradient(ellipse 60% 80% at 95% 10%, rgba(244,63,94,0.08), transparent 60%), radial-gradient(ellipse 50% 70% at 5% 100%, rgba(99,102,241,0.08), transparent 60%)' }} />
            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br border flex items-center justify-center flex-shrink-0 shadow-lg ${hero.accent}`}>
                  {hero.icon}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-rose-300">✦ Étoile OS // {language === 'ar' ? hero.tagAr : hero.tagEn}</span>
                    <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">• {todayStr} • Cairo</span>
                  </div>
                  <h1 className="font-heading text-[22px] sm:text-[28px] font-extrabold tracking-tight text-white leading-tight mt-1">
                    {language === 'ar' ? hero.titleAr : hero.title}
                  </h1>
                  <p className="text-xs sm:text-[13px] text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    {language === 'ar' ? hero.subtitleAr : hero.subtitle}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill-live inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-bold text-emerald-300">
                  {language === 'ar' ? 'متصل حي' : 'Live sync'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] font-bold text-slate-300">
                  {roleConfig.badge} • {language === 'ar' ? 'وصول' : 'access'} {roleConfig.allowedTabs.length}
                </span>
                <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] text-slate-400" title={language === 'ar' ? 'اختصارات: بحث، قائمة، تبديل الأقسام 1-9' : 'Shortcuts: search, menu, switch tabs 1-9'}>
                  <span className="cmd-kbd">⌘K</span> {language === 'ar' ? 'بحث' : 'search'} <span className="text-slate-600">•</span> <span className="cmd-kbd">⌘B</span> {language === 'ar' ? 'قائمة' : 'menu'} <span className="text-slate-600">•</span> <span className="cmd-kbd">1–9</span> <span className="text-slate-500">{language === 'ar' ? 'تبويب' : 'tabs'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="transition-all duration-300">
            <Suspense fallback={<div className="space-y-3"><div className="shimmer-line h-32" /><div className="shimmer-line h-48" /></div>}>
              <Outlet />
            </Suspense>
          </div>

          <footer className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-600">
            <span>Étoile OS • {language === 'ar' ? 'نظام إدارة الأكاديمية — القاهرة' : 'Academy Management OS — Cairo'} • EGP • Africa/Cairo</span>
            <span className="font-mono">RBAC enforced • JWT • Prisma • WhatsApp live</span>
          </footer>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};

export const AppRoutes: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DefaultTabRedirect />} />
        <Route path="overview" element={<ProtectedRoute tabId="overview"><DashboardOverview onNavigate={(t) => navigate('/' + t)} /></ProtectedRoute>} />
        <Route path="analytics" element={<ProtectedRoute tabId="analytics"><AnalyticsHub /></ProtectedRoute>} />
        <Route path="notifications" element={<ProtectedRoute tabId="notifications"><NotificationHistoryPage onNavigate={(t) => navigate('/' + t)} /></ProtectedRoute>} />
        <Route path="checkin" element={<ProtectedRoute tabId="checkin"><FastTrackCheckIn /></ProtectedRoute>} />
        <Route path="schedule" element={<ProtectedRoute tabId="schedule"><ScheduleBoard onNewSession={() => navigate('/courses')} /></ProtectedRoute>} />
        <Route path="courses" element={<ProtectedRoute tabId="courses"><AcademyView /></ProtectedRoute>} />
        <Route path="categories" element={<ProtectedRoute tabId="categories"><AcademyView section="categories" /></ProtectedRoute>} />
        <Route path="groups" element={<ProtectedRoute tabId="groups"><AcademyView section="groups" /></ProtectedRoute>} />
        <Route path="sessions" element={<ProtectedRoute tabId="sessions"><AcademyView section="sessions" /></ProtectedRoute>} />
        <Route path="students" element={<ProtectedRoute tabId="students"><StudentCrm /></ProtectedRoute>} />
        <Route path="admissions" element={<ProtectedRoute tabId="admissions"><AdmissionsPipeline /></ProtectedRoute>} />
        <Route path="subscriptions" element={<ProtectedRoute tabId="subscriptions"><SubscriptionManager /></ProtectedRoute>} />
        <Route path="pos" element={<ProtectedRoute tabId="pos"><PosBoutique /></ProtectedRoute>} />
        <Route path="financials" element={<ProtectedRoute tabId="financials"><FinancialAccounting /></ProtectedRoute>} />
        <Route path="openwa" element={<ProtectedRoute tabId="openwa"><OpenWaDispatcher /></ProtectedRoute>} />
        <Route path="cms" element={<ProtectedRoute tabId="cms"><PortalCmsEditor /></ProtectedRoute>} />
        <Route path="blog" element={<ProtectedRoute tabId="blog"><BlogManager /></ProtectedRoute>} />
        <Route path="audit" element={<ProtectedRoute tabId="audit"><AuditLogView /></ProtectedRoute>} />
        <Route path="growth" element={<ProtectedRoute tabId="growth"><GrowthView /></ProtectedRoute>} />
        <Route path="roster" element={<ProtectedRoute tabId="roster"><RosterView /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute tabId="users"><AdminUsersManagement /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute tabId="settings"><SettingsHub /></ProtectedRoute>} />
        <Route path="profile" element={<ProtectedRoute tabId="profile"><MyProfilePage /></ProtectedRoute>} />
        <Route path="*" element={<DefaultTabRedirect />} />
      </Route>
    </Routes>
  );
};

export const App: React.FC = () => (
  <BrowserRouter>
    <AdminProvider>
      <AppRoutes />
    </AdminProvider>
  </BrowserRouter>
);

export default App;

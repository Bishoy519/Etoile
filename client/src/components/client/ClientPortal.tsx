import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/currency';
import { exportCsv } from '../../utils/csv';
import { BarcodeSVG, Code128Canvas } from './BarcodeRenderer';
import { FamilyBilling } from '../billing/FamilyBilling';
import { DocumentsSection } from '../billing/DocumentsSection';
import { ReferralSection } from '../billing/ReferralSection';
import { OnboardingChecklist } from '../billing/OnboardingChecklist';
import { CertificatesStrip } from '../billing/CertificatesStrip';
import { ProgressSection } from '../billing/ProgressSection';
import { DeleteDataButton } from '../billing/DeleteDataButton';
import { BirthdayCard } from '../billing/BirthdayCard';
import { ClientBlogSection } from './ClientBlogSection';
import { api, errMsg } from '../../utils/api';
import {
  Users,
  QrCode,
  Calendar,
  AlertCircle,
  CreditCard,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  TrendingDown,
  LogOut,
  Megaphone,
  GraduationCap,
  Bell,
  MessageSquare,
  Compass,
  AlertTriangle,
  Flame,
  HelpCircle,
  Download,
  LayoutGrid,
  Rows3,
  X,
} from 'lucide-react';

export const ClientPortal: React.FC = () => {
  const {
    students,
    activeStudentId,
    setActiveStudentId,
    currentFamilyId,
    logoutFamily,
    language,
    settleStudentDebt,
    showToast,
    portalContent,
    courses,
    courseSessions,
    triggerOpenWaAlert,
    studentSchedule,
    setActiveView,
  } = useApp();

  const [settleAmount, setSettleAmount] = useState<string>('');
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [courseView, setCourseView] = useState<'cards' | 'rows'>('cards');

  const targetFamilyId = currentFamilyId || students[0]?.familyId || '';
  const familyChildren = students.filter((s) => s.familyId === targetFamilyId);
  const activeStudent =
    familyChildren.find((s) => s.id === activeStudentId) || familyChildren[0] || students[0];

  if (!activeStudent) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl text-[#fdf1c2]">
          {language === 'ar' ? 'جاري تحميل بيانات حساب العائلة...' : 'Loading family account data...'}
        </h2>
        <p className="text-xs text-brand-muted/70">
          {language === 'ar' ? 'إذا استمر هذا طويلاً، يمكنك تسجيل الخروج والعودة' : 'If this persists, please sign out and log in again.'}
        </p>
        <button
          onClick={logoutFamily}
          className="px-4 py-2 rounded-xl gold-btn text-black font-semibold text-xs inline-flex items-center gap-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
        </button>
      </div>
    );
  }

  // Exact Subscription Quota & Expiration Date (uses studentSchedule from backend if available)
  const subPlanName = studentSchedule?.subscription?.planName || activeStudent.subscription?.planName || activeStudent.program;
  const subPlanNameAr = studentSchedule?.subscription?.planNameAr || activeStudent.subscription?.planNameAr || (language === 'ar' ? 'البرنامج المعتمد' : activeStudent.program);
  const totalSessions = studentSchedule?.subscription?.totalSessions ?? activeStudent.subscription?.maxSessions ?? 16;
  const remainingSessions = studentSchedule?.subscription?.remainingSessions ?? (activeStudent.subscription ? Math.max(0, activeStudent.subscription.maxSessions - activeStudent.subscription.usedSessions) : totalSessions);
  const usedSessions = studentSchedule?.subscription?.usedSessions ?? activeStudent.subscription?.usedSessions ?? (totalSessions - remainingSessions);
  const expirationDate = studentSchedule?.subscription?.endDate || activeStudent.subscription?.endDate || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const daysRemaining = studentSchedule?.subscription ? studentSchedule.subscription.daysRemaining : Math.max(0, Math.ceil((new Date(expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
  const quotaPercent = Math.min(100, Math.round((usedSessions / totalSessions) * 100));
  const isExpiringSoon = daysRemaining <= 7 || remainingSessions <= 2;

  // Student's specific enrolled courses
  const studentCourses = studentSchedule?.enrolledCourses && studentSchedule.enrolledCourses.length > 0
    ? studentSchedule.enrolledCourses
    : courses.filter((c) => c.enrollments?.some((e) => e.studentId === activeStudent.id));

  // Student's specific upcoming sessions
  const relevantSessions = studentSchedule?.upcomingSessions && studentSchedule.upcomingSessions.length > 0
    ? studentSchedule.upcomingSessions
    : courseSessions
        .filter((ses) => studentCourses.some((c) => c.id === ses.courseId) || studentCourses.length === 0)
        .sort((a, b) => new Date(`${a.sessionDate}T${a.startTime}`).getTime() - new Date(`${b.sessionDate}T${b.startTime}`).getTime());

  const nextSession = relevantSessions[0] || null;

  const filteredCourses = studentCourses;

  const handleExportCourses = () => {
    exportCsv(`my-courses-${new Date().toISOString().split('T')[0]}`, ['code', 'title', 'level', 'studioRoom', 'instructor'], filteredCourses.map((c) => ({
      code: c.code, title: c.title, level: c.level, studioRoom: c.studioRoom || '', instructor: c.instructor?.name || '',
    })));
    showToast(language === 'ar' ? 'تم تصدير الدورات' : 'Courses exported', `${filteredCourses.length} courses → CSV`, 'gold');
  };

  // Live countdown timer to the next session
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number; isPast: boolean }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false,
  });


  useEffect(() => {
    if (!nextSession) return;
    const calculateTimeLeft = () => {
      const targetTime = new Date(`${nextSession.sessionDate}T${nextSession.startTime}`).getTime();
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setCountdown({ hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setCountdown({ hours, minutes, seconds, isPast: false });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [nextSession]);

  const handleDebtSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Invalid Amount', 'Please enter a valid amount to settle.', 'error');
      return;
    }
    settleStudentDebt(activeStudent.id, amt);
    setShowSettleModal(false);
    setSettleAmount('');
  };

  const handleRequestWhatsAppDirections = () => {
    if (!nextSession) return;
    triggerOpenWaAlert(
      'class_reminder',
      activeStudent.parentPhone,
      activeStudent.parentName,
      language === 'ar'
        ? `تحية من كونسرفتوار إتوال: حلقة تدريب ${activeStudent.name} القادمة (${nextSession.title}) مجدولة بتاريخ ${nextSession.sessionDate} الساعة ${nextSession.startTime} في ${nextSession.studioRoom}. نتمنى لكم حصة ملهمة!`
        : `Étoile Conservatory: Next class for ${activeStudent.name} (${nextSession.title}) is on ${nextSession.sessionDate} at ${nextSession.startTime} in ${nextSession.studioRoom}. See you at the barre!`
    );
    showToast(
      language === 'ar' ? 'تم إرسال تفاصيل الحصة' : 'Session Details Sent',
      language === 'ar'
        ? `تم إرسال تفاصيل الحصة إلى هاتف ولي الأمر (${activeStudent.parentPhone}).`
        : `Class details dispatched via WhatsApp to ${activeStudent.parentPhone}.`,
      'success'
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Banner: Family Profile Selector & Switcher */}
      <div className="bg-[#101314] border border-brand-gold/40 rounded-2xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.7)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-brand-gold text-xs uppercase tracking-widest mb-1">
            <Users className="w-4 h-4" />
            <span>{language === 'ar' ? 'بوابة الطالب والعائلة المعتمدة' : 'Official Student & Family Portal'}</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl gold-text-gradient font-normal">
            {language === 'ar' ? `مرحباً بعائلة (${activeStudent.parentName})` : `Family Portal: ${activeStudent.parentName}`}
          </h2>
          <p className="text-xs text-brand-muted/70 mt-1">
            {language === 'ar'
              ? 'متابعة موعد الحصة القادمة، الدورات المسجلة، استهلاك الباقة وتنبيهات انتهاء الصلاحية.'
              : 'Track next upcoming session, enrolled courses, package consumption, and expiration alerts.'}
          </p>
        </div>

        {/* Multi-child profile tabs & Sign Out */}
        <div className="flex flex-wrap items-center gap-2.5 self-stretch md:self-auto max-w-full">
          <div
            role="tablist"
            aria-label={language === 'ar' ? 'اختيار الطالب' : 'Choose dancer'}
            className="relative flex-1 md:flex-none max-w-full"
          >
            <div
              className="flex items-center gap-2 p-1.5 rounded-xl border border-brand-gold/30 bg-[#090b0c] overflow-x-auto max-w-full"
              style={{ scrollbarWidth: 'thin' }}
            >
              {familyChildren.map((child, idx) => {
                const sub = (child as { subscription?: { maxSessions?: number; usedSessions?: number; status?: string } }).subscription;
                const left = sub && typeof sub.maxSessions === 'number' ? Math.max(0, (sub.maxSessions || 0) - (sub.usedSessions || 0)) : null;
                const dot = left === null || sub?.status !== 'active' ? 'bg-slate-500' : left <= 1 ? 'bg-red-400' : left <= 4 ? 'bg-amber-300' : 'bg-emerald-400';
                const selected = child.id === activeStudent.id;
                return (
                  <button
                    key={child.id}
                    role="tab"
                    aria-selected={selected}
                    tabIndex={selected ? 0 : -1}
                    data-child-idx={idx}
                    onClick={() => setActiveStudentId(child.id)}
                    onKeyDown={(e) => {
                      const tabs = Array.from(
                        document.querySelectorAll<HTMLElement>('[data-child-idx]'),
                      );
                      const i = tabs.findIndex((t) => t.dataset.childIdx === String(idx));
                      let next: number | null = null;
                      if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
                      if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
                      if (e.key === 'Home') next = 0;
                      if (e.key === 'End') next = tabs.length - 1;
                      if (next !== null) {
                        e.preventDefault();
                        tabs[next].focus();
                        tabs[next].click();
                      }
                    }}
                    title={left === null ? child.name : `${child.name} — ${left} ${language === 'ar' ? 'حصص متبقية' : 'sessions left'}`}
                    className={`min-w-[148px] flex-1 md:flex-none flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs transition focus-visible:outline-2 focus-visible:outline-[#caa868] ${
                      selected
                        ? 'bg-brand-gold text-black font-semibold shadow-[0_0_15px_rgba(226,190,104,0.4)]'
                        : 'text-brand-muted/80 hover:text-brand-gold hover:bg-black/30'
                    }`}
                  >
                    <span className="relative shrink-0">
                      <img
                        src={child.photoUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-7 h-7 rounded-full object-cover border border-brand-gold/40"
                      />
                      <span className={`absolute -bottom-0.5 -end-0.5 w-2.5 h-2.5 rounded-full border border-black ${dot}`} />
                    </span>
                    <div className="text-left rtl:text-right min-w-0">
                      <span className="block font-medium truncate">
                        {language === 'ar' ? child.nameAr : child.name}
                      </span>
                      <span className="block text-[10px] opacity-75">
                        {child.program === 'classical' ? 'Classical' : child.program === 'contemporary' ? 'Contemporary' : 'Youth'}
                        {left !== null && sub?.status === 'active' ? ` • ${left} ${language === 'ar' ? 'متبقٍ' : 'left'}` : ''}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            {familyChildren.length > 2 && (
              <span className="pointer-events-none absolute inset-y-1.5 end-1.5 w-8 rounded-lg bg-gradient-to-l from-[#090b0c] to-transparent rtl:bg-gradient-to-r" aria-hidden="true" />
            )}
          </div>

          <button
            onClick={async () => {
              try {
                const { data } = await api.get('/api/auth/family/export');
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `etoile-family-${targetFamilyId || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
                showToast(language === 'ar' ? 'تم تنزيل بياناتك' : 'Your data is downloaded', language === 'ar' ? 'ملف JSON يشمل كل سجلات عائلتك.' : 'JSON file with all your household records.', 'success');
              } catch (e) {
                showToast(language === 'ar' ? 'تعذر التنزيل' : 'Download failed', errMsg(e), 'error');
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-brand-gold/30 hover:border-brand-gold bg-[#121617] hover:bg-[#181d1f] text-xs text-brand-gold transition shadow-sm"
            title={language === 'ar' ? 'تنزيل نسخة من بيانات عائلتي (JSON)' : 'Download a copy of my family data (JSON)'}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{language === 'ar' ? 'بياناتي' : 'My data'}</span>
          </button>
          <DeleteDataButton />

          <button
            onClick={() => setActiveView('faq')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-brand-gold/30 hover:border-brand-gold bg-[#121617] hover:bg-[#181d1f] text-xs text-brand-gold transition shadow-sm"
            title={language === 'ar' ? 'المساعدة والأسئلة الشائعة' : 'Help & FAQ'}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{language === 'ar' ? 'مساعدة' : 'Help'}</span>
          </button>

          <button
            onClick={logoutFamily}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-brand-gold/30 hover:border-brand-gold bg-[#121617] hover:bg-[#181d1f] text-xs text-brand-gold transition shadow-sm"
            title={language === 'ar' ? 'تسجيل الخروج أو تبديل الحساب' : 'Sign out or switch family'}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
          </button>
        </div>
      </div>

      {/* Client Dashboard Section Quick-Navigation Bar */}
      <nav 
        aria-label={language === 'ar' ? 'أقسام لوحة التحكم' : 'Dashboard sections'}
        className="sticky top-16 sm:top-20 z-30 p-2 rounded-2xl bg-[#090b0c]/90 backdrop-blur-xl border border-brand-gold/30 shadow-[0_8px_30px_rgba(0,0,0,0.7)] flex items-center gap-1.5 overflow-x-auto scrollbar-none"
      >
        <button
          onClick={() => {
            const el = document.getElementById('portal-schedule');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-brand-gold hover:bg-brand-gold/15 whitespace-nowrap transition"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'الجدول والحصة القادمة' : 'Next Session'}</span>
        </button>

        <button
          onClick={() => {
            const el = document.getElementById('portal-courses');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#dcd2bd] hover:text-brand-gold hover:bg-brand-gold/15 whitespace-nowrap transition"
        >
          <GraduationCap className="w-3.5 h-3.5 text-brand-gold" />
          <span>{language === 'ar' ? 'الدورات المسجلة' : 'My Courses'}</span>
        </button>

        <button
          onClick={() => {
            const el = document.getElementById('portal-blog');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-brand-gold bg-brand-gold/15 border border-brand-gold/40 hover:bg-brand-gold hover:text-black whitespace-nowrap transition shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'الماستركلاس والمدونة' : 'Masterclasses & Blog'}</span>
        </button>

        <button
          onClick={() => {
            const el = document.getElementById('portal-billing');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#dcd2bd] hover:text-brand-gold hover:bg-brand-gold/15 whitespace-nowrap transition"
        >
          <CreditCard className="w-3.5 h-3.5 text-brand-gold" />
          <span>{language === 'ar' ? 'الفواتير والمدفوعات' : 'Billing & Invoices'}</span>
        </button>

        <button
          onClick={() => {
            const el = document.getElementById('portal-documents');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#dcd2bd] hover:text-brand-gold hover:bg-brand-gold/15 whitespace-nowrap transition"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-brand-gold" />
          <span>{language === 'ar' ? 'المستندات والموافقات' : 'Documents'}</span>
        </button>

        <button
          onClick={() => {
            const el = document.getElementById('portal-progress');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#dcd2bd] hover:text-brand-gold hover:bg-brand-gold/15 whitespace-nowrap transition"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-brand-gold" />
          <span>{language === 'ar' ? 'الشهادات والتقييم' : 'Progress & Honors'}</span>
        </button>
      </nav>

      {/* Getting-started checklist */}
      <OnboardingChecklist />

      {/* Birthday */}
      {activeStudent && (
        <BirthdayCard
          key={`bday-${activeStudent.id}`}
          studentId={activeStudent.id}
          birthDate={activeStudent.birthDate}
          studentName={language === 'ar' ? activeStudent.nameAr || activeStudent.name : activeStudent.name}
        />
      )}

      {/* Dynamic Announcement Banner from Admin CMS */}
      {portalContent?.notice?.enabled && (
        <div className="rounded-2xl border border-brand-gold/40 bg-gradient-to-r from-[#171c26] to-[#12161f] p-5 shadow-lg flex items-start gap-4 animate-in fade-in">
          <div className="p-2.5 rounded-xl bg-brand-gold/20 text-brand-gold border border-brand-gold/30 shrink-0 mt-0.5">
            <Megaphone className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-serif text-base font-semibold text-brand-gold">
              {language === 'ar' ? portalContent.notice.titleAr : portalContent.notice.title}
            </h4>
            <p className="text-xs text-[#dcd2bd]/90 mt-1 leading-relaxed">
              {language === 'ar' ? portalContent.notice.messageAr : portalContent.notice.message}
            </p>
          </div>
        </div>
      )}

      {/* EXPIRATION & RENEWAL WARNING BANNER */}
      {isExpiringSoon && (
        <div className="rounded-2xl border border-amber-500/60 bg-gradient-to-r from-amber-950/40 via-[#1a140d] to-amber-950/30 p-5 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in shadow-xl">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-serif text-base sm:text-lg text-amber-300 font-medium">
                  {language === 'ar' ? 'تنبيه: اشتراك الباليه شارف على الانتهاء' : 'Subscription Renewal Alert'}
                </h4>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono">
                  {remainingSessions <= 2
                    ? language === 'ar'
                      ? `${remainingSessions} حصص متبقية`
                      : `${remainingSessions} Classes Left`
                    : language === 'ar'
                    ? `${daysRemaining} يوماً متبقية`
                    : `${daysRemaining} Days Left`}
                </span>
              </div>
              <p className="text-xs text-brand-muted/90 leading-relaxed mt-1">
                {language === 'ar'
                  ? `ينتهي اشتراك الطالب (${activeStudent.name}) بتاريخ ${expirationDate} أو عند استهلاك الحصص المتبقية (${remainingSessions}/${totalSessions}). يُرجى تجديد الخطة لدى قسم الاستقبال للحفاظ على حجز المقعد.`
                  : `Package expires on ${expirationDate} or when remaining classes are exhausted (${remainingSessions}/${totalSessions}). Renew with front desk to keep reservation.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => showToast('Renewal Notice', 'Please visit reception desk to renew package.', 'gold')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs tracking-wider transition whitespace-nowrap shadow-[0_0_15px_rgba(245,158,11,0.4)] self-start sm:self-auto"
          >
            {language === 'ar' ? 'طلب تجديد الاشتراك' : 'Renew Subscription'}
          </button>

        </div>
      )}

      {/* Negative Balance (Debt Wallet) Warning Alert Banner */}
      {activeStudent.walletBalance < 0 && (
        <div className="rounded-2xl border border-rose-500/60 bg-rose-950/30 p-5 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif text-lg text-rose-300 font-medium">
                {language === 'ar' ? 'رصيد مدين مستحق (محفظة سالبة)' : 'Unpaid Store Balance'}
              </h4>
              <p className="text-xs text-brand-muted/90 leading-relaxed mt-0.5">
                {language === 'ar'
                  ? `يوجد رصيد مدين قدره ${formatCurrency(Math.abs(activeStudent.walletBalance), 'ar')} تم قيده على حساب ${activeStudent.nameAr}. الحد الائتماني المسموح: ${formatCurrency(activeStudent.maxNegativeDebt, 'ar')}.`
                  : `You have an unpaid balance of ${formatCurrency(Math.abs(activeStudent.walletBalance), 'en')} on ${activeStudent.name}'s account. Allowed limit: ${formatCurrency(activeStudent.maxNegativeDebt, 'en')}.`}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSettleModal(true)}
            className="px-5 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-black font-semibold text-xs tracking-wider transition whitespace-nowrap shadow-[0_0_15px_rgba(244,63,94,0.4)]"
          >
            {language === 'ar' ? 'تسوية الرصيد الآن' : 'Pay Balance Now'}
          </button>
        </div>
      )}

      {/* NEXT UPCOMING SESSION HERO CARD WITH LIVE COUNTDOWN */}
      <div id="portal-schedule" className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#1b1f24] via-[#101314] to-[#0a0d0e] border-2 border-brand-gold/50 shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* Decorative Ambient Background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Next Class Details */}
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-gold/40 bg-brand-gold/10 text-brand-gold text-xs font-mono">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>{language === 'ar' ? 'الحصة التدريبية القادمة' : 'Next Scheduled Session'}</span>
            </div>

            {nextSession ? (
              <>
                <h3 className="font-serif text-2xl sm:text-3xl text-[#fdf1c2] font-medium leading-tight">
                  {nextSession.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-brand-muted/80">
                  <span className="flex items-center gap-1.5 text-white">
                    <Calendar className="w-3.5 h-3.5 text-brand-gold" />
                    <span>{(() => { try { return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium' }).format(new Date(nextSession.sessionDate)); } catch { return nextSession.sessionDate; } })()}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-white" dir="ltr">
                    <Clock className="w-3.5 h-3.5 text-brand-gold" />
                    <span>{nextSession.startTime} - {nextSession.endTime}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-[#dfbe82]">
                    <Compass className="w-3.5 h-3.5" />
                    <span>{nextSession.studioRoom}</span>
                  </span>
                  {nextSession.instructor && (
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>{nextSession.instructor.name}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-brand-muted/70 leading-relaxed">
                  {language === 'ar'
                    ? 'يُرجى الحضور إلى غرفة الاستوديو قبل 15 دقيقة من الموعد المحدد بالزي المعتمد والشعر مشدود كلاسيكياً.'
                    : 'Please arrive at the studio room 15 minutes early in official uniform and hair tied in regulation chignon.'}
                </p>
              </>
            ) : (
              <div>
                <h3 className="font-serif text-2xl text-[#fdf1c2]">
                  {language === 'ar' ? 'لا توجد حصص مجدولة لهذا الأسبوع' : 'No Sessions Scheduled'}
                </h3>
                <p className="text-xs text-brand-muted/70 mt-1">
                  {language === 'ar'
                    ? 'سيتم إشعارك عبر واتساب فور اعتماد جدول الحصص القادم من هيئة التدريس.'
                    : 'You will receive an automated WhatsApp notification once the faculty publishes the next timetable.'}
                </p>
              </div>
            )}
          </div>

          {/* Right: Live Countdown & WhatsApp Details Button */}
          {nextSession && (
            <div className="flex flex-col items-center sm:items-end gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-1.5 sm:gap-2" dir="ltr" aria-label="Countdown">
                <div className="px-2.5 sm:px-4 py-2 sm:py-3 rounded-2xl bg-black/60 border border-brand-gold/30 text-center min-w-[56px] sm:min-w-[72px]">
                  <span className="block font-serif text-xl sm:text-3xl font-bold text-white">
                    {String(countdown.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-brand-muted/60 uppercase font-mono">
                    {language === 'ar' ? 'ساعة' : 'Hours'}
                  </span>
                </div>
                <span className="text-brand-gold font-bold text-lg sm:text-xl">:</span>
                <div className="px-2.5 sm:px-4 py-2 sm:py-3 rounded-2xl bg-black/60 border border-brand-gold/30 text-center min-w-[56px] sm:min-w-[72px]">
                  <span className="block font-serif text-xl sm:text-3xl font-bold text-white">
                    {String(countdown.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-brand-muted/60 uppercase font-mono">
                    {language === 'ar' ? 'دقيقة' : 'Mins'}
                  </span>
                </div>
                <span className="text-brand-gold font-bold text-lg sm:text-xl">:</span>
                <div className="px-2.5 sm:px-4 py-2 sm:py-3 rounded-2xl bg-black/60 border border-brand-gold/30 text-center min-w-[56px] sm:min-w-[72px]">
                  <span className="block font-serif text-xl sm:text-3xl font-bold text-brand-gold animate-pulse">
                    {String(countdown.seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-brand-muted/60 uppercase font-mono">
                    {language === 'ar' ? 'ثانية' : 'Secs'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleRequestWhatsAppDirections}
                className="w-full sm:w-auto gold-btn px-5 py-2.5 rounded-xl text-xs font-semibold text-black flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(202,168,104,0.3)] transition active:scale-95 min-h-[42px]"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'إرسال تذكير وتفاصيل عبر واتساب' : 'Send WhatsApp Details'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Digital Pass + Hybrid Quota + Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Column 1: Digital Attendance Member Pass (Stage Gold Card) */}
        <div className="lg:col-span-1 flex flex-col">
          <div className="relative rounded-3xl p-7 bg-gradient-to-br from-[#1c2225] via-[#101314] to-[#080a0b] border-2 border-brand-gold/70 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_35px_rgba(226,190,104,0.2)] overflow-hidden flex flex-col justify-between min-h-[460px] group">
            {/* Background Stage Lights */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" />
            <div className="laser-beam pointer-events-none opacity-40" />

            {/* Pass Header */}
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/etoile-wordmark-logo.png"
                  alt="Étoile Ballet Academy"
                  className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(226,190,104,0.4)]"
                />
                <span className="hidden sm:block font-serif text-[10px] tracking-[0.25em] text-brand-gold/70 italic uppercase border-l border-brand-gold/30 pl-2.5">
                  Student Pass
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full border border-brand-gold/40 bg-black/60 text-[10px] text-brand-gold uppercase tracking-wider">
                {activeStudent.level}
              </span>
            </div>

            {/* Dancer Profile Info */}
            <div className="relative z-10 my-6 flex items-center gap-4">
              <img
                src={activeStudent.photoUrl}
                alt={activeStudent.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-brand-gold/80 shadow-[0_0_15px_rgba(226,190,104,0.4)]"
              />
              <div>
                <h3 className="font-serif text-2xl text-[#fdf1c2] tracking-wide">
                  {language === 'ar' ? activeStudent.nameAr : activeStudent.name}
                </h3>
                <span className="text-xs text-brand-muted/70 block mt-0.5">
                  ID: <span className="font-mono text-brand-gold">{activeStudent.id}</span>
                </span>
                <span className="inline-block mt-2 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded">
                  {language === 'ar' ? 'عضوية معتمدة' : 'Active Student'}
                </span>
              </div>
            </div>

            {/* Barcode & QR Code Section */}
            <div className="relative z-10 p-4 rounded-2xl bg-[#090b0c]/90 border border-brand-gold/30 flex flex-col items-center justify-center gap-2">
              <div className="w-full flex items-center justify-center bg-white py-2.5 px-4 rounded-xl shadow-inner">
                <Code128Canvas value={activeStudent.barcode} width={220} height={60} showText={true} lightBackground={true} allowDownload={true} />
              </div>
            </div>

            {/* Pass Footer */}
            <div className="relative z-10 pt-4 border-t border-brand-gold/20 flex items-center justify-between text-[11px] text-brand-muted/60">
              <span>{language === 'ar' ? 'صالح لغاية' : 'Valid until'}: <strong className="text-[#fdf1c2]">{expirationDate}</strong></span>
              <span className="flex items-center gap-1 text-brand-gold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Card Active</span>
              </span>
            </div>
          </div>
        </div>

        {/* Column 2 & 3: Hybrid Quota Widget, Schedule, & Enrolled Courses */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Hybrid Subscription Progress Card */}
          <div className="bg-[#101314] border border-brand-gold/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-[11px] uppercase tracking-widest text-brand-gold/70 block mb-1">
                  {language === 'ar' ? 'بيانات باقة كونسرفتوار إتوال' : 'Class Package & Subscription'}
                </span>
                <h3 className="font-serif text-2xl text-[#fdf1c2]">
                  {language === 'ar' ? subPlanNameAr : subPlanName}
                </h3>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto ${
                  remainingSessions <= 2
                    ? 'bg-rose-950 text-rose-300 border border-rose-600'
                    : 'bg-brand-gold/20 text-brand-gold border border-brand-gold/40'
                }`}
              >
                {remainingSessions <= 2
                  ? language === 'ar'
                    ? 'تنبيه: اقترب نفاد الحصص'
                    : 'Classes Running Low'
                  : language === 'ar'
                  ? 'نشط'
                  : 'Active Plan'}
              </span>
            </div>

            {/* Quota Progress Bar */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-brand-muted/80">
                  {language === 'ar' ? 'الحصص المستهلكة' : 'Classes Used'}: <strong className="text-brand-gold">{usedSessions}</strong> / {totalSessions}
                </span>
                <span className="text-brand-gold font-bold">
                  {remainingSessions} / {totalSessions} {language === 'ar' ? 'حصص متبقية' : 'Classes Left'}
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-[#1b2123] overflow-hidden border border-brand-gold/30 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#d3a74e] to-[#f6e298] transition-all duration-500 shadow-[0_0_10px_rgba(226,190,104,0.6)]"
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
            </div>

            {/* Metric Capsules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-brand-gold/20 bg-[#090c0d]">
                <span className="text-[11px] uppercase text-brand-gold/70 block mb-1">
                  {language === 'ar' ? 'صلاحية الاشتراك' : 'Expiration Date'}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-serif text-2xl text-white font-bold">{daysRemaining}</span>
                  <span className="text-xs text-brand-muted/60">{language === 'ar' ? 'يوماً متبقية' : 'days left'}</span>
                </div>
                <span className="text-[10px] text-brand-gold/80 mt-1 block font-mono font-medium">
                  {expirationDate}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-brand-gold/20 bg-[#090c0d]">
                <span className="text-[11px] uppercase text-brand-gold/70 block mb-1">
                  {language === 'ar' ? 'الحصص المتبقية' : 'Sessions Left'}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-serif text-2xl text-brand-gold font-bold">{remainingSessions}</span>
                  <span className="text-xs text-brand-muted/60">/ {totalSessions}</span>
                </div>
                <span className="text-[10px] text-brand-muted/50 mt-1 block">
                  {language === 'ar' ? `تم استهلاك ${usedSessions} حصص` : `${usedSessions} sessions completed`}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-brand-gold/20 bg-[#090c0d]">
                <span className="text-[11px] uppercase text-brand-gold/70 block mb-1">
                  {language === 'ar' ? 'الرصيد المالي للمحفظة' : 'Account Balance'}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`font-serif text-2xl font-bold ${activeStudent.walletBalance < 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {activeStudent.walletBalance < 0
                      ? `-${formatCurrency(Math.abs(activeStudent.walletBalance), language)}`
                      : formatCurrency(activeStudent.walletBalance, language)}
                  </span>
                </div>
                <span className="text-[10px] text-brand-muted/50 mt-1 block">
                  {language === 'ar' ? 'الحد الائتماني:' : 'Debt Limit:'} -{formatCurrency(activeStudent.maxNegativeDebt, language)}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-brand-gold/20 bg-[#090c0d]">

                <span className="text-[11px] uppercase text-brand-gold/70 block mb-1">
                  {language === 'ar' ? 'معدل الاستحقاق اليومي' : 'Cost Per Day'}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-serif text-2xl text-brand-gold font-bold">
                    {formatCurrency(
                      activeStudent.subscription?.dailyAccrualRate ?? (
                        activeStudent.subscription?.price && activeStudent.subscription?.startDate && activeStudent.subscription?.endDate
                          ? Math.round(
                              activeStudent.subscription.price /
                                Math.max(
                                  1,
                                  Math.ceil(
                                    (new Date(activeStudent.subscription.endDate).getTime() -
                                      new Date(activeStudent.subscription.startDate).getTime()) /
                                      (1000 * 3600 * 24)
                                  )
                                )
                            )
                          : 0
                      ),
                      language
                    )}
                  </span>
                  <span className="text-xs text-brand-muted/60">/ {language === 'ar' ? 'يوم' : 'day'}</span>
                </div>
                <span className="text-[10px] text-brand-muted/50 mt-1 block">
                  {language === 'ar' ? 'سعر الباقة / إجمالي الأيام' : 'Package price / Total days'}
                </span>
              </div>

            </div>
          </div>

          {/* Enrolled Courses & Weekly Curriculum */}
          <div id="portal-courses" className="bg-[#101314] border border-brand-gold/40 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 text-brand-gold">
                <GraduationCap className="w-5 h-5" />
                <h4 className="font-serif text-xl text-brand-gold">
                  {language === 'ar' ? 'الدورات المسجل بها الطالب' : 'Enrolled Courses'}
                </h4>
              </div>
              <span className="text-xs text-brand-muted/70 font-mono">
                {filteredCourses.length}/{studentCourses.length} {language === 'ar' ? 'دورات معتمدة' : 'Courses'}
              </span>
            </div>

            {/* rows/cards + CSV */}
            <div className="flex items-center justify-end gap-2 mb-4">
                <div className="flex items-center gap-1 p-1 bg-[#080a0b] border border-brand-gold/20 rounded-xl" role="group" aria-label="Layout">
                  <button onClick={() => setCourseView('cards')} aria-pressed={courseView === 'cards'} title="Cards" className={`p-1.5 rounded-lg transition ${courseView === 'cards' ? 'bg-brand-gold text-black' : 'text-brand-muted hover:text-brand-gold'}`}>
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setCourseView('rows')} aria-pressed={courseView === 'rows'} title="Rows" className={`p-1.5 rounded-lg transition ${courseView === 'rows' ? 'bg-brand-gold text-black' : 'text-brand-muted hover:text-brand-gold'}`}>
                    <Rows3 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button onClick={handleExportCourses} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-gold/30 text-brand-gold hover:bg-brand-gold hover:text-black text-[11px] font-bold transition" title="Export CSV">
                  <Download className="w-3.5 h-3.5" /><span>CSV</span>
                </button>
              </div>

            <div className={courseView === 'rows' ? 'divide-y divide-brand-gold/10 rounded-xl border border-brand-gold/20 overflow-hidden' : 'space-y-3'}>
              {filteredCourses.length === 0 ? (
                <div className="py-6 text-center text-xs text-brand-muted/60 border border-dashed border-brand-gold/20 rounded-xl">
                  {language === 'ar'
                    ? 'لم يتم تسجيل الطالب في دورات فردية بعد. يتم الحضور وفق باقة الكونسرفتوار العامة.'
                    : 'No specific course enrollments. Attending under general conservatory curriculum.'}
                </div>
              ) : courseView === 'rows' ? (
                filteredCourses.map((course) => (
                  <div key={course.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-brand-gold/15 text-brand-gold border border-brand-gold/30 flex-shrink-0">{course.code}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold text-[#fdf1c2] truncate">{language === 'ar' ? course.titleAr || course.title : course.title}</span>
                      <span className="block text-[11px] text-brand-muted truncate">{course.level} • {course.studioRoom || ''}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[11px] font-medium flex-shrink-0">
                      {language === 'ar' ? 'مسجل' : 'Enrolled'}
                    </span>
                  </div>
                ))
              ) : (
                filteredCourses.map((course) => (
                  <div
                    key={course.id}
                    className="p-4 rounded-xl border border-brand-gold/25 bg-[#0a0c0d] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-brand-gold/15 text-brand-gold border border-brand-gold/30">
                          {course.code}
                        </span>
                        <h5 className="text-sm font-semibold text-[#fdf1c2]">
                          {language === 'ar' ? course.titleAr || course.title : course.title}
                        </h5>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-brand-muted/70 mt-1.5">
                        <span>{course.level}</span>
                        <span>•</span>
                        <span>{course.studioRoom || 'Studio Opéra'}</span>
                        {course.instructor && (
                          <>
                            <span>•</span>
                            <span className="text-brand-gold">{course.instructor.name}</span>
                          </>
                        )}
                        {course.dayOfWeek && (
                          <>
                            <span>•</span>
                            <span>{course.dayOfWeek} {course.startTime} - {course.endTime}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-xs font-medium self-start sm:self-auto">
                      {language === 'ar' ? 'مسجل ومثبت' : 'Enrolled'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conservatory Masterclasses & Blog with Video Embeds & Photo Stories */}
      <div id="portal-blog">
        <ClientBlogSection />
      </div>

      {/* Family invoices & online payment */}
      <div id="portal-billing">
        <FamilyBilling />
      </div>

      {/* Consents & medical documents */}
      <div id="portal-documents">
        {activeStudent?.id && <DocumentsSection key={activeStudent.id} studentId={activeStudent.id} />}
      </div>

      {/* Referral loop */}
      <ReferralSection />

      {/* Dancer achievements & Progress */}
      <div id="portal-progress" className="space-y-8">
        {activeStudent && (
          <CertificatesStrip
            key={`certs-${activeStudent.id}`}
            studentId={activeStudent.id}
            studentName={language === 'ar' ? activeStudent.nameAr || activeStudent.name : activeStudent.name}
          />
        )}

        {activeStudent && (
          <ProgressSection
            key={`progress-${activeStudent.id}`}
            studentId={activeStudent.id}
            studentName={language === 'ar' ? activeStudent.nameAr || activeStudent.name : activeStudent.name}
          />
        )}
      </div>

      {/* Settle Debt Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#101314] border border-brand-gold/60 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl">
            <h3 className="font-serif text-2xl gold-text-gradient mb-2">
              {language === 'ar' ? 'تسوية رصيد المحفظة المستحق' : 'Pay Unpaid Balance'}
            </h3>
            <p className="text-xs text-brand-muted/80 mb-6">
              {language === 'ar'
                ? `الرصيد المدين الحالي لحساب ${activeStudent.nameAr} هو ${formatCurrency(Math.abs(activeStudent.walletBalance), 'ar')}. يمكنك دفع المبلغ كاملاً أو دفعة جزئية.`
                : `Current unpaid balance for ${activeStudent.name} is ${formatCurrency(Math.abs(activeStudent.walletBalance), 'en')}. Enter payment amount:`}
            </p>

            <form onSubmit={handleDebtSettlement} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-brand-gold mb-1">
                  {language === 'ar' ? 'المبلغ المراد سداده (ج.م)' : 'Payment Amount (EGP)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  placeholder={Math.abs(activeStudent.walletBalance).toFixed(2)}
                  className="form-gold-input w-full px-4 py-2.5 rounded-lg text-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-brand-gold/20">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="px-4 py-2 rounded-lg text-xs text-brand-muted/70"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="gold-btn px-6 py-2 rounded-lg text-black font-semibold text-xs"
                >
                  {language === 'ar' ? 'تأكيد السداد' : 'Pay Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

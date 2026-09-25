import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { UserRole } from '../types';
import {
  ShieldCheck,
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  UserCheck,
  Compass,
  CheckCircle2,
  KeyRound,
  Building2,
  Globe,
  Clock,
  Briefcase,
} from 'lucide-react';

import { useNavigate, useLocation } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const { login, staffList, language, setLanguage, currentUser } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (currentUser) {
      const dest = (location.state as any)?.from?.pathname || '/';
      navigate(dest, { replace: true });
    }
  }, [currentUser, location.state, navigate]);

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Paris Conservatory Clock
  const [parisTime, setParisTime] = useState<string>(() => {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Paris',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date());
    } catch {
      return '16:45:00';
    }
  });

  useEffect(() => {
    const timer = setInterval(() => {
      try {
        setParisTime(
          new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/Paris',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }).format(new Date())
        );
      } catch {}
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const success = await login(emailInput, passwordInput);
      if (!success) {
        setError(
          language === 'ar'
            ? 'بيانات الدخول غير صحيحة، يرجى التحقق أو اختيار أحد الحسابات السريعة أدناه.'
            : 'Authentication failed. Please check credentials or choose a quick role below.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  const roleMeta: Record<
    UserRole,
    { title: string; titleAr: string; badge: string; color: string; icon: React.ReactNode; access: string; accessAr: string }
  > = {
    superadmin: {
      title: 'Academy Director',
      titleAr: 'مدير الأكاديمية',
      badge: 'Director',
      color: 'text-[#fb7185] border-[#F43F5E]/40 bg-[#F43F5E]/15',
      icon: <Sparkles className="w-3.5 h-3.5 text-[#F43F5E]" />,
      access: 'All 7 modules: Overview, Attendance, CRM, Subscriptions, Boutique POS, Financials, WhatsApp',
      accessAr: 'جميع النوافذ: لوحة القيادة، الحضور، إدارة الطلاب، الاشتراكات، المتجر، المالية، واتساب',
    },
    owner: {
      title: 'Board Member / Owner',
      titleAr: 'المالك / مجلس الإدارة',
      badge: 'Board',
      color: 'text-purple-300 border-purple-500/40 bg-purple-500/10',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />,
      access: 'Overview, Students CRM, Revenue & Financials, WhatsApp Dispatch',
      accessAr: 'لوحة القيادة، سجل الطلاب، الإيرادات والمالية، إشعارات واتساب',
    },
    receptionist: {
      title: 'Front-Desk Reception',
      titleAr: 'موظف الاستقبال',
      badge: 'Reception',
      color: 'text-sky-300 border-sky-500/40 bg-sky-500/10',
      icon: <UserCheck className="w-3.5 h-3.5 text-sky-400" />,
      access: 'Fast Check-In, Students CRM, Class Packages, Boutique POS Retail',
      accessAr: 'تسجيل الحضور الفوري، إدارة الطلاب، باقات الحصص، متجر البوتيك',
    },
    instructor: {
      title: 'Ballet Teacher / Coach',
      titleAr: 'مدرب باليه / أعضاء الهيئة',
      badge: 'Teacher',
      color: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
      icon: <Compass className="w-3.5 h-3.5 text-emerald-400" />,
      access: 'Class Attendance Check-In & Student Profiles only',
      accessAr: 'تسجيل الحضور لحصص الباليه والملفات الفنية والتقييمات فقط',
    },
  };

  return (
    <div className="min-h-screen w-full bg-[#0d111a] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#F43F5E]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Top Floating Language Switcher */}
      <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4 z-20 flex items-center gap-2">
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 hover:border-[#F43F5E]/40 bg-[#171d2b] hover:bg-[#1c2333] text-xs text-[#fb7185] transition shadow-md"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="font-semibold">{language === 'en' ? 'العربية' : 'English'}</span>
        </button>
      </div>

      <div className="w-full max-w-4xl z-10 space-y-6 sm:space-y-8 animate-in fade-in duration-300 py-6">
        
        {/* Academy Emblem Header */}
        <div className="text-center space-y-2 px-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#F43F5E]/30 bg-[#171d2b] text-xs text-[#fb7185]">
            <Sparkles className="w-3.5 h-3.5 text-[#F43F5E] flex-shrink-0" />
            <span className="font-semibold tracking-wider uppercase text-[10px]">
              {language === 'ar' ? 'إدارة الأكاديمية ونظام RBAC والـ CRM' : 'Staff Login // Academy Management'}
            </span>
          </div>

          <h1 className="font-heading text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
            Étoile Ballet Academy
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            {language === 'ar'
              ? 'محطة دخول الطاقم المصرح لهم • تسجيل الدخول الآمن بحسب الدور الإداري المعتمد'
              : 'Staff Portal • Sign in to access your academy workspace and tools.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Login Form Card (5 cols on lg) */}
          <div className="lg:col-span-5 bg-[#171d2b] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-5">
            <div className="border-b border-white/10 pb-3">
              <h2 className="font-heading text-lg font-semibold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#F43F5E] flex-shrink-0" />
                <span>{language === 'ar' ? 'تسجيل الدخول للنظام' : 'Staff Sign In'}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'ar'
                  ? 'أدخل بريدك الإلكتروني والرمز للوصول إلى صلاحياتك.'
                  : 'Enter your staff email and PIN to access live data.'}
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl border border-rose-900/40 bg-rose-950/20 text-rose-200 text-xs flex items-center gap-2">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {language === 'ar' ? 'البريد الإلكتروني' : 'Staff Email'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-3.5 w-4 h-4 text-[#F43F5E]/60 pointer-events-none" />
                  <input
                    type="email"
                    required
                    minLength={5}
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="director@etoile.fr"
                    autoComplete="email"
                    className="w-full bg-[#111622] border border-white/10 text-white placeholder:text-slate-500 pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-2.5 rounded-xl text-xs min-h-[44px] focus:outline-none focus:border-[#F43F5E] focus:ring-1 focus:ring-[#F43F5E]/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {language === 'ar' ? 'كلمة المرور / الرمز السري' : 'Password / PIN'}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-3.5 w-4 h-4 text-[#F43F5E]/60 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#111622] border border-white/10 text-white placeholder:text-slate-500 pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-2.5 rounded-xl text-xs min-h-[44px] focus:outline-none focus:border-[#F43F5E] focus:ring-1 focus:ring-[#F43F5E]/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full action-btn-coral py-3 rounded-xl text-xs font-bold tracking-wider flex items-center justify-center gap-2 transition min-h-[46px] shadow-lg active:scale-[0.98] cursor-pointer"
              >
                {isSubmitting ? (
                  <span>{language === 'ar' ? 'جارٍ التحقق...' : 'Signing in...'}</span>
                ) : (
                  <>
                    <span>{language === 'ar' ? 'تسجيل الدخول' : 'Sign In to Dashboard'}</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'ar' ? 'تشفير آمن 256-bit' : 'Encrypted Session'}</span>
              </span>
              <span className="font-mono flex items-center gap-1 text-[#F43F5E]">
                <Clock className="w-3 h-3" />
                <span>Paris: {parisTime}</span>
              </span>
            </div>
          </div>

          {/* RBAC Workstation Profiles (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F43F5E] flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{language === 'ar' ? 'مستويات الصلاحيات المعتمدة' : 'Authorized Access Levels'}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'ar'
                    ? 'يتم تحديد واجهة العمل والأدوات المصرح بها تلقائياً فور تسجيل الدخول'
                    : 'Your workspace and authorized modules are determined automatically upon sign-in'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(roleMeta) as UserRole[]).map((roleKey) => {
                const meta = roleMeta[roleKey];
                return (
                  <div
                    key={roleKey}
                    className="bg-[#171d2b] border border-white/10 rounded-xl p-3.5 flex flex-col justify-between space-y-3 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${meta.color}`}>
                        {meta.icon}
                        <span>{language === 'ar' ? meta.titleAr : meta.title}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {meta.badge}
                      </span>
                    </div>

                    <div className="text-[10.5px] text-slate-300 leading-relaxed bg-[#111622] p-2.5 rounded-lg border border-white/5">
                      <span className="text-slate-400 font-medium block mb-1">
                        {language === 'ar' ? 'نطاق الصلاحيات:' : 'Authorized Scope:'}
                      </span>
                      {language === 'ar' ? meta.accessAr : meta.access}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Role Permissions Matrix Note */}
            <div className="bg-[#171d2b] border border-white/10 rounded-xl p-4 text-[11px] text-slate-400 space-y-2 shadow-sm">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#F43F5E] flex-shrink-0" />
                <span>{language === 'ar' ? 'قواعد الأمان والتحكم الصارم بالوصول (RBAC)' : 'Role Permissions & Security'}</span>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                {language === 'ar'
                  ? 'كل موظف يرى فقط الصفحات المعتمدة له في القائمة الجانبية والشاشات. لا يمكن للمدربين رؤية المحاسبة أو المتجر، ولا يمكن للاستقبال التعديل على الحوكمة أو الإيرادات التنفيذية.'
                  : 'Each role only sees their allowed pages. Teachers cannot see Store or Finances; Front Desk cannot see accounting or staff settings.'}
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};


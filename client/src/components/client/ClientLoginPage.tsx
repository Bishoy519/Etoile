import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { rawApi } from '../../utils/api';
import {
  Sparkles,
  Lock,
  ArrowRight,
  CreditCard,
  Phone,
  CheckCircle2,
  Users,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Globe,
  KeyRound,
  GraduationCap,
  Eye,
  EyeOff,
  MessageCircle,
  RefreshCw,
  X,
  Smartphone,
} from 'lucide-react';

export const ClientLoginPage: React.FC = () => {
  const {
    loginWithCardCode,
    requestInitialPassword,
    completeFirstTimeSetup,
    requestPasswordResetOtp,
    resetPasswordWithOtp,
    setActiveView,
    language,
    setLanguage,
  } = useApp();

  // Login form state
  const [cardCode, setCardCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  // Modals state
  const [modalMode, setModalMode] = useState<'none' | 'first_time' | 'forgot_password'>('none');

  // First Time Setup state
  const [ftStep, setFtStep] = useState<1 | 2>(1);
  const [ftCardCode, setFtCardCode] = useState('');
  const [ftMaskedPhone, setFtMaskedPhone] = useState('');
  const [ftTempPassword, setFtTempPassword] = useState('');
  const [ftNewPassword, setFtNewPassword] = useState('');
  const [ftConfirmPassword, setFtConfirmPassword] = useState('');
  const [ftError, setFtError] = useState<string | null>(null);
  const [ftLoading, setFtLoading] = useState(false);

  // Forgot Password state
  const [fpStep, setFpStep] = useState<1 | 2>(1);
  const [fpCardCode, setFpCardCode] = useState('');
  const [fpMaskedPhone, setFpMaskedPhone] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpConfirmPassword, setFpConfirmPassword] = useState('');
  const [fpError, setFpError] = useState<string | null>(null);
  const [fpLoading, setFpLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await loginWithCardCode(cardCode, password);
      if (res.mustChangePassword) {
        // User logged in with temp password and must change it now
        setFtCardCode(res.cardCode || cardCode);
        setFtMaskedPhone(res.maskedPhone || '');
        setFtTempPassword(password);
        setFtStep(2);
        setModalMode('first_time');
      } else if (!res.success) {
        setError(res.error || (language === 'ar' ? 'بيانات الاعتماد غير صحيحة' : 'Invalid credentials.'));
      }
    } catch {
      setError(
        language === 'ar'
          ? 'تعذر الاتصال بخادم الأكاديمية. يرجى المحاولة لاحقاً.'
          : 'Failed to connect to the academy server. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // First-Time Login: Step 1 (Request temp password via WhatsApp)
  const handleRequestFtPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFtError(null);
    setFtLoading(true);

    try {
      const res = await requestInitialPassword(ftCardCode);
      if (res.success) {
        setFtMaskedPhone(res.maskedPhone || '');
        setFtStep(2);
      } else {
        setFtError(res.error || 'Failed to dispatch password.');
      }
    } catch {
      setFtError('Network connection error.');
    } finally {
      setFtLoading(false);
    }
  };

  // First-Time Login: Step 2 (Submit temp password + create new password)
  const handleCompleteFtSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFtError(null);

    if (ftNewPassword !== ftConfirmPassword) {
      setFtError(language === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match.');
      return;
    }

    if (ftNewPassword.length < 6) {
      setFtError(
        language === 'ar'
          ? 'يجب أن تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل'
          : 'Password must be at least 6 characters long.'
      );
      return;
    }

    setFtLoading(true);

    try {
      const res = await completeFirstTimeSetup(ftCardCode, ftTempPassword, ftNewPassword);
      if (res.success) {
        setModalMode('none');
      } else {
        setFtError(res.error || 'Failed to establish new password.');
      }
    } catch {
      setFtError('Network connection error.');
    } finally {
      setFtLoading(false);
    }
  };

  // Forgot Password: Step 1 (Request 6-digit OTP via WhatsApp)
  const handleRequestFpOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError(null);
    setFpLoading(true);

    try {
      const res = await requestPasswordResetOtp(fpCardCode);
      if (res.success) {
        setFpMaskedPhone(res.maskedPhone || '');
        setFpStep(2);
      } else {
        setFpError(res.error || 'Failed to dispatch WhatsApp OTP.');
      }
    } catch {
      setFpError('Network connection error.');
    } finally {
      setFpLoading(false);
    }
  };

  // Forgot Password: Step 2 (Verify OTP + Set new password)
  const handleCompleteFpReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError(null);

    if (fpNewPassword !== fpConfirmPassword) {
      setFpError(language === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match.');
      return;
    }

    if (fpNewPassword.length < 6) {
      setFpError(
        language === 'ar'
          ? 'يجب أن تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل'
          : 'Password must be at least 6 characters long.'
      );
      return;
    }

    setFpLoading(true);

    try {
      const res = await resetPasswordWithOtp(fpCardCode, fpOtp, fpNewPassword);
      if (res.success) {
        setCardCode(fpCardCode);
        setPassword(fpNewPassword);
        setModalMode('none');
      } else {
        setFpError(res.error || 'Failed to reset password.');
      }
    } catch {
      setFpError('Network connection error.');
    } finally {
      setFpLoading(false);
    }
  };

  const openFirstTimeModal = () => {
    setFtCardCode(cardCode || '');
    setFtStep(1);
    setFtError(null);
    setModalMode('first_time');
  };

  const openForgotPasswordModal = () => {
    setFpCardCode(cardCode || '');
    setFpStep(1);
    setFpError(null);
    setModalMode('forgot_password');
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] w-full flex flex-col items-center justify-center px-4 py-8 sm:py-12 relative overflow-hidden bg-[#080a0b]">
      {/* Parisian Ambient Radial Glows */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-[#caa868]/15 via-[#caa868]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 w-[400px] h-[350px] bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Return to Academy Landing & Language Toggle */}
      <div className="w-full max-w-xl flex items-center justify-between mb-6 z-10">
        <button
          onClick={() => setActiveView('landing')}
          className="inline-flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-gold transition duration-200"
        >
          {language === 'ar' ? (
            <>
              <ChevronRight className="w-4 h-4 text-brand-gold" />
              <span>العودة للرئيسية</span>
            </>
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 text-brand-gold" />
              <span>Return to Academy</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-brand-gold/30 bg-[#101314]/80 text-xs text-[#caa868] hover:bg-brand-gold/10 transition"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="font-semibold">{language === 'en' ? 'العربية' : 'English'}</span>
          </button>
        </div>
      </div>

      {/* Main Luxury Conservatory Login Card */}
      <div className="w-full max-w-xl bg-[#101314]/95 border border-brand-gold/30 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.85)] relative z-10 backdrop-blur-xl">
        {/* Crest & Title */}
        <div className="text-center space-y-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#caa868]/20 to-[#080a0b] border border-brand-gold/40 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(202,168,104,0.3)]">
            <Sparkles className="w-7 h-7 text-brand-gold" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-brand-gold/90 block mb-1">
              Conservatoire de Paris & Dubai
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl text-[#fdf1c2] font-normal">
              {language === 'ar' ? 'بوابة دخول الطلاب والمدربين' : 'Student & Instructor Portal Access'}
            </h1>
            <p className="text-xs text-brand-muted/80 max-w-md mx-auto mt-1.5 leading-relaxed">
              {language === 'ar'
                ? 'تسجيل الدخول مخصص للطلاب والمدربين. يمكن لأولياء الأمور الدخول ببيانات اعتماد الطالب (كود البطاقة، معرّف الطالب، أو بريد/هاتف ولي الأمر) وكلمة المرور.'
                : 'Exclusive portal for students and instructors. Parents can log in directly using their dancer\'s credentials (card code, student ID, or registered email/phone) and password.'}
            </p>
          </div>
        </div>

        {/* PRIMARY CARD LOGIN FORM */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          {/* Card Code Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-brand-gold">
                {language === 'ar' ? 'كود البطاقة / معرّف الطالب / بريد أو هاتف ولي الأمر' : 'Card Code / Student ID / Parent Email or Phone'}
              </label>
              <span className="text-[10px] font-mono text-brand-muted/60">
                {language === 'ar' ? 'مثال: ETOILE-892101 أو STU-001' : 'e.g. ETOILE-892101 or STU-001'}
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                required
                value={cardCode}
                onChange={(e) => setCardCode(e.target.value)}
                placeholder={language === 'ar' ? 'كود البطاقة / معرّف الطالب / البريد أو الهاتف' : 'Card Code / Student ID / Parent Email or Phone'}
                className="w-full form-gold-input px-4 py-3 rounded-xl text-base sm:text-sm bg-[#0a0d0e] text-[#fdf1c2] placeholder:text-brand-muted/40 border border-brand-gold/40 focus:border-brand-gold focus:outline-none min-h-[46px] font-mono tracking-wider"
              />
              <div className="absolute right-3 rtl:right-auto rtl:left-3 top-3.5 text-brand-gold/70 pointer-events-none">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-brand-gold">
                {language === 'ar' ? 'كلمة المرور' : 'Portal Password'}
              </label>
              <button
                type="button"
                onClick={openForgotPasswordModal}
                className="text-[11px] text-brand-gold hover:underline transition"
              >
                {language === 'ar' ? 'نسيت كلمة المرور؟ (واتساب OTP)' : 'Forgot Password? (WhatsApp OTP)'}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full form-gold-input px-4 py-3 rounded-xl text-base sm:text-sm bg-[#0a0d0e] text-[#fdf1c2] placeholder:text-brand-muted/40 border border-brand-gold/40 focus:border-brand-gold focus:outline-none min-h-[46px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 rtl:right-auto rtl:left-3 top-3.5 text-brand-gold/70 hover:text-brand-gold"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs flex items-start gap-2.5">
              <Lock className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="gold-btn w-full py-3.5 rounded-xl font-semibold text-xs sm:text-sm text-black flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(202,168,104,0.3)] transition active:scale-[0.99] disabled:opacity-50 mt-2"
          >
            <span>
              {isSubmitting
                ? language === 'ar'
                  ? 'جارٍ التحقق من البطاقة...'
                  : 'Verifying Academy Card...'
                : language === 'ar'
                ? 'دخول بوابة الأكاديمية'
                : 'Sign In to Étoile Portal'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* WhatsApp Card Activation Bar */}
        <div className="mt-6 pt-5 border-t border-brand-gold/20">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-brand-dark to-[#101314] border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="text-left rtl:text-right">
                <h4 className="text-xs font-semibold text-[#fdf1c2]">
                  {language === 'ar' ? 'أول مرة تسجل الدخول؟' : 'First Time Logging In?'}
                </h4>
                <p className="text-[11px] text-brand-muted/80">
                  {language === 'ar'
                    ? 'استلم كلمة المرور المؤقتة على الواتساب وفعّل بطاقتك الآن.'
                    : 'Get your temporary password on WhatsApp and set your password.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openFirstTimeModal}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition whitespace-nowrap"
            >
              {language === 'ar' ? 'تفعيل البطاقة عبر الواتساب' : 'Activate via WhatsApp'}
            </button>
          </div>
        </div>


        {/* Security Assurance Footer */}
        <div className="mt-5 pt-4 border-t border-brand-gold/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-brand-muted/70">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>{language === 'ar' ? 'تشفير Argon2 مع عزل تام للجداول' : 'Argon2 Encrypted Schedule Isolation'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-brand-gold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'خدمة الواتساب المباشرة متصلة' : 'Direct WhatsApp Service Connected'}</span>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL 1: FIRST TIME SETUP VIA WHATSAPP                                    */}
      {/* -------------------------------------------------------------------------- */}
      {modalMode === 'first_time' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-[#101314] border border-emerald-500/40 rounded-3xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.9)] relative">
            <button
              onClick={() => setModalMode('none')}
              className="absolute top-5 right-5 rtl:right-auto rtl:left-5 text-brand-muted hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-serif text-[#fdf1c2]">
                  {language === 'ar' ? 'تفعيل البطاقة لأول مرة' : 'First-Time Card Activation'}
                </h3>
                <p className="text-[11px] text-brand-muted">
                  {language === 'ar' ? 'خطوات التفعيل عبر الواتساب' : 'WhatsApp temporary password verification'}
                </p>
              </div>
            </div>

            {ftStep === 1 && (
              <form onSubmit={handleRequestFtPassword} className="space-y-4">
                <p className="text-xs text-brand-muted leading-relaxed">
                  {language === 'ar'
                    ? 'أدخل كود بطاقتك وسنرسل لك كلمة مرور مؤقتة فوراً عبر تطبيق الواتساب المسجل لدينا.'
                    : 'Enter your card code to receive your temporary first-time password on WhatsApp.'}
                </p>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-brand-gold">
                    {language === 'ar' ? 'كود البطاقة' : 'Card Code'}
                  </label>
                  <input
                    type="text"
                    required
                    value={ftCardCode}
                    onChange={(e) => setFtCardCode(e.target.value)}
                    placeholder="ETOILE-892102 / INS-01"
                    className="w-full form-gold-input px-4 py-2.5 rounded-xl text-sm bg-[#0a0d0e] text-[#fdf1c2] border border-brand-gold/40 font-mono tracking-wider"
                  />
                </div>

                {ftError && (
                  <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs">
                    {ftError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={ftLoading}
                  className="w-full py-3 rounded-xl font-semibold text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {ftLoading ? (
                    <span>{language === 'ar' ? 'جارٍ الإرسال...' : 'Sending to WhatsApp...'}</span>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4" />
                      <span>{language === 'ar' ? 'إرسال كلمة المرور عبر الواتساب' : 'Send Password on WhatsApp'}</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {ftStep === 2 && (
              <form onSubmit={handleCompleteFtSetup} className="space-y-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {language === 'ar'
                      ? `تم إرسال كلمة المرور لرقم الواتساب: ${ftMaskedPhone}`
                      : `Temporary password dispatched to WhatsApp: ${ftMaskedPhone}`}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-brand-gold">
                    {language === 'ar' ? 'كلمة المرور المؤقتة المستلمة' : 'Temporary Password Received'}
                  </label>
                  <input
                    type="text"
                    required
                    value={ftTempPassword}
                    onChange={(e) => setFtTempPassword(e.target.value)}
                    placeholder="ETOILE-XXXX"
                    className="w-full form-gold-input px-4 py-2.5 rounded-xl text-sm bg-[#0a0d0e] text-[#fdf1c2] border border-brand-gold/40 font-mono tracking-wider"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-brand-gold">
                    {language === 'ar' ? 'كلمة المرور الجديدة الدائمة' : 'New Permanent Password'}
                  </label>
                  <input
                    type="password"
                    required
                    value={ftNewPassword}
                    onChange={(e) => setFtNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full form-gold-input px-4 py-2.5 rounded-xl text-sm bg-[#0a0d0e] text-[#fdf1c2] border border-brand-gold/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-brand-gold">
                    {language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                  </label>
                  <input
                    type="password"
                    required
                    value={ftConfirmPassword}
                    onChange={(e) => setFtConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full form-gold-input px-4 py-2.5 rounded-xl text-sm bg-[#0a0d0e] text-[#fdf1c2] border border-brand-gold/40"
                  />
                </div>

                {ftError && (
                  <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs">
                    {ftError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={ftLoading}
                  className="gold-btn w-full py-3 rounded-xl font-semibold text-xs sm:text-sm text-black flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {ftLoading ? (
                    <span>{language === 'ar' ? 'جارٍ حفظ وتفعيل الحساب...' : 'Activating Card...'}</span>
                  ) : (
                    <>
                      <span>{language === 'ar' ? 'حفظ كلمة المرور والدخول للبوابة' : 'Save & Enter Portal'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL 2: FORGOT PASSWORD VIA WHATSAPP OTP                                  */}
      {/* -------------------------------------------------------------------------- */}
      {modalMode === 'forgot_password' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-[#101314] border border-brand-gold/40 rounded-3xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.9)] relative">
            <button
              onClick={() => setModalMode('none')}
              className="absolute top-5 right-5 rtl:right-auto rtl:left-5 text-brand-muted hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center text-brand-gold">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-serif text-[#fdf1c2]">
                  {language === 'ar' ? 'استعادة كلمة المرور عبر الواتساب' : 'Reset Password with WhatsApp OTP'}
                </h3>
                <p className="text-[11px] text-brand-muted">
                  {language === 'ar' ? 'رمز الأمان السري المكون من 6 أرقام' : '6-Digit secure one-time passcode'}
                </p>
              </div>
            </div>

            {fpStep === 1 && (
              <form onSubmit={handleRequestFpOtp} className="space-y-4">
                <p className="text-xs text-brand-muted leading-relaxed">
                  {language === 'ar'
                    ? 'أدخل كود بطاقتك وسنرسل لك رمز OTP مكوناً من 6 أرقام على رقم الواتساب المسجل لدينا.'
                    : 'Enter your card code to receive a 6-digit verification OTP on your registered WhatsApp.'}
                </p>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-brand-gold">
                    {language === 'ar' ? 'كود البطاقة' : 'Card Code'}
                  </label>
                  <input
                    type="text"
                    required
                    value={fpCardCode}
                    onChange={(e) => setFpCardCode(e.target.value)}
                    placeholder="ETOILE-892101 / INS-01"
                    className="w-full form-gold-input px-4 py-2.5 rounded-xl text-sm bg-[#0a0d0e] text-[#fdf1c2] border border-brand-gold/40 font-mono tracking-wider"
                  />
                </div>

                {fpError && (
                  <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs">
                    {fpError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={fpLoading}
                  className="w-full py-3 rounded-xl font-semibold text-xs sm:text-sm bg-brand-gold hover:bg-[#e4be78] text-black flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {fpLoading ? (
                    <span>{language === 'ar' ? 'جارٍ إرسال رمز OTP...' : 'Dispatching OTP...'}</span>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4" />
                      <span>{language === 'ar' ? 'إرسال رمز OTP عبر الواتساب' : 'Send OTP on WhatsApp'}</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {fpStep === 2 && (
              <form onSubmit={handleCompleteFpReset} className="space-y-4">
                <div className="p-3 rounded-xl bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {language === 'ar'
                      ? `تم إرسال رمز OTP للرقم: ${fpMaskedPhone}`
                      : `6-Digit OTP sent to WhatsApp: ${fpMaskedPhone}`}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-brand-gold">
                    {language === 'ar' ? 'رمز OTP (6 أرقام)' : '6-Digit OTP Code'}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={fpOtp}
                    onChange={(e) => setFpOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full form-gold-input px-4 py-2.5 rounded-xl text-lg tracking-widest text-center bg-[#0a0d0e] text-[#fdf1c2] border border-brand-gold/40 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-brand-gold">
                    {language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
                  </label>
                  <input
                    type="password"
                    required
                    value={fpNewPassword}
                    onChange={(e) => setFpNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full form-gold-input px-4 py-2.5 rounded-xl text-sm bg-[#0a0d0e] text-[#fdf1c2] border border-brand-gold/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-brand-gold">
                    {language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                  </label>
                  <input
                    type="password"
                    required
                    value={fpConfirmPassword}
                    onChange={(e) => setFpConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full form-gold-input px-4 py-2.5 rounded-xl text-sm bg-[#0a0d0e] text-[#fdf1c2] border border-brand-gold/40"
                  />
                </div>

                {fpError && (
                  <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs">
                    {fpError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={fpLoading}
                  className="gold-btn w-full py-3 rounded-xl font-semibold text-xs sm:text-sm text-black flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {fpLoading ? (
                    <span>{language === 'ar' ? 'جارٍ إعادة التعيين...' : 'Resetting Password...'}</span>
                  ) : (
                    <>
                      <span>{language === 'ar' ? 'تغيير كلمة المرور وتأكيد الحساب' : 'Reset Password & Save'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

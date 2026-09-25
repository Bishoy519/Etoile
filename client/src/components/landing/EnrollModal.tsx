import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { rawApi } from '../../utils/api';
import { X, Loader2, Sparkles, Send } from 'lucide-react';
import confetti from 'canvas-confetti';

interface EnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProgram?: string;
  defaultCourseCode?: string;
  defaultCourseTitle?: string;
}

export const EnrollModal: React.FC<EnrollModalProps> = ({
  isOpen,
  onClose,
  defaultProgram = 'classical',
  defaultCourseCode,
  defaultCourseTitle,
}) => {
  const { language, showToast, playAudioChime, portalContent } = useApp();

  const [name, setName] = useState('');
  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('12');
  const [program, setProgram] = useState(defaultProgram);
  const [division, setDivision] = useState('pre-pro');
  const [experience, setExperience] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [errors, setErrors] = useState<{ name?: string; parentName?: string; email?: string; phone?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync program with defaultProgram whenever modal opens
  React.useEffect(() => {
    if (isOpen) {
      setProgram(defaultProgram);
    }
  }, [isOpen, defaultProgram]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const newErrors: { name?: string; parentName?: string; email?: string; phone?: string } = {};

    if (!name.trim()) {
      newErrors.name = language === 'ar' ? 'يرجى كتابة اسم الطالب بالكامل' : 'Please enter student full name';
    }
    if (!parentName.trim()) {
      newErrors.parentName = language === 'ar' ? 'يرجى كتابة اسم ولي الأمر' : 'Please enter parent/guardian name';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      newErrors.email = language === 'ar' ? 'يرجى كتابة بريد إلكتروني صحيح' : 'Please enter a valid email address';
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!phone.trim() || cleanPhone.length < 7) {
      newErrors.phone = language === 'ar' ? 'يرجى كتابة رقم هاتف صالح للتواصل' : 'Please enter a valid contact phone number';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      const parsedAge = parseInt(age, 10);
      const source = (window.location.pathname || 'landing') + (defaultCourseCode ? `:${defaultCourseCode}` : '');
      await rawApi.post('/api/leads', {
        dancerName: name.trim(),
        age: !isNaN(parsedAge) && parsedAge > 0 ? parsedAge : 12,
        parentName: parentName.trim(),
        parentPhone: phone.trim(),
        parentEmail: email.trim(),
        program,
        division,
        experience: experience.trim(),
        notes: `Web Admission Application: Division ${division}.${defaultCourseCode ? ` [Target Class: ${defaultCourseCode}${defaultCourseTitle ? ` - ${defaultCourseTitle}` : ''}]` : ''} Age: ${age}. Experience: ${experience.trim() || 'None provided'} Source: ${source}`,
        ...(referralCode.trim() ? { referralCode: referralCode.trim().toUpperCase() } : {}),
      });
    } catch (err) {
      const msg = language === 'ar' ? 'تعذر إرسال الطلب. تحقق من الاتصال وحاول مجدداً.' : 'Could not submit application. Check connection and try again.';
      setSubmitError(msg);
      showToast(language === 'ar' ? 'فشل الإرسال' : 'Submission failed', msg, 'error');
      setIsSubmitting(false);
      return;
    }
      setIsSubmitting(false);
      playAudioChime('success');

      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#e2be68', '#fdf1c2', '#b5832a', '#ffffff'],
        });
      } catch {
        // Confetti optional
      }

      showToast(
        language === 'ar' ? 'تم استلام طلب التسجيل بنجاح' : 'Enrollment Application Received',
        language === 'ar'
          ? `أهلاً بك يا ${name}. سيتواصل معك قسم القبول الفني خلال 24 ساعة لتحديد موعد اختبار المستوى.${defaultCourseCode ? ` (الحصة المطلوبة: ${defaultCourseCode})` : ''}`
          : `Welcome ${name}. Our admissions director will reach out within 24 hours to schedule your placement audition.${defaultCourseCode ? ` (Selected Class: ${defaultCourseCode})` : ''}`,
        'success'
      );

      // Reset form & close
      setName('');
      setParentName('');
      setEmail('');
      setPhone('');
      setExperience('');
      setReferralCode('');
      setSubmitError(null);
      onClose();
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={language === 'ar' ? 'طلب الالتحاق' : 'Enrollment'} className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-[#101314] w-full max-w-xl rounded-2xl overflow-hidden border border-brand-gold/60 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_50px_rgba(226,190,104,0.25)] flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-brand-gold/20 flex items-center justify-between bg-[#14181a]">
          <div className="flex items-center gap-3">
            <img
              src="/etoile-wordmark-logo.png"
              alt="Étoile Ballet Academy"
              className="h-10 w-auto object-contain drop-shadow"
            />
            <div className="border-l border-brand-gold/30 pl-3">
              <h3 className="font-serif text-2xl gold-text-gradient uppercase tracking-wider">
                {language === 'ar' ? 'طلب الالتحاق بالأكاديمية' : 'Academy Enrollment'}
              </h3>
              <span className="text-xs text-brand-gold/70">
                {language === 'ar' ? 'ابدأ مسيرتك الفنية في إيتوال' : 'Begin your artistic journey at Étoile'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-brand-gold/70 hover:text-brand-gold-light w-8 h-8 rounded-full border border-brand-gold/30 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 overflow-y-auto space-y-4">
          {defaultCourseCode && (
            <div className="p-3 rounded-xl bg-brand-gold/10 border border-brand-gold/40 flex items-center gap-2 text-xs text-brand-gold">
              <Sparkles className="w-4 h-4 text-brand-gold shrink-0" />
              <span>
                {language === 'ar' ? 'المجموعة التدريبية المختارة:' : 'Selected Class / Group:'}{' '}
                <strong className="text-white font-semibold">{defaultCourseCode} {defaultCourseTitle ? `• ${defaultCourseTitle}` : ''}</strong>
              </span>
            </div>
          )}

          <div>
            <label htmlFor="enroll-student-name" className="block text-xs uppercase tracking-wider text-brand-gold mb-1">
              {language === 'ar' ? 'اسم الطالب بالكامل *' : 'Student Full Name *'}
            </label>
            <input
              id="enroll-student-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={language === 'ar' ? 'مثال: نورهان عادل' : 'e.g. Clara Danvers'}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'enroll-student-name-err' : undefined}
              className="form-gold-input w-full px-4 py-2.5 rounded-lg text-sm"
            />
            {errors.name && <span id="enroll-student-name-err" role="alert" className="text-[11px] text-red-400 mt-1 block">{errors.name}</span>}
          </div>
          <div>
            <label htmlFor="enroll-parent-name" className="block text-xs uppercase tracking-wider text-brand-gold mb-1">
              {language === 'ar' ? 'اسم ولي الأمر *' : 'Parent / Guardian Name *'}
            </label>
            <input
              id="enroll-parent-name"
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder={language === 'ar' ? 'مثال: أحمد عادل' : 'e.g. Adam Danvers'}
              aria-invalid={!!errors.parentName}
              aria-describedby={errors.parentName ? 'enroll-parent-name-err' : undefined}
              className="form-gold-input w-full px-4 py-2.5 rounded-lg text-sm"
            />
            {errors.parentName && <span id="enroll-parent-name-err" role="alert" className="text-[11px] text-red-400 mt-1 block">{errors.parentName}</span>}
          </div>
          {submitError && <div role="alert" className="p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-xs text-red-300">{submitError}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="enroll-email" className="block text-xs uppercase tracking-wider text-brand-gold mb-1">
                {language === 'ar' ? 'البريد الإلكتروني *' : 'Email Address *'}
              </label>
              <input
                id="enroll-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                aria-invalid={!!errors.email}
                className="form-gold-input w-full px-4 py-2.5 rounded-lg text-sm"
              />
              {errors.email && <span role="alert" className="text-[11px] text-red-400 mt-1 block">{errors.email}</span>}
            </div>

            <div>
              <label htmlFor="enroll-phone" className="block text-xs uppercase tracking-wider text-brand-gold mb-1">
                {language === 'ar' ? 'رقم الهاتف للتواصل *' : 'Phone Number *'}
              </label>
              <input
                id="enroll-phone"
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+20 100 000 0000"
                aria-invalid={!!errors.phone}
                className="form-gold-input w-full px-4 py-2.5 rounded-lg text-sm"
              />
              {errors.phone && <span role="alert" className="text-[11px] text-red-400 mt-1 block">{errors.phone}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-brand-gold mb-1">
                {language === 'ar' ? 'البرنامج المطلوب *' : 'Program of Interest *'}
              </label>
              <select
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className="form-gold-input w-full px-4 py-2.5 rounded-lg text-sm bg-[#101314] cursor-pointer"
              >
                {portalContent?.programs?.length > 0 ? (
                  portalContent.programs.map((p) => (
                    <option key={p.key || p.id} value={p.key || p.id}>
                      {language === 'ar' ? p.titleAr : p.title}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="classical">{language === 'ar' ? 'الباليه الكلاسيكي' : 'Classical Ballet'}</option>
                    <option value="contemporary">{language === 'ar' ? 'الرقص المعاصر' : 'Contemporary Dance'}</option>
                    <option value="youth">{language === 'ar' ? 'برنامج الناشئين' : 'Youth Program'}</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-brand-gold mb-1">
                {language === 'ar' ? 'عمر الطالب' : 'Student Age'}
              </label>
              <input
                type="number"
                min="3"
                max="99"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="12"
                className="form-gold-input w-full px-4 py-2.5 rounded-lg text-sm bg-[#101314]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-brand-gold mb-1">
                {language === 'ar' ? 'المرحلة العمرية' : 'Age Division'}
              </label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="form-gold-input w-full px-4 py-2.5 rounded-lg text-sm bg-[#101314] cursor-pointer"
              >
                <option value="youth">{language === 'ar' ? 'قسم الناشئين (5–11 سنة)' : 'Youth Division (Ages 5–11)'}</option>
                <option value="junior">{language === 'ar' ? 'قسم اليافعين (12–15 سنة)' : 'Junior Division (Ages 12–15)'}</option>
                <option value="pre-pro">{language === 'ar' ? 'ما قبل الاحتراف (16–22 سنة)' : 'Pre-Professional (Ages 16–22)'}</option>
                <option value="adult">{language === 'ar' ? 'كونسرفتوار الكبار المفتوح' : 'Adult Open Conservatory'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-brand-gold mb-1">
              {language === 'ar' ? 'الخبرة السابقة وملاحظات تجربة الأداء' : 'Prior Experience / Audition Notes'}
            </label>
            <textarea
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              rows={3}
              placeholder={language === 'ar' ? 'سنوات التدريب المسبقة، الأكاديميات السابقة، أو مستوى البوانت...' : 'Years of prior training, studios attended, or pointe level...'}
              className="form-gold-input w-full px-4 py-2.5 rounded-lg text-sm resize-none"
            />
          </div>

          <div>
            <label htmlFor="enroll-referral" className="block text-xs uppercase tracking-wider text-brand-gold mb-1">
              {language === 'ar' ? 'كود الإحالة (اختياري)' : 'Referral Code (optional)'}
            </label>
            <input
              id="enroll-referral"
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="ETL-XXXX-XXXX"
              dir="ltr"
              className="form-gold-input w-full px-4 py-2.5 rounded-lg text-sm font-mono"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-brand-gold/20 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-xs tracking-wider text-brand-muted/70 hover:text-brand-muted transition"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="gold-btn px-8 py-3 rounded-lg text-black font-serif text-sm font-semibold tracking-wider flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === 'ar' ? 'جارٍ الإرسال...' : 'Submitting...'}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{language === 'ar' ? 'تقديم طلب الالتحاق' : 'Submit Application'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

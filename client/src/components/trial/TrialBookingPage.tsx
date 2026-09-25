import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { rawApi, errMsg } from '../../utils/api';
import { ArrowLeft, CalendarCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { TestimonialsStrip } from './TestimonialsStrip';

interface SlotDay {
  date: string;
  label: string;
  times: string[];
}

export const TrialBookingPage: React.FC = () => {
  const { language, setActiveView, showToast, portalContent } = useApp();
  const [days, setDays] = useState<SlotDay[]>([]);
  const [program, setProgram] = useState('classical');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('7');
  const [referralCode, setReferralCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ slot: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await rawApi.get('/api/leads/trial-slots');
        setDays(data.days || []);
        if (data.days?.[0]) {
          setDate(data.days[0].date);
          setTime(data.days[0].times[0]);
        }
      } catch {
        // offline — form stays disabled with notice
      }
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = language === 'ar' ? 'اسم الطالب مطلوب' : 'Student name required';
    if (!parentName.trim()) errs.parentName = language === 'ar' ? 'اسم ولي الأمر مطلوب' : 'Parent name required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = language === 'ar' ? 'بريد غير صالح' : 'Invalid email';
    if (phone.replace(/[^0-9]/g, '').length < 7) errs.phone = language === 'ar' ? 'هاتف غير صالح' : 'Invalid phone';
    if (!date || !time) errs.slot = language === 'ar' ? 'اختاري الموعد' : 'Pick a slot';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const { data: body } = await rawApi.post('/api/leads/trial', {
        dancerName: name.trim(),
        age: Math.max(3, parseInt(age, 10) || 7),
        parentName: parentName.trim(),
        parentPhone: phone.trim(),
        parentEmail: email.trim(),
        program,
        preferredSlot: new Date(`${date}T${time}:00`).toISOString(),
        ...(referralCode.trim() ? { referralCode: referralCode.trim().toUpperCase() } : {}),
      });
      if (referralCode.trim() && !body.referralAccepted) {
        showToast(
          language === 'ar' ? 'كود الإحالة غير صالح' : 'Referral code not recognized',
          language === 'ar' ? 'تم الحجز بدونه — تحققي من الكود مع صديقتك.' : 'Booked without it — double-check the code with your friend.',
          'warning',
        );
      }
      setDone({ slot: `${date} ${time}` });
      showToast(
        language === 'ar' ? 'تم حجز الحصة التجريبية' : 'Trial booked',
        body.deduped
          ? (language === 'ar' ? 'لديك طلب مفتوح بالفعل — أبقينا عليه.' : 'You already have an open application — we kept it.')
          : (language === 'ar' ? 'سنؤكد عبر واتساب خلال 24 ساعة.' : 'We confirm on WhatsApp within 24 hours.'),
        'success',
      );
    } catch (err) {
      showToast(language === 'ar' ? 'فشل الحجز' : 'Booking failed', errMsg(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const day = days.find((d) => d.date === date);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <button onClick={() => setActiveView('classes')} className="text-xs text-brand-gold/70 hover:text-brand-gold mb-4 flex items-center gap-1">
        <ArrowLeft className="w-3 h-3 rtl:rotate-180" /> {language === 'ar' ? 'الحصص' : 'Classes'}
      </button>
      <h1 className="font-serif text-4xl gold-text-gradient mb-2">{language === 'ar' ? 'احجزي حصة تجريبية مجانية' : 'Book a Free Trial Class'}</h1>
      <p className="text-sm text-brand-muted mb-6">{language === 'ar' ? 'اختاري اليوم والوقت المناسبين — التأكيد عبر واتساب.' : 'Pick a day and time — confirmation arrives on WhatsApp.'}</p>

      {done ? (
        <div className="gold-card rounded-2xl p-10 text-center space-y-3" role="status">
          <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto" />
          <h2 className="font-serif text-2xl text-white">{language === 'ar' ? 'تم استلام طلبك' : 'Request received'}</h2>
          <p className="text-sm text-brand-muted" dir="ltr">{done.slot} (Africa/Cairo)</p>
          <button onClick={() => setActiveView('classes')} className="gold-btn px-6 py-2.5 rounded-xl text-black text-xs font-bold">
            {language === 'ar' ? 'عودة للحصص' : 'Back to classes'}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="gold-card rounded-2xl p-5 sm:p-7 space-y-5">
          <div>
            <label htmlFor="trial-program" className="block text-xs uppercase tracking-wider text-brand-gold mb-1">
              {language === 'ar' ? 'البرنامج' : 'Program'}
            </label>
            <select id="trial-program" value={program} onChange={(e) => setProgram(e.target.value)} className="form-gold-input w-full px-4 py-2.5 rounded-lg text-sm bg-[#101314]">
              {(portalContent?.programs?.length ? portalContent.programs.map((p) => ({ v: p.key || p.id, en: p.title, ar: p.titleAr })) : [
                { v: 'classical', en: 'Classical Ballet', ar: 'الباليه الكلاسيكي' },
                { v: 'contemporary', en: 'Contemporary Dance', ar: 'الرقص المعاصر' },
                { v: 'youth', en: 'Youth Program', ar: 'برنامج الناشئين' },
              ]).map((p) => (
                <option key={p.v} value={p.v}>{language === 'ar' ? p.ar : p.en}</option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-xs uppercase tracking-wider text-brand-gold mb-2">{language === 'ar' ? 'اليوم' : 'Day'}</span>
            {days.length === 0 ? (
              <p className="text-xs text-brand-muted">{language === 'ar' ? 'تعذر تحميل المواعيد — تحققي من الاتصال.' : 'Could not load slots — check connection.'}</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Day">
                {days.map((d) => (
                  <button
                    key={d.date}
                    type="button"
                    role="radio"
                    aria-checked={date === d.date}
                    onClick={() => { setDate(d.date); setTime(d.times[0]); }}
                    className={`px-2 py-2.5 rounded-xl border text-xs font-semibold transition ${date === d.date ? 'border-brand-gold bg-brand-gold text-black' : 'border-brand-gold/30 text-brand-gold hover:bg-brand-gold/10'}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {day && (
            <div>
              <span className="block text-xs uppercase tracking-wider text-brand-gold mb-2">{language === 'ar' ? 'الوقت (بتوقيت القاهرة)' : 'Time (Cairo)'}</span>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Time">
                {day.times.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={time === t}
                    onClick={() => setTime(t)}
                    className={`px-4 py-2 rounded-xl border text-sm font-mono transition ${time === t ? 'border-brand-gold bg-brand-gold text-black font-bold' : 'border-brand-gold/30 text-brand-gold hover:bg-brand-gold/10'}`}
                  >
                    <span dir="ltr">{t}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {errors.slot && <p role="alert" className="text-[11px] text-red-400">{errors.slot}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="trial-name" className="block text-xs uppercase tracking-wider text-brand-gold mb-1">{language === 'ar' ? 'اسم الطالب *' : 'Student name *'}</label>
              <input id="trial-name" value={name} onChange={(e) => setName(e.target.value)} className="form-gold-input w-full px-4 py-2.5 rounded-lg text-sm" aria-invalid={!!errors.name} />
              {errors.name && <p role="alert" className="text-[11px] text-red-400 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="trial-parent" className="block text-xs uppercase tracking-wider text-brand-gold mb-1">{language === 'ar' ? 'اسم ولي الأمر *' : 'Parent name *'}</label>
              <input id="trial-parent" value={parentName} onChange={(e) => setParentName(e.target.value)} className="form-gold-input w-full px-4 py-2.5 rounded-lg text-sm" aria-invalid={!!errors.parentName} />
              {errors.parentName && <p role="alert" className="text-[11px] text-red-400 mt-1">{errors.parentName}</p>}
            </div>
            <div>
              <label htmlFor="trial-email" className="block text-xs uppercase tracking-wider text-brand-gold mb-1">{language === 'ar' ? 'البريد *' : 'Email *'}</label>
              <input id="trial-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-gold-input w-full px-4 py-2.5 rounded-lg text-sm" aria-invalid={!!errors.email} />
              {errors.email && <p role="alert" className="text-[11px] text-red-400 mt-1">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="trial-phone" className="block text-xs uppercase tracking-wider text-brand-gold mb-1">{language === 'ar' ? 'الهاتف *' : 'Phone *'}</label>
              <input id="trial-phone" type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} className="form-gold-input w-full px-4 py-2.5 rounded-lg text-sm" aria-invalid={!!errors.phone} />
              {errors.phone && <p role="alert" className="text-[11px] text-red-400 mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label htmlFor="trial-age" className="block text-xs uppercase tracking-wider text-brand-gold mb-1">{language === 'ar' ? 'العمر' : 'Age'}</label>
              <input id="trial-age" type="number" min={3} max={99} value={age} onChange={(e) => setAge(e.target.value)} className="form-gold-input w-full px-4 py-2.5 rounded-lg text-sm bg-[#101314]" />
            </div>
            <div>
              <label htmlFor="trial-referral" className="block text-xs uppercase tracking-wider text-brand-gold mb-1">{language === 'ar' ? 'كود الإحالة (اختياري)' : 'Referral code (optional)'}</label>
              <input id="trial-referral" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} placeholder="ETL-XXXX-XXXX" dir="ltr" className="form-gold-input w-full px-4 py-2.5 rounded-lg text-sm font-mono bg-[#101314]" />
            </div>
          </div>

          <button type="submit" disabled={submitting || days.length === 0} className="gold-btn w-full py-3.5 rounded-xl text-black font-serif text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4" />}
            {language === 'ar' ? 'تأكيد الحجز' : 'Confirm booking'}
          </button>
        </form>
      )}

      <TestimonialsStrip />
    </div>
  );
};

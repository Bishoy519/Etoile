import React from 'react';
import { useApp } from '../../context/AppContext';

function LegalShell({ title, titleAr, children }: { title: string; titleAr: string; children: React.ReactNode }) {
  const { language, setActiveView } = useApp();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <button onClick={() => setActiveView('landing')} className="text-xs text-brand-gold/70 hover:text-brand-gold mb-6">
        {language === 'ar' ? '← عودة للرئيسية' : '← Back to Home'}
      </button>
      <h1 className="font-serif text-3xl gold-text-gradient mb-6">{language === 'ar' ? titleAr : title}</h1>
      <div className="space-y-4 text-sm text-brand-muted leading-relaxed">{children}</div>
    </div>
  );
}

export const PrivacyPage: React.FC = () => {
  const { language } = useApp();
  return (
    <LegalShell title="Privacy Policy" titleAr="سياسة الخصوصية">
      <p>{language === 'ar' ? 'نحترم خصوصية عائلات إيتوال. تُستخدم بيانات الطلاب وأولياء الأمور لإدارة الحصص والفوترة والتواصل عبر واتساب فقط.' : 'We respect Étoile families privacy. Student and parent data is used only for class management, billing, and WhatsApp communication.'}</p>
      <p>{language === 'ar' ? 'لا نشارك البيانات مع أطراف ثالثة لأغراض تسويقية. يمكنك طلب تصدير أو حذف بياناتك عبر مكتب الاستقبال.' : 'We never sell data. You may request export or deletion via reception.'}</p>
      <p>{language === 'ar' ? 'المدفوعات تتم عبر بوابات معتمدة (Paymob/Fawry/InstaPay) ولا نخزن بيانات البطاقات.' : 'Payments use certified gateways (Paymob/Fawry/InstaPay). We never store card numbers.'}</p>
    </LegalShell>
  );
};

export const TermsPage: React.FC = () => {
  const { language } = useApp();
  return (
    <LegalShell title="Terms of Service" titleAr="الشروط والأحكام">
      <p>{language === 'ar' ? 'بالالتحاق بأكاديمية إيتوال فإنك توافق على سياسة الحضور والحصص والاسترداد الموضحة من الإدارة.' : 'By enrolling at Étoile you agree to attendance, quota, billing and refund policies issued by management.'}</p>
      <p>{language === 'ar' ? 'الحصص غير المستخدمة بعد انتهاء الاشتراك لا تُسترد إلا بقرار إداري. إلغاء الفواتير المدفوعة يتطلب إشعار دائن.' : 'Unused sessions after expiry are non-refundable except by management decision. Paid invoices need a credit note to cancel.'}</p>
      <p>{language === 'ar' ? 'أي إساءة استخدام لنظام الحضور أو المحفظة قد تؤدي لتعليق الحساب.' : 'Misuse of check-in or wallet may suspend the account.'}</p>
    </LegalShell>
  );
};

export const FaqPage: React.FC = () => {
  const { language, setActiveView, portalContent } = useApp();
  const sections: { title: string; items: { q: string; a: string }[] }[] = language === 'ar' ? [
    {
      title: 'التسجيل والحصة التجريبية',
      items: [
        { q: 'كيف أسجل لاختبار المستوى؟', a: 'افتح نموذج الالتحاق من الرئيسية وسنتواصل خلال 24 ساعة.' },
        { q: 'كيف أحجز حصة تجريبية؟', a: 'من صفحة الحصص اضغطي "حصة تجريبية مجانية" واختاري اليوم والوقت — التأكيد عبر واتساب.' },
        { q: 'هل لدي كود إحالة؟', a: 'أدخليه في نموذج الحجز. إذا لم يُقبل ستحجزين بدونه وسننبهك.' },
      ],
    },
    {
      title: 'الفواتير والدفع',
      items: [
        { q: 'كيف أدفع الفواتير أونلاين؟', a: 'من بوابة ولي الأمر افتحي الفواتير ثم ادفعي عبر رابط Paymob/Fawry/InstaPay.' },
        { q: 'ماذا لو انتهت حصصي؟', a: 'ستصلك رسالة واتساب عند بقاء حصتين. جددي من الاستقبال أو أونلاين.' },
        { q: 'ما هو رصيد المحفظة السالب؟', a: 'يسمح المتجر بالشراء بالأجل حتى حدّك الائتماني، ويظهر كدين يُسدد لاحقاً.' },
      ],
    },
    {
      title: 'الحساب والمستندات',
      items: [
        { q: 'كيف أؤمّن حساب عائلتي؟', a: 'من بطاقة "ابدئي رحلتك" في البوابة عيّني رمز PIN من 4–12 أرقام.' },
        { q: 'ما المستندات المطلوبة؟', a: 'موافقة ولي الأمر وتقرير طبي (PDF/JPG/PNG حتى 4MB) من قسم المستندات — مطلوبة قبل العروض.' },
        { q: 'كيف أبدّل بين أطفالي؟', a: 'من شرائح الأبناء أعلى البوابة — النقطة الملونة توضح الحصص المتبقية لكل طفل.' },
      ],
    },
    {
      title: 'التطبيق والتواصل',
      items: [
        { q: 'هل يوجد تطبيق للجوال؟', a: 'البوابة تطبيق ويب سريع ثنائي اللغة يعمل دون تثبيت، مع دعم القراءة دون اتصال.' },
        { q: 'أين أجد الإشعارات؟', a: 'جرس الإشعارات أعلى الصفحة يجمع رسائل واتساب والفواتير والحصص القادمة.' },
      ],
    },
  ] : [
    {
      title: 'Enrollment & trial',
      items: [
        { q: 'How do I book a placement audition?', a: 'Open Enroll from home — admissions replies within 24h.' },
        { q: 'How do I book a free trial?', a: 'From Classes tap "free trial class", pick a day and time — confirmation arrives on WhatsApp.' },
        { q: 'I have a referral code?', a: 'Enter it in the booking form. If unrecognized you still book, with a warning.' },
      ],
    },
    {
      title: 'Billing & payment',
      items: [
        { q: 'How do I pay invoices online?', a: 'From the parent portal open Invoices then pay via Paymob/Fawry/InstaPay link.' },
        { q: 'What if my quota runs out?', a: 'You get WhatsApp at 2 remaining. Renew at reception or online.' },
        { q: 'What is a negative wallet balance?', a: 'The boutique allows debt purchases up to your credit limit, shown as debt to settle later.' },
      ],
    },
    {
      title: 'Account & documents',
      items: [
        { q: 'How do I secure my family account?', a: 'From the "Getting started" card set a 4–12 digit portal PIN.' },
        { q: 'Which documents are required?', a: 'Guardian consent + medical report (PDF/JPG/PNG up to 4MB) in Documents — needed before stage shows.' },
        { q: 'How do I switch children?', a: 'Use the dancer chips atop the portal — the dot shows each child’s remaining sessions.' },
      ],
    },
    {
      title: 'App & contact',
      items: [
        { q: 'Is there a mobile app?', a: 'The portal is a fast bilingual web app with offline reading — no install needed.' },
        { q: 'Where are my notifications?', a: 'The bell atop the page merges WhatsApp messages, invoices and upcoming classes.' },
      ],
    },
  ];
  const branding = portalContent?.branding;
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <button onClick={() => setActiveView('landing')} className="text-xs text-brand-gold/70 hover:text-brand-gold mb-6">
        {language === 'ar' ? '← عودة للرئيسية' : '← Back to Home'}
      </button>
      <h1 className="font-serif text-3xl gold-text-gradient mb-2">{language === 'ar' ? 'مركز المساعدة' : 'Help Center'}</h1>
      <p className="text-xs text-brand-muted/70 mb-6">{language === 'ar' ? 'إجابات عن التسجيل والدفع والحساب — وما زلت هنا إن احتجتنا.' : 'Answers on enrollment, billing and accounts — and we’re here if you need us.'}</p>
      <div className="space-y-6">
        {sections.map((sec) => (
          <div key={sec.title}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-gold mb-2">{sec.title}</h2>
            <div className="space-y-2">
              {sec.items.map((it) => (
                <details key={it.q} className="gold-card rounded-xl p-4">
                  <summary className="text-sm font-semibold cursor-pointer">{it.q}</summary>
                  <p className="text-xs text-brand-muted mt-2">{it.a}</p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="gold-card rounded-2xl p-5 mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h3 className="font-serif text-lg text-white">{language === 'ar' ? 'ما زلت تحتاج مساعدة؟' : 'Still need help?'}</h3>
          <p className="text-xs text-brand-muted/70 mt-1" dir="ltr">
            {branding?.phone || ''}{branding?.phone && branding?.email ? ' • ' : ''}{branding?.email || ''}
          </p>
        </div>
        <div className="flex gap-2">
          {branding?.phone && (
            <a href={`https://wa.me/${branding.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="gold-btn px-5 py-2.5 rounded-xl text-black text-xs font-bold">
              WhatsApp
            </a>
          )}
          <button onClick={() => setActiveView('trial')} className="px-5 py-2.5 rounded-xl border border-brand-gold/40 text-brand-gold text-xs font-bold hover:bg-brand-gold/10">
            {language === 'ar' ? 'حصة تجريبية' : 'Free trial'}
          </button>
        </div>
      </div>
    </div>
  );
};

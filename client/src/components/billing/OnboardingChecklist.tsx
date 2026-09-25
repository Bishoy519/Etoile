import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../utils/api';
import { Rocket, Check, Loader2, X } from 'lucide-react';

interface Step {
  id: 'trial' | 'payment' | 'checkin' | 'documents';
  done: boolean;
}

const DISMISS_KEY = 'etoile_onboard_dismissed';

const META: Record<Step['id'], { en: string; ar: string; hintEn: string; hintAr: string }> = {
  trial: {
    en: 'Book a free trial', ar: 'احجزي حصة تجريبية',
    hintEn: 'Try a class before committing — free for new dancers.',
    hintAr: 'جربي حصة قبل الالتزام — مجانية للراقصات الجدد.',
  },
  payment: {
    en: 'Pay your first invoice', ar: 'ادفعي أول فاتورة',
    hintEn: 'Online via Paymob, Fawry or InstaPay.',
    hintAr: 'أونلاين عبر Paymob أو Fawry أو InstaPay.',
  },
  checkin: {
    en: 'Attend your first class', ar: 'احضري أول حصة',
    hintEn: 'Scan the dancer barcode at the front desk.',
    hintAr: 'امسحي باركود الراقصة عند الاستقبال.',
  },
  documents: {
    en: 'Upload consent & medical files', ar: 'ارفعي الموافقة والملف الطبي',
    hintEn: 'Required before stage performances.',
    hintAr: 'مطلوبة قبل العروض المسرحية.',
  },
};

export const OnboardingChecklist: React.FC = () => {
  const { language, setActiveView } = useApp();
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/auth/family/onboarding');
      if (Array.isArray(data.steps)) setSteps(data.steps);
    } catch {
      // offline — hide
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || steps.length === 0) return null;
  const done = steps.filter((s) => s.done).length;
  if (done >= steps.length && dismissed) return null;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cta = (id: Step['id']) => {
    switch (id) {
      case 'trial':
        return { label: language === 'ar' ? 'احجزي' : 'Book', run: () => { setActiveView('trial'); window.scrollTo({ top: 0 }); } };
      case 'payment':
        return { label: language === 'ar' ? 'الفواتير' : 'Billing', run: () => scrollTo('family-billing') };
      case 'documents':
        return { label: language === 'ar' ? 'ارفعي' : 'Upload', run: () => scrollTo('family-documents') };
      default:
        return null;
    }
  };

  return (
    <section aria-label={language === 'ar' ? 'ابدئي هنا' : 'Getting started'} className="gold-card rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-serif text-xl text-[#fdf1c2] flex items-center gap-2">
          <Rocket className="w-5 h-5 text-brand-gold" />
          {language === 'ar' ? 'ابدئي رحلتك' : 'Getting started'}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-brand-muted/70" dir="ltr">{done}/{steps.length}</span>
          {done >= steps.length && (
            <button
              onClick={() => { try { localStorage.setItem(DISMISS_KEY, 'true'); } catch { /* noop */ } setDismissed(true); }}
              className="p-1.5 rounded-lg text-brand-muted/60 hover:text-white" aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden" role="progressbar" aria-valuenow={done} aria-valuemax={steps.length}>
        <div className="h-full bg-brand-gold transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ul className="space-y-2">
        {steps.map((s) => {
          const m = META[s.id];
          if (!m) return null;
          const action = !s.done ? cta(s.id) : null;
          return (
            <li key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border text-xs ${s.done ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-brand-gold/20 bg-black/30'}`}>
              <span className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${s.done ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300' : 'border-brand-gold/40 text-brand-gold'}`}>
                {s.done ? <Check className="w-3.5 h-3.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block font-semibold ${s.done ? 'text-emerald-200 line-through opacity-70' : 'text-white'}`}>
                  {language === 'ar' ? m.ar : m.en}
                </span>
                {!s.done && <span className="block text-[11px] text-brand-muted/60 mt-0.5">{language === 'ar' ? m.hintAr : m.hintEn}</span>}
              </span>
              {action && (
                <button onClick={action.run} className="px-3.5 py-1.5 rounded-lg border border-brand-gold/40 text-brand-gold text-[11px] font-bold hover:bg-brand-gold/10 shrink-0">
                  {action.label}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

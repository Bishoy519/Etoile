import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { rawApi } from '../../utils/api';
import { Star, Quote } from 'lucide-react';

interface Testimonial {
  id: string;
  authorName: string;
  authorRole: string | null;
  text: string;
  textAr: string | null;
  rating: number;
}

/** Public wall of love — social proof at conversion points (trial page). */
export const TestimonialsStrip: React.FC = () => {
  const { language } = useApp();
  const [items, setItems] = useState<Testimonial[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await rawApi.get('/api/testimonials');
        if (Array.isArray(data)) setItems(data.slice(0, 3));
      } catch {
        // offline — hide strip
      }
    })();
  }, []);

  if (items.length === 0) return null;

  return (
    <section aria-label={language === 'ar' ? 'آراء أولياء الأمور' : 'Parent reviews'} className="mt-8">
      <h2 className="font-serif text-2xl gold-text-gradient text-center mb-4">
        {language === 'ar' ? 'ماذا يقول أولياء الأمور' : 'What parents say'}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {items.map((t) => (
          <figure key={t.id} className="gold-card rounded-2xl p-5 flex flex-col gap-2">
            <Quote className="w-4 h-4 text-brand-gold/60" />
            <blockquote className="text-xs text-brand-muted leading-relaxed flex-1">
              {language === 'ar' ? t.textAr || t.text : t.text}
            </blockquote>
            <figcaption>
              <div className="flex items-center gap-0.5 text-amber-300" aria-label={`${t.rating} of 5 stars`}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-3 h-3 ${s <= t.rating ? 'fill-current' : 'opacity-30'}`} />
                ))}
              </div>
              <div className="text-xs font-semibold text-white mt-1">{t.authorName}</div>
              {t.authorRole && <div className="text-[10px] text-brand-muted/60">{t.authorRole}</div>}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
};

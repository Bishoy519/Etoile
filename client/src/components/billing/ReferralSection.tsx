import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../utils/api';
import { Gift, Copy, Share2 } from 'lucide-react';

interface Stats {
  code: string | null;
  pending: number;
  converted: number;
  rewarded: number;
}

export const ReferralSection: React.FC = () => {
  const { language, showToast } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/referrals/mine');
        setStats(data);
      } catch {
        // offline — hide section
      }
    })();
  }, []);

  if (!stats?.code) return null;

  const share = () => {
    const text =
      language === 'ar'
        ? `انضمي لأكاديمية إيتوال بكود الإحالة ${stats.code} واحصلي على حصة تجريبية مجانية!`
        : `Join Étoile Ballet Academy with referral code ${stats.code} for a free trial class!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(stats.code!);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast(language === 'ar' ? 'الكود' : 'Code', stats.code!, 'gold');
    }
  };

  return (
    <section aria-label={language === 'ar' ? 'الإحالات' : 'Referrals'} className="gold-card rounded-2xl p-5 sm:p-6 space-y-3">
      <h3 className="font-serif text-xl text-[#fdf1c2] flex items-center gap-2">
        <Gift className="w-5 h-5 text-brand-gold" />
        {language === 'ar' ? 'ادعي صديقة واكسبي مكافأة' : 'Invite a friend, earn a reward'}
      </h3>
      <p className="text-[11px] text-brand-muted/70">
        {language === 'ar'
          ? 'شاركي كودك — عندما تسجل صديقتك وتلتحق، تحصلين على رصيد محفظة من الإدارة.'
          : 'Share your code — when your friend enrolls, management credits your wallet.'}
      </p>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <code dir="ltr" className="flex-1 text-center font-mono text-lg font-bold text-brand-gold bg-black/50 border border-dashed border-brand-gold/50 rounded-xl px-4 py-2.5">
          {stats.code}
        </code>
        <div className="flex gap-2">
          <button onClick={copy} className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-brand-gold/40 text-brand-gold text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-brand-gold/10">
            <Copy className="w-3.5 h-3.5" /> {copied ? (language === 'ar' ? 'تم' : 'Copied') : (language === 'ar' ? 'نسخ' : 'Copy')}
          </button>
          <button onClick={share} className="gold-btn flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-black text-xs font-bold flex items-center justify-center gap-1.5">
            <Share2 className="w-3.5 h-3.5" /> {language === 'ar' ? 'واتساب' : 'WhatsApp'}
          </button>
        </div>
      </div>
      <div className="flex gap-4 text-[11px] text-brand-muted/70 font-mono" dir="ltr">
        <span>{stats.pending} pending</span>
        <span>{stats.converted} converted</span>
        <span className="text-emerald-300">{stats.rewarded} rewarded</span>
      </div>
    </section>
  );
};

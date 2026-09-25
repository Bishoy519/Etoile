import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../utils/api';
import { Award } from 'lucide-react';

interface Cert {
  id: string;
  title: string;
  titleAr: string | null;
  kind: string;
  meta: string | null;
  issuedBy: string;
  createdAt: string;
}

const KIND_COLOR: Record<string, string> = {
  attendance: 'text-sky-300 border-sky-500/40 bg-sky-500/10',
  evaluation: 'text-violet-300 border-violet-500/40 bg-violet-500/10',
  stage: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  milestone: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
};

export const CertificatesStrip: React.FC<{ studentId: string; studentName: string }> = ({ studentId, studentName }) => {
  const { language } = useApp();
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/students/${studentId}/certificates`);
      setCerts(data);
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="h-20 rounded-2xl bg-white/5 animate-pulse" />;
  if (certs.length === 0) return null;

  return (
    <section aria-label={language === 'ar' ? 'الشهادات' : 'Certificates'} className="gold-card rounded-2xl p-5 sm:p-6 space-y-3">
      <h3 className="font-serif text-xl text-[#fdf1c2] flex items-center gap-2">
        <Award className="w-5 h-5 text-brand-gold" />
        {language === 'ar' ? `إنجازات ${studentName}` : `${studentName}'s achievements`}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {certs.map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-brand-gold/20 bg-black/40">
            <span className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${KIND_COLOR[c.kind] || KIND_COLOR.milestone}`}>
              <Award className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{language === 'ar' ? c.titleAr || c.title : c.title}</div>
              <div className="text-[10px] text-brand-muted/60 mt-0.5">
                {c.kind} • {c.issuedBy} • {new Date(c.createdAt).toLocaleDateString()}
              </div>
              {c.meta && <div className="text-[11px] text-brand-muted/80 truncate">{c.meta}</div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

import React, { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { api, errMsg } from '../utils/api';
import { Cake, Send } from 'lucide-react';

interface Celebration {
  studentId: string;
  name: string;
  kind: string;
  years: number | null;
  date: string;
  sent: boolean;
}

/** Academy-anniversary campaigns: upcoming milestones + one-tap dispatch. */
export const CelebrationsCard: React.FC = () => {
  const { language, showToast } = useAdmin();
  const [items, setItems] = useState<Celebration[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/ops/celebrations?days=30');
      setItems(data.items || []);
    } catch {
      // offline
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (items.length === 0) return null;

  const dispatch = async () => {
    setBusy(true);
    try {
      const { data: body } = await api.post('/api/ops/celebrations/dispatch', { days: 7 });
      showToast(
        language === 'ar' ? 'تم إرسال التهاني' : 'Greetings sent',
        `${body.sent} sent · ${body.skipped} skipped`,
        'success',
      );
      load();
    } catch (e) {
      showToast('Dispatch failed', errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-3 mt-1 border-t border-white/[0.06]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Cake className="w-3.5 h-3.5 text-pink-300" />
          {language === 'ar' ? `ذكريات سنوية (${items.length})` : `Anniversaries (${items.length})`}
        </span>
        <button onClick={dispatch} disabled={busy} className="text-[11px] font-bold text-pink-300 hover:text-white flex items-center gap-1 disabled:opacity-50">
          <Send className="w-3 h-3" /> {language === 'ar' ? 'تهنئة الأسبوع' : 'Greet this week'}
        </button>
      </div>
      <div className="space-y-1.5">
        {items.slice(0, 4).map((c) => (
          <div key={`${c.kind}-${c.studentId}`} className="flex items-center gap-2 p-2 rounded-xl bg-pink-500/[0.06] border border-pink-500/15 text-xs">
            <span className="font-bold text-white truncate">{c.name}</span>
            <span className="text-pink-200/80">
              {c.kind === 'birthday' ? (language === 'ar' ? 'عيد ميلاد' : 'birthday') : `${c.years} ${language === 'ar' ? 'سنوات' : c.years === 1 ? 'year' : 'years'}`}
            </span>
            <span className="ms-auto font-mono text-[10px] text-slate-500" dir="ltr">{c.date}</span>
            {c.sent && <span className="text-[10px] text-emerald-300">✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

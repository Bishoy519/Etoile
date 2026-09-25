import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api, errMsg } from '../../utils/api';
import { Trash2, Loader2 } from 'lucide-react';

/** GDPR erasure: request → 7-day grace → automatic anonymized purge. */
export const DeleteDataButton: React.FC = () => {
  const { language, showToast } = useApp();
  const [status, setStatus] = useState<{ status: string; scheduledAt?: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/auth/family/deletion');
        setStatus(data);
      } catch {
        // offline
      }
    })();
  }, []);

  const request = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/api/auth/family/deletion/request');
      setStatus(data);
      setConfirming(false);
      showToast(
        language === 'ar' ? 'تم جدولة الحذف' : 'Deletion scheduled',
        language === 'ar' ? 'يمكنك الإلغاء خلال 7 أيام.' : 'You can cancel within 7 days.',
        'warning',
      );
    } catch (e) {
      showToast('Request failed', errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    try {
      const { data } = await api.post('/api/auth/family/deletion/cancel');
      setStatus(data || { status: 'cancelled' });
      showToast(language === 'ar' ? 'تم الإلغاء' : 'Cancelled', '', 'success');
    } catch (e) {
      showToast('Cancel failed', errMsg(e), 'error');
    }
  };

  if (status?.status === 'pending') {
    return (
      <span className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-200">
        {language === 'ar' ? `الحذف مجدول ${String(status.scheduledAt || '').split('T')[0]}` : `Erasure ${String(status.scheduledAt || '').split('T')[0]}`}
        <button onClick={cancel} className="underline font-bold hover:text-white">
          {language === 'ar' ? 'إلغاء' : 'Undo'}
        </button>
      </span>
    );
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-white/10 hover:border-rose-500/50 text-xs text-brand-muted/60 hover:text-rose-300 transition"
        title={language === 'ar' ? 'طلب حذف بيانات عائلتي' : 'Request erasure of my family data'}
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{language === 'ar' ? 'حذف بياناتي' : 'Erase data'}</span>
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-500/50 bg-rose-950/30 text-xs text-rose-200">
      {language === 'ar' ? 'سيُحذف كل شيء خلال 7 أيام. متأكدة؟' : 'Everything goes in 7 days. Sure?'}
      <button onClick={request} disabled={busy} className="font-bold underline hover:text-white disabled:opacity-50 flex items-center gap-1">
        {busy && <Loader2 className="w-3 h-3 animate-spin" />}
        {language === 'ar' ? 'نعم، احذفي' : 'Yes, erase'}
      </button>
      <button onClick={() => setConfirming(false)} className="opacity-60 hover:opacity-100">
        {language === 'ar' ? 'تراجع' : 'Back'}
      </button>
    </span>
  );
};

import React, { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { api, errMsg } from '../utils/api';
import { MessageSquareText, Send } from 'lucide-react';

/** SMS fallback channel: provider status + owner test dispatch. */
export const SmsFallbackCard: React.FC = () => {
  const { language, showToast, currentUser } = useAdmin();
  const [status, setStatus] = useState<{ provider: string; configured: boolean } | null>(null);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const canTest = currentUser?.role === 'owner' || currentUser?.role === 'superadmin';

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/sms/status');
      setStatus(data);
    } catch {
      // offline
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const test = async () => {
    if (phone.replace(/[^\d]/g, '').length < 7) {
      showToast('Invalid phone', 'Enter a full international number.', 'error');
      return;
    }
    setBusy(true);
    try {
      const { data: body } = await api.post('/api/sms/test', { phone });
      if (!body?.sent) throw new Error(body?.error || 'SMS not sent');
      showToast(language === 'ar' ? 'تم الإرسال' : 'SMS sent', '', 'success');
    } catch (e) {
      showToast('SMS failed', errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-2">
        <MessageSquareText className="w-4 h-4 text-sky-300" />
        <h4 className="text-xs font-bold text-white">{language === 'ar' ? 'احتياطي الرسائل النصية' : 'SMS fallback channel'}</h4>
        {status && (
          <span className={`ms-auto text-[10px] px-2 py-0.5 rounded-full border font-bold font-mono ${status.configured ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' : 'text-slate-400 border-white/15'}`}>
            {status.provider}{status.configured ? ' • live' : ' • off'}
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-500">
        {language === 'ar'
          ? 'عند فشل واتساب تُرسل الإيصالات الحرجة تلقائياً كرسالة نصية. تُضبط من متغيرات البيئة SMS_PROVIDER.'
          : 'Failed WhatsApp receipts auto-retry as plain SMS. Configure via SMS_PROVIDER env.'}
      </p>
      {canTest && (
        <div className="flex gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+20 1xx xxx xxxx"
            dir="ltr"
            className="flex-1 px-3 py-2 rounded-xl bg-[#111622] border border-white/10 text-xs text-white font-mono"
            aria-label="Test phone"
          />
          <button onClick={test} disabled={busy} className="px-4 py-2 rounded-xl border border-white/15 text-xs font-bold text-white hover:border-white/30 disabled:opacity-50 flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" /> Test
          </button>
        </div>
      )}
    </div>
  );
};

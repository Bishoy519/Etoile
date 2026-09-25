import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { api, errMsg } from '../utils/api';
import { Link2, Copy, CheckCircle2, Send } from 'lucide-react';

type Provider = 'paymob' | 'fawry' | 'instapay';

/** Create + share an online pay-link for an invoice. Falls back gracefully when API offline. */
export const PayLinkButton: React.FC<{
  invoiceId?: string;
  studentId?: string;
  amount: number;
  phone?: string;
  compact?: boolean;
}> = ({ invoiceId, studentId, amount, phone, compact }) => {
  const { language, showToast, triggerOpenWaAlert } = useAdmin();
  const isRtl = language === 'ar';
  const [provider, setProvider] = useState<Provider>('paymob');
  const [link, setLink] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!amount || amount <= 0) {
      showToast('Invalid amount', 'Amount must be greater than zero.', 'error');
      return;
    }
    setBusy(true);
    try {
      const { data: d } = await api.post('/api/payments/paylink', { invoiceId, studentId, amount: Math.round(amount), provider, phone });
      setLink(d.url);
      setRef(d.ref);
      showToast(isRtl ? 'تم إنشاء رابط الدفع' : 'Pay-link created', `${provider} • ${d.ref}`, 'success');
    } catch (e: any) {
      showToast(
        isRtl ? 'فشل إنشاء رابط الدفع' : 'Pay-link generation failed',
        errMsg(e, isRtl ? 'تعذر الاتصال ببوابة الدفع. يرجى التحقق من الإعدادات.' : 'Could not reach payment gateway. Please check configuration.'),
        'error'
      );
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      showToast(isRtl ? 'تم النسخ' : 'Copied', link, 'gold');
    } catch {
      showToast('Link', link, 'gold');
    }
  };

  const sendWa = () => {
    if (!phone || !link) {
      showToast('No phone', 'Add a parent phone to dispatch via WhatsApp.', 'error');
      return;
    }
    triggerOpenWaAlert('debt_reminder', phone, 'Parent', `Étoile Academy — pay EGP ${Math.round(amount)} online: ${link} (ref ${ref})`);
    showToast(isRtl ? 'أُرسل عبر واتساب' : 'Sent via WhatsApp', phone, 'success');
  };

  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2.5 ${compact ? '' : ''}`}>
      <div className="flex items-center gap-1.5">
        <div className="flex p-0.5 rounded-lg bg-white/[0.04] border border-white/10">
          {(['paymob', 'fawry', 'instapay'] as Provider[]).map((p) => (
            <button key={p} onClick={() => setProvider(p)} className={`px-2.5 py-1 rounded-md text-[11px] font-bold capitalize transition ${provider === p ? 'bg-white text-slate-950' : 'text-slate-400 hover:text-white'}`}>
              {p}
            </button>
          ))}
        </div>
        <span className="ms-auto text-[11px] font-mono font-bold text-slate-300">EGP {Math.round(amount).toLocaleString()}</span>
      </div>
      {!link ? (
        <button onClick={create} disabled={busy} className="gold-btn w-full py-2 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60">
          <Link2 className="w-3.5 h-3.5" /> {busy ? (isRtl ? 'جارٍ الإنشاء…' : 'Creating…') : (isRtl ? 'إنشاء رابط دفع' : 'Create pay-link')}
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-2.5 py-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate flex-1" dir="ltr">{link}</span>
          </div>
          <div className="flex gap-1.5">
            <button onClick={copy} className="btn-ghost flex-1 py-1.5 text-[11px] font-bold flex items-center justify-center gap-1"><Copy className="w-3.5 h-3.5" /> {isRtl ? 'نسخ' : 'Copy'}</button>
            <button onClick={sendWa} className="btn-ghost flex-1 py-1.5 text-[11px] font-bold flex items-center justify-center gap-1"><Send className="w-3.5 h-3.5" /> WhatsApp</button>
            <button onClick={() => { setLink(null); setRef(null); }} className="btn-ghost px-2.5 py-1.5 text-[11px] font-bold">↺</button>
          </div>
          {ref && <p className="text-[10px] font-mono text-slate-500" dir="ltr">ref {ref} • reconcile via POST /api/payments/webhook</p>}
        </div>
      )}
    </div>
  );
};

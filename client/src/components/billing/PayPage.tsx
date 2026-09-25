import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/currency';
import { rawApi, errMsg } from '../../utils/api';
import { ArrowLeft, Copy, CheckCircle2, Clock, XCircle } from 'lucide-react';

/** Public pay-link status page: shareable receipt view for a payment ref. */
export const PayPage: React.FC = () => {
  const { language, setActiveView, activePayRef } = useApp();
  const [ref, setRef] = useState(activePayRef || '');
  const [lookup, setLookup] = useState(activePayRef || '');
  const [data, setData] = useState<{ ref: string; amount: number; currency: string; provider: string; status: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchStatus = async (r: string) => {
    if (!r.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await rawApi.get(`/api/payments/paylink/${encodeURIComponent(r.trim())}`);
      setData(data);
    } catch (e: any) {
      setError(e?.response?.status === 404 ? 'Link not found or expired' : errMsg(e, 'Lookup failed'));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (lookup) fetchStatus(lookup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusIcon =
    data?.status === 'paid' ? <CheckCircle2 className="w-8 h-8 text-emerald-300" /> :
    data?.status === 'pending' ? <Clock className="w-8 h-8 text-amber-300" /> :
    data ? <XCircle className="w-8 h-8 text-rose-300" /> : null;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <button onClick={() => setActiveView('client_portal')} className="text-xs text-brand-gold/70 hover:text-brand-gold mb-4 flex items-center gap-1">
        <ArrowLeft className="w-3 h-3 rtl:rotate-180" /> {language === 'ar' ? 'بوابتي' : 'My portal'}
      </button>
      <h1 className="font-serif text-3xl gold-text-gradient mb-2">{language === 'ar' ? 'الدفع أونلاين' : 'Online Payment'}</h1>
      <p className="text-xs text-brand-muted/70 mb-6">
        {language === 'ar' ? 'الصقي مرجع الدفع لعرض الحالة، أو أكمل من فاتورتك.' : 'Paste a payment reference to check status, or continue from your invoice.'}
      </p>
      <form
        onSubmit={(e) => { e.preventDefault(); setLookup(ref.trim()); fetchStatus(ref.trim()); }}
        className="flex gap-2 mb-6"
      >
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="PAYMOB-XXXXXX"
          dir="ltr"
          aria-label="Payment reference"
          className="form-gold-input flex-1 px-4 py-2.5 rounded-xl text-sm font-mono"
        />
        <button type="submit" disabled={loading} className="gold-btn px-5 py-2.5 rounded-xl text-black text-xs font-bold disabled:opacity-50">
          {language === 'ar' ? 'بحث' : 'Look up'}
        </button>
      </form>
      {error && <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-xs text-red-300 mb-4">{error}</div>}
      {data && (
        <div className="gold-card rounded-2xl p-6 text-center space-y-3">
          <div className="flex justify-center">{statusIcon}</div>
          <div className="font-mono text-xs text-brand-muted">{data.ref}</div>
          <div className="font-serif text-4xl text-white" dir="ltr">{formatCurrency(data.amount, language)} <span className="text-sm text-brand-muted">{data.currency}</span></div>
          <div className="text-xs text-brand-muted capitalize">{data.provider} • {data.status}</div>
          <div className="text-[11px] text-brand-muted/60">
            {language === 'ar' ? 'ينتهي:' : 'Expires:'} {(() => { try { return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data.expiresAt)); } catch { return data.expiresAt; } })()}
          </div>
          {data.status === 'pending' && (
            <p className="text-[11px] text-amber-200/80">Complete payment in your {data.provider} app, then this page flips to paid automatically once the gateway confirms.</p>
          )}
          {data.status === 'paid' && (
            <p className="text-[11px] text-emerald-200/80">Paid — your invoice settles automatically. Keep this reference for your records.</p>
          )}
          <button
            onClick={() => { try { navigator.clipboard.writeText(data.ref); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* noop */ } }}
            className="mx-auto text-[11px] px-3 py-1.5 rounded-lg border border-brand-gold/30 text-brand-gold flex items-center gap-1.5"
          >
            <Copy className="w-3 h-3" /> {copied ? (language === 'ar' ? 'تم النسخ' : 'Copied') : (language === 'ar' ? 'نسخ المرجع' : 'Copy reference')}
          </button>
        </div>
      )}
    </div>
  );
};

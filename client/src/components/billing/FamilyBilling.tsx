import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/currency';
import { api, errMsg } from '../../utils/api';
import { formatApprox, type FxRate } from '../../utils/fx';
import type { FamilyInvoice } from '../../types';
import { Receipt, CreditCard, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

const PROVIDERS = ['paymob', 'fawry', 'instapay'] as const;

export const FamilyBilling: React.FC = () => {
  const { language, showToast, setActiveView, setActivePayRef } = useApp();
  const [invoices, setInvoices] = useState<FamilyInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>('paymob');
  const [fx, setFx] = useState<FxRate[]>([{ currency: 'EGP', rateToEgp: 1 }]);
  const [fxCur, setFxCur] = useState('EGP');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/accounting/family/invoices');
        if (Array.isArray(data)) setInvoices(data);
      } catch {
        // offline — section stays empty
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/accounting/fx');
        if (Array.isArray(data) && data.length > 0) setFx(data);
      } catch {
        // offline — EGP only
      }
    })();
  }, []);

  const pay = async (inv: FamilyInvoice) => {
    setPayingId(inv.id);
    try {
      const { data: link } = await api.post('/api/payments/paylink/family', { invoiceId: inv.id, provider });
      setActivePayRef(link.ref);
      setActiveView('pay');
      window.scrollTo({ top: 0 });
    } catch (e) {
      showToast(
        language === 'ar' ? 'تعذر إنشاء رابط الدفع' : 'Could not create payment link',
        errMsg(e),
        'error',
      );
    } finally {
      setPayingId(null);
    }
  };

  if (loading) {
    return (
      <div className="gold-card rounded-2xl p-6 animate-pulse">
        <div className="h-4 w-40 bg-brand-gold/20 rounded mb-3" />
        <div className="h-3 w-full bg-white/5 rounded" />
      </div>
    );
  }

  if (invoices.length === 0) return null;

  const statusBadge = (s: string) =>
    s === 'paid'
      ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
      : s === 'cancelled'
        ? 'text-slate-400 border-white/15 bg-white/5'
        : s === 'overdue'
          ? 'text-rose-300 border-rose-500/40 bg-rose-500/10'
          : 'text-amber-300 border-amber-500/40 bg-amber-500/10';

  return (
    <section id="family-billing" aria-label={language === 'ar' ? 'الفواتير' : 'Billing'} className="gold-card rounded-2xl p-5 sm:p-6 space-y-4 scroll-mt-24">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-serif text-xl text-[#fdf1c2] flex items-center gap-2">
          <Receipt className="w-5 h-5 text-brand-gold" />
          {language === 'ar' ? 'الفواتير والمدفوعات' : 'Invoices & Payments'}
        </h3>
        <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-[11px] text-brand-muted/70">
          {language === 'ar' ? 'البوابة:' : 'Rail:'}
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="form-gold-input px-2 py-1.5 rounded-lg text-xs bg-[#101314]"
            aria-label="Payment provider"
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        {fx.length > 1 && (
          <label className="flex items-center gap-1.5 text-[11px] text-brand-muted/70">
            <span aria-hidden="true">≈</span>
            <select
              value={fxCur}
              onChange={(e) => setFxCur(e.target.value)}
              className="form-gold-input px-2 py-1.5 rounded-lg text-xs bg-[#101314] font-mono"
              aria-label="Display currency"
            >
              {fx.map((f) => (
                <option key={f.currency} value={f.currency}>{f.currency}</option>
              ))}
            </select>
          </label>
        )}
        </div>
      </div>
      <div className="space-y-3">
        {invoices.map((inv) => {
          const paid = inv.status === 'paid' || inv.remainingDue <= 0.01;
          return (
            <div key={inv.id} className="rounded-xl border border-brand-gold/20 bg-black/40 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-white">{inv.invoiceNumber}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${statusBadge(inv.status)}`}>
                  {inv.status}
                </span>
                {inv.status === 'overdue' && <AlertTriangle className="w-3.5 h-3.5 text-rose-300" />}
                {paid && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />}
                <span className="ms-auto text-sm font-bold text-white text-end" dir="ltr">
                  <span>{formatCurrency(inv.remainingDue, language)} <span className="text-[10px] font-normal text-brand-muted/60">/ {formatCurrency(inv.total, language)}</span></span>
                  {fxCur !== 'EGP' && (() => {
                    const approx = formatApprox(inv.remainingDue, fxCur, fx);
                    return approx ? <span className="block text-[10px] font-normal text-brand-muted/60">{approx} · settles in EGP</span> : null;
                  })()}
                </span>
              </div>
              <div className="text-[11px] text-brand-muted/70 mt-1">
                {(() => { try { return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium' }).format(new Date(inv.dueDate)); } catch { return inv.dueDate; } })()}
                {' · '}{language === 'ar' ? 'مدفوع:' : 'Paid:'} {formatCurrency(inv.amountPaid, language)}
              </div>
              {!paid && inv.status !== 'cancelled' && (
                <button
                  onClick={() => pay(inv)}
                  disabled={payingId === inv.id}
                  className="gold-btn mt-3 px-5 py-2.5 rounded-lg text-black font-serif text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  {payingId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                  {language === 'ar' ? `ادفع ${formatCurrency(inv.remainingDue, language)} عبر ${provider}` : `Pay ${formatCurrency(inv.remainingDue, language)} via ${provider}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

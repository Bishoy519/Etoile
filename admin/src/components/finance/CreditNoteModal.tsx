import React, { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { formatCurrency } from '../../utils/currency';
import { api, errMsg } from '../../utils/api';
import { InvoiceItem } from '../../types';
import { Receipt, Loader2 } from 'lucide-react';

interface CreditNote {
  id: string;
  creditNumber: string;
  invoiceId: string;
  amount: number;
  reason: string;
  status: string;
  appliedToInvoiceId: string | null;
  invoice?: { invoiceNumber: string };
}

/** Rebates on paid invoices: issue once, apply once (to an open invoice or wallet), voidable. */
export const CreditNoteModal: React.FC<{
  invoice: InvoiceItem;
  invoices: InvoiceItem[];
  onClose: () => void;
  onChanged: () => void;
}> = ({ invoice, invoices, onClose, onChanged }) => {
  const { language, showToast } = useAdmin();
  const [notes, setNotes] = useState<CreditNote[]>([]);
  const [amount, setAmount] = useState<string>(String(invoice.paidAmount || ''));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [applyId, setApplyId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState('');
  const [mode, setMode] = useState<'invoice' | 'wallet'>('invoice');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/accounting/credit-notes?invoiceId=${invoice.id}`);
      setNotes(data);
    } catch {
      // offline
    }
  }, [invoice.id]);

  useEffect(() => {
    load();
  }, [load]);

  const issue = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      showToast('Invalid amount', 'Enter a positive credit amount.', 'error');
      return;
    }
    if (amt - invoice.paidAmount > 0.01) {
      showToast('Too large', `Credit cannot exceed paid EGP ${invoice.paidAmount}.`, 'error');
      return;
    }
    if (!reason.trim()) {
      showToast('Reason required', 'A reason is required for audit.', 'error');
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/accounting/credit-notes', { invoiceId: invoice.id, amount: amt, reason: reason.trim() });
      showToast(language === 'ar' ? 'تم إصدار الإشعار' : 'Credit issued', '', 'success');
      setAmount('');
      setReason('');
      load();
      onChanged();
    } catch (e) {
      showToast('Issue failed', errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const apply = async (note: CreditNote) => {
    setBusy(true);
    try {
      const body: Record<string, unknown> =
        mode === 'invoice' ? { mode, targetInvoiceId: targetId } : { mode };
      if (mode === 'invoice' && !targetId) {
        showToast('Pick a target', 'Choose the open invoice receiving this credit.', 'error');
        setBusy(false);
        return;
      }
      await api.post(`/api/accounting/credit-notes/${note.id}/apply`, body);
      showToast(language === 'ar' ? 'تم التطبيق' : 'Credit applied', '', 'success');
      setApplyId(null);
      load();
      onChanged();
    } catch (e) {
      showToast('Apply failed', errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const voidNote = async (note: CreditNote) => {
    try {
      await api.post(`/api/accounting/credit-notes/${note.id}/void`);
      load();
      onChanged();
    } catch (e) {
      showToast('Void failed', errMsg(e), 'error');
    }
  };

  const openTargets = invoices.filter(
    (i) => i.id !== invoice.id && i.remainingDue > 0.01 && i.status !== 'paid' && i.status !== 'voided',
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="Credit notes" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-[var(--bg-surface)] border border-white/10 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <Receipt className="w-5 h-5 text-amber-300" />
          <div>
            <h3 className="font-heading font-semibold text-base text-white">
              {language === 'ar' ? 'إشعارات دائنة' : 'Credit Notes'} — <span className="font-mono" dir="ltr">{invoice.invoiceNumber}</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {language === 'ar' ? `المدفوع ${formatCurrency(invoice.paidAmount, language)} — الخصم لا يتجاوزه` : `Paid ${formatCurrency(invoice.paidAmount, language)} — credit capped at paid`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_2fr_auto] gap-2 items-end">
          <label className="text-[11px] text-slate-400">EGP
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min={1} dir="ltr" className="mt-1 w-full px-2.5 py-2 rounded-xl bg-[#111622] border border-white/10 text-xs text-white font-mono" />
          </label>
          <label className="text-[11px] text-slate-400">{language === 'ar' ? 'السبب (إلزامي)' : 'Reason (required)'}
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} dir="auto" className="mt-1 w-full px-2.5 py-2 rounded-xl bg-[#111622] border border-white/10 text-xs text-white" />
          </label>
          <button onClick={issue} disabled={busy} className="px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold disabled:opacity-50 flex items-center gap-1.5">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Issue
          </button>
        </div>

        <div className="space-y-2">
          {notes.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No credit notes on this invoice.</p>}
          {notes.map((n) => (
            <div key={n.id} className="p-3 rounded-xl border border-white/10 bg-white/[0.02] text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold text-white" dir="ltr">{n.creditNumber}</span>
                <span className="font-mono text-amber-300">{formatCurrency(n.amount, language)}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                  n.status === 'applied' ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                  : n.status === 'voided' ? 'text-slate-400 border-white/15' : 'text-amber-300 border-amber-500/30 bg-amber-500/10'}`}>{n.status}</span>
                {n.status === 'issued' && (
                  <span className="ms-auto flex gap-1.5">
                    <button onClick={() => setApplyId(applyId === n.id ? null : n.id)} className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold">Apply</button>
                    <button onClick={() => voidNote(n)} className="px-2.5 py-1 rounded-lg border border-white/15 text-slate-300">Void</button>
                  </span>
                )}
              </div>
              <p className="text-slate-400 mt-1" dir="auto">{n.reason}</p>
              {applyId === n.id && n.status === 'issued' && (
                <div className="flex flex-wrap items-center gap-2 mt-2 p-2 rounded-xl bg-white/[0.03] border border-white/10">
                  <select value={mode} onChange={(e) => setMode(e.target.value as 'invoice' | 'wallet')} className="px-2 py-1.5 rounded-lg bg-[#121619] border border-white/10 text-xs" aria-label="Apply mode">
                    <option value="invoice">→ open invoice</option>
                    <option value="wallet">→ wallet refund</option>
                  </select>
                  {mode === 'invoice' && (
                    <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="px-2 py-1.5 rounded-lg bg-[#121619] border border-white/10 text-xs max-w-[220px]" aria-label="Target invoice">
                      <option value="">Pick invoice…</option>
                      {openTargets.map((t) => (
                        <option key={t.id} value={t.id}>{t.invoiceNumber} — {formatCurrency(t.remainingDue, language)} due</option>
                      ))}
                    </select>
                  )}
                  <button onClick={() => apply(n)} disabled={busy} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold disabled:opacity-50">Confirm</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-white/10 text-xs text-slate-300">Close</button>
      </div>
    </div>
  );
};

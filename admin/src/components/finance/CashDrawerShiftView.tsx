import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { formatCurrency } from '../../utils/currency';
import { exportCsv } from '../../utils/csv';
import {
  Wallet,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  X,
  Lock,
  Unlock,
  ShieldCheck,
  Download,
} from 'lucide-react';

export const CashDrawerShiftView: React.FC = () => {
  const { activeDrawerShift, openCashDrawerShift, closeCashDrawerShift, language, currentUser, showToast } = useAdmin();

  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);

  const [openingFloatInput, setOpeningFloatInput] = useState<number>(2500);
  const [countedCashInput, setCountedCashInput] = useState<number>(6350);
  const [shiftNotes, setShiftNotes] = useState<string>('');

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    const floatNum = Number(openingFloatInput);
    if (activeDrawerShift?.status === 'open') { showToast('Shift already open', 'Close the current shift before opening a new one.', 'warning'); return; }
    if (!Number.isFinite(floatNum) || floatNum < 0 || floatNum > 1000000) { showToast('Cannot open shift', 'Opening float must be 0 or more.', 'error'); return; }
    openCashDrawerShift(floatNum, shiftNotes.trim() || undefined);
    setIsOpenShiftModalOpen(false);
    setShiftNotes('');
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDrawerShift || activeDrawerShift.status !== 'open') { showToast('No open shift', 'There is no open shift to close.', 'error'); return; }
    const counted = Number(countedCashInput);
    if (!Number.isFinite(counted) || counted < 0 || counted > 10000000) { showToast('Cannot close shift', 'Counted cash must be 0 or more.', 'error'); return; }
    const variance = counted - activeDrawerShift.expectedCash;
    if (Math.abs(variance) >= 500 && !shiftNotes.trim()) {
      showToast('Note required', 'Please add a note explaining a variance of 500 EGP or more.', 'error');
      return;
    }
    if (Math.abs(variance) > 0 && !window.confirm(`Counted ${counted} vs expected ${activeDrawerShift.expectedCash} (variance ${variance}). Close shift?`)) return;
    closeCashDrawerShift(counted, shiftNotes.trim() || undefined);
    setIsCloseShiftModalOpen(false);
    setShiftNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Shift Overview Card */}
      <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-heading font-bold text-xl text-white">
                  {language === 'ar' ? 'إدارة وردية الخزينة النقدية (الكاش)' : 'Cash Drawer Shift & Register'}
                </h4>
                {activeDrawerShift?.status === 'open' ? (
                  <span className="status-pill-emerald flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{language === 'ar' ? 'الوردية مفتوحة' : 'Shift Active'}</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-white/10 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>{language === 'ar' ? 'الوردية مغلقة' : 'Closed'}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'ar'
                  ? 'متابعة الرصيد الافتتاحي، المتحصلات النقدية من الطلاب، المصروفات العاجلة، ومطابقة الجرد النهائي.'
                  : 'Track shift opening float, cash collected at reception, emergency register payouts, and end-of-day reconciliation.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeDrawerShift?.status === 'open' ? (
              <button
                onClick={() => {
                  setCountedCashInput(activeDrawerShift.expectedCash);
                  setIsCloseShiftModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-semibold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'إغلاق الوردية والمطابقة' : 'Close Shift & Reconcile'}</span>
              </button>
            ) : (
              <button
                onClick={() => setIsOpenShiftModalOpen(true)}
                className="action-btn-coral px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'فتح وردية جديدة' : 'Open New Shift'}</span>
              </button>
            )}
            {activeDrawerShift && (
              <button
                onClick={() => exportCsv(`cash-shift-${new Date().toISOString().split('T')[0]}`, ['field', 'value'], [
                  { field: 'status', value: activeDrawerShift.status },
                  { field: 'openingFloat', value: activeDrawerShift.openingFloat },
                  { field: 'expectedCash', value: activeDrawerShift.expectedCash },
                  { field: 'openedBy', value: (activeDrawerShift as { openedBy?: string }).openedBy || '' },
                ])}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5"
                title="Export CSV"
              >
                <Download className="w-3.5 h-3.5" /><span>CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Shift Metrics */}
        {activeDrawerShift ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#111622] border border-white/5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                {language === 'ar' ? 'الرصيد الافتتاحي (العهدة)' : 'Opening Float'}
              </span>
              <div className="font-heading font-bold text-xl text-white">
                {formatCurrency(activeDrawerShift.openingFloat, language)}
              </div>
              <span className="text-[10px] text-slate-500 block">
                {activeDrawerShift.startTime}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#111622] border border-white/5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                {language === 'ar' ? 'المقبوضات النقدية بالوردية' : 'Cash Inflow (Tuition + POS)'}
              </span>
              <div className="font-heading font-bold text-xl text-emerald-400 flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" />
                <span>+{formatCurrency(activeDrawerShift.cashSalesTotal, language)}</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                {language === 'ar' ? 'تحصيلات الاستقبال اليوم' : 'From cash payers'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#111622] border border-white/5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider block">
                {language === 'ar' ? 'المنصرفات النقدية الطارئة' : 'Cash Payouts (OPEX)'}
              </span>
              <div className="font-heading font-bold text-xl text-rose-400 flex items-center gap-1">
                <ArrowDownRight className="w-4 h-4" />
                <span>-{formatCurrency(activeDrawerShift.cashPayoutsTotal, language)}</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                {language === 'ar' ? 'مصروفات استوديو عاجلة' : 'Paid from drawer'}
              </span>
            </div>

            <div className="p-4 rounded-xl kpi-gradient-purple border border-indigo-500/30 space-y-1 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider block">
                {language === 'ar' ? 'الرصيد الدفتري المتوقع' : 'Expected Cash in Safe'}
              </span>
              <div className="font-heading font-bold text-2xl text-white">
                {formatCurrency(activeDrawerShift.expectedCash, language)}
              </div>
              <span className="text-[10px] text-indigo-300/80 block">
                {activeDrawerShift.staffName}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 bg-[#111622] rounded-xl border border-dashed border-white/10">
            <Banknote className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
            <p className="text-xs">
              {language === 'ar' ? 'لا توجد وردية مفتوحة حالياً. يرجى فتح وردية جديدة لبدء تسجيل المقبوضات النقدية.' : 'No active cash drawer shift. Open a shift to begin cash reconciliation.'}
            </p>
          </div>
        )}

        {/* Shift Reconciliation Details if Closed */}
        {activeDrawerShift?.status === 'closed' && activeDrawerShift.countedCash !== undefined && (
          <div className="p-4 rounded-xl bg-[#111622] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-white">
                  {language === 'ar' ? 'نتيجة مطابقة الجرد الفعلي:' : 'End of Shift Counted Result:'}
                </div>
                <div className="text-xs text-slate-400">
                  {language === 'ar' ? 'الفعلي المحسوب:' : 'Actual Counted:'}{' '}
                  <strong className="text-emerald-400 font-mono">{formatCurrency(activeDrawerShift.countedCash, language)}</strong>
                </div>
              </div>
            </div>

            <div className="text-right rtl:text-left">
              <span className="text-[10px] uppercase text-slate-400 font-bold block">
                {language === 'ar' ? 'الفارق (عجز / زيادة)' : 'Cash Variance'}
              </span>
              <span
                className={`font-mono font-bold text-base ${
                  (activeDrawerShift.variance || 0) === 0
                    ? 'text-emerald-400'
                    : (activeDrawerShift.variance || 0) > 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {formatCurrency(activeDrawerShift.variance || 0, language)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Open Shift */}
      {isOpenShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#171d2b] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Unlock className="w-5 h-5 text-emerald-400" />
                <h3 className="font-heading font-bold text-lg text-white">
                  {language === 'ar' ? 'بدء وردية خزينة جديدة' : 'Open Cash Shift'}
                </h3>
              </div>
              <button
                onClick={() => setIsOpenShiftModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOpenShift} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  {language === 'ar' ? 'الرصيد الافتتاحي للعهدة (EGP)' : 'Opening Float Amount (EGP)'} *
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={openingFloatInput}
                  onChange={(e) => setOpeningFloatInput(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#111622] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  {language === 'ar' ? 'ملاحظات استلام العهدة' : 'Shift Notes'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Standard morning float received from safe"
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#111622] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpenShiftModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="action-btn-coral px-4 py-1.5 font-bold cursor-pointer"
                >
                  {language === 'ar' ? 'تأكيد فتح الوردية' : 'Open Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Close Shift */}
      {isCloseShiftModalOpen && activeDrawerShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#171d2b] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-rose-400" />
                <h3 className="font-heading font-bold text-lg text-white">
                  {language === 'ar' ? 'إغلاق الوردية وجرد الخزينة' : 'Close Shift & Count Cash'}
                </h3>
              </div>
              <button
                onClick={() => setIsCloseShiftModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-[#111622] border border-white/5 space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Opening Float:</span>
                  <strong className="text-white font-mono">{formatCurrency(activeDrawerShift.openingFloat, language)}</strong>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Cash Inflows:</span>
                  <strong className="font-mono">+{formatCurrency(activeDrawerShift.cashSalesTotal, language)}</strong>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Cash Payouts:</span>
                  <strong className="font-mono">-{formatCurrency(activeDrawerShift.cashPayoutsTotal, language)}</strong>
                </div>
                <div className="border-t border-white/10 pt-1.5 flex justify-between font-bold text-white">
                  <span>Expected in Register:</span>
                  <span className="text-amber-400 font-mono">{formatCurrency(activeDrawerShift.expectedCash, language)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  {language === 'ar' ? 'المبلغ الفعلي المحسوب في الدرج (EGP)' : 'Actual Counted Cash (EGP)'} *
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={countedCashInput}
                  onChange={(e) => setCountedCashInput(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#111622] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              {/* Variance Live preview */}
              <div className="flex items-center justify-between text-[11px] p-2.5 rounded-xl bg-[#111622] border border-white/5">
                <span className="text-slate-400">{language === 'ar' ? 'الفارق الناتج:' : 'Resulting Variance:'}</span>
                <span
                  className={`font-mono font-bold ${
                    countedCashInput - activeDrawerShift.expectedCash === 0
                      ? 'text-emerald-400'
                      : countedCashInput - activeDrawerShift.expectedCash > 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(countedCashInput - activeDrawerShift.expectedCash, language)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  {language === 'ar' ? 'ملاحظات الإغلاق' : 'Closing Notes'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. All counted and safe locked"
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#111622] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCloseShiftModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold transition shadow-md cursor-pointer"
                >
                  {language === 'ar' ? 'تأكيد الإغلاق والمطابقة' : 'Reconcile & Close'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

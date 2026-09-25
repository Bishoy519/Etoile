import React, { useMemo, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { formatCurrency } from '../../utils/currency';
import { exportCsv } from '../../utils/csv';
import { ViewSwitcher, useViewPrefs } from '../ViewSwitcher';
import { PayrollSlip } from '../../types';
import { api, errMsg } from '../../utils/api';
import {
  Users,
  Award,
  Edit2,
  CheckCircle2,
  Printer,
  Plus,
  Clock,
  Banknote,
  DollarSign,
  X,
  Building2,
  Sparkles,
  FileCheck,
  Search,
  Download,
  RotateCcw,
} from 'lucide-react';

export const PayrollCalculatorView: React.FC = () => {
  const { payrollSlips, adjustPayroll, markPayrollPaid, approvePayroll, refreshPayroll, language, showToast, currentUser } = useAdmin();
  const canApprove = currentUser?.role === 'owner' || currentUser?.role === 'superadmin';
  const [syncing, setSyncing] = useState(false);

  const handleSyncMonth = async () => {
    setSyncing(true);
    try {
      const curMonth = new Date().toISOString().substring(0, 7);
      await api.post('/api/accounting/payroll/sync-month', { month: curMonth });
      await refreshPayroll();
      showToast(
        language === 'ar' ? 'تم حساب حصص ومرتبات المدربين بنجاح' : 'Instructor payroll auto-computed from sessions',
        language === 'ar' ? `تم ربط الحصص الفعلية لشهر ${curMonth}` : `Actual sessions synchronized for ${curMonth}`,
        'success'
      );
    } catch (e) {
      showToast('Sync failed', errMsg(e), 'error');
    } finally {
      setSyncing(false);
    }
  };

  const [selectedSlip, setSelectedSlip] = useState<PayrollSlip | null>(null);
  const [bonusInput, setBonusInput] = useState<number>(0);
  const [deductionInput, setDeductionInput] = useState<number>(0);
  const [hourlyRateInput, setHourlyRateInput] = useState<number>(650);
  const [notesInput, setNotesInput] = useState<string>('');

  const [viewingPayslip, setViewingPayslip] = useState<PayrollSlip | null>(null);
  const [payrollSearch, setPayrollSearch] = useState('');
  const [payrollStatus, setPayrollStatus] = useState('all');
  const payrollView = useViewPrefs('finance-payroll', 'table');

  const visibleSlips = useMemo(() => {
    const needle = payrollSearch.trim().toLowerCase();
    return payrollSlips.filter((s) => {
      if (payrollStatus !== 'all' && (s.status || 'pending') !== payrollStatus) return false;
      if (needle && !`${s.staffName} ${s.role}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [payrollSlips, payrollSearch, payrollStatus]);

  const totalPayroll = visibleSlips.reduce((sum, p) => sum + p.totalNetPay, 0);

  const openAdjustmentModal = (slip: PayrollSlip) => {
    setSelectedSlip(slip);
    setBonusInput(slip.bonusAmount);
    setDeductionInput(slip.deductionAmount);
    setHourlyRateInput(slip.hourlyRate);
    setNotesInput(slip.notes || '');
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlip) return;
    const bonus = Number(bonusInput);
    const deduction = Number(deductionInput);
    const rate = Number(hourlyRateInput);
    if (!Number.isFinite(bonus) || bonus < 0 || bonus > 1000000) { showToast('Cannot save', 'Bonus must be 0 or more.', 'error'); return; }
    if (!Number.isFinite(deduction) || deduction < 0 || deduction > 1000000) { showToast('Cannot save', 'Deduction must be 0 or more.', 'error'); return; }
    if (!Number.isFinite(rate) || rate < 0 || rate > 100000) { showToast('Cannot save', 'Hourly rate must be 0 or more.', 'error'); return; }
    const gross = selectedSlip.baseSalary + selectedSlip.classesTaught * rate + selectedSlip.privateLessonCut + bonus;
    if (deduction > gross) { showToast('Cannot save', 'Deduction cannot exceed gross pay.', 'error'); return; }

    adjustPayroll(selectedSlip.id, {
      bonusAmount: bonus,
      deductionAmount: deduction,
      hourlyRate: rate,
      notes: notesInput.trim().slice(0, 500),
    });

    setSelectedSlip(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#171d2b] border border-white/10 shadow-sm">
        <div>
          <h4 className="font-heading font-semibold text-lg text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#F43F5E]" />
            <span>{language === 'ar' ? 'مسير رواتب أساتذة ومدربي الباليه' : 'Faculty & Instructor Payroll Engine'}</span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'حساب تلقائي لساعات التدريس والحصص مع إمكانية التعديل اليدوي للبدلات والمكافآت والخصومات.'
              : 'Auto-computed from attendance class logs with full manual override for bonuses, private coaching splits, and deductions.'}
          </p>
        </div>

        <div className="text-right rtl:text-left">
          <span className="text-[10px] uppercase text-slate-400 block">
            {language === 'ar' ? 'إجمالي مستحقات الرواتب' : 'Total Monthly Payroll'} ({visibleSlips.length}/{payrollSlips.length})
          </span>
          <span className="font-heading font-bold text-lg sm:text-xl text-[#fb7185]">
            {formatCurrency(totalPayroll, language)}
          </span>
        </div>
      </div>

      {/* Search + status + view + CSV */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center p-3 rounded-2xl bg-[#171d2b] border border-white/10">
        <label className="relative flex-1">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            value={payrollSearch}
            onChange={(e) => setPayrollSearch(e.target.value)}
            placeholder={language === 'ar' ? 'بحث عن مدرب...' : 'Search instructor...'}
            className="w-full ps-9 pe-9 py-2 rounded-xl bg-[#111622] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none"
            aria-label={language === 'ar' ? 'بحث الرواتب' : 'Search payroll'}
          />
          {payrollSearch && (
            <button onClick={() => setPayrollSearch('')} className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1" aria-label="Clear search">✕</button>
          )}
        </label>
        <div className="flex items-center gap-2">
          <select value={payrollStatus} onChange={(e) => setPayrollStatus(e.target.value)} className="px-3 py-2 rounded-xl bg-[#111622] border border-white/10 text-xs text-white" aria-label="Status">
            <option value="all">All</option>
            <option value="pending">pending</option>
            <option value="paid">paid</option>
          </select>
          <ViewSwitcher moduleKey="finance-payroll" modes={['table', 'rows']} value={{ mode: payrollView.mode, density: payrollView.density }} onChange={(p) => { payrollView.setMode(p.mode); payrollView.setDensity(p.density); }} />
          <button
            onClick={() => exportCsv(`payroll-${new Date().toISOString().split('T')[0]}`, ['staffName', 'role', 'classesTaught', 'totalNetPay', 'status'], visibleSlips.map((s) => ({
              staffName: s.staffName, role: s.role, classesTaught: s.classesTaught, totalNetPay: s.totalNetPay, status: s.status || 'pending',
            })))}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" /><span>CSV</span>
          </button>
          {canApprove && (
            <button
              onClick={handleSyncMonth}
              disabled={syncing}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 flex items-center gap-1.5 transition disabled:opacity-50"
              title={language === 'ar' ? 'حساب تلقائي لمرتبات المدربين من واقع الحصص الفعلية' : 'Auto-compute instructor salaries from actual scheduled & taught sessions'}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{language === 'ar' ? 'حساب تلقائي من الحصص' : 'Auto-Sync Sessions'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Payroll Slips Table / Rows */}
      {payrollView.mode === 'rows' ? (
        <div className="bg-[#171d2b] border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
          {visibleSlips.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-500">No payroll slips match.</p>
          ) : (
            visibleSlips.map((slip) => (
              <div key={slip.id} className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-[#111622]/60 transition">
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-white truncate">{slip.staffName}</span>
                  <span className="block text-[11px] text-slate-500">{slip.classesTaught} classes • {slip.role}</span>
                </span>
                <span className="font-mono font-bold text-white flex-shrink-0">{formatCurrency(slip.totalNetPay, language)}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/15 text-slate-300 flex-shrink-0">{slip.status || 'pending'}</span>
              </div>
            ))
          )}
        </div>
      ) : (
      <div className="bg-[#171d2b] border border-white/10 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left rtl:text-right">
            <thead className="bg-[#111622] border-b border-white/10 text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <tr>
                <th className="px-4 py-3">{language === 'ar' ? 'المدرب / الأستاذ' : 'Instructor / Staff'}</th>
                <th className="px-4 py-3 text-center">{language === 'ar' ? 'الحصص المؤداة' : 'Classes'}</th>
                <th className="px-4 py-3 text-right rtl:text-left">{language === 'ar' ? 'سعر الحصة' : 'Rate/Class'}</th>
                <th className="px-4 py-3 text-right rtl:text-left">{language === 'ar' ? 'الراتب الأساسي' : 'Base Salary'}</th>
                <th className="px-4 py-3 text-right rtl:text-left">{language === 'ar' ? 'حصص التدريب الفردي' : 'Private Lesson Cut'}</th>
                <th className="px-4 py-3 text-right rtl:text-left">{language === 'ar' ? 'المكافآت والبدلات' : 'Bonus'}</th>
                <th className="px-4 py-3 text-right rtl:text-left">{language === 'ar' ? 'الصافي المستحق (EGP)' : 'Net Pay (EGP)'}</th>
                <th className="px-4 py-3 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="px-4 py-3 text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visibleSlips.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">No payroll slips match your search.</td></tr>
              ) : visibleSlips.map((slip) => (
                <tr key={slip.id} className="hover:bg-[#111622]/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">
                      {language === 'ar' && slip.staffNameAr ? slip.staffNameAr : slip.staffName}
                    </div>
                    <div className="text-[10px] text-slate-500">{slip.role}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-medium text-[#F43F5E]">
                    {slip.classesTaught} {language === 'ar' ? 'حصة' : 'classes'}
                  </td>
                  <td className="px-4 py-3 text-right rtl:text-left font-mono text-slate-400">
                    {formatCurrency(slip.hourlyRate, language)}
                  </td>
                  <td className="px-4 py-3 text-right rtl:text-left font-mono text-slate-400">
                    {formatCurrency(slip.baseSalary, language)}
                  </td>
                  <td className="px-4 py-3 text-right rtl:text-left font-mono text-emerald-400">
                    +{formatCurrency(slip.privateLessonCut, language)}
                  </td>
                  <td className="px-4 py-3 text-right rtl:text-left font-mono text-amber-400">
                    {slip.bonusAmount > 0 ? `+${formatCurrency(slip.bonusAmount, language)}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right rtl:text-left font-mono font-bold text-sm text-white">
                    {formatCurrency(slip.totalNetPay, language)}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {slip.status === 'paid' ? (
                      <span className="status-pill-emerald px-2.5 py-1 text-[10px] font-semibold flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{language === 'ar' ? 'تم الصرف' : 'Disbursed'}</span>
                      </span>
                    ) : slip.status === 'approved' ? (
                      <span className="status-pill-amber px-2.5 py-1 text-[10px] font-semibold flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{language === 'ar' ? 'معتمد للصرف' : 'Approved'}</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-[10px] font-semibold rounded-full border border-white/15 text-slate-400">
                        {language === 'ar' ? 'بانتظار الاعتماد' : 'Pending'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openAdjustmentModal(slip)}
                        className="p-1.5 rounded-lg border border-white/10 hover:border-[#F43F5E] text-slate-400 hover:text-white bg-[#111622] transition cursor-pointer"
                        title={language === 'ar' ? 'تعديل يدوي للمكافأة أو السعر' : 'Adjust Pay / Bonus'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setViewingPayslip(slip)}
                        className="p-1.5 rounded-lg border border-white/10 hover:border-[#F43F5E] text-slate-400 hover:text-white bg-[#111622] transition cursor-pointer"
                        title={language === 'ar' ? 'عرض وطباعة قسيمة الراتب' : 'View Payslip'}
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      {slip.status === 'pending' && canApprove && (
                        <button
                          onClick={() => approvePayroll(slip.id)}
                          className="px-2.5 py-1 rounded-lg bg-sky-600/20 text-sky-300 hover:bg-sky-600/30 border border-sky-500/30 transition text-[10px] font-semibold"
                        >
                          {language === 'ar' ? 'اعتماد' : 'Approve'}
                        </button>
                      )}
                      {slip.status !== 'paid' && (
                        <button
                          onClick={() => { if (window.confirm(language === 'ar' ? `صرف راتب ${slip.staffName}؟` : `Disburse salary for ${slip.staffName}?`)) markPayrollPaid(slip.id, 'bank_transfer'); }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 transition text-[10px] font-semibold"
                        >
                          {language === 'ar' ? 'صرف' : 'Disburse'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Modal: Manual Payroll Adjustment */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#171d2b] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-heading font-semibold text-base text-white">
                  {language === 'ar' ? 'تعديل مستحقات المدرب يدوياً' : 'Manual Pay Adjustment'}
                </h3>
                <span className="text-xs text-slate-400">
                  {selectedSlip.staffName} ({selectedSlip.role})
                </span>
              </div>
              <button
                onClick={() => setSelectedSlip(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  {language === 'ar' ? 'سعر الحصة للمدرب (EGP)' : 'Class Hourly Rate (EGP)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={hourlyRateInput}
                  onChange={(e) => setHourlyRateInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#111622] text-xs text-white focus:outline-none focus:border-[#F43F5E] font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-emerald-400 mb-1">
                    {language === 'ar' ? 'مكافأة / بدل إضافي (EGP)' : 'Bonus / Incentive (EGP)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={bonusInput}
                    onChange={(e) => setBonusInput(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#111622] text-xs text-white focus:outline-none focus:border-[#F43F5E] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-rose-400 mb-1">
                    {language === 'ar' ? 'سلف أو خصومات (EGP)' : 'Advance / Deductions (EGP)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={deductionInput}
                    onChange={(e) => setDeductionInput(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#111622] text-xs text-white focus:outline-none focus:border-[#F43F5E] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  {language === 'ar' ? 'ملاحظات وسبب التعديل' : 'Notes & Adjustment Reason'}
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Summer Gala rehearsal bonus & private rehearsal split"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#111622] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F43F5E] resize-none"
                />
              </div>

              {/* Calculated Total Net Pay */}
              <div className="p-3 rounded-xl bg-[#111622] border border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {language === 'ar' ? 'صافي الراتب الجديد:' : 'New Net Pay:'}
                </span>
                <span className="font-mono font-bold text-sm text-[#fb7185]">
                  {formatCurrency(
                    selectedSlip.baseSalary +
                      selectedSlip.classesTaught * Number(hourlyRateInput) +
                      selectedSlip.privateLessonCut +
                      Number(bonusInput) -
                      Number(deductionInput),
                    language
                  )}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSlip(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="action-btn-coral px-4 py-1.5 rounded-xl text-white font-bold text-xs shadow-lg cursor-pointer"
                >
                  {language === 'ar' ? 'حفظ التعديل' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Printable Payslip Voucher */}
      {viewingPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#171d2b] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#F43F5E]" />
                <h3 className="font-heading font-semibold text-lg text-white">
                  {language === 'ar' ? 'قسيمة راتب معتمدة' : 'Official Payslip Voucher'}
                </h3>
              </div>
              <button
                onClick={() => setViewingPayslip(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#111622] border border-white/10 space-y-3 text-xs font-mono">
              <div className="text-center pb-2 border-b border-white/10 font-sans">
                <div className="font-heading text-base font-bold text-white">ÉTOILE BALLET ACADEMY</div>
                <div className="text-[10px] text-slate-500">Faculty Compensation Statement // August 2026</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><span className="text-slate-500">Instructor:</span> <strong className="text-white">{viewingPayslip.staffName}</strong></div>
                <div><span className="text-slate-500">Role:</span> {viewingPayslip.role}</div>
                <div><span className="text-slate-500">Period:</span> {viewingPayslip.period}</div>
                <div><span className="text-slate-500">Method:</span> {viewingPayslip.paymentMethod.replace('_', ' ')}</div>
              </div>

              <div className="border-t border-white/10 pt-2 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Base Retainer Salary:</span>
                  <strong className="text-white">{formatCurrency(viewingPayslip.baseSalary, 'en')}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Class Teaching Pay ({viewingPayslip.classesTaught} classes @ {formatCurrency(viewingPayslip.hourlyRate, 'en')}):</span>
                  <strong className="text-white">{formatCurrency(viewingPayslip.classHourlyPay, 'en')}</strong>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Private Lessons Share:</span>
                  <strong>+{formatCurrency(viewingPayslip.privateLessonCut, 'en')}</strong>
                </div>
                <div className="flex justify-between text-amber-400">
                  <span>Bonus / Commission:</span>
                  <strong>+{formatCurrency(viewingPayslip.bonusAmount, 'en')}</strong>
                </div>
                {viewingPayslip.deductionAmount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Advances / Deductions:</span>
                    <strong>-{formatCurrency(viewingPayslip.deductionAmount, 'en')}</strong>
                  </div>
                )}
                <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-bold text-[#fb7185]">
                  <span>Total Net Disbursed:</span>
                  <span>{formatCurrency(viewingPayslip.totalNetPay, 'en')}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl border border-white/10 hover:border-[#F43F5E] bg-[#111622] text-[#fb7185] hover:text-white transition text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{language === 'ar' ? 'طباعة القسيمة' : 'Print Voucher'}</span>
              </button>
              <button
                onClick={() => setViewingPayslip(null)}
                className="action-btn-coral px-4 py-2 rounded-xl text-white font-bold text-xs shadow-lg transition cursor-pointer"
              >
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

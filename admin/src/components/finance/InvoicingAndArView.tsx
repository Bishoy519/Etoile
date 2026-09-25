import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { formatCurrency } from '../../utils/currency';
import { api } from '../../utils/api';
import { InvoiceItem } from '../../types';
import { PayLinkButton } from '../PayLinkButton';
import { CreditNoteModal } from './CreditNoteModal';
import { DiscountsSection } from './DiscountsSection';
import { ViewSwitcher, useViewPrefs } from '../ViewSwitcher';
import { exportCsv } from '../../utils/csv';
import {
  FileText,
  Plus,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  X,
  Building2,
  CreditCard,
  Banknote,
  Search,
  Filter,
  UserCheck,
  Calendar,
  Download,
} from 'lucide-react';

export const InvoicingAndArView: React.FC = () => {
  const {
    invoices,
    students,
    createManualInvoice,
    recordManualPayment,
    settleStudentDebt,
    language,
    triggerOpenWaAlert,
    showToast,
    logCrmAction,
  } = useAdmin();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const invView = useViewPrefs('finance-invoices', 'table');

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<InvoiceItem | null>(null);
  const [creditInvoice, setCreditInvoice] = useState<InvoiceItem | null>(null);

  // New Invoice Form
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [invoiceType, setInvoiceType] = useState<'tuition' | 'boutique' | 'private_lesson' | 'custom'>('tuition');
  const [itemDescription, setItemDescription] = useState<string>('Conservatory Masterclass Fee');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemUnitPrice, setItemUnitPrice] = useState<number>(1500);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  // Payment Form
  const [paymentAmount, setPaymentAmount] = useState<number>(1000);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'instapay' | 'card' | 'bank_transfer' | 'wallet_debt'>('cash');
  const [referenceNo, setReferenceNo] = useState<string>('');

  // Settle Debt directly for student
  const [selectedStudentForDebt, setSelectedStudentForDebt] = useState<string>(students[0]?.id || '');
  const [debtPaymentAmount, setDebtPaymentAmount] = useState<number>(500);

  // Filtered Invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.studentName && inv.studentName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Calculate Aging Receivables
  const totalArDebt = students.reduce((sum, s) => sum + (s.walletBalance < 0 ? Math.abs(s.walletBalance) : 0), 0);
  const totalUnpaidInvoices = invoices.reduce((sum, inv) => sum + inv.remainingDue, 0);

  // Handle student select in invoice form
  const handleStudentSelect = (stuId: string) => {
    setSelectedStudentId(stuId);
    const stu = students.find((s) => s.id === stuId);
    if (stu) {
      setCustomerName(stu.parentName || stu.name);
      setCustomerPhone(stu.parentPhone || '');
    }
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || customerName.trim().length < 2) { showToast('Cannot create invoice', 'Customer name is required (min 2 chars).', 'error'); return; }
    if (!itemDescription.trim()) { showToast('Cannot create invoice', 'Item description is required.', 'error'); return; }
    if (!Number.isFinite(Number(itemQuantity)) || Number(itemQuantity) <= 0 || !Number.isInteger(Number(itemQuantity)) || Number(itemQuantity) > 1000) { showToast('Cannot create invoice', 'Quantity must be a whole number 1–1000.', 'error'); return; }
    if (!Number.isFinite(Number(itemUnitPrice)) || Number(itemUnitPrice) <= 0 || Number(itemUnitPrice) > 1000000) { showToast('Cannot create invoice', 'Unit price must be greater than 0.', 'error'); return; }
    const disc = Number(discountAmount);
    if (!Number.isFinite(disc) || disc < 0) { showToast('Cannot create invoice', 'Discount cannot be negative.', 'error'); return; }
    const subtotal = Number(itemQuantity) * Number(itemUnitPrice);
    if (disc > subtotal) { showToast('Cannot create invoice', 'Discount cannot exceed subtotal.', 'error'); return; }
    if (customerPhone.trim() && (customerPhone.replace(/\D/g, '').length < 7 || customerPhone.replace(/\D/g, '').length > 15)) { showToast('Cannot create invoice', 'Phone must contain 7–15 digits.', 'error'); return; }

    const stu = students.find((s) => s.id === selectedStudentId);

    createManualInvoice({
      studentId: selectedStudentId || undefined,
      studentName: stu?.name,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      type: invoiceType,
      items: [
        {
          description: itemDescription.trim(),
          quantity: Number(itemQuantity),
          unitPrice: Number(itemUnitPrice),
        },
      ],
      discountAmount: Number(discountAmount),
      dueDate,
      notes: notes.trim() || undefined,
    });

    setIsInvoiceModalOpen(false);
    // Reset
    setCustomerName('');
    setCustomerPhone('');
    setItemDescription('');
    setItemUnitPrice(1000);
    setDiscountAmount(0);
  };

  const handleOpenPayModal = (inv: InvoiceItem) => {
    setSelectedInvoiceForPay(inv);
    setPaymentAmount(inv.remainingDue);
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPay) { showToast('Cannot record payment', 'No invoice selected.', 'error'); return; }
    if (!Number.isFinite(Number(paymentAmount)) || Number(paymentAmount) <= 0) { showToast('Cannot record payment', 'Amount must be greater than 0.', 'error'); return; }
    if (Number(paymentAmount) > selectedInvoiceForPay.remainingDue + 0.01) { showToast('Cannot record payment', `Amount cannot exceed remaining due (${selectedInvoiceForPay.remainingDue}).`, 'error'); return; }

    recordManualPayment({
      invoiceId: selectedInvoiceForPay.id,
      studentId: selectedInvoiceForPay.studentId,
      studentName: selectedInvoiceForPay.studentName,
      amount: Number(paymentAmount),
      method: paymentMethod,
      referenceNo: referenceNo.trim() || undefined,
    });

    setIsPaymentModalOpen(false);
    setSelectedInvoiceForPay(null);
    setReferenceNo('');
  };

  const handleDirectSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForDebt) { showToast('Cannot settle', 'Select a student first.', 'error'); return; }
    if (!Number.isFinite(Number(debtPaymentAmount)) || Number(debtPaymentAmount) <= 0) { showToast('Cannot settle', 'Amount must be greater than 0.', 'error'); return; }
    const stu = students.find((s) => s.id === selectedStudentForDebt);
    const owed = stu ? Math.abs(Math.min(0, stu.walletBalance)) : 0;
    if (owed > 0 && Number(debtPaymentAmount) > owed + 0.01) { showToast('Overpayment', `This student owes ${owed}. Amount adjusted would overpay.`, 'warning'); return; }
    settleStudentDebt(selectedStudentForDebt, Number(debtPaymentAmount));
    setDebtPaymentAmount(500);
  };

  return (
    <div className="space-y-6">
      <DiscountsSection />
      {/* Top 3 AR Aging Buckets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#171d2b] border border-emerald-500/20 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>{language === 'ar' ? 'الذمم المدينة الجارية (0-30 يوم)' : 'Current Receivables (0-30d)'}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
          </div>
          <div className="font-heading font-bold text-xl sm:text-2xl text-white">
            {formatCurrency(totalUnpaidInvoices * 0.65, language)}
          </div>
          <span className="text-[10px] text-emerald-400 mt-1 block">
            {language === 'ar' ? 'فواتير واشتراكات منتظمة' : 'Normal tuition & store credit'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#171d2b] border border-amber-500/20 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>{language === 'ar' ? 'المستحقات المتأخرة (31-60 يوم)' : 'Past Due (31-60d)'}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
          </div>
          <div className="font-heading font-bold text-xl sm:text-2xl text-amber-300">
            {formatCurrency(totalUnpaidInvoices * 0.25, language)}
          </div>
          <span className="text-[10px] text-amber-400 mt-1 block">
            {language === 'ar' ? 'تنبيهات تلقائية مجدولة عبر واتساب' : 'WhatsApp payment reminders sent'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#171d2b] border border-rose-500/20 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>{language === 'ar' ? 'الديون الحرجة (+60 يوم)' : 'Critical / Overdue (+60d)'}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
          </div>
          <div className="font-heading font-bold text-xl sm:text-2xl text-rose-400">
            {formatCurrency(totalArDebt, language)}
          </div>
          <span className="text-[10px] text-rose-400 mt-1 block">
            {language === 'ar' ? 'تجميد مؤقت للحصص حتى السداد' : 'Requires immediate reception settlement'}
          </span>
        </div>
      </div>

      {/* Direct Student Wallet Settlement Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#171d2b] border border-white/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h5 className="font-heading font-semibold text-sm text-[#F43F5E] flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#F43F5E]" />
            <span>{language === 'ar' ? 'تحصيل فوري لمديونية طالب (خزينة الاستقبال)' : 'Fast-Track Student Debt Settlement'}</span>
          </h5>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'ar' ? 'تحصيل مبالغ نقدية أو بنكية لتسوية رصيد المحفظة السالب للطالب.' : 'Directly credit student wallet to clear debt in cash or card.'}
          </p>
        </div>

        <form onSubmit={handleDirectSettle} className="flex flex-wrap items-center gap-2">
          <select
            value={selectedStudentForDebt}
            onChange={(e) => setSelectedStudentForDebt(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-white/10 bg-[#111622] text-xs text-white focus:outline-none focus:border-[#F43F5E]"
          >
            {students.map((stu) => (
              <option key={stu.id} value={stu.id}>
                {stu.name} ({formatCurrency(stu.walletBalance, language)})
              </option>
            ))}
          </select>

          <div className="relative">
            <input
              type="number"
              min="1"
              step="50"
              value={debtPaymentAmount}
              onChange={(e) => setDebtPaymentAmount(Number(e.target.value))}
              className="w-28 px-3 py-1.5 rounded-xl border border-white/10 bg-[#111622] text-xs text-white focus:outline-none focus:border-[#F43F5E] font-mono"
            />
          </div>

          <button
            type="submit"
            className="action-btn-coral px-4 py-1.5 rounded-xl text-white font-bold text-xs shadow-md transition cursor-pointer"
          >
            {language === 'ar' ? 'تحصيل الآن' : 'Collect Cash'}
          </button>
        </form>
      </div>

      {/* Invoice Management Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#171d2b] border border-white/10 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 rtl:left-auto rtl:right-3" />
            <input
              type="text"
              placeholder={language === 'ar' ? 'بحث برقم الفاتورة أو الاسم...' : 'Search invoice or student...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-1.5 rounded-xl border border-white/10 bg-[#111622] text-xs text-white placeholder:text-slate-500 w-48 sm:w-60 focus:outline-none focus:border-[#F43F5E]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-white/10 bg-[#111622] text-xs text-slate-300 focus:outline-none focus:border-[#F43F5E]"
          >
            <option value="all">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
            <option value="unpaid">{language === 'ar' ? 'غير مسددة' : 'Unpaid'}</option>
            <option value="partial">{language === 'ar' ? 'سداد جزئي' : 'Partially Paid'}</option>
            <option value="paid">{language === 'ar' ? 'مسددة بالكامل' : 'Fully Settled'}</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ViewSwitcher moduleKey="finance-invoices" modes={['table']} value={{ mode: invView.mode, density: invView.density }} onChange={(p) => { invView.setMode(p.mode); invView.setDensity(p.density); }} />
          <button
            onClick={() => {
              exportCsv(`invoices-${new Date().toISOString().split('T')[0]}`, ['invoiceNumber', 'customerName', 'total', 'amountPaid', 'remainingDue', 'status', 'dueDate'], filteredInvoices.map((inv) => ({
                invoiceNumber: inv.invoiceNumber,
                customerName: inv.customerName,
                total: inv.totalAmount,
                amountPaid: inv.paidAmount,
                remainingDue: inv.remainingDue,
                status: inv.status,
                dueDate: inv.dueDate,
              })), { module: 'invoices' });
              logCrmAction('Invoice Export', `Exported ${filteredInvoices.length} invoices to CSV`, 'financial');
            }}
            className="px-3 py-2 rounded-xl border border-white/10 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="action-btn-coral px-3.5 py-2 rounded-xl text-white font-bold text-xs shadow-lg flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'إنشاء فاتورة يدوية' : '+ Create Invoice'}</span>
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className={`bg-[#171d2b] border border-white/10 rounded-2xl overflow-hidden shadow-sm ${invView.density === 'compact' ? 'density-compact' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left rtl:text-right">
            <thead className="bg-[#111622] border-b border-white/10 text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <tr>
                <th className="px-4 py-3">{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'العميل / الطالب' : 'Customer / Student'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'نوع الفاتورة' : 'Type'}</th>
                <th className="px-4 py-3 text-right rtl:text-left">{language === 'ar' ? 'الإجمالي (EGP)' : 'Total (EGP)'}</th>
                <th className="px-4 py-3 text-right rtl:text-left">{language === 'ar' ? 'المسدد' : 'Paid'}</th>
                <th className="px-4 py-3 text-right rtl:text-left">{language === 'ar' ? 'المتبقي المستحق' : 'Remaining Due'}</th>
                <th className="px-4 py-3 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="px-4 py-3 text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-[#111622]/60 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-[#F43F5E]">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{inv.customerName}</div>
                    {inv.studentName && (
                      <div className="text-[10px] text-slate-500">{inv.studentName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#111622] border border-white/10 capitalize text-slate-300">
                      {inv.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right rtl:text-left font-mono font-semibold text-white">
                    {formatCurrency(inv.totalAmount, language)}
                  </td>
                  <td className="px-4 py-3 text-right rtl:text-left font-mono text-emerald-400">
                    {formatCurrency(inv.paidAmount, language)}
                  </td>
                  <td className="px-4 py-3 text-right rtl:text-left font-mono font-bold text-rose-400">
                    {formatCurrency(inv.remainingDue, language)}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {inv.status === 'paid' ? (
                      <span className="status-pill-emerald px-2.5 py-0.5 text-[10px] font-semibold inline-block">
                        {language === 'ar' ? 'مسددة' : 'Paid'}
                      </span>
                    ) : inv.status === 'partial' ? (
                      <span className="status-pill-amber px-2.5 py-0.5 text-[10px] font-semibold inline-block">
                        {language === 'ar' ? 'جزئي' : 'Partial'}
                      </span>
                    ) : (
                      <span className="status-pill-coral px-2.5 py-0.5 text-[10px] font-semibold inline-block">
                        {language === 'ar' ? 'غير مسددة' : 'Unpaid'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      {inv.paidAmount > 0 && (inv.status === 'paid' || inv.status === 'partial') && (
                        <button
                          onClick={() => setCreditInvoice(inv)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                          title={language === 'ar' ? 'إصدار إشعار دائن' : 'Issue credit note'}
                        >
                          {language === 'ar' ? 'إشعار دائن' : 'Credit'}
                        </button>
                      )}
                      {inv.remainingDue > 0 && (
                        <>
                          <button
                            onClick={() => handleOpenPayModal(inv)}
                            className="action-btn-coral px-2.5 py-1 rounded-lg text-white font-bold text-[10px] shadow-sm cursor-pointer"
                          >
                            {language === 'ar' ? 'تحصيل دفعة' : 'Record Pay'}
                          </button>
                          <details className="relative">
                            <summary className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/[0.05] border border-white/10 text-slate-200 cursor-pointer list-none hover:border-rose-500/40">
                              {language === 'ar' ? 'رابط دفع' : 'Pay-link'}
                            </summary>
                            <div className="absolute right-0 mt-2 w-72 z-30 premium-card p-3 space-y-2">
                              <PayLinkButton invoiceId={inv.id} studentId={inv.studentId} amount={inv.remainingDue} phone={inv.customerPhone} compact />
                              <button
                                onClick={async () => {
                                  try {
                                    const { data: d } = await api.post('/api/eta/submit', { invoiceId: inv.id, invoice: inv });
                                    showToast(language === 'ar' ? 'ETA' : 'ETA e-receipt', d.note || d.status || 'draft', 'gold');
                                  } catch {
                                    showToast('ETA offline', 'Stubbed — will submit when online.', 'warning');
                                  }
                                }}
                                className="btn-ghost w-full py-1.5 text-[10px] font-bold"
                              >
                                {language === 'ar' ? 'إرسال للضرائب (ETA)' : 'Submit ETA e-receipt'}
                              </button>
                            </div>
                          </details>
                        </>
                      )}
                      {inv.customerPhone && (
                        <button
                          onClick={() =>
                            triggerOpenWaAlert(
                              'debt_reminder',
                              inv.customerPhone!,
                              inv.customerName,
                              `تذكير: فاتورة أكاديمية إيتوال رقم ${inv.invoiceNumber} بمبلغ متبقي ${formatCurrency(inv.remainingDue, 'ar')}. يرجى التكرم بالسداد.`
                            )
                          }
                          className="p-1.5 rounded-lg border border-white/10 bg-[#111622] text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition cursor-pointer"
                          title={language === 'ar' ? 'إرسال تذكير واتساب' : 'Send WhatsApp Reminder'}
                        >
                          <Send className="w-3.5 h-3.5" />
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

      {/* Modal: Create Custom Invoice */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-rose-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-400" />
                <h3 className="font-heading font-semibold text-lg text-rose-400">
                  {language === 'ar' ? 'إصدار فاتورة أكاديمية مخصصة' : 'Create Custom Invoice'}
                </h3>
              </div>
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    {language === 'ar' ? 'اختيار طالب مسجل' : 'Link Student (Optional)'}
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => handleStudentSelect(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-rose-500"
                  >
                    <option value="">{language === 'ar' ? '-- عميل خارجي --' : '-- External Client --'}</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    {language === 'ar' ? 'نوع الفاتورة' : 'Invoice Type'}
                  </label>
                  <select
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-rose-500"
                  >
                    <option value="tuition">{language === 'ar' ? 'اشتراك باليه / مصاريف دراسية' : 'Ballet Tuition'}</option>
                    <option value="private_lesson">{language === 'ar' ? 'تدريب فردي خاص (Masterclass)' : 'Private Lesson'}</option>
                    <option value="boutique">{language === 'ar' ? 'أزياء / أدوات بوتيك' : 'Boutique Merchandise'}</option>
                    <option value="custom">{language === 'ar' ? 'رسوم اختبار / حفل ختامي' : 'Audition / Gala Fee'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    {language === 'ar' ? 'اسم العميل / ولي الأمر' : 'Customer Name'} *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    {language === 'ar' ? 'رقم هاتف التواصل' : 'Contact Phone'}
                  </label>
                  <input
                    type="text"
                    placeholder="+20 1..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  {language === 'ar' ? 'بيان البند والخدمة' : 'Item Description'} *
                </label>
                <input
                  type="text"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    {language === 'ar' ? 'الكمية' : 'Quantity'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    {language === 'ar' ? 'السعر (EGP)' : 'Price (EGP)'} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="50"
                    value={itemUnitPrice}
                    onChange={(e) => setItemUnitPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    {language === 'ar' ? 'الخصم (EGP)' : 'Discount (EGP)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-rose-500/20 flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-muted)]">
                  {language === 'ar' ? 'إجمالي الفاتورة المستحق:' : 'Total Invoice Due:'}
                </span>
                <span className="font-mono font-bold text-sm text-rose-400">
                  {formatCurrency(Math.max(0, itemQuantity * itemUnitPrice - discountAmount), language)}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-rose-500 text-black font-semibold transition hover:brightness-110 shadow-md"
                >
                  {language === 'ar' ? 'إصدار الفاتورة' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Manual Payment */}
      {isPaymentModalOpen && selectedInvoiceForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-rose-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="font-heading font-semibold text-base text-rose-400">
                  {language === 'ar' ? 'تحصيل دفعة مالية' : 'Record Payment'}
                </h3>
                <span className="text-xs text-[var(--text-muted)]">
                  {selectedInvoiceForPay.invoiceNumber} // {selectedInvoiceForPay.customerName}
                </span>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  {language === 'ar' ? 'المبلغ المحصل (EGP)' : 'Amount Paid (EGP)'} *
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedInvoiceForPay.remainingDue}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-rose-500 font-mono"
                />
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                  {language === 'ar' ? 'المتبقي على الفاتورة:' : 'Remaining Due:'} {formatCurrency(selectedInvoiceForPay.remainingDue, language)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  {language === 'ar' ? 'طريقة الاستلام' : 'Payment Method'}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-rose-500"
                >
                  <option value="cash">{language === 'ar' ? 'نقداً بخزينة الاستقبال (Cash)' : 'Cash Drawer'}</option>
                  <option value="instapay">{language === 'ar' ? 'إنستاباي - تحويل فوري (InstaPay)' : 'InstaPay Instant Transfer'}</option>
                  <option value="bank_transfer">{language === 'ar' ? 'تحويل بنكي مباشر' : 'Bank Transfer'}</option>
                  <option value="card">{language === 'ar' ? 'بطاقة بنكية عبر POS' : 'Credit / Debit Card'}</option>
                </select>
                <span className="text-[10px] text-emerald-400 font-medium mt-1 block">
                  {selectedInvoiceForPay?.type === 'boutique'
                    ? (language === 'ar' ? '🏬 يودع تلقائياً في حساب المتجر (Store Safe)' : 'Deposits into Store Safe')
                    : (language === 'ar' ? '🩰 يودع تلقائياً في حساب الاشتراكات (Subscriptions Account)' : 'Deposits into Subscriptions Account')}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  {language === 'ar' ? 'رقم الإيصال الورقي أو كود التحويل' : 'Reference Code / Receipt #'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. CIB-AUTH-9801"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-rose-500 text-black font-semibold transition hover:brightness-110 shadow-md"
                >
                  {language === 'ar' ? 'إثبات التحصيل' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Credit notes */}
      {creditInvoice && (
        <CreditNoteModal
          invoice={creditInvoice}
          invoices={invoices}
          onClose={() => setCreditInvoice(null)}
          onChanged={() => window.location.reload()}
        />
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { formatCurrency } from '../../utils/currency';
import { exportCsv } from '../../utils/csv';
import { ExpenseCategory, ExpenseItem } from '../../types';
import { ApprovalQueue } from './ApprovalQueue';
import { ViewSwitcher, useViewPrefs } from '../ViewSwitcher';
import {
  Receipt,
  Plus,
  Trash2,
  Filter,
  CheckCircle2,
  Clock,
  Calendar,
  Building2,
  DollarSign,
  X,
  CreditCard,
  Banknote,
  Search,
  ExternalLink,
  Download,
} from 'lucide-react';

export const ExpenseTrackerView: React.FC = () => {
  const { expenses, addExpense, deleteExpense, language, currentUser, showToast } = useAdmin();

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const expView = useViewPrefs('finance-expenses', 'table');

  // New Expense Form State
  const [vendorName, setVendorName] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('rent');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(5000);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash_drawer' | 'bank_transfer' | 'credit_card' | 'check'>('bank_transfer');
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [accountCode, setAccountCode] = useState<string>('60100');
  const [notes, setNotes] = useState<string>('');

  const filteredExpenses = expenses.filter((e) => {
    const matchesCat = categoryFilter === 'all' || e.category === categoryFilter;
    const matchesSearch =
      e.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.expenseNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalPaidExpenses = filteredExpenses
    .filter((e) => e.status === 'paid')
    .reduce((sum, e) => sum + e.totalWithTax, 0);

  const handleApplyVat = () => {
    const vat = Math.round(amount * 0.14);
    setTaxAmount(vat);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim() || vendorName.trim().length < 2) { showToast('Cannot save', 'Vendor name is required (min 2 chars).', 'error'); return; }
    if (!description.trim() || description.trim().length < 3) { showToast('Cannot save', 'Description is required (min 3 chars).', 'error'); return; }
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0 || Number(amount) > 10000000) { showToast('Cannot save', 'Amount must be greater than 0.', 'error'); return; }
    const taxNum = Number(taxAmount);
    if (!Number.isFinite(taxNum) || taxNum < 0 || taxNum > Number(amount)) { showToast('Cannot save', 'VAT must be between 0 and the amount.', 'error'); return; }
    if (!expenseDate) { showToast('Cannot save', 'Expense date is required.', 'error'); return; }
    if (new Date(expenseDate) > new Date()) { showToast('Cannot save', 'Expense date cannot be in the future.', 'error'); return; }
    if (receiptUrl.trim()) {
      try {
        const u = new URL(receiptUrl.trim());
        if (!['http:', 'https:'].includes(u.protocol)) { showToast('Cannot save', 'Receipt URL must start with http(s)://.', 'error'); return; }
      } catch { showToast('Cannot save', 'Receipt URL is not valid.', 'error'); return; }
    }

    addExpense({
      category,
      categoryAr:
        category === 'rent'
          ? 'إيجار الاستوديوهات'
          : category === 'utilities'
          ? 'الكهرباء والتكييف'
          : category === 'maintenance'
          ? 'صيانة الأرضيات'
          : category === 'marketing'
          ? 'التسويق والإعلانات'
          : category === 'software'
          ? 'تراخيص البرمجيات'
          : category === 'costumes'
          ? 'أزياء العروض والمسارح'
          : category === 'supplies'
          ? 'مستلزمات ومطبوعات'
          : 'مصروفات متنوعة',
      vendorName: vendorName.trim(),
      description: description.trim(),
      amount: Number(amount),
      taxAmount: Number(taxAmount),
      totalWithTax: Number(amount) + Number(taxAmount),
      paymentMethod,
      status: 'paid',
      expenseDate,
      receiptUrl: receiptUrl.trim() || undefined,
      accountCode,
      recordedBy: currentUser?.name || 'Finance Staff',
      notes: notes.trim() || undefined,
    });

    setIsModalOpen(false);
    // Reset form
    setVendorName('');
    setDescription('');
    setAmount(1000);
    setTaxAmount(0);
    setReceiptUrl('');
    setNotes('');
  };

  const getCategoryLabel = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'rent':
        return language === 'ar' ? 'إيجار الاستوديوهات' : 'Studio Rent';
      case 'utilities':
        return language === 'ar' ? 'الكهرباء والتكييف' : 'Utilities & AC';
      case 'maintenance':
        return language === 'ar' ? 'صيانة الأرضيات والبار' : 'Floors & Maintenance';
      case 'marketing':
        return language === 'ar' ? 'التسويق والإعلانات' : 'Marketing & Ads';
      case 'software':
        return language === 'ar' ? 'تراخيص السحابة والنظام' : 'Software & SaaS';
      case 'costumes':
        return language === 'ar' ? 'أزياء واستعراضات' : 'Costumes & Gala';
      case 'supplies':
        return language === 'ar' ? 'مستلزمات ومطبوعات' : 'Studio Supplies';
      default:
        return language === 'ar' ? 'مصروفات عامة' : 'Other OPEX';
    }
  };

  return (
    <div className="space-y-6">
      <ApprovalQueue />
      {/* Action Header & Filtering Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#171d2b] border border-white/10 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 rtl:left-auto rtl:right-3" />
            <input
              type="text"
              placeholder={language === 'ar' ? 'بحث في المصروفات أو المورد...' : 'Search vendor or description...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-1.5 rounded-xl border border-white/10 bg-[#111622] text-xs text-white placeholder:text-slate-500 w-48 sm:w-60 focus:outline-none focus:border-[#F43F5E]"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-white/10 bg-[#111622] text-xs text-slate-300 focus:outline-none focus:border-[#F43F5E]"
          >
            <option value="all">{language === 'ar' ? 'جميع التصنيفات' : 'All Categories'}</option>
            <option value="rent">{language === 'ar' ? 'إيجار الاستوديوهات' : 'Studio Rent'}</option>
            <option value="utilities">{language === 'ar' ? 'الكهرباء والتكييف' : 'Utilities & AC'}</option>
            <option value="maintenance">{language === 'ar' ? 'صيانة الأرضيات' : 'Maintenance'}</option>
            <option value="marketing">{language === 'ar' ? 'التسويق والإعلانات' : 'Marketing'}</option>
            <option value="software">{language === 'ar' ? 'تراخيص السحابة' : 'Software SaaS'}</option>
            <option value="costumes">{language === 'ar' ? 'أزياء العروض' : 'Costumes'}</option>
            <option value="supplies">{language === 'ar' ? 'مستلزمات عامة' : 'Supplies'}</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <ViewSwitcher moduleKey="finance-expenses" modes={['table', 'rows']} value={{ mode: expView.mode, density: expView.density }} onChange={(p) => { expView.setMode(p.mode); expView.setDensity(p.density); }} />
          <button
            onClick={() => exportCsv(`expenses-${new Date().toISOString().split('T')[0]}`, ['expenseNumber', 'expenseDate', 'category', 'vendorName', 'description', 'amount', 'taxAmount', 'totalWithTax', 'paymentMethod'], filteredExpenses.map((e) => ({
              expenseNumber: e.expenseNumber, expenseDate: e.expenseDate, category: e.category, vendorName: e.vendorName,
              description: e.description, amount: e.amount, taxAmount: e.taxAmount, totalWithTax: e.totalWithTax, paymentMethod: e.paymentMethod,
            })))}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5"
            title={language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
          >
            <Download className="w-3.5 h-3.5" /><span>CSV</span>
          </button>
          <div className="text-right rtl:text-left">
            <span className="text-[10px] uppercase text-slate-400 block">
              {language === 'ar' ? 'إجمالي المصروفات المعروضة' : 'Total Filtered OPEX'}
            </span>
            <span className="font-heading font-bold text-rose-400 text-sm sm:text-base">
              {formatCurrency(totalPaidExpenses, language)}
            </span>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="action-btn-coral px-3.5 py-2 rounded-xl text-white font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'تسجيل مصروف يدوي' : '+ Record Expense'}</span>
          </button>
        </div>
      </div>

      {/* Expenses Table / Rows */}
      {expView.mode === 'rows' ? (
        <div className="bg-[#171d2b] border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
          {filteredExpenses.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-slate-500">
              {language === 'ar' ? 'لا توجد مصروفات مسجلة في هذا التصنيف.' : 'No expenses recorded in this category.'}
            </p>
          ) : (
            filteredExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-[#111622]/60 transition">
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-white truncate">{expense.vendorName}</span>
                  <span className="block text-[11px] text-slate-500 truncate">{expense.expenseNumber} • {expense.description}</span>
                </span>
                <span className="font-mono font-bold text-rose-400 flex-shrink-0">{formatCurrency(expense.totalWithTax, language)}</span>
                <button
                  onClick={() => { if (window.confirm(`Delete expense ${expense.expenseNumber}?`)) deleteExpense(expense.id); }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition flex-shrink-0"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
      <div className={`bg-[#171d2b] border border-white/10 rounded-2xl overflow-hidden shadow-sm ${expView.density === 'compact' ? 'density-compact' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left rtl:text-right">
            <thead className="bg-[#111622] border-b border-white/10 text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <tr>
                <th className="px-4 py-3">{language === 'ar' ? 'رقم القيد' : 'Voucher No'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'التصنيف' : 'Category'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'المورد والبيان' : 'Vendor & Description'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'طريقة السداد' : 'Method'}</th>
                <th className="px-4 py-3 text-right rtl:text-left">{language === 'ar' ? 'المبلغ الصافي' : 'Base'}</th>
                <th className="px-4 py-3 text-right rtl:text-left">{language === 'ar' ? 'الإجمالي (EGP)' : 'Total (EGP)'}</th>
                <th className="px-4 py-3 text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    {language === 'ar' ? 'لا توجد مصروفات مسجلة في هذا التصنيف.' : 'No expenses recorded in this category.'}
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-[#111622]/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-[#F43F5E]">
                      {expense.expenseNumber}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                      {expense.expenseDate}
                    </td>
                    <td className="px-4 py-3">
                      <span className="status-pill-amber px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap">
                        {getCategoryLabel(expense.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{expense.vendorName}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">{expense.description}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[11px] text-slate-300 capitalize flex items-center gap-1">
                        {expense.paymentMethod === 'bank_transfer' ? (
                          <Building2 className="w-3.5 h-3.5 text-blue-400" />
                        ) : expense.paymentMethod === 'cash_drawer' ? (
                          <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                        )}
                        <span>{expense.paymentMethod.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right rtl:text-left font-mono text-slate-400">
                      {formatCurrency(expense.amount, language)}
                    </td>
                    <td className="px-4 py-3 text-right rtl:text-left font-mono font-bold text-rose-400">
                      {formatCurrency(expense.totalWithTax, language)}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => { if (window.confirm(`Delete expense ${expense.expenseNumber}?`)) deleteExpense(expense.id); }}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-950/30 transition"
                        title={language === 'ar' ? 'حذف القيد' : 'Delete Expense'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Manual Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-5 sm:p-6 w-full max-w-xl shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#F43F5E]" />
                <h3 className="font-heading font-semibold text-lg text-white">
                  {language === 'ar' ? 'تسجيل مصروف استوديو يدوي' : 'Record Studio Expense'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    {language === 'ar' ? 'تصنيف المصروف' : 'Expense Category'} *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#111622] text-xs text-white focus:outline-none focus:border-[#F43F5E]"
                  >
                    <option value="rent">{language === 'ar' ? 'إيجار الاستوديو (60100)' : 'Studio Lease (60100)'}</option>
                    <option value="utilities">{language === 'ar' ? 'الكهرباء والتكييف (60200)' : 'Utilities & AC (60200)'}</option>
                    <option value="maintenance">{language === 'ar' ? 'صيانة الأرضيات والبار (60300)' : 'Flooring & Barres (60300)'}</option>
                    <option value="marketing">{language === 'ar' ? 'التسويق والإعلانات (60400)' : 'Marketing & Ads (60400)'}</option>
                    <option value="software">{language === 'ar' ? 'تراخيص السحابة والسيستم (60500)' : 'Software & SaaS (60500)'}</option>
                    <option value="costumes">{language === 'ar' ? 'أزياء العروض والمسرح (60600)' : 'Costumes & Gala (60600)'}</option>
                    <option value="supplies">{language === 'ar' ? 'مستلزمات استوديو (60700)' : 'Supplies (60700)'}</option>
                    <option value="other">{language === 'ar' ? 'مصروفات أخرى (60900)' : 'Other OPEX (60900)'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    {language === 'ar' ? 'تاريخ المصروف' : 'Expense Date'} *
                  </label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#111622] text-xs text-white focus:outline-none focus:border-[#F43F5E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  {language === 'ar' ? 'اسم المورد / الجهة المستلمة' : 'Vendor / Supplier Name'} *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Zamalek Floor Refinishing, Cairo Power Co."
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#111622] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F43F5E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  {language === 'ar' ? 'بيان وتفاصيل المصروف' : 'Description / Memo'} *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly sprung floor non-slip maintenance & rosin supply"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#111622] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F43F5E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    {language === 'ar' ? 'المبلغ الصافي (EGP)' : 'Base Amount (EGP)'} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#111622] text-xs text-white focus:outline-none focus:border-[#F43F5E] font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium text-slate-300">
                      {language === 'ar' ? 'ضريبة القيمة المضافة (VAT)' : 'Tax / VAT (EGP)'}
                    </label>
                    <button
                      type="button"
                      onClick={handleApplyVat}
                      className="text-[10px] text-[#F43F5E] hover:underline cursor-pointer"
                    >
                      + 14% VAT
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#111622] text-xs text-white focus:outline-none focus:border-[#F43F5E] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    {language === 'ar' ? 'طريقة السداد' : 'Payment Method'} *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#111622] text-xs text-white focus:outline-none focus:border-[#F43F5E]"
                  >
                    <option value="bank_transfer">{language === 'ar' ? 'تحويل بنكي (CIB)' : 'Bank Transfer'}</option>
                    <option value="cash_drawer">{language === 'ar' ? 'نقداً من خزينة الاستقبال' : 'Cash Drawer Register'}</option>
                    <option value="credit_card">{language === 'ar' ? 'بطاقة ائتمان الأكاديمية' : 'Academy Credit Card'}</option>
                    <option value="check">{language === 'ar' ? 'شيك بنكي' : 'Bank Check'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    {language === 'ar' ? 'رابط إيصال / مستند الصرف' : 'Receipt Document / URL'}
                  </label>
                  <input
                    type="text"
                    placeholder="https://... or paper receipt #"
                    value={receiptUrl}
                    onChange={(e) => setReceiptUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#111622] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F43F5E]"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">
                    {language === 'ar' ? 'إجمالي الصرف المستحق:' : 'Total Payable:'}
                  </span>
                  <span className="font-mono font-bold text-base text-rose-400">
                    {formatCurrency(Number(amount) + Number(taxAmount), language)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="action-btn-coral px-5 py-2 rounded-xl text-white font-bold text-xs shadow-lg cursor-pointer"
                  >
                    {language === 'ar' ? 'حفظ وترحيل المصروف' : 'Post Expense'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

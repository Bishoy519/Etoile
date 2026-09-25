import React, { useMemo, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { formatCurrency } from '../../utils/currency';
import { exportCsv } from '../../utils/csv';
import { JournalVoucher } from '../../types';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { ViewSwitcher, useViewPrefs } from '../ViewSwitcher';
import {
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Scale,
  X,
  FileCheck,
  Building2,
  Calendar,
  Search,
  Download,
} from 'lucide-react';

export const GeneralLedgerView: React.FC = () => {
  const { journalEntries, recordJournalEntry, language, showToast } = useAdmin();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [memo, setMemo] = useState('');
  const [reference, setReference] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const debouncedLedgerSearch = useDebouncedValue(ledgerSearch, 200);
  const glView = useViewPrefs('finance-ledger', 'table');

  const filteredEntries = useMemo(() => {
    const needle = debouncedLedgerSearch.trim().toLowerCase();
    if (!needle) return journalEntries;
    return journalEntries.filter((e) => `${e.entryNumber} ${e.memo} ${e.reference || ''} ${e.createdByName}`.toLowerCase().includes(needle));
  }, [journalEntries, debouncedLedgerSearch]);
  const [lines, setLines] = useState<
    { accountCode: string; accountName: string; debit: number; credit: number; description?: string }[]
  >([
    { accountCode: '10100', accountName: 'Cash in Register & Safe', debit: 2000, credit: 0, description: 'Cash float addition' },
    { accountCode: '10200', accountName: 'Operating Bank Account (CIB)', debit: 0, credit: 2000, description: 'Bank branch withdrawal' },
  ]);

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      { accountCode: '60900', accountName: 'Miscellaneous Expense', debit: 0, credit: 0 },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i === index) {
          if (field === 'debit' && Number(value) > 0) return { ...line, debit: Number(value), credit: 0 };
          if (field === 'credit' && Number(value) > 0) return { ...line, credit: Number(value), debit: 0 };
          if ((field === 'debit' || field === 'credit') && Number(value) < 0) return line;
          return { ...line, [field]: value };
        }
        return line;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memo.trim() || memo.trim().length < 5) { showToast('Cannot post', 'Memo is required (min 5 chars).', 'error'); return; }
    const cleaned = lines.filter((l) => Number(l.debit) > 0 || Number(l.credit) > 0);
    if (cleaned.length < 2) { showToast('Cannot post', 'At least two lines with amounts are required.', 'error'); return; }
    for (const l of cleaned) {
      if (Number(l.debit) > 0 && Number(l.credit) > 0) { showToast('Cannot post', 'Each line must be debit OR credit, not both.', 'error'); return; }
      if (!l.accountCode) { showToast('Cannot post', 'Every line needs an account.', 'error'); return; }
    }
    if (!isBalanced) { showToast('Unbalanced voucher', 'Total debit must equal total credit.', 'error'); return; }

    const res = recordJournalEntry({
      memo: memo.trim().slice(0, 200),
      reference: reference.trim().slice(0, 60) || undefined,
      lines: cleaned,
    });

    if (res.success) {
      setIsModalOpen(false);
      setMemo('');
      setReference('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#171d2b] border border-white/10 shadow-sm">
        <div>
          <h4 className="font-heading font-semibold text-lg text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#F43F5E]" />
            <span>{language === 'ar' ? 'دفتر الأستاذ العام والقيود المحاسبية المزدوجة' : 'General Ledger & Double-Entry Journal'}</span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'تسجيل القيود المحاسبية اليدوية، التسويات الجردية، إهلاك الأصول، ومطابقة فروق الخزينة.'
              : 'Audit trail of all posted journal vouchers with strict double-entry debits/credits balance validation.'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="action-btn-coral px-3.5 py-2 rounded-xl text-white font-bold text-xs shadow-lg flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'إنشاء قيد يدوي (Voucher)' : '+ Post Journal Voucher'}</span>
        </button>
        <label className="relative self-start sm:self-auto">
          <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            value={ledgerSearch}
            onChange={(e) => setLedgerSearch(e.target.value)}
            placeholder={language === 'ar' ? 'بحث في القيود...' : 'Search vouchers...'}
            className="ps-8 pe-8 py-2 rounded-xl bg-[#111622] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none w-52"
            aria-label={language === 'ar' ? 'بحث القيود' : 'Search ledger'}
          />
          {ledgerSearch && (
            <button onClick={() => setLedgerSearch('')} className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5" aria-label="Clear search">✕</button>
          )}
        </label>
        <span className="text-[11px] font-mono text-slate-500 self-center">{filteredEntries.length}/{journalEntries.length}</span>
        <button
          onClick={() => exportCsv(`general-ledger-${new Date().toISOString().split('T')[0]}`, ['entryNumber', 'date', 'memo', 'reference', 'totalDebit', 'totalCredit', 'createdBy'], filteredEntries.map((e) => ({
            entryNumber: e.entryNumber, date: e.date, memo: e.memo, reference: e.reference || '', totalDebit: e.totalDebit, totalCredit: e.totalCredit, createdBy: e.createdByName,
          })))}
          className="px-3 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5 self-start sm:self-auto"
          title={language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
        >
          <Download className="w-3.5 h-3.5" /><span>CSV</span>
        </button>
        <ViewSwitcher moduleKey="finance-ledger" modes={['table', 'rows']} value={{ mode: glView.mode, density: glView.density }} onChange={(p) => { glView.setMode(p.mode); glView.setDensity(p.density); }} />
      </div>

      {/* Journal Vouchers List */}
      {glView.mode === 'rows' ? (
        <div className="rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
          {filteredEntries.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-500">No vouchers match.</p>
          ) : (
            filteredEntries.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-white/[0.02] transition">
                <span className="font-mono font-bold text-[#F43F5E] flex-shrink-0">{entry.entryNumber}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-white truncate">{entry.memo}</span>
                  <span className="block text-[11px] text-slate-500 font-mono">{entry.date} • {entry.createdByName}</span>
                </span>
                <span className="font-mono text-emerald-400 flex-shrink-0">{formatCurrency(entry.totalDebit, language)}</span>
              </div>
            ))
          )}
        </div>
      ) : (
      <div className={`space-y-4 ${glView.density === 'compact' ? 'density-compact' : ''}`}>
        {filteredEntries.length === 0 ? (
          <p className="p-6 text-center text-xs text-slate-500 rounded-2xl border border-white/10">No vouchers match your search.</p>
        ) : filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className="bg-[#171d2b] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-sm text-[#F43F5E]">{entry.entryNumber}</span>
                <span className="text-xs font-semibold text-white">{entry.memo}</span>
                {entry.reference && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#111622] border border-white/10 text-slate-400">
                    Ref: {entry.reference}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span>{entry.date}</span>
                <span>•</span>
                <span>By: {entry.createdByName}</span>
              </div>
            </div>

            {/* Voucher Lines Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left rtl:text-right font-mono">
                <thead className="text-[10px] text-slate-400 uppercase border-b border-white/10">
                  <tr>
                    <th className="py-2 pr-3">{language === 'ar' ? 'رقم الحساب' : 'Account #'}</th>
                    <th className="py-2">{language === 'ar' ? 'اسم الحساب والبيان' : 'Account Name & Memo'}</th>
                    <th className="py-2 text-right rtl:text-left">{language === 'ar' ? 'مدين (Debit)' : 'Debit'}</th>
                    <th className="py-2 text-right rtl:text-left">{language === 'ar' ? 'دائن (Credit)' : 'Credit'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {entry.lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-[#111622]/60 transition">
                      <td className="py-2 pr-3 text-[#F43F5E] font-bold">{line.accountCode}</td>
                      <td className="py-2">
                        <span className="text-white font-sans font-medium">{line.accountName}</span>
                        {line.description && (
                          <span className="text-[10px] text-slate-400 block font-sans">
                            {line.description}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right rtl:text-left text-emerald-400 font-semibold">
                        {line.debit > 0 ? formatCurrency(line.debit, language) : '-'}
                      </td>
                      <td className="py-2 text-right rtl:text-left text-rose-300 font-semibold">
                        {line.credit > 0 ? formatCurrency(line.credit, language) : '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#111622] font-bold text-white border-t border-white/10">
                    <td colSpan={2} className="py-2 font-sans text-right rtl:text-left pr-4">
                      {language === 'ar' ? 'الإجمالي المتوازن:' : 'Balanced Total:'}
                    </td>
                    <td className="py-2 text-right rtl:text-left text-emerald-400">
                      {formatCurrency(entry.totalDebit, language)}
                    </td>
                    <td className="py-2 text-right rtl:text-left text-rose-400">
                      {formatCurrency(entry.totalCredit, language)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Modal: Manual Double-Entry Journal Voucher */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-rose-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-rose-400" />
                <h3 className="font-heading font-semibold text-lg text-rose-400">
                  {language === 'ar' ? 'تسجيل سند قيد محاسبي يدوي' : 'Manual Journal Voucher'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    {language === 'ar' ? 'شرح وبيان القيد' : 'Voucher Memo / Narrative'} *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Monthly flooring depreciation or cash discrepancy"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    {language === 'ar' ? 'رقم المستند المرجعي' : 'External Reference #'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AUDIT-2026-08"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Lines table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-rose-400 text-[11px]">
                    {language === 'ar' ? 'بنود القيد المزدوج' : 'Double-Entry Lines'}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-rose-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'إضافة سطر' : 'Add Line'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {lines.map((line, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] items-center"
                    >
                      <div className="col-span-3">
                        <select
                          value={line.accountCode}
                          onChange={(e) => {
                            const code = e.target.value;
                            const nameMap: Record<string, string> = {
                              '10100': 'Cash in Register & Safe',
                              '10200': 'Operating Bank Account (CIB)',
                              '10300': 'Accounts Receivable (STU-Debt)',
                              '20200': 'Deferred Tuition Revenue',
                              '30100': 'Owner Contributed Capital',
                              '40100': 'Classical Ballet Tuition',
                              '40500': 'Store Merchandise Sales',
                              '50100': 'Instructor Teaching Fees',
                              '60100': 'Studio Lease & Rent',
                              '60900': 'Miscellaneous OPEX',
                            };
                            handleLineChange(idx, 'accountCode', code);
                            handleLineChange(idx, 'accountName', nameMap[code] || 'Account');
                          }}
                          className="w-full px-2 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-rose-500"
                        >
                          <option value="10100">10100 Cash in Register</option>
                          <option value="10200">10200 Bank (CIB)</option>
                          <option value="10300">10300 Accounts Receivable</option>
                          <option value="20200">20200 Deferred Tuition</option>
                          <option value="30100">30100 Owner Capital</option>
                          <option value="40100">40100 Classical Tuition</option>
                          <option value="40500">40500 Store Sales</option>
                          <option value="50100">50100 Teaching Costs</option>
                          <option value="60100">60100 Studio Rent</option>
                          <option value="60900">60900 Misc OPEX</option>
                        </select>
                      </div>

                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Line description"
                          value={line.description || ''}
                          onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="0"
                          step="10"
                          placeholder="Debit"
                          value={line.debit || ''}
                          onChange={(e) => handleLineChange(idx, 'debit', Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[11px] text-emerald-400 font-mono focus:outline-none focus:border-rose-500 text-right"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="0"
                          step="10"
                          placeholder="Credit"
                          value={line.credit || ''}
                          onChange={(e) => handleLineChange(idx, 'credit', Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[11px] text-rose-400 font-mono focus:outline-none focus:border-rose-500 text-right"
                        />
                      </div>

                      <div className="col-span-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lines.length <= 2}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-rose-400 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Balance Indicator */}
              <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-between font-mono">
                <div className="flex items-center gap-3">
                  <span>Total Debit: <strong className="text-emerald-400">{formatCurrency(totalDebit, language)}</strong></span>
                  <span>Total Credit: <strong className="text-rose-400">{formatCurrency(totalCredit, language)}</strong></span>
                </div>

                <div>
                  {isBalanced ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'القيد متوازن' : 'Balanced'}</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-rose-950 text-rose-400 text-[11px] font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'غير متوازن' : 'Unbalanced'}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!isBalanced}
                  className="px-5 py-2 rounded-xl bg-rose-500 text-black font-semibold transition hover:brightness-110 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {language === 'ar' ? 'ترحيل القيد' : 'Post Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

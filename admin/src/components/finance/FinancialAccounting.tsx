import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { ExecutiveKpis } from './ExecutiveKpis';
import { TreasuryView } from './TreasuryView';
import { PnLStatementView } from './PnLStatementView';
import { ExpenseTrackerView } from './ExpenseTrackerView';
import { PayrollCalculatorView } from './PayrollCalculatorView';
import { InvoicingAndArView } from './InvoicingAndArView';
import { GeneralLedgerView } from './GeneralLedgerView';
import { TrialBalanceView } from './TrialBalanceView';
import { BalanceSheetView } from './BalanceSheetView';
import { CashFlowView } from './CashFlowView';
import { DeferredWaterfallView } from './DeferredWaterfallView';
import { ApAgingView } from './ApAgingView';
import { BudgetView } from './BudgetView';
import { FxView } from './FxView';
import { CashDrawerShiftView } from './CashDrawerShiftView';
import { ModuleSubSidebar } from '../ModuleSubSidebar';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Users,
  FileText,
  Scale,
  Banknote,
  Sparkles,
  Calendar,
  Landmark,
  PiggyBank,
  Coins,
} from 'lucide-react';

export type FinanceTab = 'treasury' | 'overview' | 'expenses' | 'payroll' | 'invoicing' | 'ledger' | 'trial' | 'balance' | 'cashflow' | 'waterfall' | 'ap' | 'budgets' | 'fx' | 'drawer';

export const FinancialAccounting: React.FC = () => {
  const { language } = useAdmin();

  const [activeTab, setActiveTab] = useState<FinanceTab>('treasury');
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | 'last_month' | 'ytd'>('current');
  const [accountingBasis, setAccountingBasis] = useState<'accrual' | 'cash'>('accrual');

  const periodLabel =
    selectedPeriod === 'current'
      ? language === 'ar'
        ? 'أغسطس 2026 (الدورة الحالية)'
        : 'August 2026 (Current Term)'
      : selectedPeriod === 'last_month'
      ? language === 'ar'
        ? 'يوليو 2026 (دورة مغلقة)'
        : 'July 2026 (Last Month)'
      : language === 'ar'
      ? 'العام الأكاديمي 2026 (حتى تاريخه)'
      : 'Academic Year 2026 (YTD)';

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#F43F5E]/15 text-[#fb7185] border border-[#F43F5E]/30">
              <DollarSign className="w-5 h-5" />
            </span>
            <h3 className="font-heading text-xl sm:text-2xl font-bold text-white">
              {language === 'ar' ? 'المركز المالي والمحاسبة الإدارية' : 'Financial Command Center'}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 max-w-2xl">
            {language === 'ar'
              ? 'نظام محاسبي متكامل بالجنيه المصري (EGP) يجمع بين الحساب التلقائي للاستحقاق (IFRS-15) وإمكانية الإدخال والتعديل اليدوي الشامل لكافة الإيرادات والمصروفات والرواتب.'
              : 'Enterprise academy accounting in Egyptian Pounds (EGP) combining automated IFRS-15 accruals with full manual input overrides for expenses, custom invoices, and faculty payroll.'}
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <div className="flex items-center p-1 rounded-xl bg-[#171d2b] border border-white/10 shadow-sm">
            <button
              onClick={() => setSelectedPeriod('current')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                selectedPeriod === 'current'
                  ? 'nav-pill-active bg-white text-slate-950 font-bold shadow-md shadow-white/10'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'ar' ? 'أغسطس 2026' : 'August 2026'}
            </button>
            <button
              onClick={() => setSelectedPeriod('last_month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                selectedPeriod === 'last_month'
                  ? 'nav-pill-active bg-white text-slate-950 font-bold shadow-md shadow-white/10'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'ar' ? 'يوليو 2026' : 'July 2026'}
            </button>
            <button
              onClick={() => setSelectedPeriod('ytd')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                selectedPeriod === 'ytd'
                  ? 'nav-pill-active bg-white text-slate-950 font-bold shadow-md shadow-white/10'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'ar' ? 'إجمالي 2026' : 'YTD 2026'}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Sidebar & Workspace */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        <ModuleSubSidebar<FinanceTab>
          activeId={activeTab}
          onChange={setActiveTab}
          language={language}
          title="Financial Ledger"
          titleAr="الأقسام المالية"
          items={[
            {
              id: 'treasury',
              label: 'Money Accounts & Reconciliation',
              labelAr: 'الحسابات والخزائن والمطابقة',
              icon: <Landmark className="w-4 h-4" />,
            },
            {
              id: 'overview',
              label: 'Executive P&L & Margins',
              labelAr: 'الأرباح والخسائر والمؤشرات',
              icon: <TrendingUp className="w-4 h-4" />,
            },
            {
              id: 'expenses',
              label: 'Studio Expenses & OPEX',
              labelAr: 'المصروفات التشغيلية والعهدة',
              icon: <Receipt className="w-4 h-4" />,
            },
            {
              id: 'payroll',
              label: 'Instructor Payroll',
              labelAr: 'رواتب الأساتذة والمدربين',
              icon: <Users className="w-4 h-4" />,
            },
            {
              id: 'invoicing',
              label: 'Invoicing & AR Aging',
              labelAr: 'الفواتير والذمم المدينة',
              icon: <FileText className="w-4 h-4" />,
            },
            {
              id: 'ledger',
              label: 'General Ledger (COA)',
              labelAr: 'دفتر الأستاذ والقيود المزدوجة',
              icon: <Scale className="w-4 h-4" />,
            },
            {
              id: 'trial',
              label: 'Trial Balance',
              labelAr: 'ميزان المراجعة',
              icon: <FileText className="w-4 h-4" />,
            },
            {
              id: 'balance',
              label: 'Balance Sheet',
              labelAr: 'الميزانية العمومية',
              icon: <Landmark className="w-4 h-4" />,
            },
            {
              id: 'cashflow',
              label: 'Cash Flow',
              labelAr: 'التدفق النقدي',
              icon: <TrendingUp className="w-4 h-4" />,
            },
            {
              id: 'waterfall',
              label: 'Deferred Waterfall',
              labelAr: 'جدول الاستحقاق',
              icon: <Calendar className="w-4 h-4" />,
            },
            {
              id: 'ap',
              label: 'AP Aging',
              labelAr: 'أعمار الدائنين',
              icon: <Receipt className="w-4 h-4" />,
            },
            {
              id: 'budgets',
              label: 'Budgets vs Actual',
              labelAr: 'الموازنات والفعلي',
              icon: <PiggyBank className="w-4 h-4" />,
            },
            {
              id: 'fx',
              label: 'FX Rates',
              labelAr: 'أسعار الصرف',
              icon: <Coins className="w-4 h-4" />,
            },
            {
              id: 'drawer',
              label: 'Cash Drawer Shifts',
              labelAr: 'وردية الخزينة والكاش اليومي',
              icon: <Banknote className="w-4 h-4" />,
            },
          ]}
        />

        {/* Contextual Sub-Module Workspace */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {activeTab === 'treasury' && <TreasuryView />}

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <ExecutiveKpis
                selectedPeriod={selectedPeriod}
                accountingBasis={accountingBasis}
                setAccountingBasis={setAccountingBasis}
              />
              <PnLStatementView
                selectedPeriod={selectedPeriod}
                periodLabel={periodLabel}
              />
            </div>
          )}

          {activeTab === 'expenses' && <ExpenseTrackerView />}

          {activeTab === 'payroll' && <PayrollCalculatorView />}

          {activeTab === 'invoicing' && <InvoicingAndArView />}

          {activeTab === 'ledger' && <GeneralLedgerView />}

          {activeTab === 'trial' && <TrialBalanceView />}

          {activeTab === 'balance' && <BalanceSheetView />}

          {activeTab === 'cashflow' && <CashFlowView />}

          {activeTab === 'waterfall' && <DeferredWaterfallView />}

          {activeTab === 'ap' && <ApAgingView />}

          {activeTab === 'budgets' && <BudgetView />}

          {activeTab === 'fx' && <FxView />}

          {activeTab === 'drawer' && <CashDrawerShiftView />}
        </div>
      </div>
    </div>
  );
};

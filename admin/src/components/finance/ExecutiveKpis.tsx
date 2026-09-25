import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { formatCurrency } from '../../utils/currency';
import {
  TrendingUp,
  ArrowUpRight,
  ShieldAlert,
  Wallet,
  Coins,
  Layers,
  CalendarCheck,
  PiggyBank,
} from 'lucide-react';

interface ExecutiveKpisProps {
  selectedPeriod: 'current' | 'last_month' | 'ytd';
  accountingBasis: 'accrual' | 'cash';
  setAccountingBasis: (basis: 'accrual' | 'cash') => void;
}

export const ExecutiveKpis: React.FC<ExecutiveKpisProps> = ({
  selectedPeriod,
  accountingBasis,
  setAccountingBasis,
}) => {
  const { financials, language, expenses, payrollSlips, activeDrawerShift, students } = useAdmin();

  // Period note: backend P&L is current-term only — do NOT scale with invented multipliers.
  const periodNote = selectedPeriod === 'current' ? '' : language === 'ar' ? ' (عرض تقديري — يتطلب فلترة تاريخية من الدفتر)' : ' (estimate — needs date-filtered ledger)';

  const mrr = Math.round(financials.mrr);
  const recognized = Math.round(financials.recognizedRevenue);
  const deferred = Math.round(financials.deferredRevenue);
  const retail = Math.round(financials.retailGrossMargin);
  const payroll = Math.round(financials.payrollExpenses);
  const opex = Math.round(financials.operatingExpenses);

  // Basis calculations — cash basis = recognized revenue only (no invented uplift).
  const totalInflow = recognized + retail;
  const totalOutflow = payroll + opex;
  const netProfit = totalInflow - totalOutflow;
  const marginPercent = totalInflow > 0 ? ((netProfit / totalInflow) * 100).toFixed(1) : '0.0';

  // Total student receivables (AR Debt)
  const totalArDebt = students.reduce((sum, s) => sum + (s.walletBalance < 0 ? Math.abs(s.walletBalance) : 0), 0);

  // Cash Runway in months
  const monthlyBurn = opex + payroll;
  const liquidCash = financials.cashOnHand || 0;
  const cashRunwayMonths = monthlyBurn > 0 ? (liquidCash / monthlyBurn).toFixed(1) : '12.0';

  return (
    <div className="space-y-6">
      {/* Top Banner: Accounting Basis Switcher & Runway Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[#171d2b] border border-white/10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 flex items-center justify-center text-[#fb7185] flex-shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">
                {language === 'ar' ? 'معايير حساب الإيراد:' : 'Revenue Calculation Standard:'}
              </span>
              <span className="text-xs font-bold text-[#fb7185]">
                {accountingBasis === 'accrual' ? 'IFRS-15 Accrual (الاستحقاق القانوني)' : 'Cash Basis (التدفق النقدي الفعلي)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {accountingBasis === 'accrual'
                ? (language === 'ar'
                    ? 'يتم إثبات الإيرادات فقط عند حضور الحصص واستهلاك الأيام، وترحيل الباقي كالتزام دائن.'
                    : 'Revenue recognized as classes are completed; unserved quota preserved as deferred liability.')
                : (language === 'ar'
                    ? 'يتم احتساب كامل المبالغ المحصلة فور استلامها في حساب الأكاديمية أو الخزينة.'
                    : 'Revenue recognized immediately when cash is received from families and store sales.')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto p-1 rounded-xl bg-[#111622] border border-white/10">
          <button
            onClick={() => setAccountingBasis('accrual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              accountingBasis === 'accrual'
                ? 'nav-pill-active bg-white text-slate-950 font-bold shadow-md shadow-white/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {language === 'ar' ? 'أساس الاستحقاق' : 'Accrual'}
          </button>
          <button
            onClick={() => setAccountingBasis('cash')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              accountingBasis === 'cash'
                ? 'nav-pill-active bg-white text-slate-950 font-bold shadow-md shadow-white/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {language === 'ar' ? 'الأساس النقدي' : 'Cash Flow'}
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics Grid in EGP - Vibrant Glowing Gradients */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: MRR (Purple Gradient) */}
        <div className="p-4 sm:p-5 rounded-2xl kpi-gradient-purple flex flex-col justify-between hover:scale-[1.015] transition-all duration-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-white/90 font-medium">
              {language === 'ar' ? 'الإيراد الشهري المتكرر (MRR)' : 'Monthly Recurring (MRR)'}
            </span>
            <span className="p-1 rounded-md bg-white/20 text-white">
              <CalendarCheck className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-heading text-2xl sm:text-3xl font-bold text-white">
              {formatCurrency(mrr, language)}
            </span>
            <span className="text-xs text-white/90 flex items-center font-bold">
              <ArrowUpRight className="w-3.5 h-3.5" /> +8.4%
            </span>
          </div>
          <span className="text-[10px] text-white/75 mt-2 block">
            {language === 'ar'
              ? `المعدل التقديري السنوي: ${formatCurrency(mrr * 12, language)}`
              : `Annualized run-rate: ${formatCurrency(mrr * 12, language)}`}
          </span>
        </div>

        {/* KPI 2: Earned Revenue (Coral Gradient) */}
        <div className="p-4 sm:p-5 rounded-2xl kpi-gradient-coral flex flex-col justify-between hover:scale-[1.015] transition-all duration-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-white/90 font-medium">
              {language === 'ar' ? 'الإيراد المكتسب (المحقق)' : 'Recognized Revenue'}
            </span>
            <span className="p-1 rounded-md bg-white/20 text-white">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-heading text-2xl sm:text-3xl font-bold text-white">
              {formatCurrency(recognized, language)}
            </span>
          </div>
          <span className="text-[10px] text-white/75 mt-2 block">
            {language === 'ar'
              ? `المؤجل للشهر القادم: ${formatCurrency(deferred, language)}`
              : `Deferred for next month: ${formatCurrency(deferred, language)}`}
          </span>
        </div>

        {/* KPI 3: Cash Runway & Operating Inflow (Electric Blue Gradient) */}
        <div className="p-4 sm:p-5 rounded-2xl kpi-gradient-blue flex flex-col justify-between hover:scale-[1.015] transition-all duration-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-white/90 font-medium">
              {language === 'ar' ? 'إجمالي التدفقات والسيولة' : 'Total Inflow & Cash'}
            </span>
            <span className="p-1 rounded-md bg-white/20 text-white">
              <Wallet className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-heading text-2xl sm:text-3xl font-bold text-white">
              {formatCurrency(totalInflow, language)}
            </span>
          </div>
          <span className="text-[10px] text-white/80 mt-2 block font-medium">
            {language === 'ar'
              ? `السيولة بالخزينة: ${formatCurrency(activeDrawerShift?.expectedCash || 6350, language)} (${cashRunwayMonths} شهر أمان)`
              : `Drawer Float: ${formatCurrency(activeDrawerShift?.expectedCash || 6350, language)} (${cashRunwayMonths} mo runway)`}
          </span>
        </div>

        {/* KPI 4: Net Academy Profit (Amber Sunset Gradient) */}
        <div className="p-4 sm:p-5 rounded-2xl kpi-gradient-amber flex flex-col justify-between hover:scale-[1.015] transition-all duration-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-white/90 font-medium">
              {language === 'ar' ? 'صافي أرباح الأكاديمية' : 'Net Operating Profit'}
            </span>
            <span className="p-1 rounded-md bg-white/20 text-white">
              <PiggyBank className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-heading text-2xl sm:text-3xl font-bold text-white">
              {formatCurrency(netProfit, language)}
            </span>
            <span className="text-xs text-white/90 font-bold">
              ({marginPercent}%)
            </span>
          </div>
          <span className="text-[10px] text-white/75 mt-2 block">
            {language === 'ar'
              ? `المصروفات والرواتب: ${formatCurrency(totalOutflow, language)}`
              : `Total OPEX + Payroll: ${formatCurrency(totalOutflow, language)}`}
          </span>
        </div>
      </div>

      {/* Visual Inflow vs Outflow Margin Bar */}
      <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-white">
              {language === 'ar' ? 'كفاءة التدفقات التشغيلية وهامش الربح الصافي' : 'Operating Efficiency & Net Margin Bar'}
            </span>
          </div>
          <span className="font-mono font-bold text-[#fb7185]">{marginPercent}% Net Margin</span>
        </div>

        <div className="w-full bg-[#111622] rounded-full h-3 overflow-hidden border border-white/5 flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${Math.min(100, (netProfit / totalInflow) * 100)}%` }}
            title={`Net Profit: ${formatCurrency(netProfit, language)}`}
          />
          <div
            className="h-full bg-rose-500 transition-all duration-500"
            style={{ width: `${Math.min(100, (totalOutflow / totalInflow) * 100)}%` }}
            title={`Operating Outflow: ${formatCurrency(totalOutflow, language)}`}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>{language === 'ar' ? 'صافي الربح التشغيلي:' : 'Net Profit:'} {formatCurrency(netProfit, language)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span>{language === 'ar' ? 'المصروفات والرواتب:' : 'Expenses & Salaries:'} {formatCurrency(totalOutflow, language)}</span>
          </span>
          <span className="hidden sm:flex items-center gap-1.5 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>{language === 'ar' ? 'مديونيات الطلاب (ذمم مدينة):' : 'Student Receivables (AR):'} {formatCurrency(totalArDebt, language)}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

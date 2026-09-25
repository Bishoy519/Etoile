import React from 'react';
import { useAdmin } from '../../context/AdminContext';
import { formatCurrency } from '../../utils/currency';
import { exportCsv, csvFilename } from '../../utils/csv';
import {
  FileText,
  CheckCircle2,
  Download,
  Printer,
  Calculator,
  Layers,
  ArrowDownRight,
  TrendingUp,
} from 'lucide-react';

interface PnLStatementViewProps {
  selectedPeriod: 'current' | 'last_month' | 'ytd';
  periodLabel: string;
}

export const PnLStatementView: React.FC<PnLStatementViewProps> = ({
  selectedPeriod,
  periodLabel,
}) => {
  const { financials, language, showToast, expenses, payrollSlips } = useAdmin();

  const multiplier = selectedPeriod === 'current' ? 1 : selectedPeriod === 'last_month' ? 0.94 : 8.2;

  const recognized = Math.round(financials.recognizedRevenue * multiplier);
  const deferred = Math.round(financials.deferredRevenue * multiplier);
  const retail = Math.round(financials.retailGrossMargin * multiplier);
  const payroll = Math.round(financials.payrollExpenses * multiplier);
  const opex = Math.round(financials.operatingExpenses * multiplier);

  const totalInflow = recognized + retail;
  const totalOutflow = payroll + opex;
  const netProfit = totalInflow - totalOutflow;
  const marginPercent = totalInflow > 0 ? ((netProfit / totalInflow) * 100).toFixed(1) : '0.0';

  const handleExportCsv = () => {
    exportCsv(csvFilename('pnl', selectedPeriod), ['category', 'amountEgp'], [
      { category: 'Class Subscriptions Revenue', amountEgp: recognized },
      { category: 'Store Sales Profit', amountEgp: retail },
      { category: 'Total Operating Inflow', amountEgp: totalInflow },
      { category: 'Teacher & Staff Salaries', amountEgp: payroll },
      { category: 'Studio Rent & Facilities', amountEgp: opex },
      { category: 'Total Operational Outflow', amountEgp: totalOutflow },
      { category: 'Net Profit', amountEgp: netProfit },
      { category: 'Profit Margin %', amountEgp: marginPercent },
    ], { module: 'pnl' });

    showToast(
      language === 'ar' ? 'تم تصدير التقرير' : 'Report Exported',
      language === 'ar' ? 'تم تنزيل بيان الأرباح والخسائر CSV بالجنيه المصري بنجاح.' : 'Financial statement CSV in EGP exported successfully.',
      'gold'
    );
  };

  return (
    <div className="space-y-6">
      {/* Mathematical Accrual Formula Explainer Box */}
      <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#F43F5E]" />
          <h4 className="font-heading font-semibold text-lg text-white">
            {language === 'ar' ? 'نموذج التوزيع المحاسبي للاستحقاق (IFRS-15)' : 'IFRS-15 Revenue Recognition Model'}
          </h4>
        </div>
        <p className="text-xs text-slate-400">
          {language === 'ar'
            ? 'تطبيق معايير التقارير المالية الدولية لفصل إيراد الحصص المؤداة فعلياً عن المبالغ المحصلة مقدماً من العائلات.'
            : 'Applying international financial reporting standards to separate earned class revenue from deferred upfront student liabilities.'}
        </p>
        <div className="p-3.5 rounded-xl border border-white/5 bg-[#111622] font-mono text-[11px] sm:text-xs text-slate-300 space-y-2 overflow-x-auto no-scrollbar">
          <div className="whitespace-nowrap">
            1. {language === 'ar' ? 'معدل الاستحقاق اليومي:' : 'Daily Accrual Rate:'} <strong className="text-[#F43F5E]">Rate = Package Price / Duration Days</strong>
          </div>
          <div className="whitespace-nowrap">
            2. {language === 'ar' ? 'الإيراد المكتسب (الفترة الحالية):' : 'Earned Revenue (Period):'} <strong className="text-emerald-400">Earned = Rate × Days Attended</strong>
          </div>
          <div className="whitespace-nowrap">
            3. {language === 'ar' ? 'الإيراد المؤجل (التزام دائن):' : 'Deferred Liability (Future):'} <strong className="text-amber-400">Deferred = Total Price - Earned</strong>
          </div>
        </div>
      </div>

      {/* Main Consolidated P&L Statement Card */}
      <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#F43F5E]" />
              <h4 className="font-heading font-semibold text-xl sm:text-2xl text-white">
                {language === 'ar' ? 'بيان الأرباح والخسائر المجمع (P&L)' : 'Consolidated Income Statement (P&L)'}
              </h4>
            </div>
            <span className="text-xs text-slate-400 block mt-1 font-mono">
              {language === 'ar' ? 'الفترة المحاسبية:' : 'Accounting Period:'} {periodLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="status-pill-emerald px-3 py-1 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'غير مدقق — للإدارة فقط (EGP)' : 'Unaudited — Management Only (EGP)'}</span>
            </span>
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-xl border border-white/10 hover:border-[#F43F5E]/40 bg-[#111622] text-xs text-[#F43F5E] hover:text-[#fb7185] transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'تصدير CSV' : 'Export CSV'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-[#111622] text-xs text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'طباعة' : 'Print'}</span>
            </button>
          </div>
        </div>

        {/* Statement Line Items */}
        <div className="space-y-6 text-xs">
          {/* 1. Operating Inflow Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#F43F5E] text-[11px] uppercase tracking-wider">
                {language === 'ar' ? '1. الإيرادات التشغيلية المكتسبة' : '1. Operating Revenue Inflow'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Code 40000</span>
            </div>

            <div className="flex items-center justify-between gap-3 py-2 border-b border-white/5">
              <div className="flex flex-col">
                <span className="text-slate-300">
                  {language === 'ar' ? 'إيرادات اشتراكات وحصص الباليه المحققة' : 'Class Subscriptions & Academy Tuition (Earned)'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {language === 'ar' ? 'محتسبة وفق الأيام والحصص المستهلكة فعلياً' : 'Based on actual attended sessions & elapsed term'}
                </span>
              </div>
              <span className="font-mono font-medium text-white text-sm flex-shrink-0">
                {formatCurrency(recognized, language)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 py-2 border-b border-white/5">
              <div className="flex flex-col">
                <span className="text-slate-300">
                  {language === 'ar' ? 'مبيعات بوتيك الباليه الفاخر' : 'Store Merchandise Retail Margin'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {language === 'ar' ? 'أحذية بوانت، مايوهات، كولونات، وأشرطة تدفئة' : 'Pointe shoes, leotards, tights, warm-ups'}
                </span>
              </div>
              <span className="font-mono font-medium text-white text-sm flex-shrink-0">
                {formatCurrency(retail, language)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 py-2 font-bold text-white bg-[#111622] px-3.5 rounded-xl border border-white/10">
              <span>{language === 'ar' ? 'إجمالي الإيرادات التشغيلية المكتسبة' : 'Total Recognized Revenue Inflow'}</span>
              <span className="font-mono text-emerald-400 text-sm flex-shrink-0">
                {formatCurrency(totalInflow, language)}
              </span>
            </div>
          </div>

          {/* 2. Direct Costs & OPEX Section */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-rose-400 text-[11px] uppercase tracking-wider">
                {language === 'ar' ? '2. المصروفات التشغيلية والرواتب (OPEX)' : '2. Operating Expenses & Teaching Costs'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Code 50000 & 60000</span>
            </div>

            <div className="flex items-center justify-between gap-3 py-2 border-b border-white/5">
              <div className="flex flex-col">
                <span className="text-slate-300">
                  {language === 'ar' ? 'رواتب أساتذة الباليه والمدربين والعمولات' : 'Faculty & Instructor Salaries'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {language === 'ar' ? 'محتسبة بالساعات والحصص ومكافآت العروض' : 'Base salary + hourly teaching fees + choreography bonus'}
                </span>
              </div>
              <span className="font-mono text-rose-300 text-sm flex-shrink-0">
                -{formatCurrency(payroll, language)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 py-2 border-b border-white/5">
              <div className="flex flex-col">
                <span className="text-slate-300">
                  {language === 'ar' ? 'إيجار الاستوديوهات، الكهرباء، وصيانة الأرضيات' : 'Studio Lease, High-Bay Lighting & Maintenance'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {language === 'ar' ? 'استوديو نورييف، بافلوفا، وتراخيص السحابة' : 'Harlequin flooring care, AC, and Cloud SaaS'}
                </span>
              </div>
              <span className="font-mono text-rose-300 text-sm flex-shrink-0">
                -{formatCurrency(opex, language)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 py-2 font-bold text-white bg-[#111622] px-3.5 rounded-xl border border-rose-500/20">
              <span>{language === 'ar' ? 'إجمالي التدفقات الخارجة (المصروفات والرواتب)' : 'Total Operational Outflow'}</span>
              <span className="font-mono text-rose-400 text-sm flex-shrink-0">
                -{formatCurrency(totalOutflow, language)}
              </span>
            </div>
          </div>

          {/* 3. Net Operating Profit Final Tally */}
          <div className="pt-4 border-t-2 border-[#F43F5E]/40 flex items-center justify-between gap-3 text-base font-bold bg-[#111622] p-4 rounded-xl border border-white/10">
            <div>
              <span className="font-heading font-semibold text-lg sm:text-xl text-white block">
                {language === 'ar' ? 'صافي الربح التشغيلي (قبل الفوائد والضرائب والإهلاك)' : 'Net Operating Profit (pre-interest/tax)'}
              </span>
              <span className="text-xs text-emerald-400 font-normal">
                {language === 'ar' ? `هامش الربح التشغيلي: ${marginPercent}%` : `Net Operating Margin: ${marginPercent}%`}
              </span>
            </div>
            <span className="font-heading text-2xl sm:text-3xl font-bold text-[#fb7185] flex-shrink-0">
              {formatCurrency(netProfit, language)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

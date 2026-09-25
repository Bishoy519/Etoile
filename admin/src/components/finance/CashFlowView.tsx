import React, { useEffect, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { formatCurrency } from '../../utils/currency';
import { api, errMsg } from '../../utils/api';
import { exportCsv } from '../../utils/csv';
import { Droplets, TrendingUp, TrendingDown, Download } from 'lucide-react';

export const CashFlowView: React.FC = () => {
  const { language } = useAdmin();
  const [data, setData] = useState<{
    inflow: { posCash: number; invoiceReceipts: number; totalInflow: number; receiptsByMethod: Record<string, number> };
    outflow: { opexOut: number; payrollOut: number; totalOutflow: number };
    netCash: number;
    note: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/accounting/cash-flow');
        setData(data);
      } catch (e: unknown) {
        if ((e as { response?: { status?: number } })?.response?.status === 401) { setError('signin'); return; }
        setError(errMsg(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="shimmer-line h-48" />;
  if (error === 'signin') return <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">Sign in with a staff account to view cash flow.</div>;
  if (error || !data) return <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200">{error || 'No data'}</div>;

  return (
    <div className="space-y-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-2 p-4 rounded-2xl bg-[#171d2b] border border-white/10">
        <Droplets className="w-5 h-5 text-sky-300" />
        <div>
          <h4 className="font-heading font-semibold text-lg text-white">{language === 'ar' ? 'التدفق النقدي' : 'Cash Flow'}</h4>
          <span className="text-[11px] text-slate-400">Receipts vs disbursements • EGP</span>
        </div>
        <span className="ms-auto flex items-center gap-2">
          <button
            onClick={() => {
              if (!data) return;
              exportCsv(`cash-flow-${new Date().toISOString().split('T')[0]}`, ['section', 'label', 'amount'], [
                { section: 'inflow', label: 'POS cash/card/transfer', amount: data.inflow.posCash },
                { section: 'inflow', label: 'Invoice receipts', amount: data.inflow.invoiceReceipts },
                ...Object.entries(data.inflow.receiptsByMethod).map(([m, v]) => ({ section: 'inflow', label: m, amount: v })),
                { section: 'inflow', label: 'Total inflow', amount: data.inflow.totalInflow },
                { section: 'outflow', label: 'Operating expenses', amount: data.outflow.opexOut },
                { section: 'outflow', label: 'Payroll (paid)', amount: data.outflow.payrollOut },
                { section: 'outflow', label: 'Total outflow', amount: data.outflow.totalOutflow },
                { section: 'net', label: 'Net cash', amount: data.netCash },
              ]);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5"
            title={language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
          >
            <Download className="w-3.5 h-3.5" /><span>CSV</span>
          </button>
          <span className={`font-heading text-2xl font-bold ${data.netCash >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {formatCurrency(data.netCash, language)}
          </span>
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
          <h5 className="text-[11px] font-bold uppercase tracking-widest text-emerald-300 mb-3 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> {language === 'ar' ? 'مقبوضات' : 'Inflow'}</h5>
          <Row label="POS cash/card/transfer" value={data.inflow.posCash} language={language} />
          <Row label="Invoice receipts" value={data.inflow.invoiceReceipts} language={language} />
          {Object.entries(data.inflow.receiptsByMethod).map(([m, v]) => (
            <Row key={m} label={`· ${m}`} value={v} language={language} dim />
          ))}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-emerald-500/20 text-sm font-bold">
            <span className="text-white">Total inflow</span>
            <span className="font-mono text-emerald-200">{formatCurrency(data.inflow.totalInflow, language)}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-4">
          <h5 className="text-[11px] font-bold uppercase tracking-widest text-rose-300 mb-3 flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5" /> {language === 'ar' ? 'مدفوعات' : 'Outflow'}</h5>
          <Row label="Operating expenses" value={data.outflow.opexOut} language={language} />
          <Row label="Payroll (paid)" value={data.outflow.payrollOut} language={language} />
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-rose-500/20 text-sm font-bold">
            <span className="text-white">Total outflow</span>
            <span className="font-mono text-rose-200">{formatCurrency(data.outflow.totalOutflow, language)}</span>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-slate-500">{data.note}</p>
    </div>
  );
};

const Row = ({ label, value, language, dim }: { label: string; value: number; language: 'en' | 'ar'; dim?: boolean }) => (
  <div className="flex items-center justify-between py-1.5 text-xs border-b border-white/5 last:border-0">
    <span className={dim ? 'text-slate-500' : 'text-slate-300'}>{label}</span>
    <span className="font-mono text-white">{formatCurrency(value, language)}</span>
  </div>
);

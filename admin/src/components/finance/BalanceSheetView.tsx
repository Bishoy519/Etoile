import React, { useEffect, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { formatCurrency } from '../../utils/currency';
import { api, errMsg } from '../../utils/api';
import { exportCsv } from '../../utils/csv';
import { Landmark, CheckCircle2, AlertTriangle, Download, Search } from 'lucide-react';

interface BsLine {
  accountCode: string;
  accountName: string;
  balance: number;
}

export const BalanceSheetView: React.FC = () => {
  const { language } = useAdmin();
  const [data, setData] = useState<{
    assets: BsLine[]; liabilities: BsLine[]; equity: BsLine[];
    totals: { totalAssets: number; totalLiabilities: number; totalEquity: number; balanced: boolean };
    glProfit: { revenue: number; expenses: number; netProfit: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bsSearch, setBsSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/accounting/balance-sheet');
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
  if (error === 'signin') return <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">Sign in with a staff account to view the balance sheet.</div>;
  if (error || !data) return <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200">{error || 'No data'}</div>;

  const Section = ({ title, lines, total }: { title: string; lines: BsLine[]; total: number }) => {
    const needle = bsSearch.trim().toLowerCase();
    const visible = needle ? lines.filter((l) => `${l.accountCode} ${l.accountName}`.toLowerCase().includes(needle)) : lines;
    return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <h5 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">{title} <span className="ms-1 font-mono">({visible.length})</span></h5>
      {visible.length === 0 ? (
        <p className="text-xs text-slate-500">—</p>
      ) : (
        visible.map((l) => (
          <div key={l.accountCode} className="flex items-center justify-between py-1.5 text-xs border-b border-white/5 last:border-0">
            <span className="text-slate-300"><span className="font-mono text-slate-500 me-2">{l.accountCode}</span>{l.accountName}</span>
            <span className="font-mono text-white">{formatCurrency(l.balance, language)}</span>
          </div>
        ))
      )}
      <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/10 text-sm font-bold">
        <span className="text-white">Total</span>
        <span className="font-mono text-white">{formatCurrency(total, language)}</span>
      </div>
    </div>
    );
  };

  return (
    <div className="space-y-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#171d2b] border border-white/10">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-slate-300" />
          <div>
            <h4 className="font-heading font-semibold text-lg text-white">{language === 'ar' ? 'الميزانية العمومية (من دفتر الأستاذ)' : 'Balance Sheet (GL-sourced)'}</h4>
            <span className="text-[11px] text-slate-400 font-mono">Assets = Liabilities + Equity • EGP</span>
          </div>
        </div>
        <span className={`px-3 py-1 text-xs font-semibold rounded-xl flex items-center gap-1.5 self-start ${data.totals.balanced ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'}`}>
          {data.totals.balanced ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          {data.totals.balanced ? (language === 'ar' ? 'المعادلة متزنة' : 'Equation balances') : (language === 'ar' ? 'فرق في المعادلة' : 'Out of balance')}
        </span>
        <span className="flex items-center gap-2 self-start flex-wrap">
          <label className="relative">
            <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              value={bsSearch}
              onChange={(e) => setBsSearch(e.target.value)}
              placeholder={language === 'ar' ? 'بحث عن حساب...' : 'Search accounts...'}
              className="ps-8 pe-3 py-1.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none w-44"
              aria-label={language === 'ar' ? 'بحث الميزانية' : 'Search balance sheet'}
            />
          </label>
          <button
            onClick={() => exportCsv(`balance-sheet-${new Date().toISOString().split('T')[0]}`, ['section', 'accountCode', 'accountName', 'balance'], [
              ...data.assets.map((l) => ({ section: 'assets', accountCode: l.accountCode, accountName: l.accountName, balance: l.balance })),
              ...data.liabilities.map((l) => ({ section: 'liabilities', accountCode: l.accountCode, accountName: l.accountName, balance: l.balance })),
              ...data.equity.map((l) => ({ section: 'equity', accountCode: l.accountCode, accountName: l.accountName, balance: l.balance })),
            ])}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" /><span>CSV</span>
          </button>
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title={language === 'ar' ? 'الأصول' : 'Assets'} lines={data.assets} total={data.totals.totalAssets} />
        <Section title={language === 'ar' ? 'الالتزامات' : 'Liabilities'} lines={data.liabilities} total={data.totals.totalLiabilities} />
        <Section title={language === 'ar' ? 'حقوق الملكية + الربح' : 'Equity + Profit'} lines={data.equity} total={data.totals.totalEquity} />
      </div>
      <p className="text-[11px] text-slate-500 font-mono">
        GL profit: revenue {formatCurrency(data.glProfit.revenue, language)} − expenses {formatCurrency(data.glProfit.expenses, language)} = {formatCurrency(data.glProfit.netProfit, language)}
      </p>
    </div>
  );
};

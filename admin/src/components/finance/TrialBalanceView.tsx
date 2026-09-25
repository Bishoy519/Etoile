import React, { useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { formatCurrency } from '../../utils/currency';
import { api, errMsg } from '../../utils/api';
import { exportCsv } from '../../utils/csv';
import { ViewSwitcher, useViewPrefs } from '../ViewSwitcher';
import { Scale, Download, CheckCircle2, AlertTriangle, Search } from 'lucide-react';

interface TbAccount {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
}

export const TrialBalanceView: React.FC = () => {
  const { language } = useAdmin();
  const [data, setData] = useState<{ accounts: TbAccount[]; totals: { totalDebit: number; totalCredit: number; balanced: boolean }; voucherLines: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tbSearch, setTbSearch] = useState('');
  const tbView = useViewPrefs('finance-trial-balance', 'table');

  const visibleAccounts = useMemo(() => {
    if (!data) return [];
    const needle = tbSearch.trim().toLowerCase();
    if (!needle) return data.accounts;
    return data.accounts.filter((a) => `${a.accountCode} ${a.accountName}`.toLowerCase().includes(needle));
  }, [data, tbSearch]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/accounting/trial-balance');
        setData(data);
      } catch (e: unknown) {
        if ((e as { response?: { status?: number } })?.response?.status === 401) { setError('signin'); return; }
        setError(errMsg(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const exportTrialBalance = () => {
    if (!data) return;
    exportCsv('trial-balance', ['accountCode', 'accountName', 'debit', 'credit', 'balance'], data.accounts.map((a) => ({
      accountCode: a.accountCode, accountName: a.accountName, debit: a.debit, credit: a.credit, balance: a.balance,
    })), { module: 'trial-balance' });
  };

  if (loading) return <div className="shimmer-line h-48" />;
  if (error === 'signin') return <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">Sign in with a staff account to view the trial balance.</div>;
  if (error || !data) return <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200">{error || 'No data'}</div>;

  return (
    <div className="space-y-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#171d2b] border border-white/10">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-slate-300" />
          <div>
            <h4 className="font-heading font-semibold text-lg text-white">{language === 'ar' ? 'ميزان المراجعة (من دفتر الأستاذ)' : 'Trial Balance (GL-sourced)'}</h4>
            <span className="text-[11px] text-slate-400 font-mono">{data.voucherLines} posted lines • EGP</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="relative">
            <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              value={tbSearch}
              onChange={(e) => setTbSearch(e.target.value)}
              placeholder={language === 'ar' ? 'بحث عن حساب...' : 'Search accounts...'}
              className="ps-8 pe-8 py-1.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none w-48"
              aria-label={language === 'ar' ? 'بحث الميزان' : 'Search trial balance'}
            />
            {tbSearch && (
              <button onClick={() => setTbSearch('')} className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5" aria-label="Clear search">✕</button>
            )}
          </label>
          <span className="text-[11px] font-mono text-slate-500">{visibleAccounts.length}/{data.accounts.length}</span>
          <ViewSwitcher moduleKey="finance-trial-balance" modes={['table', 'rows']} value={{ mode: tbView.mode, density: tbView.density }} onChange={(p) => { tbView.setMode(p.mode); tbView.setDensity(p.density); }} />
          <span className={`px-3 py-1 text-xs font-semibold rounded-xl flex items-center gap-1.5 ${data.totals.balanced ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'}`}>
            {data.totals.balanced ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {data.totals.balanced ? (language === 'ar' ? 'متوازن' : 'Balanced') : (language === 'ar' ? 'غير متوازن — راجع القيود' : 'Out of balance — review vouchers')}
          </span>
          <button onClick={exportTrialBalance} className="px-3 py-1.5 rounded-xl border border-white/10 text-xs text-slate-300 flex items-center gap-1.5" aria-label="Export CSV">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>
      {visibleAccounts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-sm text-slate-400">
          {data.accounts.length === 0
            ? (language === 'ar' ? 'لا توجد قيود مرحلة بعد — ستظهر الحسابات هنا تلقائياً.' : 'No posted vouchers yet — accounts appear here automatically.')
            : (language === 'ar' ? 'لا حسابات مطابقة للبحث.' : 'No accounts match your search.')}
        </div>
      ) : tbView.mode === 'rows' ? (
        <div className="rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
          {visibleAccounts.map((a) => (
            <div key={a.accountCode} className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-white/[0.02] transition">
              <span className="font-mono text-slate-300 flex-shrink-0">{a.accountCode}</span>
              <span className="flex-1 min-w-0 text-slate-200 truncate">{a.accountName}</span>
              <span className="font-mono text-white flex-shrink-0">{formatCurrency(a.balance, language)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                <th className="text-start p-3">Account</th>
                <th className="text-start p-3">Name</th>
                <th className="text-end p-3">Debit</th>
                <th className="text-end p-3">Credit</th>
                <th className="text-end p-3">Balance (Dr−Cr)</th>
              </tr>
            </thead>
            <tbody>
              {visibleAccounts.map((a) => (
                <tr key={a.accountCode} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="p-3 font-mono text-slate-300">{a.accountCode}</td>
                  <td className="p-3 text-slate-200">{a.accountName}</td>
                  <td className="p-3 text-end font-mono">{formatCurrency(a.debit, language)}</td>
                  <td className="p-3 text-end font-mono">{formatCurrency(a.credit, language)}</td>
                  <td className="p-3 text-end font-mono text-white">{formatCurrency(a.balance, language)}</td>
                </tr>
              ))}
              <tr className="bg-white/[0.03] font-bold">
                <td className="p-3" colSpan={2}>Totals</td>
                <td className="p-3 text-end font-mono">{formatCurrency(data.totals.totalDebit, language)}</td>
                <td className="p-3 text-end font-mono">{formatCurrency(data.totals.totalCredit, language)}</td>
                <td className="p-3" />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

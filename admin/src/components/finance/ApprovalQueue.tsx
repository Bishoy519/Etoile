import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { formatCurrency } from '../../utils/currency';
import { api, errMsg } from '../../utils/api';
import { exportCsv } from '../../utils/csv';
import { ShieldCheck, Check, X, Search, Download } from 'lucide-react';

interface Pending {
  id: string;
  expenseNumber: string;
  category: string;
  description: string;
  vendor: string;
  total: number;
  date: string;
  requestedBy: string | null;
}

/** Maker-checker queue: owner/director approves what others filed. */
export const ApprovalQueue: React.FC = () => {
  const { language, showToast, currentUser } = useAdmin();
  const isManager = currentUser?.role === 'owner' || currentUser?.role === 'superadmin';
  const [items, setItems] = useState<Pending[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState('');

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((e) => `${e.expenseNumber} ${e.description} ${e.vendor} ${e.requestedBy || ''}`.toLowerCase().includes(needle));
  }, [items, q]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/accounting/expenses/pending');
      setItems(data);
    } catch {
      // offline
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isManager) load();
    else setLoaded(true);
  }, [isManager, load]);

  if (!isManager || !loaded || items.length === 0) return null;

  const decide = async (id: string, approve: boolean) => {
    try {
      await api.patch(`/api/accounting/expenses/${id}/${approve ? 'approve' : 'reject'}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      showToast(approve ? 'Approved' : 'Rejected', '', approve ? 'success' : 'warning');
    } catch (e) {
      showToast('Decision failed', errMsg(e), 'error');
    }
  };

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-4 space-y-2" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          {language === 'ar' ? `بانتظار الاعتماد (${visible.length}/${items.length})` : `Pending approval (${visible.length}/${items.length})`}
        </h4>
        <span className="sm:ms-auto flex items-center gap-2">
          <label className="relative">
            <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={language === 'ar' ? 'بحث...' : 'Search queue...'}
              className="ps-8 pe-3 py-1.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none w-44"
              aria-label={language === 'ar' ? 'بحث الاعتمادات' : 'Search approvals'}
            />
          </label>
          <button
            onClick={() => exportCsv(`approval-queue-${new Date().toISOString().split('T')[0]}`, ['expenseNumber', 'description', 'vendor', 'total', 'date', 'requestedBy'], visible.map((e) => ({
              expenseNumber: e.expenseNumber, description: e.description, vendor: e.vendor, total: e.total, date: e.date, requestedBy: e.requestedBy || '',
            })))}
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1"
            title="Export CSV"
          >
            <Download className="w-3 h-3" /><span>CSV</span>
          </button>
        </span>
      </div>
      {visible.length === 0 && (
        <p className="text-[11px] text-slate-500 text-center py-4">{language === 'ar' ? 'لا عناصر مطابقة للبحث.' : 'No matching items.'}</p>
      )}
      {visible.slice(0, 10).map((e) => (
        <div key={e.id} className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-black/30 border border-white/5 text-xs">
          <span className="font-mono text-slate-300" dir="ltr">{e.expenseNumber}</span>
          <span className="text-white font-semibold truncate max-w-[220px]">{e.description}</span>
          <span className="text-slate-500">{e.vendor}</span>
          <span className="font-mono font-bold text-white" dir="ltr">{formatCurrency(e.total, language)}</span>
          {e.requestedBy && <span className="text-[10px] text-slate-500">by {e.requestedBy}</span>}
          <span className="ms-auto flex gap-1.5">
            <button onClick={() => decide(e.id, true)} className="p-1.5 rounded-lg border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10" aria-label={`Approve ${e.expenseNumber}`}>
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => decide(e.id, false)} className="p-1.5 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/10" aria-label={`Reject ${e.expenseNumber}`}>
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      ))}
    </div>
  );
};

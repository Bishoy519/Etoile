import React, { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { api, errMsg } from '../../utils/api';
import { BadgePercent, Plus, Save, GraduationCap } from 'lucide-react';

interface Scholarship {
  id: string;
  studentId: string;
  percent: number;
  reason: string;
  status: string;
  student?: { id: string; name: string };
}

/** Sibling policy + scholarships: auto-applied at invoice time, managed here. */
export const DiscountsSection: React.FC = () => {
  const { language, showToast, students } = useAdmin();
  const [policy, setPolicy] = useState({ sibling2Percent: 10, sibling3PlusPercent: 15, enabled: true });
  const [draft, setDraft] = useState({ sibling2Percent: '10', sibling3PlusPercent: '15', enabled: true });
  const [rows, setRows] = useState<any[]>([]);
  const [grant, setGrant] = useState({ studentId: '', percent: '25', reason: '' });

  const load = useCallback(async () => {
    try {
      const [{ data: p }, { data: s }] = await Promise.all([
        api.get('/api/accounting/discount-policy'),
        api.get('/api/accounting/scholarships?status=active'),
      ]);
      setPolicy(p);
      setRows(s);
    } catch {
      // offline
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const savePolicy = async () => {
    try {
      await api.post('/api/accounting/discount-policy', {
        sibling2Percent: Number(draft.sibling2Percent),
        sibling3PlusPercent: Number(draft.sibling3PlusPercent),
        enabled: draft.enabled,
      });
      showToast(language === 'ar' ? 'تم الحفظ' : 'Policy saved', '', 'success');
      load();
    } catch (e) {
      showToast('Save failed', errMsg(e), 'error');
    }
  };

  const grantScholarship = async () => {
    if (!grant.studentId || !grant.reason.trim()) {
      showToast('Missing fields', 'Dancer + reason required.', 'error');
      return;
    }
    try {
      await api.post('/api/accounting/scholarships', { studentId: grant.studentId, percent: Number(grant.percent), reason: grant.reason.trim() });
      setGrant({ studentId: '', percent: '25', reason: '' });
      load();
    } catch (e) {
      showToast('Grant failed', errMsg(e), 'error');
    }
  };

  const revoke = async (id: string) => {
    await api.post(`/api/accounting/scholarships/${id}/revoke`).catch(() => null);
    load();
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
        <BadgePercent className="w-4 h-4 text-amber-300" />
        {language === 'ar' ? 'الخصومات والمنح (تُطبق تلقائياً على الفواتير)' : 'Discounts & scholarships (auto-applied to invoices)'}
      </h4>
      <div className="flex flex-wrap items-end gap-2 text-xs">
        <label className="text-slate-400">2nd dancer %
          <input value={draft.sibling2Percent} onChange={(e) => setDraft({ ...draft, sibling2Percent: e.target.value })} type="number" min={0} max={90} dir="ltr" className="mt-1 w-20 px-2 py-1.5 rounded-lg bg-[#111622] border border-white/10 text-white font-mono" />
        </label>
        <label className="text-slate-400">3rd+ %
          <input value={draft.sibling3PlusPercent} onChange={(e) => setDraft({ ...draft, sibling3PlusPercent: e.target.value })} type="number" min={0} max={90} dir="ltr" className="mt-1 w-20 px-2 py-1.5 rounded-lg bg-[#111622] border border-white/10 text-white font-mono" />
        </label>
        <label className="flex items-center gap-1.5 text-slate-300 pb-2">
          <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} className="accent-emerald-500" />
          {policy.enabled ? 'On' : 'Off'}
        </label>
        <button onClick={savePolicy} className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-200 hover:text-white flex items-center gap-1">
          <Save className="w-3.5 h-3.5" /> Save
        </button>
      </div>
      <div className="flex flex-wrap gap-2 items-end text-xs">
        <select value={grant.studentId} onChange={(e) => setGrant({ ...grant, studentId: e.target.value })} className="flex-1 min-w-[160px] px-2 py-1.5 rounded-lg bg-[#111622] border border-white/10 text-white" aria-label="Dancer">
          <option value="">Select dancer…</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input value={grant.percent} onChange={(e) => setGrant({ ...grant, percent: e.target.value })} type="number" min={1} max={100} dir="ltr" className="w-20 px-2 py-1.5 rounded-lg bg-[#111622] border border-white/10 text-white font-mono" aria-label="Percent" />
        <input value={grant.reason} onChange={(e) => setGrant({ ...grant, reason: e.target.value })} placeholder="Reason (required)" dir="auto" className="flex-1 min-w-[160px] px-2 py-1.5 rounded-lg bg-[#111622] border border-white/10 text-white" aria-label="Reason" />
        <button onClick={grantScholarship} className="px-3 py-1.5 rounded-lg bg-amber-400 text-black font-bold flex items-center gap-1">
          <GraduationCap className="w-3.5 h-3.5" /> Grant
        </button>
      </div>
      {rows.length > 0 && (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-xs p-2 rounded-xl border border-white/10 bg-white/[0.02]">
              <strong className="text-white">{r.student?.name || r.studentId}</strong>
              <span className="text-amber-300 font-mono">{r.percent}%</span>
              <span className="text-slate-500 truncate">{r.reason}</span>
              <button onClick={() => revoke(r.id)} className="ms-auto text-[11px] text-slate-500 hover:text-rose-300">Revoke</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
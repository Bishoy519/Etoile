import React, { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { api } from '../utils/api';
import { SectionCard } from './ui';
import { ShieldAlert } from 'lucide-react';

interface DeletionRequest {
  id: string;
  familyId: string;
  status: string;
  requestedAt: string;
  scheduledAt: string;
  doneAt: string | null;
}

/** Privacy oversight: households awaiting erasure after the 7-day grace. */
export const DeletionRequestsCard: React.FC = () => {
  const { language } = useAdmin();
  const [rows, setRows] = useState<DeletionRequest[]>([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/ops/deletion-requests');
      setRows(data);
    } catch {
      // offline
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pending = rows.filter((r) => r.status === 'pending');
  if (rows.length === 0) return null;

  return (
    <SectionCard
      title={language === 'ar' ? 'طلبات حذف البيانات' : 'Data erasure requests'}
      subtitle={language === 'ar' ? 'مهلة 7 أيام ثم حذف تلقائي' : '7-day grace, then automatic purge'}
      icon={<ShieldAlert className="w-4 h-4 text-rose-300" />}
    >
      <div className="space-y-2 text-xs">
        {pending.length === 0 && (
          <p className="text-slate-500">{language === 'ar' ? 'لا طلبات معلقة.' : 'No pending requests.'}</p>
        )}
        {rows.slice(0, 10).map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.07]">
            <span className="font-mono text-slate-300" dir="ltr">{r.familyId}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
              r.status === 'pending' ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
              : r.status === 'done' ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
              : 'text-slate-400 border-white/15'}`}>{r.status}</span>
            <span className="ms-auto font-mono text-[11px] text-slate-500" dir="ltr">
              {String(r.scheduledAt).split('T')[0]}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

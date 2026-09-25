import React, { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { api, errMsg } from '../utils/api';
import { Hourglass, ArrowUpCircle, X } from 'lucide-react';

interface Entry {
  id: string;
  studentId: string;
  status: string;
  createdAt: string;
  student?: { id: string; name: string; barcode: string; level: string };
}

/** Per-course waitlist queue with capacity-guarded promotion. */
export const CourseWaitlist: React.FC<{ courseId: string; courseCode: string; onChanged: () => void }> = ({
  courseId,
  courseCode,
  onChanged,
}) => {
  const { language, showToast } = useAdmin();
  const [items, setItems] = useState<Entry[]>([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/courses/${courseId}/waitlist?status=pending`);
      if (Array.isArray(data)) setItems(data);
    } catch {
      // offline
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const promote = async (id: string) => {
    try {
      const { data: body } = await api.post('/api/courses/waitlist/' + id + '/promote', { courseId });
      if (body?.skipped) {
        showToast(language === 'ar' ? 'مكتملة' : 'Still full', body.reason || '', 'warning');
        return;
      }
      showToast(language === 'ar' ? 'تمت الترقية' : 'Promoted to enrolled', '', 'success');
      load();
      onChanged();
    } catch (e) {
      showToast('Promote failed', errMsg(e), 'error');
    }
  };

  const cancel = async (id: string) => {
    await api.delete(`/api/courses/waitlist/${id}`).catch(() => null);
    load();
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-2 mt-4">
      <h4 className="font-heading font-bold text-sm text-white flex items-center gap-1.5">
        <Hourglass className="w-4 h-4 text-amber-300" />
        {language === 'ar' ? `قائمة الانتظار (${items.length})` : `Waitlist (${items.length})`}
      </h4>
      {items.map((e, i) => (
        <div key={e.id} className="p-3 rounded-xl bg-[#111622] border border-amber-500/20 flex items-center gap-3">
          <span className="font-mono text-[11px] font-bold text-amber-300 w-8">#{i + 1}</span>
          <div className="flex-1 min-w-0">
            <span className="font-bold text-xs text-white block truncate">{e.student?.name || e.studentId}</span>
            <span className="text-[10px] text-slate-400 font-mono">{e.student?.barcode} • {courseCode}</span>
          </div>
          <button onClick={() => promote(e.id)} className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1" title="Promote to enrolled">
            <ArrowUpCircle className="w-3.5 h-3.5" /> {language === 'ar' ? 'ترقية' : 'Promote'}
          </button>
          <button onClick={() => cancel(e.id)} className="p-1.5 rounded-xl border border-white/10 text-slate-400 hover:text-rose-300" aria-label="Remove from waitlist">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

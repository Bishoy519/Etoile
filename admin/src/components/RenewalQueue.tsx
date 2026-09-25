import React, { useEffect, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { api } from '../utils/api';
import { RefreshCw, Bell, ArrowRight } from 'lucide-react';

interface QueueItem {
  studentId: string;
  name: string;
  phone: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  left?: number;
  endDate?: string;
}

/** Live renewal queue from GET /api/ops/renewal-queue with local fallback. */
export const RenewalQueue: React.FC<{ limit?: number; onOpenStudents?: () => void }> = ({ limit = 6, onOpenStudents }) => {
  const { language, students, showToast, triggerOpenWaAlert } = useAdmin();
  const isRtl = language === 'ar';
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveOk, setLiveOk] = useState(false);

  const buildFallback = (roster: typeof students): QueueItem[] => {
    const fb: QueueItem[] = [];
    roster.forEach((s) => {
      const sub = s.subscription;
      if (!sub) { fb.push({ studentId: s.id, name: s.name, phone: s.parentPhone, reason: 'no_package', priority: 'high' }); return; }
      const left = sub.maxSessions - sub.usedSessions;
      if (sub.status !== 'active') { fb.push({ studentId: s.id, name: s.name, phone: s.parentPhone, reason: 'expired', priority: 'high', left }); return; }
      if (left <= 2) { fb.push({ studentId: s.id, name: s.name, phone: s.parentPhone, reason: 'low_quota', priority: 'medium', left }); return; }
    });
    return fb;
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get('/api/ops/renewal-queue');
      setItems(d.queue || []);
      setLiveOk(true);
      return;
    } catch {
      // Local fallback from context
      setItems(buildFallback(students));
      setLiveOk(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  // Recompute local fallback once real students arrive (API offline case).
  useEffect(() => {
    if (liveOk || loading || items === null) return;
    setItems(buildFallback(students));
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [students.length]);

  const [nudgingId, setNudgingId] = useState<string | null>(null);

  const nudge = (it: QueueItem) => {
    if (!it.phone || it.phone.replace(/\D/g, '').length < 7) {
      showToast(isRtl ? 'رقم مفقود' : 'Missing phone', isRtl ? `لا يوجد هاتف صالح لـ ${it.name}.` : `No valid phone for ${it.name}.`, 'error');
      return;
    }
    if (nudgingId) return;
    setNudgingId(it.studentId + it.reason);
    try {
      triggerOpenWaAlert('quota_warning', it.phone, it.name, `Hello — ${it.name} has ${it.left ?? 'a'} session(s) left. Renew here: https://etoile.academy/renew`);
      showToast(isRtl ? 'تم إرسال التذكير' : 'Nudge sent', `${it.name} • ${it.phone}`, 'success');
    } finally {
      setTimeout(() => setNudgingId(null), 3000);
    }
  };

  const shown = (items || []).slice(0, limit);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {isRtl ? 'قائمة التجديد' : 'Renewal queue'} {items ? `• ${items.length}` : ''}
        </span>
        <button onClick={load} className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition" title="Refresh">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {loading && <div className="shimmer-line h-12" />}
      {!loading && shown.length === 0 && (
        <p className="text-[11px] text-slate-500 text-center py-4 px-3 border border-dashed border-white/10 rounded-xl leading-relaxed">
          {students.length === 0
            ? (isRtl ? 'لا طلاب بعد — سجّل أول طالب لتتبع التجديد.' : 'No students yet — enroll the first dancer to track renewals.')
            : (isRtl ? 'لا تجديدات عاجلة — كل الباقات سليمة.' : 'No urgent renewals — packages healthy.')}
        </p>
      )}
      {!loading && shown.map((it) => (
        <div key={it.studentId + it.reason} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.07]">
          <span className={`w-1.5 h-8 rounded-full flex-shrink-0 ${it.priority === 'high' ? 'bg-rose-400' : 'bg-amber-400'}`} />
          <span className="flex-1 min-w-0">
            <strong className="block text-xs text-white truncate">{it.name}</strong>
            <span className="block text-[10px] text-slate-500">{it.reason.replace('_', ' ')}{it.left !== undefined ? ` • ${it.left} left` : ''}</span>
          </span>
          <button onClick={() => nudge(it)} disabled={nudgingId === it.studentId + it.reason} className="btn-ghost px-2.5 py-1.5 text-[10px] font-bold flex items-center gap-1 flex-shrink-0 disabled:opacity-50">
            <Bell className="w-3 h-3" /> {isRtl ? 'تذكير' : 'Nudge'}
          </button>
        </div>
      ))}
      {onOpenStudents && (items || []).length > 0 && (
        <button onClick={onOpenStudents} className="w-full text-[11px] font-bold text-rose-300 hover:text-white flex items-center justify-center gap-1 py-1.5">
          {isRtl ? 'فتح إدارة الطلاب' : 'Open student CRM'} <ArrowRight className="w-3 h-3 rtl:rotate-180" />
        </button>
      )}
    </div>
  );
};

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { api, errMsg } from '../utils/api';
import { exportCsv } from '../utils/csv';
import { ViewSwitcher, useViewPrefs } from './ViewSwitcher';
import { CalendarDays, Plus, Check, X, Palmtree, Search, Download } from 'lucide-react';

interface Shift {
  id: string;
  staffId: string;
  staff?: { id: string; name: string; role: string };
  date: string;
  startTime: string;
  endTime: string;
  duty: string | null;
  status: string;
}

interface Leave {
  id: string;
  staffId: string;
  staff?: { id: string; name: string; role: string };
  from: string;
  to: string;
  reason: string;
  status: string;
}

function mondayOf(d: Date): Date {
  const c = new Date(d);
  const day = (c.getDay() + 6) % 7;
  c.setDate(c.getDate() - day);
  c.setHours(0, 0, 0, 0);
  return c;
}

function iso(d: Date): string {
  return d.toISOString().split('T')[0];
}

export const RosterView: React.FC = () => {
  const { language, showToast, staffList, currentUser } = useAdmin();
  const isManager = currentUser?.role === 'superadmin' || currentUser?.role === 'owner';
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [form, setForm] = useState({ staffId: '', date: iso(new Date()), startTime: '09:00', endTime: '17:00', duty: 'Front desk' });
  const [leaveForm, setLeaveForm] = useState({ from: iso(new Date()), to: iso(new Date()), reason: '' });
  const [rosterSearch, setRosterSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const rosterView = useViewPrefs('staff-roster-week', 'cards');

  const visibleShifts = useMemo(() => {
    const needle = rosterSearch.trim().toLowerCase();
    return shifts.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (!needle) return true;
      return `${s.staff?.name || ''} ${s.staffId} ${s.duty || ''}`.toLowerCase().includes(needle);
    });
  }, [shifts, rosterSearch, statusFilter]);

  const weekEnd = useMemo(() => {
    const e = new Date(weekStart);
    e.setDate(e.getDate() + 6);
    return e;
  }, [weekStart]);

  const load = useCallback(async () => {
    try {
      const [{ data: sData }, { data: lData }] = await Promise.all([
        api.get(`/api/roster/shifts?from=${iso(weekStart)}&to=${iso(weekEnd)}`),
        api.get('/api/roster/leaves'),
      ]);
      setShifts(sData);
      setLeaves(lData);
    } catch {
      // offline
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    load();
  }, [load]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  }), [weekStart]);

  const createShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/roster/shifts', form);
      showToast(language === 'ar' ? 'تمت جدولة الوردية' : 'Shift scheduled', '', 'success');
      load();
    } catch (err) {
      showToast('Schedule failed', errMsg(err), 'error');
    }
  };

  const setStatus = async (id: string, status: string) => {
    await api.patch(`/api/roster/shifts/${id}`, { status }).catch(() => null);
    load();
  };

  const decide = async (id: string, approve: boolean) => {
    try {
      await api.post(`/api/roster/leaves/${id}/decide`, { approve });
      load();
    } catch (err) {
      showToast('Decision failed', errMsg(err), 'error');
    }
  };

  const requestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/roster/leaves', leaveForm);
      showToast(language === 'ar' ? 'تم إرسال الطلب' : 'Leave requested', '', 'success');
      load();
    } catch (err) {
      showToast('Request failed', errMsg(err), 'error');
    }
  };

  const pending = leaves.filter((l) => l.status === 'pending');

  return (
    <div className="space-y-5 animate-fade-up" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart((w) => { const n = new Date(w); n.setDate(n.getDate() - 7); return n; })} className="px-3 py-1.5 rounded-lg border border-white/10 text-xs" aria-label="Previous week">←</button>
          <button onClick={() => setWeekStart(mondayOf(new Date()))} className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold">
            {language === 'ar' ? 'هذا الأسبوع' : 'This week'}
          </button>
          <button onClick={() => setWeekStart((w) => { const n = new Date(w); n.setDate(n.getDate() + 7); return n; })} className="px-3 py-1.5 rounded-lg border border-white/10 text-xs" aria-label="Next week">→</button>
          <span className="text-xs text-slate-400 font-mono" dir="ltr">{iso(weekStart)} → {iso(weekEnd)}</span>
        </div>
        <div className="flex items-center gap-2 sm:ms-auto">
          <label className="relative">
            <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
              placeholder={language === 'ar' ? 'بحث عن موظف...' : 'Search staff...'}
              className="ps-8 pe-3 py-1.5 input-premium text-xs w-44"
              aria-label={language === 'ar' ? 'بحث الورديات' : 'Search shifts'}
            />
          </label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2.5 py-1.5 rounded-lg bg-[#121619] border border-white/10 text-xs" aria-label="Status">
            <option value="all">All</option>
            <option value="scheduled">scheduled</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
          </select>
          <ViewSwitcher moduleKey="staff-roster-week" modes={['cards', 'rows']} value={{ mode: rosterView.mode, density: rosterView.density }} onChange={(p) => { rosterView.setMode(p.mode); rosterView.setDensity(p.density); }} />
          <button
            onClick={() => exportCsv(`roster-${iso(weekStart)}`, ['date', 'staff', 'startTime', 'endTime', 'duty', 'status'], visibleShifts.map((s) => ({
              date: String(s.date).split('T')[0], staff: s.staff?.name || s.staffId, startTime: s.startTime, endTime: s.endTime, duty: s.duty || '', status: s.status,
            })))}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" /><span>CSV</span>
          </button>
        </div>
      </div>
      {rosterView.mode === 'rows' ? (
        <div className="rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
          <div className="hidden sm:grid grid-cols-[110px_1fr_130px_150px_110px] gap-3 px-4 py-2 text-[10px] uppercase tracking-wider text-slate-500 bg-white/[0.02]">
            <span>Date</span><span>Staff</span><span>Time</span><span>Duty</span><span>Status</span>
          </div>
          {visibleShifts.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-500">No shifts match.</p>
          ) : (
            visibleShifts.map((s) => (
              <div key={s.id} className="flex flex-col sm:grid sm:grid-cols-[110px_1fr_130px_150px_110px] gap-1 sm:gap-3 px-4 py-2.5 text-xs hover:bg-white/[0.02] transition">
                <span className="font-mono text-slate-400" dir="ltr">{String(s.date).split('T')[0]}</span>
                <span className="font-semibold text-white truncate">{s.staff?.name || s.staffId}</span>
                <span className="font-mono text-slate-300" dir="ltr">{s.startTime}–{s.endTime}</span>
                <span className="text-slate-400 truncate">{s.duty || '—'}</span>
                <span className="text-slate-500">{s.status}</span>
              </div>
            ))
          )}
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {days.map((d) => {
          const key = iso(d);
          const dayShifts = visibleShifts.filter((s) => String(s.date).split('T')[0] === key);
          return (
            <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-2.5 min-h-[120px]">
              <p className="text-[11px] font-bold text-slate-300">
                {d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'short' })} <span className="font-mono text-slate-500" dir="ltr">{key.slice(5)}</span>
              </p>
              <div className="space-y-1.5 mt-2">
                {dayShifts.length === 0 && <p className="text-[10px] text-slate-600">—</p>}
                {dayShifts.map((s) => (
                  <div key={s.id} className={`rounded-lg border p-1.5 text-[10px] ${s.status !== 'scheduled' ? 'opacity-50 border-white/10' : 'border-white/15 bg-white/[0.03]'}`}>
                    <p className="font-bold text-white truncate">{s.staff?.name || s.staffId}</p>
                    <p className="font-mono text-slate-400" dir="ltr">{s.startTime}–{s.endTime}</p>
                    {s.duty && <p className="text-slate-500 truncate">{s.duty}</p>}
                    {isManager && s.status === 'scheduled' && (
                      <span className="flex gap-1 mt-1">
                        <button onClick={() => setStatus(s.id, 'completed')} className="p-1 rounded border border-emerald-500/30 text-emerald-300" aria-label="Complete"><Check className="w-3 h-3" /></button>
                        <button onClick={() => setStatus(s.id, 'cancelled')} className="p-1 rounded border border-amber-500/30 text-amber-300" aria-label="Cancel"><X className="w-3 h-3" /></button>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {isManager && (
        <form onSubmit={createShift} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
          <label className="text-xs text-slate-400">Staff
            <select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} required className="mt-1 w-full px-2 py-2 rounded-lg bg-[#121619] border border-white/10 text-xs text-white">
              <option value="">—</option>
              {staffList.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-400">Date
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className="mt-1 w-full px-2 py-2 rounded-lg bg-[#121619] border border-white/10 text-xs text-white" dir="ltr" />
          </label>
          <label className="text-xs text-slate-400">Start
            <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="mt-1 w-full px-2 py-2 rounded-lg bg-[#121619] border border-white/10 text-xs text-white" dir="ltr" />
          </label>
          <label className="text-xs text-slate-400">End
            <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="mt-1 w-full px-2 py-2 rounded-lg bg-[#121619] border border-white/10 text-xs text-white" dir="ltr" />
          </label>
          <label className="text-xs text-slate-400">Duty
            <input value={form.duty} onChange={(e) => setForm({ ...form, duty: e.target.value })} className="mt-1 w-full px-2 py-2 rounded-lg bg-[#121619] border border-white/10 text-xs text-white" />
          </label>
          <button type="submit" className="gold-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Schedule
          </button>
        </form>
      )}

      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 text-xs font-bold text-white flex items-center gap-2">
          <Palmtree className="w-4 h-4 text-emerald-300" />
          {language === 'ar' ? 'طلبات الإجازات' : 'Leave requests'}
          {pending.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">{pending.length} pending</span>}
        </div>
        {leaves.length === 0 ? (
          <p className="p-6 text-center text-xs text-slate-500">{language === 'ar' ? 'لا طلبات.' : 'No requests.'}</p>
        ) : leaves.slice(0, 20).map((l) => (
          <div key={l.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-white/5 last:border-0 text-xs">
            <strong className="text-white">{l.staff?.name || l.staffId}</strong>
            <span className="font-mono text-slate-400" dir="ltr">{String(l.from).split('T')[0]} → {String(l.to).split('T')[0]}</span>
            {l.reason && <span className="text-slate-500 truncate max-w-[200px]">{l.reason}</span>}
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
              l.status === 'approved' ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
              : l.status === 'rejected' ? 'text-rose-300 border-rose-500/30 bg-rose-500/10'
              : 'text-amber-300 border-amber-500/30 bg-amber-500/10'}`}>{l.status}</span>
            {isManager && l.status === 'pending' && (
              <span className="ms-auto flex gap-1.5">
                <button onClick={() => decide(l.id, true)} className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold">Approve</button>
                <button onClick={() => decide(l.id, false)} className="px-3 py-1 rounded-lg border border-rose-500/40 text-rose-300 font-bold">Reject</button>
              </span>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={requestLeave} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex flex-wrap items-end gap-2">
        <span className="text-xs font-bold text-white w-full flex items-center gap-2"><CalendarDays className="w-4 h-4 text-sky-300" /> {language === 'ar' ? 'طلب إجازة' : 'Request leave'}</span>
        <label className="text-xs text-slate-400">From
          <input type="date" value={leaveForm.from} onChange={(e) => setLeaveForm({ ...leaveForm, from: e.target.value })} required className="mt-1 px-2 py-2 rounded-lg bg-[#121619] border border-white/10 text-xs text-white" dir="ltr" />
        </label>
        <label className="text-xs text-slate-400">To
          <input type="date" value={leaveForm.to} onChange={(e) => setLeaveForm({ ...leaveForm, to: e.target.value })} required className="mt-1 px-2 py-2 rounded-lg bg-[#121619] border border-white/10 text-xs text-white" dir="ltr" />
        </label>
        <label className="text-xs text-slate-400 flex-1 min-w-[160px]">Reason
          <input value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} maxLength={200} className="mt-1 w-full px-2 py-2 rounded-lg bg-[#121619] border border-white/10 text-xs text-white" dir="auto" />
        </label>
        <button type="submit" className="px-4 py-2 rounded-xl border border-white/15 text-xs font-bold text-white">Submit</button>
      </form>
    </div>
  );
};

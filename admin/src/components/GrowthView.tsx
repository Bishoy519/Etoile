import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { api, errMsg } from '../utils/api';
import { exportCsv } from '../utils/csv';
import { ViewSwitcher, useViewPrefs } from './ViewSwitcher';
import { Gift, Star, CheckCircle2, Clock, Trash2, Plus, Search, Download } from 'lucide-react';

interface Referral {
  id: string;
  referrerFamilyId: string;
  referrer?: { id: string; parentName: string };
  referredName: string;
  leadId: string | null;
  studentId: string | null;
  status: string;
  rewardAmount: number;
  createdAt: string;
}

interface Testimonial {
  id: string;
  authorName: string;
  authorRole: string | null;
  text: string;
  textAr: string | null;
  rating: number;
  status: string;
  createdAt: string;
}

export const GrowthView: React.FC = () => {
  const { language, showToast, students } = useAdmin();
  const [tab, setTab] = useState<'referrals' | 'testimonials'>('referrals');
  const [refs, setRefs] = useState<Referral[]>([]);
  const [filter, setFilter] = useState('all');
  const [growthSearch, setGrowthSearch] = useState('');
  const growthView = useViewPrefs('growth', 'cards');
  const [rewardId, setRewardId] = useState<string | null>(null);
  const [rewardStudent, setRewardStudent] = useState('');
  const [rewardAmount, setRewardAmount] = useState('100');
  const [testis, setTestis] = useState<Testimonial[]>([]);
  const [editing, setEditing] = useState<Partial<Testimonial> & { id?: string } | null>(null);

  const loadRefs = useCallback(async () => {
    try {
      const qs = filter === 'all' ? '' : `?status=${filter}`;
      const { data } = await api.get(`/api/referrals${qs}`);
      setRefs(data);
    } catch {
      // offline
    }
  }, [filter]);

  const loadTestis = useCallback(async () => {
    try {
      const { data } = await api.get('/api/testimonials/all');
      setTestis(data);
    } catch {
      // offline
    }
  }, []);

  useEffect(() => {
    if (tab === 'referrals') loadRefs();
    else loadTestis();
  }, [tab, loadRefs, loadTestis]);

  const reward = async () => {
    if (!rewardId || !rewardStudent) return;
    const amt = Number(rewardAmount);
    if (!Number.isFinite(amt) || amt <= 0 || amt > 1000) {
      showToast('Invalid amount', 'Reward must be 1–1000 EGP.', 'error');
      return;
    }
    try {
      await api.post(`/api/referrals/${rewardId}/reward`, { studentId: rewardStudent, amount: amt });
      showToast(language === 'ar' ? 'تمت المكافأة' : 'Rewarded', `EGP ${amt} wallet credit applied.`, 'success');
      setRewardId(null);
      setRewardStudent('');
      loadRefs();
    } catch (e) {
      showToast('Reward failed', errMsg(e), 'error');
    }
  };

  const saveTesti = async () => {
    if (!editing?.authorName?.trim() || !editing?.text?.trim() || editing.text.trim().length < 10) {
      showToast('Missing fields', 'Author + 10 chars of text required.', 'error');
      return;
    }
    try {
      if (editing.id) await api.patch(`/api/testimonials/${editing.id}`, editing);
      else await api.post('/api/testimonials', editing);
      setEditing(null);
      loadTestis();
    } catch (e) {
      showToast('Save failed', errMsg(e), 'error');
    }
  };

  const setStatus = async (t: Testimonial, status: string) => {
    await api.patch(`/api/testimonials/${t.id}`, { status }).catch(() => null);
    loadTestis();
  };

  const statusBadge = (s: string) =>
    s === 'rewarded' || s === 'published' ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
    : s === 'converted' ? 'text-sky-300 border-sky-500/30 bg-sky-500/10'
    : s === 'pending' || s === 'draft' ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
    : 'text-slate-400 border-white/15 bg-white/5';

  return (
    <div className="space-y-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex p-1 rounded-xl bg-white/[0.03] border border-white/10 w-fit">
        {(['referrals', 'testimonials'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${tab === t ? 'nav-pill-active' : 'text-slate-400 hover:text-white'}`}>
            {t === 'referrals' ? (language === 'ar' ? 'الإحالات' : 'Referrals') : (language === 'ar' ? 'آراء العملاء' : 'Testimonials')}
          </button>
        ))}
      </div>

      {tab === 'referrals' ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { k: 'pending', icon: <Clock className="w-4 h-4" />, n: refs.filter((r) => r.status === 'pending').length },
              { k: 'converted', icon: <CheckCircle2 className="w-4 h-4" />, n: refs.filter((r) => r.status === 'converted').length },
              { k: 'rewarded', icon: <Gift className="w-4 h-4" />, n: refs.filter((r) => r.status === 'rewarded').length },
            ].map((s) => (
              <div key={s.k} className="premium-card p-4 flex items-center gap-3">
                <span className="text-amber-300">{s.icon}</span>
                <span><strong className="block text-xl text-white font-heading">{s.n}</strong><span className="text-[11px] text-slate-400 capitalize">{s.k}</span></span>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <label className="relative flex-1">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                value={growthSearch}
                onChange={(e) => setGrowthSearch(e.target.value)}
                placeholder={language === 'ar' ? 'ابحث عن محيل أو محال...' : 'Search referrer or referred...'}
                className="w-full ps-9 pe-9 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-400/40"
                aria-label={language === 'ar' ? 'بحث النمو' : 'Search growth'}
              />
              {growthSearch && (
                <button onClick={() => setGrowthSearch('')} className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1" aria-label="Clear search">✕</button>
              )}
            </label>
            <div className="flex items-center gap-2">
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-[#121619] border border-white/10 text-xs" aria-label="Status filter">
                {['all', 'pending', 'converted', 'rewarded', 'rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <ViewSwitcher moduleKey="growth" modes={['cards', 'rows']} value={{ mode: growthView.mode, density: growthView.density }} onChange={(p) => { growthView.setMode(p.mode); growthView.setDensity(p.density); }} />
              <button
                onClick={() => {
                  const needle = growthSearch.trim().toLowerCase();
                  const list = refs.filter((r) => !needle || `${r.referredName} ${r.referrer?.parentName || ''}`.toLowerCase().includes(needle));
                  exportCsv(`referrals-${new Date().toISOString().split('T')[0]}`, ['id', 'referredName', 'referrer', 'status', 'rewardAmount'], list.map((r) => ({
                    id: r.id, referredName: r.referredName, referrer: r.referrer?.parentName || r.referrerFamilyId, status: r.status, rewardAmount: r.rewardAmount,
                  })));
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5"
                title={language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
              >
                <Download className="w-3.5 h-3.5" /><span>CSV</span>
              </button>
            </div>
          </div>
          <div className={growthView.mode === 'rows' ? 'rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5' : 'rounded-2xl border border-white/10 overflow-hidden'}>
            {refs.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-500">{language === 'ar' ? 'لا إحالات بعد — شاركي الأكواد من بوابة العائلة.' : 'No referrals yet — families share codes from their portal.'}</p>
            ) : refs.filter((r) => !growthSearch.trim() || `${r.referredName} ${r.referrer?.parentName || ''}`.toLowerCase().includes(growthSearch.trim().toLowerCase())).map((r) => {
              const famStudents = students.filter((s) => s.familyId === r.referrerFamilyId);
              return (
                <div key={r.id} className="px-4 py-3 border-b border-white/5 last:border-0 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-white">{r.referredName || '—'}</strong>
                    <span className="text-slate-500">← {r.referrer?.parentName || r.referrerFamilyId}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${statusBadge(r.status)}`}>{r.status}</span>
                    {r.rewardAmount > 0 && <span className="text-[11px] font-mono text-emerald-300">EGP {r.rewardAmount}</span>}
                    {r.status === 'converted' && (
                      <button onClick={() => { setRewardId(r.id); setRewardStudent(famStudents[0]?.id || ''); }} className="ms-auto px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold">
                        {language === 'ar' ? 'مكافأة' : 'Reward'}
                      </button>
                    )}
                  </div>
                  {rewardId === r.id && (
                    <div className="flex flex-wrap items-center gap-2 mt-2 p-2 rounded-xl bg-white/[0.03] border border-white/10">
                      <select value={rewardStudent} onChange={(e) => setRewardStudent(e.target.value)} className="px-2 py-1.5 rounded-lg bg-[#121619] border border-white/10 text-xs" aria-label="Reward student">
                        {famStudents.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <input value={rewardAmount} onChange={(e) => setRewardAmount(e.target.value)} type="number" min={1} max={1000} dir="ltr" className="w-24 px-2 py-1.5 rounded-lg bg-[#121619] border border-white/10 text-xs font-mono" aria-label="Amount EGP" />
                      <button onClick={reward} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold">Confirm</button>
                      <button onClick={() => setRewardId(null)} className="px-3 py-1.5 rounded-lg border border-white/15 text-xs">Cancel</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <label className="relative flex-1">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                value={growthSearch}
                onChange={(e) => setGrowthSearch(e.target.value)}
                placeholder={language === 'ar' ? 'ابحث عن كاتب أو اقتباس...' : 'Search author or quote...'}
                className="w-full ps-9 pe-9 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-400/40"
                aria-label={language === 'ar' ? 'بحث الآراء' : 'Search testimonials'}
              />
              {growthSearch && (
                <button onClick={() => setGrowthSearch('')} className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1" aria-label="Clear search">✕</button>
              )}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500">{testis.filter((t) => !growthSearch.trim() || `${t.authorName} ${t.text}`.toLowerCase().includes(growthSearch.trim().toLowerCase())).length}/{testis.length}</span>
              <button
                onClick={() => exportCsv(`testimonials-${new Date().toISOString().split('T')[0]}`, ['authorName', 'authorRole', 'rating', 'status'], testis.map((t) => ({ authorName: t.authorName, authorRole: t.authorRole || '', rating: t.rating, status: t.status })))}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5"
                title="Export CSV"
              >
                <Download className="w-3.5 h-3.5" /><span>CSV</span>
              </button>
              <button onClick={() => setEditing({ authorName: '', authorRole: 'Parent', text: '', textAr: '', rating: 5 })} className="gold-btn px-4 py-2 text-xs font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" /> {language === 'ar' ? 'رأي جديد' : 'New testimonial'}
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            {testis.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-500">No testimonials yet.</p>
            ) : testis.filter((t) => !growthSearch.trim() || `${t.authorName} ${t.text}`.toLowerCase().includes(growthSearch.trim().toLowerCase())).map((t) => (
              <div key={t.id} className="px-4 py-3 border-b border-white/5 last:border-0 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-white">{t.authorName}</strong>
                  <span className="text-slate-500">{t.authorRole}</span>
                  <span className="text-amber-300 flex items-center gap-0.5"><Star className="w-3 h-3" />{t.rating}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${statusBadge(t.status)}`}>{t.status}</span>
                  <span className="ms-auto flex gap-1.5">
                    {t.status !== 'published' && <button onClick={() => setStatus(t, 'published')} className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold">Publish</button>}
                    {t.status === 'published' && <button onClick={() => setStatus(t, 'archived')} className="px-2.5 py-1 rounded-lg border border-white/15 text-slate-300">Archive</button>}
                    <button onClick={() => setEditing(t)} className="px-2.5 py-1 rounded-lg border border-white/15 text-slate-300">Edit</button>
                    <button
                      onClick={async () => { await api.delete(`/api/testimonials/${t.id}`).catch(() => null); loadTestis(); }}
                      className="p-1.5 rounded-lg border border-rose-500/30 text-rose-300" aria-label="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>
                <p className="text-slate-300 mt-1 line-clamp-2">{t.text}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {editing && (
        <div role="dialog" aria-modal="true" aria-label="Testimonial editor" className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#121619] border border-white/10 p-5 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input value={editing.authorName || ''} onChange={(e) => setEditing({ ...editing, authorName: e.target.value })} placeholder="Author *" className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs" />
              <input value={editing.authorRole || ''} onChange={(e) => setEditing({ ...editing, authorRole: e.target.value })} placeholder="Role (Parent)" className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs" />
            </div>
            <textarea value={editing.text || ''} onChange={(e) => setEditing({ ...editing, text: e.target.value })} rows={3} placeholder="Quote (EN) *" dir="auto" className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs" />
            <textarea value={editing.textAr || ''} onChange={(e) => setEditing({ ...editing, textAr: e.target.value })} rows={2} placeholder="الاقتباس (AR)" dir="rtl" className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs" />
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Rating</label>
              <select value={editing.rating || 5} onChange={(e) => setEditing({ ...editing, rating: Number(e.target.value) })} className="px-2 py-1.5 rounded-lg bg-[#121619] border border-white/10 text-xs">
                {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} ★</option>)}
              </select>
              <span className="ms-auto flex gap-2">
                <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl border border-white/15 text-xs">Cancel</button>
                <button onClick={saveTesti} className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold">
                  Save
                </button>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { api, errMsg } from '../utils/api';
import { Layers, Users, CalendarDays, Check, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';

interface Category {
  id: string;
  key: string;
  title: string;
  titleAr?: string | null;
  color?: string | null;
}

interface Staff {
  id: string;
  name: string;
  role: string;
}

const DAYS = [
  { v: 0, en: 'Sun', ar: 'أحد' },
  { v: 1, en: 'Mon', ar: 'إثنين' },
  { v: 2, en: 'Tue', ar: 'ثلاثاء' },
  { v: 3, en: 'Wed', ar: 'أربعاء' },
  { v: 4, en: 'Thu', ar: 'خميس' },
  { v: 6, en: 'Sat', ar: 'سبت' },
];

/** Guided creation: Category → Group (+lead instructor) → Sessions (bulk). */
export const AcademyWizard: React.FC<{
  categories: Category[];
  staffList: Staff[];
  presetCategoryId?: string | null;
  onClose: () => void;
  onDone: (group: any) => void;
}> = ({ categories, staffList, presetCategoryId, onClose, onDone }) => {
  const { language, showToast } = useAdmin();
  const [step, setStep] = useState(1);
  const [categoryId, setCategoryId] = useState(presetCategoryId || '');
  const [newKey, setNewKey] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [title, setTitle] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [capacity, setCapacity] = useState('20');
  const [branchCode, setBranchCode] = useState('ZAM');
  const [branches, setBranches] = useState<{ code: string; name: string; nameAr?: string }[]>([
    { code: 'ZAM', name: 'Zamalek — Studio Opéra' },
    { code: 'NCAIRO', name: 'New Cairo — Studio Pavlova' },
  ]);
  const [level, setLevel] = useState('conservatory');
  const [bulk, setBulk] = useState({ from: new Date().toISOString().split('T')[0], to: '', days: [1, 3] as number[], startTime: '16:00', endTime: '17:30', studioRoom: 'Studio Petipa' });
  const [calcMode, setCalcMode] = useState<'range' | 'count'>('range');
  const [targetCount, setTargetCount] = useState<number>(12);
  const [createdGroup, setCreatedGroup] = useState<any>(null);
  const [bulkResult, setBulkResult] = useState<{ created: number; skipped: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const calculatedCount = React.useMemo(() => {
    if (!bulk.from || !bulk.to || bulk.days.length === 0) return 0;
    const start = new Date(`${bulk.from}T00:00:00`);
    const end = new Date(`${bulk.to}T00:00:00`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
    let cnt = 0;
    const cur = new Date(start);
    while (cur <= end) {
      if (bulk.days.includes(cur.getDay())) cnt++;
      cur.setDate(cur.getDate() + 1);
    }
    return cnt;
  }, [bulk.from, bulk.to, bulk.days]);

  useEffect(() => {
    if (calcMode === 'count' && bulk.from && targetCount > 0 && bulk.days.length > 0) {
      const cur = new Date(`${bulk.from}T00:00:00`);
      if (isNaN(cur.getTime())) return;
      let found = 0;
      let lastDate = cur;
      for (let i = 0; i < 365 && found < targetCount; i++) {
        if (bulk.days.includes(cur.getDay())) {
          found++;
          lastDate = new Date(cur);
          if (found === targetCount) break;
        }
        cur.setDate(cur.getDate() + 1);
      }
      const computedTo = lastDate.toISOString().split('T')[0];
      if (bulk.to !== computedTo) {
        setBulk((prev) => ({ ...prev, to: computedTo }));
      }
    }
  }, [calcMode, bulk.from, targetCount, bulk.days]);

  const instructors = staffList.filter((s) => ['instructor', 'superadmin', 'owner'].includes(s.role));

  useEffect(() => {
    api.get('/api/branches')
      .then((r) => r.data)
      .then((d: unknown) => {
        if (Array.isArray(d) && d.length > 0) setBranches(d);
      })
      .catch(() => {});
  }, []);

  const ensureCategory = async (): Promise<string> => {
    if (categoryId) return categoryId;
    if (!newKey.trim() || !newTitle.trim()) throw new Error('Pick a category or create one (key + title)');
    const { data: created } = await api.post('/api/academy/categories', { key: newKey, title: newTitle });
    setCategoryId(created.id);
    return created.id;
  };

  const createGroup = async () => {
    if (!title.trim()) {
      showToast('Missing title', 'Group title is required.', 'error');
      return;
    }
    if (!instructorId) {
      showToast('Missing instructor', 'Every group needs its lead instructor.', 'error');
      return;
    }
    setBusy(true);
    try {
      const catId = await ensureCategory();
      const { data: body } = await api.post('/api/academy/groups', {
        title: title.trim(),
        categoryId: catId,
        instructorId,
        capacity: Number(capacity) || 20,
        branchCode,
        level,
      });
      setCreatedGroup(body);
      setStep(3);
    } catch (e) {
      showToast('Create failed', errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const generateSessions = async () => {
    if (!createdGroup || bulk.days.length === 0 || !bulk.from || !bulk.to) {
      showToast('Missing slots', 'Pick a date range and at least one weekday.', 'error');
      return;
    }
    setBusy(true);
    try {
      const { data: body } = await api.post(`/api/academy/groups/${createdGroup.id}/sessions/bulk`, bulk);
      setBulkResult(body);
    } catch (e) {
      showToast('Generate failed', errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const steps = [
    { n: 1, icon: <Layers className="w-4 h-4" />, en: 'Category', ar: 'الفئة' },
    { n: 2, icon: <Users className="w-4 h-4" />, en: 'Group + Instructor', ar: 'المجموعة والمدرب' },
    { n: 3, icon: <CalendarDays className="w-4 h-4" />, en: 'Sessions', ar: 'الحصص' },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label="Academy creation wizard" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="bg-[#171d2b] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="p-5 sm:p-6 border-b border-white/10">
          <h2 className="font-heading text-xl font-bold text-white">{language === 'ar' ? 'إنشاء أكاديمي موجه' : 'Guided Academy Creation'}</h2>
          <div className="flex items-center gap-1.5 mt-3">
            {steps.map((s) => (
              <React.Fragment key={s.n}>
                <button
                  onClick={() => { if (s.n < step || (s.n === 3 && createdGroup)) setStep(s.n); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${step === s.n ? 'bg-white text-slate-950' : step > s.n ? 'text-emerald-300' : 'text-slate-500'}`}
                >
                  {step > s.n ? <Check className="w-3.5 h-3.5" /> : s.icon}
                  {language === 'ar' ? s.ar : s.en}
                </button>
                {s.n < 3 && <ChevronRight className="w-3.5 h-3.5 text-slate-600 rtl:rotate-180" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">{language === 'ar' ? 'اختاري فئة موجودة أو أنشئي واحدة جديدة.' : 'Pick an existing category or create a new one.'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {categories.filter((c) => (c as any).active !== false).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setCategoryId(c.id); setNewKey(''); setNewTitle(''); }}
                    className={`p-3 rounded-xl border text-start transition ${categoryId === c.id ? 'border-white bg-white text-slate-950' : 'border-white/10 hover:border-white/30'}`}
                  >
                    <span className="block text-sm font-bold">{language === 'ar' ? c.titleAr || c.title : c.title}</span>
                    <span className="block text-[10px] font-mono opacity-60" dir="ltr">{c.key}</span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <input value={newKey} onChange={(e) => { setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24)); setCategoryId(''); }} placeholder="new-key" dir="ltr" className="px-3 py-2.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white font-mono" aria-label="New category key" />
                <input value={newTitle} onChange={(e) => { setNewTitle(e.target.value); setCategoryId(''); }} placeholder={language === 'ar' ? 'اسم الفئة الجديدة' : 'New category title'} dir="auto" className="px-3 py-2.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white" aria-label="New category title" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1 font-medium">{language === 'ar' ? 'اسم المجموعة *' : 'Group title *'}</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} dir="auto" className="w-full px-3 py-2.5 rounded-xl bg-[#111622] border border-white/10 text-sm text-white" placeholder="Pre-Pro Monday Ballet" />
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1 font-medium">{language === 'ar' ? 'المدرب المسؤول *' : 'Lead instructor *'}</label>
                <select value={instructorId} onChange={(e) => setInstructorId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[#111622] border border-white/10 text-sm text-white">
                  <option value="">—</option>
                  {instructors.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="text-[11px] text-slate-300">Capacity
                  <input type="number" min={1} max={200} value={capacity} onChange={(e) => setCapacity(e.target.value)} dir="ltr" className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#111622] border border-white/10 text-sm text-white font-mono" />
                </label>
                <label className="text-[11px] text-slate-300">{language === 'ar' ? 'الفرع' : 'Branch'}
                  <select value={branchCode} onChange={(e) => setBranchCode(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#111622] border border-white/10 text-sm text-white">
                    {branches.map((b) => <option key={b.code} value={b.code}>{b.code}</option>)}
                  </select>
                </label>
                <label className="text-[11px] text-slate-300">Level
                  <input value={level} onChange={(e) => setLevel(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#111622] border border-white/10 text-sm text-white" />
                </label>
              </div>
            </div>
          )}

          {step === 3 && createdGroup && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-xs">
                <span className="text-emerald-300 font-bold flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> {createdGroup.code} — {createdGroup.title}</span>
              </div>
              {bulkResult ? (
                <div className="p-6 text-center">
                  <p className="font-heading text-2xl font-extrabold text-white">{bulkResult.created} {language === 'ar' ? 'حصة' : 'sessions'}</p>
                  <p className="text-xs text-slate-400 mt-1">{bulkResult.skipped} skipped (past or duplicate days)</p>
                </div>
              ) : (
                <>
                  {/* Mode switcher */}
                  <div className="flex p-1 rounded-xl bg-white/[0.04] border border-white/10 w-fit text-xs">
                    <button
                      type="button"
                      onClick={() => setCalcMode('range')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition ${calcMode === 'range' ? 'bg-white text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                      {language === 'ar' ? '📅 نطاق تاريخ (من إلى)' : '📅 Date Range (From → To)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcMode('count')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition ${calcMode === 'count' ? 'bg-white text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                      {language === 'ar' ? '🔢 عدد حصص محدد' : '🔢 Specific Count of Sessions'}
                    </button>
                  </div>

                  {calcMode === 'count' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[11px] text-slate-300">
                        {language === 'ar' ? 'عدد الحصص المطلوبة' : 'Target Sessions Count'}
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={targetCount}
                          onChange={(e) => setTargetCount(Math.max(1, Number(e.target.value)))}
                          className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white"
                        />
                      </label>
                      <label className="text-[11px] text-slate-300">
                        {language === 'ar' ? 'تاريخ البدء' : 'Start Date (From)'}
                        <input
                          type="date"
                          value={bulk.from}
                          onChange={(e) => setBulk({ ...bulk, from: e.target.value })}
                          dir="ltr"
                          className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[11px] text-slate-300">From
                        <input type="date" value={bulk.from} onChange={(e) => setBulk({ ...bulk, from: e.target.value })} dir="ltr" className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white" />
                      </label>
                      <label className="text-[11px] text-slate-300">To
                        <input type="date" value={bulk.to} onChange={(e) => setBulk({ ...bulk, to: e.target.value })} dir="ltr" className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white" />
                      </label>
                    </div>
                  )}

                  {/* Auto-Calculation Live Badge */}
                  <div className="p-3 rounded-xl border border-sky-500/30 bg-sky-500/10 flex items-center justify-between text-xs">
                    <span className="text-sky-200 font-medium">
                      {language === 'ar' ? 'الحساب التلقائي للحصص:' : 'Auto-Calculated Sessions:'}
                    </span>
                    <span className="font-heading font-extrabold text-sm text-sky-300">
                      {calcMode === 'count' ? `${targetCount} ${language === 'ar' ? 'حصة حتى' : 'sessions until'} ${bulk.to}` : `${calculatedCount} ${language === 'ar' ? 'حصة في هذه الفترة' : 'sessions in this period'}`}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[11px] text-slate-300">Start
                      <input type="time" value={bulk.startTime} onChange={(e) => setBulk({ ...bulk, startTime: e.target.value })} dir="ltr" className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white" />
                    </label>
                    <label className="text-[11px] text-slate-300">End
                      <input type="time" value={bulk.endTime} onChange={(e) => setBulk({ ...bulk, endTime: e.target.value })} dir="ltr" className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white" />
                    </label>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-300 block mb-1.5">Weekdays</span>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Weekdays">
                      {DAYS.map((d) => (
                        <button
                          key={d.v}
                          type="button"
                          onClick={() => setBulk({ ...bulk, days: bulk.days.includes(d.v) ? bulk.days.filter((x) => x !== d.v) : [...bulk.days, d.v] })}
                          aria-pressed={bulk.days.includes(d.v)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${bulk.days.includes(d.v) ? 'bg-white text-slate-950 border-white' : 'border-white/10 text-slate-400'}`}
                        >
                          {language === 'ar' ? d.ar : d.en}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6 border-t border-white/10 flex items-center justify-between gap-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white">
            {bulkResult ? (language === 'ar' ? 'إغلاق' : 'Close') : (language === 'ar' ? 'إلغاء' : 'Cancel')}
          </button>
          <div className="flex gap-2">
            {step === 2 && (
              <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl border border-white/15 text-xs flex items-center gap-1">
                <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" /> Back
              </button>
            )}
            {step === 1 && (
              <button onClick={() => { if (!categoryId && (!newKey.trim() || !newTitle.trim())) { showToast('Pick a category', 'Select one or fill key + title.', 'error'); return; } setStep(2); }} className="gold-btn px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1">
                Next <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            )}
            {step === 2 && (
              <button onClick={createGroup} disabled={busy} className="gold-btn px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50">
                {busy ? '...' : (language === 'ar' ? 'إنشاء المجموعة' : 'Create group')}
              </button>
            )}
            {step === 3 && !bulkResult && (
              <button onClick={generateSessions} disabled={busy} className="gold-btn px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50">
                {busy ? '...' : (language === 'ar' ? 'توليد الحصص' : 'Generate sessions')}
              </button>
            )}
            {step === 3 && (
              <button onClick={() => { if (bulkResult && createdGroup) onDone(createdGroup); else if (createdGroup) onDone(createdGroup); }} className="px-5 py-2.5 rounded-xl border border-white/15 text-xs font-bold">
                {bulkResult ? (language === 'ar' ? 'فتح المجموعة' : 'Open group') : (language === 'ar' ? 'تخطي' : 'Skip for now')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

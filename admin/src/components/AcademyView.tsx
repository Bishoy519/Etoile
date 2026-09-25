import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { api, errMsg } from '../utils/api';
import { exportCsv } from '../utils/csv';
import { ModuleSubSidebar } from './ModuleSubSidebar';
import { ViewSwitcher, useViewPrefs } from './ViewSwitcher';
import { AcademyWizard } from './AcademyWizard';
import { CourseManagement } from './CourseManagement';
import {
  Layers, Users, CalendarDays, Archive, Plus, Search, Bell, X, Check,
  AlertTriangle, Clock, ChevronRight, GraduationCap, Sparkles, MapPin, Copy, Download,
  Ban, Zap, RotateCcw, XCircle,
} from 'lucide-react';

interface Category {
  id: string;
  key: string;
  title: string;
  titleAr?: string | null;
  color?: string | null;
  active: boolean;
  _count?: { groups: number };
}

interface Group {
  id: string;
  code: string;
  title: string;
  titleAr?: string | null;
  categoryId: string;
  category?: { id: string; key: string; title: string; titleAr?: string | null; color?: string | null };
  instructorId: string | null;
  instructor?: { id: string; name: string; role: string } | null;
  capacity: number;
  branchCode?: string | null;
  level?: string | null;
  active: boolean;
  _count?: { sessions: number; enrollments: number };
}

interface Session {
  id: string;
  title: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  studioRoom: string;
  status: string;
  reminderSent: boolean;
  capacity?: number | null;
}

type AcademyTab = 'hierarchy' | 'workload' | 'legacy';

export type AcademySection = 'categories' | 'groups' | 'sessions';

export const AcademyView: React.FC<{ section?: AcademySection }> = ({ section }) => {
  const { language, showToast, staffList, students } = useAdmin();
  const [tab, setTab] = useState<AcademyTab>('hierarchy');
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('all');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(section === 'categories');
  const [newCat, setNewCat] = useState({ key: '', title: '' });
  const [quickTitle, setQuickTitle] = useState('');
  const [quickInstructor, setQuickInstructor] = useState('');
  const [quickBusy, setQuickBusy] = useState(false);
  const view = useViewPrefs('academy', 'cards');

  const instructors = useMemo(
    () => staffList.filter((s) => ['instructor', 'superadmin', 'owner'].includes(s.role)),
    [staffList],
  );

  /** One-line group creation with smart defaults → lands straight in the detail to add sessions. */
  const quickAdd = async () => {
    const catId = selectedCategoryId || categories.find((c) => c.active !== false)?.id;
    if (!catId) {
      showToast(language === 'ar' ? 'أنشئ فئة أولاً' : 'Create a category first', '', 'error');
      return;
    }
    if (!quickTitle.trim() || !quickInstructor) {
      showToast(language === 'ar' ? 'الاسم والمدرب مطلوبان' : 'Title + instructor required', '', 'error');
      return;
    }
    setQuickBusy(true);
    try {
      const { data: body } = await api.post('/api/academy/groups', { title: quickTitle.trim(), categoryId: catId, instructorId: quickInstructor });
      setQuickTitle('');
      await loadAll();
      setSelectedCategoryId(body.categoryId);
      setSelectedGroupId(body.id);
    } catch (e) {
      showToast('Quick add failed', errMsg(e), 'error');
    } finally {
      setQuickBusy(false);
    }
  };

  const loadAll = useCallback(async () => {
    try {
      const [c, g] = await Promise.all([
        api.get('/api/academy/categories?inactive=true').then((r) => r.data).catch(() => null),
        api.get('/api/academy/groups?includeInactive=true').then((r) => r.data).catch(() => null),
      ]);
      if (Array.isArray(c)) setCategories(c);
      if (Array.isArray(g)) setGroups(g);
    } catch {
      // offline
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const branches = useMemo(() => {
    const s = new Set(groups.map((g) => (g.branchCode || 'ZAM').toUpperCase()));
    return ['all', ...Array.from(s).sort()];
  }, [groups]);

  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((g) => {
      if (selectedCategoryId && g.categoryId !== selectedCategoryId) return false;
      if (branch !== 'all' && (g.branchCode || 'ZAM').toUpperCase() !== branch) return false;
      if (q && !(g.title.toLowerCase().includes(q) || g.code.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [groups, selectedCategoryId, branch, search]);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) || null;
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || null;

  const createCategory = async () => {
    if (!newCat.key.trim() || !newCat.title.trim()) {
      showToast('Missing fields', 'Key + title required.', 'error');
      return;
    }
    try {
      await api.post('/api/academy/categories', { key: newCat.key, title: newCat.title });
      setNewCat({ key: '', title: '' });
      setShowNewCategory(false);
      loadAll();
    } catch (e) {
      showToast('Create failed', errMsg(e), 'error');
    }
  };

  const archiveCategory = async (id: string) => {
    try {
      await api.delete(`/api/academy/categories/${id}`);
      if (selectedCategoryId === id) setSelectedCategoryId(null);
      loadAll();
    } catch (e) {
      showToast('Archive blocked', errMsg(e), 'error');
    }
  };

  const archiveGroup = async (id: string) => {
    try {
      await api.delete(`/api/academy/groups/${id}`);
      setSelectedGroupId(null);
      loadAll();
    } catch (e) {
      showToast('Archive failed', errMsg(e), 'error');
    }
  };

  const occupancy = (g: Group) => {
    const enrolled = g._count?.enrollments || 0;
    return { enrolled, pct: Math.min(100, Math.round((enrolled / Math.max(1, g.capacity)) * 100)) };
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-col lg:flex-row items-start gap-6">
        <ModuleSubSidebar<AcademyTab>
          activeId={tab}
          onChange={setTab}
          language={language}
          title="Academy"
          titleAr="الأكاديمية"
          items={[
            { id: 'hierarchy', label: 'Categories › Groups', labelAr: 'الفئات والمجموعات', icon: <Layers className="w-4 h-4" />, count: groups.length },
            { id: 'workload', label: 'Instructor Workload', labelAr: 'أعباء المدربين', icon: <GraduationCap className="w-4 h-4" /> },
            { id: 'legacy', label: 'Legacy Courses', labelAr: 'الدورات القديمة', icon: <Archive className="w-4 h-4" /> },
          ]}
          actionButton={
            tab === 'hierarchy'
              ? { label: 'New Group', labelAr: 'مجموعة جديدة', icon: <Plus className="w-4 h-4" />, onClick: () => setWizardOpen(true) }
              : undefined
          }
        />

        <div className="flex-1 min-w-0 w-full space-y-5">
          {tab === 'legacy' && <CourseManagement />}

          {tab === 'workload' && <WorkloadView />}

          {tab === 'hierarchy' && section === 'sessions' && <SessionsBrowser />}

          {tab === 'hierarchy' && section !== 'sessions' && (
            <>
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1.5 text-xs" aria-label="Breadcrumb">
                <button onClick={() => { setSelectedCategoryId(null); setSelectedGroupId(null); }} className={`hover:text-white ${!selectedCategory ? 'text-white font-bold' : 'text-slate-400'}`}>
                  {language === 'ar' ? 'الفئات' : 'Categories'}
                </button>
                {selectedCategory && (
                  <>
                    <ChevronRight className="w-3 h-3 text-slate-600 rtl:rotate-180" />
                    <button onClick={() => setSelectedGroupId(null)} className={`hover:text-white ${!selectedGroup ? 'text-white font-bold' : 'text-slate-400'}`}>
                      {selectedCategory.title}
                    </button>
                  </>
                )}
                {selectedGroup && (
                  <>
                    <ChevronRight className="w-3 h-3 text-slate-600 rtl:rotate-180" />
                    <span className="text-white font-bold truncate">{selectedGroup.title}</span>
                  </>
                )}
              </nav>

              {!selectedGroup ? (
                <>
                  {/* Toolbar */}
                  {(!section || section === 'groups' || selectedCategoryId) && (
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <label className="relative flex-1">
                      <Search className="w-4 h-4 absolute start-3 top-3 text-slate-400" />
                      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={language === 'ar' ? 'بحث...' : 'Search groups...'} className="w-full ps-9 pe-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm" aria-label="Search" />
                    </label>
                    <select value={branch} onChange={(e) => setBranch(e.target.value)} className="px-3 py-2.5 rounded-xl bg-[#121619] border border-white/10 text-xs" aria-label="Branch">
                      {branches.map((b) => <option key={b} value={b}>{b === 'all' ? 'All branches' : b}</option>)}
                    </select>
                    <select value={selectedCategoryId || ''} onChange={(e) => setSelectedCategoryId(e.target.value || null)} className="px-3 py-2.5 rounded-xl bg-[#121619] border border-white/10 text-xs" aria-label="Category">
                      <option value="">{language === 'ar' ? 'كل الفئات' : 'All categories'}</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                    <ViewSwitcher moduleKey="academy" value={{ mode: view.mode, density: view.density }} onChange={(p) => { view.setMode(p.mode); view.setDensity(p.density); }} />
                    <span className="text-[11px] font-mono text-slate-500 px-1">{visibleGroups.length}/{groups.length}</span>
                    <button
                      onClick={() => exportCsv(`academy-groups-${new Date().toISOString().split('T')[0]}`, ['id', 'code', 'title', 'category', 'instructor', 'capacity', 'branch', 'active'], visibleGroups.map((g) => ({
                        id: g.id, code: g.code, title: g.title, category: g.category?.title || g.categoryId,
                        instructor: g.instructor?.name || '', capacity: g.capacity, branch: g.branchCode || '', active: g.active ? 'yes' : 'no',
                      })))}
                      className="px-3 py-2.5 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5"
                      title={language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
                    >
                      <Download className="w-3.5 h-3.5" /><span>CSV</span>
                    </button>
                  </div>
                  )}

                  {/* Category cards */}
                  {((!section && !selectedCategoryId) || section === 'categories') && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                          {language === 'ar' ? 'الفئات' : 'Categories'}
                          <span className="ms-2 font-mono text-slate-500">({categories.length})</span>
                        </h3>
                        <button onClick={() => setShowNewCategory((v) => !v)} className="gold-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5" /> {language === 'ar' ? 'فئة جديدة' : 'New category'}
                        </button>
                      </div>
                      {showNewCategory && (
                        <div className="flex gap-2 mb-3 p-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.04]">
                          <input value={newCat.key} onChange={(e) => setNewCat({ ...newCat, key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) })} placeholder="key" dir="ltr" className="w-32 px-3 py-2 rounded-xl bg-[#111622] border border-white/10 text-xs font-mono" aria-label="Category key" />
                          <input value={newCat.title} onChange={(e) => setNewCat({ ...newCat, title: e.target.value })} placeholder="Title" dir="auto" className="flex-1 px-3 py-2 rounded-xl bg-[#111622] border border-white/10 text-xs" aria-label="Category title" />
                          <button onClick={createCategory} className="gold-btn px-4 py-2 rounded-xl text-xs font-bold">Add</button>
                        </div>
                      )}
                      {categories.length === 0 && !showNewCategory && (
                        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center mb-3">
                          <Layers className="w-6 h-6 text-amber-300/60 mx-auto mb-2" />
                          <p className="font-heading font-bold text-white text-sm">{language === 'ar' ? 'ابدأ بالخطوة 1: أنشئ أول فئة' : 'Start with Step 1: create your first category'}</p>
                          <p className="text-[11px] text-slate-500 mt-1">{language === 'ar' ? 'مثال: classical — الباليه الكلاسيكي. المجموعات تسكن داخل الفئات.' : 'E.g. classical — Classical Ballet. Groups live inside categories.'}</p>
                          <button onClick={() => setShowNewCategory(true)} className="gold-btn px-5 py-2.5 rounded-xl text-xs font-bold mt-3">New category</button>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {categories.map((c) => {
                          const n = groups.filter((g) => g.categoryId === c.id).length;
                          return (
                            <div key={c.id} className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                              <div className="h-1.5" style={{ background: c.color || '#caa868' }} />
                              <button onClick={() => setSelectedCategoryId(c.id)} className="w-full text-start p-4 hover:bg-white/[0.03] transition">
                                <span className="font-heading font-bold text-white block">{c.title}</span>
                                <span className="text-[11px] text-slate-500 font-mono" dir="ltr">{c.key} • {n} groups</span>
                              </button>
                              {!c.active && <span className="mx-4 mb-2 inline-block text-[10px] px-2 py-0.5 rounded-full border border-white/15 text-slate-400">archived</span>}
                              {n === 0 && (
                                <button onClick={() => archiveCategory(c.id)} className="mx-4 mb-3 text-[11px] text-slate-500 hover:text-rose-300">Archive</button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Groups list */}
                  {(!section || section === 'groups' || selectedCategoryId) && (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 p-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04]">
                      <span className="text-[11px] font-bold text-emerald-300 whitespace-nowrap flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> {language === 'ar' ? 'إضافة سريعة' : 'Quick add'}
                      </span>
                      <input
                        value={quickTitle}
                        onChange={(e) => setQuickTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') quickAdd(); }}
                        placeholder={language === 'ar' ? 'اسم المجموعة — Enter للإنشاء' : 'Group title — Enter to create'}
                        dir="auto"
                        className="flex-1 px-3 py-2 rounded-xl bg-[#111622] border border-white/10 text-xs text-white"
                        aria-label="Quick group title"
                      />
                      <select value={quickInstructor} onChange={(e) => setQuickInstructor(e.target.value)} className="px-3 py-2 rounded-xl bg-[#111622] border border-white/10 text-xs text-white max-w-[180px]" aria-label="Instructor">
                        <option value="">{language === 'ar' ? 'المدرب' : 'Instructor'}</option>
                        {instructors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <button onClick={quickAdd} disabled={quickBusy} className="gold-btn px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 whitespace-nowrap">
                        {quickBusy ? '...' : (language === 'ar' ? 'إنشاء ومتابعة' : 'Create & open')}
                      </button>
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                      {language === 'ar' ? 'المجموعات' : 'Groups'} ({visibleGroups.length})
                    </h3>
                    {visibleGroups.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
                        <Sparkles className="w-6 h-6 text-amber-300/60 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">{language === 'ar' ? 'لا مجموعات — ابدأ بالمعالج الموجه.' : 'No groups here — start with the guided wizard.'}</p>
                        <button onClick={() => setWizardOpen(true)} className="gold-btn px-5 py-2.5 rounded-xl text-xs font-bold mt-3">New Group</button>
                      </div>
                    ) : view.mode === 'table' ? (
                      <div className="rounded-2xl border border-white/10 overflow-x-auto">
                        <table className="w-full text-xs min-w-[720px]">
                          <thead>
                            <tr className="text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                              <th className="text-start p-3">Group</th>
                              <th className="text-start p-3">Category</th>
                              <th className="text-start p-3">Instructor</th>
                              <th className="text-start p-3">Branch</th>
                              <th className="text-end p-3">Occupancy</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleGroups.map((g) => {
                              const o = occupancy(g);
                              return (
                                <tr key={g.id} onClick={() => setSelectedGroupId(g.id)} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] cursor-pointer">
                                  <td className={`${view.rowPad} font-semibold text-white`}><span className="font-mono text-slate-500 me-2" dir="ltr">{g.code}</span>{g.title}</td>
                                  <td className={view.rowPad}><span className="inline-block w-2 h-2 rounded-full me-1.5" style={{ background: g.category?.color || '#caa868' }} />{g.category?.title || '—'}</td>
                                  <td className={`${view.rowPad} text-slate-300`}>{g.instructor?.name || <span className="text-rose-300">unassigned</span>}</td>
                                  <td className={`${view.rowPad} font-mono text-slate-400`}>{g.branchCode || 'ZAM'}</td>
                                  <td className={`${view.rowPad} text-end font-mono`}>{o.enrolled}/{g.capacity}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className={view.mode === 'rows' ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'}>
                        {visibleGroups.map((g) => {
                          const o = occupancy(g);
                          return (
                            <button
                              key={g.id}
                              onClick={() => setSelectedGroupId(g.id)}
                              className={`text-start rounded-2xl border border-white/10 bg-white/[0.02] hover:border-white/25 transition overflow-hidden ${view.mode === 'rows' ? 'p-3 flex items-center gap-3' : 'p-4'}`}
                            >
                              <span className={`${view.mode === 'rows' ? 'w-1 self-stretch rounded-full' : 'block h-1 rounded-full mb-3'}`} style={{ background: g.category?.color || '#caa868' }} />
                              <span className="flex-1 min-w-0">
                                <span className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-[10px] text-slate-500" dir="ltr">{g.code}</span>
                                  {!g.active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/15 text-slate-400">archived</span>}
                                </span>
                                <span className="font-heading font-bold text-white block truncate mt-0.5">{g.title}</span>
                                <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                                  {g.category?.title} • {g.instructor?.name || 'unassigned'} • {g.branchCode || 'ZAM'}
                                </span>
                                <span className="flex items-center gap-2 mt-2">
                                  <span className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                    <span className={`block h-full rounded-full ${o.pct >= 100 ? 'bg-rose-400' : o.pct >= 75 ? 'bg-amber-300' : 'bg-emerald-400'}`} style={{ width: `${o.pct}%` }} />
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400">{o.enrolled}/{g.capacity}</span>
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  )}
                </>
              ) : (
                selectedGroup && (
                  <GroupDetail
                    groupId={selectedGroup.id}
                    onBack={() => { setSelectedGroupId(null); loadAll(); }}
                    onArchived={() => { setSelectedGroupId(null); loadAll(); }}
                    onCloned={(g) => { loadAll(); setSelectedCategoryId(g.categoryId); setSelectedGroupId(g.id); }}
                  />
                )
              )}
            </>
          )}
        </div>
      </div>

      {wizardOpen && (
        <AcademyWizard
          categories={categories}
          staffList={staffList}
          presetCategoryId={selectedCategoryId}
          onClose={() => setWizardOpen(false)}
          onDone={(g) => { setWizardOpen(false); loadAll(); setSelectedCategoryId(g.categoryId); setSelectedGroupId(g.id); }}
        />
      )}
    </div>
  );
};

/** Group detail: sessions / enrollments / waitlist with occupancy + archive. */
const GroupDetail: React.FC<{ groupId: string; onBack: () => void; onArchived: () => void; onCloned: (group: any) => void }> = ({ groupId, onBack, onArchived, onCloned }) => {
  const { language, showToast, students } = useAdmin();
  const [group, setGroup] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [subTab, setSubTab] = useState<'sessions' | 'enrollments' | 'waitlist'>('sessions');
  const [enrollId, setEnrollId] = useState('');
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneDate, setCloneDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [cloneBusy, setCloneBusy] = useState(false);
  const [single, setSingle] = useState({ title: '', date: new Date().toISOString().split('T')[0], startTime: '16:00', endTime: '17:30' });

  // Bulk sessions generator state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFrom, setBulkFrom] = useState(new Date().toISOString().split('T')[0]);
  const [bulkTo, setBulkTo] = useState('');
  const [bulkDays, setBulkDays] = useState<number[]>([1, 3]);
  const [bulkStart, setBulkStart] = useState('16:00');
  const [bulkEnd, setBulkEnd] = useState('17:30');
  const [bulkRoom, setBulkRoom] = useState('Studio Petipa');
  const [bulkMode, setBulkMode] = useState<'range' | 'count'>('range');
  const [bulkCount, setBulkCount] = useState<number>(12);
  const [bulkBusy, setBulkBusy] = useState(false);

  // Cancellation & Compensation state
  const [cancellingSession, setCancellingSession] = useState<Session | null>(null);
  const [cancelReason, setCancelReason] = useState('Academy schedule adjustment / تعديل جدول الأكاديمية');
  const [cancelCompType, setCancelCompType] = useState<'credit_session' | 'wallet_credit' | 'none'>('credit_session');
  const [cancelWalletAmount, setCancelWalletAmount] = useState<number>(150);
  const [cancelNotifyWa, setCancelNotifyWa] = useState(true);
  const [cancelBusy, setCancelBusy] = useState(false);

  const calculatedBulkSessions = useMemo(() => {
    if (!bulkFrom || !bulkTo || bulkDays.length === 0) return 0;
    const start = new Date(`${bulkFrom}T00:00:00`);
    const end = new Date(`${bulkTo}T00:00:00`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
    let cnt = 0;
    const cur = new Date(start);
    while (cur <= end) {
      if (bulkDays.includes(cur.getDay())) cnt++;
      cur.setDate(cur.getDate() + 1);
    }
    return cnt;
  }, [bulkFrom, bulkTo, bulkDays]);

  useEffect(() => {
    if (bulkMode === 'count' && bulkFrom && bulkCount > 0 && bulkDays.length > 0) {
      const cur = new Date(`${bulkFrom}T00:00:00`);
      if (isNaN(cur.getTime())) return;
      let found = 0;
      let lastDate = cur;
      for (let i = 0; i < 365 && found < bulkCount; i++) {
        if (bulkDays.includes(cur.getDay())) {
          found++;
          lastDate = new Date(cur);
          if (found === bulkCount) break;
        }
        cur.setDate(cur.getDate() + 1);
      }
      const computedTo = lastDate.toISOString().split('T')[0];
      if (bulkTo !== computedTo) setBulkTo(computedTo);
    }
  }, [bulkMode, bulkFrom, bulkCount, bulkDays]);

  const handleBulkGenerate = async () => {
    if (!bulkFrom || !bulkTo || bulkDays.length === 0) {
      showToast('Missing fields', 'Pick date range and at least one weekday', 'error');
      return;
    }
    setBulkBusy(true);
    try {
      const { data: res } = await api.post(`/api/academy/groups/${groupId}/sessions/bulk`, {
        from: bulkFrom,
        to: bulkTo,
        daysOfWeek: bulkDays,
        startTime: bulkStart,
        endTime: bulkEnd,
        studioRoom: bulkRoom,
        targetCount: bulkMode === 'count' ? bulkCount : undefined,
      });
      showToast(language === 'ar' ? `تم إنشاء ${res.created} حصة` : `Created ${res.created} sessions`, '', 'success');
      setBulkOpen(false);
      load();
    } catch (e) {
      showToast('Generation failed', errMsg(e), 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleCancelSession = async () => {
    if (!cancellingSession) return;
    setCancelBusy(true);
    try {
      const { data: res } = await api.post(`/api/academy/sessions/${cancellingSession.id}/cancel`, {
        reason: cancelReason,
        compensationType: cancelCompType,
        walletAmount: cancelWalletAmount,
        notifyWhatsapp: cancelNotifyWa,
      });
      showToast(
        language === 'ar' ? 'تم إلغاء الحصة وتعويض الطلاب' : 'Session cancelled & students compensated',
        language === 'ar' ? `تم تعويض ${res.compensatedCount} طالب بنجاح` : `Compensated ${res.compensatedCount} students`,
        'success',
      );
      setCancellingSession(null);
      load();
    } catch (e) {
      showToast('Cancel failed', errMsg(e), 'error');
    } finally {
      setCancelBusy(false);
    }
  };

  const load = useCallback(async () => {
    try {
      const [g, s, w] = await Promise.all([
        api.get(`/api/academy/groups/${groupId}`).then((r) => r.data).catch(() => null),
        api.get(`/api/academy/groups/${groupId}/sessions`).then((r) => r.data).catch(() => null),
        api.get(`/api/academy/groups/${groupId}/waitlist`).then((r) => r.data).catch(() => null),
      ]);
      if (g) setGroup(g);
      if (Array.isArray(s)) setSessions(s);
      if (Array.isArray(w)) setWaitlist(w);
    } catch {
      // offline
    }
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!group) return <div className="shimmer-line h-48" />;
  const enrolled = (group.enrollments || []).filter((e: any) => e.status === 'active');
  const pct = Math.min(100, Math.round((enrolled.length / Math.max(1, group.capacity)) * 100));

  const createSession = async () => {
    if (!single.title.trim() || !single.date) {
      showToast('Missing fields', 'Title + date required.', 'error');
      return;
    }
    try {
      await api.post(`/api/academy/groups/${groupId}/sessions`, { title: single.title.trim(), sessionDate: single.date, startTime: single.startTime, endTime: single.endTime });
      setSingle({ ...single, title: '' });
      load();
    } catch (e) {
      showToast('Create failed', errMsg(e), 'error');
    }
  };

  const enroll = async () => {
    if (!enrollId) return;
    try {
      await api.post(`/api/academy/groups/${groupId}/enroll`, { studentId: enrollId });
      setEnrollId('');
      load();
    } catch (e) {
      showToast('Enroll failed', errMsg(e), 'error');
    }
  };

  const remind = async (sessionId: string) => {
    try {
      await api.post(`/api/courses/sessions/${sessionId}/send-reminder`, {});
      showToast(language === 'ar' ? 'تم الإرسال' : 'Reminder sent', '', 'success');
      load();
    } catch (e) {
      showToast('Send failed', errMsg(e), 'error');
    }
  };

  const promote = async () => {
    try {
      const { data: body } = await api.post(`/api/academy/groups/${groupId}/waitlist/promote`, {});
      if (body?.skipped) showToast('Still full', body.reason || '', 'warning');
      else showToast('Promoted', '', 'success');
      load();
    } catch (e) {
      showToast('Promote failed', errMsg(e), 'error');
    }
  };

  const archive = async () => {
    try {
      await api.delete(`/api/academy/groups/${groupId}`);
      onArchived();
    } catch (e) {
      showToast('Archive failed', errMsg(e), 'error');
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs text-slate-400 hover:text-white">← {language === 'ar' ? 'المجموعات' : 'Groups'}</button>
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-slate-500" dir="ltr">{group.code}</span>
          <h3 className="font-heading text-xl font-bold text-white">{group.title}</h3>
          {!group.active && <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/15 text-slate-400">archived</span>}
          <span className="ms-auto flex items-center gap-2 text-[11px] text-slate-400">
            <MapPin className="w-3.5 h-3.5" /> {group.branchCode} • {group.instructor?.name || 'unassigned'} • {group.category?.title}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden" role="img" aria-label={`${enrolled.length} of ${group.capacity} enrolled`}>
            <div className={`h-full rounded-full ${pct >= 100 ? 'bg-rose-400' : pct >= 75 ? 'bg-amber-300' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11px] font-mono text-slate-300">{enrolled.length}/{group.capacity}</span>
          {group.active && (
            <button onClick={archive} className="ms-2 text-[11px] text-slate-500 hover:text-rose-300 flex items-center gap-1">
              <Archive className="w-3.5 h-3.5" /> {language === 'ar' ? 'أرشفة' : 'Archive'}
            </button>
          )}
          {group.active && (
            cloneOpen ? (
              <span className="ms-2 flex items-center gap-1.5 p-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                <input type="date" value={cloneDate} onChange={(e) => setCloneDate(e.target.value)} dir="ltr" className="px-2 py-1.5 rounded-lg bg-[#111622] border border-white/10 text-[11px] text-white" aria-label="New term start" />
                <button
                  onClick={async () => {
                    setCloneBusy(true);
                    try {
                      const { data: body } = await api.post(`/api/academy/groups/${groupId}/clone`, { startDate: cloneDate });
                      showToast(language === 'ar' ? 'تم النسخ' : 'Duplicated', '', 'success');
                      onCloned(body);
                    } catch (e) {
                      showToast('Duplicate failed', errMsg(e), 'error');
                    } finally {
                      setCloneBusy(false);
                    }
                  }}
                  disabled={cloneBusy}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[11px] font-bold disabled:opacity-50"
                >
                  {cloneBusy ? '...' : (language === 'ar' ? 'نسخ للترم الجديد' : 'Duplicate term')}
                </button>
                <button onClick={() => setCloneOpen(false)} className="text-[11px] text-slate-400 px-1">✕</button>
              </span>
            ) : (
              <button onClick={() => setCloneOpen(true)} className="ms-2 text-[11px] text-slate-500 hover:text-emerald-300 flex items-center gap-1" title={language === 'ar' ? 'نسخ المجموعة وحصصها لترم جديد' : 'Duplicate group + sessions for a new term'}>
                <Copy className="w-3.5 h-3.5" /> {language === 'ar' ? 'تكرار' : 'Duplicate'}
              </button>
            )
          )}
        </div>
      </div>

      <div className="flex p-1 rounded-xl bg-white/[0.03] border border-white/10 w-fit">
        {(['sessions', 'enrollments', 'waitlist'] as const).map((t) => (
          <button key={t} onClick={() => setSubTab(t)} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${subTab === t ? 'nav-pill-active' : 'text-slate-400 hover:text-white'}`}>
            {t === 'sessions' ? `Sessions (${sessions.length})` : t === 'enrollments' ? `Enrolled (${enrolled.length})` : `Waitlist (${waitlist.length})`}
          </button>
        ))}
      </div>

      {subTab === 'sessions' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end p-3 rounded-2xl border border-white/10 bg-white/[0.02]">
            <input value={single.title} onChange={(e) => setSingle({ ...single, title: e.target.value })} placeholder="Session title" dir="auto" className="flex-1 min-w-[160px] px-3 py-2 rounded-xl bg-[#111622] border border-white/10 text-xs text-white" aria-label="Session title" />
            <input type="date" value={single.date} onChange={(e) => setSingle({ ...single, date: e.target.value })} dir="ltr" className="px-3 py-2 rounded-xl bg-[#111622] border border-white/10 text-xs text-white" aria-label="Date" />
            <input type="time" value={single.startTime} onChange={(e) => setSingle({ ...single, startTime: e.target.value })} dir="ltr" className="px-3 py-2 rounded-xl bg-[#111622] border border-white/10 text-xs text-white" aria-label="Start" />
            <input type="time" value={single.endTime} onChange={(e) => setSingle({ ...single, endTime: e.target.value })} dir="ltr" className="px-3 py-2 rounded-xl bg-[#111622] border border-white/10 text-xs text-white" aria-label="End" />
            <button onClick={createSession} className="gold-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add</button>
            <button
              onClick={() => setBulkOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 flex items-center gap-1.5 transition"
              title="Bulk Generate Sessions"
            >
              <Zap className="w-3.5 h-3.5" /> {language === 'ar' ? 'توليد حصص متعددة (Bulk)' : 'Bulk Generator'}
            </button>
          </div>

          {sessions.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No sessions yet — add one above or use the wizard bulk generator.</p>
          ) : sessions.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-white/10 bg-white/[0.02] text-xs">
              <span className="font-semibold text-white">{s.title}</span>
              <span className="font-mono text-slate-400" dir="ltr">{String(s.sessionDate).split('T')[0]} {s.startTime}–{s.endTime}</span>
              <span className="text-slate-500">{s.studioRoom}</span>
              {s.status !== 'scheduled' && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${s.status === 'cancelled' ? 'border-rose-500/40 bg-rose-500/10 text-rose-300 font-semibold' : 'border-white/15 text-slate-400'}`}>
                  {s.status === 'cancelled' ? (language === 'ar' ? 'ملغاة (تم التعويض)' : 'cancelled') : s.status}
                </span>
              )}
              <span className="ms-auto flex items-center gap-1.5">
                {s.status === 'scheduled' && (
                  <button
                    onClick={() => {
                      setCancellingSession(s);
                      setCancelReason(language === 'ar' ? 'تعديل جدول الأكاديمية' : 'Academy schedule adjustment');
                    }}
                    className="px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-500/5 text-rose-300 hover:bg-rose-500/15 flex items-center gap-1 text-[11px] font-medium transition"
                    title={language === 'ar' ? 'إلغاء الحصة وتعويض الطلاب' : 'Cancel session and compensate enrolled students'}
                  >
                    <Ban className="w-3 h-3" />
                    <span>{language === 'ar' ? 'إلغاء وتعويض' : 'Cancel & Compensate'}</span>
                  </button>
                )}
                {s.reminderSent
                  ? <span className="text-[10px] text-emerald-300 flex items-center gap-1"><Check className="w-3 h-3" /> reminded</span>
                  : s.status === 'scheduled' && (
                    <button onClick={() => remind(s.id)} className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white" title="Send WhatsApp reminder" aria-label={`Remind ${s.title}`}>
                      <Bell className="w-3.5 h-3.5" />
                    </button>
                  )}
              </span>
            </div>
          ))}

          {/* Bulk Sessions Generator Modal */}
          {bulkOpen && (
            <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setBulkOpen(false)}>
              <div className="bg-[#171d2b] border border-white/10 rounded-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()} dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-sky-400" />
                      <span>{language === 'ar' ? 'توليد حصص متعددة وحسابها آلياً' : 'Bulk Generate Sessions & Auto-Calculator'}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{group.title} ({group.code})</p>
                  </div>
                  <button onClick={() => setBulkOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>

                {/* Mode switcher */}
                <div className="flex p-1 rounded-xl bg-white/[0.04] border border-white/10 w-fit text-xs">
                  <button
                    type="button"
                    onClick={() => setBulkMode('range')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${bulkMode === 'range' ? 'bg-white text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    {language === 'ar' ? '📅 نطاق تاريخ (من إلى)' : '📅 Date Range (From → To)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkMode('count')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${bulkMode === 'count' ? 'bg-white text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    {language === 'ar' ? '🔢 عدد حصص محدد' : '🔢 Specific Count of Sessions'}
                  </button>
                </div>

                {bulkMode === 'count' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-[11px] text-slate-300">
                      {language === 'ar' ? 'عدد الحصص المطلوبة' : 'Target Sessions Count'}
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={bulkCount}
                        onChange={(e) => setBulkCount(Math.max(1, Number(e.target.value)))}
                        className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white"
                      />
                    </label>
                    <label className="text-[11px] text-slate-300">
                      {language === 'ar' ? 'تاريخ البدء' : 'Start Date (From)'}
                      <input
                        type="date"
                        value={bulkFrom}
                        onChange={(e) => setBulkFrom(e.target.value)}
                        dir="ltr"
                        className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-[11px] text-slate-300">
                      {language === 'ar' ? 'من تاريخ' : 'From Date'}
                      <input type="date" value={bulkFrom} onChange={(e) => setBulkFrom(e.target.value)} dir="ltr" className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white" />
                    </label>
                    <label className="text-[11px] text-slate-300">
                      {language === 'ar' ? 'إلى تاريخ' : 'To Date'}
                      <input type="date" value={bulkTo} onChange={(e) => setBulkTo(e.target.value)} dir="ltr" className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white" />
                    </label>
                  </div>
                )}

                {/* Auto-Calculation Live Badge */}
                <div className="p-3.5 rounded-2xl border border-sky-500/30 bg-sky-500/10 flex items-center justify-between text-xs">
                  <span className="text-sky-200 font-medium">
                    {language === 'ar' ? 'النتيجة المحسوبة آلياً:' : 'Auto-Calculated Output:'}
                  </span>
                  <span className="font-heading font-extrabold text-sm text-sky-300">
                    {bulkMode === 'count' ? `${bulkCount} ${language === 'ar' ? 'حصة حتى' : 'sessions until'} ${bulkTo}` : `${calculatedBulkSessions} ${language === 'ar' ? 'حصة في هذه الفترة' : 'sessions in this interval'}`}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-300 block mb-1.5">{language === 'ar' ? 'أيام الأسبوع' : 'Days of Week'}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { v: 0, en: 'Sun', ar: 'أحد' },
                      { v: 1, en: 'Mon', ar: 'إثنين' },
                      { v: 2, en: 'Tue', ar: 'ثلاثاء' },
                      { v: 3, en: 'Wed', ar: 'أربعاء' },
                      { v: 4, en: 'Thu', ar: 'خميس' },
                      { v: 6, en: 'Sat', ar: 'سبت' },
                    ].map((d) => (
                      <button
                        key={d.v}
                        type="button"
                        onClick={() => setBulkDays(bulkDays.includes(d.v) ? bulkDays.filter((x) => x !== d.v) : [...bulkDays, d.v])}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${bulkDays.includes(d.v) ? 'bg-white text-slate-950 border-white' : 'border-white/10 text-slate-400'}`}
                      >
                        {language === 'ar' ? d.ar : d.en}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <label className="text-[11px] text-slate-300">Start Time
                    <input type="time" value={bulkStart} onChange={(e) => setBulkStart(e.target.value)} dir="ltr" className="mt-1 w-full px-3 py-2 rounded-xl bg-[#111622] border border-white/10 text-xs text-white" />
                  </label>
                  <label className="text-[11px] text-slate-300">End Time
                    <input type="time" value={bulkEnd} onChange={(e) => setBulkEnd(e.target.value)} dir="ltr" className="mt-1 w-full px-3 py-2 rounded-xl bg-[#111622] border border-white/10 text-xs text-white" />
                  </label>
                  <label className="text-[11px] text-slate-300">Room
                    <input value={bulkRoom} onChange={(e) => setBulkRoom(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl bg-[#111622] border border-white/10 text-xs text-white" />
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button onClick={() => setBulkOpen(false)} className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleBulkGenerate}
                    disabled={bulkBusy}
                    className="gold-btn px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                  >
                    {bulkBusy ? '...' : (language === 'ar' ? 'توليد الحصص الآن' : 'Generate Sessions')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cancel & Compensate Modal */}
          {cancellingSession && (
            <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setCancellingSession(null)}>
              <div className="bg-[#171d2b] border border-rose-500/25 rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()} dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-rose-300 flex items-center gap-2">
                      <Ban className="w-5 h-5" />
                      <span>{language === 'ar' ? 'إلغاء الحصة وتعويض الطلاب' : 'Cancel Session & Compensate Students'}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{cancellingSession.title} • {String(cancellingSession.sessionDate).split('T')[0]}</p>
                  </div>
                  <button onClick={() => setCancellingSession(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-xs text-slate-300">
                  <p className="font-semibold text-rose-200">{language === 'ar' ? 'تنبيه التعويض الآلي:' : 'Automated Compensation Notice:'}</p>
                  <p className="mt-1">
                    {language === 'ar'
                      ? `سيتم تطبيق التعويض المختار على جميع الطلاب المسجلين في المجموعة (${enrolled.length} طالب)، مع إرسال رسائل اعتذار وتأكيد التعويض على واتساب أولياء الأمور.`
                      : `Compensation will apply to all active dancers in this group (${enrolled.length} enrolled), with automated WhatsApp notification to parents.`}
                  </p>
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">
                    {language === 'ar' ? 'سبب الإلغاء' : 'Cancellation Reason'}
                  </label>
                  <input
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white"
                    placeholder={language === 'ar' ? 'مثال: اعتذار المدرب / صيانة الاستوديو' : 'e.g. Instructor illness, Studio maintenance'}
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1.5">
                    {language === 'ar' ? 'نوع التعويض المستحق' : 'Compensation Policy'}
                  </label>
                  <div className="space-y-2">
                    <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition ${cancelCompType === 'credit_session' ? 'border-emerald-500/50 bg-emerald-500/10 text-white' : 'border-white/10 text-slate-400'}`}>
                      <input type="radio" name="compType" checked={cancelCompType === 'credit_session'} onChange={() => setCancelCompType('credit_session')} />
                      <span>🎟️ {language === 'ar' ? 'إضافة حصة مجانية / إرجاع حصة لرصيد الاشتراك النشط' : 'Credit +1 session back to student active subscription'}</span>
                    </label>
                    <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition ${cancelCompType === 'wallet_credit' ? 'border-amber-500/50 bg-amber-500/10 text-white' : 'border-white/10 text-slate-400'}`}>
                      <input type="radio" name="compType" checked={cancelCompType === 'wallet_credit'} onChange={() => setCancelCompType('wallet_credit')} />
                      <span>💰 {language === 'ar' ? 'إيداع رصيد مالي في محفظة الطالب' : 'Deposit credit to student wallet balance'}</span>
                    </label>
                    <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition ${cancelCompType === 'none' ? 'border-slate-500/50 bg-slate-500/10 text-white' : 'border-white/10 text-slate-400'}`}>
                      <input type="radio" name="compType" checked={cancelCompType === 'none'} onChange={() => setCancelCompType('none')} />
                      <span>❌ {language === 'ar' ? 'إلغاء فقط بدون تعويض فوري' : 'Cancel only without automatic compensation'}</span>
                    </label>
                  </div>
                </div>

                {cancelCompType === 'wallet_credit' && (
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">
                      {language === 'ar' ? 'قيمة التعويض المالي لكل طالب' : 'Wallet Credit Amount'}
                    </label>
                    <input
                      type="number"
                      value={cancelWalletAmount}
                      onChange={(e) => setCancelWalletAmount(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={cancelNotifyWa}
                    onChange={(e) => setCancelNotifyWa(e.target.checked)}
                    className="rounded border-white/20 bg-white/5"
                  />
                  <span>{language === 'ar' ? 'إرسال إشعار اعتذار وتعويض لولي الأمر على واتساب فوراً' : 'Dispatch automated WhatsApp apology & compensation receipt to parents'}</span>
                </label>

                <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                  <button onClick={() => setCancellingSession(null)} className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">
                    {language === 'ar' ? 'تراجع' : 'Close'}
                  </button>
                  <button
                    onClick={handleCancelSession}
                    disabled={cancelBusy}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 transition shadow-lg shadow-rose-900/30"
                  >
                    {cancelBusy ? '...' : (language === 'ar' ? 'تأكيد الإلغاء والتعويض' : 'Confirm Cancel & Compensate')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {subTab === 'enrollments' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <select value={enrollId} onChange={(e) => setEnrollId(e.target.value)} className="flex-1 px-3 py-2.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white" aria-label="Student">
              <option value="">Select dancer…</option>
              {students.filter((st) => !enrolled.some((e: any) => e.studentId === st.id)).map((st) => (
                <option key={st.id} value={st.id}>{st.name} ({st.barcode})</option>
              ))}
            </select>
            <button onClick={enroll} disabled={!enrollId} className="gold-btn px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50">Enroll</button>
          </div>
          {enrolled.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No dancers enrolled yet.</p>
          ) : enrolled.map((e: any) => (
            <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.02] text-xs">
              <span className="font-semibold text-white">{e.student?.name || e.studentId}</span>
              <span className="text-slate-500 font-mono text-[10px]">{e.student?.barcode}</span>
              <button
                onClick={async () => {
                  await api.delete(`/api/academy/groups/${groupId}/enroll/${e.studentId}`).catch(() => null);
                  load();
                }}
                className="ms-auto px-2.5 py-1 rounded-lg border border-rose-500/30 text-rose-300 text-[11px]"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {subTab === 'waitlist' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Oldest first · auto-promotes on unenroll</span>
            <button onClick={promote} disabled={waitlist.length === 0} className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold disabled:opacity-40">
              Promote next
            </button>
          </div>
          {waitlist.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">Waitlist empty.</p>
          ) : waitlist.map((w: any, i: number) => (
            <div key={w.id} className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/20 bg-white/[0.02] text-xs">
              <span className="font-mono text-amber-300 font-bold">#{i + 1}</span>
              <span className="font-semibold text-white">{w.student?.name || w.studentId}</span>
              <button
                onClick={async () => { await api.delete(`/api/academy/groups/waitlist/${w.id}`).catch(() => null); load(); }}
                className="ms-auto p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-rose-300" aria-label="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Instructor workload with clash flags (roster shifts + approved leave vs sessions). */
const WorkloadView: React.FC = () => {
  const { language } = useAdmin();
  const [rows, setRows] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const from = new Date().toISOString().split('T')[0];
        const to = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
        const [w, s, l] = await Promise.all([
          api.get('/api/academy/workload/instructors').then((r) => r.data).catch(() => null),
          api.get(`/api/roster/shifts?from=${from}&to=${to}`).then((r) => r.data).catch(() => null),
          api.get('/api/roster/leaves').then((r) => r.data).catch(() => null),
        ]);
        if (Array.isArray(w)) setRows(w);
        if (Array.isArray(s)) setShifts(s);
        if (Array.isArray(l)) setLeaves(l);
      } catch {
        // offline
      }
    })();
  }, []);

  const clashFor = (instructorId: string | null, sessions: any[]) => {
    if (!instructorId) return { shifts: 0, leave: false };
    const approvedLeave = leaves.filter((l) => l.staffId === instructorId && l.status === 'approved');
    let shiftClash = 0;
    let onLeave = false;
    for (const s of sessions) {
      const day = String(s.sessionDate).split('T')[0];
      for (const sh of shifts.filter((x) => x.staffId === instructorId && String(x.date).split('T')[0] === day && x.status === 'scheduled') as any[]) {
        if (sh.startTime < s.endTime && s.startTime < sh.endTime) shiftClash += 1;
      }
      if (approvedLeave.some((l) => day >= String(l.from).split('T')[0] && day <= String(l.to).split('T')[0])) onLeave = true;
    }
    return { shifts: shiftClash, leave: onLeave };
  };

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-xs text-slate-500">
          {language === 'ar' ? 'لا مجموعات نشطة بعد.' : 'No active groups yet — create your first group with the wizard.'}
        </div>
      )}
      {rows.map((r: any) => {
        const sessions = (r.groups || []).flatMap((g: any) => (g.sessions || []).map((s: any) => ({ ...s, group: g.title })));
        const clash = clashFor(r.instructor?.id || null, sessions);
        const overloaded = (r.groups || []).length > 4;
        return (
          <div key={r.instructor?.id || 'unassigned'} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-heading font-bold text-white">{r.instructor?.name || 'Unassigned'}</span>
              <span className="text-[11px] text-slate-400">{(r.groups || []).length} groups • {sessions.length} upcoming sessions</span>
              {overloaded && <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> overloaded</span>}
              {clash.shifts > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-300 font-bold flex items-center gap-1"><Clock className="w-3 h-3" /> {clash.shifts} shift clash{clash.shifts === 1 ? '' : 'es'}</span>}
              {clash.leave && <span className="text-[10px] px-2 py-0.5 rounded-full border border-violet-500/40 bg-violet-500/10 text-violet-300 font-bold">on approved leave</span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(r.groups || []).map((g: any) => (
                <span key={g.id} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300">
                  {g.title} <span className="font-mono text-slate-500">({g._count?.enrollments || 0}/{g.capacity})</span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Sessions browser: every session across groups with status filter + reminders. */
const SessionsBrowser: React.FC = () => {
  const { language, showToast } = useAdmin();
  const [sessions, setSessions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/courses/sessions?limit=200');
        if (Array.isArray(data)) setSessions(data);
      } catch {
        // offline
      }
    })();
  }, []);

  const remind = async (id: string) => {
    try {
      await api.post(`/api/courses/sessions/${id}/send-reminder`, {});
      showToast(language === 'ar' ? 'تم الإرسال' : 'Reminder sent', '', 'success');
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, reminderSent: true } : s)));
    } catch (e) {
      showToast('Send failed', errMsg(e), 'error');
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = sessions.filter((s) => {
    if (status !== 'all' && s.status !== status) return false;
    if (!q) return true;
    return (s.title || '').toLowerCase().includes(q) || (s.course?.title || '').toLowerCase().includes(q) || (s.course?.code || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <label className="relative flex-1">
          <Search className="w-4 h-4 absolute start-3 top-3 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={language === 'ar' ? 'بحث بعنوان الحصة أو المجموعة...' : 'Search session or group...'} className="w-full ps-9 pe-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm" aria-label="Search sessions" />
        </label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2.5 rounded-xl bg-[#121619] border border-white/10 text-xs" aria-label="Status">
          <option value="all">All statuses</option>
          <option value="scheduled">scheduled</option>
          <option value="completed">completed</option>
          <option value="cancelled">cancelled</option>
        </select>
        <span className="text-[11px] font-mono text-slate-500 px-1 self-center">{filtered.length}</span>
        <button
          onClick={() => exportCsv(`academy-sessions-${new Date().toISOString().split('T')[0]}`, ['title', 'sessionDate', 'startTime', 'endTime', 'studioRoom', 'status', 'course'], filtered.map((s) => ({
            title: s.title, sessionDate: String(s.sessionDate).split('T')[0], startTime: s.startTime, endTime: s.endTime,
            studioRoom: s.studioRoom, status: s.status, course: s.course?.code || s.course?.title || '',
          })))}
          className="px-3 py-2.5 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5"
          title={language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
        >
          <Download className="w-3.5 h-3.5" /><span>CSV</span>
        </button>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-xs text-slate-500">
          {language === 'ar' ? 'لا حصص مطابقة.' : 'No matching sessions.'}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          {filtered.slice(0, 100).map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-white/5 last:border-0 text-xs">
              <span className="font-mono text-[11px] text-slate-400" dir="ltr">{String(s.sessionDate).split('T')[0]} {s.startTime}–{s.endTime}</span>
              <span className="font-semibold text-white">{s.title}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300" dir="ltr">{s.course?.code || '—'}</span>
              <span className="text-slate-500">{s.course?.title}</span>
              <span className="text-slate-500">{s.studioRoom}</span>
              {s.status !== 'scheduled' && <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/15 text-slate-400">{s.status}</span>}
              <span className="ms-auto">
                {s.reminderSent
                  ? <span className="text-[10px] text-emerald-300 flex items-center gap-1"><Check className="w-3 h-3" /> reminded</span>
                  : <button onClick={() => remind(s.id)} className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white" title="Send WhatsApp reminder" aria-label={`Remind ${s.title}`}><Bell className="w-3.5 h-3.5" /></button>}
              </span>
            </div>
          ))}
          {filtered.length > 100 && <p className="px-4 py-2 text-[11px] text-slate-500">Showing 100 of {filtered.length} — refine search.</p>}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';
import { formatCurrency } from '../utils/currency';
import { exportCsv } from '../utils/csv';
import { ViewSwitcher, useViewPrefs } from './ViewSwitcher';
import { StudentProfilePage } from './StudentProfilePage';
import { PromoManager } from './PromoManager';
import { api } from '../utils/api';
import {
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  RefreshCw,
  Send,
  Calendar,
  Layers,
  Award,
  DollarSign,
  X,
  Users,
  Trash2,
  Download,
  Search,
  LayoutGrid,
  Rows3,
} from 'lucide-react';

interface TuitionPackage {
  id: string;
  name: string;
  nameAr: string;
  program: 'classical' | 'contemporary' | 'youth';
  sessions: number;
  durationDays: number;
  price: number;
  description: string;
}

const INITIAL_PACKAGES: TuitionPackage[] = [
  {
    id: 'PKG-01',
    name: 'Classical Ballet (16 Classes)',
    nameAr: 'كونسرفتوار الباليه الكلاسيكي النخبة',
    program: 'classical',
    sessions: 16,
    durationDays: 30,
    price: 4800,
    description: '16 classical ballet classes per month (300 EGP per class).',
  },
  {
    id: 'PKG-02',
    name: 'Youth Ballet (8 Classes)',
    nameAr: 'أكاديمية تأسيس الناشئين',
    program: 'youth',
    sessions: 8,
    durationDays: 30,
    price: 2600,
    description: '8 beginner youth ballet classes per month.',
  },
  {
    id: 'PKG-03',
    name: 'Contemporary Dance (20 Classes)',
    nameAr: 'الرقص المعاصر المكثف للمحترفين',
    program: 'contemporary',
    sessions: 20,
    durationDays: 30,
    price: 5200,
    description: '20 contemporary dance classes per month.',
  },
  {
    id: 'PKG-04',
    name: 'Private Coaching (5 Classes)',
    nameAr: 'باقة التدريب الفردي الخاص',
    program: 'classical',
    sessions: 5,
    durationDays: 45,
    price: 3750,
    description: '5 one-on-one private lessons with a premier ballet master.',
  },
];

export const SubscriptionManager: React.FC = () => {
  const {
    students,
    language,
    updateSubscriptionQuota,
    triggerOpenWaAlert,
    deleteTuitionPackage,
    showToast,
    showConfirmNotification,
    logCrmAction,
  } = useAdmin();

  const [packages, setPackages] = useState<TuitionPackage[]>(INITIAL_PACKAGES);
  const [filterProgram, setFilterProgram] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [quotaSearch, setQuotaSearch] = useState('');
  const [pkgSearch, setPkgSearch] = useState('');
  const quotaView = useViewPrefs('subscriptions-roster', 'cards');
  const pkgView = useViewPrefs('subscriptions-packages', 'cards');
  // Person profile overlay
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);

  const handleDeletePackage = (pkgId: string, pkgName: string) => {
    showConfirmNotification({
      title: language === 'ar' ? 'حذف باقة الاشتراك' : 'Delete Package',
      message: language === 'ar'
        ? `هل أنت متأكد من حذف باقة "${pkgName}"؟`
        : `Are you sure you want to delete package "${pkgName}"?`,
      confirmLabel: language === 'ar' ? 'نعم، احذف' : 'Delete Package',
      cancelLabel: language === 'ar' ? 'إلغاء' : 'Cancel',
      type: 'error',
      onConfirm: () => {
        deleteTuitionPackage(pkgId);
        setPackages(prev => prev.filter(p => p.id !== pkgId));
      },
    });
  };

  // Load packages dynamically from backend
  useEffect(() => {
    api.get('/api/subscriptions/plans')
      .then((r) => r.data)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPackages(
            data.map((d: any) => ({
              id: d.id,
              name: d.name,
              nameAr: d.nameAr || d.name,
              program: d.program,
              sessions: d.maxSessions || d.sessions,
              durationDays: d.durationDays || 30,
              price: d.price,
              description: d.description || `${d.maxSessions || 12} classes over ${d.durationDays || 30} days.`,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Add Package Modal
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanNameAr, setNewPlanNameAr] = useState('');
  const [newPlanProgram, setNewPlanProgram] = useState<'classical' | 'contemporary' | 'youth'>('classical');
  const [newPlanSessions, setNewPlanSessions] = useState<number>(12);
  const [newPlanDuration, setNewPlanDuration] = useState<number>(30);
  const [newPlanPrice, setNewPlanPrice] = useState<number>(390);

  // Handle Plan Submit
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim() || newPlanName.trim().length < 3) { showToast('Cannot save', 'Plan name is required (min 3 chars).', 'error'); return; }
    const sessionsNum = Number(newPlanSessions);
    const durationNum = Number(newPlanDuration);
    const priceNum = Number(newPlanPrice);
    if (!Number.isInteger(sessionsNum) || sessionsNum < 1 || sessionsNum > 100) { showToast('Cannot save', 'Sessions must be 1–100.', 'error'); return; }
    if (!Number.isInteger(durationNum) || durationNum < 1 || durationNum > 365) { showToast('Cannot save', 'Duration must be 1–365 days.', 'error'); return; }
    if (!Number.isFinite(priceNum) || priceNum <= 0 || priceNum > 1000000) { showToast('Cannot save', 'Price must be greater than 0.', 'error'); return; }

    const payload = {
      name: newPlanName.trim(),
      nameAr: newPlanNameAr.trim() || newPlanName.trim(),
      program: newPlanProgram,
      maxSessions: sessionsNum,
      durationDays: durationNum,
      price: priceNum,
      description: `${sessionsNum} classes over ${durationNum} days.`,
    };

    try {
      // Central transport attaches the live staff token (the legacy
      // `etoile_admin_token` key was never written by login — fixed here).
      const { data: created } = await api.post('/api/subscriptions/plans', payload);

      setPackages((prev) => [
        ...prev,
        {
          id: created.id,
          name: created.name,
          nameAr: created.nameAr || created.name,
          program: created.program,
          sessions: created.maxSessions,
          durationDays: created.durationDays,
          price: created.price,
          description: created.description,
        },
      ]);
      setIsNewPlanModalOpen(false);
      showToast('Plan Created', `New tuition package "${created.name}" saved to database.`, 'success');
      logCrmAction('Subscription Plan Created', `Added package ${created.name} (${created.price} EGP)`, 'financial');
      setNewPlanName('');
      setNewPlanNameAr('');
      return;
    } catch (err) {
      console.error('Failed to create plan on backend:', err);
    }

    const newPkg: TuitionPackage = {
      id: `PKG-${Date.now().toString(36).toUpperCase()}`,
      name: payload.name,
      nameAr: payload.nameAr,
      program: payload.program,
      sessions: payload.maxSessions,
      durationDays: payload.durationDays,
      price: payload.price,
      description: payload.description,
    };

    setPackages((prev) => [...prev, newPkg]);
    setIsNewPlanModalOpen(false);
    showToast('Plan Created', `New tuition package "${newPkg.name}" added to catalog.`, 'success');
    logCrmAction('Subscription Plan Created', `Added package ${newPkg.name} (${newPkg.price} EGP)`, 'financial');

    setNewPlanName('');
    setNewPlanNameAr('');
  };

  // Renew Student Subscription
  const handleRenewStudent = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const now = new Date();
    const startDate = now.toISOString().split('T')[0];
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    updateSubscriptionQuota(studentId, -student.subscription.usedSessions); // reset used sessions to 0
    showToast('Subscription Renewed', `${student.name}'s ${student.subscription.planName} renewed through ${endDate}.`, 'success');
    logCrmAction('Subscription Renewed', `Renewed cycle for ${student.name} through ${endDate}`, 'financial');

    triggerOpenWaAlert(
      'quota_warning',
      student.parentPhone,
      student.parentName,
      `Hello ${student.parentName}, ${student.name}'s ballet subscription has been renewed. Valid through ${endDate}.`
    );
  };

  // Add Bonus Session
  const handleAddBonusSession = (studentId: string) => {
    updateSubscriptionQuota(studentId, -1);
    const student = students.find((s) => s.id === studentId);
    showToast('Bonus Class Added', `Credited +1 session for ${student?.name || 'student'}.`, 'gold');
    logCrmAction('Quota Bonus Credited', `Credited +1 session for ${student?.name}`, 'student');
  };

  // Filtered Students
  const filteredStudents = useMemo(() => students.filter((s) => {
    const matchesProgram = filterProgram === 'all' || s.program === filterProgram;
    const needle = quotaSearch.trim().toLowerCase();
    if (needle && !`${s.name} ${s.parentName} ${s.parentPhone} ${s.barcode || ''}`.toLowerCase().includes(needle)) return false;
    const isExpiredDate = new Date() > new Date(s.subscription.endDate);
    const isDepleted = s.subscription.usedSessions >= s.subscription.maxSessions;

    if (filterStatus === 'active') return matchesProgram && !isExpiredDate && !isDepleted;
    if (filterStatus === 'low_quota') return matchesProgram && (s.subscription.maxSessions - s.subscription.usedSessions) <= 2;
    if (filterStatus === 'expired') return matchesProgram && (isExpiredDate || isDepleted);

    return matchesProgram;
  }), [students, filterProgram, filterStatus, quotaSearch]);

  const filteredPackages = useMemo(() => {
    const needle = pkgSearch.trim().toLowerCase();
    if (!needle) return packages;
    return packages.filter((p) => `${p.name} ${p.nameAr} ${p.id} ${p.program}`.toLowerCase().includes(needle));
  }, [packages, pkgSearch]);

  const handleExportQuotas = () => {
    exportCsv(`subscriptions-${new Date().toISOString().split('T')[0]}`, ['id', 'name', 'program', 'parentName', 'parentPhone', 'usedSessions', 'maxSessions', 'remaining', 'endDate'], filteredStudents.map((s) => ({
      id: s.id, name: s.name, program: s.program, parentName: s.parentName, parentPhone: s.parentPhone,
      usedSessions: s.subscription.usedSessions, maxSessions: s.subscription.maxSessions,
      remaining: s.subscription.maxSessions - s.subscription.usedSessions, endDate: s.subscription.endDate,
    })), { module: 'subscriptions' });
    logCrmAction('Subscription Export', `Exported ${filteredStudents.length} subscription rows to CSV`, 'financial');
    showToast(language === 'ar' ? 'تم تصدير الاشتراكات' : 'Subscriptions exported', `${filteredStudents.length} rows → CSV`, 'success');
  };

  const handleExportPackages = () => {
    exportCsv(`packages-${new Date().toISOString().split('T')[0]}`, ['id', 'name', 'program', 'sessions', 'durationDays', 'price'], filteredPackages.map((p) => ({
      id: p.id, name: p.name, program: p.program, sessions: p.sessions, durationDays: p.durationDays, price: p.price,
    })), { module: 'packages' });
    logCrmAction('Package Catalog Export', `Exported ${filteredPackages.length} packages to CSV`, 'financial');
  };

  const expiringDancers = students.filter((s) => {
    const remaining = s.subscription.maxSessions - s.subscription.usedSessions;
    const isExpiredDate = new Date() > new Date(s.subscription.endDate);
    return remaining <= 2 || isExpiredDate;
  });

  if (viewingStudentId) {
    return (
      <StudentProfilePage
        studentId={viewingStudentId}
        onBack={() => setViewingStudentId(null)}
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Banner: Overview */}
      <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold uppercase tracking-wider">
            <Calculator className="w-4 h-4" />
            <span>{language === 'ar' ? 'إدارة دورة حياة الاشتراكات الهجينة ثنائية القيود' : 'Subscriptions & Packages'}</span>
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-white">
            {language === 'ar' ? 'اشتراكات الكونسرفتوار ورصيد الحصص الفعّال' : 'Student Subscriptions & Class Balances'}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {language === 'ar'
              ? 'تعتمد اشتراكات إتوال على قيدين معاً: حصص تدريبية مستهلكة وتاريخ انتهاء صلاحية زمني مع احتساب يومي للاستحقاق المحاسبي.'
              : 'Each subscription includes a number of classes and an expiration date. Classes are tracked automatically when students scan their barcodes.'}
          </p>
        </div>

        <button
          onClick={() => setIsNewPlanModalOpen(true)}
          className="w-full sm:w-auto action-btn-coral px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition flex-shrink-0 min-h-[42px] cursor-pointer shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'إنشاء باقة تدريبية' : 'Add New Package'}</span>
        </button>
      </div>

      {/* Tuition Plans Catalog Grid */}
      <PromoManager />
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'باقات التدريب الأكاديمي النشطة' : 'Available Packages'}</span>
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono">
              {language === 'ar' ? `${filteredPackages.length}/${packages.length} باقات` : `${filteredPackages.length}/${packages.length} packages`}
            </span>
            <ViewSwitcher moduleKey="subscriptions-packages" modes={['cards', 'rows']} value={{ mode: pkgView.mode, density: pkgView.density }} onChange={(p) => { pkgView.setMode(p.mode); pkgView.setDensity(p.density); }} />
            <button onClick={handleExportPackages} className="px-2.5 py-2 rounded-xl text-[11px] font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5" title="Export CSV">
              <Download className="w-3.5 h-3.5" /><span>CSV</span>
            </button>
          </div>
        </div>
        <label className="relative block">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            value={pkgSearch}
            onChange={(e) => setPkgSearch(e.target.value)}
            placeholder={language === 'ar' ? 'ابحث عن باقة...' : 'Search packages...'}
            className="w-full ps-9 pe-9 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-400/40"
            aria-label={language === 'ar' ? 'بحث الباقات' : 'Search packages'}
          />
          {pkgSearch && (
            <button onClick={() => setPkgSearch('')} className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1" aria-label="Clear search">✕</button>
          )}
        </label>

        <div className={pkgView.mode === 'rows' ? 'divide-y divide-white/[0.06] rounded-2xl border border-white/10 overflow-hidden bg-[#171d2b]' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'}>
          {filteredPackages.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 col-span-full">
              {language === 'ar' ? 'لا باقات مطابقة للبحث.' : 'No packages match your search.'}
            </div>
          ) : pkgView.mode === 'rows' ? (
            filteredPackages.map((pkg) => (
              <div key={pkg.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition">
                <span className="text-[10px] font-mono text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded font-bold flex-shrink-0">{pkg.id}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-white truncate">{language === 'ar' ? pkg.nameAr : pkg.name}</span>
                  <span className="block text-[11px] text-slate-500">{pkg.program} • {pkg.sessions} sessions • {pkg.durationDays}d</span>
                </span>
                <strong className="text-sm text-white font-mono flex-shrink-0">{formatCurrency(pkg.price, language)}</strong>
                <button onClick={() => handleDeletePackage(pkg.id, pkg.name)} className="p-2 rounded-lg text-slate-500 hover:text-rose-300 transition flex-shrink-0" title="Delete" aria-label="Delete package">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          ) : (
          packages.filter((p) => filteredPackages.includes(p)).map((pkg) => (
            <div
              key={pkg.id}
              className="bg-[#171d2b] border border-white/10 hover:border-rose-500/40 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded font-bold">
                    {pkg.id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase text-slate-400 font-mono">
                      {pkg.durationDays} Days Cycle
                    </span>
                    <button
                      onClick={() => handleDeletePackage(pkg.id, language === 'ar' ? pkg.nameAr || pkg.name : pkg.name)}
                      className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                      title={language === 'ar' ? 'حذف الباقة' : 'Delete Package'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="font-heading text-base font-semibold text-white">
                  {language === 'ar' ? pkg.nameAr || pkg.name : pkg.name}
                </h4>

                <p className="text-[11px] text-slate-400">
                  {pkg.description}
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">{language === 'ar' ? 'إجمالي الباقة' : 'Total Package'}</span>
                  <strong className="text-base font-heading font-bold text-white">{formatCurrency(pkg.price, language)}</strong>
                </div>

                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#111622] border border-rose-500/30 text-rose-400 font-mono">
                  {pkg.sessions} {language === 'ar' ? 'حصص' : 'Sessions'}
                </span>
              </div>
            </div>
          )))}
        </div>
      </div>

      {/* Expiring / Low-Quota Notification Alert Section */}
      {expiringDancers.length > 0 && (
        <div className="bg-[#171d2b] border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <h3 className="font-heading text-sm sm:text-base font-semibold">
                Needs Renewal Soon ({expiringDancers.length} Students with 2 or Fewer Classes Left)
              </h3>
            </div>
            <span className="text-[10px] text-slate-400">WhatsApp reminder ready</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {expiringDancers.map((stu) => {
              const remaining = stu.subscription.maxSessions - stu.subscription.usedSessions;

              return (
                <div
                  key={stu.id}
                  className="bg-[#1c2333] border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="min-w-0">
                    <span className="font-heading text-sm font-semibold text-white truncate block">
                      {stu.name}
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono font-semibold">
                      {remaining <= 0 ? 'No classes left' : `${remaining} class(es) left`}
                    </span>
                  </div>

                  <button
                    onClick={() => handleRenewStudent(stu.id)}
                    className="px-3 py-1.5 rounded-lg action-btn-coral text-[11px] font-semibold transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-sm active:scale-[0.98]"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Renew</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Enrolled Students Subscriptions Roster */}
      <div className="bg-[#171d2b] border border-white/10 rounded-2xl overflow-hidden shadow-xl space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-heading text-lg font-semibold text-white">
                {language === 'ar' ? 'سجل اشتراكات الطلاب وأرصدة الحصص النشطة' : 'Student Subscriptions & Balances'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'ar'
                  ? 'متابعة استهلاك الحصص بالوقت الفعلي، تواريخ الصلاحية، وتنبيهات التجديد.'
                  : 'Track classes used, expiration dates, and renewals.'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] text-slate-400 font-mono">{filteredStudents.length}/{students.length}</span>
              <ViewSwitcher moduleKey="subscriptions-roster" modes={['cards', 'rows']} value={{ mode: quotaView.mode, density: quotaView.density }} onChange={(p) => { quotaView.setMode(p.mode); quotaView.setDensity(p.density); }} />
              <button onClick={handleExportQuotas} className="px-3 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5" title="Export CSV">
                <Download className="w-3.5 h-3.5" /><span>CSV</span>
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="relative flex-1">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                value={quotaSearch}
                onChange={(e) => setQuotaSearch(e.target.value)}
                placeholder={language === 'ar' ? 'ابحث بالاسم أو الهاتف أو الباركود...' : 'Search name, parent, phone, barcode...'}
                className="w-full ps-9 pe-9 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-400/40"
                aria-label={language === 'ar' ? 'بحث الاشتراكات' : 'Search subscriptions'}
              />
              {quotaSearch && (
                <button onClick={() => setQuotaSearch('')} className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1" aria-label="Clear search">✕</button>
              )}
            </label>
            <div className="grid grid-cols-2 sm:flex items-center gap-2">
              <select
                value={filterProgram}
                onChange={(e) => setFilterProgram(e.target.value)}
                className="px-3 py-2 sm:py-1.5 rounded-xl text-xs bg-[#111622] border border-white/10 text-white focus:outline-none focus:border-rose-500/50 cursor-pointer min-h-[40px] sm:min-h-0 shadow-inner"
                aria-label="Program"
              >
                <option value="all">{language === 'ar' ? 'جميع الأقسام' : 'All Programs'}</option>
                <option value="classical">{language === 'ar' ? 'كلاسيكي' : 'Classical'}</option>
                <option value="contemporary">{language === 'ar' ? 'معاصر' : 'Contemporary'}</option>
                <option value="youth">{language === 'ar' ? 'ناشئين' : 'Youth'}</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 sm:py-1.5 rounded-xl text-xs bg-[#111622] border border-white/10 text-white focus:outline-none focus:border-rose-500/50 cursor-pointer min-h-[40px] sm:min-h-0 shadow-inner"
                aria-label="Status"
              >
                <option value="all">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
                <option value="active">{language === 'ar' ? 'رصيد نشط وصالح' : 'Active Plans'}</option>
                <option value="low_quota">{language === 'ar' ? 'رصيد منخفض (حصتان فأقل)' : 'Low Classes (≤ 2)'}</option>
                <option value="expired">{language === 'ar' ? 'منتهٍ (تاريخ أو حصص)' : 'Expired / No Classes'}</option>
              </select>
            </div>
          </div>
          {(quotaSearch || filterProgram !== 'all' || filterStatus !== 'all') && (
            <button onClick={() => { setQuotaSearch(''); setFilterProgram('all'); setFilterStatus('all'); }} className="text-xs text-slate-400 hover:text-rose-300 underline self-start px-1">
              {language === 'ar' ? 'إعادة تعيين' : 'Reset filters'}
            </button>
          )}
        </div>

        {/* MOBILE CARDS VIEW (md:hidden) */}
        <div className="block md:hidden space-y-3">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 bg-[#1c2333] rounded-xl border border-white/5">
              No students match current filter criteria.
            </div>
          ) : (
            filteredStudents.map((stu) => {
              const sub = stu.subscription;
              const remaining = sub.maxSessions - sub.usedSessions;
              const isDateExpired = new Date() > new Date(sub.endDate);
              const isQuotaDepleted = sub.usedSessions >= sub.maxSessions;

              return (
                <div
                  key={stu.id}
                  className="bg-[#1c2333] border border-white/5 rounded-xl p-3.5 space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <button
                      onClick={() => setViewingStudentId(stu.id)}
                      title={language === 'ar' ? 'فتح صفحة الطالب' : 'Open student page'}
                      className="flex items-center gap-2.5 min-w-0 text-start rounded-lg p-1 -m-1 hover:bg-white/[0.04] transition cursor-pointer group/subcard"
                    >
                      <img
                        src={stu.photoUrl}
                        alt={stu.name}
                        className="w-10 h-10 rounded-full object-cover border border-rose-500/30 flex-shrink-0 group-hover/subcard:border-rose-300 transition"
                      />
                      <div className="min-w-0">
                        <span className="font-heading font-semibold text-sm text-white truncate block group-hover/subcard:text-rose-200 transition">
                          {stu.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {stu.barcode} &bull; {stu.program}
                        </span>
                      </div>
                    </button>

                    {isDateExpired ? (
                      <span className="status-pill-pink text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 font-semibold">
                        Expired Date
                      </span>
                    ) : isQuotaDepleted ? (
                      <span className="status-pill-amber text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 font-semibold">
                        No Classes Left
                      </span>
                    ) : (
                      <span className="status-pill-emerald text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 font-semibold">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="bg-[#141a27] p-2.5 rounded-lg border border-white/5 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-white truncate pr-2">
                        {sub.planName}
                      </span>
                      <span className="font-mono text-rose-400 font-bold flex-shrink-0">
                        {formatCurrency(sub.price, language)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">{sub.usedSessions} / {sub.maxSessions} used</span>
                        <strong className={remaining <= 2 ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                          {remaining} remaining
                        </strong>
                      </div>
                      <div className="w-full bg-[#111622] rounded-full h-2 overflow-hidden border border-white/5">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            remaining <= 2 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{
                            width: `${Math.min(100, (sub.usedSessions / sub.maxSessions) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
                      <span>Validity Cycle:</span>
                      <span className="text-slate-300">{sub.startDate} &rarr; {sub.endDate}</span>
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <button
                      onClick={() => handleAddBonusSession(stu.id)}
                      className="min-h-[38px] rounded-lg border border-white/10 hover:border-rose-500 text-xs text-slate-300 hover:text-white bg-[#141a27] transition flex items-center justify-center gap-1 active:scale-[0.98] cursor-pointer"
                      title="Credit +1 Make-up Class"
                    >
                      <Plus className="w-3.5 h-3.5 text-rose-400" />
                      <span>+1 Class</span>
                    </button>
                    <button
                      onClick={() => handleRenewStudent(stu.id)}
                      className="min-h-[38px] rounded-lg action-btn-coral text-xs font-semibold transition flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Renew</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP TABLE / ROWS VIEW (hidden md:block) */}
        {quotaView.mode === 'rows' ? (
          <div className="hidden md:block rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5">
            {filteredStudents.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No students match current filter criteria.</div>
            ) : (
              filteredStudents.map((stu) => {
                const sub = stu.subscription;
                const remaining = sub.maxSessions - sub.usedSessions;
                return (
                  <div key={stu.id} className="flex items-center gap-4 px-4 py-2.5 hover:bg-white/[0.03] transition">
                    <img src={stu.photoUrl} alt={stu.name} className="w-9 h-9 rounded-full object-cover border border-rose-500/30 flex-shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold text-white text-sm truncate">{stu.name}</span>
                      <span className="block text-[11px] text-slate-500 font-mono truncate">{stu.barcode} • {sub.planName}</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-300 flex-shrink-0">{sub.usedSessions}/{sub.maxSessions}</span>
                    <strong className={`text-[11px] font-mono flex-shrink-0 ${remaining <= 2 ? 'text-amber-400' : 'text-emerald-400'}`}>{remaining} left</strong>
                    <button onClick={() => handleRenewStudent(stu.id)} className="px-3 py-1.5 rounded-lg action-btn-coral text-[11px] font-semibold flex-shrink-0">Renew</button>
                  </div>
                );
              })
            )}
          </div>
        ) : (
        <div className="hidden md:block overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-start text-xs">
            <thead className="bg-[#131823] text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'الطالب' : 'Student'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'الباقة المقيدة' : 'Package'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'استهلاك الرصيد' : 'Classes Used'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'مدة الدورة' : 'Dates'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="py-3.5 px-4 text-end">{language === 'ar' ? 'إجراءات السجل' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredStudents.map((stu) => {
                const sub = stu.subscription;
                const remaining = sub.maxSessions - sub.usedSessions;
                const isDateExpired = new Date() > new Date(sub.endDate);
                const isQuotaDepleted = sub.usedSessions >= sub.maxSessions;

                return (
                  <tr key={stu.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setViewingStudentId(stu.id)}
                        title={language === 'ar' ? 'فتح صفحة الطالب' : 'Open student page'}
                        className="flex items-center gap-2.5 text-start rounded-lg p-1 -m-1 hover:bg-white/[0.04] transition cursor-pointer group/subrow"
                      >
                        <img
                          src={stu.photoUrl}
                          alt={stu.name}
                          className="w-9 h-9 rounded-full object-cover border border-rose-500/30 group-hover/subrow:border-rose-300 transition"
                        />
                        <div>
                          <span className="font-heading font-semibold text-white block group-hover/subrow:text-rose-200 transition">
                            {stu.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{stu.barcode}</span>
                        </div>
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-white block">{sub.planName}</span>
                      <span className="text-[10px] text-rose-400 font-mono">{formatCurrency(sub.price, language)}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">{sub.usedSessions} used</span>
                          <strong className={remaining <= 2 ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                            {remaining} remaining
                          </strong>
                        </div>
                        <div className="w-28 bg-[#111622] rounded-full h-1.5 overflow-hidden border border-white/5">
                          <div
                            className={`h-full rounded-full ${
                              remaining <= 2 ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            style={{
                              width: `${Math.min(100, (sub.usedSessions / sub.maxSessions) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-[11px] font-mono text-slate-300 block">
                        {sub.startDate} &rarr; {sub.endDate}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {isDateExpired ? (
                        <span className="status-pill-pink text-[10px] px-2.5 py-0.5 rounded-full font-semibold">
                          Expired Date
                        </span>
                      ) : isQuotaDepleted ? (
                        <span className="status-pill-amber text-[10px] px-2.5 py-0.5 rounded-full font-semibold">
                          No Classes Left
                        </span>
                      ) : (
                        <span className="status-pill-emerald text-[10px] px-2.5 py-0.5 rounded-full font-semibold">
                          Active
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-end">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAddBonusSession(stu.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-rose-500 text-[11px] text-slate-300 hover:text-white bg-[#1c2333] hover:bg-[#232c40] transition cursor-pointer"
                          title="Credit +1 Make-up Class"
                        >
                          +1 Class
                        </button>
                        <button
                          onClick={() => handleRenewStudent(stu.id)}
                          className="px-3 py-1.5 rounded-lg action-btn-coral text-[11px] font-semibold transition cursor-pointer shadow-sm"
                          title="Renew cycle with fresh quota"
                        >
                          Renew
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* CREATE TUITION PLAN MODAL */}
      {isNewPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="font-heading text-lg sm:text-xl font-semibold text-[var(--text-primary)]">
                Create New Package
              </h3>
              <button
                onClick={() => setIsNewPlanModalOpen(false)}
                className="p-2 rounded-lg bg-[var(--bg-card)] text-[var(--text-secondary)] min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Package Name (English)</label>
                <input
                  type="text"
                  required
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="e.g. Masterclass Soloist Package"
                  className="w-full form-gold-input px-3 py-2.5 rounded-xl text-xs min-h-[42px]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Arabic Title</label>
                <input
                  type="text"
                  value={newPlanNameAr}
                  onChange={(e) => setNewPlanNameAr(e.target.value)}
                  placeholder="e.g. باقة الماستركلاس المنفرد"
                  className="w-full form-gold-input px-3 py-2.5 rounded-xl text-xs min-h-[42px]"
                />
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Program</label>
                  <select
                    value={newPlanProgram}
                    onChange={(e) => setNewPlanProgram(e.target.value as any)}
                    className="w-full form-gold-input px-3 py-2.5 rounded-xl text-xs bg-[var(--bg-surface)] min-h-[42px] cursor-pointer"
                  >
                    <option value="classical">Classical</option>
                    <option value="contemporary">Contemporary</option>
                    <option value="youth">Youth</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Number of Classes</label>
                  <input
                    type="number"
                    value={newPlanSessions}
                    onChange={(e) => setNewPlanSessions(Number(e.target.value))}
                    className="w-full form-gold-input px-3 py-2.5 rounded-xl text-xs min-h-[42px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Duration (Days)</label>
                  <input
                    type="number"
                    value={newPlanDuration}
                    onChange={(e) => setNewPlanDuration(Number(e.target.value))}
                    className="w-full form-gold-input px-3 py-2.5 rounded-xl text-xs min-h-[42px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">{language === 'ar' ? 'السعر (ج.م)' : 'Price (EGP)'}</label>
                  <input
                    type="number"
                    value={newPlanPrice}
                    onChange={(e) => setNewPlanPrice(Number(e.target.value))}
                    className="w-full form-gold-input px-3 py-2.5 rounded-xl text-xs min-h-[42px]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-2.5 sm:flex sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsNewPlanModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-card)] text-xs text-[var(--text-secondary)] min-h-[42px] flex items-center justify-center active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gold-btn px-5 py-2.5 rounded-xl text-xs font-semibold min-h-[42px] flex items-center justify-center active:scale-[0.98]"
                >
                  Save Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

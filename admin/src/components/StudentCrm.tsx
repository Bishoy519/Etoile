import React, { useState, useRef } from 'react';
import { useAdmin } from '../context/AdminContext';
import { Student, AdmissionLead } from '../types';
import { formatCurrency } from '../utils/currency';
import {
  requireText,
  validateAge,
  validateEmailOptional,
  validatePhoneRequired,
  validatePositiveNumber,
} from '../utils/validation';
import { StudentProfilePage } from './StudentProfilePage';
import { StaffProfilePage } from './StaffProfilePage';
import { ModuleSubSidebar } from './ModuleSubSidebar';
import { ViewSwitcher, useViewPrefs } from './ViewSwitcher';
import { ImageUploader } from './ImageUploader';
import { BarcodeSVG } from './BarcodeRenderer';
import { exportCsv } from '../utils/csv';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import {
  Users,
  Search,
  TrendingDown,
  Send,
  Plus,
  Filter,
  Sparkles,
  Phone,
  Mail,
  Award,
  BookOpen,
  DollarSign,
  FileText,
  Clock,
  Shield,
  CheckCircle2,
  Calendar,
  X,
  ArrowRight,
  UserCheck,
  ChevronRight,
  MessageSquare,
  AlertCircle,
  Building2,
  Trash2,
  Edit2,
  Download,
  Scan,
  RefreshCw,
  CreditCard,
} from 'lucide-react';

type CrmSubTab = 'dancers' | 'leads' | 'staff' | 'evaluations' | 'audit';

export const StudentCrm: React.FC = () => {
  const {
    students,
    leads,
    studentNotes,
    staffList,
    evaluations,
    auditLogs,
    currentUser,
    language,
    settleStudentDebt,
    updateSubscriptionQuota,
    triggerOpenWaAlert,
    showToast,
    showConfirmNotification,
    addLead,
    updateLeadStage,
    deleteLead,
    convertLeadToStudent,
    registerStudent,
    checkInStudent,
    updateStudent,
    deleteStudent,
    addStudentNote,
    updateStaffRole,
    toggleStaffShift,
    addEvaluation,
    deleteEvaluation,
    logCrmAction,
  } = useAdmin();

  // Active CRM Tab
  const [activeTab, setActiveTab] = useState<CrmSubTab>('dancers');
  const [mobileLeadStage, setMobileLeadStage] = useState<AdmissionLead['stage']>('new_inquiry');
  const crmView = useViewPrefs('crm-dancers', 'table');

  // Dancer Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 200);
  const [filterProgram, setFilterProgram] = useState<string>('all');
  const [filterDebtOnly, setFilterDebtOnly] = useState(false);

  // Modals & Drawers
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [viewingStaffId, setViewingStaffId] = useState<string | null>(null);
  const [dossierTab, setDossierTab] = useState<'profile' | 'tuition' | 'notes' | 'evals'>('profile');
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<'general' | 'medical' | 'tuition' | 'performance'>('general');
  const [settleAmount, setSettleAmount] = useState<string>('');

  // Register Student Modal
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newDancerName, setNewDancerName] = useState('');
  const [newDancerNameAr, setNewDancerNameAr] = useState('');
  const [newDancerAge, setNewDancerAge] = useState<number>(14);
  const [newDancerProgram, setNewDancerProgram] = useState<'classical' | 'contemporary' | 'youth'>('classical');
  const [newDancerLevel, setNewDancerLevel] = useState('Conservatory Level II');
  const [newDancerParent, setNewDancerParent] = useState('');
  const [newDancerPhone, setNewDancerPhone] = useState('');
  const [newDancerEmail, setNewDancerEmail] = useState('');
  const [newDancerPlan, setNewDancerPlan] = useState<'elite_16' | 'foundation_8' | 'intensive_20'>('elite_16');
  const [newDancerDebtLimit, setNewDancerDebtLimit] = useState<number>(120);
  const [newDancerPhoto, setNewDancerPhoto] = useState('');
  const [newDancerBarcode, setNewDancerBarcode] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateModalBarcode = () => {
    const randomCode = `ETOILE-${Math.floor(100000 + Math.random() * 900000)}`;
    setNewDancerBarcode(randomCode);
  };

  // Add Lead Modal
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [leadDancerName, setLeadDancerName] = useState('');
  const [leadAge, setLeadAge] = useState<number>(12);
  const [leadParentName, setLeadParentName] = useState('');
  const [leadParentPhone, setLeadParentPhone] = useState('');
  const [leadParentEmail, setLeadParentEmail] = useState('');
  const [leadProgram, setLeadProgram] = useState<'classical' | 'contemporary' | 'youth'>('classical');
  const [leadNotes, setLeadNotes] = useState('');

  // Add Evaluation Modal
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [evalStudentId, setEvalStudentId] = useState('');
  const [evalBarre, setEvalBarre] = useState(9.0);
  const [evalAllegro, setEvalAllegro] = useState(8.5);
  const [evalPointe, setEvalPointe] = useState(9.0);
  const [evalArtistry, setEvalArtistry] = useState(9.2);
  const [evalRemarks, setEvalRemarks] = useState('');

  // Role permissions check
  const canManageStaff = currentUser?.role === 'superadmin' || currentUser?.role === 'owner';
  const canRegisterStudent = currentUser?.role !== 'instructor';

  // Filtered Students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      s.nameAr.includes(debouncedSearchTerm.trim()) ||
      s.barcode.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      s.parentName.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

    const matchesProgram = filterProgram === 'all' || s.program === filterProgram;
    const matchesDebt = !filterDebtOnly || s.walletBalance < 0;

    return matchesSearch && matchesProgram && matchesDebt;
  });

  // Handle Debt Settle
  const handleSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) return;

    settleStudentDebt(selectedStudent.id, amt);
    setSettleAmount('');
    setSelectedStudent((prev) => (prev ? { ...prev, walletBalance: prev.walletBalance + amt } : null));
  };

  // Handle Quota
  const handleQuotaAdjustment = (delta: number) => {
    if (!selectedStudent) return;
    updateSubscriptionQuota(selectedStudent.id, delta);
    setSelectedStudent((prev) =>
      prev
        ? {
            ...prev,
            subscription: {
              ...prev.subscription,
              usedSessions: Math.max(0, prev.subscription.usedSessions + delta),
            },
          }
        : null
    );
  };

  // Handle Note Submit
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !newNoteText.trim()) return;
    addStudentNote(selectedStudent.id, newNoteText.trim(), newNoteCategory);
    setNewNoteText('');
  };

  // Handle Register Student
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameCheck = requireText(newDancerName, 'Dancer name', 2);
    if (!nameCheck.ok) { showToast('Cannot register', nameCheck.message || 'Invalid name.', 'error'); return; }
    const parentCheck = requireText(newDancerParent, 'Parent name', 2);
    if (!parentCheck.ok) { showToast('Cannot register', parentCheck.message || 'Invalid parent.', 'error'); return; }
    const ageCheck = validateAge(newDancerAge);
    if (!ageCheck.ok) { showToast('Cannot register', ageCheck.message || 'Invalid age.', 'error'); return; }
    const phoneCheck = validatePhoneRequired(newDancerPhone, 'Parent phone');
    if (!phoneCheck.ok) { showToast('Cannot register', phoneCheck.message || 'Invalid phone.', 'error'); return; }
    const emailCheck = validateEmailOptional(newDancerEmail);
    if (!emailCheck.ok) { showToast('Cannot register', emailCheck.message || 'Invalid email.', 'error'); return; }
    const debtCheck = validatePositiveNumber(newDancerDebtLimit, 'Debt limit', { allowZero: true, max: 100000 });
    if (!debtCheck.ok) { showToast('Cannot register', debtCheck.message || 'Invalid debt limit.', 'error'); return; }
    if (!newDancerLevel.trim()) { showToast('Cannot register', 'Level is required.', 'error'); return; }
    const trimmedBarcode = newDancerBarcode.trim().toUpperCase();
    if (trimmedBarcode) {
      const duplicate = students.find((s) => s.barcode.toUpperCase() === trimmedBarcode);
      if (duplicate) {
        showToast(
          language === 'ar' ? 'باركود مكرر' : 'Duplicate Barcode',
          language === 'ar'
            ? `رمز الباركود (${trimmedBarcode}) مسجل بالفعل باسم الطالب/ة ${duplicate.name}. يرجى مسح بطاقة أخرى.`
            : `Barcode (${trimmedBarcode}) is already assigned to ${duplicate.name}. Please scan or generate a different card code.`,
          'error'
        );
        return;
      }
    }

    registerStudent({
      name: newDancerName.trim(),
      nameAr: newDancerNameAr.trim() || newDancerName.trim(),
      barcode: trimmedBarcode || undefined,
      age: Number(newDancerAge),
      program: newDancerProgram,
      level: newDancerLevel.trim(),
      parentName: newDancerParent.trim(),
      parentPhone: newDancerPhone.trim(),
      parentEmail: newDancerEmail.trim(),
      initialPlan: newDancerPlan,
      maxNegativeDebt: Number(newDancerDebtLimit),
      photoUrl: newDancerPhoto.trim() || undefined,
    });

    showToast(
      language === 'ar' ? 'تم تسجيل الطالب والبطاقة' : 'Student & Pass Created',
      language === 'ar'
        ? `تم حفظ بيانات الطالب وربط بطاقة الحضور بنجاح!`
        : `Student registered with card barcode (${trimmedBarcode || 'Generated'}) successfully!`,
      'success'
    );

    setIsRegisterModalOpen(false);
    // Reset form
    setNewDancerName('');
    setNewDancerNameAr('');
    setNewDancerParent('');
    setNewDancerPhone('');
    setNewDancerEmail('');
    setNewDancerPhoto('');
    setNewDancerBarcode('');
  };

  // Handle Add Lead
  const handleAddLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dancerCheck = requireText(leadDancerName, 'Dancer name', 2);
    if (!dancerCheck.ok) { showToast('Cannot save lead', dancerCheck.message || 'Invalid name.', 'error'); return; }
    const parentCheck = requireText(leadParentName, 'Parent name', 2);
    if (!parentCheck.ok) { showToast('Cannot save lead', parentCheck.message || 'Invalid parent.', 'error'); return; }
    const ageCheck = validateAge(leadAge);
    if (!ageCheck.ok) { showToast('Cannot save lead', ageCheck.message || 'Invalid age.', 'error'); return; }
    const phoneCheck = validatePhoneRequired(leadParentPhone, 'Parent phone');
    if (!phoneCheck.ok) { showToast('Cannot save lead', phoneCheck.message || 'Invalid phone.', 'error'); return; }
    const emailCheck = validateEmailOptional(leadParentEmail);
    if (!emailCheck.ok) { showToast('Cannot save lead', emailCheck.message || 'Invalid email.', 'error'); return; }

    addLead({
      dancerName: leadDancerName.trim(),
      age: Number(leadAge),
      parentName: leadParentName.trim(),
      parentPhone: leadParentPhone.trim(),
      parentEmail: leadParentEmail.trim(),
      programInterest: leadProgram,
      stage: 'new_inquiry',
      notes: leadNotes.trim(),
    });

    setIsAddLeadModalOpen(false);
    setLeadDancerName('');
    setLeadParentName('');
    setLeadParentPhone('');
    setLeadParentEmail('');
    setLeadNotes('');
  };

  // Handle Add Evaluation
  const handleEvalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalStudentId) { showToast('Cannot save evaluation', 'Please select a student.', 'error'); return; }
    const target = students.find((s) => s.id === evalStudentId);
    if (!target) { showToast('Cannot save evaluation', 'Selected student no longer exists.', 'error'); return; }
    for (const [label, v] of [['Barre', evalBarre], ['Allegro', evalAllegro], ['Pointe', evalPointe], ['Artistry', evalArtistry]] as const) {
      if (!Number.isFinite(Number(v)) || Number(v) < 1 || Number(v) > 10) {
        showToast('Cannot save evaluation', `${label} score must be between 1 and 10.`, 'error');
        return;
      }
    }

    addEvaluation({
      studentId: target.id,
      studentName: target.name,
      evaluatorName: currentUser?.name || (language === 'ar' ? 'أستاذ التقييم' : 'Faculty Master'),
      barreTechnique: evalBarre,
      allegroJumps: evalAllegro,
      pointeStability: evalPointe,
      musicalityArtistry: evalArtistry,
      remarks: evalRemarks.trim() || 'Good technique and form demonstrated during class.',
    });

    setIsEvalModalOpen(false);
    setEvalRemarks('');
  };

  if (selectedStudent) {
    return (
      <StudentProfilePage
        studentId={selectedStudent.id}
        onBack={() => setSelectedStudent(null)}
      />
    );
  }

  if (viewingStaffId) {
    return (
      <StaffProfilePage
        staffId={viewingStaffId}
        onBack={() => setViewingStaffId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col lg:flex-row items-start gap-6">
      
      {/* CRM Navigation Sub-Sidebar */}
      <ModuleSubSidebar<CrmSubTab>
        activeId={activeTab}
        onChange={setActiveTab}
        language={language}
        title="Student CRM"
        titleAr="إدارة شؤون الطلاب"
        items={[
          {
            id: 'dancers',
            label: 'Students',
            labelAr: 'الطلاب المقيدين',
            icon: <Users className="w-4 h-4" />,
            count: students.length,
          },
          {
            id: 'leads',
            label: 'Leads & Inquiries',
            labelAr: 'مسار القبول',
            icon: <Sparkles className="w-4 h-4" />,
            count: leads.length,
          },
          {
            id: 'staff',
            label: 'Staff & Teachers',
            labelAr: 'الهيئة التدريسية',
            icon: <Building2 className="w-4 h-4" />,
            count: staffList.length,
          },
          {
            id: 'evaluations',
            label: 'Evaluations',
            labelAr: 'التقييمات الفنية',
            icon: <Award className="w-4 h-4" />,
            count: evaluations.length,
          },
          {
            id: 'audit',
            label: 'Activity Log',
            labelAr: 'سجل التدقيق',
            icon: <Clock className="w-4 h-4" />,
          },
        ]}
        actionButton={
          activeTab === 'dancers' && canRegisterStudent
            ? {
                label: 'Add Student',
                labelAr: 'تسجيل راقص جديد',
                icon: <Plus className="w-4 h-4" />,
                onClick: () => {
                  setNewDancerBarcode(`ETOILE-${Math.floor(100000 + Math.random() * 900000)}`);
                  setIsRegisterModalOpen(true);
                },
              }
            : activeTab === 'leads'
            ? {
                label: 'Add Lead',
                labelAr: 'إضافة طلب قبول',
                icon: <Plus className="w-4 h-4" />,
                onClick: () => setIsAddLeadModalOpen(true),
              }
            : activeTab === 'evaluations'
            ? {
                label: 'Add Evaluation',
                labelAr: 'تسجيل تقييم فني',
                icon: <Plus className="w-4 h-4" />,
                onClick: () => {
                  if (students.length > 0) setEvalStudentId(students[0].id);
                  setIsEvalModalOpen(true);
                },
              }
            : undefined
        }
      />

      {/* Main Sub-Tab Active Content Area */}
      <main className="flex-1 min-w-0 w-full">

      {/* =========================================================================
          TAB 1: ENROLLED DANCERS & FAMILIES
          ========================================================================= */}
      {activeTab === 'dancers' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  language === 'ar'
                    ? 'البحث عن راقص بالاسم، المعرّف، الباركود، أو ولي الأمر...'
                    : 'Search students by name, ID, barcode, or parent...'
                }
                className="w-full bg-[#111622] border border-white/10 focus:border-rose-500/50 focus:bg-[#141a28] focus:outline-none text-white pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-2.5 rounded-xl text-xs shadow-inner"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 rtl:right-auto rtl:left-3 top-2.5 text-xs text-slate-400 hover:text-rose-400"
                  title={language === 'ar' ? 'مسح البحث' : 'Clear search'}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={filterProgram}
                onChange={(e) => setFilterProgram(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-[#111622] border border-white/10 text-white focus:outline-none focus:border-rose-500/50 cursor-pointer shadow-inner"
              >
                <option value="all">{language === 'ar' ? 'جميع البرامج التدريبية' : 'All Programs'}</option>
                <option value="classical">{language === 'ar' ? 'كونسرفتوار الباليه الكلاسيكي' : 'Classical Ballet'}</option>
                <option value="contemporary">{language === 'ar' ? 'الرقص المعاصر للمحترفين' : 'Contemporary Dance'}</option>
                <option value="youth">{language === 'ar' ? 'قسم الناشئين والبراعم' : 'Youth Ballet'}</option>
              </select>

              <button
                onClick={() => setFilterDebtOnly(!filterDebtOnly)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                  filterDebtOnly
                    ? 'status-pill-pink shadow-sm'
                    : 'border-white/10 text-slate-400 hover:text-white hover:border-rose-500/40 bg-[#111622]'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'الحسابات المدينة فقط' : 'Unpaid Balance Only'}</span>
              </button>

              {(searchTerm || filterProgram !== 'all' || filterDebtOnly) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterProgram('all');
                    setFilterDebtOnly(false);
                  }}
                  className="text-xs text-slate-400 hover:text-rose-400 underline px-1 cursor-pointer"
                >
                  {language === 'ar' ? 'إعادة تعيين' : 'Reset Filters'}
                </button>
              )}

              <button
                onClick={() => {
                  exportCsv(`students-${new Date().toISOString().split('T')[0]}`, ['id', 'name', 'program', 'level', 'parentName', 'parentPhone', 'walletBalance', 'quota', 'status'], filteredStudents.map((s) => ({
                    id: s.id,
                    name: s.name,
                    program: s.program,
                    level: s.level,
                    parentName: s.parentName,
                    parentPhone: s.parentPhone,
                    walletBalance: s.walletBalance,
                    quota: `${s.subscription?.maxSessions - s.subscription?.usedSessions || 0}/${s.subscription?.maxSessions || 0}`,
                    status: s.subscription?.status || '',
                  })), { module: 'students' });
                  logCrmAction('CRM Export', `Exported ${filteredStudents.length} student records to CSV`, 'student');
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-white/10 text-slate-400 hover:text-white hover:border-rose-500/40 bg-[#111622] flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'تصدير CSV' : 'Export CSV'}</span>
              </button>
              <ViewSwitcher moduleKey="crm-dancers" modes={['table']} value={{ mode: crmView.mode, density: crmView.density }} onChange={(p) => { crmView.setMode(p.mode); crmView.setDensity(p.density); }} />
            </div>
          </div>

          {/* Dancers Table / Grid */}
          <div className={`bg-[#171d2b] border border-white/10 rounded-2xl overflow-hidden shadow-xl ${crmView.density === 'compact' ? 'density-compact' : ''}`}>
            {/* Mobile View: High-Density Dancer Cards (<md) */}
            <div className="block md:hidden space-y-3 p-3">
              {filteredStudents.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No students found matching criteria.
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const hasDebt = student.walletBalance < 0;
                  const sessionsLeft = student.subscription.maxSessions - student.subscription.usedSessions;

                  return (
                    <div
                      key={student.id}
                      className="p-4 rounded-xl border border-white/5 bg-[#1c2333] space-y-3 text-xs shadow-sm hover:border-rose-500/40 transition active:scale-[0.99] cursor-pointer"
                      onClick={() => setSelectedStudent(student)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={student.photoUrl}
                            alt={student.name}
                            className="w-12 h-12 rounded-xl object-cover border border-rose-500/30 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-heading text-sm font-semibold text-white block truncate">
                              {student.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 font-mono">
                              <span>{student.barcode}</span>
                              <span>•</span>
                              <span>{student.age} yrs</span>
                              <span>•</span>
                              <span className="capitalize text-rose-400">{student.program}</span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`font-mono text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
                            hasDebt
                              ? 'status-pill-pink'
                              : 'status-pill-emerald'
                          }`}
                        >
                          {hasDebt
                            ? `-${formatCurrency(Math.abs(student.walletBalance), language)}`
                            : formatCurrency(student.walletBalance, language)}
                        </span>
                      </div>

                      {/* Quota Progress */}
                      <div className="space-y-1 bg-[#141a27] p-2.5 rounded-lg border border-white/5">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-300 truncate max-w-[170px]">{student.subscription.planName}</span>
                          <span className={`font-mono font-bold ${sessionsLeft <= 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {sessionsLeft} / {student.subscription.maxSessions} classes left
                          </span>
                        </div>
                        <div className="w-full bg-[#111622] rounded-full h-1.5 overflow-hidden border border-white/5">
                          <div
                            className={`h-full rounded-full ${sessionsLeft <= 2 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                            style={{
                              width: `${Math.min(100, (student.subscription.usedSessions / student.subscription.maxSessions) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Parent Contact & Quick Actions */}
                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <div className="text-slate-300 truncate max-w-[150px]">
                          <span className="text-[9px] text-slate-400 uppercase block">Parent Contact</span>
                          <span className="font-medium text-white truncate block">{student.parentName}</span>
                        </div>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              const res = checkInStudent(student.barcode, 'manual');
                              if (res.success) {
                                showToast(
                                  language === 'ar' ? 'تم تسجيل الحضور' : 'Attendance Verified',
                                  language === 'ar' ? `تم تسجيل حضور ${student.name} بنجاح!` : `Checked in ${student.name} successfully!`,
                                  'success'
                                );
                              } else {
                                showToast(
                                  language === 'ar' ? 'تعذر تسجيل الحضور' : 'Check-in blocked',
                                  res.reason || (language === 'ar' ? 'لا يمكن تسجيل الحضور الآن' : 'Student cannot check in right now.'),
                                  'error'
                                );
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-emerald-400 font-medium active:scale-95 transition cursor-pointer flex items-center gap-1"
                            title={language === 'ar' ? 'تسجيل حضور يدوي فوري' : 'Quick manual check-in'}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{language === 'ar' ? 'حضور' : 'Check-In'}</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedStudent(student);
                              setDossierTab('tuition');
                            }}
                            className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-[#171d2b] text-rose-400 font-medium active:scale-95 transition cursor-pointer"
                          >
                            Profile
                          </button>
                          <button
                            onClick={() => {
                              triggerOpenWaAlert(
                                'quota_warning',
                                student.parentPhone,
                                student.parentName,
                                `Hello ${student.parentName}, greeting from Étoile Ballet reception regarding ${student.name}'s attendance and quota.`
                              );
                              showToast('WhatsApp Sent', `Notice dispatched to ${student.parentName}.`, 'gold');
                            }}
                            className="p-1.5 rounded-lg status-pill-emerald active:scale-95 transition cursor-pointer"
                            title="WhatsApp Notice"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              showConfirmNotification({
                                title: language === 'ar' ? 'حذف ملف الطالب' : 'Delete Student',
                                message: language === 'ar'
                                  ? `هل أنت متأكد من حذف الطالب/ة ${student.name}؟ سيتم حذف بيانات الحضور والاشتراكات.`
                                  : `Are you sure you want to delete ${student.name}? This will remove all student records.`,
                                confirmLabel: language === 'ar' ? 'نعم، احذف' : 'Delete Student',
                                cancelLabel: language === 'ar' ? 'إلغاء' : 'Cancel',
                                type: 'error',
                                onConfirm: () => deleteStudent(student.id),
                              });
                            }}
                            className="p-1.5 rounded-lg status-pill-pink active:scale-95 transition cursor-pointer"
                            title={language === 'ar' ? 'حذف الطالب' : 'Delete Student'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop View: Full Data Spreadsheet (md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-[#131823] border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'الراقص والمعرّف الأكاديمي' : 'Student & ID'}</th>
                    <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'البرنامج والمستوى' : 'Program & Level'}</th>
                    <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'الخطة ورصيد الحصص' : 'Package & Classes Left'}</th>
                    <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'رصيد المحفظة / الدين' : 'Account Balance'}</th>
                    <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'بيانات ولي الأمر' : 'Parent Contact'}</th>
                    <th className="py-3.5 px-4 text-end">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        {language === 'ar' ? 'لا يوجد راقصون يطابقون شروط البحث الحالية.' : 'No students found matching criteria.'}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      const hasDebt = student.walletBalance < 0;
                      const sessionsLeft = student.subscription.maxSessions - student.subscription.usedSessions;

                      return (
                        <tr
                          key={student.id}
                          className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                          onClick={() => setSelectedStudent(student)}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={student.photoUrl}
                                alt={student.name}
                                className="w-10 h-10 rounded-xl object-cover border border-rose-500/30 flex-shrink-0"
                              />
                              <div>
                                <span className="font-heading text-sm font-semibold text-white group-hover:text-rose-400 block">
                                  {language === 'ar' ? student.nameAr || student.name : student.name}
                                </span>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                  <span className="font-mono">{student.barcode}</span>
                                  <span>•</span>
                                  <span>{student.age} {language === 'ar' ? 'سنة' : 'yrs'}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-white block">
                              {student.level}
                            </span>
                            <span className="text-[10px] text-slate-400 capitalize">
                              {student.program} {language === 'ar' ? 'قسم' : 'division'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span className="text-[11px] font-medium text-slate-300 truncate block max-w-[200px]">
                                {language === 'ar' ? student.subscription.planNameAr || student.subscription.planName : student.subscription.planName}
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-[#111622] rounded-full h-1.5 overflow-hidden border border-white/5">
                                  <div
                                    className={`h-full rounded-full ${
                                      sessionsLeft <= 2 ? 'bg-amber-400' : 'bg-emerald-400'
                                    }`}
                                    style={{
                                      width: `${Math.min(100, (student.subscription.usedSessions / student.subscription.maxSessions) * 100)}%`,
                                    }}
                                  />
                                </div>
                                <span className={`text-[10px] font-mono font-semibold ${sessionsLeft <= 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                  {sessionsLeft} {language === 'ar' ? 'متبقية' : 'classes left'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full inline-block ${
                                hasDebt
                                  ? 'status-pill-pink'
                                  : 'status-pill-emerald'
                              }`}
                            >
                              {hasDebt
                                ? `-${formatCurrency(Math.abs(student.walletBalance), language)}`
                                : formatCurrency(student.walletBalance, language)}
                            </span>
                            {hasDebt && (
                              <span className="text-[10px] text-rose-400/80 block mt-0.5">
                                {language === 'ar' ? 'الحد:' : 'Limit:'} -{formatCurrency(student.maxNegativeDebt, language)}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-white block">
                              {student.parentName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {student.parentPhone}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-end" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const res = checkInStudent(student.barcode, 'manual');
                                  if (res.success) {
                                    showToast(
                                      language === 'ar' ? 'تم تسجيل الحضور' : 'Attendance Verified',
                                      language === 'ar'
                                        ? `تم تسجيل حضور ${student.name} (${student.barcode}) بنجاح!`
                                        : `Checked in ${student.name} (${student.barcode}) successfully!`,
                                      'success'
                                    );
                                  } else {
                                    showToast(
                                      language === 'ar' ? 'تعذر تسجيل الحضور' : 'Check-in blocked',
                                      res.reason || (language === 'ar' ? 'لا يمكن تسجيل الحضور الآن' : 'Student cannot check in right now.'),
                                      'error'
                                    );
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg border border-emerald-500/30 hover:border-emerald-500 bg-emerald-950/20 hover:bg-emerald-900/40 text-[11px] text-emerald-400 font-medium transition cursor-pointer flex items-center gap-1 active:scale-95"
                                title={language === 'ar' ? 'تسجيل حضور يدوي فوري' : 'Quick manual check-in'}
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>{language === 'ar' ? 'حضور' : 'Check-In'}</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setDossierTab('tuition');
                                }}
                                className="px-2.5 py-1 rounded-lg border border-white/10 hover:border-rose-500 bg-[#1c2333] hover:bg-[#242d42] text-[11px] text-rose-400 font-medium transition cursor-pointer"
                                title={language === 'ar' ? 'فتح الملف الأكاديمي' : 'Open Student Profile'}
                              >
                                {language === 'ar' ? 'الملف' : 'Profile'}
                              </button>

                              <button
                                onClick={() => {
                                  triggerOpenWaAlert(
                                    'quota_warning',
                                    student.parentPhone,
                                    student.parentName,
                                    `Hello ${student.parentName}, greeting from Étoile Ballet reception regarding ${student.name}'s attendance and quota.`
                                  );
                                  showToast('WhatsApp Sent', `Notice dispatched to ${student.parentName}.`, 'gold');
                                }}
                                className="p-1.5 rounded-lg status-pill-emerald hover:scale-105 transition cursor-pointer"
                                title={language === 'ar' ? 'إرسال إشعار واتساب فوري' : 'Send WhatsApp Message'}
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  showConfirmNotification({
                                    title: language === 'ar' ? 'حذف ملف الطالب' : 'Delete Student',
                                    message: language === 'ar'
                                      ? `هل أنت متأكد من حذف الطالب/ة ${student.name}؟ سيتم حذف بيانات الحضور والاشتراكات.`
                                      : `Are you sure you want to delete ${student.name}? This will remove all student records.`,
                                    confirmLabel: language === 'ar' ? 'نعم، احذف' : 'Delete Student',
                                    cancelLabel: language === 'ar' ? 'إلغاء' : 'Cancel',
                                    type: 'error',
                                    onConfirm: () => deleteStudent(student.id),
                                  });
                                }}
                                className="p-1.5 rounded-lg status-pill-pink hover:scale-105 transition cursor-pointer"
                                title={language === 'ar' ? 'حذف الطالب' : 'Delete Student'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: ADMISSIONS & PROSPECTIVE LEADS PIPELINE (KANBAN FUNNEL)
          ========================================================================= */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          {/* Kanban Funnel Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg sm:text-xl font-semibold text-[var(--text-primary)]">
                {language === 'ar' ? 'طلبات القبول وتجارب الأداء بالأكاديمية' : 'New Leads & Inquiries'}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {language === 'ar'
                  ? 'متابعة المتقدمين الجدد من التسجيل المبدئي حتى تجربة الأداء والقبول الرسمي والتعاقد.'
                  : 'Track new applicants from first inquiry to trial class and enrollment.'}
              </p>
            </div>
          </div>

          {/* Mobile Stage Selector Tabs (md:hidden) */}
          <div className="flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar py-1 touch-scroll">
            {(
              [
                { id: 'new_inquiry', label: language === 'ar' ? '١. استفسار' : '1. Inquiries', count: leads.filter((l) => l.stage === 'new_inquiry').length },
                { id: 'trial_scheduled', label: language === 'ar' ? '٢. تجربة' : '2. Trial Class', count: leads.filter((l) => l.stage === 'trial_scheduled').length },
                { id: 'audition_passed', label: language === 'ar' ? '٣. اختبار' : '3. Audition Passed', count: leads.filter((l) => l.stage === 'audition_passed').length },
                { id: 'enrolled', label: language === 'ar' ? '٤. تسجيل' : '4. Enrolled', count: leads.filter((l) => l.stage === 'enrolled').length },
                { id: 'waitlist', label: language === 'ar' ? '٥. انتظار' : '5. Waitlist', count: leads.filter((l) => l.stage === 'waitlist').length },
              ] as const
            ).map((stage) => (
              <button
                key={stage.id}
                onClick={() => setMobileLeadStage(stage.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  mobileLeadStage === stage.id
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                <span>{stage.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/15 text-inherit font-mono">
                  {stage.count}
                </span>
              </button>
            ))}
          </div>

          {/* Kanban Columns */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {(
              [
                { id: 'new_inquiry', label: language === 'ar' ? '١. استفسارات جديدة' : '1. Inquiries', count: leads.filter((l) => l.stage === 'new_inquiry').length, badgeClass: 'status-pill-pink' },
                { id: 'trial_scheduled', label: language === 'ar' ? '٢. تجربة مجدولة' : '2. Trial Class', count: leads.filter((l) => l.stage === 'trial_scheduled').length, badgeClass: 'status-pill-blue' },
                { id: 'audition_passed', label: language === 'ar' ? '٣. اجتياز الأداء' : '3. Audition Passed', count: leads.filter((l) => l.stage === 'audition_passed').length, badgeClass: 'status-pill-purple' },
                { id: 'enrolled', label: language === 'ar' ? '٤. تم التسجيل' : '4. Enrolled', count: leads.filter((l) => l.stage === 'enrolled').length, badgeClass: 'status-pill-emerald' },
                { id: 'waitlist', label: language === 'ar' ? '٥. قائمة الانتظار' : '5. Waitlist', count: leads.filter((l) => l.stage === 'waitlist').length, badgeClass: 'status-pill-amber' },
              ] as const
            ).map((col) => {
              const colLeads = leads.filter((l) => l.stage === col.id);

              return (
                <div
                  key={col.id}
                  className={`bg-[#171d2b] border border-white/10 rounded-2xl p-3.5 space-y-3 shadow-xl ${
                    col.id === mobileLeadStage ? 'flex' : 'hidden md:flex'
                  } flex-col`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                    <span className="text-xs font-semibold text-white">
                      {col.label}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${col.badgeClass}`}
                    >
                      {col.count}
                    </span>
                  </div>

                  {/* Leads List */}
                  <div className="space-y-2.5 flex-1">
                    {colLeads.length === 0 ? (
                      <div className="py-8 text-center text-[11px] text-slate-400 italic">
                        {language === 'ar' ? 'لا توجد طلبات في هذه المرحلة' : 'No records in this stage'}
                      </div>
                    ) : (
                      colLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className="p-3.5 rounded-xl border border-white/5 bg-[#1c2333] hover:border-rose-500/40 transition space-y-2.5 text-xs shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-heading font-semibold text-sm text-white">
                              {lead.dancerName}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 font-mono">
                                {lead.age} yrs
                              </span>
                              <button
                                onClick={() => {
                                  showConfirmNotification({
                                    title: language === 'ar' ? 'حذف طلب القبول' : 'Delete Lead',
                                    message: language === 'ar'
                                      ? `هل أنت متأكد من حذف طلب القبول للراقص/ة ${lead.dancerName}؟`
                                      : `Are you sure you want to delete lead ${lead.dancerName}?`,
                                    confirmLabel: language === 'ar' ? 'نعم، احذف' : 'Delete Lead',
                                    cancelLabel: language === 'ar' ? 'إلغاء' : 'Cancel',
                                    type: 'error',
                                    onConfirm: () => deleteLead(lead.id),
                                  });
                                }}
                                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                title={language === 'ar' ? 'حذف طلب القبول' : 'Delete Lead'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-400 space-y-0.5">
                            <div>
                              Parent: <strong className="text-slate-200">{lead.parentName}</strong>
                            </div>
                            <div className="font-mono text-[10px] text-slate-400">
                              {lead.parentPhone}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-white/5 flex flex-col gap-1.5">
                            {lead.stage === 'new_inquiry' && (
                              <button
                                onClick={() => updateLeadStage(lead.id, 'trial_scheduled')}
                                className="w-full py-1.5 text-[11px] font-semibold rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 transition text-center cursor-pointer"
                              >
                                Schedule Trial →
                              </button>
                            )}

                            {lead.stage === 'trial_scheduled' && (
                              <button
                                onClick={() => updateLeadStage(lead.id, 'audition_passed')}
                                className="w-full py-1.5 text-[11px] font-semibold rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition text-center cursor-pointer"
                              >
                                Pass Audition →
                              </button>
                            )}

                            {lead.stage === 'audition_passed' && (
                              <button
                                onClick={() => convertLeadToStudent(lead.id)}
                                className="w-full py-1.5 text-[11px] rounded-lg action-btn-coral font-bold transition text-center cursor-pointer shadow-md"
                              >
                                Enroll Student ★
                              </button>
                            )}

                            {lead.stage === 'waitlist' && (
                              <button
                                onClick={() => updateLeadStage(lead.id, 'trial_scheduled')}
                                className="w-full py-1.5 text-[11px] font-semibold rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition text-center cursor-pointer"
                              >
                                Re-open Lead →
                              </button>
                            )}

                            {lead.stage === 'enrolled' && (
                              <span className="w-full py-1 text-[11px] text-center status-pill-emerald rounded-lg font-semibold flex items-center justify-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: FACULTY & STAFF DIRECTORY (ROLES & GOVERNANCE)
          ========================================================================= */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold text-white">
                {language === 'ar' ? 'الهيئة التدريسية وصلاحيات الطاقم الأكاديمي' : 'Staff & Teachers Directory'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'ar'
                  ? 'سجل الأساتذة والمدربين، موظفي الاستقبال، والإدارة مع تحديد صلاحيات الدخول.'
                  : 'List of teachers, receptionists, and managers with their assigned roles.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {staffList.map((staff) => {
              const isCurrentUser = currentUser?.id === staff.id;

              return (
                <div
                  key={staff.id}
                  className={`bg-[#171d2b] border rounded-2xl p-5 space-y-4 shadow-xl transition flex flex-col justify-between ${
                    isCurrentUser ? 'border-rose-500 shadow-rose-500/10' : 'border-white/10'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">{staff.id}</span>
                      <button
                        onClick={() => toggleStaffShift(staff.id)}
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold transition cursor-pointer ${
                          staff.shiftStatus === 'on_duty'
                            ? 'status-pill-emerald'
                            : 'bg-[#111622] text-slate-400 border border-white/5'
                        }`}
                      >
                        {staff.shiftStatus === 'on_duty'
                          ? language === 'ar'
                            ? '● مداوم حالياً'
                            : '● On Duty'
                          : language === 'ar'
                          ? '○ خارج الوردية'
                          : '○ Off Shift'}
                      </button>
                    </div>

                    <button
                      onClick={() => setViewingStaffId(staff.id)}
                      title={language === 'ar' ? 'فتح الملف الشخصي' : 'Open profile page'}
                      className="flex items-center gap-3 text-start w-full rounded-xl p-1 -m-1 hover:bg-white/[0.04] transition cursor-pointer group/staffcard"
                    >
                      <img
                        src={staff.avatar}
                        alt={staff.name}
                        className="w-12 h-12 rounded-full object-cover border border-rose-500/40 flex-shrink-0 group-hover/staffcard:border-rose-300 transition"
                      />
                      <div className="min-w-0">
                        <span className="font-heading text-base font-semibold text-white block truncate group-hover/staffcard:text-rose-200 transition">
                          {staff.name}
                        </span>
                        <span className="text-[11px] text-rose-400 block truncate">
                          {staff.specialization}
                        </span>
                      </div>
                    </button>

                    <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-white/10">
                      <div className="flex items-center gap-2 text-[11px]">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{staff.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{staff.studio}</span>
                      </div>
                    </div>
                  </div>

                  {/* Role Assignment Selector */}
                  <div className="pt-3 border-t border-white/10 space-y-1.5">
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                      {language === 'ar' ? 'الصلاحية المعتمدة (RBAC):' : 'Assigned Role:'}
                    </label>

                    {canManageStaff ? (
                      <select
                        value={staff.role}
                        onChange={(e) => updateStaffRole(staff.id, e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-[#111622] border border-white/10 text-white focus:outline-none focus:border-rose-500/50 cursor-pointer shadow-inner"
                      >
                        <option value="superadmin">
                          {language === 'ar' ? 'مدير الأكاديمية (إدارة عليا)' : 'Director (Admin)'}
                        </option>
                        <option value="owner">
                          {language === 'ar' ? 'المالك / مجلس الإدارة' : 'Owner'}
                        </option>
                        <option value="instructor">
                          {language === 'ar' ? 'أستاذ باليه (مدرب)' : 'Ballet Teacher'}
                        </option>
                        <option value="receptionist">
                          {language === 'ar' ? 'موظف الاستقبال' : 'Receptionist'}
                        </option>
                      </select>
                    ) : (
                      <span className="text-xs font-semibold text-rose-400 capitalize block">
                        {staff.role}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: TECHNIQUE & SKILL ASSESSMENTS
          ========================================================================= */}
      {activeTab === 'evaluations' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold text-white">
                {language === 'ar' ? 'تقارير المهارات والتقييمات الفنية' : 'Student Evaluations & Progress'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'ar'
                  ? 'معايير التقييم المعتمدة لتمارين البار، قفزات أليغرو، ثبات البوانت، والتعبير الموسيقي.'
                  : 'Teacher scores for barre work, jumps, pointe, and musical expression.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evaluations.map((ev) => {
              const avg = ((ev.barreTechnique + ev.allegroJumps + ev.pointeStability + ev.musicalityArtistry) / 4).toFixed(2);

              return (
                <div
                  key={ev.id}
                  className="bg-[#171d2b] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-heading text-lg font-semibold text-white block">
                        {ev.studentName}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Evaluated by {ev.evaluatorName} on {ev.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-mono text-2xl font-bold text-rose-400">{avg}</span>
                        <span className="text-[10px] text-slate-400 block">/ 10 Average</span>
                      </div>
                      <button
                        onClick={() => {
                          showConfirmNotification({
                            title: language === 'ar' ? 'حذف تقرير التقييم' : 'Delete Evaluation',
                            message: language === 'ar'
                              ? `هل أنت متأكد من حذف تقرير تقييم ${ev.studentName}؟`
                              : `Are you sure you want to delete evaluation for ${ev.studentName}?`,
                            confirmLabel: language === 'ar' ? 'نعم، احذف' : 'Delete Evaluation',
                            cancelLabel: language === 'ar' ? 'إلغاء' : 'Cancel',
                            type: 'error',
                            onConfirm: () => deleteEvaluation(ev.id),
                          });
                        }}
                        className="p-1.5 rounded-lg border border-rose-500/20 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        title={language === 'ar' ? 'حذف التقييم' : 'Delete Evaluation'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Marks Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    <div className="bg-[#141a27] p-2.5 rounded-xl text-center border border-white/5">
                      <span className="text-[10px] text-slate-400 block">{language === 'ar' ? 'البار' : 'Barre'}</span>
                      <strong className="text-xs text-rose-400 font-mono">{ev.barreTechnique}/10</strong>
                    </div>
                    <div className="bg-[#141a27] p-2.5 rounded-xl text-center border border-white/5">
                      <span className="text-[10px] text-slate-400 block">{language === 'ar' ? 'أليغرو' : 'Allegro'}</span>
                      <strong className="text-xs text-rose-400 font-mono">{ev.allegroJumps}/10</strong>
                    </div>
                    <div className="bg-[#141a27] p-2.5 rounded-xl text-center border border-white/5">
                      <span className="text-[10px] text-slate-400 block">{language === 'ar' ? 'بوانت' : 'Pointe'}</span>
                      <strong className="text-xs text-rose-400 font-mono">{ev.pointeStability}/10</strong>
                    </div>
                    <div className="bg-[#141a27] p-2.5 rounded-xl text-center border border-white/5">
                      <span className="text-[10px] text-slate-400 block">{language === 'ar' ? 'التعبير' : 'Artistry'}</span>
                      <strong className="text-xs text-rose-400 font-mono">{ev.musicalityArtistry}/10</strong>
                    </div>
                  </div>

                  {ev.remarks && (
                    <p className="text-xs text-slate-300 italic bg-[#141a27] p-3 rounded-xl border border-white/5">
                      "{ev.remarks}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: AUDIT TRAIL & ACTIVITY STREAM
          ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold text-white">
                {language === 'ar' ? 'سجل التدقيق والنشاطات الإدارية المباشرة' : 'Activity Log'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'ar'
                  ? 'توثيق زمني فوري لعمليات التسجيل، تسوية الديون، تأكيدات الحضور، وتسجيلات الدخول.'
                  : 'Real-time log of student registrations, payments, check-ins, and staff actions.'}
              </p>
            </div>
          </div>

          <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-4 shadow-xl divide-y divide-white/5">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{log.action}</span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full border border-rose-500/30 text-rose-400 bg-[#111622] font-semibold">
                      {log.actorName} ({log.actorRole})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{log.details}</p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                  {log.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      </main>



      {/* =========================================================================
          REGISTER NEW DANCER MODAL
          ========================================================================= */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto touch-scroll">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="font-heading text-lg sm:text-xl font-semibold text-[var(--text-primary)]">
                Add New Student
              </h3>
              <button
                onClick={() => {
                  setIsRegisterModalOpen(false);
                  setNewDancerBarcode('');
                }}
                className="p-1.5 rounded-lg bg-[var(--bg-card)] text-[var(--text-secondary)] min-w-[34px] min-h-[34px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3 sm:space-y-4 text-xs">
              {/* Optional Photo Upload */}
              <div className="pb-1 border-b border-[var(--border-subtle)]">
                <ImageUploader
                  value={newDancerPhoto}
                  onChange={(val) => setNewDancerPhoto(val)}
                  onRemove={() => setNewDancerPhoto('')}
                  label={language === 'ar' ? 'صورة الطالب الشخصية' : 'Student Photo'}
                  description={language === 'ar'
                    ? 'يمكنك رفع صورة الطالب الآن من جهازك أو تخطيها وإضافتها لاحقاً (اختياري).'
                    : 'Upload a dancer photo from your device or skip and add it later (optional).'}
                  optionalBadge={true}
                  language={language}
                  shape="rounded"
                  size="md"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Student Name</label>
                  <input
                    type="text"
                    required
                    value={newDancerName}
                    onChange={(e) => setNewDancerName(e.target.value)}
                    placeholder="e.g. Juliette Laurent"
                    className="w-full form-gold-input px-3 py-2 rounded-xl text-xs min-h-[40px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Arabic Name</label>
                  <input
                    type="text"
                    value={newDancerNameAr}
                    onChange={(e) => setNewDancerNameAr(e.target.value)}
                    placeholder="e.g. جولييت لوران"
                    className="w-full form-gold-input px-3 py-2 rounded-xl text-xs min-h-[40px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Age (3–80)</label>
                  <input
                    type="number"
                    min={3}
                    max={80}
                    required
                    value={newDancerAge}
                    onChange={(e) => setNewDancerAge(Number(e.target.value))}
                    className="w-full form-gold-input px-3 py-2 rounded-xl text-xs min-h-[40px]"
                  />
                </div>
                <div className="space-y-1 col-span-1 sm:col-span-2">
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Program</label>
                  <select
                    value={newDancerProgram}
                    onChange={(e) => setNewDancerProgram(e.target.value as any)}
                    className="w-full form-gold-input px-3 py-2 rounded-xl text-xs bg-[var(--bg-surface)] cursor-pointer min-h-[40px]"
                  >
                    <option value="classical">Classical Ballet</option>
                    <option value="contemporary">Contemporary Dance</option>
                    <option value="youth">Youth Ballet</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Ballet Level</label>
                <input
                  type="text"
                  value={newDancerLevel}
                  onChange={(e) => setNewDancerLevel(e.target.value)}
                  placeholder="e.g. Level II"
                  className="w-full form-gold-input px-3 py-2 rounded-xl text-xs min-h-[40px]"
                />
              </div>

              {/* =========================================================================
                  PHYSICAL MEMBERSHIP CARD & CHECK-IN BARCODE SECTION
                  ========================================================================= */}
              <div className="border-t border-[var(--border-subtle)] pt-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Scan className="w-4 h-4 text-rose-400" />
                    <span className="font-semibold text-rose-400 text-[11px] block">
                      {language === 'ar' ? 'بطاقة العضوية والباركود (Check-In Card)' : 'Membership Card & Barcode (Check-In)'}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/25 font-medium flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    <span>{language === 'ar' ? 'مسح فوري أو توليد' : 'Scan Card or Auto-Generate'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-7 space-y-1.5">
                    <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                      {language === 'ar' ? 'كود بطاقة الطالب (Scan / Card Barcode) *' : 'Card Barcode / RFID Code *'}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          ref={barcodeInputRef}
                          type="text"
                          required
                          value={newDancerBarcode}
                          onChange={(e) => setNewDancerBarcode(e.target.value.toUpperCase())}
                          placeholder={language === 'ar' ? 'مثال: ETOILE-749102 أو امسح البطاقة' : 'e.g. ETOILE-749102 or scan physical card'}
                          className="w-full form-gold-input pl-8 pr-3 py-2 rounded-xl text-xs font-mono tracking-wider min-h-[40px] uppercase"
                        />
                        <Scan className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          barcodeInputRef.current?.focus();
                          barcodeInputRef.current?.select();
                          showToast(
                            language === 'ar' ? 'جاهز للمسح' : 'Scanner Ready',
                            language === 'ar' ? 'امسح البطاقة الفعلية الآن بجهاز الباركود.' : 'Scan the physical card now with your scanner.',
                            'gold'
                          );
                        }}
                        className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] hover:border-rose-500/50 bg-[var(--bg-card)] text-xs text-[var(--text-primary)] inline-flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                        title={language === 'ar' ? 'تجهيز الماسح الضوئي' : 'Focus for scanner input'}
                      >
                        <Scan className="w-3.5 h-3.5 text-rose-400" />
                        <span className="hidden sm:inline">{language === 'ar' ? 'مسح' : 'Scan'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateModalBarcode}
                        className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] hover:border-rose-500/50 bg-[var(--bg-card)] text-xs text-[var(--text-primary)] inline-flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                        title={language === 'ar' ? 'توليد كود تلقائي جديد' : 'Generate random code'}
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
                        <span className="hidden sm:inline">{language === 'ar' ? 'توليد' : 'Generate'}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                      {language === 'ar'
                        ? 'امسح بطاقة الطالب المطبوعة بجهاز الباركود أو اكتب الكود يدوياً. سيتمكن الطالب من مسح هذه البطاقة عند الدخول لتسجيل الحضور، أو يمكنك تسجيل حضوره يدوياً من لوحة التحكم.'
                        : 'Scan the pre-printed physical card with your barcode reader or type its code. Students check in by scanning this card at the kiosk, or you can check them in manually from the dashboard.'}
                    </p>
                  </div>

                  {/* Live Barcode SVG Visualizer */}
                  <div className="sm:col-span-5 bg-[var(--bg-card)]/80 p-2.5 rounded-xl border border-[var(--border-subtle)] flex flex-col items-center justify-center text-center space-y-1.5">
                    <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                      {language === 'ar' ? 'معاينة الباركود الفعلي' : 'Live Scannable Barcode'}
                    </span>
                    <div className="bg-white px-2 py-1.5 rounded-lg shadow-sm w-full flex items-center justify-center overflow-hidden max-w-[210px] min-h-[50px]">
                      {newDancerBarcode.trim() ? (
                        <BarcodeSVG value={newDancerBarcode.trim()} width={190} height={42} lightBackground />
                      ) : (
                        <span className="text-[10px] text-slate-400 py-3 italic">
                          {language === 'ar' ? 'أدخل كود البطاقة للمعاينة' : 'Scan or type card code'}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">
                      Code-128 Standard • Fast Kiosk
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border-subtle)] pt-3 space-y-3">
                <span className="font-semibold text-rose-400 text-[11px] block">Parent & Contact Info</span>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Parent / Guardian Name</label>
                  <input
                    type="text"
                    required
                    value={newDancerParent}
                    onChange={(e) => setNewDancerParent(e.target.value)}
                    placeholder="e.g. Dr. Antoine Laurent"
                    className="w-full form-gold-input px-3 py-2 rounded-xl text-xs min-h-[40px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={newDancerPhone}
                      onChange={(e) => setNewDancerPhone(e.target.value)}
                      placeholder="+201012345678"
                      className="w-full form-gold-input px-3 py-2 rounded-xl text-xs min-h-[40px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Email Address</label>
                    <input
                      type="email"
                      value={newDancerEmail}
                      onChange={(e) => setNewDancerEmail(e.target.value)}
                      placeholder="parent@email.com"
                      className="w-full form-gold-input px-3 py-2 rounded-xl text-xs min-h-[40px]"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border-subtle)] pt-3 space-y-3">
                <span className="font-semibold text-rose-400 text-[11px] block">Package Plan & Credit Limit</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Package Plan</label>
                    <select
                      value={newDancerPlan}
                      onChange={(e) => setNewDancerPlan(e.target.value as any)}
                      className="w-full form-gold-input px-3 py-2 rounded-xl text-xs bg-[var(--bg-surface)] cursor-pointer min-h-[40px]"
                    >
                      <option value="elite_16">{language === 'ar' ? 'باليه كلاسيكي (16 حصة - 4,800 ج.م)' : 'Classical Ballet (16 Classes - 4,800 EGP)'}</option>
                      <option value="foundation_8">{language === 'ar' ? 'تأسيس الناشئين (8 حصص - 2,600 ج.م)' : 'Youth Foundation (8 Classes - 2,600 EGP)'}</option>
                      <option value="intensive_20">{language === 'ar' ? 'رقص معاصر مكثف (20 حصة - 5,200 ج.م)' : 'Contemporary Dance (20 Classes - 5,200 EGP)'}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                      {language === 'ar' ? 'الحد الائتماني (ج.م)' : 'Credit Limit (EGP)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      value={newDancerDebtLimit}
                      onChange={(e) => setNewDancerDebtLimit(Number(e.target.value))}
                      className="w-full form-gold-input px-3 py-2 rounded-xl text-xs min-h-[40px]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterModalOpen(false);
                    setNewDancerBarcode('');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-card)] text-xs text-[var(--text-secondary)] min-h-[42px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gold-btn px-5 py-2.5 rounded-xl text-xs font-semibold min-h-[42px] active:scale-95 transition"
                >
                  Save Student & Create Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADD ADMISSIONS LEAD MODAL
          ========================================================================= */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-6 shadow-2xl space-y-3 sm:space-y-4 max-h-[90vh] overflow-y-auto touch-scroll">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="font-heading text-lg sm:text-xl font-semibold text-[var(--text-primary)]">
                Add New Lead
              </h3>
              <button
                onClick={() => setIsAddLeadModalOpen(false)}
                className="p-1.5 rounded-lg bg-[var(--bg-card)] text-[var(--text-secondary)] min-w-[34px] min-h-[34px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddLeadSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Student Name</label>
                <input
                  type="text"
                  required
                  value={leadDancerName}
                  onChange={(e) => setLeadDancerName(e.target.value)}
                  placeholder="e.g. Beatrice Fontaine"
                  className="w-full form-gold-input px-3 py-2 rounded-xl text-xs min-h-[40px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Age</label>
                  <input
                    type="number"
                    value={leadAge}
                    onChange={(e) => setLeadAge(Number(e.target.value))}
                    className="w-full form-gold-input px-3 py-2 rounded-xl text-xs min-h-[40px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Program Interest</label>
                  <select
                    value={leadProgram}
                    onChange={(e) => setLeadProgram(e.target.value as any)}
                    className="w-full form-gold-input px-3 py-2 rounded-xl text-xs bg-[var(--bg-surface)] min-h-[40px]"
                  >
                    <option value="classical">Classical</option>
                    <option value="contemporary">Contemporary</option>
                    <option value="youth">Youth</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Parent / Contact Name</label>
                <input
                  type="text"
                  required
                  value={leadParentName}
                  onChange={(e) => setLeadParentName(e.target.value)}
                  placeholder="e.g. Marc Fontaine"
                  className="w-full form-gold-input px-3 py-2 rounded-xl text-xs min-h-[40px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Phone Number</label>
                  <input
                    type="text"
                    value={leadParentPhone}
                    onChange={(e) => setLeadParentPhone(e.target.value)}
                    placeholder="+33 6 00 00 00 00"
                    className="w-full form-gold-input px-3 py-2 rounded-xl text-xs min-h-[40px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Email Address</label>
                  <input
                    type="email"
                    value={leadParentEmail}
                    onChange={(e) => setLeadParentEmail(e.target.value)}
                    placeholder="contact@email.com"
                    className="w-full form-gold-input px-3 py-2 rounded-xl text-xs min-h-[40px]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Background & Trial Notes</label>
                <textarea
                  rows={2}
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  placeholder="Previous dance background, audition request..."
                  className="w-full form-gold-input p-2.5 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddLeadModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-card)] text-xs text-[var(--text-secondary)] min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gold-btn px-5 py-2 rounded-xl text-xs font-semibold min-h-[40px] active:scale-95 transition"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADD EVALUATION MODAL
          ========================================================================= */}
      {isEvalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="font-heading text-xl font-semibold text-[var(--text-primary)]">
                Add Student Evaluation
              </h3>
              <button
                onClick={() => setIsEvalModalOpen(false)}
                className="p-1.5 rounded-lg bg-[var(--bg-card)] text-[var(--text-secondary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEvalSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Select Student</label>
                <select
                  value={evalStudentId}
                  onChange={(e) => setEvalStudentId(e.target.value)}
                  className="w-full form-gold-input px-3 py-2 rounded-xl text-xs bg-[var(--bg-surface)]"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.level})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Barre Work (/10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    value={evalBarre}
                    onChange={(e) => setEvalBarre(Number(e.target.value))}
                    className="w-full form-gold-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Jumps & Turns (/10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    value={evalAllegro}
                    onChange={(e) => setEvalAllegro(Number(e.target.value))}
                    className="w-full form-gold-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Pointe Balance (/10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    value={evalPointe}
                    onChange={(e) => setEvalPointe(Number(e.target.value))}
                    className="w-full form-gold-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Musical Expression (/10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    value={evalArtistry}
                    onChange={(e) => setEvalArtistry(Number(e.target.value))}
                    className="w-full form-gold-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Teacher Notes</label>
                <textarea
                  rows={2}
                  value={evalRemarks}
                  onChange={(e) => setEvalRemarks(e.target.value)}
                  placeholder="Feedback on posture, movement, musicality..."
                  className="w-full form-gold-input p-2 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEvalModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-[var(--bg-card)] text-xs text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gold-btn px-4 py-1.5 rounded-xl text-xs font-semibold"
                >
                  Save Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

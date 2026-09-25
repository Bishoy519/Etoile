import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { Student, Subscription, StudentNote, SkillEvaluation, AttendanceRecord, BoutiqueOrder } from '../types';
import { formatCurrency } from '../utils/currency';
import { BarcodeSVG, Code128Canvas, QrCodeSVG } from './BarcodeRenderer';
import { ModuleSubSidebar } from './ModuleSubSidebar';
import { ProgressReportView } from './ProgressReportView';
import { ImageUploader } from './ImageUploader';
import { isValidImageSrc } from '../utils/imageUpload';
import {
  ArrowLeft,
  Scan,
  Printer,
  Sparkles,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Heart,
  Plus,
  Trash2,
  DollarSign,
  UserCheck,
  ShoppingBag,
  Award,
  BookOpen,
  Send,
  RefreshCw,
  Copy,
  ExternalLink,
  Shield,
  Layers,
  TrendingUp,
  Edit3,
  Camera,
  Upload,
  X,
} from 'lucide-react';

interface StudentProfilePageProps {
  studentId: string;
  onBack: () => void;
}

type ProfileTab = 'overview' | 'badge' | 'attendance' | 'boutique' | 'subscription' | 'evaluations' | 'progress';

export const StudentProfilePage: React.FC<StudentProfilePageProps> = ({ studentId, onBack }) => {
  const {
    students,
    attendanceLogs,
    orders,
    studentNotes,
    evaluations,
    staffList,
    language,
    updateStudent,
    deleteStudent,
    updateStudentBarcode,
    checkInStudent,
    settleStudentDebt,
    updateSubscriptionQuota,
    addStudentNote,
    triggerOpenWaAlert,
    showToast,
    showConfirmNotification,
  } = useAdmin();

  const student = students.find((s) => s.id === studentId);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  // Form state for editing
  const [formData, setFormData] = useState<Partial<Student>>({});
  const [barcodeInput, setBarcodeInput] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Settle debt state
  const [settleAmount, setSettleAmount] = useState('');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // New Note state
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<StudentNote['category']>('general');

  // Custom Fields state
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // Synchronize when student changes
  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name,
        nameAr: student.nameAr,
        photoUrl: student.photoUrl,
        age: student.age,
        birthDate: student.birthDate || '',
        gender: student.gender || 'female',
        program: student.program,
        level: student.level,
        status: student.status || 'active',
        assignedInstructor: student.assignedInstructor || '',
        enrolledDate: student.enrolledDate || new Date().toISOString().split('T')[0],
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        parentEmail: student.parentEmail,
        emergencyContactName: student.emergencyContactName || '',
        emergencyContactPhone: student.emergencyContactPhone || '',
        address: student.address || '',
        medicalNotes: student.medicalNotes || '',
        allergies: student.allergies || '',
        maxNegativeDebt: student.maxNegativeDebt,
      });
      setBarcodeInput(student.barcode);
      setCustomFields(student.customFields || {});
      setHasChanges(false);
    }
  }, [student]);

  if (!student) {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-12 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-xl font-heading font-semibold text-[var(--text-primary)]">
          {language === 'ar' ? 'لم يتم العثور على ملف الطالب' : 'Student Record Not Found'}
        </h2>
        <p className="text-xs text-[var(--text-secondary)]">
          The requested student ID {studentId} was not found in student records.
        </p>
        <button
          onClick={onBack}
          className="gold-btn px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'العودة لسجل الطلاب' : 'Return to Student Directory'}</span>
        </button>
      </div>
    );
  }

  // Handle Field Updates
  const handleFieldChange = (field: keyof Student, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Save changes
  const handleSaveAll = () => {
    if (!String(formData.name || '').trim() || String(formData.name || '').trim().length < 2) {
      showToast('Cannot save', 'Student name is required (min 2 chars).', 'error');
      return;
    }
    const ageNum = Number((formData as any).age);
    if (!Number.isInteger(ageNum) || ageNum < 3 || ageNum > 80) {
      showToast('Cannot save', 'Age must be between 3 and 80.', 'error');
      return;
    }
    if (!String((formData as any).parentName || '').trim()) {
      showToast('Cannot save', 'Parent name is required.', 'error');
      return;
    }
    const phoneDigits = String((formData as any).parentPhone || '').replace(/\D/g, '');
    if (!String((formData as any).parentPhone || '').trim() || phoneDigits.length < 7 || phoneDigits.length > 15) {
      showToast('Cannot save', 'Parent phone must contain 7–15 digits.', 'error');
      return;
    }
    const emailVal = String((formData as any).parentEmail || '').trim();
    if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailVal)) {
      showToast('Cannot save', 'Parent email looks invalid.', 'error');
      return;
    }
    const photoVal = String((formData as any).photoUrl || '').trim();
    if (photoVal && !isValidImageSrc(photoVal)) {
      showToast('Cannot save', 'Photo source must be a valid image file or web URL.', 'error');
      return;
    }
    // 1. Update Barcode if changed
    if (barcodeInput.trim().toUpperCase() !== student.barcode.toUpperCase()) {
      const clean = barcodeInput.trim().toUpperCase();
      if (!clean) { showToast('Cannot save', 'Barcode cannot be empty.', 'error'); return; }
      if (!/^[A-Z0-9\-_]+$/.test(clean) || clean.length < 4 || clean.length > 32) {
        showToast('Cannot save', 'Barcode must be 4–32 chars (letters, digits, - _).', 'error');
        return;
      }
      const bRes = updateStudentBarcode(student.id, clean);
      if (!bRes.success) { showToast('Cannot save', bRes.error || 'Barcode update failed.', 'error'); return; }
    }

    // 2. Update Student info
    updateStudent(student.id, {
      ...formData,
      barcode: barcodeInput.trim().toUpperCase(),
      customFields,
    });

    setHasChanges(false);
  };

  // Generate random barcode
  const handleGenerateBarcode = () => {
    const randomCode = `ETOILE-${Math.floor(100000 + Math.random() * 900000)}`;
    setBarcodeInput(randomCode);
    setHasChanges(true);
    showToast('New Barcode Generated', `Suggested: ${randomCode}. Click Save to apply.`, 'gold');
  };

  // Immediate manual check-in verification
  const handleManualCheckIn = () => {
    const res = checkInStudent(student.barcode, 'hid_barcode');
    if (res.success) {
      showToast('Attendance Verified', `Verified ${student.name} check-in successfully!`, 'success');
    } else {
      showToast('Check-in blocked', res.reason || 'This student cannot check in right now.', 'error');
    }
  };

  // Settle Debt
  const handleSettleDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(settleAmount);
    if (!Number.isFinite(amt) || amt <= 0) { showToast('Invalid amount', 'Enter an amount greater than 0.', 'error'); return; }
    const owed = Math.abs(Math.min(0, student.walletBalance));
    if (owed > 0 && amt > owed + 0.01) { showToast('Overpayment', `This student owes ${owed}. Reduce the amount.`, 'warning'); return; }
    showConfirmNotification({
      title: language === 'ar' ? 'تحصيل الرصيد' : 'Collect Balance',
      message: language === 'ar'
        ? `هل تريد تأكيد تحصيل مبلغ ${amt} ج.م للطالب/ة ${student.name}؟`
        : `Collect ${amt} EGP for ${student.name}?`,
      confirmLabel: language === 'ar' ? 'تأكيد التحصيل' : 'Confirm Collection',
      cancelLabel: language === 'ar' ? 'إلغاء' : 'Cancel',
      type: 'gold',
      onConfirm: () => {
        settleStudentDebt(student.id, amt);
        setSettleAmount('');
      },
    });
  };

  // Add Note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) { showToast('Empty note', 'Write a note before saving.', 'error'); return; }
    if (newNoteText.trim().length > 1000) { showToast('Note too long', 'Notes are limited to 1000 characters.', 'error'); return; }
    addStudentNote(student.id, newNoteText.trim().slice(0, 1000), newNoteCategory);
    setNewNoteText('');
  };

  // Custom Key-Value Fields
  const handleAddCustomField = () => {
    const key = newFieldKey.trim();
    if (!key) { showToast('Missing key', 'Custom field name is required.', 'error'); return; }
    if (key.length > 40) { showToast('Key too long', 'Field names are limited to 40 characters.', 'error'); return; }
    if (Object.keys(customFields).some((k) => k.toLowerCase() === key.toLowerCase())) {
      showToast('Duplicate field', 'A field with this name already exists.', 'error');
      return;
    }
    setCustomFields((prev) => ({ ...prev, [key]: newFieldValue.trim().slice(0, 200) }));
    setNewFieldKey('');
    setNewFieldValue('');
    setHasChanges(true);
  };

  const handleRemoveCustomField = (key: string) => {
    setCustomFields((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    setHasChanges(true);
  };

  // Filter attendance records for this student
  const studentAttendance = attendanceLogs.filter(
    (log) => log.studentId === student.id || log.barcode.toUpperCase() === student.barcode.toUpperCase()
  );

  // Filter boutique orders for this student
  const studentOrders = orders.filter((o) => o.studentId === student.id);

  // Filter notes and evaluations
  const studentDossierNotes = studentNotes.filter((n) => n.studentId === student.id);
  const studentEvals = evaluations.filter((e) => e.studentId === student.id);

  // Siblings sharing the same familyId
  const siblings = students.filter((s) => s.familyId === student.familyId && s.id !== student.id);

  // Print Badge Trigger
  const handlePrintBadge = () => {
    setActiveTab('badge');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* =========================================================================
          TOP BREADCRUMB & ACTION BAR
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-rose-400 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'ar' ? 'العودة لقائمة الطلاب' : 'Back to Students'}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Print Badge Button */}
          <button
            type="button"
            onClick={handlePrintBadge}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-rose-500 text-xs font-medium text-[var(--text-primary)] transition"
          >
            <Printer className="w-3.5 h-3.5 text-rose-400" />
            <span>{language === 'ar' ? 'طباعة بطاقة الباركود' : 'Print Student Pass'}</span>
          </button>

          {/* Manual Check-In Button */}
          <button
            type="button"
            onClick={handleManualCheckIn}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-medium text-emerald-400 transition"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'تسجيل الحضور الفوري' : 'Check In Student'}</span>
          </button>

          {/* WhatsApp Alert Trigger */}
          <button
            type="button"
            onClick={() =>
              triggerOpenWaAlert(
                'class_reminder',
                student.parentPhone,
                student.parentName,
                `Hello ${student.parentName}, update regarding ${student.name} from Étoile Ballet Academy.`
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-rose-500 text-xs font-medium text-[var(--text-secondary)] hover:text-rose-400 transition"
          >
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            <span>WhatsApp</span>
          </button>

          {/* Delete Student Button */}
          <button
            type="button"
            onClick={() => {
              showConfirmNotification({
                title: language === 'ar' ? 'حذف ملف الطالب' : 'Delete Profile',
                message: language === 'ar'
                  ? `هل أنت متأكد من رغبتك في حذف ملف الطالب/ة ${student.name} نهائياً؟ سيتم حذف جميع بيانات الحضور والاشتراكات.`
                  : `Are you sure you want to permanently delete the profile of ${student.name}? This will remove all student records.`,
                confirmLabel: language === 'ar' ? 'نعم، احذف نهائياً' : 'Delete Permanently',
                cancelLabel: language === 'ar' ? 'إلغاء' : 'Cancel',
                type: 'error',
                onConfirm: () => {
                  deleteStudent(student.id);
                  onBack();
                },
              });
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-950/20 hover:bg-rose-900/30 text-xs font-medium text-rose-400 transition"
            title={language === 'ar' ? 'حذف هذا الطالب' : 'Delete this student'}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'حذف الملف' : 'Delete Profile'}</span>
          </button>

          {/* Save Profile Button */}
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={!hasChanges}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold shadow-md transition ${
              hasChanges
                ? 'gold-btn'
                : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-subtle)] cursor-not-allowed opacity-70'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          HERO STUDENT PROFILE HEADER CARD
          ========================================================================= */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-6 shadow-sm relative overflow-hidden">
        {/* Subtle decorative gold sheen */}
        <div className="absolute top-0 right-0 w-80 h-32 bg-gradient-to-l from-rose-500/5 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Avatar and Primary Identity */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
            <div className="relative group flex-shrink-0">
              <img
                src={formData.photoUrl || student.photoUrl}
                alt={student.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-rose-500/60 shadow-lg group-hover:border-rose-400 transition"
              />
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                className="absolute inset-0 rounded-2xl bg-black/55 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition backdrop-blur-[1px] cursor-pointer"
                title={language === 'ar' ? 'تعديل أو رفع صورة الطالب' : 'Change student photo'}
              >
                <Camera className="w-5 h-5 text-rose-300" />
                <span className="text-[10px] font-semibold mt-0.5">{language === 'ar' ? 'تغيير' : 'Change'}</span>
              </button>
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[var(--bg-surface)] shadow" />
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[var(--text-primary)] truncate">
                  {student.name}
                </h1>
                {student.nameAr && (
                  <span className="text-sm font-arabic text-[var(--text-secondary)]">
                    ({student.nameAr})
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {student.status || 'Active Student'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="px-2.5 py-0.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/35 text-[11px] font-semibold text-rose-300 hover:text-white inline-flex items-center gap-1 transition cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  <span>{language === 'ar' ? 'تعديل الصورة' : 'Upload Photo'}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                <span className="font-semibold text-[#F43F5E] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {student.level}
                </span>
                <span>•</span>
                <span className="capitalize">{student.program} Ballet</span>
                <span>•</span>
                <span className="font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                  {student.barcode}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-[11px] text-[var(--text-muted)] pt-1">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-rose-400" />
                  {student.parentPhone}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-rose-400" />
                  {student.parentEmail}
                </span>
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-rose-400" />
                  Family: {student.familyId}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Barcode Scanner Card right in Hero */}
          <div className="flex items-center gap-4 bg-[var(--bg-card)] p-3.5 rounded-2xl border border-[var(--border-subtle)] self-stretch lg:self-auto shadow-inner">
            <div className="bg-white p-2 rounded-xl shadow-md flex items-center justify-center">
              <BarcodeSVG value={student.barcode} width={150} height={42} showText={false} lightBackground />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">
                {language === 'ar' ? 'باركود التحقق والحضور' : 'Student Barcode'}
              </span>
              <span className="font-mono text-xs font-bold text-rose-400 block select-all">
                {student.barcode}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(student.barcode);
                  showToast('Copied', 'Student barcode copied to clipboard.', 'gold');
                }}
                className="text-[10px] text-[var(--text-secondary)] hover:text-rose-400 inline-flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>Copy Barcode</span>
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================================
            KPI METRIC ROW
            ===================================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[var(--border-subtle)]">
          {/* Sessions Quota */}
          <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>{language === 'ar' ? 'رصيد الحصص' : 'Classes Left'}</span>
              <span className="font-mono font-semibold text-rose-400">
                {student.subscription.usedSessions} / {student.subscription.maxSessions}
              </span>
            </div>
            <div className="w-full bg-[var(--bg-surface)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
              <div
                className={`h-full transition-all duration-300 ${
                  student.subscription.usedSessions >= student.subscription.maxSessions
                    ? 'bg-rose-500'
                    : 'bg-rose-500'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    (student.subscription.usedSessions / Math.max(1, student.subscription.maxSessions)) * 100
                  )}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between pt-1 text-[10px]">
              <span className="text-[var(--text-secondary)]">
                {student.subscription.maxSessions - student.subscription.usedSessions} classes left
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => updateSubscriptionQuota(student.id, -1)}
                  className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-rose-500 text-[10px]"
                  title="Refund 1 session"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => updateSubscriptionQuota(student.id, 1)}
                  className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-rose-500 text-[10px]"
                  title="Consume 1 session"
                >
                  +1
                </button>
              </div>
            </div>
          </div>

          {/* Account Ledger Balance */}
          <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-subtle)] space-y-1">
            <span className="text-[11px] text-[var(--text-muted)] block">
              {language === 'ar' ? 'رصيد المحفظة / المديونية' : 'Account Balance'}
            </span>
            <span
              className={`font-mono text-xl font-bold block ${
                student.walletBalance < 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {student.walletBalance < 0
                ? `-${formatCurrency(Math.abs(student.walletBalance), language)}`
                : formatCurrency(student.walletBalance, language)}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] block">
              {language === 'ar' ? 'الحد الائتماني:' : 'Credit Limit:'} -{formatCurrency(student.maxNegativeDebt, language)}
            </span>
          </div>

          {/* Total Check-Ins */}
          <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-subtle)] space-y-1">
            <span className="text-[11px] text-[var(--text-muted)] block">
              {language === 'ar' ? 'سجل الحضور' : 'Total Attendance'}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-heading text-xl font-bold text-[var(--text-primary)]">
                {studentAttendance.length}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10">
                Verified
              </span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] block truncate">
              {studentAttendance[0] ? `Latest: ${studentAttendance[0].timestamp}` : 'No recent scans'}
            </span>
          </div>

          {/* Age & Enrolled Date */}
          <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-subtle)] space-y-1">
            <span className="text-[11px] text-[var(--text-muted)] block">
              {language === 'ar' ? 'العمر وتاريخ الالتحاق' : 'Age & Registration'}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-heading text-xl font-bold text-[var(--text-primary)]">
                {student.age} yrs
              </span>
              <span className="text-[10px] text-[var(--text-secondary)]">
                ({student.gender || 'female'})
              </span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] block truncate">
              Registered: {student.enrolledDate || 'Sep 2024'}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Sections Sub-Sidebar & Workspace */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        <ModuleSubSidebar<ProfileTab>
          activeId={activeTab}
          onChange={setActiveTab}
          language={language}
          title="Dossier Sections"
          titleAr="أقسام ملف الطالب"
          items={[
            {
              id: 'overview',
              label: 'Student Info & Barcode',
              labelAr: 'البيانات ومدخلات الباركود',
              icon: <Edit3 className="w-4 h-4" />,
            },
            {
              id: 'badge',
              label: 'Student ID Badge',
              labelAr: 'بطاقة الباركود والطباعة',
              icon: <Printer className="w-4 h-4" />,
            },
            {
              id: 'attendance',
              label: 'Attendance History',
              labelAr: 'سجل الحضور',
              icon: <UserCheck className="w-4 h-4" />,
              count: studentAttendance.length,
            },
            {
              id: 'boutique',
              label: 'Store Purchases',
              labelAr: 'مشتريات المتجر',
              icon: <ShoppingBag className="w-4 h-4" />,
              count: studentOrders.length,
            },
            {
              id: 'subscription',
              label: 'Package & Classes',
              labelAr: 'الباقات والاشتراك',
              icon: <Award className="w-4 h-4" />,
            },
            {
              id: 'evaluations',
              label: 'Evaluations & Notes',
              labelAr: 'التقييمات والملاحظات',
              icon: <BookOpen className="w-4 h-4" />,
              count: studentDossierNotes.length + studentEvals.length,
            },
            {
              id: 'progress',
              label: 'Progress Report',
              labelAr: 'تقرير التقدم',
              icon: <TrendingUp className="w-4 h-4" />,
            },
          ]}
        />

        <div className="flex-1 min-w-0 w-full space-y-6">

      {/* =========================================================================
          TAB 1: EDITABLE PROFILE & CUSTOM INPUTS (Core Feature)
          ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* SECTION 1: BARCODE & SCANNER ACCESS INPUTS */}
          <div className="bg-[var(--bg-surface)] border border-rose-500/40 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Scan className="w-5 h-5 text-rose-400" />
                <h3 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
                  {language === 'ar' ? 'إعدادات الباركود وتسجيل الحضور' : 'Student Barcode & Scanner'}
                </h3>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 font-medium">
                Scanner Ready
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Barcode Input & Generator */}
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                    {language === 'ar' ? 'رمز الباركود المخصص للطالب (Scan Key):' : 'Custom Student Barcode Code:'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => {
                        setBarcodeInput(e.target.value.toUpperCase());
                        setHasChanges(true);
                      }}
                      placeholder="e.g. ETOILE-892101 or CARD-9988"
                      className="flex-1 form-gold-input px-3.5 py-2.5 rounded-xl font-mono text-sm tracking-wider uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateBarcode}
                      className="px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] hover:border-rose-500 bg-[var(--bg-card)] text-xs font-medium text-[var(--text-primary)] inline-flex items-center gap-1.5 transition"
                      title="Generate new unique barcode code"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
                      <span>{language === 'ar' ? 'توليد تلقائي' : 'Generate'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                    {language === 'ar'
                      ? 'يمكنك كتابة أي رقم باركود مطبوع على بطاقة الطالب الفعلية، وسيتعرف عليه قارئ الباركود فوراً عند المسح.'
                      : 'You can input any barcode number printed on the physical student card or key-fob. The barcode scanner will detect this code instantly upon check-in.'}
                  </p>
                </div>

                {/* Quick actions for Barcode */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleManualCheckIn}
                    className="gold-btn px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2"
                  >
                    <Scan className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'تسجيل الحضور بهذا الباركود' : 'Check In Student with this Barcode'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('badge')}
                    className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:border-rose-500 bg-[var(--bg-card)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-2 transition"
                  >
                    <Printer className="w-3.5 h-3.5 text-rose-400" />
                    <span>{language === 'ar' ? 'معاينة البطاقة للطباعة' : 'View Printable Card'}</span>
                  </button>
                </div>
              </div>

              {/* Live Vector SVG Barcode & QR Preview */}
              <div className="lg:col-span-5 bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center justify-center text-center space-y-3">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  Live Scannable Barcode Preview
                </span>
                <div className="bg-white p-3 rounded-xl shadow-md w-full max-w-xs flex items-center justify-center">
                  <BarcodeSVG value={barcodeInput || student.barcode} width={220} height={60} lightBackground />
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] font-mono">
                  <span>Standard: Code-128</span>
                  <span>•</span>
                  <span>Density: High</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: PERSONAL & DANCER IDENTITY INPUTS */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-heading text-base font-semibold text-[var(--text-primary)] flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)]">
              <UserCheck className="w-4 h-4 text-rose-400" />
              <span>{language === 'ar' ? 'البيانات الشخصية للطالب' : 'Dancer Personal Information'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Full Name (English) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full form-gold-input px-3 py-2 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Full Name (Arabic)
                </label>
                <input
                  type="text"
                  value={formData.nameAr || ''}
                  onChange={(e) => handleFieldChange('nameAr', e.target.value)}
                  className="w-full form-gold-input px-3 py-2 rounded-xl text-xs font-arabic"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Age & Birth Date
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={formData.age || ''}
                    onChange={(e) => handleFieldChange('age', parseInt(e.target.value) || 0)}
                    placeholder="Age"
                    className="w-full form-gold-input px-3 py-2 rounded-xl text-xs"
                  />
                  <input
                    type="date"
                    value={formData.birthDate || ''}
                    onChange={(e) => handleFieldChange('birthDate', e.target.value)}
                    className="w-full form-gold-input px-2 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Gender
                </label>
                <select
                  value={formData.gender || 'female'}
                  onChange={(e) => handleFieldChange('gender', e.target.value)}
                  className="w-full form-gold-input px-3 py-2 rounded-xl text-xs bg-[var(--bg-card)]"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Status in Academy
                </label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  className="w-full form-gold-input px-3 py-2 rounded-xl text-xs bg-[var(--bg-card)]"
                >
                  <option value="active">Active Enrolled</option>
                  <option value="inactive">On Leave / Paused</option>
                  <option value="suspended">Suspended (Fee Delinquent)</option>
                  <option value="graduated">Alumni / Graduated</option>
                </select>
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-[var(--border-subtle)]">
                <ImageUploader
                  value={formData.photoUrl || ''}
                  onChange={(val) => handleFieldChange('photoUrl', val)}
                  onRemove={() => handleFieldChange('photoUrl', '')}
                  label={language === 'ar' ? 'الصورة الشخصية للطالب (اختياري)' : 'Student Profile Photo (Optional)'}
                  description={language === 'ar'
                    ? 'يمكنك رفع صورة من جهازك، أو استخدام رابط خارجي، أو حذفها لاستعادة الصورة الافتراضية.'
                    : 'Upload a picture from your device, provide a web link, or remove it to restore default.'}
                  optionalBadge={true}
                  language={language}
                  shape="rounded"
                  size="md"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: ACADEMIC & CONSERVATORY PLACEMENT */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-heading text-base font-semibold text-[var(--text-primary)] flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)]">
              <Award className="w-4 h-4 text-rose-400" />
              <span>{language === 'ar' ? 'المستوى الأكاديمي والمدرب' : 'Program & Teacher'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Program Division
                </label>
                <select
                  value={formData.program || 'classical'}
                  onChange={(e) => handleFieldChange('program', e.target.value)}
                  className="w-full form-gold-input px-3 py-2 rounded-xl text-xs bg-[var(--bg-card)]"
                >
                  <option value="classical">Classical Ballet</option>
                  <option value="contemporary">Contemporary Ballet</option>
                  <option value="youth">Youth Ballet</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Level / Grade
                </label>
                <input
                  type="text"
                  value={formData.level || ''}
                  onChange={(e) => handleFieldChange('level', e.target.value)}
                  placeholder="e.g. Pre-Professional Level IV"
                  className="w-full form-gold-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Assigned Instructor
                </label>
                <select
                  value={formData.assignedInstructor || ''}
                  onChange={(e) => handleFieldChange('assignedInstructor', e.target.value)}
                  className="w-full form-gold-input px-3 py-2 rounded-xl text-xs bg-[var(--bg-card)]"
                >
                  {staffList.map((st) => (
                    <option key={st.id} value={st.name}>
                      {st.name} ({st.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Admission Date
                </label>
                <input
                  type="date"
                  value={formData.enrolledDate || ''}
                  onChange={(e) => handleFieldChange('enrolledDate', e.target.value)}
                  className="w-full form-gold-input px-3 py-2 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: FAMILY & EMERGENCY CONTACTS */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-heading text-base font-semibold text-[var(--text-primary)] flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)]">
              <Layers className="w-4 h-4 text-rose-400" />
              <span>{language === 'ar' ? 'بيانات العائلة وطوارئ الاتصال' : 'Family Account & Emergency Contacts'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Parent / Guardian Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.parentName || ''}
                  onChange={(e) => handleFieldChange('parentName', e.target.value)}
                  className="w-full form-gold-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Parent Phone (WhatsApp) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.parentPhone || ''}
                  onChange={(e) => handleFieldChange('parentPhone', e.target.value)}
                  className="w-full form-gold-input px-3 py-2 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Parent Email
                </label>
                <input
                  type="email"
                  value={formData.parentEmail || ''}
                  onChange={(e) => handleFieldChange('parentEmail', e.target.value)}
                  className="w-full form-gold-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  value={formData.emergencyContactName || ''}
                  onChange={(e) => handleFieldChange('emergencyContactName', e.target.value)}
                  placeholder="e.g. Aunt Sophie Laurent"
                  className="w-full form-gold-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Emergency Contact Phone
                </label>
                <input
                  type="text"
                  value={formData.emergencyContactPhone || ''}
                  onChange={(e) => handleFieldChange('emergencyContactPhone', e.target.value)}
                  placeholder="+33 6..."
                  className="w-full form-gold-input px-3 py-2 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  placeholder="Street, City, Postal Code"
                  className="w-full form-gold-input px-3 py-2 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Siblings link */}
            {siblings.length > 0 && (
              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center gap-2 text-xs">
                <span className="text-[var(--text-muted)] font-semibold uppercase">Family Siblings:</span>
                <div className="flex flex-wrap gap-2">
                  {siblings.map((sib) => (
                    <span
                      key={sib.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <strong>{sib.name}</strong> ({sib.level})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 5: HEALTH, MEDICAL & INJURY RECORDS */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-heading text-base font-semibold text-[var(--text-primary)] flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)]">
              <Heart className="w-4 h-4 text-rose-400" />
              <span>{language === 'ar' ? 'السجل الصحي والإصابات' : 'Health, Physical Conditions & Allergies'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Medical Notes & Physical Therapy Guidelines
                </label>
                <textarea
                  rows={3}
                  value={formData.medicalNotes || ''}
                  onChange={(e) => handleFieldChange('medicalNotes', e.target.value)}
                  placeholder="Tendon sensitivity, previous sprains, warm-up restrictions..."
                  className="w-full form-gold-input p-3 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Allergies & Dietary Notices
                </label>
                <textarea
                  rows={3}
                  value={formData.allergies || ''}
                  onChange={(e) => handleFieldChange('allergies', e.target.value)}
                  placeholder="Food allergies, medication cautions..."
                  className="w-full form-gold-input p-3 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* SECTION 6: CUSTOM DYNAMIC INPUTS (Arbitrary inputs) */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <h3 className="font-heading text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-400" />
                <span>{language === 'ar' ? 'حقول ومدخلات إضافية مخصصة' : 'Custom Dynamic Academy Fields'}</span>
              </h3>
              <span className="text-[11px] text-[var(--text-muted)]">
                Add any custom parameter (Locker #, Pointe Shoe Model, Costume Size, etc.)
              </span>
            </div>

            {/* List existing custom fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(customFields).map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block truncate">
                      {key}
                    </span>
                    <strong className="text-xs text-[var(--text-primary)] block truncate">{val}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomField(key)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Remove custom input"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {Object.keys(customFields).length === 0 && (
                <div className="col-span-full py-4 text-center text-xs text-[var(--text-muted)] italic">
                  No custom fields defined. Add one below.
                </div>
              )}
            </div>

            {/* Add new custom field row */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="Field Label (e.g. Locker Number)"
                value={newFieldKey}
                onChange={(e) => setNewFieldKey(e.target.value)}
                className="flex-1 min-w-[160px] form-gold-input px-3 py-2 rounded-xl text-xs"
              />
              <input
                type="text"
                placeholder="Value (e.g. L-42)"
                value={newFieldValue}
                onChange={(e) => setNewFieldValue(e.target.value)}
                className="flex-1 min-w-[160px] form-gold-input px-3 py-2 rounded-xl text-xs"
              />
              <button
                type="button"
                onClick={handleAddCustomField}
                className="px-4 py-2 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 inline-flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Input</span>
              </button>
            </div>
          </div>

          {/* Bottom Save Bar */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <span className="text-xs text-[var(--text-secondary)]">
              {hasChanges
                ? '✦ You have unsaved changes in this student profile.'
                : '✓ All student inputs and parameters are saved.'}
            </span>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={!hasChanges}
              className={`px-6 py-2.5 rounded-xl text-xs font-semibold shadow-md transition inline-flex items-center gap-2 ${
                hasChanges ? 'gold-btn' : 'bg-[var(--bg-card)] text-[var(--text-muted)] opacity-60 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{language === 'ar' ? 'حفظ كافة التغييرات' : 'Save All Changes'}</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: PRINTABLE STUDENT ID BADGE
          ========================================================================= */}
      {activeTab === 'badge' && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
                {language === 'ar' ? 'بطاقة عضوية وباركود الطالب الرسمية' : 'Official Student Check-In Badge & ID Card'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Designed for standard credit-card / lanyard format. Ready for physical laser/inkjet printing and handheld barcode scanners.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="gold-btn px-5 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>{language === 'ar' ? 'طباعة البطاقة الآن' : 'Print Badge Now (Cmd+P)'}</span>
            </button>
          </div>

          {/* Badge Display Shell */}
          <div className="flex justify-center p-4 sm:p-8 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)]">
            
            {/* The Badge Container that prints cleanly */}
            <div
              id="printable-student-badge"
              className="w-full max-w-md bg-[#0d1012] border-2 border-[#F43F5E] rounded-3xl p-6 shadow-2xl relative overflow-hidden text-white font-sans"
              style={{ minHeight: '440px' }}
            >
              {/* Gold Header Branding */}
              <div className="flex items-center justify-between pb-4 border-b border-[#F43F5E]/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#F43F5E] text-black font-heading font-bold flex items-center justify-center text-sm shadow">
                    É
                  </div>
                  <div>
                    <span className="font-heading text-sm font-semibold tracking-wider text-[#f5eedc] block">
                      ÉTOILE BALLET ACADEMY
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-[#F43F5E] block">
                      Paris Ballet Academy
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#F43F5E]/40 bg-[#F43F5E]/10 text-[#F43F5E]">
                  ID PASS
                </span>
              </div>

              {/* Dancer Photo & Details */}
              <div className="flex items-center gap-4 my-5">
                <img
                  src={student.photoUrl}
                  alt={student.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-[#F43F5E] shadow-lg flex-shrink-0"
                />
                <div className="min-w-0 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#F43F5E] font-semibold block">
                    {student.program.toUpperCase()} DIVISION
                  </span>
                  <h3 className="font-heading text-xl font-bold text-white truncate">
                    {student.name}
                  </h3>
                  <span className="text-xs text-[#d1d5db] block">{student.level}</span>
                  <span className="text-[10px] text-[#9ca3af] block">Family: {student.familyId}</span>
                </div>
              </div>

              {/* Scannable Barcode Container - High Contrast White Card */}
              <div className="bg-white p-4 rounded-2xl shadow-lg my-4 flex flex-col items-center justify-center space-y-2">
                <Code128Canvas value={student.barcode} width={280} height={70} showText={true} lightBackground={true} allowDownload={true} />
              </div>

              {/* Bottom Card Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-[#F43F5E]/30 text-[10px] text-[#9ca3af]">
                <div className="flex items-center gap-1.5">
                  <QrCodeSVG value={student.barcode} size={36} lightBackground={true} />
                  <div>
                    <span className="text-white block font-mono font-bold">{student.barcode}</span>
                    <span className="text-[8px] text-[#F43F5E]">Tap / Scan for studio admission</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-[#F43F5E] font-semibold">Valid Thru</span>
                  <span className="block font-mono text-white">{student.subscription.endDate}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: ATTENDANCE HISTORY LOGS
          ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-base font-semibold text-[var(--text-primary)]">
                {language === 'ar' ? 'سجل حضور وانصراف الطالب' : 'Student Attendance Log'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Chronological list of all verified scanner and manual check-in entries.
              </p>
            </div>
            <button
              type="button"
              onClick={handleManualCheckIn}
              className="gold-btn px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'تسجيل حضور الآن' : 'Record Check-In Now'}</span>
            </button>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-card)] border-b border-[var(--border-subtle)] text-[var(--text-muted)] uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5">Record ID</th>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Class Title</th>
                    <th className="p-3.5">Verification Method</th>
                    <th className="p-3.5">Studio Wi-Fi</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
                  {studentAttendance.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--bg-card)] transition">
                      <td className="p-3.5 font-mono text-rose-400">{log.id}</td>
                      <td className="p-3.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span>{log.timestamp}</span>
                      </td>
                      <td className="p-3.5 font-medium">{log.classTitle}</td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                          <Scan className="w-3 h-3 text-rose-400" />
                          {log.verifiedMethod}
                        </span>
                      </td>
                      <td className="p-3.5 text-[var(--text-muted)] font-mono text-[10px]">
                        {log.wifiBssid ? 'Verified 5G' : 'Standard'}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            log.status === 'granted'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {studentAttendance.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs text-[var(--text-muted)] italic">
                        No attendance check-in records logged yet for this dancer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: BOUTIQUE PURCHASES & RETAIL LEDGER
          ========================================================================= */}
      {activeTab === 'boutique' && (
        <div className="space-y-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-base font-semibold text-[var(--text-primary)]">
                {language === 'ar' ? 'سجل مشتريات الطالب من البوتيك' : 'Boutique Purchases & POS Orders'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Apparel, shoes, accessories, and leotards purchased or charged to dancer account.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">
                {language === 'ar' ? 'إجمالي المشتريات:' : 'Total Retail Spent:'}
              </span>
              <span className="font-mono text-base font-bold text-rose-400">
                {formatCurrency(studentOrders.reduce((sum, o: any) => sum + Number(o?.total ?? o?.totalAmount ?? 0), 0), language)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {studentOrders.map((order) => (
              <div
                key={order.id}
                className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-rose-500/40 transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-rose-400 text-xs">{order.id}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">•</span>
                    <span className="text-xs text-[var(--text-secondary)]">{order.timestamp || order.date}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                        order.paymentMethod === 'wallet_debt'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {order.paymentMethod === 'wallet_debt' ? 'Charged on Debt' : order.paymentMethod.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {(order as any).items.map((it: any, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                      >
                        <ShoppingBag className="w-3 h-3 text-rose-400" />
                        <span>
                          {it?.product?.title || it?.title || 'Item'} ({it?.size || 'STD'}) × {it?.quantity ?? 1}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase">
                    {language === 'ar' ? 'إجمالي الطلب' : 'Order Total'}
                  </span>
                  <span className="font-mono text-lg font-bold text-rose-400">
                    {formatCurrency((order as any).total ?? (order as any).totalAmount ?? 0, language)}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">By: {order.processedBy}</span>
                </div>
              </div>
            ))}

            {studentOrders.length === 0 && (
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-8 text-center text-xs text-[var(--text-muted)] italic">
                No boutique purchases logged yet for {student.name}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: SUBSCRIPTION & PACKAGE MANAGEMENT
          ========================================================================= */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-heading text-base font-semibold text-[var(--text-primary)] flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)]">
              <Award className="w-4 h-4 text-rose-400" />
              <span>{language === 'ar' ? 'تفاصيل باقة الباليه الحالية' : 'Active Subscription Package'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase block">Plan Tier</span>
                <strong className="text-sm text-[var(--text-primary)] block mt-0.5">{student.subscription.planName}</strong>
                <span className="text-xs text-rose-400 font-semibold block mt-1">
                  {formatCurrency(student.subscription.price, language)} / {language === 'ar' ? 'الدورة' : 'cycle'}
                </span>
              </div>

              <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase block">Billing Validity Window</span>
                <strong className="text-sm font-mono text-[var(--text-primary)] block mt-0.5">
                  {student.subscription.startDate} → {student.subscription.endDate}
                </strong>
                <span className="text-xs text-[var(--text-secondary)] block mt-1">
                  Status: <span className="text-emerald-400 uppercase font-semibold">{student.subscription.status}</span>
                </span>
              </div>

              <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase block">Session Consumption</span>
                <strong className="text-sm font-mono text-rose-400 block mt-0.5">
                  {student.subscription.usedSessions} used of {student.subscription.maxSessions} sessions
                </strong>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => updateSubscriptionQuota(student.id, -1)}
                    className="flex-1 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] hover:border-rose-500"
                  >
                    -1 Session
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSubscriptionQuota(student.id, 1)}
                    className="flex-1 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] hover:border-rose-500"
                  >
                    +1 Session
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Settle Debt Box */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-heading text-base font-semibold text-[var(--text-primary)] flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)]">
              <DollarSign className="w-4 h-4 text-rose-400" />
              <span>{language === 'ar' ? 'سداد المديونية / إيداع رصيد' : 'Ledger Debt Settlement & Credit Top-Up'}</span>
            </h3>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs text-[var(--text-secondary)]">
                  {language === 'ar' ? 'رصيد الحساب الحالي:' : 'Current Ledger Balance:'}
                </span>
                <span
                  className={`font-mono text-2xl font-bold block ${
                    student.walletBalance < 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {student.walletBalance < 0
                    ? `-${formatCurrency(Math.abs(student.walletBalance), language)}`
                    : formatCurrency(student.walletBalance, language)}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {language === 'ar' ? 'الحد الائتماني الأقصى للمديونية:' : 'Maximum Negative Credit Limit:'} -{formatCurrency(student.maxNegativeDebt, language)}
                </span>
              </div>

              <form onSubmit={handleSettleDebt} className="flex gap-2 w-full sm:w-auto">
                <input
                  type="number"
                  step="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  placeholder={language === 'ar' ? 'المبلغ (مثال: 500 ج.م)' : 'Amount (EGP e.g. 500)'}
                  className="form-gold-input px-3 py-2 rounded-xl text-xs w-48"
                />
                <button type="submit" className="gold-btn px-4 py-2 rounded-xl text-xs font-semibold">
                  {language === 'ar' ? 'تسجيل السداد' : 'Apply Settlement'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: EVALUATIONS & STAFF REMARKS
          ========================================================================= */}
      {activeTab === 'evaluations' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left: Technique Evaluations */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-heading text-base font-semibold text-[var(--text-primary)] flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)]">
              <Award className="w-4 h-4 text-rose-400" />
              <span>Technical Skill Evaluations</span>
            </h3>

            <div className="space-y-3">
              {studentEvals.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-subtle)] space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <strong className="text-rose-400 font-medium">{ev.evaluatorName}</strong>
                    <span className="text-[10px] text-[var(--text-muted)]">{ev.date}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--border-subtle)]">
                      <span className="text-[10px] text-[var(--text-muted)] block">Barre</span>
                      <strong className="text-rose-400">{ev.barreTechnique}/10</strong>
                    </div>
                    <div className="bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--border-subtle)]">
                      <span className="text-[10px] text-[var(--text-muted)] block">Allegro</span>
                      <strong className="text-rose-400">{ev.allegroJumps}/10</strong>
                    </div>
                    <div className="bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--border-subtle)]">
                      <span className="text-[10px] text-[var(--text-muted)] block">Pointe</span>
                      <strong className="text-rose-400">{ev.pointeStability}/10</strong>
                    </div>
                    <div className="bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--border-subtle)]">
                      <span className="text-[10px] text-[var(--text-muted)] block">Artistry</span>
                      <strong className="text-rose-400">{ev.musicalityArtistry}/10</strong>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed">
                    "{ev.remarks}"
                  </p>
                </div>
              ))}

              {studentEvals.length === 0 && (
                <p className="text-center py-8 text-xs text-[var(--text-muted)] italic">
                  No technical jury evaluations recorded yet.
                </p>
              )}
            </div>
          </div>

          {/* Right: Staff Remarks & Private Notes */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-heading text-base font-semibold text-[var(--text-primary)] flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)]">
              <BookOpen className="w-4 h-4 text-rose-400" />
              <span>Internal Staff Notes</span>
            </h3>

            {/* Add note form */}
            <form onSubmit={handleAddNote} className="space-y-2 bg-[var(--bg-card)] p-3.5 rounded-xl border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-primary)]">Add Private Remark</span>
                <select
                  value={newNoteCategory}
                  onChange={(e) => setNewNoteCategory(e.target.value as any)}
                  className="form-gold-input px-2 py-1 rounded-lg text-[11px] bg-[var(--bg-surface)]"
                >
                  <option value="general">General</option>
                  <option value="medical">Medical / Physical</option>
                  <option value="tuition">Tuition / Debt</option>
                  <option value="performance">Artistic / Technique</option>
                </select>
              </div>

              <textarea
                rows={2}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Log internal note regarding dancer development, medical updates, or tuition..."
                className="w-full form-gold-input p-2.5 rounded-xl text-xs"
              />

              <button type="submit" className="gold-btn px-4 py-1.5 rounded-lg text-xs font-semibold">
                Save Remark
              </button>
            </form>

            {/* Notes List */}
            <div className="space-y-2.5 max-h-96 overflow-y-auto">
              {studentDossierNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-subtle)] space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-rose-400">
                      {note.authorName} ({note.authorRole})
                    </span>
                    <span className="text-[var(--text-muted)]">{note.timestamp}</span>
                  </div>
                  <p className="text-xs text-[var(--text-primary)] leading-relaxed">{note.text}</p>
                </div>
              ))}
              {studentDossierNotes.length === 0 && (
                <p className="text-center py-8 text-xs text-[var(--text-muted)] italic">
                  No internal staff remarks on file.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'progress' && (
        <ProgressReportView studentId={student.id} />
      )}

      {/* Student Photo Upload Modal */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#171d2b] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-rose-400" />
                <span>
                  {language === 'ar' ? `تعديل صورة الطالب: ${student.name}` : `Student Photo: ${student.name}`}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ImageUploader
              value={formData.photoUrl || student.photoUrl}
              onChange={(val) => {
                handleFieldChange('photoUrl', val);
              }}
              onRemove={() => {
                handleFieldChange('photoUrl', '');
              }}
              label={language === 'ar' ? 'صورة الطالب (اختياري)' : 'Student Photo (Optional)'}
              description={language === 'ar'
                ? 'يمكنك رفع صورة جديدة من جهازك أو حذف الصورة للرجوع إلى الافتراضي (اختياري).'
                : 'Upload a new picture from your device or remove it to restore the academy default (optional).'}
              optionalBadge={true}
              language={language}
              shape="rounded"
              size="lg"
            />

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-medium cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  updateStudent(student.id, { photoUrl: formData.photoUrl || '' });
                  showToast(
                    language === 'ar' ? 'تم تحديث الصورة' : 'Photo Updated',
                    formData.photoUrl
                      ? (language === 'ar' ? 'تم حفظ صورة الطالب بنجاح.' : 'Student photo saved successfully.')
                      : (language === 'ar' ? 'تمت استعادة الصورة الافتراضية بنجاح.' : 'Reset to default student photo.'),
                    'success'
                  );
                  setIsPhotoModalOpen(false);
                }}
                className="action-btn-coral px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <span>{language === 'ar' ? 'حفظ وتحديث' : 'Save Photo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

        </div>
    </div>
    </div>
  );
};

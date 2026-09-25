import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { StaffMember, UserRole } from '../types';
import { ImageUploader } from './ImageUploader';
import {
  ArrowLeft,
  Shield,
  Mail,
  Phone,
  Building2,
  Calendar,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  GraduationCap,
  Sparkles,
  Lock,
  Clock,
  Briefcase,
  Layers,
  X,
  Camera,
  Upload,
} from 'lucide-react';

interface StaffProfilePageProps {
  staffId: string;
  onBack: () => void;
}

export const StaffProfilePage: React.FC<StaffProfilePageProps> = ({ staffId, onBack }) => {
  const {
    staffList,
    currentUser,
    roleConfigs,
    courses,
    courseSessions,
    auditLogs,
    language,
    updateStaffRole,
    updateStaffAvatar,
    toggleStaffShift,
    resetStaffPassword,
    showToast,
  } = useAdmin();

  const isRtl = language === 'ar';
  const staff = staffList.find((s) => s.id === staffId);

  // Photo Upload Modal State
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoDraft, setPhotoDraft] = useState('');
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'security' | 'activity'>('overview');

  // Role Change Modal & Validation State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<UserRole>('instructor');
  const [roleReason, setRoleReason] = useState('');
  const [adminPinConfirm, setAdminPinConfirm] = useState('');
  const [roleValidationError, setRoleValidationError] = useState('');
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);

  // Reset Password / PIN Modal State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  if (!staff) {
    return (
      <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-12 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-xl font-heading font-semibold text-white">
          {isRtl ? 'لم يتم العثور على الملف الشخصي' : 'Staff Profile Not Found'}
        </h2>
        <p className="text-xs text-slate-400">
          The requested staff record ({staffId}) does not exist in the active directory.
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white inline-flex items-center gap-2 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isRtl ? 'العودة' : 'Return to Directory'}</span>
        </button>
      </div>
    );
  }

  const roleConfig = (staff && roleConfigs[staff.role]) || roleConfigs.instructor;
  const isSuperadminOrOwner = currentUser?.role === 'superadmin' || currentUser?.role === 'owner';
  const isCurrentUser = currentUser?.id === staff.id;

  // Assigned Courses (if instructor)
  const assignedCourses = courses.filter((c) => c.instructorId === staff.id);
  const assignedSessions = courseSessions.filter((s) => s.instructorId === staff.id);

  // Filtered Audit Logs
  const staffLogs = auditLogs.filter(
    (l) => l.actorName.toLowerCase().includes(staff.name.toLowerCase()) || l.details.includes(staff.id)
  );

  // Validate and submit role transition
  const handleRoleTransitionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRoleValidationError('');

    // Security validation checks
    if (!isSuperadminOrOwner) {
      setRoleValidationError('Only academy Directors and Board Owners have authorization to change roles.');
      return;
    }

    if (staff.role === 'owner' && targetRole !== 'owner' && currentUser?.id === staff.id) {
      setRoleValidationError('Board owners cannot demote their own account.');
      return;
    }

    if (!roleReason.trim() || roleReason.trim().length < 5) {
      setRoleValidationError('Please provide a valid administrative rationale (minimum 5 characters).');
      return;
    }

    if (adminPinConfirm.trim() !== 'etoile2026' || adminPinConfirm.trim().length < 4) {
      setRoleValidationError('Please enter a valid administrator confirmation PIN.');
      return;
    }

    setIsSubmittingRole(true);
    try {
      updateStaffRole(staff.id, targetRole);
      showToast(
        'Role Updated',
        `Successfully transferred ${staff.name} to ${roleConfigs[targetRole]?.title || targetRole}.`,
        'success'
      );
      setIsRoleModalOpen(false);
      setRoleReason('');
      setAdminPinConfirm('');
    } catch {
      setRoleValidationError('An unexpected error occurred while updating the role.');
    } finally {
      setIsSubmittingRole(false);
    }
  };

  // Handle PIN reset
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    if (newPin.length < 4) {
      setPinError('PIN must be at least 4 characters/digits.');
      return;
    }

    if (newPin !== confirmPin) {
      setPinError('PIN confirmation does not match.');
      return;
    }

    const ok = await resetStaffPassword(staff.id, newPin);
    if (ok) {
      setIsPinModalOpen(false);
      setNewPin('');
      setConfirmPin('');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#171d2b] hover:bg-[#1c2333] border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isRtl ? 'العودة' : 'Back to Team Directory'}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Shift status badge button */}
          <button
            onClick={() => toggleStaffShift(staff.id)}
            className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              staff.shiftStatus === 'on_duty'
                ? 'status-pill-emerald'
                : 'bg-[#111622] text-slate-400 border border-white/10 hover:text-white'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${staff.shiftStatus === 'on_duty' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span>
              {staff.shiftStatus === 'on_duty'
                ? isRtl ? 'مداوم حالياً (On Duty)' : 'On Duty'
                : isRtl ? 'خارج الوردية (Off Shift)' : 'Off Shift'}
            </span>
          </button>

          {/* Change Role Button (Opens Protected Modal with Validation) */}
          {isSuperadminOrOwner && (
            <button
              onClick={() => {
                setTargetRole(staff.role);
                setRoleReason('');
                setAdminPinConfirm('');
                setRoleValidationError('');
                setIsRoleModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isRtl ? 'تعديل الصلاحية مع التحقق' : 'Change Role & Permissions'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative group flex-shrink-0">
              <img
                src={staff.avatar || staff.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80'}
                alt={staff.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-white/20 shadow-lg group-hover:border-rose-400 transition"
              />
              <button
                type="button"
                onClick={() => {
                  setPhotoDraft(staff.avatar || staff.avatarUrl || '');
                  setIsPhotoModalOpen(true);
                }}
                className="absolute inset-0 rounded-2xl bg-black/55 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition backdrop-blur-[1px] cursor-pointer"
                title={isRtl ? 'تعديل أو رفع الصورة' : 'Change profile picture'}
              >
                <Camera className="w-5 h-5 text-rose-300" />
                <span className="text-[10px] font-semibold mt-0.5">{isRtl ? 'تغيير' : 'Change'}</span>
              </button>
              <span
                className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[#171d2b] ${
                  staff.shiftStatus === 'on_duty' ? 'bg-emerald-500' : 'bg-slate-500'
                }`}
              />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {staff.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white border border-white/15">
                  {roleConfig.badge}
                </span>
                {isCurrentUser && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    You
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPhotoDraft(staff.avatar || staff.avatarUrl || '');
                    setIsPhotoModalOpen(true);
                  }}
                  className="px-2.5 py-0.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/35 text-[11px] font-semibold text-rose-300 hover:text-white inline-flex items-center gap-1 transition cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  <span>{isRtl ? 'تعديل الصورة' : 'Upload Photo'}</span>
                </button>
              </div>

              <p className="text-xs text-slate-300 font-medium">
                {staff.specialization || staff.department || 'Academy Faculty'}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1 font-mono">
                <span>ID: {staff.id}</span>
                <span>•</span>
                <span>Role: <strong className="text-white capitalize">{staff.role}</strong></span>
                {staff.hireDate && (
                  <>
                    <span>•</span>
                    <span>Joined: {staff.hireDate}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-col items-end gap-2 self-stretch sm:self-auto justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
            <button
              onClick={() => {
                setNewPin('');
                setConfirmPin('');
                setPinError('');
                setIsPinModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#111622] hover:bg-white/5 border border-white/10 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>{isRtl ? 'إعادة تعيين الرمز السري' : 'Reset Access PIN'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-6 mt-6 border-t border-white/10 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview & Details', icon: <UserCheck className="w-4 h-4" /> },
            { id: 'assignments', label: `Classes & Teaching (${assignedCourses.length})`, icon: <GraduationCap className="w-4 h-4" /> },
            { id: 'security', label: 'RBAC Access & Permissions', icon: <Shield className="w-4 h-4" /> },
            { id: 'activity', label: `Activity Trail (${staffLogs.length})`, icon: <Clock className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-slate-950 shadow-md'
                  : 'bg-[#111622] text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact & Studio Details */}
          <div className="lg:col-span-2 bg-[#171d2b] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="font-heading text-base font-semibold text-white flex items-center gap-2 pb-2 border-b border-white/10">
              <Briefcase className="w-4 h-4 text-slate-400" />
              <span>Contact & Administrative Assignment</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#111622] border border-white/5 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Work Email</span>
                <span className="text-white font-mono text-sm block truncate">{staff.email}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#111622] border border-white/5 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Contact Phone</span>
                <span className="text-white font-mono text-sm block">{staff.phone || '+20 10 0000 0000'}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#111622] border border-white/5 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Assigned Location / Studio</span>
                <span className="text-white text-sm block">{staff.studio || 'Executive Direction & Zamalek'}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#111622] border border-white/5 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Academic Specialization</span>
                <span className="text-white text-sm block">{staff.specialization || 'Classical Technique'}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#111622] border border-white/5 text-xs text-slate-300 space-y-2">
              <span className="text-slate-400 text-[10px] uppercase font-semibold block">Role Description & Operational Mandate</span>
              <p className="leading-relaxed text-slate-300">
                {roleConfig.description}
              </p>
            </div>
          </div>

          {/* Role Status Card */}
          <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="font-heading text-base font-semibold text-white flex items-center gap-2 pb-2 border-b border-white/10">
                <Shield className="w-4 h-4 text-slate-400" />
                <span>Security Standing</span>
              </h3>

              <div className="p-4 rounded-xl bg-[#111622] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Current Role:</span>
                  <span className="font-bold text-xs text-white capitalize">{staff.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Shift Status:</span>
                  <span className="font-bold text-xs text-emerald-400">
                    {staff.shiftStatus === 'on_duty' ? 'Active On-Duty' : 'Off Shift'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Allowed Areas:</span>
                  <span className="font-bold text-xs text-slate-300">{roleConfig.allowedTabs.length} modules</span>
                </div>
              </div>
            </div>

            {isSuperadminOrOwner && (
              <button
                onClick={() => {
                  setTargetRole(staff.role);
                  setRoleReason('');
                  setAdminPinConfirm('');
                  setRoleValidationError('');
                  setIsRoleModalOpen(true);
                }}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Change Assigned Role</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="font-heading text-base font-semibold text-white">
            Assigned Courses & Scheduled Sessions
          </h3>

          {assignedCourses.length === 0 && assignedSessions.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center italic">
              No specific courses or sessions currently mapped to this staff account.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedCourses.map((c) => (
                <div key={c.id} className="p-4 rounded-xl bg-[#111622] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{c.title}</span>
                    <span className="font-mono text-xs text-slate-400">{c.code}</span>
                  </div>
                  <p className="text-xs text-slate-400 capitalize">{c.program} Ballet • Level: {c.level}</p>
                  <div className="text-xs text-slate-300 flex items-center justify-between pt-1 border-t border-white/5">
                    <span>Days: {c.dayOfWeek}</span>
                    <span>{c.startTime} - {c.endTime}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: SECURITY & PERMISSIONS */}
      {activeTab === 'security' && (
        <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div>
              <h3 className="font-heading text-base font-semibold text-white">
                Role-Based Access Control (RBAC)
              </h3>
              <p className="text-xs text-slate-400">
                Current operational modules accessible under the assigned <strong className="text-white capitalize">{staff.role}</strong> role.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {roleConfig.allowedTabs.map((tabId) => (
              <div key={tabId} className="p-3 rounded-xl bg-[#111622] border border-emerald-500/20 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-white capitalize">{tabId.replace('_', ' ')} Module</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: ACTIVITY TRAIL */}
      {activeTab === 'activity' && (
        <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="font-heading text-base font-semibold text-white">
            Audit Trail & Account Log
          </h3>

          {staffLogs.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center italic">
              No recent audit records found for this account.
            </p>
          ) : (
            <div className="divide-y divide-white/5">
              {staffLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                  <div>
                    <strong className="text-white block">{log.action}</strong>
                    <span className="text-slate-400 text-[11px]">{log.details}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">{log.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          PROTECTED ROLE CHANGE MODAL (WITH VALIDATION & EXPLICIT CONFIRMATION)
          ========================================================================= */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#171d2b] border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-indigo-400">
                <Shield className="w-5 h-5" />
                <h3 className="font-heading text-lg font-bold text-white">
                  Change Role & Permissions
                </h3>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRoleTransitionSubmit} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#111622] border border-white/5 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Target Staff Member</span>
                <span className="text-white font-bold text-sm block">{staff.name}</span>
                <span className="text-slate-400 text-[11px] block">{staff.email} • Current: {staff.role}</span>
              </div>

              {roleValidationError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{roleValidationError}</span>
                </div>
              )}

              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">
                  Select New Operational Role:
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-white/10 text-white focus:outline-none focus:border-indigo-400 text-xs cursor-pointer shadow-inner"
                >
                  <option value="superadmin">Academy Director (Superadmin)</option>
                  <option value="owner">Board Member / Owner</option>
                  <option value="instructor">Ballet Teacher / Instructor</option>
                  <option value="receptionist">Front-Desk Receptionist</option>
                </select>
                <span className="text-[11px] text-slate-400 block">
                  {roleConfigs[targetRole]?.description}
                </span>
              </div>

              {/* Administrative Justification Reason */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">
                  Administrative Reason for Role Modification: <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={roleReason}
                  onChange={(e) => setRoleReason(e.target.value)}
                  placeholder="e.g. Promoted to Senior Ballet Coach for conservatory classes..."
                  className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 text-xs"
                />
              </div>

              {/* Admin PIN Validation */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">
                  Director / Owner Verification PIN: <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={adminPinConfirm}
                  onChange={(e) => setAdminPinConfirm(e.target.value)}
                  placeholder="Enter confirmation PIN (e.g. etoile2026)"
                  className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 text-xs font-mono"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingRole}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingRole ? 'Updating...' : 'Confirm Role Update'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#111622] hover:bg-white/5 border border-white/10 text-slate-300 text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          RESET PIN MODAL
          ========================================================================= */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#171d2b] border border-white/10 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-heading text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-slate-300" />
                <span>Reset Staff Access PIN</span>
              </h3>
              <button
                onClick={() => setIsPinModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-3.5 text-xs">
              {pinError && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {pinError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">New PIN / Password:</label>
                <input
                  type="password"
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Minimum 4 characters"
                  className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-white/10 text-white text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Confirm PIN:</label>
                <input
                  type="password"
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Re-enter PIN"
                  className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-white/10 text-white text-xs font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-white text-slate-950 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
                >
                  Save New PIN
                </button>
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-[#111622] border border-white/10 text-slate-300 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Profile Photo Upload Modal */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#171d2b] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-rose-400" />
                <span>
                  {isRtl ? `تعديل صورة: ${staff.name}` : `Staff Photo: ${staff.name}`}
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
              value={photoDraft}
              onChange={(val) => setPhotoDraft(val)}
              onRemove={() => setPhotoDraft('')}
              label={isRtl ? 'صورة الملف الشخصي' : 'Profile Picture'}
              description={isRtl
                ? 'يمكنك رفع صورة شخصية للمدرب أو موظف الاستقبال، أو حذفها والعودة للصورة الافتراضية (اختياري).'
                : 'Upload a picture for this instructor/receptionist, or remove it to restore the academy default (optional).'}
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
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isSavingPhoto}
                onClick={async () => {
                  setIsSavingPhoto(true);
                  try {
                    await updateStaffAvatar(staff.id, photoDraft);
                    setIsPhotoModalOpen(false);
                  } finally {
                    setIsSavingPhoto(false);
                  }
                }}
                className="action-btn-coral px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingPhoto ? (
                  <span>{isRtl ? 'جارٍ الحفظ...' : 'Saving...'}</span>
                ) : (
                  <span>{isRtl ? 'حفظ التعديل' : 'Save Photo'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

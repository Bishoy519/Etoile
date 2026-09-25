import React, { useMemo, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { SectionCard } from './ui';
import { ImageUploader } from './ImageUploader';
import {
  User, Mail, Phone, Building2, CalendarDays, Clock, MapPin,
  KeyRound, ShieldCheck, CheckCircle2, AlertTriangle, GraduationCap,
  Camera, Upload, Trash2, X,
} from 'lucide-react';

/**
 * MyProfilePage — personal profile for EVERY logged-in staff member.
 * Shows: identity, role & access, my schedule (courses + sessions),
 * shift status, and self-service password change.
 */
export const MyProfilePage: React.FC = () => {
  const {
    currentUser, language, roleConfigs,
    courses, courseSessions, staffList,
    toggleStaffShift, resetStaffPassword, updateStaffAvatar, showToast, logCrmAction,
  } = useAdmin();
  const isRtl = language === 'ar';

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  // Profile Photo Upload Modal State
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoDraft, setPhotoDraft] = useState('');
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);

  const staff = useMemo(
    () => staffList.find((s) => s.id === currentUser?.id) || currentUser,
    [staffList, currentUser]
  );

  const roleConfig = (staff && roleConfigs[staff.role]) || roleConfigs.superadmin;

  const myCourses = useMemo(() => {
    if (!staff) return [];
    // Instructors: only assigned. Others: all active (overview of academy load).
    if (staff.role === 'instructor') return courses.filter((c) => c.instructorId === staff.id);
    return courses;
  }, [courses, staff]);

  const mySessions = useMemo(() => {
    if (!staff) return [];
    const now = new Date();
    const upcoming = courseSessions
      .filter((s) => {
        if (staff.role === 'instructor' && s.instructorId !== staff.id) return false;
        try {
          const d = new Date(s.sessionDate);
          return d >= new Date(now.toDateString());
        } catch { return true; }
      })
      .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())
      .slice(0, 12);
    return upcoming;
  }, [courseSessions, staff]);

  if (!staff) {
    return (
      <div className="premium-card p-10 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-300 mx-auto" />
        <p className="text-sm text-slate-300 mt-3">{isRtl ? 'لا يوجد مستخدم مسجل.' : 'No logged-in user.'}</p>
      </div>
    );
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (newPass.length < 4) {
      setPassError(isRtl ? 'كلمة المرور 4 أحرف على الأقل.' : 'Password must be at least 4 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError(isRtl ? 'التأكيد غير متطابق.' : 'Confirmation does not match.');
      return;
    }
    setSavingPass(true);
    try {
      const ok = await resetStaffPassword(staff.id, newPass);
      if (ok) {
        setNewPass('');
        setConfirmPass('');
        logCrmAction('Own Password Changed', `${staff.name} changed own password from My Profile`, 'auth');
        showToast(isRtl ? 'تم التحديث' : 'Password updated', isRtl ? 'تم تغيير كلمة المرور بنجاح.' : 'Your password was changed successfully.', 'success');
      }
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-up max-w-6xl">
      {/* Identity hero */}
      <div className="premium-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5">
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
            title={isRtl ? 'تحديث صورتك الشخصية' : 'Update your profile photo'}
          >
            <Camera className="w-5 h-5 text-rose-300" />
            <span className="text-[10px] font-semibold mt-1">{isRtl ? 'تغيير' : 'Change'}</span>
          </button>
          <span
            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#111622] ${
              staff.shiftStatus === 'on_duty' ? 'bg-emerald-500' : 'bg-slate-500'
            }`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-xl font-extrabold text-white truncate">{isRtl && staff.nameAr ? staff.nameAr : staff.name}</h2>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white">{roleConfig.badge}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${staff.shiftStatus === 'on_duty' ? 'status-pill-emerald' : 'status-pill-slate'}`}>
              {staff.shiftStatus === 'on_duty' ? (isRtl ? 'مداوم' : 'On Duty') : (isRtl ? 'خارج الوردية' : 'Off Shift')}
            </span>
            <button
              type="button"
              onClick={() => {
                setPhotoDraft(staff.avatar || staff.avatarUrl || '');
                setIsPhotoModalOpen(true);
              }}
              className="px-2.5 py-0.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/35 text-[11px] font-semibold text-rose-300 hover:text-white inline-flex items-center gap-1 transition cursor-pointer"
            >
              <Camera className="w-3 h-3" />
              <span>{isRtl ? 'رفع صورة' : 'Upload Photo'}</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-amber-300" /><span className="font-mono">{staff.email}</span></span>
            {staff.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-amber-300" /><span className="font-mono">{staff.phone}</span></span>}
            <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-amber-300" />{isRtl ? (staff.departmentAr || staff.department) : (staff.department || staff.studio)}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">{isRtl ? roleConfig.descriptionAr : roleConfig.description}</p>
        </div>
        <button
          onClick={() => toggleStaffShift(staff.id)}
          className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-slate-200 transition"
        >
          {staff.shiftStatus === 'on_duty' ? (isRtl ? 'إنهاء الوردية' : 'End shift') : (isRtl ? 'بدء الوردية' : 'Start shift')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* My schedule */}
        <SectionCard
          title={isRtl ? 'جدولي ومهامي' : 'My schedule & load'}
          subtitle={staff.role === 'instructor'
            ? (isRtl ? 'الدورات والحصص المسندة إليك' : 'Courses & sessions assigned to you')
            : (isRtl ? 'نظرة عامة على حمل الأكاديمية' : 'Academy load overview')}
          icon={<CalendarDays className="w-4 h-4 text-sky-300" />}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <GraduationCap className="w-4 h-4 text-amber-300" />
              <span>{isRtl ? 'الدورات' : 'Courses'} ({myCourses.length})</span>
            </div>
            {myCourses.length === 0 && <p className="text-[11px] text-slate-500 italic">{isRtl ? 'لا دورات مسندة بعد.' : 'No courses assigned yet.'}</p>}
            <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
              {myCourses.slice(0, 8).map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.07]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white truncate">{isRtl && c.titleAr ? c.titleAr : c.title}</span>
                    <span className="font-mono text-[10px] text-amber-300">{c.code}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.startTime} - {c.endTime}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.studioRoom}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-white pt-2 border-t border-white/[0.07]">
              <Clock className="w-4 h-4 text-emerald-300" />
              <span>{isRtl ? 'الحصص القادمة' : 'Upcoming sessions'} ({mySessions.length})</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {mySessions.map((s) => (
                <div key={s.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.07] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{s.title}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{String(s.sessionDate).split('T')[0]} • {s.startTime} • {s.studioRoom}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${s.status === 'scheduled' ? 'status-pill-blue' : s.status === 'completed' ? 'status-pill-emerald' : 'status-pill-slate'}`}>{s.status}</span>
                </div>
              ))}
              {mySessions.length === 0 && <p className="text-[11px] text-slate-500 italic">{isRtl ? 'لا حصص قادمة.' : 'No upcoming sessions.'}</p>}
            </div>
          </div>
        </SectionCard>

        {/* Access */}
        <SectionCard
          title={isRtl ? 'صلاحياتي' : 'My access'}
          subtitle={isRtl ? 'الصفحات المتاحة لدورك' : 'Pages available to your role'}
          icon={<ShieldCheck className="w-4 h-4 text-emerald-300" />}
        >
          <div className="grid grid-cols-1 gap-2">
            {roleConfig.allowedTabs.map((t) => (
              <div key={t} className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-white capitalize">{t.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            {isRtl ? 'لتعديل الصلاحيات تواصل مع المالك من الإعدادات.' : 'To change permissions contact the Owner via Settings → Roles & Access.'}
          </p>
        </SectionCard>

        {/* Change password */}
        <SectionCard
          title={isRtl ? 'تغيير كلمة المرور' : 'Change password'}
          subtitle={isRtl ? 'حدّث رمز الدخول الخاص بك' : 'Update your own login credentials'}
          icon={<KeyRound className="w-4 h-4 text-amber-300" />}
        >
          <form onSubmit={handleChangePassword} className="space-y-3">
            {passError && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-semibold flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />{passError}
              </div>
            )}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{isRtl ? 'الجديدة' : 'New password'}</label>
              <input
                type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)}
                placeholder="••••••••" autoComplete="new-password"
                className="input-premium w-full text-xs px-3 py-2.5 mt-1.5 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{isRtl ? 'التأكيد' : 'Confirm'}</label>
              <input
                type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="••••••••" autoComplete="new-password"
                className="input-premium w-full text-xs px-3 py-2.5 mt-1.5 font-mono"
              />
            </div>
            <button type="submit" disabled={savingPass} className="gold-btn w-full py-2.5 text-xs font-bold disabled:opacity-50">
              {savingPass ? (isRtl ? 'جارٍ الحفظ…' : 'Saving…') : (isRtl ? 'حفظ كلمة المرور' : 'Save new password')}
            </button>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.07]">
              <User className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {isRtl ? 'سيُطلب منك تسجيل الدخول مجدداً على الأجهزة الأخرى.' : 'You may need to sign in again on other devices after changing.'}
              </p>
            </div>
          </form>
        </SectionCard>
      </div>

      {/* Profile Photo Upload Modal */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#171d2b] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-rose-400" />
                <span>{isRtl ? 'تحديث صورتك الشخصية' : 'Update Profile Photo'}</span>
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
              label={isRtl ? 'صورتك الشخصية' : 'Personal Photo'}
              description={isRtl
                ? 'يمكنك رفع صورة شخصية من جهازك أو حذفها في أي وقت (الصورة اختيارية).'
                : 'Upload a personal picture from your device or remove it at any time (optional).'}
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
                  <span>{isRtl ? 'حفظ الصورة' : 'Save Photo'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfilePage;

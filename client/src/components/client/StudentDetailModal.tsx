import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, User, Phone, Barcode, GraduationCap, Users, CalendarCheck } from 'lucide-react';

interface StudentDetailModalProps {
  student: any | null;
  contextTitle?: string;
  onClose: () => void;
}

/**
 * Read-only dancer detail sheet for portal rosters (e.g. instructor class
 * lists). Renders whatever fields the roster payload carries and omits the
 * rest — roster snapshots are intentionally partial.
 */
export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  contextTitle,
  onClose,
}) => {
  const { language } = useApp();

  if (!student) return null;

  const displayName =
    language === 'ar' ? student.nameAr || student.name : student.name;
  const subscription = student.subscription || null;
  const remaining =
    subscription != null
      ? Math.max(0, (subscription.maxSessions || 0) - (subscription.usedSessions || 0))
      : null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#101314] border border-brand-gold/60 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative h-28 bg-gradient-to-br from-brand-gold/30 via-[#14181b] to-[#090b0c] rounded-t-3xl">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 rtl:right-auto rtl:left-3 w-8 h-8 rounded-full border border-brand-gold/30 text-brand-gold/70 hover:text-brand-gold-light flex items-center justify-center transition bg-black/40"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Identity */}
        <div className="px-6 pb-6 -mt-12 text-center">
          <img
            src={student.photoUrl || student.avatarUrl || '/hero-ballerina.jpg'}
            alt={displayName}
            className="w-24 h-24 rounded-3xl object-cover border-2 border-brand-gold mx-auto shadow-[0_0_25px_rgba(202,168,104,0.35)] bg-[#090b0c]"
          />
          <h3 className="font-serif text-2xl text-[#fdf1c2] mt-3">{displayName}</h3>
          {student.nameAr && language !== 'ar' && (
            <p className="text-xs text-brand-muted/70 mt-0.5">{student.nameAr}</p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
            {student.level && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-brand-gold/15 border border-brand-gold/40 text-brand-gold">
                <GraduationCap className="w-3 h-3" />
                {student.level}
              </span>
            )}
            {student.program && (
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-brand-muted capitalize">
                {student.program}
              </span>
            )}
          </div>

          {contextTitle && (
            <p className="text-[11px] text-brand-muted/70 mt-2 flex items-center justify-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-brand-gold/70" />
              {contextTitle}
            </p>
          )}

          {/* Facts */}
          <div className="mt-5 space-y-2 text-start">
            {(student.barcode || student.id) && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#090b0c] border border-brand-gold/15 text-xs">
                <Barcode className="w-4 h-4 text-brand-gold shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-wider text-brand-muted/60">
                    {language === 'ar' ? 'كود البطاقة' : 'Academy Card'}
                  </span>
                  <span className="font-mono text-white">{student.barcode || student.id}</span>
                </div>
              </div>
            )}
            {(student.parentName || student.parentPhone) && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#090b0c] border border-brand-gold/15 text-xs">
                <Phone className="w-4 h-4 text-brand-gold shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-wider text-brand-muted/60">
                    {language === 'ar' ? 'ولي الأمر' : 'Parent / Guardian'}
                  </span>
                  <span className="text-white block truncate">
                    {student.parentName}
                    {student.parentPhone ? ` • ${student.parentPhone}` : ''}
                  </span>
                </div>
              </div>
            )}
            {subscription && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#090b0c] border border-brand-gold/15 text-xs">
                <CalendarCheck className="w-4 h-4 text-brand-gold shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="block text-[10px] uppercase tracking-wider text-brand-muted/60">
                    {subscription.planName || (language === 'ar' ? 'الباقة' : 'Package')}
                  </span>
                  <span className="text-white block">
                    {remaining} / {subscription.maxSessions}{' '}
                    {language === 'ar' ? 'حصص متبقية' : 'sessions left'}
                  </span>
                </div>
              </div>
            )}
            {!student.barcode && !student.id && !student.parentName && !subscription && (
              <p className="text-[11px] text-brand-muted/60 text-center py-2 flex items-center justify-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {language === 'ar'
                  ? 'ملف مختصر من سجل الحصة — التفاصيل الكاملة لدى الاستقبال.'
                  : 'Roster snapshot — full dossier available at reception.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailModal;

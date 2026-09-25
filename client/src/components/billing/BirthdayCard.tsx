import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api, errMsg } from '../../utils/api';
import { Cake, Loader2 } from 'lucide-react';

function daysUntilBirthday(birthDate: string): number | null {
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  const next = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
  if (next.getTime() < now.getTime() - 86400000) next.setFullYear(next.getFullYear() + 1);
  return Math.ceil((next.getTime() - now.getTime()) / 86400000);
}

/** Birthday badge + family self-service editor for the active dancer. */
export const BirthdayCard: React.FC<{ studentId: string; birthDate?: string | null; studentName: string }> = ({
  studentId,
  birthDate,
  studentName,
}) => {
  const { language, showToast, refreshFamily } = useApp();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const days = birthDate ? daysUntilBirthday(birthDate) : null;

  const save = async () => {
    if (!value) return;
    setSaving(true);
    try {
      await api.patch(`/api/students/${studentId}/birthdate`, { birthDate: value });
      setEditing(false);
      await refreshFamily();
      showToast(language === 'ar' ? 'تم الحفظ' : 'Saved', '', 'success');
    } catch (e: unknown) {
      showToast(language === 'ar' ? 'تعذر الحفظ' : 'Save failed', errMsg(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-label={language === 'ar' ? 'عيد الميلاد' : 'Birthday'} className="gold-card rounded-2xl p-4 flex flex-wrap items-center gap-3">
      <span className="w-10 h-10 rounded-full bg-pink-500/15 border border-pink-500/30 flex items-center justify-center shrink-0">
        <Cake className="w-5 h-5 text-pink-300" />
      </span>
      <div className="flex-1 min-w-[140px]">
        {days === null ? (
          <>
            <p className="text-xs font-bold text-white">
              {language === 'ar' ? `أضيفي عيد ميلاد ${studentName}` : `Add ${studentName}'s birthday`}
            </p>
            <p className="text-[11px] text-brand-muted/60">
              {language === 'ar' ? 'لنفاجئها يومها الخاص.' : 'So we can celebrate her special day.'}
            </p>
          </>
        ) : days <= 30 ? (
          <>
            <p className="text-xs font-bold text-white" dir="ltr">
              🎂 {new Date(birthDate as string).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long' })}
              {' · '}
              {days === 0
                ? (language === 'ar' ? 'اليوم!' : 'today!')
                : language === 'ar' ? `بعد ${days} يوم` : `in ${days} day${days === 1 ? '' : 's'}`}
            </p>
            <p className="text-[11px] text-brand-muted/60">{language === 'ar' ? 'عاملة مفاجأة؟ أخبرينا عبر واتساب.' : 'Planning a surprise? Tell us on WhatsApp.'}</p>
          </>
        ) : (
          <>
            <p className="text-xs font-bold text-white" dir="ltr">
              {new Date(birthDate as string).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long' })}
            </p>
            <p className="text-[11px] text-brand-muted/60">{language === 'ar' ? 'عيد ميلاد مسجل.' : 'Birthday on file.'}</p>
          </>
        )}
      </div>
      {editing ? (
        <span className="flex items-center gap-1.5">
          <input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            dir="ltr"
            aria-label="Birthdate"
            className="form-gold-input px-2.5 py-2 rounded-xl text-xs bg-[#101314]"
          />
          <button onClick={save} disabled={saving || !value} className="gold-btn px-3.5 py-2 rounded-xl text-black text-[11px] font-bold disabled:opacity-50 flex items-center gap-1">
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            {language === 'ar' ? 'حفظ' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="text-[11px] text-brand-muted/60 px-1">✕</button>
        </span>
      ) : (
        <button onClick={() => { setValue(birthDate ? String(birthDate).split('T')[0] : ''); setEditing(true); }} className="text-[11px] px-3 py-1.5 rounded-lg border border-brand-gold/30 text-brand-gold hover:bg-brand-gold/10">
          {birthDate ? (language === 'ar' ? 'تعديل' : 'Edit') : (language === 'ar' ? 'إضافة' : 'Add')}
        </button>
      )}
    </section>
  );
};

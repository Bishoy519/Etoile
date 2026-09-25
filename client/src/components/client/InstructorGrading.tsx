import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api, errMsg } from '../../utils/api';
import { Check, X, Loader2, Star, Save } from 'lucide-react';

/** Roll-call save bar: posts present/absent marks for one session (no quota impact). */
export const RollCallBar: React.FC<{
  sessionId: string;
  marks: Record<string, boolean>;
  count: number;
  onSaved: (msg: string) => void;
}> = ({ sessionId, marks, count, onSaved }) => {
  const { language, showToast } = useApp();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const records = Object.entries(marks).map(([studentId, present]) => ({ studentId, present }));
    if (records.length === 0) return;
    setSaving(true);
    try {
      const { data: body } = await api.post('/api/attendance/session-mark', { sessionId, records });
      onSaved(
        language === 'ar'
          ? `تم تسجيل الحضور: ${body.marked} حاضر، ${body.skipped} متخطى (بدون خصم حصص).`
          : `Roll-call saved: ${body.marked} marked, ${body.skipped} skipped (no quota deducted).`,
      );
    } catch (e) {
      showToast(language === 'ar' ? 'فشل الحفظ' : 'Save failed', errMsg(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      onClick={save}
      disabled={saving || count === 0}
      className="gold-btn w-full py-3 rounded-xl text-black font-serif text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {language === 'ar' ? `حفظ الحضور (${count})` : `Save roll-call (${count})`}
    </button>
  );
};

export const MarkToggle: React.FC<{
  value: boolean | undefined;
  onChange: (present: boolean) => void;
}> = ({ value, onChange }) => {
  const { language } = useApp();
  return (
    <span className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => onChange(true)}
        aria-pressed={value === true}
        aria-label={language === 'ar' ? 'حاضر' : 'Present'}
        className={`p-2 rounded-lg border transition ${value === true ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300' : 'border-white/10 text-slate-500 hover:text-emerald-300'}`}
      >
        <Check className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange(false)}
        aria-pressed={value === false}
        aria-label={language === 'ar' ? 'غائب' : 'Absent'}
        className={`p-2 rounded-lg border transition ${value === false ? 'border-rose-400 bg-rose-500/20 text-rose-300' : 'border-white/10 text-slate-500 hover:text-rose-300'}`}
      >
        <X className="w-4 h-4" />
      </button>
    </span>
  );
};

/** Per-dancer evaluation (0–10 × 4 axes) + optional performance note. */
export const GradeModal: React.FC<{
  student: { id: string; name: string; nameAr?: string };
  evaluator: string;
  onClose: () => void;
}> = ({ student, evaluator, onClose }) => {
  const { language, showToast } = useApp();
  const [scores, setScores] = useState({ barre: 8, center: 8, allegro: 8, musicality: 8 });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [award, setAward] = useState('');
  const [awarding, setAwarding] = useState(false);

  const save = async () => {
    setErr(null);
    for (const [k, v] of Object.entries(scores)) {
      if (!Number.isFinite(v) || v < 0 || v > 10) {
        setErr(language === 'ar' ? 'الدرجات بين 0 و 10' : `${k} must be between 0 and 10`);
        return;
      }
    }
    setSaving(true);
    try {
      await api.post(`/api/students/${student.id}/evaluations`, { evaluator, ...scores, notes: notes.trim() });
      if (notes.trim()) {
        await api.post(`/api/students/${student.id}/notes`, { text: notes.trim(), category: 'performance' }).catch(() => null);
      }
      showToast(
        language === 'ar' ? 'تم حفظ التقييم' : 'Evaluation saved',
        language === 'ar' ? `تقييم ${student.name} محفوظ.` : `Grades recorded for ${student.name}.`,
        'success',
      );
      onClose();
    } catch (e) {
      setErr(errMsg(e).slice(0, 200));
    } finally {
      setSaving(false);
    }
  };

  const axes = (['barre', 'center', 'allegro', 'musicality'] as const).map((k) => ({
    key: k,
    label: language === 'ar' ? { barre: 'البار', center: 'الوسط', allegro: 'الأليجرو', musicality: 'الموسيقية' }[k] : k[0].toUpperCase() + k.slice(1),
  }));

  return (
    <div role="dialog" aria-modal="true" aria-label={language === 'ar' ? 'تقييم الطالب' : 'Grade dancer'} className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#101314] border border-brand-gold/60 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-brand-gold/20 pb-3">
          <h3 className="font-serif text-xl text-[#fdf1c2] flex items-center gap-2">
            <Star className="w-5 h-5 text-brand-gold" />
            {language === 'ar' ? `تقييم ${student.nameAr || student.name}` : `Grade ${student.name}`}
          </h3>
          <button onClick={onClose} className="text-brand-muted hover:text-white" aria-label="Close">✕</button>
        </div>
        {axes.map((a) => (
          <div key={a.key}>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor={`grade-${a.key}`} className="text-xs uppercase tracking-wider text-brand-gold">{a.label}</label>
              <span className="font-mono text-sm text-white" dir="ltr">{scores[a.key].toFixed(1)} / 10</span>
            </div>
            <input
              id={`grade-${a.key}`}
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={scores[a.key]}
              onChange={(e) => setScores({ ...scores, [a.key]: Number(e.target.value) })}
              className="w-full accent-[#caa868]"
            />
          </div>
        ))}
        <div>
          <label htmlFor="grade-notes" className="block text-xs uppercase tracking-wider text-brand-gold mb-1">
            {language === 'ar' ? 'ملاحظات الأداء (اختياري)' : 'Performance notes (optional)'}
          </label>
          <textarea
            id="grade-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            dir="auto"
            className="form-gold-input w-full px-3 py-2 rounded-xl text-sm resize-none"
          />
        </div>
        {err && <p role="alert" className="text-[11px] text-red-400">{err}</p>}
        <div className="pt-2 border-t border-brand-gold/20">
          <label htmlFor="grade-award" className="block text-xs uppercase tracking-wider text-brand-gold mb-1">
            {language === 'ar' ? 'منح شهادة' : 'Award a certificate'}
          </label>
          <div className="flex gap-2">
            <select
              id="grade-award"
              value={award}
              onChange={(e) => setAward(e.target.value)}
              className="form-gold-input flex-1 px-3 py-2 rounded-xl text-xs bg-[#101314]"
            >
              <option value="">{language === 'ar' ? 'بدون شهادة' : 'No certificate'}</option>
              <option value="attendance|Perfect Attendance Month|حضور مثالي للشهر">{language === 'ar' ? 'حضور مثالي للشهر' : 'Perfect Attendance Month'}</option>
              <option value="evaluation|Barre Excellence|تميز البار">{language === 'ar' ? 'تميز البار' : 'Barre Excellence'}</option>
              <option value="stage|Stage Debut|أول ظهور مسرحي">{language === 'ar' ? 'أول ظهور مسرحي' : 'Stage Debut'}</option>
              <option value="milestone|Most Improved|الأكثر تطوراً">{language === 'ar' ? 'الأكثر تطوراً' : 'Most Improved'}</option>
            </select>
            <button
              onClick={async () => {
                if (!award) return;
                const [kind, title, titleAr] = award.split('|');
                setAwarding(true);
                try {
                  await api.post(`/api/students/${student.id}/certificates`, { kind, title, titleAr });
                  showToast(language === 'ar' ? 'تم منح الشهادة' : 'Certificate awarded', title, 'success');
                  setAward('');
                } catch (e) {
                  setErr(errMsg(e).slice(0, 200));
                } finally {
                  setAwarding(false);
                }
              }}
              disabled={!award || awarding}
              className="px-4 py-2 rounded-xl border border-brand-gold/40 text-brand-gold text-xs font-bold hover:bg-brand-gold/10 disabled:opacity-40 flex items-center gap-1.5"
            >
              {awarding && <Loader2 className="w-3 h-3 animate-spin" />}
              {language === 'ar' ? 'منح' : 'Award'}
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-brand-gold/20">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs text-brand-muted/70 hover:text-white">
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <button onClick={save} disabled={saving} className="gold-btn px-6 py-2.5 rounded-xl text-black text-xs font-bold flex items-center gap-2 disabled:opacity-50">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {language === 'ar' ? 'حفظ التقييم' : 'Save grades'}
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api, rawApi, errMsg } from '../../utils/api';
import { QrCode, CheckCircle2, Loader2, LogIn } from 'lucide-react';

interface SessionInfo {
  title: string;
  code: string | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
  studioRoom: string;
  instructorName: string | null;
  expiresAt: string;
}

/** Scanned session-QR landing: resolve → sign in → confirm own dancer. */
export const SelfCheckinPage: React.FC = () => {
  const { language, setActiveView, activeCheckinToken, students, currentFamilyId, showToast } = useApp();
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dancerId, setDancerId] = useState('');
  const [done, setDone] = useState<{ name: string; remaining: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!activeCheckinToken) {
      setError(language === 'ar' ? 'لا يوجد رمز — امسح رمز الحصة.' : 'No code — scan the session QR.');
      return;
    }
    (async () => {
      try {
        const { data } = await rawApi.get(`/api/courses/sessions/checkin/${encodeURIComponent(activeCheckinToken)}`);
        setInfo(data);
      } catch (e) {
        setError(errMsg(e).slice(0, 160));
      }
    })();
  }, [activeCheckinToken, language]);

  useEffect(() => {
    if (!dancerId && students.length > 0) setDancerId(students[0].id);
  }, [students, dancerId]);

  const confirm = async () => {
    if (!dancerId || !activeCheckinToken) return;
    setBusy(true);
    try {
      const { data: body } = await api.post('/api/attendance/self-checkin', { token: activeCheckinToken, studentId: dancerId });
      if (body.success === false) throw new Error(body.reason || body.message || 'Check-in failed');
      const stu = students.find((s) => s.id === dancerId);
      setDone({ name: stu?.name || '', remaining: body.quotaRemaining ?? 0 });
    } catch (e) {
      showToast(language === 'ar' ? 'تعذر تسجيل الحضور' : 'Check-in failed', errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <h1 className="font-serif text-3xl gold-text-gradient mb-2 flex items-center gap-2">
        <QrCode className="w-7 h-7 text-brand-gold" />
        {language === 'ar' ? 'تسجيل الحضور' : 'Self check-in'}
      </h1>

      {error && !info && (
        <div role="alert" className="gold-card rounded-2xl p-8 text-center text-sm text-red-300">{error}</div>
      )}

      {info && !done && (
        <div className="gold-card rounded-2xl p-6 space-y-4">
          <div>
            <p className="font-mono text-[11px] text-brand-gold" dir="ltr">{info.code}</p>
            <h2 className="font-serif text-2xl text-white">{info.title}</h2>
            <p className="text-xs text-brand-muted mt-1" dir="ltr">
              {String(info.sessionDate).split('T')[0]} · {info.startTime}–{info.endTime} · {info.studioRoom}
              {info.instructorName ? ` · ${info.instructorName}` : ''}
            </p>
          </div>
          {!currentFamilyId ? (
            <div className="rounded-xl border border-brand-gold/30 bg-black/40 p-4 text-center space-y-3">
              <p className="text-xs text-brand-muted">{language === 'ar' ? 'سجّلي الدخول أولاً ثم أكدي حضور راقصتك.' : 'Sign in first, then confirm your dancer.'}</p>
              <button onClick={() => setActiveView('client_portal')} className="gold-btn px-6 py-2.5 rounded-xl text-black text-xs font-bold inline-flex items-center gap-2">
                <LogIn className="w-3.5 h-3.5" /> {language === 'ar' ? 'تسجيل الدخول' : 'Sign in'}
              </button>
            </div>
          ) : students.length === 0 ? (
            <p className="text-xs text-brand-muted text-center">{language === 'ar' ? 'لا راقصات في حسابك.' : 'No dancers on your account.'}</p>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs uppercase tracking-wider text-brand-gold">
                {language === 'ar' ? 'الراقصة' : 'Dancer'}
                <select value={dancerId} onChange={(e) => setDancerId(e.target.value)} className="form-gold-input mt-1 w-full px-4 py-2.5 rounded-xl text-sm bg-[#101314]">
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{language === 'ar' ? s.nameAr || s.name : s.name}</option>
                  ))}
                </select>
              </label>
              <button onClick={confirm} disabled={busy || !dancerId} className="gold-btn w-full py-3.5 rounded-xl text-black font-serif text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {language === 'ar' ? 'تأكيد الحضور (يخصم حصة)' : 'Confirm check-in (uses 1 session)'}
              </button>
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="gold-card rounded-2xl p-10 text-center space-y-3" role="status">
          <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto" />
          <h2 className="font-serif text-2xl text-white">{language === 'ar' ? 'تم تسجيل الحضور' : 'Checked in'}</h2>
          <p className="text-sm text-brand-muted">{done.name} · {done.remaining} {language === 'ar' ? 'حصص متبقية' : 'sessions left'}</p>
          <button onClick={() => setActiveView('client_portal')} className="gold-btn px-6 py-2.5 rounded-xl text-black text-xs font-bold">
            {language === 'ar' ? 'بوابتي' : 'My portal'}
          </button>
        </div>
      )}
    </div>
  );
};

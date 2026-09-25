import React, { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { api, errMsg } from '../utils/api';
import { TicketPercent, Plus, Loader2 } from 'lucide-react';

interface Promo {
  code: string;
  percent: number;
  maxUses: number | null;
  uses: number;
  expiresAt: string | null;
  active: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  maxSessions: number;
}

/** Promo codes + package reservation with server-computed discount. */
export const PromoManager: React.FC = () => {
  const { language, showToast, students } = useAdmin();
  const [promos, setPromos] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [form, setForm] = useState({ code: '', percent: '15', maxUses: '', expiresAt: '' });
  const [reserve, setReserve] = useState({ studentId: '', planId: '', promoCode: '' });
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, l] = await Promise.all([
        api.get('/api/subscriptions/promos').then((r) => r.data).catch(() => null),
        api.get('/api/subscriptions/plans').then((r) => r.data).catch(() => null),
      ]);
      if (Array.isArray(p)) setPromos(p);
      if (Array.isArray(l) && l.length > 0) setPlans(l);
    } catch {
      // offline
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (form.code.trim().length < 3) {
      showToast(language === 'ar' ? 'الكود قصير' : 'Code too short', '3+ letters/digits.', 'error');
      return;
    }
    setUploading(true);
    try {
      await api.post('/api/subscriptions/promos', { code: form.code, percent: Number(form.percent), maxUses: form.maxUses, expiresAt: form.expiresAt });
      setForm({ code: '', percent: '15', maxUses: '', expiresAt: '' });
      load();
    } catch (e) {
      showToast('Create failed', errMsg(e), 'error');
    } finally {
      setUploading(false);
    }
  };

  const doReserve = async () => {
    if (!reserve.studentId || !reserve.planId) {
      showToast(language === 'ar' ? 'حقول ناقصة' : 'Missing fields', 'Dancer + package required.', 'error');
      return;
    }
    setUploading(true);
    try {
      const { data: body } = await api.post('/api/subscriptions/reserve', { studentId: reserve.studentId, planId: reserve.planId, ...(reserve.promoCode.trim() ? { promoCode: reserve.promoCode } : {}) });
      showToast(language === 'ar' ? 'تم حجز الباقة' : 'Package reserved', `EGP ${body.price}${body.promoCode ? ` (promo ${body.promoCode} −EGP ${body.discountAmount})` : ''}`, 'success');
      setReserve({ studentId: '', planId: '', promoCode: '' });
    } catch (e) {
      showToast('Reserve failed', errMsg(e), 'error');
    } finally {
      setUploading(false);
    }
  };

  const toggle = async (code: string, active: boolean) => {
    await api.patch(`/api/subscriptions/promos/${code}`, { active: !active }).catch(() => null);
    load();
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
        <TicketPercent className="w-4 h-4 text-amber-300" />
        {language === 'ar' ? 'أكواد الخصم وحجز الباقات' : 'Promo codes & package reservation'}
      </h3>
      <div className="flex flex-col sm:flex-row gap-2">
        <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 16) })} placeholder="CODE" dir="ltr" className="w-28 px-2.5 py-2 rounded-xl bg-[#111622] border border-white/10 text-xs text-white font-mono" aria-label="Code" />
        <input value={form.percent} onChange={(e) => setForm({ ...form, percent: e.target.value })} type="number" min="1" max="100" dir="ltr" className="form-gold-input w-20 px-2 py-2 rounded-xl text-xs font-mono bg-[#111622] cursor-pointer" />
        <input value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="max uses ∞" type="number" min="1" dir="ltr" className="w-20 px-2 py-2 rounded-xl bg-[#111622] border border-white/10 text-white font-mono" aria-label="Max uses" />
        <input value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} type="date" dir="ltr" className="px-2 py-2 rounded-xl bg-[#111622] border border-white/10 text-white" aria-label="Expiry" />
        <button onClick={create} disabled={uploading} className="gold-btn px-4 py-2 rounded-xl text-black text-xs font-bold flex items-center gap-2 disabled:opacity-50">
          <Plus className="w-3.5 h-3.5" /> {language === 'ar' ? 'إنشاء' : 'Create'}
        </button>
      </div>

      {promos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {promos.map((p) => (
            <button key={p.code} onClick={() => toggle(p.code, !p.active)} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${p.active ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' : 'border-white/10 text-slate-400 hover:border-emerald-500/40'}`}>
              {p.code} {p.percent}% · {p.uses}{p.maxUses ? `/${p.maxUses}` : ''}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-end text-xs">
        <select value={reserve.studentId} onChange={(e) => setReserve({ ...reserve, studentId: e.target.value })} className="form-gold-input px-3 py-2 rounded-xl text-xs bg-[#101314]" aria-label="Student">
          <option value="">{language === 'ar' ? 'اختر الراقصة' : 'Select dancer'}</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={reserve.planId} onChange={(e) => setReserve({ ...reserve, planId: e.target.value })} className="flex-1 min-w-[140px] px-3 py-2 rounded-xl bg-[#111622] border border-white/10 text-white" aria-label="Package">
          <option value="">{language === 'ar' ? 'اختر الباقة' : 'Select package'}</option>
          {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.price} EGP</option>)}
        </select>
        <input value={reserve.promoCode} onChange={(e) => setReserve({ ...reserve, promoCode: e.target.value.toUpperCase() })} placeholder="PROMO?" dir="ltr" className="w-24 px-2 py-2 rounded-xl bg-[#111622] border border-white/10 text-white font-mono" aria-label="Promo code" />
        <button onClick={doReserve} disabled={uploading} className="gold-btn px-4 py-2 rounded-xl text-black text-xs font-bold flex items-center gap-2 disabled:opacity-50">
          <TicketPercent className="w-3.5 h-3.5" /> {language === 'ar' ? 'حجز' : 'Reserve'}
        </button>
      </div>
    </div>
  );
};
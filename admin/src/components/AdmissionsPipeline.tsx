import React, { useMemo, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { AdmissionLead } from '../types';
import { SectionCard } from './ui';
import { firstError, requireText, validateAge, validateEmailOptional, validatePhoneRequired } from '../utils/validation';
import { exportCsv } from '../utils/csv';
import { ViewSwitcher, useViewPrefs } from './ViewSwitcher';
import {
  UserPlus, Phone, Mail, Calendar, Plus, ArrowRight, CheckCircle2, Clock, Filter, Download, Search,
} from 'lucide-react';

const STAGES: { id: AdmissionLead['stage']; en: string; ar: string; color: string }[] = [
  { id: 'new_inquiry', en: 'New inquiry', ar: 'استفسار جديد', color: 'text-sky-300 border-sky-500/30 bg-sky-500/10' },
  { id: 'trial_scheduled', en: 'Trial class', ar: 'حصة تجريبية', color: 'text-violet-300 border-violet-500/30 bg-violet-500/10' },
  { id: 'audition_passed', en: 'Audition passed', ar: 'اجتاز الاختبار', color: 'text-amber-300 border-amber-500/30 bg-amber-500/10' },
  { id: 'enrolled', en: 'Enrolled', ar: 'مسجل', color: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' },
  { id: 'waitlist', en: 'Waitlist', ar: 'قائمة الانتظار', color: 'text-slate-300 border-white/15 bg-white/[0.04]' },
];

/**
 * AdmissionsPipeline — Kanban CRM for inquiries → trials → auditions → enrollment.
 */
export const AdmissionsPipeline: React.FC = () => {
  const { language, leads, addLead, updateLeadStage, deleteLead, convertLeadToStudent, showToast } = useAdmin();
  const isRtl = language === 'ar';
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | AdmissionLead['programInterest']>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const boardView = useViewPrefs('admissions-board', 'cards');
  const [form, setForm] = useState({ dancerName: '', age: '7', parentName: '', parentPhone: '', parentEmail: '', programInterest: 'classical' as AdmissionLead['programInterest'], notes: '' });

  const filtered = useMemo(() => leads.filter((l) => {
    if (filter !== 'all' && l.programInterest !== filter) return false;
    if (stageFilter !== 'all' && l.stage !== stageFilter) return false;
    const needle = search.trim().toLowerCase();
    if (needle && !`${l.dancerName} ${l.parentName} ${l.parentPhone} ${l.parentEmail || ''}`.toLowerCase().includes(needle)) return false;
    return true;
  }), [leads, filter, stageFilter, search]);
  const total = leads.length;
  const enrolled = leads.filter((l) => l.stage === 'enrolled').length;
  const conv = total ? Math.round((enrolled / total) * 100) : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = firstError(
      requireText(form.dancerName, 'Dancer name', 2),
      validateAge(form.age),
      validatePhoneRequired(form.parentPhone, 'Parent phone'),
      validateEmailOptional(form.parentEmail),
    );
    if (!err.ok) {
      showToast('Missing or invalid fields', err.message || 'Please check the form.', 'error');
      return;
    }
    if (!form.parentName.trim()) {
      showToast('Missing fields', 'Parent name is required.', 'error');
      return;
    }
    addLead({
      dancerName: form.dancerName.trim(),
      age: parseInt(form.age),
      parentName: form.parentName.trim(),
      parentPhone: form.parentPhone.trim(),
      parentEmail: form.parentEmail.trim(),
      programInterest: form.programInterest,
      stage: 'new_inquiry',
      notes: form.notes.trim(),
    });
    setForm({ dancerName: '', age: '7', parentName: '', parentPhone: '', parentEmail: '', programInterest: 'classical', notes: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: isRtl ? 'إجمالي الاستفسارات' : 'Total inquiries', value: String(total || 0), sub: isRtl ? 'هذا الموسم' : 'this season' },
          { label: isRtl ? 'معدل التحويل' : 'Conversion rate', value: `${conv}%`, sub: `${enrolled} ${isRtl ? 'مسجل' : 'enrolled'}` },
          { label: isRtl ? 'حصص تجريبية' : 'Trials pending', value: String(leads.filter((l) => l.stage === 'trial_scheduled').length), sub: isRtl ? 'بانتظار الحضور' : 'awaiting attendance' },
          { label: isRtl ? 'قائمة الانتظار' : 'Waitlist', value: String(leads.filter((l) => l.stage === 'waitlist').length), sub: isRtl ? 'فرص مؤجلة' : 'deferred demand' },
        ].map((s, i) => (
          <div key={i} className="premium-card p-4 premium-card-hover">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
            <p className="font-heading text-2xl font-extrabold text-white mt-1">{s.value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-slate-400" />
            <div className="flex p-1 rounded-xl bg-white/[0.03] border border-white/10">
              {(['all', 'classical', 'contemporary', 'youth'] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filter === f ? 'nav-pill-active' : 'text-slate-400 hover:text-white'}`}>
                  {f === 'all' ? (isRtl ? 'الكل' : 'All') : f}
                </button>
              ))}
            </div>
            <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="input-premium text-xs px-3 py-2" aria-label="Stage">
              <option value="all">{isRtl ? 'كل المراحل' : 'All stages'}</option>
              {STAGES.map((s) => (<option key={s.id} value={s.id}>{isRtl ? s.ar : s.en}</option>))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitcher moduleKey="admissions-board" modes={['cards', 'rows']} value={{ mode: boardView.mode, density: boardView.density }} onChange={(p) => { boardView.setMode(p.mode); boardView.setDensity(p.density); }} />
            <button
              onClick={() =>
                exportCsv(`admissions-${new Date().toISOString().split('T')[0]}`, ['id', 'dancerName', 'age', 'parentName', 'parentPhone', 'program', 'stage', 'slot', 'createdAt'], filtered.map((l: any) => ({
                  id: l.id,
                  dancerName: l.dancerName,
                  age: l.age,
                  parentName: l.parentName,
                  parentPhone: l.parentPhone,
                  program: l.programInterest || l.program,
                  stage: l.stage,
                  slot: l.trialDate || l.preferredSlot || '',
                  createdAt: l.createdAt,
                })))
              }
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> {isRtl ? 'تصدير CSV' : 'Export CSV'}
            </button>
            <button onClick={() => setShowForm((v) => !v)} className="gold-btn px-4 py-2.5 text-xs font-bold flex items-center gap-2 self-start">
              <Plus className="w-4 h-4" /> {isRtl ? 'استفسار جديد' : 'New inquiry'}
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <label className="relative flex-1">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isRtl ? 'ابحث بالاسم أو الهاتف أو البريد...' : 'Search dancer, parent, phone, email...'}
              className="w-full ps-9 pe-9 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-400/40"
              aria-label={isRtl ? 'بحث القبول' : 'Search admissions'}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1" aria-label="Clear search">✕</button>
            )}
          </label>
          <span className="text-[11px] font-mono text-slate-500 px-2">{filtered.length}/{leads.length}</span>
          {(search || filter !== 'all' || stageFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setFilter('all'); setStageFilter('all'); }} className="text-xs text-slate-400 hover:text-rose-300 underline px-1">
              {isRtl ? 'إعادة تعيين' : 'Reset'}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <SectionCard title={isRtl ? 'تسجيل استفسار' : 'Log inquiry'} subtitle={isRtl ? 'يظهر فوراً في مسار القبول' : 'Appears instantly in the pipeline'} icon={<UserPlus className="w-4 h-4 text-rose-300" />}>
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input value={form.dancerName} required minLength={2} onChange={(e) => setForm({ ...form, dancerName: e.target.value })} placeholder={isRtl ? 'اسم الراقص/ة *' : 'Dancer name *'} className="input-premium text-xs px-3 py-2.5" />
            <input value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} type="number" min={3} max={80} required placeholder="Age" className="input-premium text-xs px-3 py-2.5" />
            <select value={form.programInterest} onChange={(e) => setForm({ ...form, programInterest: e.target.value as AdmissionLead['programInterest'] })} className="input-premium text-xs px-3 py-2.5">
              <option value="classical">Classical</option><option value="contemporary">Contemporary</option><option value="youth">Youth</option>
            </select>
            <input value={form.parentName} required minLength={2} onChange={(e) => setForm({ ...form, parentName: e.target.value })} placeholder={isRtl ? 'اسم ولي الأمر *' : 'Parent name *'} className="input-premium text-xs px-3 py-2.5" />
            <input value={form.parentPhone} required onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} placeholder={isRtl ? 'هاتف ولي الأمر *' : 'Parent phone *'} type="tel" className="input-premium text-xs px-3 py-2.5" dir="ltr" />
            <input value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} placeholder="Parent email" type="email" className="input-premium text-xs px-3 py-2.5" dir="ltr" />
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} placeholder={isRtl ? 'ملاحظات' : 'Notes'} className="input-premium text-xs px-3 py-2.5 sm:col-span-2 lg:col-span-3" />
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
              <button type="submit" className="gold-btn px-5 py-2.5 text-xs font-bold">{isRtl ? 'حفظ الاستفسار' : 'Save inquiry'}</button>
              <button type="button" onClick={() => { setForm({ dancerName: '', age: '7', parentName: '', parentPhone: '', parentEmail: '', programInterest: 'classical', notes: '' }); setShowForm(false); }} className="btn-ghost px-5 py-2.5 text-xs font-bold">{isRtl ? 'إلغاء' : 'Cancel'}</button>
            </div>
          </form>
        </SectionCard>
      )}

      {/* Kanban / rows */}
      {filtered.length === 0 ? (
        <SectionCard title={isRtl ? 'مسار القبول' : 'Pipeline board'} subtitle={isRtl ? 'اسحب الاستفسارات بين المراحل' : 'Move inquiries across stages'} icon={<UserPlus className="w-4 h-4 text-violet-300" />}>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {STAGES.map((st) => (
              <div key={st.id} className="kanban-col p-3 min-h-[180px]">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${st.color}`}>{isRtl ? st.ar : st.en}</span>
                  <span className="text-[11px] font-mono text-slate-500">0</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{isRtl ? 'لا عناصر بعد — أضف أول استفسار.' : 'Empty — log your first inquiry above.'}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : boardView.mode === 'rows' ? (
        <div className="rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/[0.06]">
          <div className="hidden sm:grid grid-cols-[1fr_90px_160px_130px_150px] gap-3 px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 bg-white/[0.02]">
            <span>{isRtl ? 'الراقص / ولي الأمر' : 'Dancer / parent'}</span>
            <span>{isRtl ? 'العمر' : 'Age'}</span>
            <span>{isRtl ? 'التواصل' : 'Contact'}</span>
            <span>{isRtl ? 'البرنامج' : 'Program'}</span>
            <span>{isRtl ? 'المرحلة' : 'Stage'}</span>
          </div>
          {filtered.map((lead) => (
            <div key={lead.id} className="flex flex-col sm:grid sm:grid-cols-[1fr_90px_160px_130px_150px] gap-2 sm:gap-3 items-start sm:items-center px-4 py-3 hover:bg-white/[0.02] transition">
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-white truncate">{lead.dancerName}</p>
                <p className="text-[11px] text-slate-500 truncate">{lead.parentName}</p>
              </div>
              <span className="text-xs text-slate-300">{lead.age}y</span>
              <span className="text-[11px] text-slate-400 truncate" dir="ltr">{lead.parentPhone}</span>
              <span className="text-[11px] text-slate-300 capitalize">{lead.programInterest}</span>
              <select
                value={lead.stage}
                onChange={(e) => updateLeadStage(lead.id, e.target.value as AdmissionLead['stage'])}
                className="text-[11px] font-bold bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none w-full sm:w-auto"
                aria-label="Stage"
              >
                {STAGES.map((s) => (<option key={s.id} value={s.id}>{isRtl ? s.ar : s.en}</option>))}
              </select>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {STAGES.map((st) => {
            const items = filtered.filter((l) => l.stage === st.id);
            return (
              <div key={st.id} className="kanban-col p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${st.color}`}>{isRtl ? st.ar : st.en}</span>
                  <span className="text-[11px] font-mono font-bold text-white bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="space-y-2.5">
                  {items.map((lead) => (
                    <div key={lead.id} className="kanban-card p-3 rounded-xl bg-[#0e1526] border border-white/[0.07]">
                      <p className="text-[13px] font-bold text-white truncate">{lead.dancerName}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{lead.age}y • <span className="capitalize">{lead.programInterest}</span></p>
                      <div className="text-[11px] text-slate-400 mt-2 space-y-1">
                        <p className="flex items-center gap-1.5 truncate"><Phone className="w-3 h-3 flex-shrink-0" /><span className="truncate" dir="ltr">{lead.parentPhone}</span></p>
                        {lead.parentEmail && <p className="flex items-center gap-1.5 truncate"><Mail className="w-3 h-3 flex-shrink-0" /><span className="truncate" dir="ltr">{lead.parentEmail}</span></p>}
                        {lead.trialDate && <p className="flex items-center gap-1.5"><Calendar className="w-3 h-3 flex-shrink-0" />{lead.trialDate}</p>}
                      </div>
                      {lead.notes && <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">{lead.notes}</p>}
                      <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-white/[0.06]">
                        <select
                          value={lead.stage}
                          onChange={(e) => updateLeadStage(lead.id, e.target.value as AdmissionLead['stage'])}
                          className="flex-1 text-[11px] font-bold bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none"
                        >
                          {STAGES.map((s) => (<option key={s.id} value={s.id}>{isRtl ? s.ar : s.en}</option>))}
                        </select>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        {lead.stage !== 'enrolled' && (
                          <button
                            onClick={() => { const s = convertLeadToStudent(lead.id); if (s) showToast('Enrolled', `${s.name} created from inquiry.`, 'success'); else showToast('Enroll failed', 'Could not convert this lead. Try again.', 'error'); }}
                            className="flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" /> {isRtl ? 'قبول' : 'Enroll'}
                          </button>
                        )}
                        <button onClick={() => { if (window.confirm(isRtl ? `حذف ${lead.dancerName} من مسار القبول؟` : `Delete ${lead.dancerName} from pipeline?`)) deleteLead(lead.id); }} title={isRtl ? 'حذف' : 'Delete'} className="text-[11px] font-bold px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-slate-400 hover:text-rose-300 hover:border-rose-500/30 transition">✕</button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <p className="text-[11px] text-slate-600 text-center py-4 border border-dashed border-white/[0.07] rounded-xl">—</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        {isRtl ? 'التحويل بنقرة واحدة ينشئ ملف طالب + باقة + باركود تلقائياً.' : 'One-click enroll creates student file + package + barcode automatically.'}
        <ArrowRight className="w-3 h-3 rtl:rotate-180" />
      </p>
    </div>
  );
};

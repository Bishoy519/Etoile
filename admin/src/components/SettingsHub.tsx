import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { ALL_MODULES, AdminTabId, UserRole } from '../types';
import { SectionCard } from './ui';
import { AcademicYearCard } from './AcademicYearCard';
import { DeletionRequestsCard } from './DeletionRequestsCard';
import {
  Settings, Building2, Bell, Globe, ShieldCheck, Database, Smartphone, Save,
  UserCog, RotateCcw, Lock,
} from 'lucide-react';

/**
 * SettingsHub — academy preferences, operational defaults, integrations status.
 */
export const SettingsHub: React.FC = () => {
  const { language, setLanguage, showToast, isAudioMuted, toggleAudioMute, whatsAppConfig, currentUser, roleConfigs, updateRoleAccess, setRoleDefaultTab, resetRolePermissions, logCrmAction } = useAdmin();
  const isRtl = language === 'ar';
  const canManageRoles = currentUser?.role === 'owner' || currentUser?.role === 'superadmin';
  const roleOrder: UserRole[] = ['owner', 'superadmin', 'receptionist', 'instructor'];
  const [academy, setAcademy] = useState(() => {
    try {
      const raw = localStorage.getItem('etoile_academy_settings');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { name: 'Étoile Ballet Academy', city: 'Cairo — Zamalek', currency: 'EGP', timezone: 'Africa/Cairo', term: 'August 2026' };
  });
  const [ops, setOps] = useState(() => {
    try {
      const raw = localStorage.getItem('etoile_ops_settings');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { autoReminders: true, quotaWarnings: true, debtBlock: false, kioskSound: !isAudioMuted, lateGraceMin: '10' };
  });
  const [errors, setErrors] = useState<{ academy?: string; grace?: string }>({});

  const save = () => {
    const nextErrors: typeof errors = {};
    if (!academy.name.trim()) nextErrors.academy = isRtl ? 'اسم الأكاديمية مطلوب.' : 'Academy name is required.';
    const grace = Number(ops.lateGraceMin);
    if (!Number.isFinite(grace) || !Number.isInteger(grace) || grace < 0 || grace > 120) {
      nextErrors.grace = isRtl ? 'مهلة التأخير يجب أن تكون رقماً بين 0 و 120.' : 'Late grace must be a whole number between 0 and 120.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showToast(isRtl ? 'تعذر الحفظ' : 'Cannot save', Object.values(nextErrors)[0], 'error');
      return;
    }
    try {
      localStorage.setItem('etoile_academy_settings', JSON.stringify(academy));
      localStorage.setItem('etoile_ops_settings', JSON.stringify({ ...ops, lateGraceMin: String(grace) }));
    } catch { /* storage unavailable */ }
    // Keep kiosk chime in sync with the ops toggle
    if ((ops.kioskSound === false && !isAudioMuted) || (ops.kioskSound === true && isAudioMuted)) {
      toggleAudioMute();
    }
    showToast(isRtl ? 'تم الحفظ' : 'Settings saved', isRtl ? 'تم حفظ تفضيلات الأكاديمية محلياً.' : 'Academy preferences saved locally and applied.', 'success');
  };

  return (
    <div className="space-y-5 animate-fade-up max-w-5xl">
      {/* Roles & page access — owner visual editor */}
      <SectionCard
        title={isRtl ? 'الأدوار وصلاحيات الصفحات' : 'Roles & page access'}
        subtitle={isRtl ? 'تحكم مرئي: أي دور يرى أي صفحة + الصفحة الافتراضية' : 'Visual control: which role sees which page + default landing page'}
        icon={<UserCog className="w-4 h-4 text-violet-300" />}
        action={canManageRoles ? (
          <button
            onClick={() => { resetRolePermissions(); logCrmAction('RBAC Reset', `${currentUser?.name} reset role permissions to defaults`, 'staff'); showToast(isRtl ? 'تمت الاستعادة' : 'Defaults restored', isRtl ? 'عادت الصلاحيات للوضع الافتراضي.' : 'Role permissions restored to defaults.', 'success'); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-[11px] font-bold text-slate-300 transition"
            title={isRtl ? 'استعادة الافتراضي' : 'Reset to defaults'}
          >
            <RotateCcw className="w-3.5 h-3.5" />{isRtl ? 'استعادة' : 'Reset'}
          </button>
        ) : undefined}
      >
        {!canManageRoles ? (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-white/[0.02] border border-white/[0.07] text-xs text-slate-400">
            <Lock className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <span>{isRtl ? 'فقط المالك / المدير يمكنه تعديل الصلاحيات. صلاحياتك معروضة في ملفي.' : 'Only Owner / Director can edit permissions. Your access is shown in My Profile.'}</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[620px] text-xs border-separate" style={{ borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th className="text-start p-2.5 text-[11px] uppercase tracking-wider text-slate-400 font-bold sticky left-0">{isRtl ? 'الصفحة' : 'Page'}</th>
                    {roleOrder.map((r) => (
                      <th key={r} className="p-2.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[11px] font-extrabold text-white uppercase">{roleConfigs[r].badge}</span>
                          <span className="text-[10px] font-mono text-slate-500">{roleConfigs[r].allowedTabs.length} pages</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_MODULES.map((m) => (
                    <tr key={m.id} className="border-t border-white/[0.06]">
                      <td className="p-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 text-slate-400">{m.group}</span>
                          <span className="font-semibold text-slate-200">{isRtl ? m.ar : m.en}</span>
                          {m.locked && <Lock className="w-3 h-3 text-amber-300" />}
                        </div>
                        {m.locked && <p className="text-[10px] text-slate-500 mt-0.5">{isRtl ? 'إجبارية للجميع' : 'Mandatory for all'}</p>}
                      </td>
                      {roleOrder.map((r) => {
                        const allowed = roleConfigs[r].allowedTabs.includes(m.id);
                        const isDefault = roleConfigs[r].defaultTab === m.id;
                        const mustKeep = (r === 'owner' || r === 'superadmin') && (m.id === 'settings' || m.id === 'users' || m.id === 'overview');
                        const disabled = m.locked || (!allowed && false) || (allowed && mustKeep);
                        return (
                          <td key={r} className="p-2.5 text-center">
                            <button
                              disabled={!!m.locked || (allowed && mustKeep)}
                              onClick={() => {
                                updateRoleAccess(r, m.id, !allowed);
                                logCrmAction('RBAC Updated', `${currentUser?.name} ${!allowed ? 'granted' : 'revoked'} ${m.id} for ${r}`, 'staff');
                              }}
                              title={m.locked ? (isRtl ? 'إجبارية' : 'Locked') : mustKeep && allowed ? (isRtl ? 'أساسية للدور' : 'Required for this role') : m.en}
                              className={`w-9 h-6 rounded-full relative transition mx-auto ${allowed ? 'bg-emerald-500' : 'bg-white/10'} ${m.locked || (allowed && mustKeep) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
                            >
                              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${allowed ? (isRtl ? 'left-0.5' : 'right-0.5') : (isRtl ? 'right-0.5' : 'left-0.5')}`} />
                            </button>
                            {allowed && (
                              <button
                                onClick={() => { setRoleDefaultTab(r, m.id); showToast(isRtl ? 'الصفحة الافتراضية' : 'Default page', `${roleConfigs[r].badge} → ${m.en}`, 'success'); }}
                                title={isRtl ? 'تعيين كصفحة افتراضية' : 'Set as default landing page'}
                                className={`block mx-auto mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition ${isDefault ? 'bg-amber-400/15 border-amber-400/40 text-amber-300' : 'border-white/10 text-slate-500 hover:text-white hover:border-white/25'}`}
                              >
                                {isDefault ? (isRtl ? '★ الافتراضية' : '★ Default') : (isRtl ? 'افتراضية' : 'Default')}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {isRtl
                ? 'التغيير فوري ويُحفظ محلياً ويطبق على الشريط الجانبي والبحث. profile إجبارية. المالك/المدير يحتفظ دائماً بالإعدادات والطاقم.'
                : 'Changes apply instantly to sidebar, search & guards, and persist locally. profile is mandatory. Owner/Director always keep Settings & Staff.'}
            </p>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title={isRtl ? 'ملف الأكاديمية' : 'Academy profile'} subtitle={isRtl ? 'الهوية والعملة والمنطقة الزمنية' : 'Identity, currency & timezone'} icon={<Building2 className="w-4 h-4 text-rose-300" />}>
          <div className="space-y-3">
            <div><label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{isRtl ? 'الاسم' : 'Name'} *</label>
              <input value={academy.name} onChange={(e) => setAcademy({ ...academy, name: e.target.value })} className={`input-premium w-full text-xs px-3 py-2.5 mt-1.5 ${errors.academy ? '!border-rose-500/60' : ''}`} />
              {errors.academy && <p className="text-[11px] text-rose-300 mt-1 font-semibold">{errors.academy}</p>}</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{isRtl ? 'المدينة' : 'City'}</label>
                <input value={academy.city} onChange={(e) => setAcademy({ ...academy, city: e.target.value })} className="input-premium w-full text-xs px-3 py-2.5 mt-1.5" /></div>
              <div><label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{isRtl ? 'الفصل' : 'Term'}</label>
                <input value={academy.term} onChange={(e) => setAcademy({ ...academy, term: e.target.value })} className="input-premium w-full text-xs px-3 py-2.5 mt-1.5" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{isRtl ? 'العملة' : 'Currency'}</label>
                <select value={academy.currency} onChange={(e) => setAcademy({ ...academy, currency: e.target.value })} className="input-premium w-full text-xs px-3 py-2.5 mt-1.5"><option>EGP</option><option>USD</option><option>EUR</option></select></div>
              <div><label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Timezone</label>
                <select value={academy.timezone} onChange={(e) => setAcademy({ ...academy, timezone: e.target.value })} className="input-premium w-full text-xs px-3 py-2.5 mt-1.5"><option>Africa/Cairo</option><option>Europe/Paris</option><option>Asia/Dubai</option></select></div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title={isRtl ? 'التشغيل والحضور' : 'Operations & check-in'} subtitle={isRtl ? 'قواعد الكشك والتأخير والتنبيهات' : 'Kiosk rules, grace & alerts'} icon={<Bell className="w-4 h-4 text-amber-300" />}>
          <div className="space-y-3 text-xs">
            {([
              { k: 'autoReminders', label: isRtl ? 'تذكيرات واتساب تلقائية قبل الحصة' : 'Auto WhatsApp reminders before class', v: ops.autoReminders },
              { k: 'quotaWarnings', label: isRtl ? 'تحذير عند بقاء حصتين' : 'Warn when 2 sessions remain', v: ops.quotaWarnings },
              { k: 'debtBlock', label: isRtl ? 'منع الدخول عند تجاوز الدين' : 'Block entry when debt exceeds limit', v: ops.debtBlock },
            ] as const).map((row) => (
              <button key={row.k} onClick={() => setOps({ ...ops, [row.k]: !row.v })} className="w-full flex items-center justify-between p-3 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:border-white/15 transition text-start">
                <span className="font-semibold text-slate-200">{row.label}</span>
                <span className={`w-10 h-6 rounded-full relative transition ${row.v ? 'bg-emerald-500' : 'bg-white/10'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${row.v ? (isRtl ? 'left-0.5' : 'right-0.5') : (isRtl ? 'right-0.5' : 'left-0.5')}`} />
                </span>
              </button>
            ))}
            <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.07] bg-white/[0.02]">
              <span className="font-semibold text-slate-200">{isRtl ? 'مهلة التأخير (دقيقة)' : 'Late grace (min)'}</span>
              <input value={ops.lateGraceMin} inputMode="numeric" onChange={(e) => setOps({ ...ops, lateGraceMin: e.target.value.replace(/[^0-9]/g, '').slice(0, 3) })} className={`input-premium w-20 text-center text-xs px-2 py-1.5 ${errors.grace ? '!border-rose-500/60' : ''}`} aria-label="Late grace minutes" />
            </div>
            {errors.grace && <p className="text-[11px] text-rose-300 font-semibold">{errors.grace}</p>}
            <button onClick={() => { toggleAudioMute(); setOps({ ...ops, kioskSound: isAudioMuted }); }} className="w-full flex items-center justify-between p-3 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:border-white/15 transition">
              <span className="font-semibold text-slate-200">{isRtl ? 'صوت الكشك' : 'Kiosk chime'}</span>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${isAudioMuted ? 'status-pill-slate' : 'status-pill-emerald'}`}>{isAudioMuted ? 'Muted' : 'On'}</span>
            </button>
          </div>
        </SectionCard>

        <SectionCard title={isRtl ? 'اللغة والعرض' : 'Language & display'} subtitle={isRtl ? 'دعم كامل EN / AR مع RTL' : 'Full EN / AR with RTL mirroring'} icon={<Globe className="w-4 h-4 text-sky-300" />}>
          <div className="flex p-1 rounded-xl bg-white/[0.03] border border-white/10 w-fit">
            {(['en', 'ar'] as const).map((l) => (
              <button key={l} onClick={() => setLanguage(l)} className={`px-5 py-2 rounded-lg text-xs font-bold transition ${language === l ? 'nav-pill-active' : 'text-slate-400 hover:text-white'}`}>
                {l === 'en' ? 'English' : 'العربية'}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">{isRtl ? 'يتم عكس التخطيط تلقائياً ويبقى الشعار والأرقام ثابتة.' : 'Layout mirrors automatically; brand and numerals stay stable.'}</p>
        </SectionCard>

        <SectionCard title={isRtl ? 'التكاملات' : 'Integrations'} subtitle={isRtl ? 'حالة الربط الخارجي' : 'External connection status'} icon={<Smartphone className="w-4 h-4 text-emerald-300" />}>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.07] bg-white/[0.02]">
              <span className="font-semibold text-slate-200">WhatsApp gateway</span>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${whatsAppConfig?.status === 'connected' ? 'status-pill-emerald' : 'status-pill-amber'}`}>{whatsAppConfig?.status || 'not linked'}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.07] bg-white/[0.02]">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-slate-400" /> PostgreSQL • Prisma</span>
              <span className="status-pill-emerald px-2.5 py-1 rounded-full text-[10px] font-bold">Synced</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.07] bg-white/[0.02]">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> RBAC • JWT</span>
              <span className="status-pill-blue px-2.5 py-1 rounded-full text-[10px] font-bold">Enforced</span>
            </div>
          </div>
        </SectionCard>
      </div>

      <AcademicYearCard />
      <DeletionRequestsCard />

      <div className="flex items-center gap-2">
        <button onClick={save} className="gold-btn px-6 py-3 text-xs font-bold flex items-center gap-2"><Save className="w-4 h-4" /> {isRtl ? 'حفظ كل الإعدادات' : 'Save all settings'}</button>
        <span className="text-[11px] text-slate-500 flex items-center gap-1.5"><Settings className="w-3.5 h-3.5" /> {isRtl ? 'تُطبق فوراً على الكشك والمالية' : 'Applies instantly to kiosk & finance'}</span>
      </div>
    </div>
  );
};

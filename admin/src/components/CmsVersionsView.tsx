import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { api, errMsg } from '../utils/api';
import { exportCsv } from '../utils/csv';
import { ViewSwitcher, useViewPrefs } from './ViewSwitcher';
import { History, RotateCcw, Search, Download } from 'lucide-react';

interface Version {
  id: string;
  label: string;
  createdBy: string | null;
  createdAt: string;
}

/** CMS snapshot history: list versions and restore with a pre-restore safety snapshot. */
export const CmsVersionsView: React.FC<{ onRestored: (content: unknown) => void }> = ({ onRestored }) => {
  const { language, showToast } = useAdmin();
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [vSearch, setVSearch] = useState('');
  const vView = useViewPrefs('cms-versions', 'cards');

  const visible = useMemo(() => {
    const needle = vSearch.trim().toLowerCase();
    if (!needle) return versions;
    return versions.filter((v) => `${v.label} ${v.createdBy || ''}`.toLowerCase().includes(needle));
  }, [versions, vSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/portal-content/versions');
      setVersions(data);
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const restore = async (id: string) => {
    setRestoring(id);
    try {
      const { data: content } = await api.post(`/api/portal-content/versions/${id}/restore`);
      onRestored(content);
      try {
        localStorage.setItem('etoile_portal_cms_cache', JSON.stringify(content));
      } catch {
        // ignore
      }
      showToast(
        language === 'ar' ? 'تمت استعادة النسخة' : 'Version restored',
        language === 'ar' ? 'نُشرت النسخة المحددة. حُفظت الحالة السابقة تلقائياً.' : 'Selected version is live. Previous state auto-snapshotted.',
        'success',
      );
      setConfirmId(null);
      load();
    } catch (e) {
      showToast('Restore failed', errMsg(e), 'error');
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="bg-[#171d2b] border border-[var(--border-subtle)] rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-amber-300" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            {language === 'ar' ? 'سجل نسخ المحتوى (آخر 30)' : 'Content Version History (last 30)'}
          </h2>
        </div>
        <span className="sm:ms-auto flex items-center gap-2 flex-wrap">
          <label className="relative">
            <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              value={vSearch}
              onChange={(e) => setVSearch(e.target.value)}
              placeholder={language === 'ar' ? 'بحث...' : 'Search versions...'}
              className="ps-8 pe-3 py-1.5 rounded-xl bg-[#111622] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none w-44"
              aria-label={language === 'ar' ? 'بحث النسخ' : 'Search versions'}
            />
          </label>
          <span className="text-[11px] font-mono text-slate-500">{visible.length}/{versions.length}</span>
          <ViewSwitcher moduleKey="cms-versions" modes={['cards', 'rows']} value={{ mode: vView.mode, density: vView.density }} onChange={(p) => { vView.setMode(p.mode); vView.setDensity(p.density); }} />
          <button
            onClick={() => exportCsv(`cms-versions-${new Date().toISOString().split('T')[0]}`, ['label', 'createdBy', 'createdAt'], visible.map((v) => ({ label: v.label, createdBy: v.createdBy || '', createdAt: v.createdAt })))}
            className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" /><span>CSV</span>
          </button>
        </span>
      </div>
      <p className="text-xs text-slate-400">
        {language === 'ar'
          ? 'لقطة تلقائية قبل كل حفظ أو حذف أو استعادة — الاستعادة آمنة دائماً.'
          : 'Auto-snapshot before every save, delete, or restore — restoring is always safe.'}
      </p>
      {loading ? (
        <div className="shimmer-line h-24" />
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-xs text-slate-500">
          {versions.length === 0
            ? (language === 'ar' ? 'لا نسخ بعد — احفظ مرة واحدة لإنشاء أول لقطة.' : 'No versions yet — save once to create the first snapshot.')
            : (language === 'ar' ? 'لا نسخ مطابقة للبحث.' : 'No versions match your search.')}
        </div>
      ) : vView.mode === 'rows' ? (
        <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
          {visible.map((v, i) => (
            <div key={v.id} className="flex items-center gap-3 px-3 py-2 text-xs hover:bg-white/[0.02] transition">
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-white truncate">{i === 0 ? 'LATEST • ' : ''}{v.label}</span>
                <span className="block text-[11px] text-slate-500 font-mono truncate">{v.createdAt}{v.createdBy ? ` • ${v.createdBy}` : ''}</span>
              </span>
              <button
                onClick={() => setConfirmId(v.id)}
                className="px-3 py-1 rounded-lg border border-amber-500/40 text-amber-300 text-[11px] font-bold flex-shrink-0 hover:bg-amber-500/10"
              >
                <span className="flex items-center gap-1"><RotateCcw className="w-3 h-3" /> {language === 'ar' ? 'استعادة' : 'Restore'}</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((v, i) => (
            <div key={v.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] text-xs">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">
                  {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 me-2">LATEST</span>}
                  {v.label}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {(() => { try { return new Date(v.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-GB'); } catch { return v.createdAt; } })()}
                  {v.createdBy ? ` • ${v.createdBy}` : ''}
                </div>
              </div>
              {confirmId === v.id ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => restore(v.id)} disabled={restoring === v.id} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[11px] font-bold disabled:opacity-50">
                    {restoring === v.id ? '...' : (language === 'ar' ? 'تأكيد' : 'Confirm')}
                  </button>
                  <button onClick={() => setConfirmId(null)} className="px-3 py-1.5 rounded-lg border border-white/15 text-[11px]">
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(v.id)}
                  className="px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center gap-1.5 shrink-0 hover:bg-amber-500/10"
                >
                  <RotateCcw className="w-3 h-3" /> {language === 'ar' ? 'استعادة' : 'Restore'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import React, { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { api } from '../utils/api';
import { exportCsv, csvFilename } from '../utils/csv';
import { ViewSwitcher, useViewPrefs } from './ViewSwitcher';
import { Highlight } from './Highlight';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { ScrollText, Search, ChevronLeft, ChevronRight, Download, LayoutGrid, Rows3 } from 'lucide-react';

interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  details: string;
  category: string;
  createdAt: string;
}

const CATS = ['all', 'crm', 'financial', 'cms', 'pos', 'auth', 'attendance'] as const;

export const AuditLogView: React.FC = () => {
  const { language } = useAdmin();
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [cat, setCat] = useState<string>('all');
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, 250);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const auditView = useViewPrefs('system-audit', 'table');
  const [cardMode, setCardMode] = useState(false);

  const load = useCallback(async (p: number, c: string, search: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(p),
        limit: '50',
        ...(c !== 'all' ? { category: c } : {}),
        ...(search.trim() ? { search: search.trim().slice(0, 120) } : {}),
      });
      const { data } = await api.get(`/api/ops/audit-log?${qs}`);
      setItems(data.items || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    load(1, cat, debouncedQ);
  }, [cat, debouncedQ, load]);

  // Server already filters by search; keep a light client pass for offline cache.
  const filtered = items.filter((e) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return `${e.action} ${e.actor} ${e.details}`.toLowerCase().includes(needle);
  });

  const exportAll = async () => {
    setExporting(true);
    try {
      const all: AuditEntry[] = [];
      let p = 1;
      for (;;) {
        const qs = new URLSearchParams({
          page: String(p),
          limit: '200',
          ...(cat !== 'all' ? { category: cat } : {}),
          ...(debouncedQ.trim() ? { search: debouncedQ.trim().slice(0, 120) } : {}),
        });
        let data;
        try {
          ({ data } = await api.get(`/api/ops/audit-log?${qs}`));
        } catch {
          break;
        }
        all.push(...(data.items || []));
        if (p >= (data.pages || 1) || all.length >= (data.total || 0)) break;
        p += 1;
        if (p > 50) break; // safety cap: 10k rows
      }
      const source = all.length > 0 ? all : filtered;
      exportCsv(csvFilename('audit-log', cat), ['id', 'action', 'actor', 'category', 'details', 'createdAt'], source.map((e) => ({ id: e.id, action: e.action, actor: e.actor, category: e.category, details: e.details, createdAt: e.createdAt })), { module: 'audit' });
    } finally {
      setExporting(false);
    }
  };

  const catColor = (c: string) =>
    c === 'financial' ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
    : c === 'cms' ? 'text-violet-300 border-violet-500/30 bg-violet-500/10'
    : c === 'auth' ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
    : c === 'pos' ? 'text-orange-300 border-orange-500/30 bg-orange-500/10'
    : 'text-sky-300 border-sky-500/30 bg-sky-500/10';

  return (
    <div className="space-y-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row gap-3">
        <label className="relative flex-1">
          <Search className="w-4 h-4 absolute start-3 top-3 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={language === 'ar' ? 'بحث في السجل...' : 'Search actions, actors, details...'}
            className="w-full ps-9 pe-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm"
            aria-label="Search audit log"
          />
        </label>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-[#121619] border border-white/10 text-sm"
          aria-label="Category"
        >
          {CATS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <ViewSwitcher moduleKey="system-audit" modes={['table']} value={{ mode: auditView.mode, density: auditView.density }} onChange={(p) => { auditView.setMode(p.mode); auditView.setDensity(p.density); }} />
        <button
          onClick={() => setCardMode((v) => !v)}
          aria-pressed={cardMode}
          title={cardMode ? 'Rows' : 'Cards'}
          className={`p-2.5 rounded-xl border transition ${cardMode ? 'bg-white text-slate-950 border-white' : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'}`}
        >
          {cardMode ? <Rows3 className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
        </button>
        <button
          onClick={exportAll}
          disabled={exporting}
          className="px-3 py-2.5 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white hover:border-rose-500/40 bg-white/[0.03] flex items-center gap-1.5 transition disabled:opacity-50"
          title={language === 'ar' ? 'تصدير CSV (كل الصفحات)' : 'Export CSV (all pages)'}
        >
          <Download className="w-3.5 h-3.5" />
          <span>CSV{typeof total === 'number' && total > 0 ? ` (${total})` : ''}</span>
        </button>
      </div>

      <div className="text-[11px] text-slate-500 font-mono px-1">
        {total} entries • {language === 'ar' ? 'الأحدث أولاً — سجل إلحاقي لا يُحذف' : 'Newest first — append-only, never deleted'}
      </div>

      {loading ? (
        <div className="space-y-2"><div className="shimmer-line h-16" /><div className="shimmer-line h-16" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-sm text-slate-400">
          {language === 'ar' ? 'لا إدخالات مطابقة.' : 'No matching entries.'}
        </div>
      ) : cardMode ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((e) => (
            <div key={e.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${catColor(e.category)}`}>{e.category}</span>
                <ScrollText className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-sm font-semibold text-white leading-snug"><Highlight text={e.action} needle={q} /></p>
              <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed"><Highlight text={e.details} needle={q} /></p>
              <p className="text-[11px] text-slate-500 pt-2 border-t border-white/[0.06]">{e.actor} • {(() => { try { return new Date(e.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-GB'); } catch { return e.createdAt; } })()}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className={`rounded-2xl border border-white/10 overflow-hidden ${auditView.density === 'compact' ? 'density-compact' : ''}`}>
          {filtered.map((e) => (
            <div key={e.id} className="audit-row flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-0 text-sm">
              <ScrollText className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white"><Highlight text={e.action} needle={q} /></span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${catColor(e.category)}`}>{e.category}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 break-words"><Highlight text={e.details} needle={q} /></p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {e.actor} • {(() => { try { return new Date(e.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-GB'); } catch { return e.createdAt; } })()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => { const p = page - 1; setPage(p); load(p, cat, debouncedQ); }}
          className="p-2 rounded-lg border border-white/10 disabled:opacity-40" aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
        </button>
        <span className="text-xs text-slate-400 font-mono">{page} / {pages}</span>
        <button
          disabled={page >= pages}
          onClick={() => { const p = page + 1; setPage(p); load(p, cat, debouncedQ); }}
          className="p-2 rounded-lg border border-white/10 disabled:opacity-40" aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
};

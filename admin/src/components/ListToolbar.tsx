import React from 'react';
import { Search, Download, LayoutGrid, Rows3, Table2, X } from 'lucide-react';

export type ListViewMode = 'cards' | 'table' | 'rows';

interface ListToolbarProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder: string;
  resultCount?: number;
  resultLabel?: string;
  onExport?: () => void;
  exportLabel?: string;
  viewMode?: ListViewMode;
  onViewChange?: (m: ListViewMode) => void;
  viewModes?: ListViewMode[];
  filters?: React.ReactNode;
  onReset?: () => void;
  resetLabel?: string;
  dark?: boolean;
}

/**
 * Shared list toolbar: search + filters + rows/cards/table switch + CSV export.
 * Use on every list page so UX is consistent. Styling adapts via `dark`
 * (admin dark glass) vs default (client gold).
 */
export const ListToolbar: React.FC<ListToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  resultCount,
  resultLabel,
  onExport,
  exportLabel = 'Export CSV',
  viewMode,
  onViewChange,
  viewModes = ['cards', 'table', 'rows'],
  filters,
  onReset,
  resetLabel = 'Reset',
  dark = true,
}) => {
  const icons = { cards: LayoutGrid, table: Table2, rows: Rows3 } as const;
  const showViews = viewMode && onViewChange;
  return (
    <div
      className={
        dark
          ? 'p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3'
          : 'p-4 rounded-2xl bg-[#111517] border border-brand-gold/25 flex flex-col gap-3'
      }
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <label className="relative flex-1">
          <Search
            className={`w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none ${dark ? 'text-slate-500' : 'text-brand-gold/60'}`}
          />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className={
              dark
                ? 'w-full ps-9 pe-9 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-400/40'
                : 'w-full ps-9 pe-9 py-2.5 rounded-xl bg-[#090b0c] border border-brand-gold/30 text-sm text-[#fdf1c2] placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-gold'
            }
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className={`absolute end-2 top-1/2 -translate-y-1/2 p-1 rounded-lg ${dark ? 'text-slate-500 hover:text-white' : 'text-brand-muted hover:text-white'}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </label>
        <div className="flex items-center gap-2 flex-shrink-0">
          {typeof resultCount === 'number' && (
            <span className={`text-[11px] font-mono px-2.5 py-1.5 rounded-lg border ${dark ? 'text-slate-400 border-white/10 bg-white/[0.03]' : 'text-brand-muted border-brand-gold/20 bg-black/40'}`}>
              {resultCount}{resultLabel ? ` ${resultLabel}` : ''}
            </span>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className={
                dark
                  ? 'px-3 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white hover:border-rose-500/40 bg-white/[0.03] flex items-center gap-1.5 transition'
                  : 'px-3 py-2 rounded-xl text-xs font-bold border border-brand-gold/30 text-brand-gold hover:bg-brand-gold hover:text-black flex items-center gap-1.5 transition'
              }
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportLabel}</span>
            </button>
          )}
          {showViews && (
            <div className={`flex items-center gap-1 p-1 rounded-xl border ${dark ? 'bg-white/[0.03] border-white/10' : 'bg-[#090b0c] border-brand-gold/20'}`} role="group" aria-label="Layout">
              {viewModes.map((m) => {
                const Icon = icons[m];
                const active = viewMode === m;
                return (
                  <button
                    key={m}
                    onClick={() => onViewChange!(m)}
                    aria-pressed={active}
                    title={m === 'cards' ? 'Cards' : m === 'table' ? 'Table' : 'Rows'}
                    className={
                      active
                        ? dark
                          ? 'p-2 rounded-lg bg-white text-slate-950'
                          : 'p-2 rounded-lg bg-brand-gold text-black'
                        : dark
                          ? 'p-2 rounded-lg text-slate-400 hover:text-white transition'
                          : 'p-2 rounded-lg text-brand-muted hover:text-brand-gold transition'
                    }
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {(filters || onReset) && (
        <div className={`flex flex-wrap items-center gap-2 pt-3 border-t ${dark ? 'border-white/[0.06]' : 'border-brand-gold/10'}`}>
          {filters}
          {onReset && (
            <button onClick={onReset} className={`text-xs underline px-1 ms-auto ${dark ? 'text-slate-400 hover:text-rose-300' : 'text-brand-muted hover:text-brand-gold'}`}>
              {resetLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

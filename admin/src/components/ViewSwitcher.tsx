import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { LayoutGrid, Table2, Rows3, UnfoldVertical, FoldVertical } from 'lucide-react';

export type ViewMode = 'cards' | 'table' | 'rows';
export type Density = 'comfortable' | 'compact';

interface Prefs {
  mode: ViewMode;
  density: Density;
}

const KEY = (m: string) => `etoile_view_${m}`;

function loadPrefs(moduleKey: string, fallback: ViewMode): Prefs {
  try {
    const raw = localStorage.getItem(KEY(moduleKey));
    if (raw) {
      const p = JSON.parse(raw);
      return {
        mode: ['cards', 'table', 'rows'].includes(p.mode) ? p.mode : fallback,
        density: p.density === 'compact' ? 'compact' : 'comfortable',
      };
    }
  } catch {
    // ignore
  }
  return { mode: fallback, density: 'comfortable' };
}

/** Per-module persisted layout prefs (cards/table/rows + density). */
export function useViewPrefs(moduleKey: string, fallback: ViewMode = 'cards') {
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(moduleKey, fallback));
  const set = (patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY(moduleKey), JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };
  return {
    mode: prefs.mode,
    density: prefs.density,
    setMode: (mode: ViewMode) => set({ mode }),
    setDensity: (density: Density) => set({ density }),
    /** Row padding + text scale for tables/lists. */
    rowPad: prefs.density === 'compact' ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-3 text-xs',
  };
}

/**
 * Global layout switcher. Pass modes subset where a layout makes no sense
 * (pure tables use density only).
 */
export const ViewSwitcher: React.FC<{
  moduleKey: string;
  modes?: ViewMode[];
  fallback?: ViewMode;
  value?: { mode: ViewMode; density: Density };
  onChange?: (p: { mode: ViewMode; density: Density }) => void;
}> = ({ moduleKey, modes = ['cards', 'table', 'rows'], fallback = 'cards', value, onChange }) => {
  const internal = useViewPrefs(moduleKey, fallback);
  const { language } = useAdmin();
  const mode = value?.mode ?? internal.mode;
  const density = value?.density ?? internal.density;
  const set = (patch: Partial<Prefs>) => {
    if (onChange) onChange({ mode, density, ...patch });
    else {
      if (patch.mode) internal.setMode(patch.mode);
      if (patch.density) internal.setDensity(patch.density);
    }
  };
  const icons = { cards: LayoutGrid, table: Table2, rows: Rows3 } as const;
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10" role="group" aria-label={language === 'ar' ? 'نمط العرض' : 'Layout'}>
      {modes.length > 1 && modes.map((m) => {
        const Icon = icons[m];
        return (
          <button
            key={m}
            onClick={() => set({ mode: m })}
            aria-pressed={mode === m}
            title={m}
            className={`p-2 rounded-lg transition ${mode === m ? 'nav-pill-active' : 'text-slate-400 hover:text-white'}`}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
      {modes.length > 1 && <span className="w-px h-5 bg-white/10 mx-0.5" />}
      <button
        onClick={() => set({ density: density === 'compact' ? 'comfortable' : 'compact' })}
        aria-pressed={density === 'compact'}
        title={density === 'compact' ? 'Comfortable' : 'Compact'}
        className="p-2 rounded-lg text-slate-400 hover:text-white transition"
      >
        {density === 'compact' ? <UnfoldVertical className="w-4 h-4" /> : <FoldVertical className="w-4 h-4" />}
      </button>
    </div>
  );
};

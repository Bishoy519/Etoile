import React from 'react';

export const SectionCard: React.FC<{
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}> = ({ title, subtitle, icon, action, children, className = '', padded = true }) => (
  <section className={`premium-card ${padded ? 'p-5' : ''} ${className}`}>
    <div className={`flex items-start justify-between gap-3 ${padded ? 'pb-4 mb-4 border-b border-white/[0.06]' : 'p-5 pb-4 border-b border-white/[0.06]'}`}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <span className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center flex-shrink-0">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-[15px] text-white leading-tight truncate">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
    <div className={padded ? '' : 'p-5 pt-4'}>{children}</div>
  </section>
);

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  hint: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon, title, hint, actionLabel, onAction }) => (
  <div className="py-10 px-6 flex flex-col items-center text-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.015]">
    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-300">
      {icon}
    </div>
    <div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">{hint}</p>
    </div>
    {actionLabel && onAction && (
      <button onClick={onAction} className="gold-btn px-4 py-2 text-xs font-bold mt-1">
        {actionLabel}
      </button>
    )}
  </div>
);

export const StatDelta: React.FC<{ value: string; positive?: boolean }> = ({ value, positive = true }) => (
  <span
    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
      positive
        ? 'bg-white/15 border-white/20 text-white'
        : 'bg-black/20 border-black/10 text-white/90'
    }`}
  >
    <span>{positive ? '▲' : '▼'}</span>
    <span>{value}</span>
  </span>
);

export function Sparkline({ points, stroke = '#fff', id }: { points: number[]; stroke?: string; id: string }) {
  const w = 120;
  const h = 36;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(1, max - min);
  const stepX = w / Math.max(1, points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = h - 4 - ((p - min) / range) * (h - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M ${coords.join(' L ')}`;
  const area = `${line} L ${w},${h} L 0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-[120px] h-9 overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${id})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
      <circle cx={w} cy={parseFloat(coords[coords.length - 1].split(',')[1])} r="3" fill="#fff" />
    </svg>
  );
}

export const ProgressBar: React.FC<{ value: number; tone?: 'emerald' | 'rose' | 'amber' | 'sky' | 'violet' }> = ({
  value,
  tone = 'emerald',
}) => {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-400',
    rose: 'bg-rose-400',
    amber: 'bg-amber-400',
    sky: 'bg-sky-400',
    violet: 'bg-violet-400',
  };
  return (
    <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
      <div className={`h-full rounded-full ${colors[tone]} transition-all duration-500`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
};

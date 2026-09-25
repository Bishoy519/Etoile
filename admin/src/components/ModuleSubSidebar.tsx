import React from 'react';

export interface ModuleSectionItem<T extends string = string> {
  id: T;
  label: string;
  labelAr: string;
  icon: React.ReactNode;
  count?: number | string;
  badge?: string;
}

export interface ModuleSubSidebarProps<T extends string = string> {
  title?: string;
  titleAr?: string;
  items: ModuleSectionItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  language?: 'en' | 'ar';
  actionButton?: {
    label: string;
    labelAr: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'gold' | 'outline';
  };
  extraActions?: React.ReactNode;
  className?: string;
}

export const ModuleSubSidebar = <T extends string = string>({
  title,
  titleAr,
  items,
  activeId,
  onChange,
  language = 'en',
  actionButton,
  extraActions,
  className = '',
}: ModuleSubSidebarProps<T>) => {
  const isAr = language === 'ar';
  const defaultTitle = isAr ? 'أقسام الوحدة' : 'Module Sections';

  return (
    <aside
      className={`w-full lg:w-60 xl:w-64 flex-shrink-0 bg-[#171d2b] border border-white/10 rounded-2xl p-2.5 sm:p-3 shadow-xl flex flex-col gap-2.5 transition-all duration-200 ${className}`}
    >
      {/* Header bar */}
      <div className="px-2.5 pt-1.5 pb-2 border-b border-white/10 flex items-center justify-between">
        <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-slate-400 font-mono">
          {isAr ? titleAr || defaultTitle : title || defaultTitle}
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
      </div>

      {/* Navigation list: Horizontal scroll on mobile, vertical stacked on desktop */}
      <nav className="flex flex-row lg:flex-col items-stretch gap-1 overflow-x-auto lg:overflow-x-visible no-scrollbar pb-1 lg:pb-0 touch-scroll">
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`w-full px-3 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center justify-between whitespace-nowrap flex-shrink-0 group active:scale-[0.98] cursor-pointer text-start ${
                isActive
                  ? 'nav-pill-active bg-white text-slate-950 shadow-md shadow-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-white'
                  }`}
                >
                  {item.icon}
                </span>
                <span className={`truncate ${isActive ? 'font-bold text-slate-950' : 'font-medium'}`}>
                  {isAr ? item.labelAr : item.label}
                </span>
              </div>

              {item.count !== undefined && item.count !== null && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex-shrink-0 ml-2 rtl:ml-0 rtl:mr-2 ${
                    isActive
                      ? 'bg-slate-950 text-white'
                      : 'bg-[#111622] text-slate-400 border border-white/5'
                  }`}
                >
                  {item.count}
                </span>
              )}

              {item.badge && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold uppercase ml-2 rtl:ml-0 rtl:mr-2">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Action button if provided */}
      {(actionButton || extraActions) && (
        <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
          {actionButton && (
            <button
              type="button"
              onClick={actionButton.onClick}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.98] ${
                actionButton.variant === 'outline'
                  ? 'bg-[#1c2333] hover:bg-[#242d42] text-white border border-white/10 hover:border-rose-500'
                  : 'action-btn-coral shadow-sm'
              }`}
            >
              {actionButton.icon}
              <span>{isAr ? actionButton.labelAr : actionButton.label}</span>
            </button>
          )}
          {extraActions}
        </div>
      )}
    </aside>
  );
};

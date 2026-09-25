import React from 'react';
import { useAdmin } from '../context/AdminContext';
import { CheckCircle2, AlertTriangle, XCircle, Sparkles, X, Trash2, Check } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAdmin();

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="System Notifications"
      className="fixed bottom-4 end-4 sm:bottom-6 sm:end-6 z-50 flex flex-col gap-3 max-w-[calc(100vw-2rem)] sm:max-w-[420px] w-full pointer-events-none"
    >
      {toasts.slice(0, 5).map((toast) => {
        const isConfirm = Boolean(toast.actions && toast.actions.length > 0);
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';
        const isSuccess = toast.type === 'success';
        const isGold = toast.type === 'gold';

        const borderColor = isConfirm
          ? isError
            ? 'border-rose-500/60 shadow-[0_20px_50px_rgba(225,29,72,0.3)] ring-1 ring-rose-500/30'
            : 'border-amber-400/60 shadow-[0_20px_50px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/30'
          : isSuccess
          ? 'border-emerald-500/40 shadow-[0_15px_40px_rgba(16,185,129,0.18)]'
          : isWarning
          ? 'border-amber-500/40 shadow-[0_15px_40px_rgba(245,158,11,0.18)]'
          : isGold
          ? 'border-amber-400/40 shadow-[0_15px_40px_rgba(251,191,36,0.18)]'
          : 'border-rose-500/40 shadow-[0_15px_40px_rgba(244,63,94,0.18)]';

        const titleColor = isSuccess
          ? 'text-emerald-300'
          : isWarning
          ? 'text-amber-300'
          : isGold
          ? 'text-amber-300'
          : 'text-rose-300';

        return (
          <div
            key={toast.id}
            role={isConfirm ? 'alert' : 'status'}
            aria-live={isConfirm ? 'assertive' : 'polite'}
            className={`pointer-events-auto bg-[#131722]/95 border ${borderColor} rounded-2xl p-4 backdrop-blur-xl flex flex-col gap-2.5 animate-in slide-in-from-bottom-5 duration-300 relative overflow-hidden group transition-all`}
          >
            {/* Atmospheric glow */}
            <div
              className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-25 ${
                isError ? 'bg-rose-500' : isSuccess ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : 'bg-amber-400'
              }`}
            />

            <div className="flex items-start gap-3 relative z-10">
              <div className="mt-0.5 shrink-0">
                {isConfirm ? (
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-inner ${
                      isError
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                        : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    }`}
                  >
                    {isError ? (
                      <Trash2 className="w-4 h-4 animate-pulse text-rose-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 animate-pulse text-amber-300" />
                    )}
                  </div>
                ) : (
                  <>
                    {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                    {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-400" />}
                    {toast.type === 'gold' && <Sparkles className="w-5 h-5 text-amber-300" />}
                  </>
                )}
              </div>

              <div className="flex-1 text-start rtl:text-right min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={`font-heading text-sm font-bold tracking-tight ${titleColor}`}>
                    {toast.title}
                  </h4>
                  {isConfirm && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider font-semibold">
                      Action Required
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300/90 mt-1 leading-relaxed">
                  {toast.message}
                </p>
              </div>

              <button
                onClick={() => {
                  removeToast(toast.id);
                  toast.onDismiss?.();
                }}
                aria-label="Dismiss notification"
                className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/[0.08] transition -mr-1 -mt-1 shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive Actions for Confirmation Cards */}
            {toast.actions && toast.actions.length > 0 && (
              <div className="flex items-center justify-end gap-2 pt-2.5 mt-1 border-t border-white/[0.08] relative z-10">
                {toast.actions.map((action, idx) => {
                  const isDanger = action.variant === 'danger';
                  const isGoldAction = action.variant === 'gold';

                  return (
                    <button
                      key={idx}
                      onClick={action.onClick}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                        isDanger
                          ? 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-[0_2px_12px_rgba(225,29,72,0.4)] hover:shadow-[0_4px_16px_rgba(225,29,72,0.6)]'
                          : isGoldAction
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold shadow-[0_2px_12px_rgba(245,158,11,0.3)]'
                          : 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      {action.icon === 'trash' && <Trash2 className="w-3.5 h-3.5" />}
                      {action.icon === 'check' && <Check className="w-3.5 h-3.5" />}
                      {action.icon === 'x' && <X className="w-3.5 h-3.5" />}
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Auto-dismiss timer progress bar */}
            {toast.duration && toast.duration > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full animate-toast-timer ${
                    isError
                      ? 'bg-gradient-to-r from-rose-500 to-rose-400'
                      : isWarning
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                      : isGold
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  }`}
                  style={{
                    animationDuration: `${toast.duration}ms`,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

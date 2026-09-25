import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, XCircle, Sparkles, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div role="status" aria-live="polite" className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col gap-3 max-w-[calc(100vw-2rem)] sm:max-w-sm w-full pointer-events-none">
      {toasts.slice(0, 4).map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-[#121617]/95 border border-brand-gold/60 rounded-xl p-4 shadow-[0_15px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(226,190,104,0.3)] backdrop-blur-md flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="mt-0.5 shrink-0">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-400" />}
            {toast.type === 'gold' && <Sparkles className="w-5 h-5 text-brand-gold" />}
          </div>

          <div className="flex-1 text-start rtl:text-right">
            <h4 className="font-serif text-sm font-semibold text-brand-gold">{toast.title}</h4>
            <p className="text-xs text-brand-muted/90 mt-0.5 leading-relaxed">{toast.message}</p>
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="text-brand-muted/40 hover:text-brand-gold p-1.5 min-w-[28px] min-h-[28px] transition"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

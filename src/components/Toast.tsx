import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, RotateCcw } from 'lucide-react';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const getIcon = () => {
          switch (toast.type) {
            case 'success':
              return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
            case 'error':
              return <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />;
            case 'warning':
              return <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
            default:
              return <Info className="w-5 h-5 text-sky-600 shrink-0" />;
          }
        };

        const getBgBorder = () => {
          switch (toast.type) {
            case 'success':
              return 'bg-white border-emerald-300 text-emerald-950 shadow-emerald-500/10';
            case 'error':
              return 'bg-white border-rose-300 text-rose-950 shadow-rose-500/10';
            case 'warning':
              return 'bg-white border-amber-300 text-amber-950 shadow-amber-500/10';
            default:
              return 'bg-white border-sky-300 text-sky-950 shadow-sky-500/10';
          }
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border-2 shadow-xl backdrop-blur-md animate-slide-up transition-all ${getBgBorder()}`}
          >
            {getIcon()}
            <div className="flex-1 text-xs">
              <span className="font-extrabold block text-slate-900">{toast.title}</span>
              <span className="text-slate-600 mt-0.5 block leading-relaxed">{toast.message}</span>

              {toast.undoAction && (
                <div className="mt-2.5">
                  <button
                    onClick={() => {
                      toast.undoAction?.();
                      onDismiss(toast.id);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 font-extrabold text-[11px] rounded-lg border border-brand-200 shadow-2xs transition-all active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {toast.undoLabel || 'Deshacer consumo'}
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  showDontAskAgain?: boolean;
  dontAskAgain?: boolean;
  onToggleDontAskAgain?: (checked: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  showDontAskAgain = false,
  dontAskAgain = false,
  onToggleDontAskAgain,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="confirm-dialog-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        id="confirm-dialog-box"
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto sm:hidden mt-2.5 shrink-0" />

        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isDestructive
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-amber-100 text-amber-600'
              }`}
            >
              {isDestructive ? (
                <Trash2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-900 leading-snug">{title}</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed break-words">
                {message}
              </p>
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full active:bg-slate-100 cursor-pointer -mr-2 -mt-2"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Optional "Don't ask again" option */}
          {showDontAskAgain && onToggleDontAskAgain && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={dontAskAgain}
                  onChange={(e) => onToggleDontAskAgain(e.target.checked)}
                  className="w-4 h-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Don&apos;t ask confirmation again (Quick 1-tap delete)</span>
              </label>
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[48px] px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl active:bg-slate-100 cursor-pointer flex items-center justify-center"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`min-h-[48px] px-4 py-2.5 text-sm font-bold text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center ${
                isDestructive
                  ? 'bg-rose-600 active:bg-rose-700'
                  : 'bg-emerald-600 active:bg-emerald-700'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

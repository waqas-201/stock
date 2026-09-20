import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X, FileText, CheckCircle2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  requireNote?: boolean;
  notePlaceholder?: string;
  initialNote?: string;
  onConfirm: () => void;
  onConfirmWithNote?: (note: string) => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  requireNote = false,
  notePlaceholder = 'Enter reason or audit note (e.g. Scrapped, Damaged, Discontinued)...',
  initialNote = '',
  onConfirm,
  onConfirmWithNote,
  onCancel,
}) => {
  const [note, setNote] = useState(initialNote);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNote(initialNote);
      setError(null);
      if (requireNote) {
        const timer = setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, initialNote, requireNote]);

  // Keyboard shortcuts: Enter / Ctrl+Enter to confirm, Escape to cancel
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleApprove();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, note, requireNote]);

  if (!isOpen) return null;

  const handleApprove = () => {
    if (requireNote && !note.trim()) {
      setError('A note or reason is required to approve this action.');
      inputRef.current?.focus();
      return;
    }

    if (onConfirmWithNote) {
      onConfirmWithNote(note.trim());
    } else {
      onConfirm();
    }
  };

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

          {/* Mandatory Reason / Audit Note Field */}
          {requireNote && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="confirm-dialog-note-input"
                  className="text-xs font-bold text-slate-700 flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reason / Audit Note</span>
                  <span className="text-rose-600 font-bold">* (Required to approve)</span>
                </label>
              </div>
              <input
                ref={inputRef}
                id="confirm-dialog-note-input"
                type="text"
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={notePlaceholder}
                className={`w-full px-3 py-2 text-xs sm:text-sm text-slate-900 bg-white border rounded-xl focus:outline-hidden transition-colors ${
                  error
                    ? 'border-rose-500 ring-2 ring-rose-500/20'
                    : 'border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent'
                }`}
              />
              {error ? (
                <p className="mt-1 text-xs text-rose-600 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  {error}
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">
                  A note is strictly required to ensure full accountability in the audit trail.
                </p>
              )}
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[48px] px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl active:bg-slate-100 cursor-pointer flex items-center justify-center gap-1"
            >
              <span>{cancelLabel}</span>
              <kbd className="hidden sm:inline-block px-1 py-0.2 text-[9px] font-mono bg-slate-100 border border-slate-300 rounded text-slate-500">
                Esc
              </kbd>
            </button>
            <button
              id="confirm-dialog-approve-btn"
              type="button"
              onClick={handleApprove}
              className={`min-h-[48px] px-4 py-2.5 text-sm font-bold text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                requireNote && !note.trim()
                  ? 'bg-rose-400/80 cursor-pointer'
                  : isDestructive
                  ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{confirmLabel}</span>
              <kbd className="hidden sm:inline-block px-1 py-0.2 text-[9px] font-mono bg-black/20 text-white rounded border border-white/20">
                Enter
              </kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

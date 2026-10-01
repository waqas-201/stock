import React, { useEffect } from 'react';
import { AlertTriangle, Bookmark, Trash2, ArrowLeft, X } from 'lucide-react';

interface UnsavedDraftConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  summaryBadge?: string;
  onSaveDraftAndClose: () => void;
  onDiscardAndClose: () => void;
  onKeepEditing: () => void;
}

export const UnsavedDraftConfirmDialog: React.FC<UnsavedDraftConfirmDialogProps> = ({
  isOpen,
  title = 'Unsaved Delivery Challan',
  subtitle = 'You have unsaved changes in this form. Would you like to save your progress as a draft so you can resume where you left off later?',
  summaryBadge,
  onSaveDraftAndClose,
  onDiscardAndClose,
  onKeepEditing,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onKeepEditing();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        onSaveDraftAndClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onKeepEditing, onSaveDraftAndClose]);

  if (!isOpen) return null;

  return (
    <div
      id="unsaved-draft-dialog-backdrop"
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onKeepEditing}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-dialog-title"
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3
                  id="unsaved-dialog-title"
                  className="text-base font-bold text-slate-900 tracking-tight"
                >
                  {title}
                </h3>
                <button
                  type="button"
                  onClick={onKeepEditing}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
                  title="Keep editing"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {subtitle}
              </p>
            </div>
          </div>

          {summaryBadge && (
            <div className="mt-3.5 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 flex items-center justify-between font-medium">
              <span className="text-slate-500">Form Contents:</span>
              <span className="font-semibold text-slate-900">{summaryBadge}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row-reverse gap-2 sm:gap-2.5">
          {/* Option 1: Save as Draft & Exit (Primary, Safe) */}
          <button
            type="button"
            onClick={onSaveDraftAndClose}
            className="w-full sm:flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Bookmark className="w-4 h-4" />
            <span>Save Draft & Close</span>
          </button>

          {/* Option 2: Discard & Exit */}
          <button
            type="button"
            onClick={onDiscardAndClose}
            className="w-full sm:w-auto py-2.5 px-3.5 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-200 hover:border-rose-300 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Discard Changes</span>
          </button>

          {/* Option 3: Keep Editing */}
          <button
            type="button"
            onClick={onKeepEditing}
            className="w-full sm:w-auto py-2.5 px-3 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Continue Editing</span>
          </button>
        </div>
      </div>
    </div>
  );
};

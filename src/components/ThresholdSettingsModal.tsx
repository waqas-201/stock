import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Check, SlidersHorizontal, Info, Minus, Plus } from 'lucide-react';

interface ThresholdSettingsModalProps {
  isOpen: boolean;
  currentThreshold: number;
  onClose: () => void;
  onSaveThreshold: (newThreshold: number) => void;
}

export const ThresholdSettingsModal: React.FC<ThresholdSettingsModalProps> = ({
  isOpen,
  currentThreshold,
  onClose,
  onSaveThreshold,
}) => {
  const [value, setValue] = useState<number>(currentThreshold);

  useEffect(() => {
    setValue(currentThreshold);
  }, [currentThreshold, isOpen]);

  if (!isOpen) return null;

  const presets = [1, 2, 3, 5, 10, 15, 20, 50];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanVal = Math.max(0, Math.floor(Number(value) || 0));
    onSaveThreshold(cleanVal);
    onClose();
  };

  return (
    <div
      id="threshold-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="threshold-modal-box"
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto sm:hidden mt-2.5 shrink-0" />

        {/* Header */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Low Stock Threshold
              </h3>
              <p className="text-xs text-slate-500">
                Alert trigger when quantity drops to or below
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full active:bg-slate-200/60 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label
              htmlFor="threshold-input"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
            >
              Alert Threshold (Units)
            </label>

            {/* Stepper with 48px buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setValue((v) => Math.max(0, v - 1))}
                className="min-h-[48px] min-w-[48px] rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-lg transition-transform active:scale-95 cursor-pointer"
                aria-label="Decrease threshold"
              >
                <Minus className="w-5 h-5" />
              </button>

              <div className="relative flex-1">
                <input
                  id="threshold-input"
                  type="number"
                  min="0"
                  max="99999"
                  required
                  value={value}
                  onChange={(e) => setValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full min-h-[48px] text-center text-2xl font-bold font-mono text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                  units
                </span>
              </div>

              <button
                type="button"
                onClick={() => setValue((v) => v + 1)}
                className="min-h-[48px] min-w-[48px] rounded-xl border border-amber-300 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-800 flex items-center justify-center font-bold text-lg transition-transform active:scale-95 cursor-pointer"
                aria-label="Increase threshold"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Preset Buttons (44px touch targets) */}
          <div>
            <span className="block text-xs font-semibold text-slate-500 mb-2">
              Quick Presets:
            </span>
            <div className="grid grid-cols-4 gap-2">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setValue(p)}
                  className={`min-h-[44px] px-2 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                    value === p
                      ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-2xs ring-2 ring-amber-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 active:bg-slate-100'
                  }`}
                >
                  ≤ {p}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic explanation note */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Items with stock between <strong>1</strong> and{' '}
              <strong className="text-slate-900 font-mono font-bold">{value}</strong> will display
              a yellow warning badge and appear in the <strong>Low Stock</strong> filter.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl active:bg-slate-100 cursor-pointer flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              id="btn-save-threshold"
              type="submit"
              className="min-h-[48px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-bold text-white bg-amber-600 active:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Apply (≤ {value})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Minus,
  Plus,
  Package,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  ArrowRight,
  Sparkles,
  Edit2,
  Tag as TagIcon,
} from 'lucide-react';
import { StockItem, StockUnit } from '../types';

interface QuickSaleModalProps {
  isOpen: boolean;
  item: StockItem | null;
  units?: StockUnit[];
  onClose: () => void;
  onConfirmSale: (item: StockItem, quantitySold: number, note?: string) => void;
  onSwitchToEdit?: (item: StockItem) => void;
}

export const QuickSaleModal: React.FC<QuickSaleModalProps> = ({
  isOpen,
  item,
  onClose,
  onConfirmSale,
  onSwitchToEdit,
}) => {
  const [quantitySold, setQuantitySold] = useState<number>(1);
  const [quantityInputStr, setQuantityInputStr] = useState<string>('1');
  const [note, setNote] = useState<string>('');
  const [showNoteInput, setShowNoteInput] = useState<boolean>(false);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  // Reset and auto-focus when modal opens with an item
  useEffect(() => {
    if (isOpen && item) {
      setQuantitySold(1);
      setQuantityInputStr('1');
      setNote('');
      setShowNoteInput(false);

      // Auto-focus and auto-select quantity input so pressing Enter immediately sells 1,
      // or typing a number immediately replaces it
      const timer = setTimeout(() => {
        if (quantityInputRef.current) {
          quantityInputRef.current.focus();
          quantityInputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, item]);

  // Keyboard shortcut listener inside the modal: Enter to confirm, Esc to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        // Submit if not in a textarea with shift key
        const activeTag = (document.activeElement as HTMLElement)?.tagName;
        if (activeTag === 'TEXTAREA' && e.shiftKey) return;

        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, item, quantitySold, note]);

  if (!isOpen || !item) return null;

  const currentQty = item.quantity || 0;
  const remainingQty = currentQty - quantitySold;
  const isExceeding = quantitySold > currentQty;
  const isZeroStock = currentQty <= 0;
  const lowThreshold = item.lowStockThreshold ?? 5;
  const willBeLowStock = remainingQty > 0 && remainingQty <= lowThreshold;
  const willBeOutOfStock = remainingQty <= 0;

  const handleQuantityChange = (valStr: string) => {
    setQuantityInputStr(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setQuantitySold(parsed);
    } else if (valStr === '') {
      setQuantitySold(0);
    }
  };

  const handleAdjustStep = (delta: number) => {
    const next = Math.max(1, quantitySold + delta);
    setQuantitySold(next);
    setQuantityInputStr(String(next));
    if (quantityInputRef.current) {
      quantityInputRef.current.focus();
    }
  };

  const handlePresetSelect = (presetQty: number) => {
    const finalQty = Math.max(1, presetQty);
    setQuantitySold(finalQty);
    setQuantityInputStr(String(finalQty));
    if (quantityInputRef.current) {
      quantityInputRef.current.focus();
      quantityInputRef.current.select();
    }
  };

  const handleConfirm = () => {
    if (!item) return;
    const finalQty = quantitySold > 0 ? quantitySold : 1;
    onConfirmSale(item, finalQty, note.trim() || undefined);
    onClose();
  };

  return (
    <div
      id="quick-sale-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-sale-modal-title"
    >
      <div
        id="quick-sale-modal-card"
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header with high contrast, crisp branding & keyboard badge */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0 border border-white/20">
              <Receipt className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2
                  id="quick-sale-modal-title"
                  className="text-base font-bold tracking-tight text-white"
                >
                  Quick Sale / Bill
                </h2>
                <span className="text-[10px] font-mono font-bold bg-white/20 text-emerald-100 px-1.5 py-0.5 rounded border border-white/30">
                  Alt + B
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium">
                Fast mouse-free stock deduction
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-xl transition-colors cursor-pointer"
            aria-label="Close sale modal"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Target Item Details Card */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Item to Sell
                </span>
                {item.tags && item.tags.length > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                    <TagIcon className="w-2.5 h-2.5" />
                    {item.tags[0]}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900 truncate mt-0.5">
                {item.itemName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Unit: <span className="font-semibold text-slate-700">{item.unit}</span>
                {item.productionDate && ` • Mfg: ${item.productionDate}`}
              </p>
            </div>

            {/* Current Stock Badge */}
            <div className="text-right shrink-0">
              <div className="text-[10px] uppercase font-bold text-slate-400">Current Stock</div>
              <div
                className={`text-lg font-bold font-mono ${
                  isZeroStock
                    ? 'text-rose-600'
                    : currentQty <= lowThreshold
                    ? 'text-amber-600'
                    : 'text-emerald-700'
                }`}
              >
                {currentQty.toLocaleString()} <span className="text-xs font-sans text-slate-500">{item.unit}</span>
              </div>
            </div>
          </div>

          {/* Quantity Input with Steppers & Quick Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="quick-sale-quantity-input"
                className="text-xs font-bold text-slate-700 flex items-center gap-1"
              >
                <span>Quantity Sold ({item.unit})</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                Type number or use + / -
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAdjustStep(-1)}
                disabled={quantitySold <= 1}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-lg transition-colors cursor-pointer border border-slate-200"
                title="Subtract 1 unit"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                id="quick-sale-quantity-input"
                ref={quantityInputRef}
                type="number"
                min="1"
                step="1"
                value={quantityInputStr}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="flex-1 min-h-[44px] text-center text-xl font-bold font-mono text-slate-900 bg-white border-2 border-emerald-600 rounded-xl focus:outline-hidden focus:ring-4 focus:ring-emerald-500/20 shadow-xs"
                placeholder="1"
                required
              />

              <button
                type="button"
                onClick={() => handleAdjustStep(1)}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-800 flex items-center justify-center font-bold text-lg transition-colors cursor-pointer border border-emerald-200"
                title="Add 1 unit"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Preset Buttons */}
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-400 mr-0.5">Quick:</span>
              {[1, 2, 5, 10].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={`min-h-[28px] px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    quantitySold === preset
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset} {item.unit}
                </button>
              ))}
              {currentQty > 0 && currentQty !== 1 && currentQty !== 2 && currentQty !== 5 && currentQty !== 10 && (
                <button
                  type="button"
                  onClick={() => handlePresetSelect(currentQty)}
                  className={`min-h-[28px] px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    quantitySold === currentQty
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Sell all available stock"
                >
                  All ({currentQty})
                </button>
              )}
            </div>
          </div>

          {/* Dynamic Stock Impact Calculation */}
          <div
            className={`p-3 rounded-xl border transition-colors ${
              isExceeding
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : willBeOutOfStock
                ? 'bg-rose-50/70 border-rose-200 text-rose-800'
                : willBeLowStock
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-1">
                {isExceeding ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="font-bold">Notice: Exceeds recorded inventory</span>
                  </>
                ) : willBeOutOfStock ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Stock will reach 0 (Out of stock)</span>
                  </>
                ) : willBeLowStock ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Stock will become low (≤ {lowThreshold} {item.unit})</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Healthy stock remaining</span>
                  </>
                )}
              </div>

              <div className="font-mono font-bold text-xs">
                {currentQty} - {quantitySold} = {remainingQty} {item.unit}
              </div>
            </div>
          </div>

          {/* Optional Sale Note Toggle */}
          <div>
            {!showNoteInput ? (
              <button
                type="button"
                onClick={() => setShowNoteInput(true)}
                className="text-xs text-slate-500 hover:text-emerald-700 font-medium underline cursor-pointer flex items-center gap-1"
              >
                <span>+ Add sale note or customer name (optional)</span>
              </button>
            ) : (
              <div>
                <label
                  htmlFor="quick-sale-note-input"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Sale Reference / Note
                </label>
                <input
                  id="quick-sale-note-input"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., Counter sale, Customer order #..."
                  className="w-full px-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer with Primary Enter Shortcut & Edit Transition */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          {/* Switch to full edit if desired */}
          {onSwitchToEdit ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onSwitchToEdit(item);
              }}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer p-1.5 rounded-lg hover:bg-slate-200/50"
              title="Open full edit form (Alt + E)"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden xs:inline">Edit Details</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel <kbd className="hidden sm:inline-block ml-1 px-1 py-0.2 text-[9px] font-mono bg-slate-100 border border-slate-300 rounded text-slate-500">Esc</kbd>
            </button>

            <button
              id="btn-confirm-quick-sale"
              type="button"
              onClick={handleConfirm}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Record sale (Press Enter)"
            >
              <span>Record Sale</span>
              <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-100 bg-emerald-800/80 rounded border border-emerald-500/50">
                Enter
              </kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

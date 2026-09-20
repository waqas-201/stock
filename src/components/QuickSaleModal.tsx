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
  onRestockItem?: (item: StockItem) => void;
}

export const QuickSaleModal: React.FC<QuickSaleModalProps> = ({
  isOpen,
  item,
  onClose,
  onConfirmSale,
  onSwitchToEdit,
  onRestockItem,
}) => {
  const [quantitySold, setQuantitySold] = useState<number>(1);
  const [quantityInputStr, setQuantityInputStr] = useState<string>('1');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);

  // Reset and auto-focus when modal opens with an item
  useEffect(() => {
    if (isOpen && item) {
      const stock = item.quantity || 0;
      if (stock <= 0) {
        setQuantitySold(0);
        setQuantityInputStr('0');
      } else {
        setQuantitySold(1);
        setQuantityInputStr('1');
      }
      setNote('');
      setError(null);

      // Auto-focus and auto-select quantity input only if item has positive stock
      const timer = setTimeout(() => {
        if (quantityInputRef.current && stock > 0) {
          quantityInputRef.current.focus();
          quantityInputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, item]);

  // Keyboard shortcut listener inside the modal: Enter to confirm (if valid), Esc to close
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

        // Block if stock is 0 or exceeding
        const availableStock = item?.quantity || 0;
        if (availableStock <= 0 || quantitySold <= 0 || quantitySold > availableStock) {
          e.preventDefault();
          return;
        }

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
  const willBeLowStock = !isZeroStock && remainingQty > 0 && remainingQty <= lowThreshold;
  const willBeOutOfStock = !isZeroStock && remainingQty <= 0;

  const handleQuantityChange = (valStr: string) => {
    if (isZeroStock) return;
    setError(null);
    setQuantityInputStr(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setQuantitySold(parsed);
    } else if (valStr === '') {
      setQuantitySold(0);
    }
  };

  const handleAdjustStep = (delta: number) => {
    if (isZeroStock) return;
    setError(null);
    const next = Math.max(1, Math.min(currentQty, quantitySold + delta));
    setQuantitySold(next);
    setQuantityInputStr(String(next));
    if (quantityInputRef.current) {
      quantityInputRef.current.focus();
    }
  };

  const handlePresetSelect = (presetQty: number) => {
    if (isZeroStock) return;
    setError(null);
    const finalQty = Math.max(1, Math.min(currentQty, presetQty));
    setQuantitySold(finalQty);
    setQuantityInputStr(String(finalQty));
    if (quantityInputRef.current) {
      quantityInputRef.current.focus();
      quantityInputRef.current.select();
    }
  };

  const handleConfirm = () => {
    if (!item) return;
    if (currentQty <= 0) return; // Strict guard: stock is already 0 -> cannot record sale
    if (quantitySold <= 0 || quantitySold > currentQty) return; // Cannot exceed available stock
    
    if (!note.trim()) {
      setError('A sale note or reference is required to approve this sale.');
      noteInputRef.current?.focus();
      return;
    }

    onConfirmSale(item, quantitySold, note.trim());
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

          {/* Zero Stock Alert Banner */}
          {isZeroStock && (
            <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-200 text-rose-900 flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <p className="font-bold text-rose-900 text-sm">Cannot Record Sale: Item Out of Stock</p>
                <p className="text-rose-700 mt-0.5 leading-relaxed">
                  This item currently has <strong className="font-mono">0 {item.unit}</strong> in inventory. Sales cannot be recorded until stock is added.
                </p>
                {onRestockItem && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRestockItem(item);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 active:bg-rose-900 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Restock / Receive Inventory</span>
                  </button>
                )}
              </div>
            </div>
          )}

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
                {isZeroStock ? 'Stock is 0' : 'Type number or use + / -'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAdjustStep(-1)}
                disabled={isZeroStock || quantitySold <= 1}
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
                max={currentQty > 0 ? currentQty : 0}
                step="1"
                value={quantityInputStr}
                onChange={(e) => handleQuantityChange(e.target.value)}
                disabled={isZeroStock}
                className={`flex-1 min-h-[44px] text-center text-xl font-bold font-mono rounded-xl focus:outline-hidden shadow-xs transition-colors ${
                  isZeroStock
                    ? 'bg-slate-100 text-slate-400 border border-slate-300 cursor-not-allowed'
                    : isExceeding
                    ? 'bg-rose-50/50 text-rose-900 border-2 border-rose-500 focus:ring-4 focus:ring-rose-500/20'
                    : 'bg-white text-slate-900 border-2 border-emerald-600 focus:ring-4 focus:ring-emerald-500/20'
                }`}
                placeholder="0"
                required
              />

              <button
                type="button"
                onClick={() => handleAdjustStep(1)}
                disabled={isZeroStock || quantitySold >= currentQty}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-lg transition-colors cursor-pointer border border-emerald-200"
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
                  disabled={isZeroStock || preset > currentQty}
                  className={`min-h-[28px] px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                    isZeroStock || preset > currentQty
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                      : quantitySold === preset
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs cursor-pointer'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 cursor-pointer'
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
              isZeroStock
                ? 'bg-slate-100 border-slate-200 text-slate-600'
                : isExceeding
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
                {isZeroStock ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="font-bold text-rose-800">Stock is already 0 • Sale blocked</span>
                  </>
                ) : isExceeding ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="font-bold">Notice: Exceeds available stock</span>
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
                {isZeroStock ? (
                  <span className="text-rose-700">0 {item.unit} available</span>
                ) : (
                  <span>{currentQty} - {quantitySold} = {remainingQty} {item.unit}</span>
                )}
              </div>
            </div>
          </div>

          {/* Sale Note / Reference - Mandatory for approval */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="quick-sale-note-input"
                className="text-xs font-bold text-slate-700 flex items-center gap-1"
              >
                <span>Sale Note / Reference</span>
                <span className="text-rose-600 font-bold">* (Required to approve)</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                Mandatory • Tab to reach
              </span>
            </div>
            <input
              ref={noteInputRef}
              id="quick-sale-note-input"
              type="text"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g., Counter sale, Customer name, Invoice #..."
              className={`w-full px-3 py-2 text-xs sm:text-sm text-slate-900 bg-white border rounded-xl focus:outline-hidden shadow-2xs transition-colors ${
                error
                  ? 'border-rose-500 ring-2 ring-rose-500/20'
                  : 'border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent placeholder:text-slate-400'
              }`}
            />
            {error ? (
              <p className="mt-1.5 text-xs text-rose-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-400">
                A note is strictly required to approve this sale and log it in the audit trail.
              </p>
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
              disabled={isZeroStock || quantitySold <= 0 || isExceeding || !note.trim()}
              className={`min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-colors ${
                isZeroStock || quantitySold <= 0 || isExceeding || !note.trim()
                  ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                  : 'text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 cursor-pointer'
              }`}
              title={
                isZeroStock
                  ? 'Item is out of stock (0) - cannot record sale'
                  : isExceeding
                  ? 'Quantity exceeds available stock'
                  : !note.trim()
                  ? 'A sale note is required to approve'
                  : 'Record sale (Press Enter)'
              }
            >
              {isZeroStock ? (
                <span>Out of Stock (Sale Blocked)</span>
              ) : isExceeding ? (
                <span>Exceeds Stock ({currentQty})</span>
              ) : (
                <>
                  <span>Approve Sale</span>
                  <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-100 bg-emerald-800/80 rounded border border-emerald-500/50">
                    Enter
                  </kbd>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

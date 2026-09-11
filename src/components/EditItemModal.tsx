import React, { useState, useEffect } from 'react';
import { X, Check, Edit2, Scale, SlidersHorizontal, Minus, Plus } from 'lucide-react';
import { StockItem, StockUnit } from '../types';

interface EditItemModalProps {
  isOpen: boolean;
  item: StockItem | null;
  units: StockUnit[];
  defaultThreshold: number;
  onClose: () => void;
  onSave: (
    id: string,
    itemName: string,
    unit: string,
    quantity: number,
    threshold?: number
  ) => void;
  onOpenUnitModal: () => void;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  isOpen,
  item,
  units,
  defaultThreshold,
  onClose,
  onSave,
  onOpenUnitModal,
}) => {
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState('');
  const [customThreshold, setCustomThreshold] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setItemName(item.itemName);
      setUnit(item.unit);
      setQuantity(item.quantity.toString());
      setCustomThreshold(
        item.lowStockThreshold !== undefined ? item.lowStockThreshold.toString() : ''
      );
      setShowAdvanced(item.lowStockThreshold !== undefined);
      setError(null);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const handleStepQuantity = (delta: number) => {
    const curr = parseFloat(quantity) || 0;
    const next = Math.max(0, curr + delta);
    setQuantity(next.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = itemName.trim();
    if (!cleanName) {
      setError('Item name is required');
      return;
    }

    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty < 0) {
      setError('Please enter a valid non-negative quantity');
      return;
    }

    let parsedThreshold: number | undefined = undefined;
    if (customThreshold.trim() !== '') {
      const val = parseInt(customThreshold, 10);
      if (!isNaN(val) && val >= 0) {
        parsedThreshold = val;
      }
    }

    onSave(item.id, cleanName, unit || item.unit, parsedQty, parsedThreshold);
    onClose();
  };

  return (
    <div
      id="edit-item-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="edit-item-modal-box"
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto sm:hidden mt-2.5 shrink-0" />

        {/* Header */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Edit Stock Item
              </h3>
              <p className="text-xs text-slate-500">
                Update product details & stock level
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
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* 1. Item Name */}
          <div>
            <label
              htmlFor="edit-item-name"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              1. Item Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="edit-item-name"
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-3.5 py-3 min-h-[48px] text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
            />
          </div>

          {/* 2. Unit Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="edit-item-unit"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                2. Unit <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUnitModal();
                }}
                className="min-h-[32px] inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer py-1"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Manage Units</span>
              </button>
            </div>
            <select
              id="edit-item-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3.5 py-3 min-h-[48px] text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900 cursor-pointer"
            >
              {units.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name} {u.code ? `(${u.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Quantity with Stepper */}
          <div>
            <label
              htmlFor="edit-item-quantity"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              3. Quantity <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleStepQuantity(-1)}
                className="min-h-[48px] min-w-[48px] rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 flex items-center justify-center font-bold border border-slate-200 transition-transform active:scale-95 cursor-pointer"
                title="Decrease quantity by 1"
                aria-label="Decrease quantity"
              >
                <Minus className="w-5 h-5" />
              </button>

              <input
                id="edit-item-quantity"
                type="number"
                min="0"
                step="any"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="flex-1 px-3.5 py-3 min-h-[48px] text-base font-mono text-center font-bold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
              />

              <button
                type="button"
                onClick={() => handleStepQuantity(1)}
                className="min-h-[48px] min-w-[48px] rounded-xl bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-800 flex items-center justify-center font-bold border border-emerald-200 transition-transform active:scale-95 cursor-pointer"
                title="Increase quantity by 1"
                aria-label="Increase quantity"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Threshold Accordion */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="min-h-[38px] inline-flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {showAdvanced
                  ? 'Hide custom threshold'
                  : `Custom alert threshold (Default: ≤ ${defaultThreshold})`}
              </span>
            </button>

            {showAdvanced && (
              <div className="mt-2 p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <label
                  htmlFor="edit-item-custom-threshold"
                  className="block text-xs font-semibold text-amber-900"
                >
                  Alert when quantity reaches or drops below:
                </label>
                <input
                  id="edit-item-custom-threshold"
                  type="number"
                  min="0"
                  placeholder={`Default (${defaultThreshold})`}
                  value={customThreshold}
                  onChange={(e) => setCustomThreshold(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] text-base sm:text-sm bg-white border border-amber-300 rounded-lg text-slate-900 font-mono"
                />
                <p className="text-[11px] text-amber-800 leading-normal">
                  Leave blank to inherit global setting (≤ {defaultThreshold} units).
                </p>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl active:bg-slate-100 cursor-pointer flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              id="btn-submit-edit-item"
              type="submit"
              className="min-h-[48px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-bold text-white bg-emerald-600 active:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

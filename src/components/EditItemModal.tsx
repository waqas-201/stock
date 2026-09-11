import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Edit2,
  Scale,
  AlertTriangle,
  Minus,
  Plus,
  Calendar,
  FileText,
  Clock,
} from 'lucide-react';
import { StockItem, StockUnit } from '../types';

interface EditItemModalProps {
  isOpen: boolean;
  item: StockItem | null;
  units: StockUnit[];
  onClose: () => void;
  onSave: (
    id: string,
    itemName: string,
    unit: string,
    quantity: number,
    lowStockThreshold: number,
    productionDate?: string,
    notes?: string
  ) => void;
  onOpenUnitModal: () => void;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  isOpen,
  item,
  units,
  onClose,
  onSave,
  onOpenUnitModal,
}) => {
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState('');
  const [threshold, setThreshold] = useState('5');
  const [productionDate, setProductionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setItemName(item.itemName);
      setUnit(item.unit);
      setQuantity(item.quantity.toString());
      setThreshold(
        item.lowStockThreshold !== undefined ? item.lowStockThreshold.toString() : '5'
      );
      setProductionDate(item.productionDate || '');
      setNotes(item.notes || '');
      setError(null);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const handleStepQuantity = (delta: number) => {
    const curr = parseFloat(quantity) || 0;
    const next = Math.max(0, curr + delta);
    setQuantity(next.toString());
  };

  const handleStepThreshold = (delta: number) => {
    const curr = parseInt(threshold, 10) || 0;
    const next = Math.max(0, curr + delta);
    setThreshold(next.toString());
  };

  const handleSetTodayProductionDate = () => {
    const today = new Date().toISOString().split('T')[0];
    setProductionDate(today);
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

    const parsedThreshold = parseInt(threshold, 10);
    if (isNaN(parsedThreshold) || parsedThreshold < 0) {
      setError('Please enter a valid low stock alert threshold (0 or higher)');
      return;
    }

    onSave(
      item.id,
      cleanName,
      unit || item.unit,
      parsedQty,
      parsedThreshold,
      productionDate.trim() || undefined,
      notes.trim() || undefined
    );
    onClose();
  };

  const presets = [1, 2, 5, 10, 20];

  return (
    <div
      id="edit-item-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="edit-item-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-item-modal-title"
        className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 my-auto flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Edit2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="edit-item-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate"
              >
                Edit Stock Item
              </h3>
              <p className="text-xs text-slate-500 truncate">
                Update stock level, alerts, production date & notes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="edit-item-form"
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-w-0"
        >
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Item Name */}
          <div>
            <label
              htmlFor="edit-item-name"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Item Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="edit-item-name"
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] text-sm sm:text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
            />
          </div>

          {/* 2. Unit Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="edit-item-unit"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Unit of Measure <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUnitModal();
                }}
                className="min-h-[30px] inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer px-1 py-0.5"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Manage Units</span>
              </button>
            </div>
            <select
              id="edit-item-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] text-sm sm:text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900 cursor-pointer"
            >
              {units && units.map((u) => u?.name ? (
                <option key={u.id} value={u.name}>
                  {u.name} {u.code ? `(${u.code})` : ''}
                </option>
              ) : null)}
            </select>
          </div>

          {/* 3. Quantity & 4. Low Stock Alert Level (Grid with min-w-0) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Current Stock */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 min-w-0">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="edit-item-quantity"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Current Stock <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs font-semibold text-slate-500 truncate max-w-[110px]">
                  {unit || item.unit}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleStepQuantity(-1)}
                  className="min-h-[40px] min-w-[40px] rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 flex items-center justify-center font-bold border border-slate-300 transition-transform active:scale-95 cursor-pointer shadow-2xs shrink-0"
                  title="Decrease quantity by 1"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <input
                  id="edit-item-quantity"
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full min-w-0 px-2 py-2 min-h-[40px] text-base font-mono text-center font-bold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900"
                />

                <button
                  type="button"
                  onClick={() => handleStepQuantity(1)}
                  className="min-h-[40px] min-w-[40px] rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold border border-emerald-300 transition-transform active:scale-95 cursor-pointer shadow-2xs shrink-0"
                  title="Increase quantity by 1"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Individual Low Stock Alert Level */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2 min-w-0">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="edit-item-threshold"
                  className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Low Stock Alert</span>
                </label>
                <span className="text-[11px] font-semibold text-amber-800">
                  ≤ alert
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleStepThreshold(-1)}
                  className="min-h-[40px] min-w-[40px] rounded-xl bg-white hover:bg-amber-100 active:bg-amber-200 text-slate-700 flex items-center justify-center font-bold border border-amber-300 transition-transform active:scale-95 cursor-pointer shadow-2xs shrink-0"
                  title="Decrease alert threshold"
                  aria-label="Decrease threshold"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <input
                  id="edit-item-threshold"
                  type="number"
                  min="0"
                  required
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="w-full min-w-0 px-2 py-2 min-h-[40px] text-base font-mono text-center font-bold bg-white border border-amber-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900"
                />

                <button
                  type="button"
                  onClick={() => handleStepThreshold(1)}
                  className="min-h-[40px] min-w-[40px] rounded-xl bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-900 flex items-center justify-center font-bold border border-amber-300 transition-transform active:scale-95 cursor-pointer shadow-2xs shrink-0"
                  title="Increase alert threshold"
                  aria-label="Increase threshold"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1 pt-0.5 flex-wrap">
                <span className="text-[10px] text-amber-800 font-semibold mr-0.5">
                  Presets:
                </span>
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setThreshold(p.toString())}
                    className={`min-h-[26px] px-2 py-0.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      threshold === p.toString()
                        ? 'bg-amber-200 border-amber-400 text-amber-950 font-bold'
                        : 'bg-white border-amber-200/90 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    ≤{p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Production Date */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="edit-item-production-date"
                className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Production Date</span>
                <span className="text-[10px] font-normal text-slate-400 capitalize">
                  (Optional)
                </span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSetTodayProductionDate}
                  className="min-h-[26px] px-2 py-0.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer flex items-center gap-1"
                >
                  <Clock className="w-3 h-3" />
                  <span>Today</span>
                </button>
                {productionDate && (
                  <button
                    type="button"
                    onClick={() => setProductionDate('')}
                    className="min-h-[26px] px-2 py-0.5 text-xs text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <input
              id="edit-item-production-date"
              type="date"
              value={productionDate}
              onChange={(e) => setProductionDate(e.target.value)}
              className="w-full px-3.5 py-2 min-h-[42px] text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Manufacturing date or production harvest date.
            </p>
          </div>

          {/* 6. Notes / Remarks */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-1.5">
            <label
              htmlFor="edit-item-notes"
              className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Notes & Remarks</span>
              <span className="text-[10px] font-normal text-slate-400 capitalize">
                (Optional)
              </span>
            </label>
            <textarea
              id="edit-item-notes"
              rows={2}
              placeholder="e.g., Supplier info, rack location, batch number..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 placeholder:text-slate-400 resize-none"
            />
          </div>
        </form>

        {/* Footer - Fixed */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="btn-submit-edit-item"
            type="submit"
            form="edit-item-form"
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};

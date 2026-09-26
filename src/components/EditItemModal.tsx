import React, { useState, useEffect } from 'react';
import {
  X,
  Scale,
  AlertTriangle,
  Calendar,
  Lock,
  Truck,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { StockItem, StockUnit, StockTag, StockLabel, StockTagColor } from '../types';
import { TagInput } from './TagInput';
import { getTodayDateString } from '../lib/dateUtils';

interface EditItemModalProps {
  isOpen: boolean;
  item: StockItem | null;
  units: StockUnit[];
  availableTags?: string[];
  managedTags?: StockTag[];
  managedLabels?: StockLabel[];
  onClose: () => void;
  onSave: (
    id: string,
    itemName: string,
    unit: string,
    quantity: number,
    lowStockThreshold: number,
    productionDate?: string,
    notes?: string,
    tags?: string[]
  ) => void;
  onOpenUnitModal: () => void;
  onCreateTag?: (name: string, color: StockTagColor, description?: string) => void;
  onOpenInwardChallan?: (item: StockItem) => void;
  onOpenOutwardChallan?: (item: StockItem) => void;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  isOpen,
  item,
  units,
  availableTags = [],
  managedTags,
  managedLabels = [],
  onClose,
  onSave,
  onOpenUnitModal,
  onCreateTag,
  onOpenInwardChallan,
  onOpenOutwardChallan,
}) => {
  const effectiveTags: StockTag[] = managedTags || (managedLabels as unknown as StockTag[]) || [];
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('');
  const [threshold, setThreshold] = useState('5');
  const [productionDate, setProductionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item && isOpen) {
      setItemName(item.itemName);
      setUnit(item.unit);
      setThreshold(
        item.lowStockThreshold !== undefined ? item.lowStockThreshold.toString() : '5'
      );
      setProductionDate(item.productionDate || '');
      setNotes(item.notes || '');
      setTags(Array.isArray(item.tags) ? [...item.tags] : []);
      setError(null);
    }
  }, [item, isOpen]);

  const baselineQuantity = item ? item.quantity || 0 : 0;

  const handleStepThreshold = (delta: number) => {
    const curr = parseInt(threshold, 10) || 0;
    const next = Math.max(0, curr + delta);
    setThreshold(next.toString());
  };

  const handleSetTodayProductionDate = () => {
    const today = getTodayDateString();
    setProductionDate(today);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    const cleanName = itemName.trim();
    if (!cleanName) {
      setError('Item name is required');
      return;
    }

    const parsedThreshold = parseInt(threshold, 10);
    if (isNaN(parsedThreshold) || parsedThreshold < 0) {
      setError('Please enter a valid low stock alert threshold (0 or higher)');
      return;
    }

    if (!notes.trim()) {
      setError('A note or reason for modification is strictly required to approve updating this item.');
      return;
    }

    // Strict inventory policy: Stock quantity is preserved.
    // Stock can ONLY be added or updated via Delivery Challan.
    onSave(
      item.id,
      cleanName,
      unit || item.unit,
      item.quantity, // Preserved exactly as-is
      parsedThreshold,
      productionDate.trim() || undefined,
      notes.trim(),
      tags
    );
    onClose();
  };

  // Keyboard shortcut: Alt + S (or Option + S / Cmd + S) to save / submit item edits
  useEffect(() => {
    if (!isOpen || !item) return;
    const handleSaveKeyDown = (e: KeyboardEvent) => {
      const isAltS =
        e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        (e.code === 'KeyS' || e.key === 's' || e.key === 'S' || e.key === 'ß');
      const isCtrlOrCmdS =
        (e.ctrlKey || e.metaKey) &&
        !e.altKey &&
        (e.code === 'KeyS' || e.key === 's' || e.key === 'S');

      if (isAltS || isCtrlOrCmdS) {
        e.preventDefault();
        e.stopPropagation();

        const form = document.getElementById('edit-item-form') as HTMLFormElement | null;
        if (form) {
          if (form.reportValidity && !form.reportValidity()) {
            return;
          }
          if (form.requestSubmit) {
            form.requestSubmit();
          } else {
            handleSubmit({ preventDefault: () => {} } as React.FormEvent);
          }
        }
      }
    };

    window.addEventListener('keydown', handleSaveKeyDown, true);
    return () => window.removeEventListener('keydown', handleSaveKeyDown, true);
  }, [isOpen, itemName, threshold, unit, item, productionDate, notes, tags]);

  if (!isOpen || !item) return null;

  const isLowStock = baselineQuantity > 0 && baselineQuantity <= (item.lowStockThreshold ?? 5);
  const isOutOfStock = baselineQuantity <= 0;

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
        className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 my-auto flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/95 shrink-0">
          <div className="min-w-0 pr-2">
            <h2
              id="edit-item-modal-title"
              className="text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate"
            >
              Edit Item Specifications
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              Modify name, unit, alert threshold, tags and notes for "{item.itemName}"
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audit Enforced Policy Banner */}
        <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center gap-2 text-xs text-slate-700 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Audit Policy Enforced:</strong> Stock quantity cannot be edited directly here. All stock updates must be recorded via <strong>Delivery Challan</strong>.
          </span>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-5 sm:mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center justify-between animate-in fade-in">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-500 hover:text-rose-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Form */}
        <form
          id="edit-item-form"
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-w-0"
        >
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
              autoFocus
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] text-sm sm:text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 font-medium"
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
              className="w-full px-3.5 py-2.5 min-h-[44px] text-sm sm:text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 cursor-pointer font-medium"
            >
              {units &&
                units.map((u) =>
                  u?.name ? (
                    <option key={u.id} value={u.name}>
                      {u.name} {u.code ? `(${u.code})` : ''}
                    </option>
                  ) : null
                )}
            </select>
          </div>

          {/* 3. CURRENT STOCK: READ-ONLY & LOCKED PER STRICT POLICY */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Current Inventory Stock</span>
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Direct numeric overwrite is locked to guarantee full audit traceability
                </span>
              </div>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                  isOutOfStock
                    ? 'bg-rose-100 text-rose-800'
                    : isLowStock
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
              </span>
            </div>

            {/* Current Stock Display */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Verified Physical Balance
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-mono text-slate-900">
                    {baselineQuantity.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {item.unit}
                  </span>
                </div>
              </div>

              {/* Direct Challan Actions */}
              <div className="flex items-center gap-2">
                {onOpenInwardChallan && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenInwardChallan(item);
                    }}
                    className="min-h-[36px] px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-300 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                    title="Add stock by creating an Inward Delivery Challan"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Inward Challan</span>
                  </button>
                )}
                {onOpenOutwardChallan && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenOutwardChallan(item);
                    }}
                    className="min-h-[36px] px-3 py-1.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                    title="Dispatch or update stock via Outward Delivery Challan"
                  >
                    <Truck className="w-3.5 h-3.5 text-slate-600" />
                    <span>Dispatch Challan</span>
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              💡 Need to change stock? Issue an <strong>Inward Delivery Challan</strong> to add received goods, or an <strong>Outward Delivery Challan</strong> to dispatch items.
            </p>
          </div>

          {/* 4. Individual Low Stock Alert Level */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2 min-w-0">
            <div className="flex items-center justify-between">
              <label
                htmlFor="edit-item-threshold"
                className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Low Stock Alert Limit</span>
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
              >
                -
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
                className="min-h-[40px] min-w-[40px] rounded-xl bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-900 flex items-center justify-center font-bold border border-amber-400 transition-transform active:scale-95 cursor-pointer shadow-2xs shrink-0"
                title="Increase alert threshold"
              >
                +
              </button>
            </div>
            <p className="text-[10px] text-amber-700">
              Alert triggers when stock drops to or below this count
            </p>
          </div>

          {/* 5. Production / Batch Date (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="edit-item-production-date"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Production Date / Batch (Optional)</span>
              </label>
              <button
                type="button"
                onClick={handleSetTodayProductionDate}
                className="min-h-[30px] px-2 py-0.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md font-semibold cursor-pointer transition-colors"
              >
                + Today
              </button>
            </div>
            <input
              id="edit-item-production-date"
              type="date"
              value={productionDate}
              onChange={(e) => setProductionDate(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900"
            />
          </div>

          {/* 6. Product Tags */}
          <div>
            <TagInput
              tags={tags}
              onChange={setTags}
              availableTags={availableTags}
              managedTags={effectiveTags}
              placeholder="Add tags (e.g., Raw Material, Packaged)..."
              onCreateTag={onCreateTag}
            />
          </div>

          {/* 7. Modification Reason Note (Required) */}
          <div>
            <label
              htmlFor="edit-item-notes"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
            >
              <span>Audit Note / Reason for Edit</span>
              <span className="text-rose-600 font-bold ml-1">* (Required)</span>
            </label>
            <textarea
              id="edit-item-notes"
              rows={2}
              required
              placeholder="e.g., Updated unit from pieces to boxes, changed alert limit per manager review..."
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (error) setError(null);
              }}
              className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl focus:outline-hidden text-slate-900 placeholder:text-slate-400 ${
                error && !notes.trim()
                  ? 'border-rose-500 ring-2 ring-rose-500/20'
                  : 'border-slate-300 focus:ring-2 focus:ring-emerald-600'
              }`}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              An explanatory note is strictly required to approve any specification changes.
            </p>
          </div>

          {/* Footer */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-edit-item-btn"
              disabled={!itemName.trim() || !notes.trim()}
              className={`min-h-[44px] px-5 sm:px-6 text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all ${
                !itemName.trim() || !notes.trim()
                  ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                  : 'text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
              }`}
              title={
                !notes.trim()
                  ? 'A note is required to approve item modification'
                  : 'Approve & save item changes (Shortcut: Alt + S or Enter)'
              }
            >
              <span>Save Specifications</span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-100 bg-emerald-700/80 rounded border border-emerald-500/60">
                Alt+S
              </kbd>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

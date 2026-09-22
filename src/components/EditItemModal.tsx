import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Package,
  Scale,
  AlertTriangle,
  Minus,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Sliders,
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
}) => {
  const effectiveTags: StockTag[] = managedTags || (managedLabels as unknown as StockTag[]) || [];
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('');
  const [threshold, setThreshold] = useState('5');
  const [productionDate, setProductionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Stock adjustment mode: 'adjustment' (+/- inbound/outbound) vs 'override' (recount stocktake)
  const [stockMode, setStockMode] = useState<'adjust' | 'override'>('adjust');
  const [adjustAmount, setAdjustAmount] = useState<string>('0');
  const [isDeduction, setIsDeduction] = useState<boolean>(false);
  const [overrideQuantity, setOverrideQuantity] = useState<string>('0');

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

      // Reset adjustment
      setStockMode('adjust');
      setAdjustAmount('0');
      setIsDeduction(false);
      setOverrideQuantity(item.quantity.toString());
    }
  }, [item, isOpen]);

  const baselineQuantity = item ? item.quantity || 0 : 0;

  // Calculate resulting quantity
  let calculatedQuantity = baselineQuantity;
  if (stockMode === 'adjust') {
    const delta = parseFloat(adjustAmount) || 0;
    calculatedQuantity = Math.max(0, baselineQuantity + (isDeduction ? -delta : delta));
  } else {
    calculatedQuantity = Math.max(0, parseFloat(overrideQuantity) || 0);
  }

  const handleStepAdjust = (step: number) => {
    const curr = parseFloat(adjustAmount) || 0;
    const next = Math.max(0, curr + step);
    setAdjustAmount(next.toString());
  };

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

    if (isNaN(calculatedQuantity) || calculatedQuantity < 0) {
      setError('Calculated stock quantity is invalid');
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

    onSave(
      item.id,
      cleanName,
      unit || item.unit,
      calculatedQuantity,
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
  }, [isOpen, itemName, calculatedQuantity, threshold, unit, item, productionDate, notes, tags]);

  if (!isOpen || !item) return null;

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
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="edit-item-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate"
              >
                Edit Item: {item.itemName}
              </h3>
              <p className="text-xs text-slate-500 truncate">
                Update stock levels, unit, alerts & product details
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
              className="w-full px-3.5 py-2.5 min-h-[44px] text-sm sm:text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 font-medium"
            />
          </div>

          {/* 2. Unit of Measure Selection */}
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

          {/* 3. SOPHISTICATED STOCK MANAGEMENT: Baseline Protected + Inbound Addition / Recount */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            {/* Header with Mode Toggle */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Stock Quantity</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  Current baseline is protected from accidental single-cell overwrites
                </span>
              </div>

              {/* Mode switch: Adjust Stock (+/-) vs Recount Override */}
              <div className="flex items-center p-0.5 bg-slate-200/80 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setStockMode('adjust')}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                    stockMode === 'adjust'
                      ? 'bg-white text-emerald-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Add / Adjust
                </button>
                <button
                  type="button"
                  onClick={() => setStockMode('override')}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                    stockMode === 'override'
                      ? 'bg-white text-amber-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Recount Override
                </button>
              </div>
            </div>

            {/* Current Baseline Display */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Current Verified Baseline
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
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Status</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                    baselineQuantity <= 0
                      ? 'bg-rose-100 text-rose-800'
                      : baselineQuantity <= (item.lowStockThreshold ?? 5)
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {baselineQuantity <= 0
                    ? 'Out of Stock'
                    : baselineQuantity <= (item.lowStockThreshold ?? 5)
                    ? 'Low Stock'
                    : 'In Stock'}
                </span>
              </div>
            </div>

            {/* Sub-Panel: Add / Deduct Adjustment */}
            {stockMode === 'adjust' ? (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Specify Quantity to Add or Deduct:
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setIsDeduction(false)}
                      className={`px-2 py-0.5 rounded-md cursor-pointer ${
                        !isDeduction
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      + Inbound Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDeduction(true)}
                      className={`px-2 py-0.5 rounded-md cursor-pointer ${
                        isDeduction
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      − Outbound Deduct
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStepAdjust(-1)}
                    className="min-h-[40px] min-w-[40px] rounded-xl bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold border border-slate-300 transition-transform active:scale-95 cursor-pointer shrink-0"
                    title="Decrease adjustment"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="relative flex-1 min-w-0">
                    <input
                      id="edit-item-adjust-input"
                      type="number"
                      min="0"
                      step="any"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      className="w-full px-3 py-2 min-h-[40px] text-base font-mono text-center font-bold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                      {unit || item.unit}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStepAdjust(1)}
                    className="min-h-[40px] min-w-[40px] rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold border border-emerald-300 transition-transform active:scale-95 cursor-pointer shrink-0"
                    title="Increase adjustment"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[1, 5, 10, 25, 50].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAdjustAmount(preset.toString())}
                      className="text-xs px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-bold cursor-pointer"
                    >
                      +{preset}
                    </button>
                  ))}
                </div>

                {/* Calculation Breakdown */}
                <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-emerald-950 font-medium">
                    {baselineQuantity} {isDeduction ? '−' : '+'} {parseFloat(adjustAmount) || 0} =
                  </span>
                  <span className="font-bold text-emerald-900 font-mono text-sm">
                    Updated Total: {calculatedQuantity} {item.unit}
                  </span>
                </div>
              </div>
            ) : (
              /* Sub-Panel: Direct Recount Override (Cycle count audit) */
              <div className="space-y-2 pt-1">
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <span className="font-bold block">⚠️ Direct Physical Recount</span>
                  Use this only when performing an official physical stocktake recount.
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="edit-item-recount-input"
                    type="number"
                    min="0"
                    step="any"
                    value={overrideQuantity}
                    onChange={(e) => setOverrideQuantity(e.target.value)}
                    className="w-full px-3 py-2 min-h-[40px] text-base font-mono text-center font-bold bg-white border border-amber-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900"
                  />
                  <span className="text-xs font-bold text-slate-600 shrink-0">
                    {item.unit}
                  </span>
                </div>
              </div>
            )}
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
                className="min-h-[40px] min-w-[40px] rounded-xl bg-white hover:bg-amber-100 text-slate-700 flex items-center justify-center font-bold border border-amber-300 transition-transform active:scale-95 cursor-pointer shadow-2xs shrink-0"
                title="Decrease alert limit"
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
                className="min-h-[40px] min-w-[40px] rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 flex items-center justify-center font-bold border border-amber-400 transition-transform active:scale-95 cursor-pointer shadow-2xs shrink-0"
                title="Increase alert limit"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-amber-700">
              Triggers a low stock warning when inventory drops to or below this amount
            </p>
          </div>

          {/* 5. Production / Batch Date */}
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
              placeholder="Add tags (e.g. Office, Food, Fragile)..."
              onCreateTag={onCreateTag}
            />
          </div>

          {/* 7. Notes (Required for approval) */}
          <div>
            <label
              htmlFor="edit-item-notes"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
            >
              <span>Update Note / Reason for Modification</span>
              <span className="text-rose-600 font-bold ml-1">* (Required to approve)</span>
            </label>
            <textarea
              id="edit-item-notes"
              rows={2}
              required
              placeholder="e.g., Stock count audit, changed supplier, updated threshold, Shelf location moved..."
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
              An update note is strictly required to approve modifications and preserve audit integrity.
            </p>
          </div>

          {/* Footer Buttons */}
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
                  : 'text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950'
              }`}
              title={
                !notes.trim()
                  ? 'A note is required to approve updates'
                  : 'Approve & update item (Shortcut: Alt + S or Enter)'
              }
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Approve Update ({calculatedQuantity} {unit || item.unit})</span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-300 bg-slate-800 rounded border border-slate-700">
                Alt+S
              </kbd>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

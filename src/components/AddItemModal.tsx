import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Plus,
  Scale,
  AlertTriangle,
  Calendar,
  Lock,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import { StockItem, StockUnit, StockTag, StockLabel, StockTagColor } from '../types';
import { TagInput } from './TagInput';
import { getTodayDateString } from '../lib/dateUtils';

export interface AddItemModalProps {
  isOpen: boolean;
  units: StockUnit[];
  items?: StockItem[];
  availableTags?: string[];
  managedTags?: StockTag[];
  managedLabels?: StockLabel[];
  onClose: () => void;
  onAdd: (
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
  onOpenInwardChallan?: (itemName?: string) => void;
  // Optional backwards compatibility props
  preSelectedItem?: StockItem | null;
  initialTab?: string;
  onAddMoreStock?: (item: StockItem, delta: number, reason?: string) => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  units,
  items = [],
  availableTags = [],
  managedTags,
  managedLabels = [],
  onClose,
  onAdd,
  onOpenUnitModal,
  onCreateTag,
  onOpenInwardChallan,
}) => {
  const effectiveTags: StockTag[] = managedTags || (managedLabels as unknown as StockTag[]) || [];
  const newItemNameRef = useRef<HTMLInputElement>(null);

  // New catalog item state
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState<string>('');
  const [threshold, setThreshold] = useState<string>('5');
  const [productionDate, setProductionDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setItemName('');
      setThreshold('5');
      setProductionDate('');
      setNotes('');
      setTags([]);

      if (units && units.length > 0 && units[0]?.name) {
        setUnit(units[0].name);
      }

      const timer = setTimeout(() => {
        newItemNameRef.current?.focus();
        newItemNameRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, units]);

  // Close modal on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Check if typed new item name already exists in catalog
  const matchingExistingItem = useMemo(() => {
    if (!itemName.trim()) return null;
    const clean = itemName.trim().toLowerCase();
    return items.find((i) => i.itemName.toLowerCase() === clean) || null;
  }, [itemName, items]);

  const handleStepThreshold = (step: number) => {
    const curr = parseInt(threshold, 10) || 0;
    const next = Math.max(0, curr + step);
    setThreshold(next.toString());
  };

  const handleSetTodayProductionDate = () => {
    const today = getTodayDateString();
    setProductionDate(today);
  };

  // Submission handler for Registering New Catalog Item SKU
  const handleNewItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = itemName.trim();
    if (!cleanName) {
      setError('Item name is required');
      return;
    }

    const parsedThreshold = parseInt(threshold, 10);
    if (isNaN(parsedThreshold) || parsedThreshold < 0) {
      setError('Please enter a valid low stock alert limit (0 or higher)');
      return;
    }

    if (!notes.trim()) {
      setError('A note (e.g. location, supplier, or purpose) is strictly required to approve registering this item.');
      return;
    }

    const cleanUnit = unit || (units && units[0]?.name ? units[0].name : 'Pieces');

    // Strict inventory policy: Initial stock is ALWAYS 0.
    // Stock can ONLY be added via Inward Delivery Challan.
    onAdd(
      cleanName,
      cleanUnit,
      0, // Initial quantity is strictly 0
      parsedThreshold,
      productionDate.trim() || undefined,
      notes.trim(),
      tags.length > 0 ? tags : undefined
    );
    onClose();
  };

  // Keyboard shortcut: Alt + S (or Option + S / Cmd + S) to save / confirm item
  useEffect(() => {
    if (!isOpen) return;
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

        const form = document.getElementById('new-item-form') as HTMLFormElement | null;
        if (form) {
          if (form.reportValidity && !form.reportValidity()) {
            return;
          }
          if (form.requestSubmit) {
            form.requestSubmit();
          } else {
            handleNewItemSubmit({ preventDefault: () => {} } as React.FormEvent);
          }
        }
      }
    };

    window.addEventListener('keydown', handleSaveKeyDown, true);
    return () => window.removeEventListener('keydown', handleSaveKeyDown, true);
  }, [isOpen, itemName, threshold, unit, units, productionDate, notes, tags]);

  if (!isOpen) return null;

  return (
    <div
      id="add-item-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="add-item-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-item-modal-title"
        className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 my-auto flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/95 shrink-0">
          <div>
            <h2
              id="add-item-modal-title"
              className="text-base sm:text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2"
            >
              <span>Register New Item SKU</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Catalog Only
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Add product definition to catalog. Stock must be added via Delivery Challan.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Policy Notice */}
        <div className="px-5 py-2.5 bg-emerald-50/90 border-b border-emerald-200/80 flex items-center gap-2 text-xs text-emerald-950 font-medium">
          <Truck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            <strong>Inventory Control Active:</strong> New items start at <strong>0 stock</strong>. All stock additions must be recorded via <strong>Inward Delivery Challan</strong>.
          </span>
        </div>

        {/* Error notification banner */}
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

        {/* Form: REGISTER NEW PRODUCT SKU */}
        <form
          id="new-item-form"
          onSubmit={handleNewItemSubmit}
          className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-w-0"
        >
          {/* 1. Item Name */}
          <div>
            <label
              htmlFor="new-item-name"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Product / Item Name <span className="text-rose-500">*</span>
            </label>
            <input
              ref={newItemNameRef}
              id="new-item-name"
              type="text"
              required
              autoFocus
              placeholder="e.g., A4 Printing Paper, Ballpoint Pens, Steel Rods"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] text-sm sm:text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 placeholder:text-slate-400 font-medium"
            />

            {/* Smart Duplicate Warning */}
            {matchingExistingItem && (
              <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-900">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>"{matchingExistingItem.itemName}"</strong> already exists in inventory (Current: {matchingExistingItem.quantity} {matchingExistingItem.unit}).
                  </span>
                </div>
                {onOpenInwardChallan && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenInwardChallan(matchingExistingItem.itemName);
                    }}
                    className="px-2.5 py-1 text-xs font-bold bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg cursor-pointer shrink-0"
                  >
                    Receive via Challan
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 2. Unit of Measure Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="new-item-unit"
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
              id="new-item-unit"
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

          {/* 3. Opening Stock (LOCKED TO 0 PER POLICY) & 4. Low Stock Alert Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Opening Stock (Locked) */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 min-w-0">
              <div className="flex items-center justify-between">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Starting Stock</span>
                </span>
                <span className="text-xs font-semibold text-slate-500 truncate max-w-[110px]">
                  {unit || 'Units'}
                </span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-mono text-xl font-bold text-slate-900 pl-1">0</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                  Locked (Policy)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                To add stock, generate an <strong>Inward Delivery Challan</strong> upon vendor delivery.
              </p>
            </div>

            {/* Individual Low Stock Alert Level */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2 min-w-0">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="new-item-threshold"
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
                >
                  -
                </button>

                <input
                  id="new-item-threshold"
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
          </div>

          {/* 5. Production / Batch Date (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="new-item-production-date"
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
              id="new-item-production-date"
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
              placeholder="Add tags (e.g., Raw Materials, Finished Goods)..."
              onCreateTag={onCreateTag}
            />
          </div>

          {/* 7. Notes & Location Remarks (Required) */}
          <div>
            <label
              htmlFor="new-item-notes"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
            >
              <span>Notes, Purpose & Shelf Location</span>
              <span className="text-rose-600 font-bold ml-1">* (Required)</span>
            </label>
            <textarea
              id="new-item-notes"
              rows={2}
              required
              placeholder="e.g., Shelf B-12, Preferred Supplier ABC, Catalog SKU description..."
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
              An explanatory note is strictly required to register any new SKU in the inventory ledger.
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
              id="submit-new-item-btn"
              disabled={!itemName.trim() || !notes.trim()}
              className={`min-h-[44px] px-5 sm:px-6 text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all ${
                !itemName.trim() || !notes.trim()
                  ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                  : 'text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
              }`}
              title={
                !notes.trim()
                  ? 'A note is required to approve registering this product'
                  : 'Approve & register product SKU (Shortcut: Alt + S or Enter)'
              }
            >
              <Plus className="w-4 h-4" />
              <span>Register Product SKU</span>
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

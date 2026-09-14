import React, { useState, useEffect, useMemo } from 'react';
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
  TrendingUp,
  Search,
} from 'lucide-react';
import { StockItem, StockUnit } from '../types';
import { TagInput } from './TagInput';

export interface AddItemModalProps {
  isOpen: boolean;
  units: StockUnit[];
  items?: StockItem[];
  preSelectedItem?: StockItem | null;
  availableTags?: string[];
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
  onAddMoreStock?: (
    item: StockItem,
    addedQuantity: number,
    reason?: string
  ) => void;
  onOpenUnitModal: () => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  units,
  items = [],
  preSelectedItem = null,
  availableTags = [],
  onClose,
  onAdd,
  onAddMoreStock,
  onOpenUnitModal,
}) => {
  // Mode: 'restock' (add more to existing) vs 'new_item' (register new SKU)
  const [activeTab, setActiveTab] = useState<'restock' | 'new_item'>('restock');

  // Restock existing item state
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [addQuantity, setAddQuantity] = useState<string>('10');
  const [isDeduction, setIsDeduction] = useState<boolean>(false);
  const [restockReason, setRestockReason] = useState<string>('');
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');

  // New catalog item state
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState<string>('');
  const [initialQuantity, setInitialQuantity] = useState<string>('1');
  const [threshold, setThreshold] = useState<string>('5');
  const [productionDate, setProductionDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setError(null);

      if (preSelectedItem) {
        setActiveTab('restock');
        setSelectedItemId(preSelectedItem.id);
      } else if (items && items.length > 0) {
        setActiveTab('restock');
        setSelectedItemId(items[0].id);
      } else {
        setActiveTab('new_item');
        setSelectedItemId('');
      }

      setAddQuantity('10');
      setIsDeduction(false);
      setRestockReason('');
      setItemSearchQuery('');

      setItemName('');
      setInitialQuantity('1');
      setThreshold('5');
      setProductionDate('');
      setNotes('');
      setTags([]);

      if (units && units.length > 0 && units[0]?.name) {
        setUnit(units[0].name);
      }
    }
  }, [isOpen, preSelectedItem, items, units]);

  // Selected item reference for Restock mode
  const selectedItem = useMemo(() => {
    return items.find((i) => i.id === selectedItemId) || null;
  }, [items, selectedItemId]);

  // Filtered items list for item picker in Restock mode
  const filteredPickerItems = useMemo(() => {
    if (!itemSearchQuery.trim()) return items;
    const q = itemSearchQuery.toLowerCase().trim();
    return items.filter(
      (i) =>
        i.itemName.toLowerCase().includes(q) ||
        i.unit.toLowerCase().includes(q) ||
        (i.tags && i.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [items, itemSearchQuery]);

  // Check if typed new item name already exists in catalog
  const matchingExistingItem = useMemo(() => {
    if (!itemName.trim() || activeTab !== 'new_item') return null;
    const clean = itemName.trim().toLowerCase();
    return items.find((i) => i.itemName.toLowerCase() === clean) || null;
  }, [itemName, activeTab, items]);

  if (!isOpen) return null;

  // Steppers for Restock mode
  const handleStepAddQuantity = (step: number) => {
    const curr = parseFloat(addQuantity) || 0;
    const next = Math.max(1, curr + step);
    setAddQuantity(next.toString());
  };

  // Steppers for New Item mode
  const handleStepInitialQuantity = (step: number) => {
    const curr = parseFloat(initialQuantity) || 0;
    const next = Math.max(0, curr + step);
    setInitialQuantity(next.toString());
  };

  const handleStepThreshold = (step: number) => {
    const curr = parseInt(threshold, 10) || 0;
    const next = Math.max(0, curr + step);
    setThreshold(next.toString());
  };

  const handleSetTodayProductionDate = () => {
    const today = new Date().toISOString().split('T')[0];
    setProductionDate(today);
  };

  // Submission handler for Restock Mode
  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedItem) {
      setError('Please select an item from your inventory to update');
      return;
    }

    const parsedQty = parseFloat(addQuantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setError('Please enter a valid positive quantity to add');
      return;
    }

    const effectiveDelta = isDeduction ? -parsedQty : parsedQty;

    if (isDeduction && (selectedItem.quantity || 0) + effectiveDelta < 0) {
      setError(
        `Cannot deduct ${parsedQty} ${selectedItem.unit}. Current stock is only ${selectedItem.quantity} ${selectedItem.unit}.`
      );
      return;
    }

    if (onAddMoreStock) {
      onAddMoreStock(selectedItem, effectiveDelta, restockReason.trim() || undefined);
    }
    onClose();
  };

  // Submission handler for New Catalog Item Mode
  const handleNewItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = itemName.trim();
    if (!cleanName) {
      setError('Item name is required');
      return;
    }

    const parsedQty = parseFloat(initialQuantity);
    if (isNaN(parsedQty) || parsedQty < 0) {
      setError('Please enter a valid non-negative initial quantity');
      return;
    }

    const parsedThreshold = parseInt(threshold, 10);
    if (isNaN(parsedThreshold) || parsedThreshold < 0) {
      setError('Please enter a valid low stock alert limit (0 or higher)');
      return;
    }

    const cleanUnit = unit || (units && units[0]?.name ? units[0].name : 'Pieces');

    onAdd(
      cleanName,
      cleanUnit,
      parsedQty,
      parsedThreshold,
      productionDate.trim() || undefined,
      notes.trim() || undefined,
      tags.length > 0 ? tags : undefined
    );
    onClose();
  };

  // Mathematical live calculation for Restock Mode
  const currentBaselineStock = selectedItem ? selectedItem.quantity || 0 : 0;
  const parsedInboundAmount = parseFloat(addQuantity) || 0;
  const calculatedNewTotalStock = Math.max(
    0,
    currentBaselineStock + (isDeduction ? -parsedInboundAmount : parsedInboundAmount)
  );

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
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="add-item-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate"
              >
                {activeTab === 'restock' ? 'Add Stock to Inventory' : 'Register New Catalog SKU'}
              </h3>
              <p className="text-xs text-slate-500 truncate">
                {activeTab === 'restock'
                  ? 'Receive shipment & update verified stock baseline'
                  : 'Add a brand new item definition to your warehouse'}
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

        {/* Tab Navigation: Restock Existing vs Register New */}
        <div className="px-5 sm:px-6 pt-3 pb-1 bg-slate-50/50 border-b border-slate-100 shrink-0">
          <div className="flex p-1 bg-slate-200/70 rounded-xl gap-1">
            <button
              type="button"
              id="tab-btn-restock"
              onClick={() => {
                setActiveTab('restock');
                setError(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'restock'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Add Stock / Restock</span>
              {items.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {items.length}
                </span>
              )}
            </button>

            <button
              type="button"
              id="tab-btn-new-item"
              onClick={() => {
                setActiveTab('new_item');
                setError(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'new_item'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-slate-600" />
              <span>New Product SKU</span>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mx-5 sm:mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 1: RESTOCK EXISTING ITEM (Do not touch current stock directly) */}
        {/* ================================================================= */}
        {activeTab === 'restock' ? (
          <form
            id="restock-item-form"
            onSubmit={handleRestockSubmit}
            className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-w-0"
          >
            {/* 1. Item Selector */}
            <div>
              <label
                htmlFor="restock-select-item"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Select Item to Add Stock <span className="text-rose-500">*</span>
              </label>

              {items.length > 5 && (
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search catalog items..."
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              )}

              <select
                id="restock-select-item"
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] text-sm sm:text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 cursor-pointer font-medium"
              >
                {filteredPickerItems.length === 0 ? (
                  <option value="" disabled>
                    No matching items found
                  </option>
                ) : (
                  filteredPickerItems.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.itemName} — Current: {it.quantity} {it.unit}
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedItem && (
              <>
                {/* 2. Current Stock (LOCKED Baseline - Not touched directly) */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Current Stock Baseline (Protected)</span>
                    </span>
                    <div className="mt-0.5 flex items-baseline gap-1.5">
                      <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
                        {selectedItem.quantity.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        {selectedItem.unit}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    {(selectedItem.quantity || 0) <= 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        Out of Stock
                      </span>
                    ) : (selectedItem.quantity || 0) <= (selectedItem.lowStockThreshold ?? 5) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <AlertTriangle className="w-3 h-3" />
                        Low Stock (≤{selectedItem.lowStockThreshold ?? 5})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        In Stock
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Alert Limit: ≤ {selectedItem.lowStockThreshold ?? 5}
                    </span>
                  </div>
                </div>

                {/* 3. Add More Section (Dedicated Inbound Quantity) */}
                <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label
                      htmlFor="restock-add-quantity"
                      className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4 text-emerald-700" />
                      <span>{isDeduction ? 'Stock to Deduct (Outbound)' : 'Stock to Add More (Inbound)'}</span>
                    </label>

                    {/* Inbound / Outbound Direction Toggle */}
                    <div className="flex items-center p-0.5 bg-emerald-100/70 rounded-lg text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setIsDeduction(false)}
                        className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                          !isDeduction
                            ? 'bg-white text-emerald-900 shadow-2xs'
                            : 'text-emerald-700 hover:text-emerald-950'
                        }`}
                      >
                        + Add Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDeduction(true)}
                        className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                          isDeduction
                            ? 'bg-white text-rose-800 shadow-2xs'
                            : 'text-emerald-700 hover:text-emerald-950'
                        }`}
                      >
                        - Deduct
                      </button>
                    </div>
                  </div>

                  {/* Quantity Input with Stepper */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStepAddQuantity(-1)}
                      className="min-h-[44px] min-w-[44px] rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 flex items-center justify-center font-bold border border-emerald-300 transition-transform active:scale-95 cursor-pointer shadow-2xs shrink-0"
                      title="Decrease amount by 1"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="relative flex-1 min-w-0">
                      <input
                        id="restock-add-quantity"
                        type="number"
                        min="0.01"
                        step="any"
                        required
                        value={addQuantity}
                        onChange={(e) => setAddQuantity(e.target.value)}
                        className="w-full px-3 py-2.5 min-h-[44px] text-lg font-mono text-center font-bold bg-white border border-emerald-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                        {selectedItem.unit}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStepAddQuantity(1)}
                      className="min-h-[44px] min-w-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center justify-center font-bold transition-transform active:scale-95 cursor-pointer shadow-2xs shrink-0"
                      title="Increase amount by 1"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quick Preset Increment Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] font-semibold text-emerald-900 mr-1">
                      Presets:
                    </span>
                    {[1, 5, 10, 25, 50, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAddQuantity(preset.toString())}
                        className={`min-h-[30px] px-2.5 text-xs font-bold rounded-lg border cursor-pointer transition-colors ${
                          addQuantity === preset.toString()
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                            : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Live Calculation & Verification Card */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span>Stock Calculation Preview</span>
                    <span className="text-emerald-700">Live Mathematical Result</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl text-center">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Current
                      </span>
                      <span className="text-base sm:text-lg font-mono font-bold text-slate-700">
                        {currentBaselineStock}
                      </span>
                    </div>

                    <div className="text-slate-400 font-bold text-base sm:text-lg">
                      {isDeduction ? '−' : '+'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                        {isDeduction ? 'Deducting' : 'Adding More'}
                      </span>
                      <span
                        className={`text-base sm:text-lg font-mono font-bold ${
                          isDeduction ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {parsedInboundAmount || 0}
                      </span>
                    </div>

                    <div className="text-slate-400 font-bold text-base sm:text-lg flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-emerald-600" />
                    </div>

                    <div className="min-w-0 flex-1 bg-emerald-50 py-1 rounded-lg border border-emerald-200">
                      <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                        New Total
                      </span>
                      <span className="text-lg sm:text-xl font-mono font-black text-emerald-900">
                        {calculatedNewTotalStock} {selectedItem.unit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Reference / Transaction Reason (Optional) */}
                <div>
                  <label
                    htmlFor="restock-reason"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Reason / Reference Note (Optional)
                  </label>
                  <input
                    id="restock-reason"
                    type="text"
                    placeholder="e.g., Supplier Restock, Inbound Delivery, Transfer, Return"
                    value={restockReason}
                    onChange={(e) => setRestockReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                  />
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {['Supplier Restock', 'PO Delivery', 'Customer Return', 'Stock Adjustment'].map(
                      (tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setRestockReason(tag)}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                        >
                          + {tag}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </>
            )}

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
                id="confirm-restock-btn"
                disabled={!selectedItem || parsedInboundAmount <= 0}
                className="min-h-[44px] px-6 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:pointer-events-none rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {isDeduction
                    ? `Confirm Deduct (−${parsedInboundAmount} ${selectedItem?.unit || ''})`
                    : `Confirm Add More (+${parsedInboundAmount} ${selectedItem?.unit || ''})`}
                </span>
              </button>
            </div>
          </form>
        ) : (
          /* ================================================================= */
          /* TAB 2: REGISTER NEW PRODUCT SKU (Initial catalog creation)        */
          /* ================================================================= */
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
                id="new-item-name"
                type="text"
                required
                autoFocus
                placeholder="e.g., A4 Printing Paper, Ballpoint Pens, Milk"
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
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItemId(matchingExistingItem.id);
                      setActiveTab('restock');
                    }}
                    className="px-2.5 py-1 text-xs font-bold bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg cursor-pointer shrink-0"
                  >
                    Switch to Add Stock
                  </button>
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

            {/* 3. Initial Received Stock & 4. Low Stock Alert Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Initial Inbound Stock Quantity */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 min-w-0">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="new-item-initial-quantity"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    Initial Opening Stock <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-xs font-semibold text-slate-500 truncate max-w-[110px]">
                    {unit || 'Units'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStepInitialQuantity(-1)}
                    className="min-h-[40px] min-w-[40px] rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 flex items-center justify-center font-bold border border-slate-300 transition-transform active:scale-95 cursor-pointer shadow-2xs shrink-0"
                    title="Decrease initial stock"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <input
                    id="new-item-initial-quantity"
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={initialQuantity}
                    onChange={(e) => setInitialQuantity(e.target.value)}
                    className="w-full min-w-0 px-2 py-2 min-h-[40px] text-base font-mono text-center font-bold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900"
                  />

                  <button
                    type="button"
                    onClick={() => handleStepInitialQuantity(1)}
                    className="min-h-[40px] min-w-[40px] rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold border border-emerald-300 transition-transform active:scale-95 cursor-pointer shadow-2xs shrink-0"
                    title="Increase initial stock"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Initial quantity being registered into inventory
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
                    <Minus className="w-4 h-4" />
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
                    <Plus className="w-4 h-4" />
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

            {/* 6. Product Labels & Tags */}
            <div>
              <TagInput
                tags={tags}
                onChange={setTags}
                availableTags={availableTags}
                placeholder="Add tags (e.g., Office, Warehouse, Perishable)..."
              />
            </div>

            {/* 7. Notes & Location Remarks */}
            <div>
              <label
                htmlFor="new-item-notes"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                Notes, Supplier & Shelf Location (Optional)
              </label>
              <textarea
                id="new-item-notes"
                rows={2}
                placeholder="e.g., Shelf B-12, Supplier ABC Ltd, Batch #4092"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 placeholder:text-slate-400"
              />
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
                className="min-h-[44px] px-6 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Register Product SKU</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

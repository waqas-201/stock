import React, { useMemo } from 'react';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { StockItem, StockFilter, StockTag } from '../types';

interface StockSummaryProps {
  items: StockItem[];
  activeFilter?: StockFilter;
  onSelectFilter?: (filter: StockFilter) => void;
  selectedTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
  managedTags?: StockTag[];
}

export const StockSummary: React.FC<StockSummaryProps> = ({
  items = [],
  activeFilter = 'all',
  onSelectFilter,
  selectedTag,
}) => {
  const safeItems = Array.isArray(items) ? items : [];

  // Whole stock calculations (global baseline)
  const wholeTotalItems = safeItems.length;

  // Tag-scoped calculations (interconnected in real-time)
  const isTagActive = Boolean(selectedTag);
  const tagScopedItems = useMemo(() => {
    if (!selectedTag) return safeItems;
    return safeItems.filter(
      (item) => Array.isArray(item.tags) && item.tags.includes(selectedTag)
    );
  }, [safeItems, selectedTag]);

  const currentTotalItems = tagScopedItems.length;
  const currentTotalQuantity = tagScopedItems.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0
  );
  const currentOutOfStockCount = tagScopedItems.filter(
    (item) => (item.quantity || 0) <= 0
  ).length;
  const currentLowStockCount = tagScopedItems.filter((item) => {
    const threshold = item.lowStockThreshold ?? 5;
    return (item.quantity || 0) > 0 && (item.quantity || 0) <= threshold;
  }).length;
  const currentInStockCount = tagScopedItems.filter((item) => {
    const threshold = item.lowStockThreshold ?? 5;
    return (item.quantity || 0) > threshold;
  }).length;

  return (
    <div id="stock-summary-container" className="select-none">
      {/* 4 Interactive Stock KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 select-none">
        {/* 1. Total Items (All) */}
        <div
          id="stat-card-total-items"
          onClick={() => onSelectFilter && onSelectFilter('all')}
          role="button"
          tabIndex={0}
          className={`bg-white rounded-2xl p-3.5 sm:p-5 border transition-all text-left cursor-pointer active:scale-[0.98] ${
            activeFilter === 'all'
              ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
              : 'border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide">
              {isTagActive ? 'Tag SKUs' : 'Total Items'}
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
                {currentTotalItems}
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium">
                {isTagActive ? `of ${wholeTotalItems} total` : 'SKUs'}
              </span>
            </div>
            {activeFilter === 'all' && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/50">
                Active
              </span>
            )}
          </div>
        </div>

        {/* 2. Total In-Stock */}
        <div
          id="stat-card-total-qty"
          onClick={() => onSelectFilter && onSelectFilter('in_stock')}
          role="button"
          tabIndex={0}
          className={`bg-white rounded-2xl p-3.5 sm:p-5 border transition-all text-left cursor-pointer active:scale-[0.98] ${
            activeFilter === 'in_stock'
              ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
              : 'border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide">
              In Stock
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-3xl font-bold text-emerald-700 tracking-tight font-mono">
                {currentInStockCount}
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium">
                ({currentTotalQuantity.toLocaleString()} units)
              </span>
            </div>
            {activeFilter === 'in_stock' && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/50">
                Active
              </span>
            )}
          </div>
        </div>

        {/* 3. Low Stock (Individual Item Alert) */}
        <div
          id="stat-card-low-stock"
          onClick={() => onSelectFilter && onSelectFilter('low_stock')}
          role="button"
          tabIndex={0}
          className={`bg-white rounded-2xl p-3.5 sm:p-5 border transition-all text-left cursor-pointer active:scale-[0.98] ${
            activeFilter === 'low_stock'
              ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
              : 'border-amber-200 hover:border-amber-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-amber-900 uppercase tracking-wide">
              Low Stock
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-3xl font-bold text-amber-600 tracking-tight font-mono">
                {currentLowStockCount}
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium">
                {currentLowStockCount === 1 ? 'alert' : 'alerts'}
              </span>
            </div>
            {activeFilter === 'low_stock' ? (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md border border-amber-300">
                Active
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md">
                {isTagActive ? `in #${selectedTag}` : 'Per Item'}
              </span>
            )}
          </div>
        </div>

        {/* 4. Out of Stock */}
        <div
          id="stat-card-out-of-stock"
          onClick={() => onSelectFilter && onSelectFilter('out_of_stock')}
          role="button"
          tabIndex={0}
          className={`bg-white rounded-2xl p-3.5 sm:p-5 border transition-all text-left cursor-pointer active:scale-[0.98] ${
            activeFilter === 'out_of_stock'
              ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
              : 'border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-rose-700 uppercase tracking-wide">
              Out of Stock
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-3xl font-bold text-rose-600 tracking-tight font-mono">
                {currentOutOfStockCount}
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium">
                {currentOutOfStockCount === 1 ? 'item' : 'items'}
              </span>
            </div>
            {activeFilter === 'out_of_stock' && (
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200/50">
                Active
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


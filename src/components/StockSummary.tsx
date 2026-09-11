import React from 'react';
import { Package, AlertCircle, CheckCircle2, Layers } from 'lucide-react';
import { StockItem } from '../types';
import { AppStrings } from '../lib/translations';

interface StockSummaryProps {
  items: StockItem[];
  t: AppStrings;
}

export const StockSummary: React.FC<StockSummaryProps> = ({ items, t }) => {
  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const outOfStockCount = items.filter((item) => (item.quantity || 0) <= 0).length;
  const lowStockCount = items.filter(
    (item) => (item.quantity || 0) > 0 && (item.quantity || 0) <= 5
  ).length;

  return (
    <div
      id="stock-summary-container"
      className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
    >
      {/* Total Items */}
      <div
        id="stat-card-total-items"
        className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">{t.totalItemsLabel}</span>
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
            {totalItems}
          </span>
          <span className="text-xs text-slate-400 font-medium">SKUs</span>
        </div>
      </div>

      {/* Total Stock Units */}
      <div
        id="stat-card-total-qty"
        className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">{t.totalQuantityLabel}</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
            {totalQuantity.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400 font-medium">{t.unitsInStock}</span>
        </div>
      </div>

      {/* Low Stock */}
      <div
        id="stat-card-low-stock"
        className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">{t.lowStockLabel}</span>
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-amber-600 tracking-tight font-mono">
            {lowStockCount}
          </span>
          <span className="text-xs text-slate-400 font-medium">{t.itemsCount(lowStockCount)}</span>
        </div>
      </div>

      {/* Out of Stock */}
      <div
        id="stat-card-out-of-stock"
        className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">{t.outOfStockLabel}</span>
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-rose-600 tracking-tight font-mono">
            {outOfStockCount}
          </span>
          <span className="text-xs text-slate-400 font-medium">{t.itemsCount(outOfStockCount)}</span>
        </div>
      </div>
    </div>
  );
};

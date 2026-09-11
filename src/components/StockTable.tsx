import React, { useState } from 'react';
import {
  Search,
  Plus,
  ArrowUpDown,
  Edit2,
  Trash2,
  AlertTriangle,
  Package,
  Minus,
  FileSpreadsheet,
} from 'lucide-react';
import { StockItem, StockFilter, SortField, SortOrder, AppLanguage } from '../types';
import { AppStrings } from '../lib/translations';

interface StockTableProps {
  items: StockItem[];
  lang: AppLanguage;
  t: AppStrings;
  onAddItem: () => void;
  onEditItem: (item: StockItem) => void;
  onDeleteItem: (item: StockItem) => void;
  onQuickQuantityChange: (item: StockItem, delta: number) => void;
  onExportExcel: () => void;
}

export const StockTable: React.FC<StockTableProps> = ({
  items,
  lang,
  t,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onQuickQuantityChange,
  onExportExcel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Filter items
  const filteredItems = items.filter((item) => {
    // Search query
    if (
      searchQuery.trim() &&
      !item.itemName.toLowerCase().includes(searchQuery.toLowerCase().trim())
    ) {
      return false;
    }
    // Status filter
    if (filter === 'in_stock') return item.quantity > 5;
    if (filter === 'low_stock') return item.quantity > 0 && item.quantity <= 5;
    if (filter === 'out_of_stock') return item.quantity <= 0;
    return true;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortField === 'name') {
      const cmp = a.itemName.localeCompare(b.itemName);
      return sortOrder === 'asc' ? cmp : -cmp;
    }
    if (sortField === 'quantity') {
      const diff = a.quantity - b.quantity;
      return sortOrder === 'asc' ? diff : -diff;
    }
    return 0;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div
      id="stock-table-card"
      className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
    >
      {/* Table Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 bg-slate-50/50">
        {/* Left: Search & Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 text-slate-400 ${lang === 'ur' ? 'right-3.5' : 'left-3.5'}`} />
            <input
              id="search-stock-input"
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent placeholder:text-slate-400 ${
                lang === 'ur' ? 'pr-9 pl-4' : 'pl-9 pr-4'
              }`}
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0 overflow-x-auto">
            {(
              [
                { key: 'all', label: t.filterAll },
                { key: 'in_stock', label: t.filterInStock },
                { key: 'low_stock', label: t.filterLowStock },
                { key: 'out_of_stock', label: t.filterOutOfStock },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  filter === f.key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Add Item Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-add-stock-item"
            type="button"
            onClick={onAddItem}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:ring-offset-1"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addItem}</span>
          </button>
        </div>
      </div>

      {/* 3-Column Stock Table */}
      <div className="overflow-x-auto">
        <table id="stock-data-table" className="w-full text-start border-collapse">
          <thead>
            <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              {/* Row Index */}
              <th className="py-3 px-4 w-12 text-center text-slate-400 font-normal">
                #
              </th>

              {/* Column 1: Item Name */}
              <th className="py-3.5 px-4 min-w-[220px]">
                <button
                  type="button"
                  onClick={() => toggleSort('name')}
                  className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer font-bold uppercase"
                >
                  <span>{t.itemNameCol}</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </th>

              {/* Column 2: Unit */}
              <th className="py-3.5 px-4 w-36 font-bold uppercase">
                <span>{t.unitCol}</span>
              </th>

              {/* Column 3: Quantity */}
              <th className="py-3.5 px-4 min-w-[180px]">
                <button
                  type="button"
                  onClick={() => toggleSort('quantity')}
                  className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer font-bold uppercase"
                >
                  <span>{t.quantityCol}</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </th>

              {/* Actions */}
              <th className="py-3.5 px-4 text-end w-44 font-bold uppercase">
                {t.actionsCol}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <div className="max-w-sm mx-auto flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                      <Package className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      {items.length === 0 ? t.noItemsYet : t.noMatchFound}
                    </p>
                    <p className="text-xs text-slate-500">
                      {items.length === 0
                        ? t.noItemsDescription
                        : 'مختلف لفظ سے تلاش کریں یا فلٹر تبدیل کریں۔'}
                    </p>
                    {items.length === 0 && (
                      <button
                        type="button"
                        onClick={onAddItem}
                        className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t.addFirstItem}</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              sortedItems.map((item, index) => {
                const isOutOfStock = (item.quantity || 0) <= 0;
                const isLowStock =
                  (item.quantity || 0) > 0 && (item.quantity || 0) <= 5;

                return (
                  <tr
                    key={item.id}
                    id={`stock-row-${item.id}`}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Sequential row number */}
                    <td className="py-4 px-4 text-center text-xs text-slate-400 font-mono">
                      {index + 1}
                    </td>

                    {/* Column 1: Item Name */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">
                          {item.itemName}
                        </span>
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {t.filterOutOfStock}
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {t.filterLowStock}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Column 2: Unit */}
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                        {item.unit}
                      </span>
                    </td>

                    {/* Column 3: Quantity */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-base font-bold font-mono ${
                            isOutOfStock
                              ? 'text-rose-600'
                              : isLowStock
                              ? 'text-amber-600'
                              : 'text-slate-900'
                          }`}
                        >
                          {item.quantity.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {item.unit}
                        </span>
                      </div>
                    </td>

                    {/* Quick Adjustment & Row Actions */}
                    <td className="py-4 px-4 text-end">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {/* Quick -1 / +1 live buttons */}
                        <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => onQuickQuantityChange(item, -1)}
                            disabled={item.quantity <= 0}
                            title="مقدار میں ۱ کمی کریں"
                            className="p-1.5 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 transition-colors disabled:opacity-30 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <div className="w-[1px] h-4 bg-slate-200" />
                          <button
                            type="button"
                            onClick={() => onQuickQuantityChange(item, 1)}
                            title="مقدار میں ۱ اضافہ کریں"
                            className="p-1.5 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Edit item */}
                        <button
                          type="button"
                          onClick={() => onEditItem(item)}
                          title={t.editItem}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete item */}
                        <button
                          type="button"
                          onClick={() => onDeleteItem(item)}
                          title={t.deleteItem}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Counts & Excel Note */}
      <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <p>
          {t.showingCount(sortedItems.length, items.length)}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExportExcel}
            className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{t.exportExcel} (.xlsx)</span>
          </button>
          <span>•</span>
          <span className="text-slate-400">{t.threeColNote}</span>
        </div>
      </div>
    </div>
  );
};

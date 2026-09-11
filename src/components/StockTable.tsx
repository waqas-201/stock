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
  SlidersHorizontal,
  LayoutGrid,
  List,
  X,
  CheckCircle2,
} from 'lucide-react';
import { StockItem, StockFilter, SortField, SortOrder } from '../types';

interface StockTableProps {
  items: StockItem[];
  globalThreshold: number;
  activeFilter: StockFilter;
  onFilterChange: (filter: StockFilter) => void;
  onAddItem: () => void;
  onEditItem: (item: StockItem) => void;
  onDeleteItem: (item: StockItem) => void;
  onQuickQuantityChange: (item: StockItem, delta: number) => void;
  onExportExcel: () => void;
  onOpenThresholdModal: () => void;
}

export const StockTable: React.FC<StockTableProps> = ({
  items,
  globalThreshold,
  activeFilter,
  onFilterChange,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onQuickQuantityChange,
  onExportExcel,
  onOpenThresholdModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  // Default to card view on mobile screens, or user preference
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Helper to determine if an item is low stock
  const isItemLowStock = (item: StockItem) => {
    const threshold = item.lowStockThreshold ?? globalThreshold;
    return (item.quantity || 0) > 0 && (item.quantity || 0) <= threshold;
  };

  // Helper to determine if an item is in stock (above threshold)
  const isItemInStock = (item: StockItem) => {
    const threshold = item.lowStockThreshold ?? globalThreshold;
    return (item.quantity || 0) > threshold;
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (
      searchQuery.trim() &&
      !item.itemName.toLowerCase().includes(searchQuery.toLowerCase().trim())
    ) {
      return false;
    }
    if (activeFilter === 'in_stock') return isItemInStock(item);
    if (activeFilter === 'low_stock') return isItemLowStock(item);
    if (activeFilter === 'out_of_stock') return (item.quantity || 0) <= 0;
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

  // Count items by category for filter tabs
  const countAll = items.length;
  const countInStock = items.filter((i) => isItemInStock(i)).length;
  const countLowStock = items.filter((i) => isItemLowStock(i)).length;
  const countOutOfStock = items.filter((i) => (i.quantity || 0) <= 0).length;

  return (
    <div
      id="stock-inventory-container"
      className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
    >
      {/* Table & List Toolbar */}
      <div className="p-3.5 sm:p-5 border-b border-slate-200 bg-slate-50/60 space-y-3">
        {/* Row 1: Search & Add Button */}
        <div className="flex items-center gap-2">
          {/* Search Input - Mobile Optimized (16px base font prevents iOS auto-zoom) */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="search-stock-input"
              type="text"
              placeholder="Search items by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 min-h-[44px] text-base sm:text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 min-w-[28px] min-h-[28px] flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Add Item Button */}
          <button
            id="btn-add-stock-item"
            type="button"
            onClick={onAddItem}
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Add Item</span>
            <span className="xs:hidden">Add</span>
          </button>
        </div>

        {/* Row 2: Filter Tabs & View Toggle / Sort */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {/* Filter Pills with Horizontal Scroll on Small Screens */}
          <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl overflow-x-auto scrollbar-none max-w-full">
            {(
              [
                { key: 'all', label: 'All', count: countAll },
                { key: 'in_stock', label: 'In Stock', count: countInStock },
                { key: 'low_stock', label: 'Low Stock', count: countLowStock },
                { key: 'out_of_stock', label: 'Out', count: countOutOfStock },
              ] as const
            ).map((f) => {
              const isActive = activeFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => onFilterChange(f.key)}
                  className={`min-h-[34px] px-2.5 sm:px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 active:bg-slate-200/60'
                  }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-slate-200/60 text-slate-500'
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Side: View Toggle (Cards vs Table) & Sort */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Sort Toggle for Mobile */}
            <button
              type="button"
              onClick={() => toggleSort(sortField === 'name' ? 'quantity' : 'name')}
              title={`Sort by ${sortField === 'name' ? 'Quantity' : 'Name'} (${sortOrder})`}
              className="min-h-[38px] px-2.5 py-1.5 inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:bg-slate-100 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Sort:</span>
              <span className="capitalize">{sortField}</span>
              <span className="text-[10px] text-slate-400">
                {sortOrder === 'asc' ? '↑' : '↓'}
              </span>
            </button>

            {/* Layout Mode Toggle */}
            <div className="hidden sm:flex items-center p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {sortedItems.length === 0 ? (
        <div className="py-16 px-4 text-center">
          <div className="max-w-sm mx-auto flex flex-col items-center justify-center gap-2.5">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <Package className="w-7 h-7" />
            </div>
            <p className="text-base font-bold text-slate-800">
              {items.length === 0
                ? 'No inventory items yet'
                : 'No items match this filter'}
            </p>
            <p className="text-xs text-slate-500 max-w-xs">
              {items.length === 0
                ? 'Start tracking your stock by adding your first product.'
                : 'Try adjusting your search keyword or switching the filter tab.'}
            </p>
            {items.length === 0 && (
              <button
                type="button"
                onClick={onAddItem}
                className="mt-2 min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Item</span>
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* ======================================================== */
        /* MOBILE CARDS VIEW (Primary Mobile-First Interface)       */
        /* ======================================================== */
        <div className="p-3 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedItems.map((item) => {
            const isOutOfStock = (item.quantity || 0) <= 0;
            const isLowStock = isItemLowStock(item);
            const activeThreshold = item.lowStockThreshold ?? globalThreshold;

            return (
              <div
                key={item.id}
                id={`stock-card-${item.id}`}
                className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 select-none ${
                  isOutOfStock
                    ? 'border-rose-200 bg-rose-50/20'
                    : isLowStock
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-slate-200/90 hover:border-slate-300'
                } shadow-xs`}
              >
                {/* Card Top: Item Name & Status Badge */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug break-words">
                      {item.itemName}
                    </h3>

                    {/* Stock Status Badge */}
                    <div className="shrink-0">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span
                          title={`Quantity is at or below threshold (${activeThreshold})`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-700" />
                          Low (≤ {activeThreshold})
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          In Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Unit Tag & Custom Threshold Indicator */}
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                    <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-md font-semibold text-slate-700">
                      Unit: {item.unit}
                    </span>
                    {item.lowStockThreshold !== undefined && (
                      <span className="text-[11px] text-amber-700 font-medium">
                        Custom Alert: ≤ {item.lowStockThreshold}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Middle: Large Quantity Display & 44px+ Quick Touch Stepper */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-2xl sm:text-3xl font-bold font-mono ${
                        isOutOfStock
                          ? 'text-rose-600'
                          : isLowStock
                          ? 'text-amber-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {item.quantity.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {item.unit}
                    </span>
                  </div>

                  {/* Touch Stepper Controls (Min 44px x 44px hit targets) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onQuickQuantityChange(item, -1)}
                      disabled={item.quantity <= 0}
                      title="Decrease quantity by 1"
                      className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-slate-700 flex items-center justify-center font-bold transition-transform cursor-pointer border border-slate-200/80"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onQuickQuantityChange(item, 1)}
                      title="Increase quantity by 1"
                      className="min-h-[44px] min-w-[44px] rounded-xl bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 active:scale-95 text-emerald-800 flex items-center justify-center font-bold transition-transform cursor-pointer border border-emerald-200"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Card Bottom: Edit & Delete (Min 44px touch targets) */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEditItem(item)}
                    className="min-h-[44px] px-3.5 py-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteItem(item)}
                    className="min-h-[44px] px-3.5 py-2 inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ======================================================== */
        /* TRADITIONAL TABLE VIEW (For Desktop / Table Preference)   */
        /* ======================================================== */
        <div className="overflow-x-auto">
          <table id="stock-data-table" className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="py-3 px-3 w-10 text-center text-slate-400 font-normal">
                  #
                </th>
                <th className="py-3.5 px-4 min-w-[200px]">
                  <button
                    type="button"
                    onClick={() => toggleSort('name')}
                    className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer font-bold uppercase"
                  >
                    <span>1. Item Name</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </th>
                <th className="py-3.5 px-4 w-36 font-bold uppercase">
                  <span>2. Unit</span>
                </th>
                <th className="py-3.5 px-4 min-w-[180px]">
                  <button
                    type="button"
                    onClick={() => toggleSort('quantity')}
                    className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer font-bold uppercase"
                  >
                    <span>3. Quantity</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </th>
                <th className="py-3.5 px-4 text-right w-40 font-bold uppercase">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {sortedItems.map((item, index) => {
                const isOutOfStock = (item.quantity || 0) <= 0;
                const isLowStock = isItemLowStock(item);
                const activeThreshold = item.lowStockThreshold ?? globalThreshold;

                return (
                  <tr
                    key={item.id}
                    id={`stock-row-${item.id}`}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-3 text-center text-xs text-slate-400 font-mono">
                      {index + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">
                          {item.itemName}
                        </span>
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span
                            title={`Quantity is at or below threshold (${activeThreshold})`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300"
                          >
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                            Low Stock (≤ {activeThreshold})
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                        {item.unit}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
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

                        <div className="ml-auto flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onQuickQuantityChange(item, -1)}
                            disabled={item.quantity <= 0}
                            className="min-w-[36px] min-h-[36px] rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-30 disabled:pointer-events-none text-slate-700 flex items-center justify-center font-bold cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onQuickQuantityChange(item, 1)}
                            className="min-w-[36px] min-h-[36px] rounded-lg bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-800 flex items-center justify-center font-bold cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditItem(item)}
                          className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Edit Item"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteItem(item)}
                          className="min-w-[36px] min-h-[36px] flex items-center justify-center text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

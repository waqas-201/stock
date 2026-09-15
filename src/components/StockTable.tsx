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
  LayoutGrid,
  List,
  Rows3,
  X,
  ShieldAlert,
  Zap,
  Calendar,
  FileText,
  Eye,
  History,
  User,
  Sparkles,
  Tag as TagIcon,
  Hash,
} from 'lucide-react';
import { StockItem, StockFilter, SortField, SortOrder, StockTag, StockLabel } from '../types';
import { getTagStyle, getUniqueTagsWithCounts } from '../lib/tagUtils';

interface StockTableProps {
  items: StockItem[];
  activeFilter: StockFilter;
  confirmOnDelete: boolean;
  onToggleConfirmOnDelete: () => void;
  onFilterChange: (filter: StockFilter) => void;
  onAddItem: () => void;
  onEditItem: (item: StockItem) => void;
  onDeleteItem: (item: StockItem) => void;
  onQuickQuantityChange: (item: StockItem, delta: number) => void;
  onReceiveStock?: (item: StockItem) => void;
  onExportExcel: () => void;
  onViewItemDetails: (item: StockItem) => void;
  onOpenAuditTrail: () => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  selectedTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
  onOpenGeminiChat?: () => void;
  managedTags?: StockTag[];
  onOpenTagModal?: () => void;
  managedLabels?: StockLabel[];
  onOpenLabelModal?: () => void;
}

export const StockTable: React.FC<StockTableProps> = ({
  items = [],
  activeFilter,
  confirmOnDelete,
  onToggleConfirmOnDelete,
  onFilterChange,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onQuickQuantityChange,
  onReceiveStock,
  onViewItemDetails,
  onOpenAuditTrail,
  searchQuery: externalSearchQuery,
  onSearchQueryChange,
  selectedTag: externalSelectedTag,
  onSelectTag,
  onOpenGeminiChat,
  managedTags,
  onOpenTagModal,
  managedLabels = [],
  onOpenLabelModal,
}) => {
  const effectiveTags: StockTag[] = managedTags || (managedLabels as unknown as StockTag[]) || [];
  const handleOpenTagsModal = onOpenTagModal || onOpenLabelModal;

  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = (val: string) => {
    if (onSearchQueryChange) {
      onSearchQueryChange(val);
    } else {
      setInternalSearchQuery(val);
    }
  };

  const [internalSelectedTag, setInternalSelectedTag] = useState<string | null>(null);
  const selectedTag = externalSelectedTag !== undefined ? externalSelectedTag : internalSelectedTag;
  const setSelectedTag = (tag: string | null) => {
    if (onSelectTag) {
      onSelectTag(tag);
    } else {
      setInternalSelectedTag(tag);
    }
  };

  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  // Default to compact mobile-first list view for zero horizontal scrolling and instant stock visibility
  const [viewMode, setViewMode] = useState<'compact' | 'cards' | 'table'>('compact');

  // Helper to determine if an item is low stock based on its individual threshold
  const isItemLowStock = (item: StockItem) => {
    const threshold = item.lowStockThreshold ?? 5;
    return (item.quantity || 0) > 0 && (item.quantity || 0) <= threshold;
  };

  // Helper to determine if an item is in stock (above its individual threshold)
  const isItemInStock = (item: StockItem) => {
    const threshold = item.lowStockThreshold ?? 5;
    return (item.quantity || 0) > threshold;
  };

  const formatProductionDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(
          parseInt(parts[0], 10),
          parseInt(parts[1], 10) - 1,
          parseInt(parts[2], 10)
        );
        return d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Unique tags extracted from inventory items
  const safeItems = Array.isArray(items) ? items : [];
  const uniqueTags = getUniqueTagsWithCounts(safeItems);

  // Filter items
  const filteredItems = safeItems.filter((item) => {
    // 1. Tag Filter
    if (selectedTag && (!Array.isArray(item.tags) || !item.tags.includes(selectedTag))) {
      return false;
    }

    // 2. Search query (matches item name, unit, notes, batch/date, and tags)
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const cleanQ = query.replace(/^#+/, '');
      const matchName = item.itemName.toLowerCase().includes(query);
      const matchUnit = item.unit.toLowerCase().includes(query);
      const matchNotes = item.notes?.toLowerCase().includes(query) ?? false;
      const matchProdDate = item.productionDate?.includes(query) ?? false;
      const matchTags = Array.isArray(item.tags) && item.tags.some((t) => t.toLowerCase().includes(cleanQ));
      if (!matchName && !matchUnit && !matchNotes && !matchProdDate && !matchTags) {
        return false;
      }
    }

    // 3. Status filter tab
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
    if (sortField === 'threshold') {
      const diff = (a.lowStockThreshold ?? 5) - (b.lowStockThreshold ?? 5);
      return sortOrder === 'asc' ? diff : -diff;
    }
    if (sortField === 'production_date') {
      const aDate = a.productionDate || '';
      const bDate = b.productionDate || '';
      const cmp = aDate.localeCompare(bDate);
      return sortOrder === 'asc' ? cmp : -cmp;
    }
    if (sortField === 'tags') {
      const aTags = Array.isArray(a.tags) && a.tags.length > 0 ? a.tags.join(', ') : '';
      const bTags = Array.isArray(b.tags) && b.tags.length > 0 ? b.tags.join(', ') : '';
      if (!aTags && !bTags) return 0;
      if (!aTags) return 1;
      if (!bTags) return -1;
      const cmp = aTags.localeCompare(bTags);
      return sortOrder === 'asc' ? cmp : -cmp;
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
  const countAll = safeItems.length;
  const countInStock = safeItems.filter((i) => isItemInStock(i)).length;
  const countLowStock = safeItems.filter((i) => isItemLowStock(i)).length;
  const countOutOfStock = safeItems.filter((i) => (i.quantity || 0) <= 0).length;

  return (
    <div
      id="stock-inventory-container"
      className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
    >
      {/* Table & List Toolbar */}
      <div className="p-3.5 sm:p-5 border-b border-slate-200 bg-slate-50/60 space-y-3">
        {/* Row 1: Search & Add Button */}
        <div className="flex items-center gap-2">
          {/* Search Input - 16px font prevents iOS auto-zoom */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="search-stock-input"
              type="text"
              placeholder="Search items by name, notes, batch, unit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-16 py-2.5 min-h-[44px] text-base sm:text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent placeholder:text-slate-400"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="min-w-[28px] min-h-[28px] flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Talk to Gemini AI button in toolbar */}
          {onOpenGeminiChat && (
            <button
              id="btn-stock-gemini-chat"
              type="button"
              onClick={onOpenGeminiChat}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
              title="Talk with Gemini AI about your stock"
            >
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0 animate-pulse" />
              <span className="hidden sm:inline">Talk to AI</span>
              <span className="sm:hidden">AI</span>
            </button>
          )}

          {/* Audit Trail quick shortcut */}
          <button
            type="button"
            onClick={onOpenAuditTrail}
            className="min-h-[44px] hidden sm:inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
            title="View complete inventory audit trail & activity history"
          >
            <History className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>

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
        <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap sm:flex-nowrap">
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

          {/* Right Side: View Toggle (Compact vs Cards vs Table), Sort & Delete Mode Toggle */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto flex-wrap sm:flex-nowrap">
            {/* Quick Delete / Confirm Toggle */}
            <button
              id="btn-toggle-delete-mode"
              type="button"
              onClick={onToggleConfirmOnDelete}
              title={
                confirmOnDelete
                  ? 'Confirm popup is currently ON. Click to switch to Quick Delete (no popup).'
                  : 'Quick Delete is ON (No popup, 1-tap delete with Undo). Click to turn on confirmation popup.'
              }
              className={`min-h-[38px] px-2.5 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                confirmOnDelete
                  ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 active:bg-slate-100'
                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 active:bg-amber-200'
              }`}
            >
              {confirmOnDelete ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="hidden sm:inline">Confirm:</span>
                  <span className="font-bold">Ask</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="hidden sm:inline">Delete:</span>
                  <span className="font-bold">Fast</span>
                </>
              )}
            </button>

            {/* Sort Toggle for Mobile & Compact */}
            <button
              type="button"
              onClick={() => {
                if (sortField === 'name') toggleSort('quantity');
                else if (sortField === 'quantity') toggleSort('threshold');
                else if (sortField === 'threshold') toggleSort('production_date');
                else if (sortField === 'production_date') toggleSort('tags');
                else toggleSort('name');
              }}
              title={`Sort by ${sortField} (${sortOrder})`}
              className="min-h-[38px] px-2.5 py-1.5 inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:bg-slate-100 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Sort:</span>
              <span className="capitalize">
                {sortField === 'threshold'
                  ? 'Alert Level'
                  : sortField === 'production_date'
                  ? 'Prod. Date'
                  : sortField === 'tags'
                  ? 'Tags'
                  : sortField}
              </span>
              <span className="text-[10px] text-slate-400">
                {sortOrder === 'asc' ? '↑' : '↓'}
              </span>
            </button>

            {/* Layout Mode Toggle: Compact (Mobile-first, zero-scroll), Cards, Table */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`min-h-[32px] px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${
                  viewMode === 'compact'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Compact List View (Zero horizontal scrolling on mobile, stock numbers upfront)"
              >
                <Rows3 className="w-3.5 h-3.5" />
                <span className="text-[11px]">Compact</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`min-h-[32px] px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${
                  viewMode === 'cards'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Card Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden xs:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`min-h-[32px] px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${
                  viewMode === 'table'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Table Spreadsheet View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden xs:inline">Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: Product Labels & Tags Filter Bar */}
        {uniqueTags.length > 0 && (
          <div
            id="tag-filter-bar"
            className="pt-2 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1"
          >
            <div className="flex items-center gap-1 text-xs font-bold text-slate-600 uppercase tracking-wider shrink-0 pl-0.5 pr-1">
              <TagIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden xs:inline">Tags:</span>
            </div>

            {/* "All Tags" button */}
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={`min-h-[30px] px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                selectedTag === null
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>All Tags</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  selectedTag === null ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {safeItems.length}
              </span>
            </button>

            {/* Individual Tag Pills */}
            {uniqueTags.map(({ name, count }) => {
              const isSelected = selectedTag === name;
              const style = getTagStyle(name, effectiveTags);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedTag(isSelected ? null : name)}
                  className={`min-h-[30px] px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? `${style.activeBg} shadow-2xs ring-2 ring-emerald-500/20`
                      : `${style.bg} ${style.text} ${style.border} ${style.hover}`
                  }`}
                  title={
                    isSelected
                      ? `Click to clear filter for "${name}"`
                      : `Filter inventory by tag "${name}" (${count} items)`
                  }
                >
                  <Hash className="w-3 h-3 opacity-60" />
                  <span>{name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isSelected ? 'bg-black/20 text-white' : 'bg-black/5 text-current'
                    }`}
                  >
                    {count}
                  </span>
                  {isSelected && <X className="w-3 h-3 ml-0.5" />}
                </button>
              );
            })}

            {/* Manage Tags shortcut */}
            {handleOpenTagsModal && (
              <button
                id="btn-filterbar-manage-tags"
                type="button"
                onClick={handleOpenTagsModal}
                className="min-h-[30px] px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-dashed border-slate-300 hover:border-emerald-300 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                title="Manage custom tags & color codes"
              >
                <TagIcon className="w-3 h-3 text-emerald-600" />
                <span>Manage Tags</span>
              </button>
            )}

            {/* Reset active tag filter */}
            {selectedTag && (
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 underline shrink-0 cursor-pointer flex items-center gap-0.5"
              >
                <X className="w-3 h-3" />
                <span>Clear Tag</span>
              </button>
            )}
          </div>
        )}
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
                : selectedTag
                ? `No items found with tag "#${selectedTag}"`
                : 'No items match this filter'}
            </p>
            <p className="text-xs text-slate-500 max-w-xs">
              {items.length === 0
                ? 'Start tracking your stock with individual low-stock alerts and production dates.'
                : selectedTag
                ? `There are no products currently tagged with #${selectedTag} under this view.`
                : 'Try adjusting your search keyword or switching the filter tab.'}
            </p>
            {selectedTag && (
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className="mt-2 min-h-[38px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-2xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear "#{selectedTag}" Filter</span>
              </button>
            )}
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
      ) : viewMode === 'compact' ? (
        /* ======================================================== */
        /* COMPACT LIST VIEW (Zero Horizontal Scroll, Mobile-First) */
        /* ======================================================== */
        <div className="divide-y divide-slate-100">
          {sortedItems.map((item) => {
            const isOutOfStock = (item.quantity || 0) <= 0;
            const isLowStock = isItemLowStock(item);
            const itemThreshold = item.lowStockThreshold ?? 5;
            const prodDateFormatted = formatProductionDate(item.productionDate);

            return (
              <div
                key={item.id}
                id={`compact-stock-row-${item.id}`}
                className={`p-3 sm:p-4 hover:bg-slate-50/90 transition-colors flex items-center justify-between gap-2.5 sm:gap-4 ${
                  isOutOfStock
                    ? 'bg-rose-50/20'
                    : isLowStock
                    ? 'bg-amber-50/25'
                    : ''
                }`}
              >
                {/* Left Side: Item Information (Truncates smoothly without forcing horizontal width) */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    {/* Status Pill */}
                    {isOutOfStock ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 shrink-0">
                        Out
                      </span>
                    ) : isLowStock ? (
                      <span
                        title={`Low stock: ≤ ${itemThreshold} ${item.unit}`}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shrink-0"
                      >
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                        Low
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        In Stock
                      </span>
                    )}

                    {/* Item Name */}
                    <button
                      type="button"
                      onClick={() => onViewItemDetails(item)}
                      className="text-sm sm:text-base font-bold text-slate-900 hover:text-emerald-700 text-left truncate cursor-pointer"
                      title="Tap to view item history & details"
                    >
                      {item.itemName}
                    </button>

                    {/* Unit Badge */}
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                      {item.unit}
                    </span>
                  </div>

                  {/* Secondary Line: Alert Threshold, Production Date, Tags */}
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                    <span className={isLowStock ? 'text-amber-800 font-bold' : 'text-slate-500'}>
                      Alert ≤ {itemThreshold}
                    </span>

                    {prodDateFormatted && (
                      <span className="text-slate-400 hidden xs:inline">
                        • Mfg: {prodDateFormatted}
                      </span>
                    )}

                    {item.tags && item.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        {item.tags.slice(0, 2).map((tag) => {
                          const style = getTagStyle(tag, effectiveTags);
                          return (
                            <span
                              key={tag}
                              className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${style.bg} ${style.text}`}
                            >
                              {tag}
                            </span>
                          );
                        })}
                        {item.tags.length > 2 && (
                          <span className="text-[10px] text-slate-400">
                            +{item.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Stock Quantity, Steppers (+ / -), and Quick Edit (Zero horizontal scroll) */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  {/* Stock Quantity */}
                  <div className="text-right">
                    <div
                      className={`text-base sm:text-xl font-bold font-mono tracking-tight leading-none ${
                        isOutOfStock
                          ? 'text-rose-600'
                          : isLowStock
                          ? 'text-amber-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {item.quantity.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {item.unit}
                    </div>
                  </div>

                  {/* Touch Stepper (+ / -) */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onQuickQuantityChange(item, -1)}
                      disabled={item.quantity <= 0}
                      className="min-w-[34px] min-h-[34px] rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-30 disabled:pointer-events-none text-slate-700 flex items-center justify-center font-bold cursor-pointer"
                      title="Decrease by 1"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickQuantityChange(item, 1)}
                      className="min-w-[34px] min-h-[34px] rounded-lg bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-800 flex items-center justify-center font-bold cursor-pointer"
                      title="Increase by 1"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Actions: Add Stock / View Details / Edit */}
                  <div className="flex items-center gap-1">
                    {onReceiveStock && (
                      <button
                        type="button"
                        onClick={() => onReceiveStock(item)}
                        className="min-h-[34px] px-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title={`Add inbound stock to ${item.itemName}`}
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="hidden xs:inline">Add Stock</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onEditItem(item)}
                      className="min-w-[34px] min-h-[34px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                      title="Edit item"
                      aria-label="Edit item"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'cards' ? (
        /* ======================================================== */
        /* CARDS VIEW (Full Responsive, Touch Steppers, Metadata)   */
        /* ======================================================== */
        <div className="p-3 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {sortedItems.map((item) => {
            const isOutOfStock = (item.quantity || 0) <= 0;
            const isLowStock = isItemLowStock(item);
            const itemThreshold = item.lowStockThreshold ?? 5;
            const prodDateFormatted = formatProductionDate(item.productionDate);

            return (
              <div
                key={item.id}
                id={`stock-card-${item.id}`}
                className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 select-none ${
                  isOutOfStock
                    ? 'border-rose-200 bg-rose-50/20'
                    : isLowStock
                    ? 'border-amber-300 bg-amber-50/30 ring-1 ring-amber-400/20'
                    : 'border-slate-200/90 hover:border-slate-300'
                } shadow-xs`}
              >
                {/* Card Top: Item Name, Unit & Status Badge */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      onClick={() => onViewItemDetails(item)}
                      className="text-base font-bold text-slate-900 tracking-tight leading-snug break-words hover:text-emerald-700 cursor-pointer transition-colors"
                      title="Click to view full trail & details"
                    >
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
                          title={`Quantity (${item.quantity}) is at or below this item's alert threshold (${itemThreshold})`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-700" />
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          In Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Chips: Unit, Alert Level & Production Date */}
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-md font-semibold text-slate-700">
                      Unit: {item.unit}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                        isLowStock
                          ? 'bg-amber-100/70 border-amber-300 text-amber-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                      title={`Alert triggers when stock drops to ≤ ${itemThreshold} ${item.unit}`}
                    >
                      <ShieldAlert className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>Alert ≤ {itemThreshold}</span>
                    </span>

                    {/* Production Date Chip */}
                    {prodDateFormatted && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                        title={`Production / Mfg Date: ${prodDateFormatted}`}
                      >
                        <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Mfg: {prodDateFormatted}</span>
                      </span>
                    )}

                    {/* Notes indicator */}
                    {item.notes && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 max-w-full truncate"
                        title={item.notes}
                      >
                        <FileText className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[130px]">{item.notes}</span>
                      </span>
                    )}
                  </div>

                  {/* Product Tags on Card */}
                  {Array.isArray(item.tags) && item.tags.length > 0 && (
                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                      {item.tags.map((tag) => {
                        const style = getTagStyle(tag, effectiveTags);
                        const isSelected = selectedTag === tag;
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setSelectedTag(isSelected ? null : tag)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                              isSelected
                                ? `${style.activeBg} ring-2 ring-emerald-500/20`
                                : `${style.bg} ${style.text} ${style.border} ${style.hover}`
                            }`}
                            title={
                              isSelected
                                ? `Click to clear filter for "${tag}"`
                                : `Filter items by tag "${tag}"`
                            }
                          >
                            <Hash className="w-2.5 h-2.5 opacity-60" />
                            <span>{tag}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Card Middle: Quantity Display & 44px+ Quick Touch Stepper */}
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

                {/* Operator Attribution Info on Card */}
                <div className="pt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 truncate">
                    <User className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      By <strong className="text-slate-700 font-semibold">{item.lastModifiedByName || item.createdByName || 'Staff Member'}</strong>
                    </span>
                  </span>
                  {item.updatedAt && (
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(item.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>

                {/* Card Bottom: View Trail, Edit & Delete (Min 44px touch targets) */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => onViewItemDetails(item)}
                    className="min-h-[44px] px-3 py-2 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 active:bg-indigo-200 border border-indigo-200 rounded-xl transition-colors cursor-pointer"
                    title="View complete item details & activity trail"
                  >
                    <History className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Trail & Info</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {onReceiveStock && (
                      <button
                        type="button"
                        onClick={() => onReceiveStock(item)}
                        className="min-h-[44px] px-3 py-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
                        title="Add inbound stock to this product"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Add Stock</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onEditItem(item)}
                      className="min-h-[44px] px-3 py-2 inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                      title="Edit Item details & threshold"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteItem(item)}
                      title={
                        confirmOnDelete
                          ? `Delete "${item.itemName}" (Confirm popup)`
                          : `Delete "${item.itemName}" directly (Undo available)`
                      }
                      className="min-h-[44px] px-3 py-2 inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ======================================================== */
        /* TRADITIONAL TABLE VIEW (For Desktop & Tablet)             */
        /* ======================================================== */
        <div className="overflow-x-auto">
          <table id="stock-data-table" className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="py-3 px-2 sm:px-3 w-8 sm:w-10 text-center text-slate-400 font-normal">
                  #
                </th>
                <th className="py-3 px-3 sm:px-4 min-w-[170px] sm:min-w-[200px]">
                  <button
                    type="button"
                    onClick={() => toggleSort('name')}
                    className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer font-bold uppercase"
                  >
                    <span>Item Name</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </th>
                <th className="py-3 px-3 sm:px-4 min-w-[150px]">
                  <button
                    type="button"
                    onClick={() => toggleSort('quantity')}
                    className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer font-bold uppercase text-emerald-800"
                  >
                    <span>Current Stock</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-emerald-600" />
                  </button>
                </th>
                <th className="py-3 px-2 sm:px-4 w-20 sm:w-28 font-bold uppercase">
                  <span>Unit</span>
                </th>
                <th className="py-3 px-3 sm:px-4 min-w-[120px]">
                  <button
                    type="button"
                    onClick={() => toggleSort('threshold')}
                    className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer font-bold uppercase text-amber-900"
                  >
                    <span>Alert Level</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" />
                  </button>
                </th>
                <th className="py-3 px-3 sm:px-4 min-w-[120px]">
                  <button
                    type="button"
                    onClick={() => toggleSort('production_date')}
                    className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer font-bold uppercase text-slate-600"
                  >
                    <span>Mfg Date</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </th>
                <th className="py-3 px-3 sm:px-4 min-w-[120px]">
                  <button
                    type="button"
                    onClick={() => toggleSort('tags')}
                    className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer font-bold uppercase text-slate-600"
                  >
                    <TagIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tags</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </th>
                <th className="py-3 px-3 sm:px-4 min-w-[130px] font-bold uppercase text-slate-600">
                  <span>Last Modified</span>
                </th>
                <th className="py-3 px-3 sm:px-4 text-right w-36 font-bold uppercase">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {sortedItems.map((item, index) => {
                const isOutOfStock = (item.quantity || 0) <= 0;
                const isLowStock = isItemLowStock(item);
                const itemThreshold = item.lowStockThreshold ?? 5;
                const prodDateFormatted = formatProductionDate(item.productionDate);

                return (
                  <tr
                    key={item.id}
                    id={`stock-row-${item.id}`}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isOutOfStock
                        ? 'bg-rose-50/20'
                        : isLowStock
                        ? 'bg-amber-50/30'
                        : ''
                    }`}
                  >
                    <td className="py-3 px-2 sm:px-3 text-center text-xs text-slate-400 font-mono">
                      {index + 1}
                    </td>

                    <td className="py-3 px-3 sm:px-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            onClick={() => onViewItemDetails(item)}
                            className="font-bold text-slate-900 text-sm hover:text-emerald-700 cursor-pointer"
                            title="Click to view details & trail"
                          >
                            {item.itemName}
                          </span>
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Out
                            </span>
                          ) : isLowStock ? (
                            <span
                              title={`Stock is ≤ ${itemThreshold}`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                              Low
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200">
                              In Stock
                            </span>
                          )}
                        </div>

                        {/* Notes under item name */}
                        {item.notes && (
                          <div className="mt-0.5">
                            <p className="text-xs text-slate-400 italic line-clamp-1">
                              {item.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Current Stock right next to Item Name */}
                    <td className="py-3 px-3 sm:px-4">
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
                            className="min-w-[32px] min-h-[32px] rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-30 disabled:pointer-events-none text-slate-700 flex items-center justify-center font-bold cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onQuickQuantityChange(item, 1)}
                            className="min-w-[32px] min-h-[32px] rounded-lg bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-800 flex items-center justify-center font-bold cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Unit */}
                    <td className="py-3 px-2 sm:px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                        {item.unit}
                      </span>
                    </td>

                    {/* Low Stock Threshold Column */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${
                          isLowStock
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        ≤ {itemThreshold} {item.unit}
                      </span>
                    </td>

                    {/* Production Date Column */}
                    <td className="py-3.5 px-4">
                      {prodDateFormatted ? (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-700 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{prodDateFormatted}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Product Tags Column */}
                    <td className="py-3.5 px-4">
                      {Array.isArray(item.tags) && item.tags.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap max-w-[200px]">
                          {item.tags.map((tag) => {
                            const style = getTagStyle(tag, effectiveTags);
                            const isSelected = selectedTag === tag;
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => setSelectedTag(isSelected ? null : tag)}
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                                  isSelected
                                    ? `${style.activeBg} ring-1 ring-emerald-400`
                                    : `${style.bg} ${style.text} ${style.border} hover:opacity-80`
                                }`}
                                title={
                                  isSelected
                                    ? `Click to clear filter for "${tag}"`
                                    : `Filter items by tag "${tag}"`
                                }
                              >
                                <Hash className="w-2 h-2 opacity-60" />
                                <span>{tag}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 italic">—</span>
                      )}
                    </td>

                    {/* Last Modified Attribution Column */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col text-xs">
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate max-w-[130px]">
                            {item.lastModifiedByName || item.createdByName || 'Staff Member'}
                          </span>
                        </span>
                        {item.updatedAt && (
                          <span className="text-[11px] text-slate-400 pl-4.5">
                            {new Date(item.updatedAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onReceiveStock && (
                          <button
                            type="button"
                            onClick={() => onReceiveStock(item)}
                            className="min-h-[34px] px-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                            title="Add inbound stock"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Add Stock</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onViewItemDetails(item)}
                          className="min-w-[34px] min-h-[34px] flex items-center justify-center text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg cursor-pointer"
                          title="View Details & Complete Trail"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditItem(item)}
                          className="min-w-[34px] min-h-[34px] flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Edit Item"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteItem(item)}
                          className="min-w-[34px] min-h-[34px] flex items-center justify-center text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title={
                            confirmOnDelete
                              ? `Delete "${item.itemName}" (Confirm popup)`
                              : `Delete "${item.itemName}" directly (Undo available)`
                          }
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

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Calendar,
  Check,
  Download,
  Clock,
  History,
  AlertCircle,
  Boxes,
  Tag,
  Hash,
  Search,
} from 'lucide-react';
import { StockItem, StockTag } from '../types';
import { GlobalAuditRecord, deduplicateAuditLogs } from '../lib/stockStorage';
import {
  getAffectedItems,
  exportToExcelAdvanced,
  isTimestampInRange,
} from '../lib/excelExport';
import {
  getLocalDateRange,
  getRecentHoursRange,
  useActiveTimezone,
  parseLocalDateBoundary,
  isDateMatchingToday,
} from '../lib/dateUtils';
import { getTagStyle } from '../lib/tagUtils';

export interface ExportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: StockItem[];
  globalLogs?: GlobalAuditRecord[];
  initialSelectedTag?: string | null;
  managedTags?: StockTag[];
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

type TimeSpanPreset =
  | 'today'
  | '10_hours'
  | '20_hours'
  | '48_hours'
  | '72_hours'
  | '7_days'
  | '20_days'
  | '30_days'
  | '60_days'
  | 'all_time'
  | 'custom';

type ExportScope = 'whole_stock' | 'affected_only';

export const ExportExcelModal: React.FC<ExportExcelModalProps> = ({
  isOpen,
  onClose,
  items = [],
  globalLogs = [],
  initialSelectedTag = null,
  managedTags = [],
  onShowToast,
}) => {
  const safeItems = Array.isArray(items) ? items : [];
  const safeLogs = useMemo(() => {
    const list = Array.isArray(globalLogs) ? globalLogs : [];
    return deduplicateAuditLogs(list);
  }, [globalLogs]);

  const { timezone } = useActiveTimezone();

  // Tag filter state: defaults to currently active tag from inventory table if any
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(initialSelectedTag || null);
  const [tagSearchTerm, setTagSearchTerm] = useState<string>('');

  // Sync state whenever modal opens or initialSelectedTag changes
  useEffect(() => {
    if (isOpen) {
      setSelectedTagFilter(initialSelectedTag || null);
      setTagSearchTerm('');
      // When a tag is specified, automatically default scope to 'whole_stock' so all items matching that tag are exported!
      if (initialSelectedTag && initialSelectedTag !== 'all') {
        setExportScope('whole_stock');
      }
    }
  }, [isOpen, initialSelectedTag]);

  // Extract all unique tags present across items with exact item counts
  const uniqueTagsList = useMemo(() => {
    const map = new Map<string, number>();
    safeItems.forEach((item) => {
      if (Array.isArray(item.tags)) {
        item.tags.forEach((t) => {
          if (t && t.trim()) {
            const clean = t.trim().replace(/^#+/, '');
            map.set(clean, (map.get(clean) || 0) + 1);
          }
        });
      }
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [safeItems]);

  // Filtered tags list for in-modal search
  const visibleTagsList = useMemo(() => {
    if (!tagSearchTerm.trim()) return uniqueTagsList;
    const q = tagSearchTerm.toLowerCase().trim().replace(/^#+/, '');
    return uniqueTagsList.filter((t) => t.name.toLowerCase().includes(q));
  }, [uniqueTagsList, tagSearchTerm]);

  // Default time span preset is "Last 20 Days"
  const [selectedPreset, setSelectedPreset] = useState<TimeSpanPreset>('20_days');
  const [customDays, setCustomDays] = useState<number>(20);

  // Date range state
  const initial20Days = useMemo(() => getLocalDateRange(20, timezone), [timezone]);
  const [customStartDate, setCustomStartDate] = useState<string>(
    initial20Days.startStr
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    initial20Days.endStr
  );

  // Export scope: 'affected_only' or 'whole_stock'
  const [exportScope, setExportScope] = useState<ExportScope>(
    initialSelectedTag ? 'whole_stock' : 'affected_only'
  );
  const [includeAuditTrail, setIncludeAuditTrail] = useState<boolean>(true);

  // Filter base items by selected tag
  const activeBaseItems = useMemo(() => {
    if (!selectedTagFilter || selectedTagFilter === 'all') {
      return safeItems;
    }
    const cleanTag = selectedTagFilter.toLowerCase().trim().replace(/^#+/, '');
    return safeItems.filter(
      (item) =>
        Array.isArray(item.tags) &&
        item.tags.some((t) => t && t.toLowerCase().trim().replace(/^#+/, '') === cleanTag)
    );
  }, [safeItems, selectedTagFilter]);

  // Compute actual start and end dates based on preset
  const { startDate, endDate, timeSpanLabel } = useMemo(() => {
    if (selectedPreset === 'all_time') {
      return {
        startDate: null,
        endDate: null,
        timeSpanLabel: 'All Time',
      };
    }

    if (selectedPreset === 'today') {
      const range = getLocalDateRange(1, timezone);
      return {
        startDate: range.startDate,
        endDate: range.endDate,
        timeSpanLabel: 'Today',
      };
    }

    if (selectedPreset === '10_hours') {
      const range = getRecentHoursRange(10, timezone);
      return {
        startDate: range.startDate,
        endDate: range.endDate,
        timeSpanLabel: 'Last 10 Hours',
      };
    }

    if (selectedPreset === '20_hours') {
      const range = getRecentHoursRange(20, timezone);
      return {
        startDate: range.startDate,
        endDate: range.endDate,
        timeSpanLabel: 'Last 20 Hours',
      };
    }

    if (selectedPreset === '48_hours') {
      const range = getRecentHoursRange(48, timezone);
      return {
        startDate: range.startDate,
        endDate: range.endDate,
        timeSpanLabel: 'Last 48 Hours',
      };
    }

    if (selectedPreset === '72_hours') {
      const range = getRecentHoursRange(72, timezone);
      return {
        startDate: range.startDate,
        endDate: range.endDate,
        timeSpanLabel: 'Last 72 Hours',
      };
    }

    if (selectedPreset === 'custom') {
      const start = customStartDate ? parseLocalDateBoundary(customStartDate, false, timezone) : null;
      const end = customEndDate ? parseLocalDateBoundary(customEndDate, true, timezone) : null;
      return {
        startDate: start,
        endDate: end,
        timeSpanLabel: `${customStartDate || 'Start'} to ${customEndDate || 'Now'}`,
      };
    }

    let days = 20;
    if (selectedPreset === '7_days') days = 7;
    else if (selectedPreset === '20_days') days = 20;
    else if (selectedPreset === '30_days') days = 30;
    else if (selectedPreset === '60_days') days = 60;

    const range = getLocalDateRange(days, timezone);
    return {
      startDate: range.startDate,
      endDate: range.endDate,
      timeSpanLabel: `Last ${days} Days`,
    };
  }, [selectedPreset, customDays, customStartDate, customEndDate, timezone]);

  // Compute affected items for the active date range constrained to activeBaseItems
  const { affectedItems, itemStatsMap } = useMemo(() => {
    return getAffectedItems(activeBaseItems, startDate, endDate, safeLogs);
  }, [activeBaseItems, startDate, endDate, safeLogs]);

  // Calculate matching audit logs count (constrained to date range AND tag filter)
  const matchingLogsCount = useMemo(() => {
    return safeLogs.filter((log) => {
      if (!log.timestamp) return false;
      const matchDate =
        selectedPreset === 'today'
          ? isDateMatchingToday(log.timestamp, timezone)
          : isTimestampInRange(log.timestamp, startDate, endDate, timezone);
      if (!matchDate) return false;

      if (selectedTagFilter && selectedTagFilter !== 'all') {
        const matchesTag = activeBaseItems.some(
          (bi) =>
            bi.id === log.itemId ||
            (log.itemName && log.itemName.toLowerCase() === bi.itemName.toLowerCase())
        );
        if (!matchesTag) return false;
      }
      return true;
    }).length;
  }, [safeLogs, startDate, endDate, selectedPreset, timezone, selectedTagFilter, activeBaseItems]);

  if (!isOpen) return null;

  const handlePresetSelect = (preset: TimeSpanPreset) => {
    setSelectedPreset(preset);
    if (preset === 'today') {
      const range = getLocalDateRange(1, timezone);
      setCustomStartDate(range.startStr);
      setCustomEndDate(range.endStr);
      setCustomDays(1);
    } else if (preset === '7_days') {
      const range = getLocalDateRange(7, timezone);
      setCustomStartDate(range.startStr);
      setCustomEndDate(range.endStr);
      setCustomDays(7);
    } else if (preset === '20_days') {
      const range = getLocalDateRange(20, timezone);
      setCustomStartDate(range.startStr);
      setCustomEndDate(range.endStr);
      setCustomDays(20);
    } else if (preset === '30_days') {
      const range = getLocalDateRange(30, timezone);
      setCustomStartDate(range.startStr);
      setCustomEndDate(range.endStr);
      setCustomDays(30);
    } else if (preset === '60_days') {
      const range = getLocalDateRange(60, timezone);
      setCustomStartDate(range.startStr);
      setCustomEndDate(range.endStr);
      setCustomDays(60);
    }
  };

  const handleCustomDaysChange = (days: number) => {
    const val = Math.max(1, Math.min(365, days));
    setCustomDays(val);
    const range = getLocalDateRange(val, timezone);
    setCustomStartDate(range.startStr);
    setCustomEndDate(range.endStr);
  };

  const handleExport = () => {
    const exportItems = exportScope === 'affected_only' ? affectedItems : activeBaseItems;

    if (exportItems.length === 0) {
      if (onShowToast) {
        onShowToast(
          selectedTagFilter
            ? `No items tagged "${selectedTagFilter}" match the selected export criteria (${timeSpanLabel}).`
            : exportScope === 'affected_only'
            ? `No items were affected in the selected period (${timeSpanLabel}). Try selecting "Whole Stock" or a wider date range.`
            : 'No stock items available to export.',
          'error'
        );
      }
      return;
    }

    try {
      exportToExcelAdvanced({
        items: safeItems,
        scope: exportScope,
        startDate,
        endDate,
        timeSpanLabel,
        includeAuditTrail,
        globalLogs: safeLogs,
        selectedTag: selectedTagFilter,
      });

      if (onShowToast) {
        onShowToast(
          selectedTagFilter
            ? `Exported ${exportItems.length} items tagged with "${selectedTagFilter}" to Excel.`
            : `Exported ${exportItems.length} items (${
                exportScope === 'affected_only'
                  ? `Affected in ${timeSpanLabel}`
                  : 'Whole Stock'
              }) to Excel.`,
          'success'
        );
      }
      onClose();
    } catch (err) {
      console.error('Export error:', err);
      if (onShowToast) {
        onShowToast('Failed to export Excel file. Please try again.', 'error');
      }
    }
  };

  const formatDateDisplay = (d: Date | null) => {
    if (!d) return '';
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const effectiveExportCount = exportScope === 'affected_only' ? affectedItems.length : activeBaseItems.length;

  return (
    <div
      id="export-excel-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="export-excel-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-excel-title"
        className="relative w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 my-auto flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="export-excel-title"
                className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate"
              >
                Export Inventory to Excel
              </h3>
              <p className="text-xs text-slate-500 truncate">
                {selectedTagFilter ? `Filtered by tag: #${selectedTagFilter}` : 'Filter by tag, time span, and audit trail'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
            aria-label="Close export dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Section 1: Tag Filter (The Key User Request: Export Only Selected Tag) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-600" />
                <span>1. Tag Filter (Export Specific Tag)</span>
              </label>
              {selectedTagFilter && selectedTagFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setSelectedTagFilter(null)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Tag (Export All Items)</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">
                  {uniqueTagsList.length} tag{uniqueTagsList.length === 1 ? '' : 's'} available
                </span>
              )}
            </div>

            {/* Active Tag Status Indicator */}
            {selectedTagFilter && selectedTagFilter !== 'all' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200/90 rounded-xl flex items-center justify-between gap-2 animate-in fade-in">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-emerald-950 font-medium">
                    Exporting <strong>only</strong> items matching tag:
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-2xs font-mono">
                    #{selectedTagFilter}
                  </span>
                  <span className="text-xs text-emerald-800 font-semibold">
                    ({activeBaseItems.length} item{activeBaseItems.length === 1 ? '' : 's'})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTagFilter(null)}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer shrink-0"
                >
                  Reset
                </button>
              </div>
            )}

            {/* Tag Selection Chips */}
            <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2">
              {/* Optional tag search if many tags exist */}
              {uniqueTagsList.length > 6 && (
                <div className="relative mb-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tagSearchTerm}
                    onChange={(e) => setTagSearchTerm(e.target.value)}
                    placeholder="Search tags..."
                    className="w-full pl-8 pr-7 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                  {tagSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setTagSearchTerm('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1.5 flex-wrap max-h-40 overflow-y-auto pr-1">
                {/* Option: All Tags */}
                <button
                  type="button"
                  onClick={() => setSelectedTagFilter(null)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                    !selectedTagFilter || selectedTagFilter === 'all'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>All Tags</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      !selectedTagFilter || selectedTagFilter === 'all'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {safeItems.length}
                  </span>
                </button>

                {/* Individual Tags */}
                {visibleTagsList.map(({ name, count }) => {
                  const isSelected = selectedTagFilter?.toLowerCase().replace(/^#+/, '') === name.toLowerCase().replace(/^#+/, '');
                  const style = getTagStyle(name, managedTags || []);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTagFilter(null);
                        } else {
                          setSelectedTagFilter(name);
                          setExportScope('whole_stock');
                        }
                      }}
                      className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? `${style.activeBg} font-bold shadow-2xs ring-2 ring-emerald-500/20`
                          : `${style.bg} ${style.text} ${style.border} hover:opacity-90`
                      }`}
                      title={`Filter export to items with tag "${name}" (${count} items)`}
                    >
                      <Hash className="w-3 h-3 opacity-60" />
                      <span>{name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                          isSelected ? 'bg-black/25 text-white' : 'bg-black/5 text-current'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: Time Span Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>2. Select Time Span</span>
              </label>
              {startDate && endDate && (
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  {formatDateDisplay(startDate)} → {formatDateDisplay(endDate)}
                </span>
              )}
            </div>

            {/* Quick preset chips */}
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-10 gap-1.5">
              {[
                { id: 'today', label: 'Today' },
                { id: '10_hours', label: '10h' },
                { id: '20_hours', label: '20h' },
                { id: '48_hours', label: '48h' },
                { id: '72_hours', label: '72h' },
                { id: '7_days', label: '1 Week' },
                { id: '20_days', label: '20 Days', highlight: true },
                { id: '30_days', label: '30 Days' },
                { id: 'all_time', label: 'All Time' },
                { id: 'custom', label: 'Custom' },
              ].map((p) => {
                const isActive = selectedPreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePresetSelect(p.id as TimeSpanPreset)}
                    className={`px-2 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center relative ${
                      isActive
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-500/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{p.label}</span>
                    {p.highlight && !isActive && (
                      <span className="absolute -top-1.5 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* If Custom or custom days active, show granular pickers */}
            {selectedPreset === 'custom' ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                <span className="text-xs font-semibold text-slate-600 block">
                  Choose specific date boundaries:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 block mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 block mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            ) : selectedPreset !== 'all_time' ? (
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Custom number of past days:</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={customDays}
                    onChange={(e) => handleCustomDaysChange(parseInt(e.target.value) || 20)}
                    className="w-16 px-2 py-1 text-xs font-bold text-center bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="font-semibold text-slate-500">days</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Section 3: Choose Scope (Whole Stock vs Affected Only) */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-emerald-600" />
              <span>3. Choose Items to Export</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Whole Stock (constrained by Tag) */}
              <button
                type="button"
                onClick={() => setExportScope('whole_stock')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                  exportScope === 'whole_stock'
                    ? 'bg-emerald-50/50 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900">
                        {selectedTagFilter ? `All Items in #${selectedTagFilter}` : 'Whole Stock'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {selectedTagFilter
                        ? `Export all ${activeBaseItems.length} items tagged with #${selectedTagFilter}.`
                        : 'Export complete catalog snapshot of all items currently in inventory.'}
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      exportScope === 'whole_stock'
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {exportScope === 'whole_stock' && <Check className="w-3 h-3" />}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {selectedTagFilter ? `Matching #${selectedTagFilter}` : 'Total in Catalog'}
                  </span>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono">
                    {activeBaseItems.length} items
                  </span>
                </div>
              </button>

              {/* Option 2: Only Items Affected in Selected Period */}
              <button
                type="button"
                onClick={() => setExportScope('affected_only')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                  exportScope === 'affected_only'
                    ? 'bg-emerald-50/50 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900">
                        {selectedTagFilter ? `Active in #${selectedTagFilter}` : 'Affected Items Only'}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Only items {selectedTagFilter ? `tagged #${selectedTagFilter}` : ''} that had stock changes or activity in {timeSpanLabel.toLowerCase()}.
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      exportScope === 'affected_only'
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {exportScope === 'affected_only' && <Check className="w-3 h-3" />}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Active in Period
                  </span>
                  <span
                    className={`text-xs font-extrabold px-2 py-0.5 rounded-md font-mono ${
                      affectedItems.length > 0
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {affectedItems.length} items
                  </span>
                </div>
              </button>
            </div>

            {exportScope === 'affected_only' && affectedItems.length === 0 && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  No items {selectedTagFilter ? `tagged with #${selectedTagFilter}` : ''} had logged activity in <strong>{timeSpanLabel}</strong>. You can switch to <strong>"Whole Stock"</strong> or choose a wider date range.
                </span>
              </div>
            )}
          </div>

          {/* Section 4: Include Audit Trail Sheet */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAuditTrail}
                onChange={(e) => setIncludeAuditTrail(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Include Audit Trail Sheet in Workbook</span>
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Adds a dedicated "Activity Trail" tab in Excel showing timestamps, staff members, previous/new quantities, and notes ({matchingLogsCount} events {selectedTagFilter ? `for #${selectedTagFilter}` : 'in this period'}).
                </span>
              </div>
            </label>
          </div>

          {/* Summary Box */}
          <div className="p-3 bg-emerald-50/50 border border-emerald-200/60 rounded-xl flex items-center justify-between text-xs">
            <div className="text-slate-700">
              Exporting{' '}
              <strong className="text-emerald-950 font-bold">
                {effectiveExportCount} item{effectiveExportCount === 1 ? '' : 's'}
              </strong>{' '}
              {selectedTagFilter && (
                <>
                  tagged{' '}
                  <strong className="text-emerald-800 font-bold">
                    #{selectedTagFilter}
                  </strong>{' '}
                </>
              )}
              ({exportScope === 'affected_only' ? 'Affected Only' : 'Whole Stock'}) for{' '}
              <strong className="text-emerald-950 font-bold">{timeSpanLabel}</strong>
            </div>
            <span className="text-[11px] font-mono text-emerald-700 font-semibold hidden sm:inline">
              .xlsx format
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer"
          >
            Cancel
          </button>

          <button
            id="btn-confirm-export-excel"
            type="button"
            onClick={handleExport}
            disabled={effectiveExportCount === 0}
            className="min-h-[40px] px-5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>
              {selectedTagFilter && selectedTagFilter !== 'all'
                ? `Download Excel for #${selectedTagFilter.replace(/^#+/, '')} (${effectiveExportCount})`
                : `Download Excel (${effectiveExportCount})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

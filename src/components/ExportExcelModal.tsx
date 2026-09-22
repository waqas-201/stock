import React, { useState, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  Calendar,
  Check,
  Download,
  Clock,
  History,
  AlertCircle,
  TrendingUp,
  Boxes,
} from 'lucide-react';
import { StockItem } from '../types';
import { GlobalAuditRecord } from '../lib/stockStorage';
import {
  getAffectedItems,
  exportToExcelAdvanced,
  isTimestampInRange,
} from '../lib/excelExport';
import {
  getLocalDateRange,
  useActiveTimezone,
  formatLocalDate,
  parseLocalDateBoundary,
  isDateMatchingToday,
} from '../lib/dateUtils';

export interface ExportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: StockItem[];
  globalLogs?: GlobalAuditRecord[];
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

type TimeSpanPreset = 'today' | '20_days' | '7_days' | '30_days' | '60_days' | 'all_time' | 'custom';
type ExportScope = 'whole_stock' | 'affected_only';

export const ExportExcelModal: React.FC<ExportExcelModalProps> = ({
  isOpen,
  onClose,
  items = [],
  globalLogs = [],
  onShowToast,
}) => {
  const safeItems = Array.isArray(items) ? items : [];
  const safeLogs = Array.isArray(globalLogs) ? globalLogs : [];

  const { timezone } = useActiveTimezone();

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

  // Export scope: default to 'affected_only' or 'whole_stock'
  const [exportScope, setExportScope] = useState<ExportScope>('affected_only');
  const [includeAuditTrail, setIncludeAuditTrail] = useState<boolean>(true);

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

  // Compute affected items for the active date range
  const { affectedItems, itemStatsMap } = useMemo(() => {
    return getAffectedItems(safeItems, startDate, endDate, safeLogs);
  }, [safeItems, startDate, endDate, safeLogs]);

  // Calculate matching audit logs count
  const matchingLogsCount = useMemo(() => {
    if (!startDate && !endDate) return safeLogs.length;
    return safeLogs.filter((log) => {
      if (!log.timestamp) return false;
      if (selectedPreset === 'today') {
        return isDateMatchingToday(log.timestamp, timezone);
      }
      return isTimestampInRange(log.timestamp, startDate, endDate, timezone);
    }).length;
  }, [safeLogs, startDate, endDate, selectedPreset, timezone]);

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
    const exportItems = exportScope === 'affected_only' ? affectedItems : safeItems;

    if (exportItems.length === 0) {
      if (onShowToast) {
        onShowToast(
          exportScope === 'affected_only'
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
      });

      if (onShowToast) {
        onShowToast(
          `Exported ${exportItems.length} items (${
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
                Select time span, item scope, and audit trail options
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
          {/* Section 1: Time Span Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>1. Select Time Span</span>
              </label>
              {startDate && endDate && (
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  {formatDateDisplay(startDate)} → {formatDateDisplay(endDate)}
                </span>
              )}
            </div>

            {/* Quick preset chips */}
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5">
              {[
                { id: 'today', label: 'Today' },
                { id: '20_days', label: 'Last 20 Days', highlight: true },
                { id: '7_days', label: 'Last 7 Days' },
                { id: '30_days', label: 'Last 30 Days' },
                { id: '60_days', label: 'Last 60 Days' },
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
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-500/20'
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
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                    className="w-16 px-2 py-1 text-xs font-bold text-center bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="font-semibold text-slate-500">days</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Section 2: Choose Items to Export (The 2 Core Options Requested) */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-emerald-600" />
              <span>2. Choose Items to Export</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Whole Stock */}
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
                        Whole Stock
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Export complete catalog snapshot of all items currently in inventory.
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
                    Total in Catalog
                  </span>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono">
                    {safeItems.length} items
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
                        Affected Items Only
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Only items that had stock changes, restocks, edits, or additions in {timeSpanLabel.toLowerCase()}.
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
                    Affected in Period
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
                  No items had logged activity in <strong>{timeSpanLabel}</strong>. You can switch to <strong>"Whole Stock"</strong> or choose a wider date range.
                </span>
              </div>
            )}
          </div>

          {/* Section 3: Include Audit Trail Sheet */}
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
                  Adds a dedicated "Activity Trail" tab in the Excel file showing timestamps, staff members, previous/new quantities, and summaries ({matchingLogsCount} events in this period).
                </span>
              </div>
            </label>
          </div>

          {/* Summary Box */}
          <div className="p-3 bg-emerald-50/50 border border-emerald-200/60 rounded-xl flex items-center justify-between text-xs">
            <div className="text-slate-700">
              Exporting{' '}
              <strong className="text-emerald-950 font-bold">
                {exportScope === 'affected_only' ? affectedItems.length : safeItems.length} items
              </strong>{' '}
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
            disabled={exportScope === 'affected_only' && affectedItems.length === 0}
            className="min-h-[40px] px-5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>
              Download Excel ({exportScope === 'affected_only' ? affectedItems.length : safeItems.length})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

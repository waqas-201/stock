import React, { useState, useMemo } from 'react';
import {
  X,
  History,
  Trash2,
  Plus,
  Edit2,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  RotateCcw,
  Calendar,
  Layers,
  User,
  ShieldCheck,
  Download,
  FileSpreadsheet,
  Clock,
} from 'lucide-react';
import { GlobalAuditRecord } from '../lib/stockStorage';
import {
  isTimestampInRange,
  exportAuditTrailToExcel,
} from '../lib/excelExport';
import {
  getTodayDateString,
  getLocalDateRange,
  getRecentHoursRange,
  formatLocalDateTime,
  formatCalendarRelativeTime,
  useActiveTimezone,
  isDateMatchingToday,
  isDateInLocalRange,
  parseLocalDateBoundary,
} from '../lib/dateUtils';

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: GlobalAuditRecord[];
  onSelectItem?: (itemId: string) => void;
}

type DatePresetType = '10h' | '20h' | '48h' | '72h' | 'today' | '7d' | '20d' | '30d' | 'all' | 'custom';

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({
  isOpen,
  onClose,
  logs = [],
  onSelectItem,
}) => {
  const safeLogs = Array.isArray(logs) ? logs : [];
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [selectedStaff, setSelectedStaff] = useState<string>('all');

  const { timezone } = useActiveTimezone();

  // Date span filtering state - default to 'all' or quick presets
  const [datePreset, setDatePreset] = useState<DatePresetType>('all');
  const initial20Days = useMemo(() => getLocalDateRange(20, timezone), [timezone]);
  const [customStartDate, setCustomStartDate] = useState<string>(
    initial20Days.startStr
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    initial20Days.endStr
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterAction('all');
    setSelectedStaff('all');
    setDatePreset('all');
  };

  // Compute date range
  const { startDate, endDate, dateSpanLabel, startStr, endStr } = useMemo(() => {
    if (datePreset === 'all') {
      return { startDate: null, endDate: null, dateSpanLabel: 'All Time', startStr: null, endStr: null };
    }
    if (datePreset === '10h') {
      const r = getRecentHoursRange(10, timezone);
      return { startDate: r.startDate, endDate: r.endDate, dateSpanLabel: 'Last 10 Hours', startStr: r.startStr, endStr: r.endStr };
    }
    if (datePreset === '20h') {
      const r = getRecentHoursRange(20, timezone);
      return { startDate: r.startDate, endDate: r.endDate, dateSpanLabel: 'Last 20 Hours', startStr: r.startStr, endStr: r.endStr };
    }
    if (datePreset === '48h') {
      const r = getRecentHoursRange(48, timezone);
      return { startDate: r.startDate, endDate: r.endDate, dateSpanLabel: 'Last 48 Hours', startStr: r.startStr, endStr: r.endStr };
    }
    if (datePreset === '72h') {
      const r = getRecentHoursRange(72, timezone);
      return { startDate: r.startDate, endDate: r.endDate, dateSpanLabel: 'Last 72 Hours', startStr: r.startStr, endStr: r.endStr };
    }
    if (datePreset === 'today') {
      const r = getLocalDateRange(1, timezone);
      return { startDate: r.startDate, endDate: r.endDate, dateSpanLabel: 'Today', startStr: r.startStr, endStr: r.endStr };
    }
    if (datePreset === '7d') {
      const r = getLocalDateRange(7, timezone);
      return { startDate: r.startDate, endDate: r.endDate, dateSpanLabel: 'Last 7 Days (1 Week)', startStr: r.startStr, endStr: r.endStr };
    }
    if (datePreset === '20d') {
      const r = getLocalDateRange(20, timezone);
      return { startDate: r.startDate, endDate: r.endDate, dateSpanLabel: 'Last 20 Days', startStr: r.startStr, endStr: r.endStr };
    }
    if (datePreset === '30d') {
      const r = getLocalDateRange(30, timezone);
      return { startDate: r.startDate, endDate: r.endDate, dateSpanLabel: 'Last 30 Days', startStr: r.startStr, endStr: r.endStr };
    }
    if (datePreset === 'custom') {
      const start = customStartDate ? parseLocalDateBoundary(customStartDate, false, timezone) : null;
      const end = customEndDate ? parseLocalDateBoundary(customEndDate, true, timezone) : null;
      return {
        startDate: start,
        endDate: end,
        dateSpanLabel: `${customStartDate || 'Start'} to ${customEndDate || 'Now'}`,
        startStr: customStartDate || null,
        endStr: customEndDate || null,
      };
    }
    return { startDate: null, endDate: null, dateSpanLabel: 'All Time', startStr: null, endStr: null };
  }, [datePreset, customStartDate, customEndDate, timezone]);

  // Extract unique staff members
  const staffMembers = useMemo(() => {
    const set = new Set<string>();
    safeLogs.forEach((l) => {
      if (l.performedBy && l.performedBy.trim()) {
        set.add(l.performedBy.trim());
      }
    });
    return Array.from(set).sort();
  }, [safeLogs]);

  if (!isOpen) return null;

  const filteredLogs = safeLogs.filter((log) => {
    const matchesSearch =
      searchTerm === '' ||
      log.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.performedBy && log.performedBy.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.userEmail && log.userEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAction =
      filterAction === 'all' ||
      (filterAction === 'deleted' && log.action === 'deleted') ||
      (filterAction === 'created' && log.action === 'created') ||
      (filterAction === 'quantity' && log.action === 'quantity_changed') ||
      (filterAction === 'edited' && log.action === 'edited');

    const matchesStaff =
      selectedStaff === 'all' ||
      (log.performedBy && log.performedBy.trim() === selectedStaff);

    const matchesDate = (() => {
      if (datePreset === 'all') return true;
      if (!log.timestamp) return false;

      // Hourly rolling windows: check precise timestamp range
      if (datePreset === '10h' || datePreset === '20h' || datePreset === '48h' || datePreset === '72h') {
        return isTimestampInRange(log.timestamp, startDate, endDate, timezone);
      }

      // Primary check for 'today': match calendar date in active timezone
      if (datePreset === 'today') {
        return isDateMatchingToday(log.timestamp, timezone);
      }

      // Check range using local calendar date strings if available
      if (startStr && endStr) {
        return isDateInLocalRange(log.timestamp, startStr, endStr, timezone);
      }

      // Fallback to exact timestamp range check
      return isTimestampInRange(log.timestamp, startDate, endDate, timezone);
    })();

    return matchesSearch && matchesAction && matchesStaff && matchesDate;
  });

  const handleExportFilteredTrail = () => {
    if (filteredLogs.length === 0) return;
    const filename = `inventory-audit-trail-${dateSpanLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${getTodayDateString(timezone)}.xlsx`;
    exportAuditTrailToExcel(filteredLogs, filename);
  };

  const formatDateTime = (dateStr: string) => {
    return formatLocalDateTime(dateStr, timezone, true);
  };

  return (
    <div
      id="audit-trail-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="audit-trail-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-trail-title"
        className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 my-auto flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="audit-trail-title"
                className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate"
              >
                Inventory Audit Trail & Staff Accountability
              </h3>
              <p className="text-xs text-slate-500 truncate">
                Full chronological record showing who added, changed, or deleted stock
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

        {/* Toolbar: Search and Filter Tabs */}
        <div className="p-3.5 sm:px-6 bg-slate-50/70 border-b border-slate-200 space-y-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Search bar */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by item name, staff member, or action..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {/* Staff Member Selector */}
            {staffMembers.length > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                  Staff:
                </span>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">All Staff Members ({staffMembers.length})</option>
                  {staffMembers.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Action & Date filters */}
          <div className="space-y-2 pt-1">
            {/* Row: Event Types */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pr-1 hidden sm:inline">
                  Action:
                </span>
                {[
                  { id: 'all', label: 'All Events' },
                  { id: 'created', label: 'Added' },
                  { id: 'quantity', label: 'Stock Changes' },
                  { id: 'edited', label: 'Edits' },
                  { id: 'deleted', label: 'Removed' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterAction(tab.id)}
                    className={`min-h-[28px] px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                      filterAction === tab.id
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row: Date Span Filter */}
            <div className="pt-1.5 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 uppercase tracking-wider shrink-0 pr-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Period:</span>
                </div>

                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: '10h', label: '10h' },
                  { id: '20h', label: '20h' },
                  { id: '48h', label: '48h' },
                  { id: '72h', label: '72h' },
                  { id: '7d', label: '1 Week' },
                  { id: '20d', label: '20 Days', highlight: true },
                  { id: '30d', label: '30 Days' },
                  { id: 'custom', label: 'Custom' },
                ].map((p) => {
                  const isActive = datePreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setDatePreset(p.id as DatePresetType);
                        if (p.id === '20d') {
                          const r = getLocalDateRange(20, timezone);
                          setCustomStartDate(r.startStr);
                          setCustomEndDate(r.endStr);
                        } else if (p.id === '7d') {
                          const r = getLocalDateRange(7, timezone);
                          setCustomStartDate(r.startStr);
                          setCustomEndDate(r.endStr);
                        }
                      }}
                      className={`min-h-[28px] px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer relative ${
                        isActive
                          ? 'bg-emerald-700 text-white shadow-2xs ring-2 ring-emerald-500/20'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{p.label}</span>
                      {p.highlight && !isActive && (
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block ml-1" />
                      )}
                    </button>
                  );
                })}

                {datePreset !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setDatePreset('all')}
                    className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold px-1.5 py-0.5 underline shrink-0 cursor-pointer ml-1"
                  >
                    Reset Period
                  </button>
                )}
              </div>

              {/* Status info */}
              <div className="text-[11px] font-medium text-slate-500 shrink-0 flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 font-mono font-bold">
                  {filteredLogs.length} events
                </span>
                {datePreset !== 'all' && (
                  <span className="text-emerald-700 font-semibold">
                    ({dateSpanLabel})
                  </span>
                )}
              </div>
            </div>

            {/* Granular Custom Date Range Pickers */}
            {datePreset === 'custom' && (
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-600">From:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-600">To:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const r = getLocalDateRange(20, timezone);
                    setCustomStartDate(r.startStr);
                    setCustomEndDate(r.endStr);
                  }}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer ml-auto"
                >
                  Set to Last 20 Days
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Trail Log */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <History className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">No activity logs found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                {searchTerm || filterAction !== 'all' || selectedStaff !== 'all'
                  ? 'Try clearing the search or staff filter.'
                  : 'Actions like adding, adjusting, editing, or deleting items will automatically log here with staff attribution.'}
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isCreate = log.action === 'created';
              const isDel = log.action === 'deleted';
              const isQty = log.action === 'quantity_changed';
              const isEdit = log.action === 'edited';
              const isRestored = log.action === 'restored';
              const delta = log.delta;

              return (
                <div
                  key={log.id}
                  className={`p-3 sm:p-4 rounded-xl border transition-all ${
                    isDel
                      ? 'bg-rose-50/40 border-rose-200'
                      : isCreate
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isDel
                            ? 'bg-rose-100 text-rose-700'
                            : isCreate
                            ? 'bg-emerald-100 text-emerald-700'
                            : isRestored
                            ? 'bg-emerald-100 text-emerald-700'
                            : delta && delta > 0
                            ? 'bg-emerald-100 text-emerald-700'
                            : delta && delta < 0
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {isDel ? (
                          <Trash2 className="w-4 h-4" />
                        ) : isCreate ? (
                          <Plus className="w-4 h-4" />
                        ) : isRestored ? (
                          <RotateCcw className="w-4 h-4" />
                        ) : delta && delta > 0 ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : delta && delta < 0 ? (
                          <ArrowDownRight className="w-4 h-4" />
                        ) : (
                          <Edit2 className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {onSelectItem && log.itemId ? (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onSelectItem(log.itemId);
                              }}
                              className="text-xs sm:text-sm font-bold text-emerald-800 hover:text-emerald-900 hover:underline cursor-pointer text-left flex items-center gap-1"
                              title={`View comprehensive trail for "${log.itemName}"`}
                            >
                              <span>{log.itemName}</span>
                              <span className="text-[10px] text-emerald-600 font-semibold">
                                (View Trail ↗)
                              </span>
                            </button>
                          ) : (
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              {log.itemName}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                              isDel
                                ? 'bg-rose-100 text-rose-800'
                                : isCreate
                                ? 'bg-emerald-100 text-emerald-800'
                                : isRestored
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isDel
                              ? 'REMOVED'
                              : isCreate
                              ? 'ADDED'
                              : isRestored
                              ? 'RESTORED'
                              : isQty
                              ? 'STOCK ADJUST'
                              : 'EDITED'}
                          </span>
                        </div>

                        {/* Who did this modification attribution banner */}
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200/80">
                            <User className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Staff: <strong className="text-emerald-950 font-extrabold">{log.performedBy || 'Staff Member'}</strong></span>
                          </span>
                          {log.userEmail && (
                            <span className="text-[10px] text-slate-400">
                              ({log.userEmail})
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-700 font-medium mt-1">
                          {log.summary}
                        </p>

                        {log.details && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {log.details}
                          </p>
                        )}

                        {log.previousQuantity !== undefined &&
                          log.newQuantity !== undefined && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                {log.previousQuantity} → {log.newQuantity} {log.unit}
                              </span>
                              {delta !== undefined && delta !== 0 && (
                                <span
                                  className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                    delta > 0
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {delta > 0 ? `+${delta}` : delta} {log.unit}
                                </span>
                              )}
                            </div>
                          )}
                      </div>
                    </div>

                    <div className="text-right whitespace-nowrap shrink-0">
                      <span className="text-xs font-bold text-slate-700 block">
                        {formatCalendarRelativeTime(log.timestamp, timezone)}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {formatDateTime(log.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Total records: <strong className="text-slate-700">{logs.length}</strong>
            {datePreset !== 'all' && (
              <span className="text-emerald-700 font-semibold ml-1">
                • {filteredLogs.length} in {dateSpanLabel}
              </span>
            )}
            {selectedStaff !== 'all' && (
              <span> (showing {filteredLogs.length} for {selectedStaff})</span>
            )}
          </div>
          <div className="flex items-center gap-2 justify-end">
            {filteredLogs.length > 0 && (
              <button
                type="button"
                onClick={handleExportFilteredTrail}
                className="min-h-[38px] px-3.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Export filtered audit logs to Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export Trail ({filteredLogs.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="min-h-[38px] px-3.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Reset all search queries, action filters, staff filters, and date periods"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Filters</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] px-4 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer shadow-2xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


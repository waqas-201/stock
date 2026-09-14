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
} from 'lucide-react';
import { GlobalAuditRecord } from '../lib/stockStorage';

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: GlobalAuditRecord[];
  onClearLogs?: () => void;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({
  isOpen,
  onClose,
  logs = [],
  onClearLogs,
}) => {
  const safeLogs = Array.isArray(logs) ? logs : [];
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [selectedStaff, setSelectedStaff] = useState<string>('all');

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

    return matchesSearch && matchesAction && matchesStaff;
  });

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
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

          {/* Action filters */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
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
                className={`min-h-[30px] px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
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
                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            {log.itemName}
                          </span>
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

                    <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                      {formatDateTime(log.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Total records: <strong className="text-slate-700">{logs.length}</strong>
            {selectedStaff !== 'all' && (
              <span> (showing {filteredLogs.length} for {selectedStaff})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onClearLogs && logs.length > 0 && (
              <button
                type="button"
                onClick={onClearLogs}
                className="min-h-[36px] px-3 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                Clear History
              </button>
            )}
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


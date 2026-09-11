import React from 'react';
import {
  X,
  Calendar,
  FileText,
  AlertTriangle,
  Package,
  Clock,
  Edit2,
  Plus,
  Minus,
  CheckCircle2,
  History,
  Tag,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { StockItem, ItemAuditEntry } from '../types';

interface ItemDetailsModalProps {
  isOpen: boolean;
  item: StockItem | null;
  onClose: () => void;
  onEdit: (item: StockItem) => void;
  onQuickQuantityChange: (item: StockItem, delta: number) => void;
}

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  isOpen,
  item,
  onClose,
  onEdit,
  onQuickQuantityChange,
}) => {
  if (!isOpen || !item) return null;

  const threshold = item.lowStockThreshold ?? 5;
  const isOutOfStock = item.quantity <= 0;
  const isLowStock = !isOutOfStock && item.quantity <= threshold;

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not set';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
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

  // Compile history: combine item's auditTrail or synthesize created event
  const trail: ItemAuditEntry[] =
    item.auditTrail && item.auditTrail.length > 0
      ? [...item.auditTrail]
      : [
          {
            id: 'synthesized_created',
            action: 'created',
            timestamp: item.createdAt || item.updatedAt || new Date().toISOString(),
            summary: 'Item added to inventory',
            details: `Initial stock level: ${item.quantity} ${item.unit}, alert limit ≤ ${threshold}`,
            newQuantity: item.quantity,
          },
        ];

  // Sort newest first
  trail.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div
      id="item-details-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="item-details-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-details-title"
        className="relative w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 my-auto flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-start gap-3 min-w-0 pr-2">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                isOutOfStock
                  ? 'bg-rose-100 text-rose-700'
                  : isLowStock
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  id="item-details-title"
                  className="text-base sm:text-lg font-bold text-slate-900 leading-tight"
                >
                  {item.itemName}
                </h3>
                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                    Out of Stock
                  </span>
                ) : isLowStock ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    <AlertTriangle className="w-3 h-3" />
                    Low Stock (≤{threshold})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    In Stock
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span>Unit: <strong className="text-slate-700">{item.unit}</strong></span>
                <span>•</span>
                <span>ID: <code className="font-mono text-[10px] text-slate-400">{item.id}</code></span>
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

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-5">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Current Stock */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                Current Stock
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span
                  className={`text-xl sm:text-2xl font-bold font-mono ${
                    isOutOfStock
                      ? 'text-rose-600'
                      : isLowStock
                      ? 'text-amber-600'
                      : 'text-slate-900'
                  }`}
                >
                  {item.quantity}
                </span>
                <span className="text-xs text-slate-500 font-medium truncate">
                  {item.unit}
                </span>
              </div>
            </div>

            {/* Alert Threshold */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl">
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-900 uppercase tracking-wide block">
                Alert Limit
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-bold font-mono text-amber-900">
                  ≤ {threshold}
                </span>
                <span className="text-xs text-amber-700 font-medium truncate">
                  {item.unit}
                </span>
              </div>
            </div>

            {/* Production Date */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wide block flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Prod. Date</span>
              </span>
              <div className="mt-1">
                <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                  {item.productionDate ? formatDate(item.productionDate) : 'Not specified'}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {item.productionDate ? 'Batch Date' : 'No date set'}
                </span>
              </div>
            </div>

            {/* First Added */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wide block flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                <span>Date Added</span>
              </span>
              <div className="mt-1">
                <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                  {formatDate(item.createdAt || item.updatedAt)}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Initial Entry
                </span>
              </div>
            </div>
          </div>

          {/* Optional Notes Section */}
          <div className="p-3.5 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Notes & Remarks</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(item);
                }}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
              >
                {item.notes ? 'Edit Notes' : '+ Add Notes'}
              </button>
            </div>
            {item.notes ? (
              <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed pt-0.5">
                {item.notes}
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic pt-0.5">
                No notes or remarks provided for this item yet.
              </p>
            )}
          </div>

          {/* Complete Item History & Audit Trail */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <History className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
                  Complete Item Trail & History
                </h4>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                {trail.length} {trail.length === 1 ? 'event' : 'events'}
              </span>
            </div>

            {/* Timeline Stream */}
            <div className="relative pl-6 space-y-4 border-l-2 border-slate-200/90 ml-3 py-1">
              {trail.map((entry, idx) => {
                const isCreate = entry.action === 'created';
                const isQty = entry.action === 'quantity_changed';
                const isEdit = entry.action === 'edited';
                const isDel = entry.action === 'deleted';
                const isRestored = entry.action === 'restored';

                const delta = entry.delta;

                return (
                  <div key={entry.id || idx} className="relative group">
                    {/* Timeline Node Icon */}
                    <div
                      className={`absolute -left-[31px] top-0.5 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-2xs ${
                        isCreate
                          ? 'bg-emerald-500 text-white'
                          : isDel
                          ? 'bg-rose-500 text-white'
                          : isRestored
                          ? 'bg-emerald-600 text-white'
                          : delta && delta > 0
                          ? 'bg-emerald-500 text-white'
                          : delta && delta < 0
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-400 text-white'
                      }`}
                    >
                      {isCreate ? (
                        <Plus className="w-3 h-3" />
                      ) : isDel ? (
                        <X className="w-3 h-3" />
                      ) : delta && delta > 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : delta && delta < 0 ? (
                        <ArrowDownRight className="w-3 h-3" />
                      ) : (
                        <Edit2 className="w-3 h-3" />
                      )}
                    </div>

                    {/* Timeline Card */}
                    <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          {entry.summary}
                        </span>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                          {formatDateTime(entry.timestamp)}
                        </span>
                      </div>

                      {entry.details && (
                        <p className="text-xs text-slate-600 mt-1 leading-normal">
                          {entry.details}
                        </p>
                      )}

                      {/* Quantity change pill */}
                      {entry.previousQuantity !== undefined &&
                        entry.newQuantity !== undefined && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                              Stock: {entry.previousQuantity} → {entry.newQuantity} {item.unit}
                            </span>
                            {delta !== undefined && delta !== 0 && (
                              <span
                                className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                                  delta > 0
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {delta > 0 ? `+${delta}` : delta} {item.unit}
                              </span>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer with Quick Adjustments & Edit */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Quick Adjustment buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1 hidden sm:inline">
              Adjust Stock:
            </span>
            <button
              type="button"
              onClick={() => onQuickQuantityChange(item, -1)}
              disabled={item.quantity <= 0}
              className="min-h-[38px] px-3 inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 active:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              title="Decrease quantity by 1"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>-1 {item.unit}</span>
            </button>
            <button
              type="button"
              onClick={() => onQuickQuantityChange(item, 1)}
              className="min-h-[38px] px-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-xl hover:bg-emerald-100 active:bg-emerald-200 cursor-pointer"
              title="Increase quantity by 1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+1 {item.unit}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(item);
              }}
              className="min-h-[38px] px-4 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 active:bg-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Edit Details</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

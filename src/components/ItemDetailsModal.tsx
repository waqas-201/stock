import React, { useState, useMemo } from 'react';
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
  ArrowUpRight,
  ArrowDownRight,
  User,
  ShieldCheck,
  Download,
  Copy,
  Check,
  Search,
  ArrowUpDown,
  Sparkles,
  ClipboardCheck,
  TrendingUp,
  BarChart3,
  Printer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { StockItem, ItemAuditEntry, StockTag, StockLabel } from '../types';
import { GlobalAuditRecord, deduplicateAuditLogs } from '../lib/stockStorage';
import { getTagStyle } from '../lib/tagUtils';
import { ItemActivityVisualizer } from './ItemActivityVisualizer';
import {
  formatLocalDate,
  formatLocalDateTime,
  formatCalendarRelativeTime,
  formatAuditTrailElapsedTime,
  getTodayDateString,
  useActiveTimezone,
} from '../lib/dateUtils';

interface ItemDetailsModalProps {
  isOpen: boolean;
  item: StockItem | null;
  onClose: () => void;
  onEdit: (item: StockItem) => void;
  onReceiveStock?: (item: StockItem) => void;
  onOpenDispatchOrder?: (item: StockItem) => void;
  onSelectTag?: (tag: string) => void;
  managedTags?: StockTag[];
  managedLabels?: StockLabel[];
  globalLogs?: GlobalAuditRecord[];
  onAddAuditNote?: (
    item: StockItem,
    note: string,
    noteType?: 'count_verification' | 'quality_check' | 'location_audit' | 'general',
    verifiedCount?: number
  ) => void;
}

type TrailFilterType = 'all' | 'inbound' | 'outbound' | 'edits' | 'notes';
type ModalTab = 'trail' | 'specs';

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  isOpen,
  item,
  onClose,
  onEdit,
  onReceiveStock,
  onOpenDispatchOrder,
  onSelectTag,
  managedTags,
  managedLabels = [],
  globalLogs = [],
  onAddAuditNote,
}) => {
  const effectiveTags: StockTag[] = managedTags || (managedLabels as unknown as StockTag[]) || [];

  // Modal active tab: 'trail' or 'specs'
  const [activeTab, setActiveTab] = useState<ModalTab>('trail');

  // Trail interactive controls
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<TrailFilterType>('all');
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // desc = newest first
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Direct audit logging form state
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [auditNoteType, setAuditNoteType] = useState<
    'count_verification' | 'quality_check' | 'location_audit' | 'general'
  >('count_verification');
  const [auditNoteText, setAuditNoteText] = useState('');
  const [verifiedCountInput, setVerifiedCountInput] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Copy feedback state
  const [copiedTrail, setCopiedTrail] = useState(false);

  const { timezone } = useActiveTimezone();

  // Date formatting helpers
  const formatDate = (dateStr?: string) => {
    return formatLocalDate(dateStr, timezone);
  };

  const formatDateTime = (dateStr?: string) => {
    return formatLocalDateTime(dateStr, timezone, true);
  };

  const formatRelativeTime = (dateStr?: string) => {
    return formatAuditTrailElapsedTime(dateStr);
  };

  // 1. Comprehensive Trail Synthesis & Deduplication
  const { comprehensiveTrail, lifetimeStats } = useMemo(() => {
    if (!item) {
      return {
        comprehensiveTrail: [] as ItemAuditEntry[],
        lifetimeStats: {
          totalEvents: 0,
          totalInboundUnits: 0,
          inboundCount: 0,
          totalOutboundUnits: 0,
          outboundCount: 0,
          netMovement: 0,
          distinctOperators: [] as string[],
          peakStock: 0,
          minStock: 0,
          firstActivityDate: '',
          activeDays: 0,
        },
      };
    }

    // Merge internal item trail with relevant global audit logs for this item
    const rawGlobalForThisItem: GlobalAuditRecord[] = (globalLogs || []).filter(
      (l) => l.itemId === item.id || (l.itemName && l.itemName === item.itemName)
    );

    const itemTrailAsGlobal: GlobalAuditRecord[] = (item.auditTrail || []).map((e) => ({
      ...e,
      itemId: item.id,
      itemName: item.itemName,
      unit: item.unit,
      performedBy: e.performedBy || item.lastModifiedByName || item.createdByName || 'Store Operator',
      userEmail: e.userEmail || item.lastModifiedByEmail || item.createdByEmail,
    }));

    const rawEntries: ItemAuditEntry[] = deduplicateAuditLogs([
      ...itemTrailAsGlobal,
      ...rawGlobalForThisItem,
    ]);

    // Ensure genesis creation record exists
    const hasCreation = rawEntries.some((e) => e.action === 'created');
    if (!hasCreation) {
      rawEntries.push({
        id: `synth_created_${item.id}`,
        action: 'created',
        timestamp: item.createdAt || item.updatedAt || new Date().toISOString(),
        summary: 'Item added to inventory',
        details: `Initial stock level: ${item.quantity} ${item.unit}, alert limit ≤ ${item.lowStockThreshold ?? 5}`,
        newQuantity: item.quantity,
        performedBy: item.createdByName || 'Staff Member',
        userEmail: item.createdByEmail,
        balanceAfter: item.quantity,
      });
    }

    // Sort chronologically ascending (oldest first) to compute true running balances
    rawEntries.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Compute continuous running balance, deltas, and lifetime stats
    let runningBalance = 0;
    let totalInbound = 0;
    let inboundCount = 0;
    let totalOutbound = 0;
    let outboundCount = 0;
    let peakStock = 0;
    let minStock = Infinity;
    const operatorSet = new Set<string>();

    const processedTrail: ItemAuditEntry[] = rawEntries.map((entry, index) => {
      if (entry.performedBy) {
        operatorSet.add(entry.performedBy);
      }

      let delta = entry.delta;
      let computedBalance = entry.balanceAfter;

      if (entry.action === 'created') {
        runningBalance = entry.newQuantity !== undefined ? entry.newQuantity : item.quantity;
        computedBalance = runningBalance;
        delta = runningBalance;
        if (delta > 0) {
          totalInbound += delta;
          inboundCount++;
        }
      } else if (entry.previousQuantity !== undefined && entry.newQuantity !== undefined) {
        delta = entry.newQuantity - entry.previousQuantity;
        runningBalance = entry.newQuantity;
        computedBalance = runningBalance;
        if (delta > 0) {
          totalInbound += delta;
          inboundCount++;
        } else if (delta < 0) {
          totalOutbound += Math.abs(delta);
          outboundCount++;
        }
      } else if (entry.newQuantity !== undefined) {
        const diff = entry.newQuantity - runningBalance;
        delta = diff;
        runningBalance = entry.newQuantity;
        computedBalance = runningBalance;
        if (diff > 0) {
          totalInbound += diff;
          inboundCount++;
        } else if (diff < 0) {
          totalOutbound += Math.abs(diff);
          outboundCount++;
        }
      } else {
        computedBalance = runningBalance;
      }

      peakStock = Math.max(peakStock, computedBalance);
      minStock = Math.min(minStock, computedBalance);

      return {
        ...entry,
        delta,
        balanceAfter: computedBalance,
      };
    });

    // Handle minStock edge case
    if (minStock === Infinity) minStock = 0;

    const firstDateStr = processedTrail[0]?.timestamp || item.createdAt || '';
    let activeDays = 0;
    if (firstDateStr) {
      const firstMs = new Date(firstDateStr).getTime();
      if (!isNaN(firstMs)) {
        activeDays = Math.max(1, Math.ceil((Date.now() - firstMs) / (1000 * 60 * 60 * 24)));
      }
    }

    return {
      comprehensiveTrail: processedTrail,
      lifetimeStats: {
        totalEvents: processedTrail.length,
        totalInboundUnits: totalInbound,
        inboundCount,
        totalOutboundUnits: totalOutbound,
        outboundCount,
        netMovement: totalInbound - totalOutbound,
        distinctOperators: Array.from(operatorSet),
        peakStock,
        minStock,
        firstActivityDate: firstDateStr,
        activeDays,
      },
    };
  }, [item, globalLogs]);

  // Extract unique operators for filter dropdown
  const uniqueOperators = useMemo(() => {
    const s = new Set<string>();
    comprehensiveTrail.forEach((e) => {
      if (e.performedBy && e.performedBy.trim()) {
        s.add(e.performedBy.trim());
      }
    });
    return Array.from(s).sort();
  }, [comprehensiveTrail]);

  // Filtered & Sorted Trail for presentation
  const displayedTrail = useMemo(() => {
    let list = [...comprehensiveTrail];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((e) => {
        return (
          e.summary.toLowerCase().includes(q) ||
          (e.details && e.details.toLowerCase().includes(q)) ||
          (e.performedBy && e.performedBy.toLowerCase().includes(q)) ||
          (e.userEmail && e.userEmail.toLowerCase().includes(q)) ||
          (e.action && e.action.toLowerCase().includes(q))
        );
      });
    }

    // Action category filter
    if (filterAction === 'inbound') {
      list = list.filter((e) => (e.delta && e.delta > 0) || e.action === 'created');
    } else if (filterAction === 'outbound') {
      list = list.filter((e) => e.delta && e.delta < 0);
    } else if (filterAction === 'edits') {
      list = list.filter((e) => e.action === 'edited');
    } else if (filterAction === 'notes') {
      list = list.filter((e) => e.action === 'audit_note' || e.noteType);
    }

    // Operator filter
    if (selectedOperator !== 'all') {
      list = list.filter((e) => e.performedBy === selectedOperator);
    }

    // Sort order
    list.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [comprehensiveTrail, searchQuery, filterAction, selectedOperator, sortOrder]);

  if (!isOpen || !item) return null;

  const threshold = item.lowStockThreshold ?? 5;
  const isOutOfStock = item.quantity <= 0;
  const isLowStock = !isOutOfStock && item.quantity <= threshold;

  // Handle Export CSV
  const handleExportCSV = () => {
    if (!item || comprehensiveTrail.length === 0) return;

    const headers = [
      'Sequence',
      'Date',
      'Time',
      'Action Type',
      'Summary',
      'Change (Delta)',
      'Balance After',
      'Unit',
      'Performed By',
      'Staff Email',
      'Details / Remarks',
    ];

    const rows = comprehensiveTrail.map((e, idx) => {
      const d = new Date(e.timestamp);
      const dateStr = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
      const timeStr = !isNaN(d.getTime()) ? d.toTimeString().split(' ')[0] : '';
      const deltaStr =
        e.delta !== undefined ? (e.delta > 0 ? `+${e.delta}` : `${e.delta}`) : '0';

      return [
        idx + 1,
        dateStr,
        timeStr,
        e.action,
        `"${(e.summary || '').replace(/"/g, '""')}"`,
        deltaStr,
        e.balanceAfter !== undefined ? e.balanceAfter : item.quantity,
        item.unit,
        `"${(e.performedBy || '').replace(/"/g, '""')}"`,
        e.userEmail || '',
        `"${(e.details || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${item.itemName.replace(/[^a-z0-9_-]/gi, '_')}_Audit_Trail_${
        getTodayDateString(timezone)
      }.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle Copy Report to Clipboard
  const handleCopyReport = () => {
    if (!item) return;

    const lines = [
      `====================================================`,
      `PRODUCT AUDIT TRAIL REPORT: ${item.itemName.toUpperCase()}`,
      `Generated: ${formatLocalDateTime(new Date(), timezone, true)}`,
      `Current Balance: ${item.quantity} ${item.unit} | Alert Threshold: ≤ ${threshold}`,
      `Total Recorded Events: ${lifetimeStats.totalEvents}`,
      `Lifetime Inbound: +${lifetimeStats.totalInboundUnits} ${item.unit} (${lifetimeStats.inboundCount} events)`,
      `Lifetime Outbound: -${lifetimeStats.totalOutboundUnits} ${item.unit} (${lifetimeStats.outboundCount} events)`,
      `Contributing Staff: ${lifetimeStats.distinctOperators.join(', ') || 'Staff Member'}`,
      `====================================================`,
      `TRANSACTION LEDGER:`,
      ...comprehensiveTrail.map((e, idx) => {
        const delta =
          e.delta !== undefined ? (e.delta > 0 ? `+${e.delta}` : `${e.delta}`) : '';
        return `[#${idx + 1}] ${formatDateTime(e.timestamp)} | ${e.summary} | Delta: ${
          delta || '0'
        } ${item.unit} | Balance: ${e.balanceAfter ?? item.quantity} ${item.unit} | By: ${
          e.performedBy
        }${e.details ? `\n    Details: ${e.details}` : ''}`;
      }),
      `====================================================`,
    ];

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopiedTrail(true);
      setTimeout(() => setCopiedTrail(false), 2000);
    });
  };

  // Submit new audit note
  const handleSubmitAuditNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !onAddAuditNote) return;

    const text = auditNoteText.trim();
    if (!text) return;

    let verifiedCount: number | undefined = undefined;
    if (auditNoteType === 'count_verification' && verifiedCountInput.trim() !== '') {
      const parsed = parseInt(verifiedCountInput, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        verifiedCount = parsed;
      }
    }

    setIsSubmittingNote(true);
    try {
      onAddAuditNote(
        item,
        text,
        auditNoteType,
        verifiedCount
      );
      setAuditNoteText('');
      setVerifiedCountInput('');
      setIsAddingNote(false);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  return (
    <div
      id="item-details-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="item-details-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-details-title"
        className="relative w-full max-w-3xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 my-auto flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Product Summary & Status */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200/90 bg-slate-50/90 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                  isOutOfStock
                    ? 'bg-rose-100 text-rose-700'
                    : isLowStock
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <Package className="w-6 h-6" />
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
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                  <span>
                    Unit: <strong className="text-slate-700">{item.unit}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Current Balance:{' '}
                    <strong
                      className={`font-mono text-sm ${
                        isOutOfStock
                          ? 'text-rose-600'
                          : isLowStock
                          ? 'text-amber-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {item.quantity} {item.unit}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    ID: <code className="font-mono text-[10px] text-slate-400">{item.id}</code>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200/60">
            <button
              type="button"
              onClick={() => setActiveTab('trail')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'trail'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Comprehensive Product Trail</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'trail'
                    ? 'bg-emerald-800 text-emerald-100'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {comprehensiveTrail.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('specs')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'specs'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Product Specs & Settings</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'trail' ? (
            /* TAB 1: COMPREHENSIVE SINGLE PRODUCT TRAIL */
            <div className="space-y-5">
              {/* 1. Executive Single Product Stats Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wide block flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                    <span>Lifetime Inflow</span>
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-emerald-700">
                      +{lifetimeStats.totalInboundUnits}
                    </span>
                    <span className="text-xs text-emerald-800 font-medium truncate">
                      {item.unit}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
                    {lifetimeStats.inboundCount} inbound {lifetimeStats.inboundCount === 1 ? 'event' : 'events'}
                  </span>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wide block flex items-center gap-1">
                    <ArrowDownRight className="w-3 h-3 text-amber-600" />
                    <span>Lifetime Outflow</span>
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-amber-800">
                      -{lifetimeStats.totalOutboundUnits}
                    </span>
                    <span className="text-xs text-amber-900 font-medium truncate">
                      {item.unit}
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-700 font-medium block mt-0.5">
                    {lifetimeStats.outboundCount} outbound {lifetimeStats.outboundCount === 1 ? 'event' : 'events'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-slate-400" />
                    <span>Peak / Min Level</span>
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-sm font-bold font-mono text-slate-800">
                      {lifetimeStats.peakStock}
                    </span>
                    <span className="text-xs text-slate-400">max /</span>
                    <span className="text-sm font-bold font-mono text-slate-800">
                      {lifetimeStats.minStock}
                    </span>
                    <span className="text-xs text-slate-400">min</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                    Alert limit ≤ {threshold}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-indigo-500" />
                    <span>Audit Traceability</span>
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-slate-900">
                      {lifetimeStats.distinctOperators.length}
                    </span>
                    <span className="text-xs text-slate-500 font-medium truncate">
                      Staff {lifetimeStats.distinctOperators.length === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                    {lifetimeStats.activeDays} days tracked
                  </span>
                </div>
              </div>

              {/* 2. Interactive Product Stock Trajectory & Activity Data Viz */}
              <ItemActivityVisualizer
                item={item}
                trail={comprehensiveTrail}
                selectedEventId={selectedEventId}
                onSelectEvent={(ev) => {
                  setSelectedEventId(ev.id);
                  // Optionally scroll to event card
                  const el = document.getElementById(`trail-event-${ev.id}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }
                }}
              />

              {/* 3. Trail Action Bar: Search, Filters, Log Note, Export */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                  {/* Search within single product trail */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search ${item.itemName} trail (notes, staff, actions)...`}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Right Tools: Sort, Log Note, Export */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {/* Sort Order */}
                    <button
                      type="button"
                      onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                      title={sortOrder === 'desc' ? 'Showing newest first' : 'Showing oldest first'}
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                      <span>{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
                    </button>

                    {/* Export CSV */}
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                      title="Download full audit ledger as CSV"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden sm:inline">CSV</span>
                    </button>

                    {/* Copy Report */}
                    <button
                      type="button"
                      onClick={handleCopyReport}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                      title="Copy formatted trail report to clipboard"
                    >
                      {copiedTrail ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span className="hidden sm:inline">Copy</span>
                        </>
                      )}
                    </button>

                    {/* Print Ledger */}
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                      title="Print physical product ledger sheet"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                    </button>

                    {/* Button to toggle Add Audit Note */}
                    {onAddAuditNote && (
                      <button
                        type="button"
                        onClick={() => setIsAddingNote((prev) => !prev)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isAddingNote
                            ? 'bg-slate-900 text-white'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                        }`}
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>{isAddingNote ? 'Cancel Note' : '+ Log Audit Note'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {(
                    [
                      { id: 'all', label: `All Events (${comprehensiveTrail.length})` },
                      { id: 'inbound', label: `Inbound Restocks (+${lifetimeStats.inboundCount})` },
                      { id: 'outbound', label: `Dispatched & Consumed (-${lifetimeStats.outboundCount})` },
                      { id: 'edits', label: 'Spec Changes' },
                      { id: 'notes', label: 'Auditor Notes' },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFilterAction(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        filterAction === cat.id
                          ? 'bg-slate-800 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}

                  {/* Operator filter if multiple */}
                  {uniqueOperators.length > 1 && (
                    <div className="ml-auto flex items-center gap-1">
                      <span className="text-[11px] text-slate-400 font-medium">By:</span>
                      <select
                        value={selectedOperator}
                        onChange={(e) => setSelectedOperator(e.target.value)}
                        className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-2 py-0.8 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="all">All Staff</option>
                        {uniqueOperators.map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Direct Audit Note / Cycle Count Collapsible Form */}
              {isAddingNote && onAddAuditNote && (
                <form
                  onSubmit={handleSubmitAuditNote}
                  className="p-4 bg-emerald-50/80 border-2 border-emerald-300 rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                        Record Staff Audit Observation or Cycle Count
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-800 font-medium">
                      Will be permanently appended to this product's trail
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Observation Type
                      </label>
                      <select
                        value={auditNoteType}
                        onChange={(e) =>
                          setAuditNoteType(
                            e.target.value as
                              | 'count_verification'
                              | 'quality_check'
                              | 'location_audit'
                              | 'general'
                          )
                        }
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="count_verification">
                          Physical Count Verification / Stock Audit
                        </option>
                        <option value="quality_check">
                          Quality, Packaging & Batch Inspection
                        </option>
                        <option value="location_audit">
                          Storage Rack & Shelf Location Check
                        </option>
                        <option value="general">General Auditor Remark / Observation</option>
                      </select>
                    </div>

                    {auditNoteType === 'count_verification' && (
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Observed Physical Count ({item.unit})
                          <span className="text-[10px] text-slate-500 font-normal block">
                            (Audit record only — stock updates strictly require Inward/Dispatch Challans)
                          </span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={verifiedCountInput}
                          onChange={(e) => setVerifiedCountInput(e.target.value)}
                          placeholder={`Current recorded: ${item.quantity}`}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      <span>Detailed Inspection Notes / Findings</span>
                      <span className="text-rose-600 font-bold ml-1">* (Required to approve)</span>
                    </label>
                    <textarea
                      value={auditNoteText}
                      onChange={(e) => setAuditNoteText(e.target.value)}
                      placeholder="e.g., Physical count performed on Rack B-2. Packaging intact, batch number confirmed. No discrepancies found."
                      rows={2}
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingNote(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingNote || !auditNoteText.trim()}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isSubmittingNote ? 'Saving Entry...' : 'Save to Product Trail'}
                    </button>
                  </div>
                </form>
              )}

              {/* 5. Comprehensive Timeline Ledger Stream */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                  <span>
                    Showing {displayedTrail.length} of {comprehensiveTrail.length} recorded events
                  </span>
                  <span>
                    Current Balance: <strong className="text-slate-800">{item.quantity} {item.unit}</strong>
                  </span>
                </div>

                {/* Differential Color Guide Legend */}
                <div className="px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs shrink-0 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      Visual Guide:
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-[11px] bg-amber-100/90 text-amber-950 border border-amber-300 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      What We Sold (Outbound / Sales)
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-[11px] bg-emerald-100/90 text-emerald-950 border border-emerald-300 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      What We Received (Inbound / Restock)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Exact hours elapsed
                  </span>
                </div>

                {displayedTrail.length === 0 ? (
                  <div className="text-center py-10 px-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">No trail events match your filters</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Try clearing your search query or selecting "All Events"
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterAction('all');
                        setSelectedOperator('all');
                      }}
                      className="mt-3 px-3 py-1 bg-white border border-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-50 text-slate-700 cursor-pointer"
                    >
                      Reset Trail Filters
                    </button>
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-3.5 border-l-2 border-slate-200 ml-3 py-1">
                    {displayedTrail.map((entry, idx) => {
                      const isCreate = entry.action === 'created';
                      const isEdit = entry.action === 'edited';
                      const isDel = entry.action === 'deleted';
                      const isRestored = entry.action === 'restored';
                      const isNote = entry.action === 'audit_note' || !!entry.noteType;
                      const delta = entry.delta;
                      const balance = entry.balanceAfter;
                      const wasLowStock = balance !== undefined && balance <= threshold && balance > 0;
                      const wasDepleted = balance !== undefined && balance <= 0;
                      const summaryLower = (entry.summary || '').toLowerCase();
                      const detailsLower = (entry.details || '').toLowerCase();

                      // What was sold / outbound
                      const isSoldOrOutbound =
                        !isDel &&
                        ((typeof delta === 'number' && delta < 0) ||
                          summaryLower.includes('sale') ||
                          summaryLower.includes('sold') ||
                          summaryLower.includes('outbound') ||
                          summaryLower.includes('dispatch') ||
                          summaryLower.includes('issued') ||
                          summaryLower.includes('deduct') ||
                          detailsLower.includes('sold') ||
                          detailsLower.includes('sale'));

                      // What was received / restocked
                      const isReceivedOrInbound =
                        !isDel &&
                        !isSoldOrOutbound &&
                        (isCreate ||
                          isRestored ||
                          (typeof delta === 'number' && delta > 0) ||
                          summaryLower.includes('inbound') ||
                          summaryLower.includes('received') ||
                          summaryLower.includes('restock') ||
                          summaryLower.includes('added') ||
                          detailsLower.includes('inbound') ||
                          detailsLower.includes('received'));

                      return (
                        <div key={entry.id || idx} className="relative group">
                          {/* Timeline node badge icon */}
                          <div
                            className={`absolute -left-[31px] top-1.5 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-2xs ${
                              isDel
                                ? 'bg-rose-500 text-white'
                                : isSoldOrOutbound
                                ? 'bg-amber-500 text-white'
                                : isReceivedOrInbound
                                ? 'bg-emerald-500 text-white'
                                : isNote
                                ? 'bg-violet-600 text-white'
                                : isEdit
                                ? 'bg-indigo-500 text-white'
                                : 'bg-slate-400 text-white'
                            }`}
                          >
                            {isDel ? (
                              <X className="w-3 h-3" />
                            ) : isSoldOrOutbound ? (
                              <ArrowDownRight className="w-3 h-3" />
                            ) : isReceivedOrInbound ? (
                              isCreate ? <Sparkles className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />
                            ) : isNote ? (
                              <ClipboardCheck className="w-3 h-3" />
                            ) : (
                              <Edit2 className="w-3 h-3" />
                            )}
                          </div>

                          {/* Event Card */}
                          <div
                            id={`trail-event-${entry.id}`}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              selectedEventId === entry.id
                                ? isSoldOrOutbound
                                  ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-500/30 shadow-xs'
                                  : 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/30 shadow-xs'
                                : isSoldOrOutbound
                                ? 'bg-amber-50/70 border-amber-300/80 hover:bg-amber-50/90 hover:border-amber-400 shadow-2xs'
                                : isReceivedOrInbound
                                ? 'bg-emerald-50/60 border-emerald-300/80 hover:bg-emerald-50/80 hover:border-emerald-400 shadow-2xs'
                                : isNote
                                ? 'bg-violet-50/40 border-violet-200/80 hover:border-violet-300 shadow-2xs'
                                : 'bg-white border-slate-200/90 shadow-2xs hover:border-slate-300'
                            }`}
                          >
                            {/* Card Top Row: Summary & Timestamps */}
                            <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs sm:text-sm font-bold leading-tight ${
                                  isSoldOrOutbound ? 'text-amber-950' : isReceivedOrInbound ? 'text-emerald-950' : 'text-slate-900'
                                }`}>
                                  {entry.summary}
                                </span>
                                {selectedEventId === entry.id && (
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-md border border-emerald-300">
                                    Selected on Data Viz
                                  </span>
                                )}

                                {/* Category Badge */}
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                    isDel
                                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                                      : isSoldOrOutbound
                                      ? 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold'
                                      : isReceivedOrInbound
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold'
                                      : isNote
                                      ? 'bg-violet-50 text-violet-800 border-violet-200'
                                      : isEdit
                                      ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                      : 'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {isDel
                                    ? 'REMOVED'
                                    : isSoldOrOutbound
                                    ? summaryLower.includes('sale') || summaryLower.includes('sold')
                                      ? 'SOLD / OUTBOUND'
                                      : 'OUTBOUND DISPATCH'
                                    : isCreate
                                    ? 'GENESIS ENTRY'
                                    : isReceivedOrInbound
                                    ? 'INBOUND RESTOCK'
                                    : isNote
                                    ? 'AUDIT NOTE'
                                    : isEdit
                                    ? 'SPECIFICATION EDIT'
                                    : 'LOG ENTRY'}
                                </span>
                              </div>

                              {/* Relative & Absolute Timestamp */}
                              <div className="text-right shrink-0">
                                <span className={`text-xs font-bold block ${
                                  isSoldOrOutbound ? 'text-amber-950' : isReceivedOrInbound ? 'text-emerald-950' : 'text-slate-700'
                                }`}>
                                  {formatRelativeTime(entry.timestamp)}
                                </span>
                                <span className="text-[10px] text-slate-500 block font-mono">
                                  {formatDateTime(entry.timestamp)}
                                </span>
                              </div>
                            </div>

                            {/* Details text */}
                            {entry.details && (
                              <p className={`text-xs mt-2 p-2.5 rounded-xl border leading-relaxed ${
                                isSoldOrOutbound
                                  ? 'bg-amber-100/50 border-amber-200/80 text-amber-950 font-medium'
                                  : isReceivedOrInbound
                                  ? 'bg-emerald-100/50 border-emerald-200/80 text-emerald-950 font-medium'
                                  : 'bg-slate-50/70 border-slate-100 text-slate-600'
                              }`}>
                                {entry.details}
                              </p>
                            )}

                            {/* Stock Movement & Running Balance Ribbon */}
                            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2 flex-wrap">
                              {/* Stock balance pill */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {balance !== undefined && (
                                  <span className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-white/90 text-slate-800 border border-slate-200 shadow-2xs">
                                    <span>Balance:</span>
                                    <strong className="text-slate-900">{balance}</strong>
                                    <span className="text-[10px] text-slate-500">{item.unit}</span>
                                  </span>
                                )}

                                {delta !== undefined && delta !== 0 && (
                                  <span
                                    className={`inline-flex items-center gap-0.5 text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${
                                      delta > 0
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : 'bg-amber-100 text-amber-900 border-amber-300'
                                    }`}
                                  >
                                    {delta > 0 ? `+${delta}` : delta} {item.unit}
                                  </span>
                                )}

                                {wasDepleted && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                                    Stock Depleted
                                  </span>
                                )}
                                {!wasDepleted && wasLowStock && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                    Under Alert Limit (≤{threshold})
                                  </span>
                                )}
                              </div>

                              {/* Performer badge */}
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span className="text-[10px] text-slate-400 font-medium">By:</span>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-semibold border ${
                                    isSoldOrOutbound
                                      ? 'bg-amber-100/70 text-amber-950 border-amber-200'
                                      : isReceivedOrInbound
                                      ? 'bg-emerald-100/70 text-emerald-950 border-emerald-200'
                                      : 'bg-slate-100 text-slate-800 border-slate-200/80'
                                  }`}
                                >
                                  <User
                                    className={`w-3 h-3 ${
                                      isSoldOrOutbound
                                        ? 'text-amber-700'
                                        : isReceivedOrInbound
                                        ? 'text-emerald-600'
                                        : 'text-slate-500'
                                    }`}
                                  />
                                  <span>{entry.performedBy || 'Staff Member'}</span>
                                </span>
                                {entry.userEmail && (
                                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                                    ({entry.userEmail})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* TAB 2: PRODUCT SPECIFICATIONS & INVENTORY DETAILS */
            <div className="space-y-4">
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
                    <span className="text-[10px] text-slate-400 block">Genesis Entry</span>
                  </div>
                </div>
              </div>

              {/* Collaborative Staff Attribution & Traceability */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                    Staff Attribution & Traceability
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold">
                      {item.createdByName ? item.createdByName.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Created By
                      </span>
                      <span className="font-semibold text-slate-900 truncate block">
                        {item.createdByName || 'Staff Member'}
                      </span>
                      {item.createdByEmail && (
                        <span className="text-[10px] text-slate-500 truncate block">
                          {item.createdByEmail}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold">
                      {item.lastModifiedByName
                        ? item.lastModifiedByName.charAt(0).toUpperCase()
                        : 'S'}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Last Modified By
                      </span>
                      <span className="font-semibold text-slate-900 truncate block">
                        {item.lastModifiedByName || item.createdByName || 'Staff Member'}
                      </span>
                      {item.lastModifiedByEmail && (
                        <span className="text-[10px] text-slate-500 truncate block">
                          {item.lastModifiedByEmail}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Tags Section */}
              <div className="p-3.5 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Product Tags</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEdit(item);
                    }}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                  >
                    {item.tags && item.tags.length > 0 ? 'Edit Tags' : '+ Add Tags'}
                  </button>
                </div>
                {item.tags && item.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {item.tags.map((tag, idx) => {
                      const style = getTagStyle(tag, effectiveTags);
                      return (
                        <button
                          key={`${tag}-${idx}`}
                          type="button"
                          onClick={() => {
                            if (onSelectTag) {
                              onSelectTag(tag);
                              onClose();
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${style.bg} ${style.text} ${style.border} ${style.hover} transition-all cursor-pointer shadow-2xs`}
                          title={`Filter inventory by tag "${tag}"`}
                        >
                          <span>#{tag}</span>
                          {onSelectTag && <span className="text-[10px] opacity-60">↗</span>}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic pt-0.5">
                    No tags assigned to this product yet.
                  </p>
                )}
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
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Audit Protection notice */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium text-slate-600">Audit Enforced:</span>
            <span className="hidden sm:inline text-slate-500">All modifications require approval notes</span>
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {onReceiveStock && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReceiveStock(item);
                }}
                className="min-h-[38px] px-3.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 border border-emerald-300 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Add stock via Inward Delivery Challan"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-800" />
                <span>+ Inward Challan</span>
              </button>
            )}
            {onOpenDispatchOrder && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDispatchOrder(item);
                }}
                disabled={item.quantity <= 0}
                className={`min-h-[38px] px-3.5 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors ${
                  item.quantity <= 0
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : 'text-white bg-slate-900 hover:bg-slate-800 active:bg-black'
                }`}
                title="Dispatch / issue Outward Delivery Challan"
              >
                <span>Dispatch Challan</span>
              </button>
            )}
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

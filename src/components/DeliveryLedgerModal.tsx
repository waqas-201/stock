import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  Calendar,
  Truck,
  Printer,
  FileSpreadsheet,
  Copy,
  Check,
  Building2,
  Users,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Filter,
  Package,
  Plus,
  ArrowRight,
  Clock,
  MapPin,
  Trash2,
} from 'lucide-react';
import { DeliveryChallan, CustomerParty, OperatorProfile } from '../types';
import { loadDeliveryChallans, deleteStoredDeliveryChallan } from '../lib/challanStorage';
import { exportChallanLedgerToExcel, exportDeliveryChallanToExcel } from '../lib/excelExport';
import { formatLocalDate, useActiveTimezone } from '../lib/dateUtils';

interface DeliveryLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  registeredCustomers: CustomerParty[];
  operator?: OperatorProfile;
  initialPartyFilter?: string; // Preselected party name if opened for a specific user
  onOpenDispatchOrder?: (customerName?: string) => void;
  onDeleteChallan?: (challanId: string) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type DatePreset = 'all' | 'today' | '7days' | 'month' | 'custom';

export const DeliveryLedgerModal: React.FC<DeliveryLedgerModalProps> = ({
  isOpen,
  onClose,
  registeredCustomers = [],
  operator,
  initialPartyFilter = '',
  onOpenDispatchOrder,
  onDeleteChallan,
  onShowToast,
}) => {
  const { timezone, timezoneAbbr } = useActiveTimezone();

  // All loaded challans
  const [challans, setChallans] = useState<DeliveryChallan[]>(() => loadDeliveryChallans());

  // Active filter state
  const [selectedParty, setSelectedParty] = useState<string>(initialPartyFilter);
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Challan for viewing detailed slip
  const [activeViewingChallan, setActiveViewingChallan] = useState<DeliveryChallan | null>(null);
  const [expandedChallanIds, setExpandedChallanIds] = useState<Set<string>>(new Set());
  const [copiedChallanId, setCopiedChallanId] = useState<string | null>(null);

  // Sync when modal opens or initialPartyFilter changes
  useEffect(() => {
    if (isOpen) {
      setChallans(loadDeliveryChallans());
      setSelectedParty(initialPartyFilter || '');
      setActiveViewingChallan(null);
    }
  }, [isOpen, initialPartyFilter]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (activeViewingChallan) {
          setActiveViewingChallan(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeViewingChallan, onClose]);

  // Unique party names extracted from existing challans + registered customers
  const partyOptions = useMemo(() => {
    const map = new Map<string, { count: number; totalQty: number }>();

    challans.forEach((c) => {
      const name = (c.customerName || 'Unknown').trim();
      const existing = map.get(name) || { count: 0, totalQty: 0 };
      existing.count += 1;
      existing.totalQty += c.totalQuantity || 0;
      map.set(name, existing);
    });

    registeredCustomers.forEach((p) => {
      const name = p.name.trim();
      if (!map.has(name)) {
        map.set(name, { count: 0, totalQty: 0 });
      }
    });

    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]));
  }, [challans, registeredCustomers]);

  // Filter challans by party, date, and search query
  const filteredChallans = useMemo(() => {
    return challans.filter((c) => {
      // 1. Party Filter
      if (selectedParty && c.customerName?.toLowerCase() !== selectedParty.toLowerCase()) {
        return false;
      }

      // 2. Date Filter
      const cDateStr = c.date || c.createdAt;
      const cDate = new Date(cDateStr);

      if (datePreset === 'today') {
        const today = new Date().toISOString().split('T')[0];
        if (!cDateStr.startsWith(today)) return false;
      } else if (datePreset === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        if (cDate < sevenDaysAgo) return false;
      } else if (datePreset === 'month') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (cDate < thirtyDaysAgo) return false;
      } else if (datePreset === 'custom') {
        if (customStartDate && cDateStr < customStartDate) return false;
        if (customEndDate && cDateStr.split('T')[0] > customEndDate) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = c.challanNumber.toLowerCase().includes(q);
        const matchCust = c.customerName.toLowerCase().includes(q);
        const matchAddr = c.deliveryAddress?.toLowerCase().includes(q);
        const matchVeh = c.vehicleNumber?.toLowerCase().includes(q);
        const matchNotes = c.notes?.toLowerCase().includes(q);
        const matchItem = c.items?.some((it) => it.itemName.toLowerCase().includes(q));

        if (!matchNum && !matchCust && !matchAddr && !matchVeh && !matchNotes && !matchItem) {
          return false;
        }
      }

      return true;
    });
  }, [challans, selectedParty, datePreset, customStartDate, customEndDate, searchQuery]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let totalQty = 0;
    let totalItems = 0;
    const partiesSet = new Set<string>();

    filteredChallans.forEach((c) => {
      totalQty += c.totalQuantity || 0;
      totalItems += c.totalItems || c.items?.length || 0;
      if (c.customerName) partiesSet.add(c.customerName.trim());
    });

    return {
      challanCount: filteredChallans.length,
      totalQty,
      totalItems,
      partyCount: partiesSet.size,
    };
  }, [filteredChallans]);

  // Toggle item row expand
  const toggleExpand = (id: string) => {
    setExpandedChallanIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Copy plain text summary of a challan
  const handleCopyChallanText = (c: DeliveryChallan) => {
    const itemsList = (c.items || [])
      .map((it, idx) => `  ${idx + 1}. ${it.itemName}: ${it.dispatchedQty} ${it.unit}`)
      .join('\n');

    const text = `🚚 DELIVERY CHALLAN #${c.challanNumber}
Date: ${c.date ? formatLocalDate(c.date, timezone) : ''}
Customer: ${c.customerName}
${c.deliveryAddress ? `Destination: ${c.deliveryAddress}\n` : ''}${c.vehicleNumber ? `Vehicle: ${c.vehicleNumber}\n` : ''}${c.notes ? `Notes: ${c.notes}\n` : ''}
Items (${c.totalItems || c.items.length}):
${itemsList}

Total Quantity: ${c.totalQuantity} units
Dispatched by: ${c.dispatchedByName || 'Warehouse Staff'}`;

    navigator.clipboard.writeText(text);
    setCopiedChallanId(c.id);
    setTimeout(() => setCopiedChallanId(null), 2000);
    onShowToast(`Challan #${c.challanNumber} copied to clipboard!`, 'info');
  };

  // Export filtered ledger to Excel
  const handleExportLedgerExcel = () => {
    if (filteredChallans.length === 0) {
      onShowToast('No delivery challans to export for this filter', 'info');
      return;
    }
    const label = selectedParty ? `Customer: ${selectedParty}` : 'All Customers';
    exportChallanLedgerToExcel(filteredChallans, selectedParty || undefined, label);
    onShowToast(`Exported ${filteredChallans.length} delivery challans to Excel`, 'success');
  };

  // Delete challan
  const handleDeleteChallan = (c: DeliveryChallan) => {
    deleteStoredDeliveryChallan(c.id);
    setChallans(loadDeliveryChallans());
    if (onDeleteChallan) {
      onDeleteChallan(c.id);
    }
    onShowToast(`Challan #${c.challanNumber} removed from ledger`, 'info');
  };

  if (!isOpen) return null;

  return (
    <div
      id="delivery-ledger-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200 select-none print:p-0 print:bg-white"
    >
      <div
        id="delivery-ledger-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Delivery Challans Ledger"
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 print:border-none print:shadow-none print:max-h-none print:w-full"
      >
        {/* Top Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Customer Ledger & Delivery Challans
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-md">
                  Voucher History
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Track historical dispatches, view party statements, re-print vouchers, and audit delivered items
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDispatchOrder && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDispatchOrder(selectedParty || undefined);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Dispatch</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Close ledger (Escape)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Ribbon */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0 print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* 1. Customer / Party Filter */}
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Party / Customer Scope</span>
              </label>
              <div className="relative">
                <select
                  value={selectedParty}
                  onChange={(e) => setSelectedParty(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer appearance-none pr-8"
                >
                  <option value="">All Parties & Customers ({challans.length} total challans)</option>
                  {partyOptions.map(([name, stats]) => (
                    <option key={name} value={name}>
                      {name} {stats.count > 0 ? `(${stats.count} challans • ${stats.totalQty} units)` : '(No challans yet)'}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* 2. Date Preset Selector */}
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Date Range</span>
              </label>
              <div className="flex items-center bg-white border border-slate-300 rounded-xl p-0.5 shadow-2xs">
                {(['all', 'today', '7days', 'month', 'custom'] as DatePreset[]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDatePreset(preset)}
                    className={`flex-1 py-1 px-1.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer text-center ${
                      datePreset === preset
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {preset === 'all' && 'All'}
                    {preset === 'today' && 'Today'}
                    {preset === '7days' && '7 Days'}
                    {preset === 'month' && '30 Days'}
                    {preset === 'custom' && 'Custom'}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Search Bar */}
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span>Quick Search</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Challan #, product, or site..."
                  className="w-full pl-8 pr-8 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Custom Date Pickers if custom selected */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* KPI Summary Tiles & Ledger Export */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 shadow-2xs">
                {summaryMetrics.challanCount} {summaryMetrics.challanCount === 1 ? 'Challan' : 'Challans'}
              </span>
              <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg font-bold text-emerald-800 shadow-2xs">
                +{summaryMetrics.totalQty} Units Dispatched
              </span>
              <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-600">
                {summaryMetrics.partyCount} {summaryMetrics.partyCount === 1 ? 'Customer' : 'Customers'}
              </span>
              {selectedParty && (
                <span className="px-2 py-0.5 bg-sky-50 text-sky-800 rounded-md font-semibold text-[11px] border border-sky-200">
                  Filtered: {selectedParty}
                  <button
                    type="button"
                    onClick={() => setSelectedParty('')}
                    className="ml-1 text-sky-600 hover:text-sky-900 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportLedgerExcel}
                disabled={filteredChallans.length === 0}
                className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-40"
                title="Export this filtered ledger to an Excel spreadsheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Export Ledger to Excel</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                disabled={filteredChallans.length === 0}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-40"
                title="Print delivery statement"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Print Statement</span>
              </button>
            </div>
          </div>
        </div>

        {/* Challans List / Ledger Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filteredChallans.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 mx-auto flex items-center justify-center mb-2">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No delivery challans found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
                {selectedParty
                  ? `No delivery challans recorded for customer "${selectedParty}" in the selected date range.`
                  : 'No delivery challans have been created yet. Use "Dispatch Order" to deliver stock and issue delivery challans.'}
              </p>
              {onOpenDispatchOrder && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDispatchOrder(selectedParty || undefined);
                  }}
                  className="mt-3.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Issue New Delivery Challan</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredChallans.map((c) => {
                const isExpanded = expandedChallanIds.has(c.id);
                const isCopied = copiedChallanId === c.id;

                return (
                  <div
                    key={c.id}
                    className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    {/* Challan Card Summary Row */}
                    <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleExpand(c.id)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0 mt-0.5 sm:mt-0"
                          title={isExpanded ? 'Collapse items' : 'Expand items'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              {c.challanNumber}
                            </span>
                            <span className="text-sm font-bold text-slate-900 truncate">
                              {c.customerName}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200">
                              {c.totalQuantity} units
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{c.date ? formatLocalDate(c.date, timezone) : ''}</span>
                            </span>
                            {c.deliveryAddress && (
                              <span className="flex items-center gap-1 truncate max-w-xs">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{c.deliveryAddress}</span>
                              </span>
                            )}
                            {c.vehicleNumber && (
                              <span className="flex items-center gap-1">
                                <Truck className="w-3.5 h-3.5 text-slate-400" />
                                <span>{c.vehicleNumber}</span>
                              </span>
                            )}
                            <span>By: <strong>{c.dispatchedByName || 'Staff'}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setActiveViewingChallan(c)}
                          className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          title="View official challan voucher"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Slip</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => exportDeliveryChallanToExcel(c)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Download this challan as Excel"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyChallanText(c)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Copy challan text summary"
                        >
                          {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteChallan(c)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete challan from ledger"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Dispatched Items Table */}
                    {isExpanded && (
                      <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 animate-in fade-in">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Items Dispatched in this Challan ({c.items?.length || 0}):
                        </div>
                        <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
                          {(c.items || []).map((it, idx) => (
                            <div
                              key={idx}
                              className="px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-50"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[10px] text-slate-400 w-5">
                                  #{idx + 1}
                                </span>
                                <span className="font-bold text-slate-900 truncate">
                                  {it.itemName}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 shrink-0 font-medium">
                                <span className="text-slate-500">
                                  Baseline: {it.previousQty !== undefined ? it.previousQty : '-'} {it.unit}
                                </span>
                                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  -{it.dispatchedQty} {it.unit}
                                </span>
                                <span className="text-slate-600">
                                  Left: {it.remainingQty !== undefined ? it.remainingQty : '-'} {it.unit}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {c.notes && (
                          <div className="mt-2 text-xs text-slate-600 italic">
                            Notes / Remarks: "{c.notes}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 shrink-0 print:hidden">
          <div>
            Showing <strong>{filteredChallans.length}</strong> of <strong>{challans.length}</strong> delivery challans recorded
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Close Ledger
            </button>
          </div>
        </div>

        {/* Sub-Modal / Popover: Detailed Printable Challan Slip */}
        {activeViewingChallan && (
          <div
            className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in"
            onClick={() => setActiveViewingChallan(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Slip Toolbar */}
              <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Truck className="w-4 h-4 text-emerald-400" />
                  <span>Delivery Challan #{activeViewingChallan.challanNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => exportDeliveryChallanToExcel(activeViewingChallan)}
                    className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveViewingChallan(null)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Slip Printable Body */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
                <div className="border-b border-slate-200 pb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-slate-900">
                      DELIVERY CHALLAN
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Official Goods Dispatch Voucher & Delivery Note
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-mono font-bold text-slate-900">
                      {activeViewingChallan.challanNumber}
                    </div>
                    <div className="text-xs text-slate-500">
                      Date: {activeViewingChallan.date ? formatLocalDate(activeViewingChallan.date, timezone) : ''}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Customer / Client</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">{activeViewingChallan.customerName}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Delivery Destination</div>
                    <div className="font-semibold text-slate-800 text-sm mt-0.5">{activeViewingChallan.deliveryAddress || 'On-site'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Vehicle / Reference</div>
                    <div className="font-semibold text-slate-800 text-sm mt-0.5">{activeViewingChallan.vehicleNumber || 'N/A'}</div>
                  </div>
                  {activeViewingChallan.notes && (
                    <div className="col-span-2 sm:col-span-3 pt-2 border-t border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Remarks</div>
                      <div className="text-slate-700 mt-0.5">{activeViewingChallan.notes}</div>
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 w-10 text-center">#</th>
                        <th className="px-3 py-2.5">Item Description</th>
                        <th className="px-3 py-2.5 text-center">Unit</th>
                        <th className="px-3 py-2.5 text-right font-bold text-emerald-800">Dispatched Qty</th>
                        <th className="px-3 py-2.5 text-right">Baseline Stock</th>
                        <th className="px-3 py-2.5 text-right">Remaining Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(activeViewingChallan.items || []).map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2.5 font-bold text-slate-900">{it.itemName}</td>
                          <td className="px-3 py-2.5 text-center text-slate-600">{it.unit}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-emerald-700">-{it.dispatchedQty}</td>
                          <td className="px-3 py-2.5 text-right text-slate-500">{it.previousQty !== undefined ? it.previousQty : '-'}</td>
                          <td className="px-3 py-2.5 text-right text-slate-700 font-semibold">{it.remainingQty !== undefined ? it.remainingQty : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={3} className="px-3 py-2.5 text-right text-slate-700">Total Dispatched:</td>
                        <td className="px-3 py-2.5 text-right text-emerald-900 text-sm">-{activeViewingChallan.totalQuantity}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-500">
                  <div>
                    <div className="h-12 border-b border-dashed border-slate-300" />
                    <div className="mt-1 font-semibold text-slate-700">Receiver Signature & Stamp</div>
                  </div>
                  <div>
                    <div className="h-12 border-b border-dashed border-slate-300" />
                    <div className="mt-1 font-semibold text-slate-700">Authorized Dispatcher ({activeViewingChallan.dispatchedByName || 'Staff'})</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

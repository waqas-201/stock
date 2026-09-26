import React, { useState, useMemo, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Calendar,
  Building2,
  FileSpreadsheet,
  Printer,
  Copy,
  Check,
  X,
  ExternalLink,
  ChevronDown,
  Trash2,
  Users,
  Edit2,
  ArrowLeft,
  Filter,
  Phone,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  PackageCheck,
  FileText,
} from 'lucide-react';
import { DeliveryChallan, CustomerParty, OperatorProfile, StockItem, CustomerPartyType, GoodsReceipt } from '../types';
import {
  loadDeliveryChallans,
  saveDeliveryChallan,
  deleteStoredDeliveryChallan,
  generateNextChallanNumber,
} from '../lib/challanStorage';
import { exportChallanLedgerToExcel, exportDeliveryChallanToExcel } from '../lib/excelExport';
import { formatLocalDate, useActiveTimezone } from '../lib/dateUtils';

interface DeliveryChallansViewProps {
  challans: DeliveryChallan[];
  customers: CustomerParty[];
  stockItems: StockItem[];
  operator: OperatorProfile;
  initialPartyFilter?: string;
  initialSubTab?: 'all_challans' | 'single_party_ledger' | 'parties_directory';
  goodsReceipts?: GoodsReceipt[];
  onOpenNewDispatch: (customerName?: string) => void;
  onOpenReceiveStock?: (vendorName?: string) => void;
  onSaveCustomer: (customer: CustomerParty) => void;
  onDeleteCustomer: (id: string) => void;
  onDeleteChallan: (id: string) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onSwitchToInventory: () => void;
}

type ViewSubTab = 'all_challans' | 'single_party_ledger' | 'parties_directory';
type DatePreset = 'all' | 'today' | '7days' | 'month' | 'year' | 'custom';

export const DeliveryChallansView: React.FC<DeliveryChallansViewProps> = ({
  challans,
  customers,
  stockItems,
  operator,
  initialPartyFilter = '',
  initialSubTab,
  goodsReceipts = [],
  onOpenNewDispatch,
  onOpenReceiveStock,
  onSaveCustomer,
  onDeleteCustomer,
  onDeleteChallan,
  onShowToast,
  onSwitchToInventory,
}) => {
  const { timezone } = useActiveTimezone();

  // Active view tab inside Delivery Challans section
  const [subTab, setSubTab] = useState<ViewSubTab>(
    initialSubTab || (initialPartyFilter ? 'single_party_ledger' : 'all_challans')
  );

  // Sync initialSubTab when parent triggers change
  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Single party ledger selected party
  const [selectedPartyName, setSelectedPartyName] = useState<string>(initialPartyFilter);

  // Filters for All Challans table
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [searchPO, setSearchPO] = useState<string>('');
  const [searchParty, setSearchParty] = useState<string>('');
  const [searchVehicle, setSearchVehicle] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Customer Directory Filter & Search
  const [customerSearchKeyword, setCustomerSearchKeyword] = useState<string>('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'all' | 'customer' | 'vendor'>('all');

  // Selected challan for viewing full voucher slip
  const [viewingChallan, setViewingChallan] = useState<DeliveryChallan | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dedicated Customer Add state
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustType, setNewCustType] = useState<CustomerPartyType>('customer');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustCity, setNewCustCity] = useState('');
  const [newCustContactPerson, setNewCustContactPerson] = useState('');
  const [newCustTaxNumber, setNewCustTaxNumber] = useState('');
  const [newCustNotes, setNewCustNotes] = useState('');

  // Editing existing customer state
  const [editingCustomer, setEditingCustomer] = useState<CustomerParty | null>(null);

  // Sync initial party filter if provided
  useEffect(() => {
    if (initialPartyFilter) {
      setSelectedPartyName(initialPartyFilter);
      setSubTab('single_party_ledger');
    }
  }, [initialPartyFilter]);

  // Unique registered customer map
  const customerMap = useMemo(() => {
    const map = new Map<string, CustomerParty>();
    customers.forEach((c) => {
      map.set(c.name.trim().toLowerCase(), c);
    });
    return map;
  }, [customers]);

  // Selected party object for Single Party Ledger
  const currentPartyObj = useMemo(() => {
    if (!selectedPartyName) return null;
    return customerMap.get(selectedPartyName.trim().toLowerCase()) || {
      id: `party-virtual-${selectedPartyName}`,
      name: selectedPartyName,
      partyType: 'customer' as CustomerPartyType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [customerMap, selectedPartyName]);

  // Unique party options with their challan counts
  const partyOptions = useMemo(() => {
    const map = new Map<string, { count: number; totalQty: number }>();

    challans.forEach((c) => {
      const name = (c.customerName || 'Unknown').trim();
      const existing = map.get(name) || { count: 0, totalQty: 0 };
      existing.count += 1;
      existing.totalQty += c.totalQuantity || 0;
      map.set(name, existing);
    });

    customers.forEach((c) => {
      const name = c.name.trim();
      if (!map.has(name)) {
        map.set(name, { count: 0, totalQty: 0 });
      }
    });

    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]));
  }, [challans, customers]);

  // Filtered Challans for "All Delivery Challans" table (matches the reference software in image.png)
  const filteredChallans = useMemo(() => {
    return challans.filter((c) => {
      // 1. Date filter
      const cDateStr = c.date || c.createdAt;
      const cDate = new Date(cDateStr);

      if (datePreset === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        if (!cDateStr.startsWith(todayStr)) return false;
      } else if (datePreset === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        if (cDate < d) return false;
      } else if (datePreset === 'month') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        if (cDate < d) return false;
      } else if (datePreset === 'year') {
        const d = new Date();
        d.setDate(d.getDate() - 365);
        if (cDate < d) return false;
      } else if (datePreset === 'custom') {
        if (filterStartDate && cDateStr < filterStartDate) return false;
        if (filterEndDate && cDateStr.split('T')[0] > filterEndDate) return false;
      }

      // 2. Search by PO
      if (searchPO.trim()) {
        const q = searchPO.trim().toLowerCase();
        const po = (c.poNumber || '').toLowerCase();
        const notes = (c.notes || '').toLowerCase();
        if (!po.includes(q) && !notes.includes(q)) return false;
      }

      // 3. Search by Party / Customer
      if (searchParty.trim()) {
        const q = searchParty.trim().toLowerCase();
        const cust = (c.customerName || '').toLowerCase();
        if (!cust.includes(q)) return false;
      }

      // 4. Search by Vehicle
      if (searchVehicle.trim()) {
        const q = searchVehicle.trim().toLowerCase();
        const veh = (c.vehicleNumber || '').toLowerCase();
        const addr = (c.deliveryAddress || '').toLowerCase();
        if (!veh.includes(q) && !addr.includes(q)) return false;
      }

      // 5. Keyword search (Code, invoice, items, notes)
      if (searchKeyword.trim()) {
        const q = searchKeyword.trim().toLowerCase();
        const matchNum = c.challanNumber.toLowerCase().includes(q);
        const matchInv = (c.invoiceNumber || '').toLowerCase().includes(q);
        const matchCust = (c.customerName || '').toLowerCase().includes(q);
        const matchItems = c.items?.some((it) => it.itemName.toLowerCase().includes(q));
        if (!matchNum && !matchInv && !matchCust && !matchItems) return false;
      }

      return true;
    });
  }, [challans, datePreset, filterStartDate, filterEndDate, searchPO, searchParty, searchVehicle, searchKeyword]);

  // Challans strictly for the selected single party in "Single Party Ledger"
  const singlePartyChallans = useMemo(() => {
    if (!selectedPartyName) return [];
    const clean = selectedPartyName.trim().toLowerCase();
    return challans.filter((c) => (c.customerName || '').trim().toLowerCase() === clean);
  }, [challans, selectedPartyName]);

  // Chronologically sorted with running cumulative dispatched units
  const singlePartyChallansWithRunning = useMemo(() => {
    const list = [...singlePartyChallans].sort((a, b) => {
      const da = a.date || a.createdAt;
      const db = b.date || b.createdAt;
      return da.localeCompare(db);
    });
    let running = 0;
    const withRunning = list.map((c) => {
      running += c.totalQuantity || 0;
      return { ...c, runningTotal: running };
    });
    return withRunning.reverse();
  }, [singlePartyChallans]);

  // Summary metrics for Single Party Ledger
  const partyLedgerStats = useMemo(() => {
    let totalQty = 0;
    let totalItems = 0;
    let firstDate: string | null = null;
    let lastDate: string | null = null;

    singlePartyChallans.forEach((c) => {
      totalQty += c.totalQuantity || 0;
      totalItems += c.totalItems || c.items?.length || 0;
      const d = c.date || c.createdAt;
      if (!firstDate || d < firstDate) firstDate = d;
      if (!lastDate || d > lastDate) lastDate = d;
    });

    return {
      challanCount: singlePartyChallans.length,
      totalQty,
      totalItems,
      firstDate,
      lastDate,
    };
  }, [singlePartyChallans]);

  // Handle Save New Customer
  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCustName.trim();
    if (!cleanName) {
      onShowToast('Please enter customer/party name', 'error');
      return;
    }

    const now = new Date().toISOString();
    const newParty: CustomerParty = {
      id: `party-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      partyType: newCustType,
      phone: newCustPhone.trim() || undefined,
      email: newCustEmail.trim() || undefined,
      address: newCustAddress.trim() || undefined,
      city: newCustCity.trim() || undefined,
      contactPerson: newCustContactPerson.trim() || undefined,
      taxNumber: newCustTaxNumber.trim() || undefined,
      notes: newCustNotes.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    onSaveCustomer(newParty);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustEmail('');
    setNewCustAddress('');
    setNewCustCity('');
    setNewCustContactPerson('');
    setNewCustTaxNumber('');
    setNewCustNotes('');
    setIsAddCustomerOpen(false);
    onShowToast(`Party "${cleanName}" registered successfully!`, 'success');
  };

  // Copy Challan text
  const handleCopyChallan = (c: DeliveryChallan) => {
    const itemsList = (c.items || [])
      .map((it, idx) => `  ${idx + 1}. ${it.itemName}: ${it.dispatchedQty} ${it.unit}`)
      .join('\n');

    const text = `🚚 DELIVERY CHALLAN #${c.challanNumber}
Date: ${c.date ? formatLocalDate(c.date, timezone) : ''}
Customer: ${c.customerName}
${c.poNumber ? `PO #: ${c.poNumber}\n` : ''}${c.invoiceNumber ? `Invoice #: ${c.invoiceNumber}\n` : ''}${c.deliveryAddress ? `Destination: ${c.deliveryAddress}\n` : ''}${c.vehicleNumber ? `Vehicle: ${c.vehicleNumber}\n` : ''}
Items (${c.totalItems || c.items.length}):
${itemsList}

Total Quantity: ${c.totalQuantity} units
Dispatched By: ${c.dispatchedByName || 'Warehouse Staff'}`;

    navigator.clipboard.writeText(text);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
    onShowToast(`Copied Challan #${c.challanNumber} summary`, 'info');
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Screen Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSwitchToInventory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Return to inventory table"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Inventory</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-900">
            Delivery Challans & Customer Ledger
          </span>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center bg-slate-200/80 p-1 rounded-xl gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setSubTab('all_challans')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              subTab === 'all_challans'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Delivery Challans ({challans.length})
          </button>
          <button
            type="button"
            onClick={() => {
              if (!selectedPartyName && partyOptions.length > 0) {
                setSelectedPartyName(partyOptions[0][0]);
              }
              setSubTab('single_party_ledger');
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              subTab === 'single_party_ledger'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Single Party Ledger
          </button>
          <button
            type="button"
            onClick={() => setSubTab('parties_directory')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              subTab === 'parties_directory'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Customer Directory ({customers.length})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: ALL DELIVERY CHALLANS (Exact match to software reference image)    */}
      {/* ========================================================================= */}
      {subTab === 'all_challans' && (
        <div className="space-y-4">
          {/* Main Top Header: Matches image.png "Delivery Challans" + "+ Add New Delivery Challan" */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Delivery Challans
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete historical record of dispatch vouchers and client deliveries
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => exportChallanLedgerToExcel(filteredChallans, undefined, 'All Delivery Challans')}
                disabled={filteredChallans.length === 0}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 disabled:opacity-40"
                title="Export this table to Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export Excel</span>
              </button>

              {onOpenReceiveStock && (
                <button
                  type="button"
                  onClick={() => onOpenReceiveStock()}
                  className="px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 border border-emerald-300 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  title="Receive goods & add stock via Inward Delivery Challan"
                >
                  <Plus className="w-4 h-4 text-emerald-800" />
                  <span>+ Inward Challan (Add Stock)</span>
                </button>
              )}

              {/* Exact reference style button from image.png: solid steel-blue rounded button */}
              <button
                type="button"
                onClick={() => onOpenNewDispatch()}
                className="px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold text-white bg-[#2f6592] hover:bg-[#255276] active:bg-[#1e4260] rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
                title="Create a new delivery challan"
              >
                <Truck className="w-4 h-4" />
                <span>+ Outward Challan (Dispatch)</span>
              </button>
            </div>
          </div>

          {/* Reference Table Container */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                {/* Header row: Light slate-blue background matching screenshot */}
                <thead>
                  <tr className="bg-[#f0f4f8] border-b border-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4 text-center w-28">Code</th>
                    <th className="py-3.5 px-4 w-52">Challan Date</th>
                    <th className="py-3.5 px-4 text-center w-28">PO No</th>
                    <th className="py-3.5 px-4 text-center w-36">Invoice No</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4 w-44">Vehicle / Site</th>
                    <th className="py-3.5 px-4 text-right w-28">Qty</th>
                    <th className="py-3.5 px-4 text-center w-32">Actions</th>
                  </tr>
                </thead>

                {/* Table Body with crisp gridlines */}
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredChallans.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 bg-white">
                        <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-slate-700 text-sm">No delivery challans found</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Try adjusting your search filters or create a new delivery challan.
                        </p>
                        <button
                          type="button"
                          onClick={() => onOpenNewDispatch()}
                          className="mt-3 px-4 py-1.5 text-xs font-bold text-white bg-[#2f6592] hover:bg-[#255276] rounded-lg shadow-xs inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create Challan</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredChallans.map((c) => {
                      const codeDisplay = c.challanNumber.replace(/^DC-/, '');
                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-slate-50/90 transition-colors group"
                        >
                          {/* Code (Bold dark blue, clickable) */}
                          <td className="py-3 px-4 text-center font-mono font-bold text-[#1e4b7a]">
                            <button
                              type="button"
                              onClick={() => setViewingChallan(c)}
                              className="hover:underline cursor-pointer"
                              title="Click to view delivery challan slip"
                            >
                              {codeDisplay}
                            </button>
                          </td>

                          {/* Challan Date (Formatted e.g. Friday, September 25, 2026) */}
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {c.date ? formatLocalDate(c.date, timezone) : 'N/A'}
                          </td>

                          {/* PO No */}
                          <td className="py-3 px-4 text-center font-medium text-slate-600">
                            {c.poNumber || 'N/A'}
                          </td>

                          {/* Invoice No */}
                          <td className="py-3 px-4 text-center font-medium text-slate-700">
                            {c.invoiceNumber || `${codeDisplay}-Non-Tax`}
                          </td>

                          {/* Customer Name: Clickable to jump directly to this party's single ledger! */}
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPartyName(c.customerName);
                                setSubTab('single_party_ledger');
                              }}
                              className="text-left hover:text-[#2f6592] hover:underline cursor-pointer truncate max-w-md block"
                              title={`View complete ledger statement for ${c.customerName}`}
                            >
                              {c.customerName.toUpperCase()}
                            </button>
                          </td>

                          {/* Vehicle / Destination */}
                          <td className="py-3 px-4 text-slate-600 truncate max-w-xs">
                            {c.vehicleNumber || c.deliveryAddress || 'On-site'}
                          </td>

                          {/* Dispatched Qty */}
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            {c.totalQuantity} <span className="text-[10px] text-slate-500 font-normal">units</span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setViewingChallan(c)}
                                className="px-2 py-1 text-[11px] font-bold text-[#2f6592] hover:bg-blue-50 border border-blue-200 rounded-md cursor-pointer transition-colors"
                                title="View slip"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => exportDeliveryChallanToExcel(c)}
                                className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-md cursor-pointer"
                                title="Download Excel"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyChallan(c)}
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md cursor-pointer"
                                title="Copy text"
                              >
                                {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteChallan(c.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                                title="Delete challan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

            {/* Filter Bar (Placed cleanly along the bottom just like the reference software in image.png) */}
            <div className="p-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center gap-2 sm:gap-3">
              {/* 1. Date Range Picker pill */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-full text-xs font-semibold text-slate-700 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                  className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="year">Past Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {datePreset === 'custom' && (
                <div className="flex items-center gap-1 text-xs">
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                  <span>-</span>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              )}

              {/* 2. Search By PO */}
              <div className="relative">
                <input
                  type="text"
                  value={searchPO}
                  onChange={(e) => setSearchPO(e.target.value)}
                  placeholder="Search By PO"
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-full focus:outline-hidden focus:ring-1 focus:ring-[#2f6592] shadow-2xs w-36 sm:w-40"
                />
                {searchPO && (
                  <button
                    type="button"
                    onClick={() => setSearchPO('')}
                    className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* 3. Customer / Party Dropdown with Clear */}
              <div className="relative">
                <select
                  value={searchParty}
                  onChange={(e) => setSearchParty(e.target.value)}
                  className="px-3.5 py-1.5 pr-7 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-full focus:outline-hidden focus:ring-1 focus:ring-[#2f6592] shadow-2xs cursor-pointer appearance-none max-w-[200px]"
                >
                  <option value="">All Customers</option>
                  {partyOptions.map(([name, stats]) => (
                    <option key={name} value={name}>
                      {name} ({stats.count})
                    </option>
                  ))}
                </select>
                {searchParty ? (
                  <button
                    type="button"
                    onClick={() => setSearchParty('')}
                    className="absolute right-2 top-1 text-slate-400 hover:text-slate-700 font-bold text-sm"
                  >
                    ×
                  </button>
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
                )}
              </div>

              {/* 4. Search By Vehicle */}
              <div className="relative">
                <input
                  type="text"
                  value={searchVehicle}
                  onChange={(e) => setSearchVehicle(e.target.value)}
                  placeholder="Search By Vehicle"
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-full focus:outline-hidden focus:ring-1 focus:ring-[#2f6592] shadow-2xs w-36 sm:w-40"
                />
                {searchVehicle && (
                  <button
                    type="button"
                    onClick={() => setSearchVehicle('')}
                    className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* 5. Search By Keyword / Invoice / Item */}
              <div className="relative">
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Search By Invoice / Item"
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-full focus:outline-hidden focus:ring-1 focus:ring-[#2f6592] shadow-2xs w-44 sm:w-48"
                />
                {searchKeyword && (
                  <button
                    type="button"
                    onClick={() => setSearchKeyword('')}
                    className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Reset all filters button */}
              {(datePreset !== 'all' || searchPO || searchParty || searchVehicle || searchKeyword) && (
                <button
                  type="button"
                  onClick={() => {
                    setDatePreset('all');
                    setFilterStartDate('');
                    setFilterEndDate('');
                    setSearchPO('');
                    setSearchParty('');
                    setSearchVehicle('');
                    setSearchKeyword('');
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: SINGLE PARTY LEDGER (User Request: "SINGLE LEDGER OPTION WHERE   */}
      {/* WE CAN SEE ALL DETAILS ABOUT PARTY")                                     */}
      {/* ========================================================================= */}
      {subTab === 'single_party_ledger' && (
        <div className="space-y-5">
          {/* Party Selection & Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#2f6592]" />
                <span>Single Party Statement & Delivery Ledger</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    value={selectedPartyName}
                    onChange={(e) => setSelectedPartyName(e.target.value)}
                    className="text-lg sm:text-xl font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 pr-8 focus:outline-hidden focus:ring-2 focus:ring-[#2f6592] cursor-pointer"
                  >
                    {partyOptions.map(([name, stats]) => (
                      <option key={name} value={name}>
                        {name} ({stats.count} challans)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-3 pointer-events-none" />
                </div>

                <span className="px-2.5 py-1 text-xs font-bold text-[#2f6592] bg-blue-50 border border-blue-200 rounded-lg">
                  {currentPartyObj?.partyType === 'vendor' ? 'Vendor' : 'Customer'}
                </span>
              </div>
            </div>

            {/* Quick Actions for this single customer */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenNewDispatch(selectedPartyName)}
                className="px-3.5 py-2 text-xs font-bold text-white bg-[#2f6592] hover:bg-[#255276] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title={`Create a new delivery challan for ${selectedPartyName}`}
              >
                <Plus className="w-4 h-4" />
                <span>Issue Challan to {selectedPartyName.split(' ')[0]}</span>
              </button>

              {currentPartyObj?.partyType === 'vendor' && onOpenReceiveStock && (
                <button
                  type="button"
                  onClick={() => onOpenReceiveStock(selectedPartyName)}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title={`Receive stock inward from vendor ${selectedPartyName}`}
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Receive from {selectedPartyName.split(' ')[0]}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => exportChallanLedgerToExcel(singlePartyChallans, selectedPartyName, `Party Statement: ${selectedPartyName}`)}
                disabled={singlePartyChallans.length === 0}
                className="px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export Ledger</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                disabled={singlePartyChallans.length === 0}
                className="px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Print Statement</span>
              </button>
            </div>
          </div>

          {/* Party Profile & Metrics Card */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Delivery Challans</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">{partyLedgerStats.challanCount} vouchers</div>
              <div className="text-[11px] text-slate-500">Fulfilled orders</div>
            </div>

            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
              <div className="text-[10px] uppercase font-bold text-blue-700">Total Units Dispatched</div>
              <div className="text-xl font-bold text-[#1e4b7a] mt-0.5">{partyLedgerStats.totalQty} units</div>
              <div className="text-[11px] text-blue-600">{partyLedgerStats.totalItems} distinct line items</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">Delivery Period</div>
              <div className="text-xs font-bold text-slate-800 mt-1 truncate">
                {partyLedgerStats.firstDate ? formatLocalDate(partyLedgerStats.firstDate, timezone) : 'No deliveries'}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                to {partyLedgerStats.lastDate ? formatLocalDate(partyLedgerStats.lastDate, timezone) : 'Present'}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Party Contact Details</div>
                <div className="text-xs font-medium text-slate-700 mt-0.5 truncate">
                  {currentPartyObj?.phone || currentPartyObj?.address || 'No phone/address set'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingCustomer(currentPartyObj);
                }}
                className="text-[11px] font-bold text-[#2f6592] hover:underline flex items-center gap-1 mt-1 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit Party Profile</span>
              </button>
            </div>
          </div>

          {/* Party Chronological Delivery Ledger Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-3 bg-[#f0f4f8] border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                Delivery Challans Statement for {selectedPartyName}
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {singlePartyChallans.length} historical delivery vouchers
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 text-center w-28">Challan #</th>
                    <th className="py-3 px-4 w-44">Date</th>
                    <th className="py-3 px-4 w-28 text-center">PO #</th>
                    <th className="py-3 px-4 w-32 text-center">Invoice #</th>
                    <th className="py-3 px-4">Items Breakdown</th>
                    <th className="py-3 px-4 w-36">Destination</th>
                    <th className="py-3 px-4 text-right w-24">Qty</th>
                    <th className="py-3 px-4 text-right w-28 font-bold text-[#1e4b7a]">Running Balance</th>
                    <th className="py-3 px-4 text-center w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {singlePartyChallansWithRunning.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-500 bg-white">
                        <Truck className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                        <p className="font-bold text-slate-700">No delivery challans recorded for {selectedPartyName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Click below to dispatch stock to this customer.</p>
                        <button
                          type="button"
                          onClick={() => onOpenNewDispatch(selectedPartyName)}
                          className="mt-3 px-4 py-1.5 text-xs font-bold text-white bg-[#2f6592] hover:bg-[#255276] rounded-lg shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Issue First Challan</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    singlePartyChallansWithRunning.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-bold text-[#1e4b7a]">
                          <button
                            type="button"
                            onClick={() => setViewingChallan(c)}
                            className="hover:underline cursor-pointer"
                          >
                            {c.challanNumber.replace(/^DC-/, '')}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {c.date ? formatLocalDate(c.date, timezone) : ''}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-slate-600">
                          {c.poNumber || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-slate-600">
                          {c.invoiceNumber || `${c.challanNumber.replace(/^DC-/, '')}-Non-Tax`}
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {(c.items || []).map((it, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[11px] text-slate-800">
                                <span className="font-semibold truncate max-w-xs">{it.itemName}</span>
                                <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                                  {it.dispatchedQty} {it.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 truncate max-w-xs">
                          {c.deliveryAddress || 'On-site'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {c.totalQuantity} <span className="text-[10px] text-slate-500 font-normal">units</span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#1e4b7a]">
                          {c.runningTotal} <span className="text-[10px] text-slate-500 font-normal">cum.</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingChallan(c)}
                              className="px-2 py-0.5 text-[11px] font-bold text-[#2f6592] hover:bg-blue-50 border border-blue-200 rounded cursor-pointer"
                            >
                              Slip
                            </button>
                            <button
                              type="button"
                              onClick={() => exportDeliveryChallanToExcel(c)}
                              className="p-1 text-slate-500 hover:text-emerald-700 rounded cursor-pointer"
                              title="Excel"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyChallan(c)}
                              className="p-1 text-slate-500 hover:text-slate-800 rounded cursor-pointer"
                              title="Copy"
                            >
                              {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: CUSTOMER DIRECTORY & ADD PARTY                                   */}
      {/* ========================================================================= */}
      {subTab === 'parties_directory' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Parties & Client Directory</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Register customers and vendors, view dispatch statistics, and open customer statements
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddCustomerOpen(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-[#2f6592] hover:bg-[#255276] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Party / Customer</span>
            </button>
          </div>

          {/* Quick Add Party Modal / Form */}
          {isAddCustomerOpen && (
            <div className="bg-white border-2 border-[#2f6592]/40 rounded-2xl p-5 shadow-md animate-in fade-in space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#2f6592]" />
                  <span>Register New Customer / Vendor Party</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCustomerSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Party / Company Name *</label>
                  <input
                    type="text"
                    required
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="e.g. Apex Traders"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2f6592]"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Party Type</label>
                  <select
                    value={newCustType}
                    onChange={(e) => setNewCustType(e.target.value as CustomerPartyType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2f6592] font-semibold"
                  >
                    <option value="customer">Customer (Order Dispatch)</option>
                    <option value="vendor">Vendor (Stock Inward Receipt)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={newCustContactPerson}
                    onChange={(e) => setNewCustContactPerson(e.target.value)}
                    placeholder="e.g. Mr. Tariq (Procurement)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2f6592]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="e.g. +92 300 1234567"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2f6592]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    placeholder="e.g. accounts@party.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2f6592]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Tax ID / NTN / GSTIN</label>
                  <input
                    type="text"
                    value={newCustTaxNumber}
                    onChange={(e) => setNewCustTaxNumber(e.target.value)}
                    placeholder="e.g. 1234567-8"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2f6592]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Delivery Address / Destination</label>
                  <input
                    type="text"
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                    placeholder="e.g. Plot 116 Tipu Sultan Road"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2f6592]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">City / Location</label>
                  <input
                    type="text"
                    value={newCustCity}
                    onChange={(e) => setNewCustCity(e.target.value)}
                    placeholder="e.g. Karachi"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2f6592]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-600 mb-1">Remarks / Notes</label>
                  <input
                    type="text"
                    value={newCustNotes}
                    onChange={(e) => setNewCustNotes(e.target.value)}
                    placeholder="e.g. Regular wholesale buyer, Net 30 terms"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2f6592]"
                  />
                </div>

                <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddCustomerOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-[#2f6592] hover:bg-[#255276] rounded-xl shadow-xs cursor-pointer"
                  >
                    Save Party
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Customer Directory Search & Type Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setCustomerTypeFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  customerTypeFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Parties ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setCustomerTypeFilter('customer')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  customerTypeFilter === 'customer'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Customers ({customers.filter((c) => c.partyType !== 'vendor').length})
              </button>
              <button
                type="button"
                onClick={() => setCustomerTypeFilter('vendor')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  customerTypeFilter === 'vendor'
                    ? 'bg-white text-indigo-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Vendors ({customers.filter((c) => c.partyType === 'vendor').length})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={customerSearchKeyword}
                onChange={(e) => setCustomerSearchKeyword(e.target.value)}
                placeholder="Search by name, phone, city, tax ID..."
                className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-[#2f6592]"
              />
              {customerSearchKeyword && (
                <button
                  type="button"
                  onClick={() => setCustomerSearchKeyword('')}
                  className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Customer Directory Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f0f4f8] border-b border-slate-200 text-slate-800 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Party Name</th>
                    <th className="py-3 px-4 text-center w-28">Type</th>
                    <th className="py-3 px-4 w-44">Contact Info</th>
                    <th className="py-3 px-4 w-52">Address / City</th>
                    <th className="py-3 px-4 text-center w-32">Challans Issued</th>
                    <th className="py-3 px-4 text-right w-32">Total Units</th>
                    <th className="py-3 px-4 text-center w-48">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.filter((c) => {
                    if (customerTypeFilter === 'customer' && c.partyType === 'vendor') return false;
                    if (customerTypeFilter === 'vendor' && c.partyType !== 'vendor') return false;
                    if (customerSearchKeyword.trim()) {
                      const q = customerSearchKeyword.trim().toLowerCase();
                      const matchName = c.name.toLowerCase().includes(q);
                      const matchPhone = (c.phone || '').toLowerCase().includes(q);
                      const matchEmail = (c.email || '').toLowerCase().includes(q);
                      const matchCity = (c.city || '').toLowerCase().includes(q);
                      const matchAddress = (c.address || '').toLowerCase().includes(q);
                      const matchContact = (c.contactPerson || '').toLowerCase().includes(q);
                      const matchTax = (c.taxNumber || '').toLowerCase().includes(q);
                      if (!matchName && !matchPhone && !matchEmail && !matchCity && !matchAddress && !matchContact && !matchTax) return false;
                    }
                    return true;
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No registered parties matched your filter. Click "+ Add New Party" above to create one.
                      </td>
                    </tr>
                  ) : (
                    customers
                      .filter((c) => {
                        if (customerTypeFilter === 'customer' && c.partyType === 'vendor') return false;
                        if (customerTypeFilter === 'vendor' && c.partyType !== 'vendor') return false;
                        if (customerSearchKeyword.trim()) {
                          const q = customerSearchKeyword.trim().toLowerCase();
                          const matchName = c.name.toLowerCase().includes(q);
                          const matchPhone = (c.phone || '').toLowerCase().includes(q);
                          const matchEmail = (c.email || '').toLowerCase().includes(q);
                          const matchCity = (c.city || '').toLowerCase().includes(q);
                          const matchAddress = (c.address || '').toLowerCase().includes(q);
                          const matchContact = (c.contactPerson || '').toLowerCase().includes(q);
                          const matchTax = (c.taxNumber || '').toLowerCase().includes(q);
                          if (!matchName && !matchPhone && !matchEmail && !matchCity && !matchAddress && !matchContact && !matchTax) return false;
                        }
                        return true;
                      })
                      .map((cust) => {
                        const matchedChallans = challans.filter(
                          (c) => (c.customerName || '').trim().toLowerCase() === cust.name.trim().toLowerCase()
                        );
                        const totalQty = matchedChallans.reduce((acc, c) => acc + (c.totalQuantity || 0), 0);

                        return (
                          <tr key={cust.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPartyName(cust.name);
                                  setSubTab('single_party_ledger');
                                }}
                                className="text-left hover:text-[#2f6592] hover:underline cursor-pointer block"
                              >
                                {cust.name}
                              </button>
                              {cust.contactPerson && (
                                <div className="text-[11px] text-slate-500 font-normal">
                                  Attn: {cust.contactPerson}
                                </div>
                              )}
                              {cust.taxNumber && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Tax: {cust.taxNumber}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                                  cust.partyType === 'vendor'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {cust.partyType || 'Customer'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {cust.phone && <div>{cust.phone}</div>}
                              {cust.email && <div className="text-slate-400 text-[11px]">{cust.email}</div>}
                              {!cust.phone && !cust.email && '—'}
                            </td>
                            <td className="py-3 px-4 text-slate-600 truncate max-w-xs">
                              {cust.address ? `${cust.address}${cust.city ? `, ${cust.city}` : ''}` : '—'}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-slate-800">
                              {matchedChallans.length}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-[#1e4b7a]">
                              {totalQty} units
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPartyName(cust.name);
                                    setSubTab('single_party_ledger');
                                  }}
                                  className="px-2.5 py-1 text-xs font-bold text-[#2f6592] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer"
                                  title="View detailed delivery ledger"
                                >
                                  Ledger
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSearchParty(cust.name);
                                    setSubTab('all_challans');
                                  }}
                                  className="px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                                  title="Filter All Challans for this party"
                                >
                                  Challans
                                </button>
                                {cust.partyType === 'vendor' && onOpenReceiveStock ? (
                                  <button
                                    type="button"
                                    onClick={() => onOpenReceiveStock(cust.name)}
                                    className="px-2 py-1 text-xs font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer"
                                    title="Receive stock from vendor"
                                  >
                                    Receive
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => onOpenNewDispatch(cust.name)}
                                    className="px-2 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer"
                                    title="Issue new challan"
                                  >
                                    Dispatch
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setEditingCustomer(cust)}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                                  title="Edit party profile"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteCustomer(cust.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                  title="Delete party"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP / MODAL: VIEW DETAILED PRINTABLE DELIVERY CHALLAN SLIP              */}
      {/* ========================================================================= */}
      {viewingChallan && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in"
          onClick={() => setViewingChallan(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Slip Toolbar */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>Delivery Challan #{viewingChallan.challanNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportDeliveryChallanToExcel(viewingChallan)}
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
                  onClick={() => setViewingChallan(null)}
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
                    {viewingChallan.challanNumber}
                  </div>
                  <div className="text-xs text-slate-500">
                    Date: {viewingChallan.date ? formatLocalDate(viewingChallan.date, timezone) : ''}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Customer</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{viewingChallan.customerName}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">PO #</div>
                  <div className="font-semibold text-slate-800 text-sm mt-0.5">{viewingChallan.poNumber || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Invoice Ref</div>
                  <div className="font-semibold text-slate-800 text-sm mt-0.5">{viewingChallan.invoiceNumber || 'Non-Tax'}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Vehicle / Site</div>
                  <div className="font-semibold text-slate-800 text-sm mt-0.5">{viewingChallan.vehicleNumber || viewingChallan.deliveryAddress || 'On-site'}</div>
                </div>
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
                    {(viewingChallan.items || []).map((it, idx) => (
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
                      <td className="px-3 py-2.5 text-right text-emerald-900 text-sm">-{viewingChallan.totalQuantity}</td>
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
                  <div className="mt-1 font-semibold text-slate-700">Authorized Dispatcher ({viewingChallan.dispatchedByName || 'Staff'})</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editing Customer Modal */}
      {editingCustomer && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in"
          onClick={() => setEditingCustomer(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Edit Customer / Party Details</h3>
              <button type="button" onClick={() => setEditingCustomer(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Party Name</label>
                <input
                  type="text"
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingCustomer.phone || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingCustomer.email || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Address / Site</label>
                <input
                  type="text"
                  value={editingCustomer.address || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Notes</label>
                <input
                  type="text"
                  value={editingCustomer.notes || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onSaveCustomer(editingCustomer);
                  setEditingCustomer(null);
                  onShowToast('Party details updated!', 'success');
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#2f6592] hover:bg-[#255276] rounded-lg shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Search,
  Plus,
  Trash2,
  PackageCheck,
  FileText,
  Printer,
  FileSpreadsheet,
  Copy,
  Check,
  CheckCircle2,
  Package,
  Calendar,
  Building2,
  ArrowRight,
  Sparkles,
  History,
  Users,
} from 'lucide-react';
import { StockItem, OperatorProfile, GoodsReceipt, GoodsReceiptItem, CustomerParty } from '../types';
import {
  generateNextReceiptNumber,
  saveGoodsReceipt,
  loadGoodsReceipts,
  deleteStoredGoodsReceipt,
  extractPastVendorNames,
} from '../lib/receiptStorage';
import { exportGoodsReceiptToExcel } from '../lib/excelExport';
import { formatLocalDate, useActiveTimezone } from '../lib/dateUtils';
import { GlobalAuditRecord } from '../lib/stockStorage';

interface ReceiveStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: StockItem[];
  operator: OperatorProfile;
  globalLogs?: GlobalAuditRecord[];
  initialItem?: StockItem | null;
  initialVendorName?: string;
  registeredCustomers?: CustomerParty[]; // Parties (contains both customers & vendors)
  onOpenCustomerModal?: () => void;
  onQuickRegisterVendor?: (name: string) => void;
  onFulfillReceive: (receipt: GoodsReceipt) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface SelectedReceiveItem {
  item: StockItem;
  quantity: number;
  inputStr: string;
  unitCost?: number;
  notes?: string;
}

export const ReceiveStockModal: React.FC<ReceiveStockModalProps> = ({
  isOpen,
  onClose,
  items = [],
  operator,
  globalLogs = [],
  initialItem = null,
  initialVendorName = '',
  registeredCustomers = [],
  onOpenCustomerModal,
  onQuickRegisterVendor,
  onFulfillReceive,
  onShowToast,
}) => {
  const { timezone, timezoneAbbr } = useActiveTimezone();

  // Tab: 'receive' | 'view_grn' | 'history'
  const [activeTab, setActiveTab] = useState<'receive' | 'view_grn' | 'history'>('receive');

  // Stored Receipts
  const [storedReceipts, setStoredReceipts] = useState<GoodsReceipt[]>(() => loadGoodsReceipts());
  const [activeReceipt, setActiveReceipt] = useState<GoodsReceipt | null>(null);

  // Form Fields
  const [vendorName, setVendorName] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [receiptDate, setReceiptDate] = useState<string>('');
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState<string>('');
  const [receiptNotes, setReceiptNotes] = useState<string>('');
  const [showOptionalDetails, setShowOptionalDetails] = useState<boolean>(false);

  // Items in the receiving basket
  const [basket, setBasket] = useState<SelectedReceiveItem[]>([]);

  // Fast Item Entry Row
  const [entrySelectedItem, setEntrySelectedItem] = useState<StockItem | null>(null);
  const [entryItemQuery, setEntryItemQuery] = useState<string>('');
  const [entryQty, setEntryQty] = useState<string>('10');
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState<boolean>(false);
  const [highlightedItemIndex, setHighlightedItemIndex] = useState<number>(0);

  const entryItemInputRef = useRef<HTMLInputElement>(null);
  const entryQtyInputRef = useRef<HTMLInputElement>(null);
  const entryContainerRef = useRef<HTMLDivElement>(null);
  const vendorContainerRef = useRef<HTMLDivElement>(null);
  const vendorInputRef = useRef<HTMLInputElement>(null);

  // Vendor Name Dropdown
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState<boolean>(false);
  const [highlightedVendorIndex, setHighlightedVendorIndex] = useState<number>(0);

  // Validation / Error state
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // History search
  const [historySearch, setHistorySearch] = useState<string>('');

  // Extract vendors from registered parties (where partyType === 'vendor' or all parties) + past receipts
  const vendorCandidates = useMemo(() => {
    const list: { name: string; isRegisteredVendor: boolean }[] = [];
    const seen = new Set<string>();

    // 1. Registered vendors first
    registeredCustomers
      .filter((p) => p.partyType === 'vendor')
      .forEach((p) => {
        const clean = p.name.trim();
        if (clean && !seen.has(clean.toLowerCase())) {
          seen.add(clean.toLowerCase());
          list.push({ name: clean, isRegisteredVendor: true });
        }
      });

    // 2. Past receipts vendors
    const past = extractPastVendorNames(storedReceipts, globalLogs);
    past.forEach((name) => {
      const clean = name.trim();
      if (clean && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        list.push({ name: clean, isRegisteredVendor: false });
      }
    });

    // 3. Other registered parties (in case registered as general party)
    registeredCustomers.forEach((p) => {
      const clean = p.name.trim();
      if (clean && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        list.push({ name: clean, isRegisteredVendor: false });
      }
    });

    return list;
  }, [registeredCustomers, storedReceipts, globalLogs]);

  // Filtered vendor options based on user typing
  const filteredVendors = useMemo(() => {
    const q = vendorName.trim().toLowerCase();
    if (!q) return vendorCandidates.slice(0, 8);
    return vendorCandidates
      .filter((v) => v.name.toLowerCase().includes(q))
      .slice(0, 10);
  }, [vendorCandidates, vendorName]);

  // Filtered inventory items for fast entry search
  const filteredItemOptions = useMemo(() => {
    const q = entryItemQuery.trim().toLowerCase();
    if (!q) {
      return items.slice(0, 8);
    }
    return items
      .filter((item) => {
        const matchName = item.itemName.toLowerCase().includes(q);
        const matchUnit = item.unit.toLowerCase().includes(q);
        const matchTag = item.tags?.some((t) => t.toLowerCase().includes(q));
        return matchName || matchUnit || matchTag;
      })
      .slice(0, 15);
  }, [items, entryItemQuery]);

  // Sync state when modal opens or initial values change
  useEffect(() => {
    if (isOpen) {
      setStoredReceipts(loadGoodsReceipts());
      const nextNumber = generateNextReceiptNumber(loadGoodsReceipts());
      setReceiptNumber(nextNumber);
      setReceiptDate(new Date().toISOString().split('T')[0]);
      setVendorName(initialVendorName || '');
      setVendorInvoiceNumber('');
      setReceiptNotes('');
      setFormError(null);
      setActiveTab('receive');
      setActiveReceipt(null);
      setCopiedText(false);

      if (initialItem) {
        setBasket([
          {
            item: initialItem,
            quantity: 10,
            inputStr: '10',
          },
        ]);
        setEntrySelectedItem(null);
        setEntryItemQuery('');
        setEntryQty('10');
      } else {
        setBasket([]);
        setEntrySelectedItem(null);
        setEntryItemQuery('');
        setEntryQty('10');
      }

      setTimeout(() => {
        if (initialVendorName) {
          entryItemInputRef.current?.focus();
        } else {
          vendorInputRef.current?.focus();
        }
      }, 80);
    }
  }, [isOpen, initialItem, initialVendorName]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        entryContainerRef.current &&
        !entryContainerRef.current.contains(e.target as Node)
      ) {
        setIsItemDropdownOpen(false);
      }
      if (
        vendorContainerRef.current &&
        !vendorContainerRef.current.contains(e.target as Node)
      ) {
        setIsVendorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut listener inside modal: Ctrl+Enter to confirm receipt
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !isItemDropdownOpen && !isVendorDropdownOpen) {
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && activeTab === 'receive') {
        e.preventDefault();
        handleConfirmReceive();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, isItemDropdownOpen, isVendorDropdownOpen, basket, vendorName, receiptNumber, receiptDate]);

  // Fast entry item picker
  const handlePickEntryItem = (item: StockItem) => {
    setEntrySelectedItem(item);
    setEntryItemQuery(item.itemName);
    setIsItemDropdownOpen(false);
    setTimeout(() => {
      entryQtyInputRef.current?.focus();
      entryQtyInputRef.current?.select();
    }, 40);
  };

  // Add entry item to basket
  const handleAddEntryToBasket = () => {
    if (!entrySelectedItem) {
      if (filteredItemOptions.length > 0) {
        handlePickEntryItem(filteredItemOptions[0]);
      } else {
        onShowToast('Please search and select an item to receive', 'error');
      }
      return;
    }

    const qty = parseInt(entryQty, 10);
    if (isNaN(qty) || qty <= 0) {
      onShowToast('Please enter a valid receiving quantity (> 0)', 'error');
      entryQtyInputRef.current?.focus();
      return;
    }

    // Add or increment in basket
    setBasket((prev) => {
      const existingIdx = prev.findIndex((b) => b.item.id === entrySelectedItem.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        const newTotal = next[existingIdx].quantity + qty;
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: newTotal,
          inputStr: String(newTotal),
        };
        return next;
      }
      return [
        ...prev,
        {
          item: entrySelectedItem,
          quantity: qty,
          inputStr: String(qty),
        },
      ];
    });

    // Reset entry inputs and refocus on search for rapid scanning/entry
    setEntrySelectedItem(null);
    setEntryItemQuery('');
    setEntryQty('10');
    setIsItemDropdownOpen(false);
    setTimeout(() => {
      entryItemInputRef.current?.focus();
    }, 50);
  };

  const handleRemoveFromBasket = (itemId: string) => {
    setBasket((prev) => prev.filter((b) => b.item.id !== itemId));
  };

  const handleUpdateBasketQty = (itemId: string, newQtyStr: string) => {
    setBasket((prev) =>
      prev.map((b) => {
        if (b.item.id === itemId) {
          const parsed = parseInt(newQtyStr, 10);
          return {
            ...b,
            quantity: isNaN(parsed) ? 0 : Math.max(1, parsed),
            inputStr: newQtyStr,
          };
        }
        return b;
      })
    );
  };

  // Total metrics
  const totalItemsCount = basket.length;
  const totalQuantityReceived = basket.reduce((acc, b) => acc + (b.quantity || 0), 0);

  // Submit & Confirm Receive
  const handleConfirmReceive = () => {
    const cleanVendor = vendorName.trim();
    if (!cleanVendor) {
      setFormError('Please enter or select a Vendor name.');
      vendorInputRef.current?.focus();
      return;
    }

    if (basket.length === 0) {
      setFormError('Please add at least one item to the receiving list.');
      entryItemInputRef.current?.focus();
      return;
    }

    // Ensure all items have valid quantities
    for (const b of basket) {
      if (!b.quantity || b.quantity <= 0) {
        setFormError(`Item "${b.item.itemName}" has invalid receiving quantity (${b.quantity}).`);
        return;
      }
    }

    setFormError(null);

    const grnItems: GoodsReceiptItem[] = basket.map((b) => {
      const prevQty = b.item.quantity || 0;
      const recQty = b.quantity;
      return {
        itemId: b.item.id,
        itemName: b.item.itemName,
        unit: b.item.unit,
        receivedQty: recQty,
        previousQty: prevQty,
        newQty: prevQty + recQty,
        tags: b.item.tags,
        notes: b.notes,
      };
    });

    const newReceipt: GoodsReceipt = {
      id: `grn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      receiptNumber: receiptNumber.trim() || generateNextReceiptNumber(storedReceipts),
      vendorName: cleanVendor,
      date: receiptDate || new Date().toISOString().split('T')[0],
      receivedByName: operator.name || 'Warehouse Staff',
      receivedByEmail: operator.email || undefined,
      items: grnItems,
      totalItems: grnItems.length,
      totalQuantity: totalQuantityReceived,
      vendorInvoiceNumber: vendorInvoiceNumber.trim() || undefined,
      notes: receiptNotes.trim() || undefined,
      status: 'received',
      createdAt: new Date().toISOString(),
    };

    // Save locally
    saveGoodsReceipt(newReceipt);
    setStoredReceipts((prev) => [newReceipt, ...prev]);

    // Trigger parent fulfillment (increments inventory stock + logs audit trail + saves Firestore)
    onFulfillReceive(newReceipt);

    // Auto-register vendor if needed
    if (onQuickRegisterVendor) {
      onQuickRegisterVendor(cleanVendor);
    }

    // Show Goods Receipt Note view
    setActiveReceipt(newReceipt);
    setActiveTab('view_grn');
    onShowToast(`Successfully received ${totalQuantityReceived} units from "${cleanVendor}"!`, 'success');
  };

  // Copy GRN plain text summary
  const handleCopySummary = () => {
    if (!activeReceipt) return;
    const itemsText = activeReceipt.items
      .map(
        (it, idx) =>
          `${idx + 1}. ${it.itemName}: +${it.receivedQty} ${it.unit} (New Stock: ${it.newQty} ${it.unit})`
      )
      .join('\n');

    const text = `📦 GOODS RECEIPT NOTE (GRN) #${activeReceipt.receiptNumber}
Date: ${activeReceipt.date}
Vendor: ${activeReceipt.vendorName}
Received By: ${activeReceipt.receivedByName}
${activeReceipt.vendorInvoiceNumber ? `Vendor Bill / PO #: ${activeReceipt.vendorInvoiceNumber}\n` : ''}${activeReceipt.notes ? `Notes: ${activeReceipt.notes}\n` : ''}
--- ITEMS RECEIVED (${activeReceipt.totalItems} items, Total: ${activeReceipt.totalQuantity}) ---
${itemsText}

Status: VERIFIED & TAKEN INTO INVENTORY`;

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
    onShowToast('Goods Receipt summary copied to clipboard', 'info');
  };

  // Print GRN
  const handlePrintReceipt = () => {
    window.print();
  };

  // Export GRN to Excel
  const handleExportExcel = () => {
    if (!activeReceipt) return;
    exportGoodsReceiptToExcel(activeReceipt);
    onShowToast('Downloaded Goods Receipt Excel sheet', 'success');
  };

  // Delete stored receipt from history
  const handleDeletePastReceipt = (receiptId: string) => {
    deleteStoredGoodsReceipt(receiptId);
    setStoredReceipts((prev) => prev.filter((r) => r.id !== receiptId));
    if (activeReceipt?.id === receiptId) {
      setActiveReceipt(null);
      setActiveTab('history');
    }
    onShowToast('Receipt record deleted from history', 'info');
  };

  // Filtered history list
  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return storedReceipts;
    return storedReceipts.filter((r) => {
      const matchNum = r.receiptNumber.toLowerCase().includes(q);
      const matchVendor = r.vendorName.toLowerCase().includes(q);
      const matchItems = r.items.some((it) => it.itemName.toLowerCase().includes(q));
      const matchRef = r.vendorInvoiceNumber?.toLowerCase().includes(q);
      return matchNum || matchVendor || matchItems || matchRef;
    });
  }, [storedReceipts, historySearch]);

  if (!isOpen) return null;

  return (
    <div
      id="receive-stock-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200 print:p-0 print:bg-white"
    >
      <div
        id="receive-stock-dialog"
        role="dialog"
        aria-modal="true"
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 print:border-none print:shadow-none print:max-h-none print:w-full"
      >
        {/* Modal Top Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Receive Stock & Goods Inward
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-md">
                  Inbound (+Qty)
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Receive incoming items from Vendors into inventory with instant stock increment & GRN note
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switches */}
            <div className="hidden sm:flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('receive')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'receive'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Receive Goods
              </button>
              {activeReceipt && (
                <button
                  type="button"
                  onClick={() => setActiveTab('view_grn')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'view_grn'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  GRN Note
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  activeTab === 'history'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>History ({storedReceipts.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Close modal (Escape)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Tab switcher */}
        <div className="sm:hidden flex border-b border-slate-200 bg-slate-100 p-1 print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('receive')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg text-center cursor-pointer ${
              activeTab === 'receive'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Receive Goods
          </button>
          {activeReceipt && (
            <button
              type="button"
              onClick={() => setActiveTab('view_grn')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg text-center cursor-pointer ${
                activeTab === 'view_grn'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              GRN Note
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg text-center cursor-pointer ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            History ({storedReceipts.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center justify-between animate-in fade-in">
              <span>{formError}</span>
              <button
                type="button"
                onClick={() => setFormError(null)}
                className="text-rose-500 hover:text-rose-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TAB 1: RECEIVE GOODS WORKFLOW */}
          {activeTab === 'receive' && (
            <div className="space-y-5">
              {/* Section 1: Vendor Selection & Receipt Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                {/* Vendor / Supplier input with auto-complete */}
                <div className="sm:col-span-6 relative" ref={vendorContainerRef}>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Vendor / Supplier Name *</span>
                    </span>
                    {onOpenCustomerModal && (
                      <button
                        type="button"
                        onClick={onOpenCustomerModal}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Users className="w-3 h-3" />
                        <span>Manage Vendors</span>
                      </button>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      ref={vendorInputRef}
                      type="text"
                      value={vendorName}
                      onChange={(e) => {
                        setVendorName(e.target.value);
                        setIsVendorDropdownOpen(true);
                        setHighlightedVendorIndex(0);
                      }}
                      onFocus={() => setIsVendorDropdownOpen(true)}
                      onKeyDown={(e) => {
                        if (isVendorDropdownOpen && filteredVendors.length > 0) {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setHighlightedVendorIndex((prev) => (prev + 1) % filteredVendors.length);
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setHighlightedVendorIndex((prev) => (prev - 1 + filteredVendors.length) % filteredVendors.length);
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            setVendorName(filteredVendors[highlightedVendorIndex].name);
                            setIsVendorDropdownOpen(false);
                            entryItemInputRef.current?.focus();
                          }
                        }
                      }}
                      placeholder="Type or pick a vendor (e.g. Acme Supplies)..."
                      className="w-full px-3 py-2 text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
                    {vendorName && (
                      <button
                        type="button"
                        onClick={() => {
                          setVendorName('');
                          vendorInputRef.current?.focus();
                        }}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Vendor Dropdown */}
                  {isVendorDropdownOpen && filteredVendors.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto py-1 animate-in fade-in">
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100">
                        Registered Vendors & Suppliers
                      </div>
                      {filteredVendors.map((cand, idx) => (
                        <button
                          key={cand.name}
                          type="button"
                          onClick={() => {
                            setVendorName(cand.name);
                            setIsVendorDropdownOpen(false);
                            entryItemInputRef.current?.focus();
                          }}
                          className={`w-full px-3 py-1.5 text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                            highlightedVendorIndex === idx
                              ? 'bg-indigo-50 text-indigo-950 font-bold'
                              : 'text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">{cand.name}</span>
                          {cand.isRegisteredVendor && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold text-indigo-700 bg-indigo-100 rounded">
                              Vendor Party
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Receipt Number (GRN #) */}
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Receipt (GRN) #
                  </label>
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold text-indigo-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>

                {/* Date */}
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Receipt Date</span>
                  </label>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>

                {/* Collapsible Optional fields (Vendor Invoice / PO #, Notes) */}
                <div className="sm:col-span-12">
                  <button
                    type="button"
                    onClick={() => setShowOptionalDetails((p) => !p)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showOptionalDetails ? 'Hide' : '+ Add'} Vendor Bill / PO # & Remarks</span>
                  </button>

                  {showOptionalDetails && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5 pt-2.5 border-t border-slate-200">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Vendor Bill / PO / Delivery Note #
                        </label>
                        <input
                          type="text"
                          value={vendorInvoiceNumber}
                          onChange={(e) => setVendorInvoiceNumber(e.target.value)}
                          placeholder="e.g. INV-9821 or PO-4401"
                          className="w-full px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Receiving Notes / Remarks
                        </label>
                        <input
                          type="text"
                          value={receiptNotes}
                          onChange={(e) => setReceiptNotes(e.target.value)}
                          placeholder="e.g. Verified packaging, batch #392 in good order"
                          className="w-full px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: FAST ITEM ENTRY ROW */}
              {/* User Request 4 Rule: Minimal, small text with item name (inline unit and available stock), no bulky extra boxes! */}
              <div
                className="bg-white border-2 border-indigo-200/80 p-3.5 rounded-2xl shadow-xs"
                ref={entryContainerRef}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-indigo-600" />
                    <span>Search Item & Enter Quantity to Receive</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Press <kbd className="font-mono bg-slate-100 px-1 py-0.2 rounded border border-slate-200">Enter</kbd> to add to receiving list
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {/* Item Search Input */}
                  <div className="flex-1 relative">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        ref={entryItemInputRef}
                        type="text"
                        value={entryItemQuery}
                        onChange={(e) => {
                          setEntryItemQuery(e.target.value);
                          setEntrySelectedItem(null);
                          setIsItemDropdownOpen(true);
                          setHighlightedItemIndex(0);
                        }}
                        onFocus={() => setIsItemDropdownOpen(true)}
                        onKeyDown={(e) => {
                          if (isItemDropdownOpen && filteredItemOptions.length > 0) {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setHighlightedItemIndex((prev) => (prev + 1) % filteredItemOptions.length);
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setHighlightedItemIndex((prev) => (prev - 1 + filteredItemOptions.length) % filteredItemOptions.length);
                            } else if (e.key === 'Enter') {
                              e.preventDefault();
                              handlePickEntryItem(filteredItemOptions[highlightedItemIndex]);
                            }
                          } else if (e.key === 'Enter' && entrySelectedItem) {
                            e.preventDefault();
                            entryQtyInputRef.current?.focus();
                          }
                        }}
                        placeholder="Search item by name or tag to receive..."
                        className="w-full pl-9 pr-8 py-2 text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      />
                      {entryItemQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setEntryItemQuery('');
                            setEntrySelectedItem(null);
                            entryItemInputRef.current?.focus();
                          }}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Inline metadata indicator if item is chosen: minimal small text */}
                    {entrySelectedItem && (
                      <div className="mt-1 flex items-center gap-2 text-xs text-indigo-900 font-medium">
                        <span>Selected: <strong className="font-bold">{entrySelectedItem.itemName}</strong></span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600">Unit: <strong>{entrySelectedItem.unit}</strong></span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600">Current Stock: <strong>{entrySelectedItem.quantity} {entrySelectedItem.unit}</strong></span>
                      </div>
                    )}

                    {/* Item Dropdown */}
                    {isItemDropdownOpen && filteredItemOptions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto py-1 animate-in fade-in">
                        {filteredItemOptions.map((item, idx) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handlePickEntryItem(item)}
                            className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              highlightedItemIndex === idx
                                ? 'bg-indigo-50 text-indigo-950 font-bold'
                                : 'text-slate-800 hover:bg-slate-50'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-slate-900 truncate block">
                                {item.itemName}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Current Stock: {item.quantity} {item.unit}
                              </span>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                              {item.unit}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quantity to Receive (+Qty) */}
                  <div className="w-full sm:w-36 shrink-0">
                    <div className="relative">
                      <input
                        ref={entryQtyInputRef}
                        type="number"
                        min="1"
                        step="1"
                        value={entryQty}
                        onChange={(e) => setEntryQty(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddEntryToBasket();
                          }
                        }}
                        placeholder="+Qty"
                        className="w-full px-3 py-2 text-sm font-bold text-indigo-950 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-center shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Add Button */}
                  <button
                    type="button"
                    onClick={handleAddEntryToBasket}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              {/* Section 3: RECEIVING BASKET */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Receiving Inward List ({basket.length} {basket.length === 1 ? 'item' : 'items'})
                    </span>
                  </div>
                  <div className="text-xs font-bold text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                    Total Inbound: +{totalQuantityReceived} units
                  </div>
                </div>

                {basket.length === 0 ? (
                  <div className="p-8 text-center bg-white">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center mb-2">
                      <PackageCheck className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">Receiving list is empty</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
                      Select an item and enter the incoming quantity above to add it to this goods receipt.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 bg-white max-h-72 overflow-y-auto">
                    {basket.map((b, idx) => {
                      const prevQty = b.item.quantity || 0;
                      const nextQty = prevQty + (b.quantity || 0);
                      return (
                        <div
                          key={b.item.id}
                          className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-slate-400">
                                #{idx + 1}
                              </span>
                              <span className="text-sm font-bold text-slate-900 truncate">
                                {b.item.itemName}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                              <span>Baseline: <strong className="text-slate-700">{prevQty} {b.item.unit}</strong></span>
                              <span>→</span>
                              <span className="text-emerald-700 font-semibold">
                                New Total: <strong>{nextQty} {b.item.unit}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200">
                              <span className="text-xs font-bold text-indigo-700">+</span>
                              <input
                                type="number"
                                min="1"
                                value={b.inputStr}
                                onChange={(e) => handleUpdateBasketQty(b.item.id, e.target.value)}
                                className="w-16 px-1 py-0.5 text-xs font-bold text-indigo-950 bg-white border border-indigo-200 rounded text-center"
                              />
                              <span className="text-xs font-medium text-indigo-800">{b.item.unit}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveFromBasket(b.item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Remove item from receipt"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GOODS RECEIPT NOTE (GRN) SLIP VIEW */}
          {activeTab === 'view_grn' && activeReceipt && (
            <div className="space-y-4">
              {/* Slip Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200 print:hidden">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Receipt Confirmed & Stock Updated!
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Inventory incremented and logged in audit ledger
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText ? 'Copied' : 'Copy Text'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Export Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Slip</span>
                  </button>
                </div>
              </div>

              {/* Printable Official GRN Document */}
              <div className="bg-white border border-slate-300 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm print:border-none print:p-0">
                {/* Header */}
                <div className="border-b border-slate-200 pb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-slate-900">
                      GOODS RECEIPT NOTE (GRN)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Official Inward Warehouse Stock Receiving Voucher
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-mono font-bold text-indigo-900">
                      {activeReceipt.receiptNumber}
                    </div>
                    <div className="text-xs text-slate-500">
                      Date: {activeReceipt.date ? formatLocalDate(activeReceipt.date, timezone) : ''}
                    </div>
                  </div>
                </div>

                {/* Meta details grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      Vendor / Supplier
                    </div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">
                      {activeReceipt.vendorName}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      Received By
                    </div>
                    <div className="font-semibold text-slate-800 text-sm mt-0.5">
                      {activeReceipt.receivedByName}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      Vendor Ref / Bill #
                    </div>
                    <div className="font-semibold text-slate-800 text-sm mt-0.5">
                      {activeReceipt.vendorInvoiceNumber || 'N/A'}
                    </div>
                  </div>

                  {activeReceipt.notes && (
                    <div className="col-span-2 sm:col-span-3 pt-2 border-t border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400">
                        Receiving Remarks
                      </div>
                      <div className="text-slate-700 mt-0.5">
                        {activeReceipt.notes}
                      </div>
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
                        <th className="px-3 py-2.5 text-right">Received Qty</th>
                        <th className="px-3 py-2.5 text-right">Baseline Stock</th>
                        <th className="px-3 py-2.5 text-right font-bold text-emerald-900">
                          Resulting Stock
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {activeReceipt.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-center font-mono text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2.5 font-bold text-slate-900">
                            {item.itemName}
                          </td>
                          <td className="px-3 py-2.5 text-center text-slate-600">
                            {item.unit}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-indigo-700">
                            +{item.receivedQty}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-500">
                            {item.previousQty}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-emerald-700">
                            {item.newQty}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={3} className="px-3 py-2.5 text-right text-slate-700">
                          Total Received:
                        </td>
                        <td className="px-3 py-2.5 text-right text-indigo-900 text-sm">
                          +{activeReceipt.totalQuantity}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Signatures & Certification */}
                <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-500">
                  <div>
                    <div className="h-12 border-b border-dashed border-slate-300" />
                    <div className="mt-1 font-semibold text-slate-700">
                      Received & Inspected By ({activeReceipt.receivedByName})
                    </div>
                  </div>
                  <div>
                    <div className="h-12 border-b border-dashed border-slate-300" />
                    <div className="mt-1 font-semibold text-slate-700">
                      Authorized Warehouse Incharge
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RECEIPT HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search past receipts by vendor, GRN #, or item..."
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('receive')}
                  className="px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Receipt</span>
                </button>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <PackageCheck className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-700">No goods receipts found</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Past inward receiving vouchers will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  {filteredHistory.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-indigo-900">
                            {rec.receiptNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {rec.vendorName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                          <span>{rec.date ? formatLocalDate(rec.date, timezone) : ''}</span>
                          <span>•</span>
                          <span>{rec.totalItems} {rec.totalItems === 1 ? 'item' : 'items'} (+{rec.totalQuantity} total)</span>
                          <span>•</span>
                          <span>By: {rec.receivedByName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReceipt(rec);
                            setActiveTab('view_grn');
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                        >
                          View Slip
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePastReceipt(rec.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Delete from history"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer (Only in 'receive' tab) */}
        {activeTab === 'receive' && (
          <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 print:hidden">
            <div className="text-xs text-slate-600 text-center sm:text-left">
              {basket.length > 0 ? (
                <span>
                  Ready to receive <strong>{basket.length} items</strong> (+{totalQuantityReceived} units) into stock.
                </span>
              ) : (
                <span>Add incoming items to receive them into inventory.</span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReceive}
                disabled={basket.length === 0}
                className="flex-1 sm:flex-initial px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Confirm & Receive Stock (Ctrl + Enter)"
              >
                <PackageCheck className="w-4 h-4" />
                <span>Confirm & Receive Stock</span>
                <kbd className="hidden md:inline-flex text-[9px] font-mono px-1.5 py-0.2 bg-indigo-700 text-indigo-100 rounded border border-indigo-500">
                  Ctrl+↵
                </kbd>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

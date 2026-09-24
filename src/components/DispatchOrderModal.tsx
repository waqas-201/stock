import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  Truck,
  FileText,
  Printer,
  FileSpreadsheet,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Package,
  History,
  ArrowRight,
  Clock,
  User,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Users,
  Building2,
} from 'lucide-react';
import { StockItem, StockUnit, OperatorProfile, DeliveryChallan, DeliveryChallanItem, CustomerParty } from '../types';
import {
  generateNextChallanNumber,
  extractPastCustomerNames,
  saveDeliveryChallan,
  loadDeliveryChallans,
  deleteStoredDeliveryChallan,
} from '../lib/challanStorage';
import { exportDeliveryChallanToExcel } from '../lib/excelExport';
import { formatLocalDate, useActiveTimezone } from '../lib/dateUtils';
import { GlobalAuditRecord } from '../lib/stockStorage';

interface DispatchOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: StockItem[];
  operator: OperatorProfile;
  globalLogs?: GlobalAuditRecord[];
  initialItem?: StockItem | null;
  initialCustomerName?: string;
  initialDeliveryAddress?: string;
  registeredCustomers?: CustomerParty[];
  onOpenCustomerModal?: () => void;
  onQuickRegisterCustomer?: (name: string, address?: string) => void;
  onFulfillDispatch: (challan: DeliveryChallan) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface SelectedDispatchItem {
  item: StockItem;
  quantity: number;
  inputStr: string;
}

export const DispatchOrderModal: React.FC<DispatchOrderModalProps> = ({
  isOpen,
  onClose,
  items = [],
  operator,
  globalLogs = [],
  initialItem = null,
  initialCustomerName = '',
  initialDeliveryAddress = '',
  registeredCustomers = [],
  onOpenCustomerModal,
  onQuickRegisterCustomer,
  onFulfillDispatch,
  onShowToast,
}) => {
  const { timezone, timezoneAbbr } = useActiveTimezone();

  // Tab: 'create' | 'view_challan' | 'history'
  const [activeTab, setActiveTab] = useState<'create' | 'view_challan' | 'history'>('create');

  // Stored Challans
  const [storedChallans, setStoredChallans] = useState<DeliveryChallan[]>(() => loadDeliveryChallans());
  const [activeChallan, setActiveChallan] = useState<DeliveryChallan | null>(null);

  // Form Fields
  const [customerName, setCustomerName] = useState<string>('');
  const [challanNumber, setChallanNumber] = useState<string>('');
  const [challanDate, setChallanDate] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [showOptionalDetails, setShowOptionalDetails] = useState<boolean>(false);

  // Items in the dispatch basket
  const [basket, setBasket] = useState<SelectedDispatchItem[]>([]);

  // Dedicated Fast Entry Row: Party Name -> Item Name -> Unit (Auto) -> Available Stock -> Qty (Disabled if 0 available) -> + Add Button
  const [entrySelectedItem, setEntrySelectedItem] = useState<StockItem | null>(null);
  const [entryItemQuery, setEntryItemQuery] = useState<string>('');
  const [entryUnit, setEntryUnit] = useState<string>('');
  const [entryQty, setEntryQty] = useState<string>('1');
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState<boolean>(false);
  const [highlightedItemIndex, setHighlightedItemIndex] = useState<number>(0);

  const entryItemInputRef = useRef<HTMLInputElement>(null);
  const entryQtyInputRef = useRef<HTMLInputElement>(null);
  const entryContainerRef = useRef<HTMLDivElement>(null);
  const dropdownListRef = useRef<HTMLDivElement>(null);
  const optionItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Customer Name Dropdown with Arrow Navigation
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState<number>(0);
  const customerContainerRef = useRef<HTMLDivElement>(null);

  // Optional Visual Catalog Browser toggle
  const [showCatalogBrowser, setShowCatalogBrowser] = useState<boolean>(false);

  // Search & Catalog Filter
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');

  // Validation / Error state
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // History search
  const [historySearch, setHistorySearch] = useState<string>('');

  const customerInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Customer mapping and candidates: registered customers + past challan customers
  const registeredCustomerMap = useMemo(() => {
    const map = new Map<string, CustomerParty>();
    registeredCustomers.forEach((c) => {
      if (c && c.name) {
        map.set(c.name.toLowerCase().trim(), c);
      }
    });
    return map;
  }, [registeredCustomers]);

  const allCustomerNames = useMemo(() => {
    const set = new Set<string>();
    // 1. Registered customers first
    registeredCustomers.forEach((c) => {
      if (c.name && c.name.trim()) set.add(c.name.trim());
    });
    // 2. Extracted past customer names from challans and audit logs
    const past = extractPastCustomerNames(storedChallans, globalLogs);
    past.forEach((p) => {
      if (p && p.trim()) set.add(p.trim());
    });

    return Array.from(set).sort((a, b) => {
      const aIsReg = registeredCustomerMap.has(a.toLowerCase());
      const bIsReg = registeredCustomerMap.has(b.toLowerCase());
      if (aIsReg && !bIsReg) return -1;
      if (!aIsReg && bIsReg) return 1;
      return a.localeCompare(b);
    });
  }, [registeredCustomers, storedChallans, globalLogs, registeredCustomerMap]);

  const pastCustomers = allCustomerNames;

  // Unique tags for quick filtering
  const catalogTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach((it) => {
      if (Array.isArray(it.tags)) {
        it.tags.forEach((t) => tags.add(t));
      }
    });
    return Array.from(tags).slice(0, 8);
  }, [items]);

  // Reset or initialize form when opened
  useEffect(() => {
    if (isOpen) {
      const nextNo = generateNextChallanNumber(storedChallans);
      setChallanNumber(nextNo);

      const today = new Date().toISOString().split('T')[0];
      setChallanDate(today);

      setCustomerName(initialCustomerName || '');
      setDeliveryAddress(initialDeliveryAddress || '');
      setVehicleNumber('');
      setOrderNotes('');
      setFormError(null);
      setActiveTab('create');
      setActiveChallan(null);
      setCatalogSearch('');
      setEntrySelectedItem(null);
      setEntryItemQuery('');
      setEntryUnit('');
      setEntryQty('1');
      setIsItemDropdownOpen(false);
      setHighlightedItemIndex(0);
      setIsCustomerDropdownOpen(false);
      setHighlightedCustomerIndex(0);
      setShowCatalogBrowser(false);

      // If opened with a specific initial item, seed the basket with it
      if (initialItem && initialItem.quantity > 0) {
        setBasket([
          {
            item: initialItem,
            quantity: 1,
            inputStr: '1',
          },
        ]);
      } else {
        setBasket([]);
      }

      // Auto-focus the required Customer / Party Name field
      setTimeout(() => {
        customerInputRef.current?.focus();
      }, 80);
    }
  }, [isOpen, initialItem]);

  // Handle outside click to close Item dropdown & Customer dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        entryContainerRef.current &&
        !entryContainerRef.current.contains(e.target as Node)
      ) {
        setIsItemDropdownOpen(false);
      }
      if (
        customerContainerRef.current &&
        !customerContainerRef.current.contains(e.target as Node)
      ) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeTab === 'view_challan') {
          setActiveTab('create');
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, onClose]);

  // Filter catalog items
  const filteredCatalogItems = useMemo(() => {
    return items.filter((it) => {
      // Tag filter
      if (selectedTagFilter !== 'all') {
        if (!it.tags || !it.tags.includes(selectedTagFilter)) return false;
      }

      // Text search
      if (!catalogSearch.trim()) return true;
      const q = catalogSearch.toLowerCase().trim();
      const matchName = it.itemName.toLowerCase().includes(q);
      const matchUnit = (it.unit || '').toLowerCase().includes(q);
      const matchNotes = (it.notes || '').toLowerCase().includes(q);
      const matchTags = Array.isArray(it.tags) && it.tags.some((t) => t.toLowerCase().includes(q));

      return matchName || matchUnit || matchNotes || matchTags;
    });
  }, [items, catalogSearch, selectedTagFilter]);

  // Basket summary calculations
  const totalLineItems = basket.length;
  const totalUnitsDispatched = basket.reduce((acc, curr) => acc + (curr.quantity || 0), 0);

  // Check if any basket item is exceeding stock
  const hasExceedingStock = basket.some((b) => b.quantity > (b.item.quantity || 0));
  const hasZeroQuantity = basket.some((b) => b.quantity <= 0);

  // Basket item helpers
  const handleAddItemToBasket = (item: StockItem) => {
    setFormError(null);
    const existingIndex = basket.findIndex((b) => b.item.id === item.id);
    if (existingIndex >= 0) {
      // Increase quantity by 1 if not exceeding
      const current = basket[existingIndex];
      const maxAvailable = item.quantity || 0;
      const nextQty = Math.min(maxAvailable, current.quantity + 1);
      const nextBasket = [...basket];
      nextBasket[existingIndex] = {
        ...current,
        quantity: nextQty,
        inputStr: String(nextQty),
      };
      setBasket(nextBasket);
    } else {
      if ((item.quantity || 0) <= 0) {
        onShowToast(`"${item.itemName}" has 0 stock and cannot be dispatched.`, 'error');
        return;
      }
      setBasket((prev) => [
        ...prev,
        {
          item,
          quantity: 1,
          inputStr: '1',
        },
      ]);
    }
  };

  const handleUpdateBasketQuantity = (itemId: string, valStr: string) => {
    setFormError(null);
    setBasket((prev) =>
      prev.map((b) => {
        if (b.item.id !== itemId) return b;
        const parsed = parseFloat(valStr);
        const qty = !isNaN(parsed) && parsed > 0 ? parsed : 0;
        return {
          ...b,
          quantity: qty,
          inputStr: valStr,
        };
      })
    );
  };

  const handleAdjustStep = (itemId: string, delta: number) => {
    setFormError(null);
    setBasket((prev) =>
      prev.map((b) => {
        if (b.item.id !== itemId) return b;
        const maxAvailable = b.item.quantity || 0;
        const nextQty = Math.max(1, Math.min(maxAvailable, b.quantity + delta));
        return {
          ...b,
          quantity: nextQty,
          inputStr: String(nextQty),
        };
      })
    );
  };

  const handleSetMaxStock = (itemId: string) => {
    setFormError(null);
    setBasket((prev) =>
      prev.map((b) => {
        if (b.item.id !== itemId) return b;
        const maxAvailable = Math.max(1, b.item.quantity || 0);
        return {
          ...b,
          quantity: maxAvailable,
          inputStr: String(maxAvailable),
        };
      })
    );
  };

  const handleRemoveFromBasket = (itemId: string) => {
    setBasket((prev) => prev.filter((b) => b.item.id !== itemId));
  };

  // Candidates for Item Name entry dropdown (Filtered, in-stock items prioritized)
  const filteredItemCandidates = useMemo(() => {
    const q = entryItemQuery.toLowerCase().trim();
    let pool = items;
    if (q) {
      pool = items.filter(
        (it) =>
          it.itemName.toLowerCase().includes(q) ||
          (it.tags && it.tags.some((t) => t.toLowerCase().includes(q))) ||
          (it.notes && it.notes.toLowerCase().includes(q)) ||
          it.unit.toLowerCase().includes(q)
      );
    }
    return [...pool].sort((a, b) => {
      const aStock = a.quantity || 0;
      const bStock = b.quantity || 0;
      if (aStock > 0 && bStock <= 0) return -1;
      if (aStock <= 0 && bStock > 0) return 1;
      return a.itemName.localeCompare(b.itemName);
    });
  }, [items, entryItemQuery]);

  const scrollHighlightedOptionIntoView = (index: number) => {
    const el = optionItemRefs.current[index];
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  // Picking an item: auto-loads unit, and enables/disables Qty input based on stock
  const handleSelectItem = (item: StockItem) => {
    setEntrySelectedItem(item);
    setEntryItemQuery(item.itemName);
    setEntryUnit(item.unit || ''); // AUTO LOAD UNIT!
    setIsItemDropdownOpen(false);

    const available = item.quantity || 0;
    if (available > 0) {
      setEntryQty('1');
      setTimeout(() => {
        entryQtyInputRef.current?.focus();
        entryQtyInputRef.current?.select();
      }, 50);
    } else {
      setEntryQty('');
      onShowToast(`"${item.itemName}" has 0 stock available (Qty inbox disabled).`, 'error');
    }
  };

  const handleItemInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isItemDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsItemDropdownOpen(true);
        setHighlightedItemIndex(0);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItemCandidates.length > 0) {
          handleSelectItem(filteredItemCandidates[0]);
        } else {
          setIsItemDropdownOpen(true);
        }
        return;
      }
    }

    if (filteredItemCandidates.length === 0) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsItemDropdownOpen(false);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedItemIndex((prev) => {
        const next = prev + 1 >= filteredItemCandidates.length ? 0 : prev + 1;
        scrollHighlightedOptionIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedItemIndex((prev) => {
        const next = prev - 1 < 0 ? filteredItemCandidates.length - 1 : prev - 1;
        scrollHighlightedOptionIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedItemIndex >= 0 && highlightedItemIndex < filteredItemCandidates.length) {
        handleSelectItem(filteredItemCandidates[highlightedItemIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsItemDropdownOpen(false);
    }
  };

  const handleQtyInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEntryToBasket();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      entryItemInputRef.current?.focus();
      entryItemInputRef.current?.select();
    }
  };

  // Add Item to Order Basket
  const handleAddEntryToBasket = () => {
    if (!entrySelectedItem) {
      onShowToast('Please pick an item first.', 'error');
      entryItemInputRef.current?.focus();
      return;
    }

    const available = entrySelectedItem.quantity || 0;
    if (available <= 0) {
      onShowToast(`Cannot dispatch "${entrySelectedItem.itemName}" because stock is 0.`, 'error');
      return;
    }

    const parsedQty = parseFloat(entryQty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      onShowToast('Please enter a valid quantity greater than 0.', 'error');
      entryQtyInputRef.current?.focus();
      return;
    }

    if (parsedQty > available) {
      onShowToast(
        `Cannot dispatch ${parsedQty} ${entrySelectedItem.unit}. Only ${available} available in stock!`,
        'error'
      );
      entryQtyInputRef.current?.focus();
      return;
    }

    // Add or merge into basket
    setBasket((prev) => {
      const idx = prev.findIndex((b) => b.item.id === entrySelectedItem.id);
      if (idx >= 0) {
        const next = [...prev];
        const newQty = Math.min(available, next[idx].quantity + parsedQty);
        next[idx] = {
          ...next[idx],
          quantity: newQty,
          inputStr: String(newQty),
        };
        return next;
      } else {
        return [
          ...prev,
          {
            item: entrySelectedItem,
            quantity: parsedQty,
            inputStr: String(parsedQty),
          },
        ];
      }
    });

    onShowToast(`Added ${parsedQty} ${entrySelectedItem.unit} of "${entrySelectedItem.itemName}" to order!`, 'success');

    // Reset entry row and focus back on ITEM NAME for immediate next item entry!
    setEntrySelectedItem(null);
    setEntryItemQuery('');
    setEntryUnit('');
    setEntryQty('1');
    setIsItemDropdownOpen(false);
    setHighlightedItemIndex(0);

    setTimeout(() => {
      entryItemInputRef.current?.focus();
    }, 60);
  };

  // Customer Name dropdown filtering & arrow keydown
  const filteredCustomerCandidates = useMemo(() => {
    if (!customerName.trim()) return pastCustomers;
    const q = customerName.toLowerCase().trim();
    return pastCustomers.filter((c) => c.toLowerCase().includes(q));
  }, [pastCustomers, customerName]);

  const handleSelectCustomer = (selectedName: string) => {
    setCustomerName(selectedName);
    const reg = registeredCustomerMap.get(selectedName.toLowerCase().trim());
    if (reg && reg.address && !deliveryAddress.trim()) {
      setDeliveryAddress(reg.address);
    }
    setIsCustomerDropdownOpen(false);
    setIsItemDropdownOpen(true);
    setHighlightedItemIndex(0);
    setTimeout(() => entryItemInputRef.current?.focus(), 50);
  };

  const handleCustomerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isCustomerDropdownOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIsCustomerDropdownOpen(true);
        setHighlightedCustomerIndex(0);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (customerName.trim()) {
          handleSelectCustomer(customerName.trim());
        }
        return;
      }
    }

    if (filteredCustomerCandidates.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (customerName.trim()) {
          handleSelectCustomer(customerName.trim());
        }
      } else if (e.key === 'Escape') {
        setIsCustomerDropdownOpen(false);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedCustomerIndex((prev) => {
        const next = prev + 1 >= filteredCustomerCandidates.length ? 0 : prev + 1;
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedCustomerIndex((prev) => {
        const next = prev - 1 < 0 ? filteredCustomerCandidates.length - 1 : prev - 1;
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (
        highlightedCustomerIndex >= 0 &&
        highlightedCustomerIndex < filteredCustomerCandidates.length
      ) {
        handleSelectCustomer(filteredCustomerCandidates[highlightedCustomerIndex]);
      } else if (customerName.trim()) {
        handleSelectCustomer(customerName.trim());
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsCustomerDropdownOpen(false);
    }
  };

  // Submit and create Challan
  const handleFulfillOrder = () => {
    setFormError(null);

    // 1. Validate Customer / Party Name
    const cleanCustomer = customerName.trim();
    if (!cleanCustomer) {
      setFormError('Customer / Party Name is required to approve this dispatch.');
      customerInputRef.current?.focus();
      return;
    }

    // 2. Validate Basket Items
    if (basket.length === 0) {
      setFormError('Please select at least one item from the catalog to dispatch.');
      entryItemInputRef.current?.focus();
      return;
    }

    // 3. Validate Quantities
    for (const b of basket) {
      const available = b.item.quantity || 0;
      if (b.quantity <= 0) {
        setFormError(`Please enter a valid dispatch quantity for "${b.item.itemName}".`);
        return;
      }
      if (b.quantity > available) {
        setFormError(
          `Cannot dispatch ${b.quantity} ${b.item.unit} of "${b.item.itemName}". Only ${available} available in stock!`
        );
        return;
      }
    }

    // 4. Construct Delivery Challan
    const challanItems: DeliveryChallanItem[] = basket.map((b) => {
      const prev = b.item.quantity || 0;
      const dispatched = b.quantity;
      const rem = Math.max(0, prev - dispatched);
      return {
        itemId: b.item.id,
        itemName: b.item.itemName,
        unit: b.item.unit,
        dispatchedQty: dispatched,
        previousQty: prev,
        remainingQty: rem,
        tags: b.item.tags,
      };
    });

    const newChallan: DeliveryChallan = {
      id: 'dc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      challanNumber: challanNumber.trim() || generateNextChallanNumber(storedChallans),
      customerName: cleanCustomer,
      date: challanDate || new Date().toISOString(),
      dispatchedByName: operator.name || 'Store Staff',
      dispatchedByEmail: operator.email || undefined,
      items: challanItems,
      totalItems: challanItems.length,
      totalQuantity: totalUnitsDispatched,
      notes: orderNotes.trim() || undefined,
      deliveryAddress: deliveryAddress.trim() || undefined,
      vehicleNumber: vehicleNumber.trim() || undefined,
      status: 'dispatched',
      createdAt: new Date().toISOString(),
    };

    // Save locally
    saveDeliveryChallan(newChallan);
    setStoredChallans(loadDeliveryChallans());

    // Trigger parent stock reduction & audit logging
    onFulfillDispatch(newChallan);

    // Switch to Challan Document view
    setActiveChallan(newChallan);
    setActiveTab('view_challan');
    onShowToast(`Delivery Challan #${newChallan.challanNumber} issued and stock deducted!`, 'success');
  };

  // Global modal keyboard shortcuts (Alt+A for Fast Item Entry, Ctrl+Enter to fulfill)
  useEffect(() => {
    if (!isOpen || activeTab !== 'create') return;
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Alt + A -> Open Item Entry dropdown & focus input
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'a' || e.key === 'A' || e.code === 'KeyA')) {
        e.preventDefault();
        setIsItemDropdownOpen(true);
        setHighlightedItemIndex(0);
        setTimeout(() => {
          entryItemInputRef.current?.focus();
          entryItemInputRef.current?.select();
        }, 50);
        return;
      }

      // Ctrl + Enter or Cmd + Enter -> Generate Challan & Deduct Stock
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleFulfillOrder();
        return;
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [isOpen, activeTab, basket, customerName, challanNumber, challanDate, orderNotes, deliveryAddress, vehicleNumber]);

  // Copy Challan text for WhatsApp/SMS
  const handleCopyChallanText = (challan: DeliveryChallan) => {
    const lines = [
      `📦 *DELIVERY CHALLAN*`,
      `*Challan #:* ${challan.challanNumber}`,
      `*Date:* ${formatLocalDate(challan.date)}`,
      `*Customer / Party:* ${challan.customerName}`,
      challan.deliveryAddress ? `*Delivery Site:* ${challan.deliveryAddress}` : null,
      challan.vehicleNumber ? `*Vehicle / Ref:* ${challan.vehicleNumber}` : null,
      `*Dispatched By:* ${challan.dispatchedByName}`,
      ``,
      `*Items Dispatched:*`,
      ...challan.items.map((it, idx) => `${idx + 1}. ${it.itemName}: ${it.dispatchedQty} ${it.unit}`),
      ``,
      `*Total Items:* ${challan.totalItems}`,
      `*Total Quantity:* ${challan.totalQuantity}`,
      challan.notes ? `*Notes:* ${challan.notes}` : null,
      `*Status:* Dispatched`,
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
    onShowToast('Delivery Challan copied to clipboard for WhatsApp/SMS sharing!', 'info');
  };

  // Print Challan
  const handlePrintChallan = () => {
    window.print();
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return storedChallans;
    const q = historySearch.toLowerCase().trim();
    return storedChallans.filter(
      (c) =>
        c.challanNumber.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        (c.deliveryAddress && c.deliveryAddress.toLowerCase().includes(q)) ||
        (c.vehicleNumber && c.vehicleNumber.toLowerCase().includes(q))
    );
  }, [storedChallans, historySearch]);

  if (!isOpen) return null;

  return (
    <div
      id="dispatch-order-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispatch-order-title"
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200 w-full flex flex-col overflow-hidden my-auto transition-all ${
          activeTab === 'view_challan'
            ? 'max-w-3xl max-h-[92vh]'
            : 'max-w-5xl max-h-[92vh]'
        }`}
      >
        {/* Modal Top Header (Hidden on Print) */}
        <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-xs">
              <Truck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="dispatch-order-title" className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Multi-Item Dispatch & Delivery Challan
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  Unified View
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Pick items in one place, deduct inventory stock at once, and issue customer delivery challans
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Navigation Tabs */}
            <div className="flex items-center bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/80">
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'create'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Dispatch</span>
                {basket.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white text-emerald-800 font-bold font-mono">
                    {basket.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStoredChallans(loadDeliveryChallans());
                  setActiveTab('history');
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Challan History</span>
                {storedChallans.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-200 font-mono">
                    {storedChallans.length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: NEW DISPATCH & UNIFIED ORDER BUILDER                   */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'create' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Error Banner */}
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-semibold">{formError}</div>
                <button
                  type="button"
                  onClick={() => setFormError(null)}
                  className="text-rose-500 hover:text-rose-700 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Top Card: Customer / Party Name (The REQUIRED BOX) & Challan Meta */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-slate-200 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Customer & Delivery Details</span>
                  </span>
                  <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    * Required Box Enforced
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {onOpenCustomerModal && (
                    <button
                      type="button"
                      onClick={onOpenCustomerModal}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                      title="Open Customer Registry to add, edit or view registered party profiles"
                    >
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Manage Parties</span>
                      <span className="px-1.5 py-0.2 text-[10px] bg-emerald-100 text-emerald-800 rounded-full font-bold">
                        {registeredCustomers.length}
                      </span>
                    </button>
                  )}
                  <div className="text-[11px] text-slate-500 hidden sm:block">
                    Operator: <strong className="text-slate-800">{operator.name}</strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
                {/* REQUIRED Customer / Party Name */}
                <div className="sm:col-span-7">
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="dispatch-customer-name"
                      className="text-xs font-bold text-slate-800 flex items-center gap-1"
                    >
                      <span>Customer / Party Name (Sold To)</span>
                      <span className="text-rose-600 font-extrabold">* (Required)</span>
                    </label>
                    <span className="text-[11px] text-slate-400">Printed on Challan</span>
                  </div>

                  <div className="relative" ref={customerContainerRef}>
                    <input
                      ref={customerInputRef}
                      id="dispatch-customer-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      onFocus={() => {
                        if (pastCustomers.length > 0) setIsCustomerDropdownOpen(true);
                      }}
                      onKeyDown={handleCustomerKeyDown}
                      placeholder="e.g., Apex Wholesale, Metro Retailers, Walk-in..."
                      className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white border-2 border-emerald-600 rounded-xl focus:outline-hidden focus:ring-4 focus:ring-emerald-500/20 shadow-xs placeholder:text-slate-400 placeholder:font-normal"
                      required
                      autoComplete="off"
                    />

                    {/* Arrow-navigable customer dropdown with Registered Party metadata */}
                    {isCustomerDropdownOpen && filteredCustomerCandidates.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
                        <div className="px-3 py-1.5 bg-slate-100 text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-emerald-600" />
                            <span>Party Directory (↑ ↓ arrows, Enter to pick)</span>
                          </span>
                          <span className="font-mono text-slate-400">Esc to close</span>
                        </div>
                        {filteredCustomerCandidates.map((cust, idx) => {
                          const isHighlighted = idx === highlightedCustomerIndex;
                          const reg = registeredCustomerMap.get(cust.toLowerCase());
                          return (
                            <button
                              key={cust}
                              type="button"
                              onClick={() => handleSelectCustomer(cust)}
                              onMouseEnter={() => setHighlightedCustomerIndex(idx)}
                              className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                isHighlighted
                                  ? 'bg-emerald-600 text-white font-bold'
                                  : 'hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="truncate">{cust}</span>
                                {reg && (
                                  <span
                                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                                      isHighlighted
                                        ? 'bg-white/20 text-white border border-white/30'
                                        : reg.partyType === 'vendor'
                                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    }`}
                                  >
                                    {reg.partyType === 'vendor' ? 'Vendor' : 'Customer'}
                                  </span>
                                )}
                              </div>
                              {isHighlighted && (
                                <span className="text-[10px] font-mono shrink-0 ml-2 opacity-95">
                                  ↵ Enter to Select
                                </span>
                              )}
                            </button>
                          );
                        })}

                        {/* Quick Register Action inside Dropdown */}
                        {customerName.trim().length >= 2 &&
                          !registeredCustomerMap.has(customerName.toLowerCase().trim()) &&
                          onQuickRegisterCustomer && (
                            <div className="p-2 bg-emerald-50/70 border-t border-emerald-100">
                              <button
                                type="button"
                                onClick={() => {
                                  onQuickRegisterCustomer(customerName.trim(), deliveryAddress);
                                  setIsCustomerDropdownOpen(false);
                                }}
                                className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-white hover:bg-emerald-100/50 border border-emerald-300 rounded-lg flex items-center justify-between transition-colors cursor-pointer shadow-2xs"
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  <Plus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate">
                                    Register <strong>"{customerName.trim()}"</strong> to Registry
                                  </span>
                                </span>
                                <span className="text-[10px] uppercase font-bold text-emerald-600 shrink-0">
                                  Save Party
                                </span>
                              </button>
                            </div>
                          )}
                      </div>
                    )}
                  </div>

                  {/* Inline Registration Helper if Party is not registered yet */}
                  {customerName.trim().length >= 2 &&
                    !registeredCustomerMap.has(customerName.toLowerCase().trim()) && (
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 bg-amber-50/80 border border-amber-200/80 rounded-lg px-2.5 py-1">
                        <span className="truncate mr-2">
                          Unregistered party: <strong className="text-slate-700">"{customerName}"</strong>
                        </span>
                        {onQuickRegisterCustomer && (
                          <button
                            type="button"
                            onClick={() => onQuickRegisterCustomer(customerName.trim(), deliveryAddress)}
                            className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Register Party</span>
                          </button>
                        )}
                      </div>
                    )}

                  {/* Quick Select Frequent Customers */}
                  {pastCustomers.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Frequent:
                      </span>
                      {pastCustomers.slice(0, 5).map((c) => {
                        const isReg = registeredCustomerMap.has(c.toLowerCase());
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => handleSelectCustomer(c)}
                            className={`text-xs px-2 py-0.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                              customerName === c
                                ? 'bg-emerald-600 text-white border-emerald-600 font-semibold'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>{c}</span>
                            {isReg && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Challan Number */}
                <div className="sm:col-span-3">
                  <label
                    htmlFor="dispatch-challan-number"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Challan Number
                  </label>
                  <input
                    id="dispatch-challan-number"
                    type="text"
                    value={challanNumber}
                    onChange={(e) => setChallanNumber(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm font-mono font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                    placeholder="DC-20260923-001"
                  />
                </div>

                {/* Dispatch Date */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor="dispatch-challan-date"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Dispatch Date
                  </label>
                  <input
                    id="dispatch-challan-date"
                    type="date"
                    value={challanDate}
                    onChange={(e) => setChallanDate(e.target.value)}
                    className="w-full px-2.5 py-2.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Toggle Optional Shipping Details */}
              <div className="mt-3 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setShowOptionalDetails((prev) => !prev)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                >
                  {showOptionalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{showOptionalDetails ? 'Hide' : 'Add'} Delivery Site, Vehicle # & Dispatch Note (Optional)</span>
                </button>

                {showOptionalDetails && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Delivery Site / Address
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="e.g., Ikhlas Site, Plot 14"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Vehicle # / Driver / Carrier
                      </label>
                      <input
                        type="text"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        placeholder="e.g., Van #7, Driver Rashid"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Order / Dispatch Reference Note
                      </label>
                      <input
                        type="text"
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="e.g., Order #492, Cash on delivery"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* FAST ITEM ENTRY WORKBENCH: Item Name -> Auto Unit -> Qty -> + Add */}
            {/* ------------------------------------------------------------- */}
            {/* ------------------------------------------------------------- */}
            {/* FAST ITEM ENTRY WORKBENCH                                      */}
            {/* ------------------------------------------------------------- */}
            <div
              ref={entryContainerRef}
              className="bg-slate-50/90 p-3 sm:p-3.5 rounded-xl border border-slate-200/90 shadow-2xs relative space-y-2"
            >
              {/* Row Grid: Item Name (Search + Inline Small Text) | Qty | + Add */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                {/* 1. ITEM SEARCH & AUTO DROPDOWN */}
                <div className="sm:col-span-8 relative">
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="fast-entry-item-name"
                      className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap"
                    >
                      <span>Item Name</span>
                      <span className="text-rose-500">*</span>
                      {entrySelectedItem && (
                        <span className="text-[11px] font-normal text-slate-600">
                          (Unit: <strong className="text-slate-900 font-mono">{entrySelectedItem.unit}</strong> &bull; Stock:{' '}
                          <strong
                            className={
                              (entrySelectedItem.quantity || 0) > 0
                                ? 'text-emerald-700 font-mono font-bold'
                                : 'text-rose-600 font-mono font-bold'
                            }
                          >
                            {entrySelectedItem.quantity} {entrySelectedItem.unit}
                          </strong>
                          {(entrySelectedItem.quantity || 0) <= 0 && ' - Out of Stock'}
                          )
                        </span>
                      )}
                    </label>

                    {entrySelectedItem ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEntrySelectedItem(null);
                          setEntryItemQuery('');
                          setEntryUnit('');
                          setEntryQty('1');
                          entryItemInputRef.current?.focus();
                        }}
                        className="text-[11px] text-slate-400 hover:text-rose-600 cursor-pointer font-medium"
                      >
                        Clear item
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                        &uarr;&darr; to browse &bull; &crarr; Enter
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={entryItemInputRef}
                      id="fast-entry-item-name"
                      type="text"
                      value={entryItemQuery}
                      onChange={(e) => {
                        setEntryItemQuery(e.target.value);
                        setHighlightedItemIndex(0);
                        if (!isItemDropdownOpen) setIsItemDropdownOpen(true);
                        if (entrySelectedItem && e.target.value !== entrySelectedItem.itemName) {
                          setEntrySelectedItem(null);
                          setEntryUnit('');
                          setEntryQty('');
                        }
                      }}
                      onFocus={() => {
                        setIsItemDropdownOpen(true);
                        setHighlightedItemIndex(0);
                      }}
                      onKeyDown={handleItemInputKeyDown}
                      placeholder="Search product name..."
                      className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm font-semibold text-slate-900 bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-xl shadow-2xs placeholder:text-slate-400 placeholder:font-normal"
                      autoComplete="off"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setIsItemDropdownOpen((prev) => !prev);
                        if (!isItemDropdownOpen) {
                          setTimeout(() => entryItemInputRef.current?.focus(), 40);
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
                      title="Toggle product dropdown"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-150 ${
                          isItemDropdownOpen ? 'rotate-180 text-emerald-600' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Keyboard Arrow-Navigable Dropdown List */}
                  {isItemDropdownOpen && (
                    <div
                      ref={dropdownListRef}
                      className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-64 animate-in fade-in zoom-in-95 duration-100"
                    >
                      <div className="px-3 py-1.5 bg-slate-900 text-white flex items-center justify-between text-[11px] font-medium shrink-0">
                        <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5" />
                          <span>Select Product ({filteredItemCandidates.length})</span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          &uarr;&darr; navigate &bull; &crarr; select
                        </span>
                      </div>

                      <div className="overflow-y-auto max-h-56 divide-y divide-slate-100">
                        {filteredItemCandidates.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500">
                            No products matching &quot;<strong>{entryItemQuery}</strong>&quot;.
                          </div>
                        ) : (
                          filteredItemCandidates.map((cand, idx) => {
                            const isHighlighted = idx === highlightedItemIndex;
                            const isZero = (cand.quantity || 0) <= 0;
                            const inBasket = basket.find((b) => b.item.id === cand.id);

                            return (
                              <button
                                key={cand.id}
                                ref={(el) => (optionItemRefs.current[idx] = el)}
                                type="button"
                                onClick={() => handleSelectItem(cand)}
                                onMouseEnter={() => setHighlightedItemIndex(idx)}
                                className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                                  isHighlighted
                                    ? 'bg-emerald-600 text-white'
                                    : isZero
                                    ? 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                    : inBasket
                                    ? 'bg-emerald-50/60 hover:bg-emerald-100/60 text-slate-900'
                                    : 'hover:bg-slate-50 text-slate-900'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate text-xs sm:text-sm font-semibold">
                                      {cand.itemName}
                                    </span>
                                    {cand.tags && cand.tags.length > 0 && (
                                      <span
                                        className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                                          isHighlighted
                                            ? 'bg-emerald-700 text-white'
                                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                                        }`}
                                      >
                                        #{cand.tags[0]}
                                      </span>
                                    )}
                                    {inBasket && (
                                      <span
                                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                                          isHighlighted
                                            ? 'bg-white text-emerald-800'
                                            : 'bg-emerald-100 text-emerald-800'
                                        }`}
                                      >
                                        In Order ({inBasket.quantity})
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    className={`text-[10px] mt-0.5 flex items-center gap-2 ${
                                      isHighlighted ? 'text-emerald-100' : 'text-slate-500'
                                    }`}
                                  >
                                    <span>
                                      Unit: <strong>{cand.unit}</strong> &bull; Stock: <strong className="font-mono">{cand.quantity} {cand.unit}</strong>
                                    </span>
                                    {isZero && (
                                      <span className={isHighlighted ? 'text-rose-200 font-bold' : 'text-rose-600 font-bold'}>
                                        &bull; Out of stock
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0 flex items-center">
                                  <span className={`text-[11px] font-mono font-bold ${isHighlighted ? 'text-white' : isZero ? 'text-rose-500' : 'text-slate-600'}`}>
                                    {cand.quantity} {cand.unit}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. QUANTITY INPUT */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="fast-entry-qty"
                      className="text-xs font-bold text-slate-800"
                    >
                      Qty {entrySelectedItem ? `(${entrySelectedItem.unit})` : ''}
                    </label>
                    {entrySelectedItem && (entrySelectedItem.quantity || 0) <= 0 && (
                      <span className="text-[10px] text-rose-600 font-bold">0 Stock</span>
                    )}
                  </div>

                  <input
                    ref={entryQtyInputRef}
                    id="fast-entry-qty"
                    type="number"
                    min="1"
                    max={entrySelectedItem ? entrySelectedItem.quantity || 0 : undefined}
                    value={entryQty}
                    onChange={(e) => setEntryQty(e.target.value)}
                    onKeyDown={handleQtyInputKeyDown}
                    disabled={!entrySelectedItem || (entrySelectedItem.quantity || 0) <= 0}
                    placeholder={
                      !entrySelectedItem
                        ? 'Qty'
                        : (entrySelectedItem.quantity || 0) <= 0
                        ? '0'
                        : '1'
                    }
                    className={`w-full px-3 py-2 text-xs sm:text-sm font-bold font-mono text-center rounded-xl border transition-all ${
                      !entrySelectedItem || (entrySelectedItem.quantity || 0) <= 0
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs'
                    }`}
                  />
                </div>

                {/* 3. ADD BUTTON */}
                <div className="sm:col-span-2">
                  <button
                    id="btn-fast-add-item-to-order"
                    type="button"
                    onClick={handleAddEntryToBasket}
                    disabled={
                      !entrySelectedItem ||
                      (entrySelectedItem.quantity || 0) <= 0 ||
                      !entryQty ||
                      parseFloat(entryQty) <= 0 ||
                      parseFloat(entryQty) > (entrySelectedItem.quantity || 0)
                    }
                    className={`w-full py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                      entrySelectedItem &&
                      (entrySelectedItem.quantity || 0) > 0 &&
                      parseFloat(entryQty) > 0 &&
                      parseFloat(entryQty) <= (entrySelectedItem.quantity || 0)
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* ITEMS IN THIS DISPATCH ORDER (BASKET TABLE)                   */}
            {/* ------------------------------------------------------------- */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Items In This Dispatch Order ({basket.length})</span>
                  </h3>
                  {basket.length > 0 && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {totalUnitsDispatched} total units
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Toggle Catalog Browser */}
                  <button
                    type="button"
                    onClick={() => setShowCatalogBrowser((prev) => !prev)}
                    className="text-xs font-semibold px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Search className="w-3.5 h-3.5 text-slate-500" />
                    <span>{showCatalogBrowser ? 'Hide Catalog Grid' : 'Browse Full Catalog'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCatalogBrowser ? 'rotate-180' : ''}`} />
                  </button>

                  {basket.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setBasket([])}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      Clear All Items
                    </button>
                  )}
                </div>
              </div>

              {/* Basket Table */}
              <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
                {basket.length === 0 ? (
                  <div className="p-8 text-center my-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                      <Package className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 mb-1">
                      No Items Added To This Order Yet
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                      Type the item name in the row above or press <kbd className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">↓ Arrow</kbd> to pick from dropdown. The unit is auto-loaded, then enter quantity and press <kbd className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">Enter</kbd> to add.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsItemDropdownOpen(true);
                        setHighlightedItemIndex(0);
                        setTimeout(() => entryItemInputRef.current?.focus(), 40);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Pick Item with Arrows (Alt+A)</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-3">Item Name &amp; Category</th>
                          <th className="py-2.5 px-3 text-center">Unit</th>
                          <th className="py-2.5 px-3 text-right">In Stock</th>
                          <th className="py-2.5 px-3 text-center w-48">Dispatch Quantity</th>
                          <th className="py-2.5 px-3 text-right">Stock After Dispatch</th>
                          <th className="py-2.5 px-3 w-12 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {basket.map((b, index) => {
                          const available = b.item.quantity || 0;
                          const remaining = available - b.quantity;
                          const isExceeding = b.quantity > available;
                          const willBeZero = !isExceeding && remaining === 0;
                          const isZeroStock = available <= 0;

                          return (
                            <tr key={b.item.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-3 text-center font-mono font-bold text-slate-400">
                                {index + 1}
                              </td>

                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-slate-900">
                                    {b.item.itemName}
                                  </span>
                                  {b.item.tags && b.item.tags.length > 0 && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 font-semibold">
                                      #{b.item.tags[0]}
                                    </span>
                                  )}
                                </div>
                                {b.item.notes && (
                                  <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                                    {b.item.notes}
                                  </div>
                                )}
                              </td>

                              <td className="py-3 px-3 text-center">
                                <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold text-xs">
                                  {b.item.unit}
                                </span>
                              </td>

                              <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">
                                {available} {b.item.unit}
                              </td>

                              <td className="py-3 px-3">
                                <div className="flex items-center justify-center gap-1.5">
                                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                                    <button
                                      type="button"
                                      onClick={() => handleAdjustStep(b.item.id, -1)}
                                      disabled={b.quantity <= 1 || isZeroStock}
                                      className="w-7 h-7 rounded-lg bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold shadow-2xs cursor-pointer"
                                      title="Decrease 1"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>

                                    <input
                                      id={`basket-qty-${b.item.id}`}
                                      type="number"
                                      min="1"
                                      max={available}
                                      step="1"
                                      disabled={isZeroStock}
                                      value={b.inputStr}
                                      onChange={(e) => handleUpdateBasketQuantity(b.item.id, e.target.value)}
                                      className={`w-14 h-7 text-center text-xs sm:text-sm font-bold font-mono bg-transparent focus:outline-hidden ${
                                        isZeroStock
                                          ? 'cursor-not-allowed text-slate-400'
                                          : isExceeding
                                          ? 'text-rose-700 font-black'
                                          : 'text-slate-900'
                                      }`}
                                    />

                                    <button
                                      type="button"
                                      onClick={() => handleAdjustStep(b.item.id, 1)}
                                      disabled={b.quantity >= available || isZeroStock}
                                      className="w-7 h-7 rounded-lg bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold shadow-2xs cursor-pointer"
                                      title="Increase 1"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleSetMaxStock(b.item.id)}
                                    disabled={isZeroStock}
                                    className="text-[10px] font-bold uppercase px-2 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                                    title="Dispatch all in-stock quantity"
                                  >
                                    All
                                  </button>
                                </div>
                              </td>

                              <td className="py-3 px-3 text-right">
                                {isExceeding ? (
                                  <span className="text-rose-600 font-bold font-mono flex items-center justify-end gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Exceeds stock!
                                  </span>
                                ) : willBeZero ? (
                                  <span className="text-amber-600 font-bold font-mono">
                                    0 {b.item.unit} (Depleted)
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 font-bold font-mono">
                                    {remaining} {b.item.unit}
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromBasket(b.item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Remove item from order"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Order summary bar */}
                    <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">
                          Total Line Items: <strong className="text-slate-900">{totalLineItems}</strong>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500">
                          Total Dispatched Units: <strong className="text-emerald-700 font-mono text-sm">{totalUnitsDispatched}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">Ready to issue challan for:</span>
                        <span className="text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {customerName || 'No party selected yet'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* OPTIONAL EXPANDABLE FULL CATALOG BROWSER                      */}
            {/* ------------------------------------------------------------- */}
            {showCatalogBrowser && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in duration-150">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Browse Complete Catalog ({filteredCatalogItems.length} items)</span>
                  </span>

                  {/* Search input in catalog browser */}
                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Filter catalog cards..."
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                {/* Tag Chips */}
                {catalogTags.length > 0 && (
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setSelectedTagFilter('all')}
                      className={`text-[11px] px-2 py-0.5 rounded-lg border whitespace-nowrap transition-colors cursor-pointer ${
                        selectedTagFilter === 'all'
                          ? 'bg-slate-800 text-white border-slate-800 font-semibold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      All
                    </button>
                    {catalogTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTagFilter(tag)}
                        className={`text-[11px] px-2 py-0.5 rounded-lg border whitespace-nowrap transition-colors cursor-pointer ${
                          selectedTagFilter === tag
                            ? 'bg-emerald-600 text-white border-emerald-600 font-semibold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}

                {/* Catalog Grid Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {filteredCatalogItems.map((item) => {
                    const inBasket = basket.some((b) => b.item.id === item.id);
                    const isZero = (item.quantity || 0) <= 0;

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border bg-white flex items-center justify-between gap-2 transition-all ${
                          inBasket ? 'border-emerald-500 bg-emerald-50/40' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-xs text-slate-900 truncate">
                            {item.itemName}
                          </h5>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <span className="font-mono font-bold text-emerald-700">
                              {item.quantity} {item.unit}
                            </span>
                            {isZero && <span className="text-rose-500 font-bold">• 0 Stock</span>}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!isZero) {
                              handleAddItemToBasket(item);
                              onShowToast(`Added "${item.itemName}" to order!`, 'success');
                            }
                          }}
                          disabled={isZero}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
                            isZero
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : inBasket
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200'
                          }`}
                        >
                          {isZero ? '0' : inBasket ? '✓ Added' : '+ Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Final Action Bar */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Stock levels will be deducted in real-time and tracked in the audit trail.</span>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleFulfillOrder}
                  disabled={basket.length === 0 || !customerName.trim() || hasExceedingStock || hasZeroQuantity}
                  className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 active:scale-[0.98]"
                >
                  <Truck className="w-4 h-4" />
                  <span>Generate Delivery Challan & Deduct Stock</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: OFFICIAL DELIVERY CHALLAN VIEW / PRINT VIEW           */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'view_challan' && activeChallan && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col">
            {/* Top Toolbar (Hidden on Print) */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 mb-5 pb-4 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Dispatch</span>
                </button>

                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  {activeChallan.challanNumber}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyChallanText(activeChallan)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Copy formatted text for WhatsApp or SMS"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText ? 'Copied!' : 'Copy Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportDeliveryChallanToExcel(activeChallan)}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Export this Delivery Challan as Excel document"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintChallan}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  title="Print official delivery challan"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Challan</span>
                </button>
              </div>
            </div>

            {/* Official Document Container (Printable) */}
            <div
              id="printable-delivery-challan-document"
              className="bg-white border-2 border-slate-300 rounded-xl p-6 sm:p-8 text-slate-900 shadow-sm print:border-none print:shadow-none print:p-0"
            >
              {/* Challan Document Header */}
              <div className="flex items-start justify-between pb-6 mb-6 border-b-2 border-slate-800">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                    Delivery Challan
                  </h1>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-0.5">
                    Goods Dispatch Note / Outbound Voucher
                  </p>
                  <div className="text-xs text-slate-600 mt-2 space-y-0.5">
                    <p className="font-semibold text-slate-800">Store / Inventory Warehouse</p>
                    <p>Attributed Operator: {activeChallan.dispatchedByName}</p>
                    {activeChallan.dispatchedByEmail && (
                      <p className="text-slate-500">{activeChallan.dispatchedByEmail}</p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white px-3 py-1 rounded-md text-xs font-mono font-black tracking-wider uppercase mb-1">
                    {activeChallan.challanNumber}
                  </div>
                  <div className="text-xs text-slate-600 font-medium space-y-0.5 mt-1">
                    <p>
                      Date: <strong className="text-slate-900">{formatLocalDate(activeChallan.date)}</strong>
                    </p>
                    <p>
                      Status: <strong className="text-emerald-700 uppercase">{activeChallan.status || 'Dispatched'}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Two Column Party / Shipping Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 mb-6 border-b border-slate-200">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Dispatched / Sold To:
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {activeChallan.customerName}
                  </h3>
                  {activeChallan.deliveryAddress && (
                    <p className="text-xs text-slate-600 mt-1 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{activeChallan.deliveryAddress}</span>
                    </p>
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Dispatch Reference:
                  </span>
                  <div className="text-xs space-y-1">
                    <p>
                      Vehicle / Driver:{' '}
                      <strong className="text-slate-800">
                        {activeChallan.vehicleNumber || 'N/A'}
                      </strong>
                    </p>
                    {activeChallan.notes && (
                      <p>
                        Notes: <span className="text-slate-700">{activeChallan.notes}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Dispatched Table */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-800 bg-slate-100">
                      <th className="py-2.5 px-3 font-bold text-slate-700 w-12 text-center">Sr #</th>
                      <th className="py-2.5 px-3 font-bold text-slate-700">Product / Item Description</th>
                      <th className="py-2.5 px-3 font-bold text-slate-700 text-center">Unit</th>
                      <th className="py-2.5 px-3 font-bold text-slate-700 text-right">Dispatched Qty</th>
                      <th className="py-2.5 px-3 font-bold text-slate-500 text-right">Baseline Stock</th>
                      <th className="py-2.5 px-3 font-bold text-slate-500 text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {activeChallan.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {item.itemName}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{item.unit}</td>
                        <td className="py-2.5 px-3 text-right font-black font-mono text-sm text-slate-900">
                          {item.dispatchedQty}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          {item.previousQty !== undefined ? item.previousQty : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {item.remainingQty !== undefined ? item.remainingQty : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex items-center justify-between p-4 bg-slate-100/80 rounded-xl border border-slate-200 mb-8 font-semibold text-xs">
                <div>
                  Total Line Items: <strong className="text-slate-900">{activeChallan.totalItems}</strong>
                </div>
                <div className="text-right">
                  Total Dispatched Quantity:{' '}
                  <strong className="text-base font-black font-mono text-slate-900">
                    {activeChallan.totalQuantity}
                  </strong>
                </div>
              </div>

              {/* Declarations & Dual Signatures Block */}
              <div className="pt-4 border-t border-slate-300">
                <p className="text-[11px] text-slate-500 italic mb-10">
                  Declaration: Received the above-mentioned goods in sound and undamaged condition.
                </p>

                <div className="grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <div className="border-t-2 border-slate-400 pt-2 font-bold text-slate-800">
                      Dispatched By (Authorized Signatory)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {activeChallan.dispatchedByName}
                    </div>
                  </div>

                  <div>
                    <div className="border-t-2 border-slate-400 pt-2 font-bold text-slate-800">
                      Received By (Customer Signature & Stamp)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {activeChallan.customerName}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Navigation */}
            <div className="mt-6 flex items-center justify-between print:hidden">
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>View All Past Challans</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors cursor-pointer"
              >
                Done / Back to Inventory
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 3: PAST DELIVERY CHALLANS HISTORY                        */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Delivery Challans & Dispatch History
                </h3>
                <p className="text-xs text-slate-500">
                  Search, inspect, re-print, or export past customer delivery notes
                </p>
              </div>

              {/* Search History */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search by customer, challan #..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* Challans List */}
            {filteredHistory.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                <Truck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No Delivery Challans Found</h4>
                <p className="text-xs text-slate-500 mt-1">
                  {historySearch ? 'No challans match your search.' : 'Create your first dispatch to generate an official delivery challan.'}
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
                {filteredHistory.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                          {c.challanNumber}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 truncate">
                          {c.customerName}
                        </h4>
                        <span className="text-[10px] text-slate-400">
                          • {formatLocalDate(c.date)}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                        <span>
                          {c.totalItems} {c.totalItems === 1 ? 'item' : 'items'} ({c.totalQuantity} total qty)
                        </span>
                        <span>•</span>
                        <span>Dispatched by: <strong className="text-slate-700">{c.dispatchedByName}</strong></span>
                        {c.vehicleNumber && (
                          <>
                            <span>•</span>
                            <span>Vehicle: {c.vehicleNumber}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyChallanText(c)}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        title="Copy text for WhatsApp/SMS"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => exportDeliveryChallanToExcel(c)}
                        className="p-2 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                        title="Export to Excel"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveChallan(c);
                          setActiveTab('view_challan');
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>View & Print</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete Challan ${c.challanNumber}? (Note: Stock changes already made remain intact)`)) {
                            deleteStoredDeliveryChallan(c.id);
                            setStoredChallans(loadDeliveryChallans());
                            onShowToast(`Challan ${c.challanNumber} deleted from history.`, 'info');
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete challan from history"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

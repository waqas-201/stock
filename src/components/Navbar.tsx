import React, { useRef, useState, useEffect } from 'react';
import {
  Package,
  FileSpreadsheet,
  Upload,
  Scale,
  Download,
  X,
  Plus,
  ShieldAlert,
  Zap,
  History,
  Database,
  LogIn,
  LogOut,
  Loader2,
  CloudCheck,
  User,
  Users,
  Sparkles,
  Tag,
  Clock,
  Truck,
  PackageCheck,
  Menu,
  ChevronRight,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import type { User as FirebaseUser } from '../lib/firebase';
import { OperatorProfile, StockItem } from '../types';
import { TimezoneSelectorModal } from './TimezoneSelectorModal';
import { useActiveTimezone } from '../lib/dateUtils';

interface NavbarProps {
  itemCount: number;
  confirmOnDelete: boolean;
  onToggleConfirmOnDelete: () => void;
  onExportExcel: () => void;
  onExportCsv: () => void;
  onImportFile: (file: File) => void;
  onOpenUnitModal: () => void;
  onAddNewItem: () => void;
  onOpenAuditTrail: () => void;
  currentUser: FirebaseUser | null;
  isAuthLoading: boolean;
  onSignInWithGoogle: () => void;
  onSignOut: () => void;
  currentOperator?: OperatorProfile;
  onOpenOperatorModal: () => void;
  items?: StockItem[];
  onOpenGeminiChat?: () => void;
  onOpenTagModal?: () => void;
  onOpenLabelModal?: () => void;
  selectedTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
  onOpenTimezoneModal?: () => void;
  onOpenDispatchOrder?: () => void;
  onOpenReceiveStock?: () => void;
  onOpenDeliveryLedger?: (partyName?: string) => void;
  onOpenCustomerModal?: () => void;
  customerCount?: number;
  activeScreen?: 'inventory' | 'challans_ledger';
  onSwitchScreen?: (
    screen: 'inventory' | 'challans_ledger',
    subTab?: 'all_challans' | 'single_party_ledger' | 'parties_directory',
    partyFilter?: string
  ) => void;
  challansCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  itemCount,
  confirmOnDelete,
  onToggleConfirmOnDelete,
  onExportExcel,
  onExportCsv,
  onImportFile,
  onOpenUnitModal,
  onAddNewItem,
  onOpenAuditTrail,
  currentUser,
  isAuthLoading,
  onSignInWithGoogle,
  onSignOut,
  currentOperator,
  onOpenOperatorModal,
  items = [],
  onOpenGeminiChat,
  onOpenTagModal,
  onOpenLabelModal,
  selectedTag,
  onSelectTag,
  onOpenTimezoneModal,
  onOpenDispatchOrder,
  onOpenReceiveStock,
  onOpenDeliveryLedger,
  onOpenCustomerModal,
  customerCount,
  activeScreen = 'inventory',
  onSwitchScreen,
  challansCount = 0,
}) => {
  const { timezone, timezoneAbbr } = useActiveTimezone();
  const [internalTimezoneOpen, setInternalTimezoneOpen] = useState(false);

  const handleOpenTimezone = () => {
    if (onOpenTimezoneModal) {
      onOpenTimezoneModal();
    } else {
      setInternalTimezoneOpen(true);
    }
  };

  const handleOpenTags = onOpenTagModal || onOpenLabelModal;
  const rawName = currentOperator?.name || 'Waqas';
  const opName = rawName.replace(/\s*\(Admin\)/gi, '').trim() || 'Waqas';
  const opInitial = opName.charAt(0).toUpperCase() || 'W';
  const rawRole = currentOperator?.role || 'Team Member';
  const opRole = /admin|manager/i.test(rawRole) ? 'Team Member' : rawRole;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsMenuOpen(false);
    }
  };

  // Close hamburger drawer when pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  return (
    <>
      <header
        id="main-navbar"
        className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs select-none"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
            {/* Left: Clean Brand Logo & App Title */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                    Stock Management
                  </h1>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 truncate">
                  {selectedTag ? (
                    <>
                      <span className="font-semibold text-emerald-800">
                        Tag #{selectedTag}
                      </span>
                      <span>•</span>
                      <span>
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </span>
                      {onSelectTag && (
                        <button
                          type="button"
                          onClick={() => onSelectTag(null)}
                          className="text-emerald-700 hover:text-emerald-950 font-bold underline ml-1 cursor-pointer"
                          title="Show whole stock"
                        >
                          Show Whole Stock
                        </button>
                      )}
                    </>
                  ) : (
                    <span>
                      {itemCount} {itemCount === 1 ? 'item' : 'items'} in inventory
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Middle: Screen Switcher (Stock Inventory vs Delivery Challans & Ledger) */}
            {onSwitchScreen && (
              <nav aria-label="Main screens" className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => onSwitchScreen('inventory')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeScreen === 'inventory'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Switch to Stock Inventory screen"
                >
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Stock Inventory</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSwitchScreen('challans_ledger', 'all_challans')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeScreen === 'challans_ledger'
                      ? 'bg-[#2f6592] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Switch to Delivery Challans, Customer Ledger & Parties screen"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Challans & Parties</span>
                  {challansCount > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        activeScreen === 'challans_ledger'
                          ? 'bg-white/25 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {challansCount}
                    </span>
                  )}
                </button>
              </nav>
            )}

            {/* Right: Clean, Uncluttered Actions + Prominent Hamburger Menu */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Desktop Quick Receive Button */}
              {onOpenReceiveStock && (
                <button
                  id="btn-navbar-receive-stock"
                  type="button"
                  onClick={onOpenReceiveStock}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/90 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                  title="Receive items from vendors & issue Goods Receipt Note (Shortcut: Alt + R)"
                >
                  <PackageCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Receive</span>
                  <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.2 text-[10px] font-mono font-semibold text-indigo-600 bg-white/80 rounded border border-indigo-200">
                    Alt+R
                  </kbd>
                </button>
              )}

              {/* Desktop Quick Dispatch Button */}
              {onOpenDispatchOrder && (
                <button
                  id="btn-navbar-dispatch-order"
                  type="button"
                  onClick={onOpenDispatchOrder}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                  title="Fulfill multi-item orders & issue Delivery Challan (Shortcut: Alt + O)"
                >
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Dispatch</span>
                  <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.2 text-[10px] font-mono font-semibold text-slate-600 bg-white rounded border border-slate-300">
                    Alt+O
                  </kbd>
                </button>
              )}

              {/* Add Item Button (Primary Rapid Action on all screens) */}
              <button
                id="btn-navbar-add-item"
                type="button"
                onClick={() => {
                  const input = document.getElementById('quick-add-stock-input') as HTMLInputElement | null;
                  if (input) {
                    input.focus();
                    input.select();
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  } else {
                    onAddNewItem();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer active:scale-[0.98]"
                title="Focus Quick Add Stock input (Shortcut: Alt + N)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
                <kbd className="hidden xl:inline-flex items-center px-1.5 py-0.2 text-[10px] font-mono font-semibold text-emerald-100 bg-emerald-700/80 rounded border border-emerald-500/50">
                  Alt+N
                </kbd>
              </button>

              <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block" />

              {/* THE HAMBURGER MENU BUTTON (Houses all tools, settings, data & profiles cleanly) */}
              <button
                id="btn-navbar-hamburger-menu"
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-300 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                title="Open navigation menu, tools, settings & reports"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-4 h-4 text-slate-700" />
                <span className="hidden sm:inline">Menu</span>
              </button>
            </div>
          </div>
        </div>

        {/* Hidden File Input for Excel/CSV Import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </header>

      {/* ========================================================= */}
      {/* THE HAMBURGER NAVIGATION DRAWER (Slide-over from right)    */}
      {/* Organized, Beautiful, Clean, Zero-Clutter                */}
      {/* ========================================================= */}
      {isMenuOpen && (
        <div
          id="hamburger-menu-overlay"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200 select-none"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            id="hamburger-menu-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Main Navigation Menu"
            className="w-full max-w-md sm:max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 border-l border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Top Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Navigation & Tools
                  </h2>
                  <p className="text-xs text-slate-300">
                    Stock Management System
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Close menu (Escape)"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Staff & Database Status Ribbon */}
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
              {/* Active Operator */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                  {opInitial}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {opName}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {opRole}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenOperatorModal();
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="Change active staff member"
                >
                  Switch
                </button>
              </div>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* PRIMARY APP SCREENS & WORKSPACES */}
              {onSwitchScreen && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
                    Application Workspaces (Dedicated Screens)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* 1. Stock Inventory Screen */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onSwitchScreen('inventory');
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer border shadow-2xs group ${
                        activeScreen === 'inventory'
                          ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                          <span>Stock Inventory</span>
                          {activeScreen === 'inventory' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-200 text-emerald-800 rounded-md">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          Catalog, filters & stock levels
                        </div>
                      </div>
                    </button>

                    {/* 2. All Delivery Challans Screen */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onSwitchScreen('challans_ledger', 'all_challans');
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer border shadow-2xs group ${
                        activeScreen === 'challans_ledger'
                          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#2f6592] text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                          <span>Delivery Challans</span>
                          {challansCount > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-100 text-[#1e4b7a] rounded-md">
                              {challansCount}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          Vouchers list & date filters
                        </div>
                      </div>
                    </button>

                    {/* 3. Single Party Ledger Screen */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onSwitchScreen('challans_ledger', 'single_party_ledger');
                      }}
                      className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer group shadow-2xs"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                          <span>Party Ledger</span>
                          <span className="text-[9px] font-mono font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded">
                            Statement
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          Customer & vendor statements
                        </div>
                      </div>
                    </button>

                    {/* 4. Customer Directory Screen */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onSwitchScreen('challans_ledger', 'parties_directory');
                      }}
                      className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer group shadow-2xs"
                    >
                      <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                          <span>Customer Directory</span>
                          {customerCount !== undefined && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-sky-100 text-sky-800 rounded-md">
                              {customerCount}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          Manage & add customer profiles
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION 1: INVENTORY OPERATIONS */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
                  Inventory Operations
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Receive Stock */}
                  {onOpenReceiveStock && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenReceiveStock();
                      }}
                      className="p-3 bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200/80 rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer group shadow-2xs"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <PackageCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-indigo-950 flex items-center justify-between">
                          <span>Receive Stock</span>
                          <kbd className="text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-indigo-100 text-indigo-800">
                            Alt+R
                          </kbd>
                        </div>
                        <div className="text-[11px] text-indigo-800/80 line-clamp-1">
                          Inward GRN from vendors
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Dispatch Order */}
                  {onOpenDispatchOrder && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenDispatchOrder();
                      }}
                      className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer group shadow-2xs text-white"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white flex items-center justify-between">
                          <span>Dispatch Order</span>
                          <kbd className="text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-slate-800 text-slate-300">
                            Alt+O
                          </kbd>
                        </div>
                        <div className="text-[11px] text-slate-300 line-clamp-1">
                          Delivery Challan for clients
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Add New Item */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onAddNewItem();
                    }}
                    className="p-3 bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/80 rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-emerald-950 flex items-center justify-between">
                        <span>Add New Item</span>
                        <kbd className="text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-emerald-100 text-emerald-800">
                          Alt+N
                        </kbd>
                      </div>
                      <div className="text-[11px] text-emerald-800/80 line-clamp-1">
                        Register SKU or restock
                      </div>
                    </div>
                  </button>

                  {/* Parties Registry */}
                  {onOpenCustomerModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        if (onSwitchScreen) {
                          onSwitchScreen('challans_ledger', 'parties_directory');
                        } else {
                          onOpenCustomerModal();
                        }
                      }}
                      className="p-3 bg-sky-50/70 hover:bg-sky-100/80 border border-sky-200/80 rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer group shadow-2xs"
                    >
                      <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-sky-950 flex items-center justify-between">
                          <span>Parties Registry</span>
                          {customerCount !== undefined && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-sky-200/80 text-sky-900 rounded-full">
                              {customerCount}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-sky-800/80 line-clamp-1">
                          Customers & Vendors
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* SECTION 2: DATA & REPORTS */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
                  Data & Reports
                </div>
                <div className="space-y-1.5">
                  {/* Delivery Challans & Customer Ledger */}
                  {onOpenDeliveryLedger && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        if (onSwitchScreen) {
                          onSwitchScreen('challans_ledger', 'all_challans');
                        } else {
                          onOpenDeliveryLedger();
                        }
                      }}
                      className="w-full p-2.5 bg-amber-50/80 hover:bg-amber-100/90 border border-amber-200/90 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>Delivery Challans & Customer Ledger</span>
                            <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-200/80 px-1 py-0.2 rounded">
                              Alt+L
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            See old delivery vouchers in list with dates & party ledger
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Export to Excel */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onExportExcel();
                    }}
                    className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Export to Excel (.xlsx)
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Download official inventory sheet
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Export to CSV */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onExportCsv();
                    }}
                    className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Export to CSV (.csv)
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Raw comma-separated data
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Import Excel / CSV File */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Import from Excel / CSV
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Upload file to bulk-populate stock
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Full Activity Audit Trail */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenAuditTrail();
                    }}
                    className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
                        <History className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Full Audit Trail & History
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Ledger of all stock movements & modifications
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Talk to Gemini AI */}
                  {onOpenGeminiChat && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenGeminiChat();
                      }}
                      className="w-full p-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl flex items-center justify-between text-left transition-all cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            Talk with Gemini AI
                          </div>
                          <div className="text-[11px] text-emerald-100">
                            Ask questions, analyze stock, find low inventory
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-white/20 rounded-md text-white">
                        Ask
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* SECTION 3: MASTER DATA & SETTINGS */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
                  Master Data & Settings
                </div>
                <div className="space-y-1.5">
                  {/* Tags & Labels */}
                  {handleOpenTags && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleOpenTags();
                      }}
                      className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                          <Tag className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Product Tags & Labels
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Manage color-coded categories & filters
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                        Manage
                      </span>
                    </button>
                  )}

                  {/* Units of Measure */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenUnitModal();
                    }}
                    className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        <Scale className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Units of Measurement
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Configure units (pcs, kg, boxes, liters)
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      Configure
                    </span>
                  </button>

                  {/* Timezone & Local Date Sync */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleOpenTimezone();
                    }}
                    className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Timezone & Date Sync
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Active: {timezoneAbbr} ({timezone})
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {timezoneAbbr}
                    </span>
                  </button>

                  {/* Delete Safeguard Toggle */}
                  <button
                    type="button"
                    onClick={onToggleConfirmOnDelete}
                    className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          confirmOnDelete
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {confirmOnDelete ? (
                          <ShieldAlert className="w-4 h-4" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {confirmOnDelete
                            ? 'Delete Confirmation: Enabled'
                            : 'Instant Delete (With Undo): On'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {confirmOnDelete
                            ? 'Shows confirmation popup before deleting'
                            : 'Deletes immediately on 1 tap (instant Undo)'}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        confirmOnDelete
                          ? 'bg-slate-200 text-slate-700 border-slate-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {confirmOnDelete ? 'Popup On' : 'Quick Mode'}
                    </span>
                  </button>
                </div>
              </div>

              {/* SECTION 4: CLOUD DATABASE & PERSISTENCE */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
                  Cloud Database & Team Sync
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  {isAuthLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      <span>Checking Cloud Database connection...</span>
                    </div>
                  ) : currentUser ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {currentUser.photoURL ? (
                            <img
                              src={currentUser.photoURL}
                              alt="Profile"
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover border border-emerald-500 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                              {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 block truncate">
                              {currentUser.displayName || currentUser.email}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                              <CloudCheck className="w-3 h-3 text-emerald-600" />
                              Cloud Firestore Active
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            onSignOut();
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer transition-colors flex items-center gap-1 shrink-0"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-500 bg-white p-2 rounded-xl border border-slate-200">
                        Changes are synced in real-time across all team members via Firestore.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                          <Database className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            Cloud Firestore Database
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            Sync inventory permanently across all devices & team members
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onSignInWithGoogle();
                        }}
                        className="w-full py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Connect Google Account</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Bottom Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span className="font-medium">
                {itemCount} total inventory {itemCount === 1 ? 'item' : 'items'}
              </span>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Close Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Internal Timezone Modal Fallback */}
      {internalTimezoneOpen && (
        <TimezoneSelectorModal
          isOpen={internalTimezoneOpen}
          onClose={() => setInternalTimezoneOpen(false)}
        />
      )}
    </>
  );
};

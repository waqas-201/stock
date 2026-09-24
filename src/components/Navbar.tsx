import React, { useRef, useState, useEffect } from 'react';
import {
  Package,
  FileSpreadsheet,
  Upload,
  Scale,
  MoreVertical,
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
  UserCheck,
  User,
  Users,
  Sparkles,
  Tag,
  Settings,
  ChevronDown,
  Clock,
  Globe,
  Truck,
  PackageCheck,
} from 'lucide-react';
import type { User as FirebaseUser } from '../lib/firebase';
import { OperatorProfile, StockItem } from '../types';
import { TimezonePill, TimezoneSelectorModal } from './TimezoneSelectorModal';
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
  onOpenCustomerModal?: () => void;
  customerCount?: number;
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
  onOpenCustomerModal,
  customerCount,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsMobileMenuOpen(false);
      setIsSettingsOpen(false);
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsDropdownRef.current &&
        !settingsDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
    };
    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  // Close menus when pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header
        id="main-navbar"
        className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs select-none"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
            {/* Logo & App Title */}
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
                      {itemCount} {itemCount === 1 ? 'item' : 'items'} in inventory • Individual low stock alerts
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop Action Bar: Clean, Professional, High Breathing Room */}
            <div className="hidden md:flex items-center gap-2 lg:gap-2.5">
              {/* Active Staff / Operator Attribution Badge */}
              <button
                id="btn-active-operator"
                type="button"
                onClick={onOpenOperatorModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
                title="Change active staff name for inventory modifications and audit trail"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                  {opInitial}
                </div>
                <span className="truncate max-w-[85px] text-slate-900 font-medium">
                  {opName}
                </span>
                <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 hidden xl:inline">
                  {opRole}
                </span>
              </button>

              {/* Active Timezone & Local Date Sync Pill */}
              <TimezonePill onOpenModal={handleOpenTimezone} />

              {/* Cloud DB & User Sign-In / Account Status */}
              {isAuthLoading ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-xl">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  <span className="hidden xl:inline">Checking DB...</span>
                </div>
              ) : currentUser ? (
                <div className="flex items-center gap-1.5 bg-emerald-50/70 border border-emerald-200 pl-1.5 pr-1 py-1 rounded-xl">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover border border-emerald-400"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-emerald-900 truncate max-w-[80px] hidden xl:inline">
                    {currentUser.displayName || (currentUser.isAnonymous ? 'Quick Team' : currentUser.email?.split('@')[0])}
                  </span>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="p-1 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-200/60 rounded-lg cursor-pointer transition-colors"
                    title="Sign Out from Cloud Database"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onSignInWithGoogle}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
                  title="Sign in with Google to enable permanent Cloud Firestore database storage"
                >
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden lg:inline">Connect Cloud DB</span>
                </button>
              )}

              <div className="h-4 w-px bg-slate-200 mx-0.5" />

              {/* Quick Export Excel */}
              <button
                id="btn-export-excel-primary"
                type="button"
                onClick={onExportExcel}
                disabled={itemCount === 0}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs disabled:opacity-40"
                title="Download Excel spreadsheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden lg:inline">Export</span>
              </button>

              {/* Talk to Gemini AI Desktop Button */}
              {onOpenGeminiChat && (
                <button
                  id="btn-navbar-gemini-chat"
                  type="button"
                  onClick={onOpenGeminiChat}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl shadow-xs transition-all cursor-pointer ring-1 ring-emerald-500/30 active:scale-[0.98]"
                  title="Talk with Gemini AI about your stock"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>Ask AI</span>
                </button>
              )}

              {/* Add Item Desktop Button with Alt + N shortcut */}
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
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer active:scale-[0.98]"
                title="Focus Quick Add Stock input (Shortcut: Alt + N)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
                <kbd className="hidden xl:inline-flex items-center px-1.5 py-0.2 text-[10px] font-mono font-semibold text-emerald-100 bg-emerald-700/80 rounded border border-emerald-500/50">
                  Alt+N
                </kbd>
              </button>

              {/* Unified Multi-Item Order Dispatch & Delivery Challan */}
              {onOpenDispatchOrder && (
                <button
                  id="btn-navbar-dispatch-order"
                  type="button"
                  onClick={onOpenDispatchOrder}
                  className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-all cursor-pointer active:scale-[0.98] border border-slate-700/80 hover:border-slate-600"
                  title="Fulfill multi-item orders & issue Delivery Challan (Shortcut: Alt + O)"
                >
                  <Truck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Dispatch Order</span>
                  <kbd className="hidden xl:inline-flex items-center px-1.5 py-0.2 text-[10px] font-mono font-semibold text-slate-300 bg-slate-800 rounded border border-slate-600">
                    Alt+O
                  </kbd>
                </button>
              )}

              {/* Receive Stock & Goods Inward (GRN) */}
              {onOpenReceiveStock && (
                <button
                  id="btn-navbar-receive-stock"
                  type="button"
                  onClick={onOpenReceiveStock}
                  className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl shadow-xs transition-all cursor-pointer active:scale-[0.98] border border-indigo-600/80 hover:border-indigo-500"
                  title="Receive goods from vendors & issue Goods Receipt Note (Shortcut: Alt + R)"
                >
                  <PackageCheck className="w-3.5 h-3.5 text-indigo-200" />
                  <span>Receive Stock</span>
                  <kbd className="hidden xl:inline-flex items-center px-1.5 py-0.2 text-[10px] font-mono font-semibold text-indigo-200 bg-indigo-900 rounded border border-indigo-500">
                    Alt+R
                  </kbd>
                </button>
              )}

              {/* Customer / Party Registry Management */}
              {onOpenCustomerModal && (
                <button
                  id="btn-navbar-customers"
                  type="button"
                  onClick={onOpenCustomerModal}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
                  title="Manage registered customer parties and client accounts"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden lg:inline">Parties</span>
                  {customerCount !== undefined && (
                    <span className="px-1.5 py-0.2 text-[10px] bg-emerald-100 text-emerald-800 rounded-full font-bold">
                      {customerCount}
                    </span>
                  )}
                </button>
              )}

              {/* Comprehensive Professional Settings & Management Popover */}
              <div className="relative" ref={settingsDropdownRef}>
                <button
                  id="btn-navbar-settings"
                  type="button"
                  onClick={() => setIsSettingsOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    isSettingsOpen
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-900/10'
                      : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-200 shadow-2xs'
                  }`}
                  title="Open system settings, master data, tags, units, and safeguards"
                  aria-expanded={isSettingsOpen}
                >
                  <Settings
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isSettingsOpen ? 'rotate-45 text-white' : 'text-slate-600'
                    }`}
                  />
                  <span>Settings</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${
                      isSettingsOpen ? 'rotate-180 text-white' : 'opacity-60 text-slate-500'
                    }`}
                  />
                </button>

                {/* Settings Dropdown Popover */}
                {isSettingsOpen && (
                  <div
                    id="navbar-settings-dropdown"
                    className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left"
                    role="menu"
                    aria-label="Settings and Management"
                  >
                    {/* Popover Header */}
                    <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Settings className="w-3.5 h-3.5 text-slate-500" />
                          <span>Settings & Management</span>
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Master data, safeguards & operations
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsSettingsOpen(false)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                        aria-label="Close settings"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-3 space-y-3 max-h-[75vh] overflow-y-auto">
                      {/* 1. Inventory Classification */}
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">
                          Inventory Classification
                        </div>
                        <div className="space-y-1">
                          {/* Tags & Categories */}
                          {handleOpenTags && (
                            <button
                              id="btn-open-tag-manager"
                              type="button"
                              onClick={() => {
                                setIsSettingsOpen(false);
                                handleOpenTags();
                              }}
                              className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-50 transition-colors group cursor-pointer border border-transparent hover:border-slate-200/60"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 group-hover:bg-teal-100 transition-colors">
                                  <Tag className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-slate-800 group-hover:text-slate-900">
                                    Product Tags & Labels
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    Create, color-code, and filter categories
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                                Manage
                              </span>
                            </button>
                          )}

                          {/* Measurement Units */}
                          <button
                            id="btn-open-unit-manager"
                            type="button"
                            onClick={() => {
                              setIsSettingsOpen(false);
                              onOpenUnitModal();
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-50 transition-colors group cursor-pointer border border-transparent hover:border-slate-200/60"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                                <Scale className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-800 group-hover:text-slate-900">
                                  Measurement Units
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Manage units (kg, pcs, boxes, liters)
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              Configure
                            </span>
                          </button>

                          {/* Customer & Party Registry */}
                          {onOpenCustomerModal && (
                            <button
                              id="btn-open-customer-manager"
                              type="button"
                              onClick={() => {
                                setIsSettingsOpen(false);
                                onOpenCustomerModal();
                              }}
                              className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-50 transition-colors group cursor-pointer border border-transparent hover:border-slate-200/60"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 group-hover:bg-sky-100 transition-colors">
                                  <Users className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-slate-800 group-hover:text-slate-900">
                                    Customer & Party Registry
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    Register parties, contact details & addresses
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/60">
                                {customerCount !== undefined ? `${customerCount} Parties` : 'Directory'}
                              </span>
                            </button>
                          )}

                          {/* Full Activity Audit Trail */}
                          <button
                            id="btn-open-audit-trail"
                            type="button"
                            onClick={() => {
                              setIsSettingsOpen(false);
                              onOpenAuditTrail();
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-50 transition-colors group cursor-pointer border border-transparent hover:border-slate-200/60"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                                <History className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-800 group-hover:text-slate-900">
                                  Full Audit Trail
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Log of stock movements, edits & removals
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60">
                              View Log
                            </span>
                          </button>

                          {/* Multi-Item Dispatch & Delivery Challans */}
                          {onOpenDispatchOrder && (
                            <button
                              id="btn-open-dispatch-manager"
                              type="button"
                              onClick={() => {
                                setIsSettingsOpen(false);
                                onOpenDispatchOrder();
                              }}
                              className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-50 transition-colors group cursor-pointer border border-transparent hover:border-slate-200/60"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                                  <Truck className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-slate-800 group-hover:text-slate-900">
                                    Delivery Challans & Dispatch
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    Multi-item orders & goods dispatch notes
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                                Open
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 2. Data Transfer & Operations */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">
                          Data Transfer
                        </div>
                        <div className="space-y-1">
                          {/* Import file */}
                          <button
                            id="btn-import-stock-file"
                            type="button"
                            onClick={() => {
                              setIsSettingsOpen(false);
                              fileInputRef.current?.click();
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-50 transition-colors group cursor-pointer border border-transparent hover:border-slate-200/60"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                                <Upload className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-800 group-hover:text-slate-900">
                                  Import Spreadsheet
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Upload .xlsx, .xls, or .csv inventory
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                              Upload
                            </span>
                          </button>

                          {/* Export CSV option */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsSettingsOpen(false);
                              onExportCsv();
                            }}
                            disabled={itemCount === 0}
                            className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-50 transition-colors group cursor-pointer border border-transparent hover:border-slate-200/60 disabled:opacity-40"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition-colors">
                                <Download className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-800 group-hover:text-slate-900">
                                  Export as CSV
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Standard comma-separated text file
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              Download
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* 3. Safeguards & Preferences */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">
                          Safeguards & Preferences
                        </div>
                        <button
                          id="btn-toggle-confirm-delete"
                          type="button"
                          onClick={onToggleConfirmOnDelete}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl text-left bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer border border-slate-200"
                          title={
                            confirmOnDelete
                              ? 'Click to switch to Quick Delete (no popup)'
                              : 'Quick Delete active (1-tap with Undo)'
                          }
                        >
                          <div className="flex items-center gap-2.5">
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
                                <Zap className="w-4 h-4 text-amber-600" />
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900">
                                {confirmOnDelete ? 'Confirm Deletions: ON' : 'Quick Delete: ON'}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {confirmOnDelete
                                  ? 'Shows popup before deleting items'
                                  : 'Deletes immediately on 1 tap (with Undo)'}
                              </div>
                            </div>
                          </div>
                          {/* Interactive Toggle Switch */}
                          <div
                            className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${
                              confirmOnDelete ? 'bg-emerald-600' : 'bg-amber-500'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                                confirmOnDelete ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </div>
                        </button>

                        {/* Timezone & Date Synchronization */}
                        <button
                          id="btn-settings-open-timezone"
                          type="button"
                          onClick={() => {
                            setIsSettingsOpen(false);
                            handleOpenTimezone();
                          }}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl text-left bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer border border-slate-200 mt-2"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                              <Clock className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <span>Timezone & Date Sync</span>
                                <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-bold">
                                  {timezoneAbbr}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Fix "yesterday / 1 day before" date conflicts
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-white border border-emerald-300 px-2 py-0.5 rounded-md shadow-2xs">
                            Sync
                          </span>
                        </button>
                      </div>

                      {/* 4. Keyboard Shortcuts Reference */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex items-center justify-between">
                          <span>Keyboard Shortcuts</span>
                          <span className="text-[10px] text-emerald-700 font-semibold">100% mouse-free</span>
                        </div>
                        <div className="space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-200/80 text-xs">
                          <div className="flex items-center justify-between py-0.5">
                            <span className="text-slate-600 font-medium">Instant Search</span>
                            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white text-slate-800 rounded border border-slate-300 shadow-2xs">Alt + K</kbd>
                          </div>
                          <div className="flex items-center justify-between py-0.5">
                            <span className="text-slate-600 font-medium">Quick Sale / Modify</span>
                            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-amber-50 text-amber-900 rounded border border-amber-300 shadow-2xs">Alt + B</kbd>
                          </div>
                          <div className="flex items-center justify-between py-0.5">
                            <span className="text-slate-600 font-medium">Register New SKU</span>
                            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-emerald-50 text-emerald-900 rounded border border-emerald-300 shadow-2xs">Alt + N</kbd>
                          </div>
                          <div className="flex items-center justify-between py-0.5">
                            <span className="text-slate-600 font-medium">Navigate Results</span>
                            <span className="text-[10px] font-mono text-slate-500 font-semibold">↑ / ↓ Arrows</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Actions Header (Touch-optimized, Guaranteed Zero-Overflow) */}
            <div className="flex md:hidden items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Talk to Gemini AI on mobile */}
              {onOpenGeminiChat && (
                <button
                  id="btn-mobile-gemini-chat"
                  type="button"
                  onClick={onOpenGeminiChat}
                  className="min-h-[40px] px-2.5 py-1.5 inline-flex items-center justify-center gap-1 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 active:from-emerald-700 active:to-teal-800 rounded-xl shadow-xs cursor-pointer active:scale-95 transition-transform"
                  title="Talk with Gemini AI about your stock"
                  aria-label="Talk with Gemini AI"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>Ask AI</span>
                </button>
              )}

              {/* Active Operator Switcher on mobile (compact badge) */}
              <button
                type="button"
                onClick={onOpenOperatorModal}
                className="min-h-[40px] px-2.5 py-1.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-white text-slate-800 border border-slate-300 active:bg-slate-50 rounded-xl cursor-pointer shadow-2xs"
                title={`Active staff: ${opName}`}
                aria-label="Active staff member"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                  {opInitial}
                </div>
                <span className="max-w-[60px] truncate text-[11px] font-bold">
                  {opName}
                </span>
              </button>

              {/* Mobile Quick Menu Trigger */}
              <button
                id="btn-mobile-nav-menu"
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                title="More actions & settings"
                aria-label="Open settings and actions menu"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Hidden File Input for Import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </header>

      {/* Mobile Bottom Action Sheet / Drawer for More Options */}
      {isMobileMenuOpen && (
        <div
          id="mobile-nav-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            id="mobile-nav-sheet"
            role="dialog"
            aria-modal="true"
            className="w-full bg-white rounded-t-3xl border-t border-slate-200 p-5 pb-8 sm:pb-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-5 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Inventory Tools</h3>
                <p className="text-xs text-slate-500">Quick options & cloud storage</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full active:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Talk with Gemini AI shortcut inside mobile drawer */}
            {onOpenGeminiChat && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenGeminiChat();
                }}
                className="w-full p-3.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white rounded-2xl flex items-center justify-between shadow-xs cursor-pointer active:scale-[0.99] transition-transform text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold block text-white">
                      Talk with Gemini AI
                    </span>
                    <span className="text-xs text-emerald-100 block">
                      Ask about stock, low items, or reorders
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 bg-white/20 rounded-lg text-white shrink-0">
                  Open AI
                </span>
              </button>
            )}

            {/* Cloud DB account status in mobile sheet */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              {currentUser ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="Profile"
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover border border-emerald-500"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center">
                        {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        {currentUser.displayName || currentUser.email}
                      </span>
                      <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CloudCheck className="w-3 h-3 text-emerald-600" />
                        Persistent Cloud DB Active
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onSignOut();
                    }}
                    className="min-h-[40px] px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl cursor-pointer active:bg-rose-100 flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Cloud Firestore DB
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Sign in with Google to sync across devices
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onSignInWithGoogle();
                    }}
                    className="min-h-[40px] px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 active:bg-emerald-700 rounded-xl cursor-pointer shadow-xs shrink-0"
                  >
                    Connect
                  </button>
                </div>
              )}
            </div>

            {/* Active Staff Profile inside Drawer */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center shrink-0">
                  {opInitial}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 block truncate">
                    Staff: {opName}
                  </span>
                  <span className="text-[11px] text-emerald-800 font-semibold block">
                    Role: {opRole} • {currentOperator?.email || 'Local'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenOperatorModal();
                }}
                className="min-h-[36px] px-3 text-xs font-bold text-emerald-800 bg-white border border-emerald-300 rounded-xl cursor-pointer shadow-2xs shrink-0"
              >
                Change
              </button>
            </div>

            {/* Menu options with large 48px+ touch targets */}
            <div className="space-y-2">
              {/* Delete Confirmation Mode Preference */}
              <button
                type="button"
                onClick={() => {
                  onToggleConfirmOnDelete();
                }}
                className="w-full min-h-[50px] px-4 py-3 bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      confirmOnDelete
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {confirmOnDelete ? (
                      <ShieldAlert className="w-5 h-5" />
                    ) : (
                      <Zap className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">
                      {confirmOnDelete
                        ? 'Delete Confirmation: ON'
                        : 'Quick Delete (No Popups): ON'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {confirmOnDelete
                        ? 'Shows confirmation popup before deleting items'
                        : 'Deletes immediately on 1 tap (with instant Undo)'}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    confirmOnDelete
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-amber-200/80 text-amber-900'
                  }`}
                >
                  {confirmOnDelete ? 'Popup On' : 'Quick Mode'}
                </span>
              </button>

              {/* Timezone / Date Synchronization */}
              <button
                id="btn-mobile-open-timezone"
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleOpenTimezone();
                }}
                className="w-full min-h-[50px] px-4 py-3 bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Timezone & Date Sync</span>
                      <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                        {timezoneAbbr}
                      </span>
                    </span>
                    <span className="text-xs text-slate-500">
                      Fix date conflict (Pakistani / MY / local time)
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-700 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
                  Change
                </span>
              </button>

              {/* Multi-Item Order Dispatch & Delivery Challan */}
              {onOpenDispatchOrder && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenDispatchOrder();
                  }}
                  className="w-full min-h-[50px] px-4 py-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-2 border-emerald-500/30 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                      <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">
                        Dispatch Order & Challan
                      </span>
                      <span className="text-xs text-slate-500">
                        Multi-item orders & goods dispatch notes
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-800 px-2.5 py-1 bg-emerald-100 rounded-lg">
                    Dispatch
                  </span>
                </button>
              )}

              {/* Receive Stock & Goods Inward */}
              {onOpenReceiveStock && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenReceiveStock();
                  }}
                  className="w-full min-h-[50px] px-4 py-3 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 border-2 border-indigo-500/30 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                      <PackageCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">
                        Receive Stock (GRN)
                      </span>
                      <span className="text-xs text-slate-500">
                        Receive goods from vendors & increment stock
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-indigo-800 px-2.5 py-1 bg-indigo-100 rounded-lg">
                    Receive
                  </span>
                </button>
              )}

              {/* Audit Trail / Activity Log */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenAuditTrail();
                }}
                className="w-full min-h-[50px] px-4 py-3 bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">
                      Audit Trail & History
                    </span>
                    <span className="text-xs text-slate-500">
                      View log of items added, changed, or removed
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-indigo-700 px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-lg">
                  View Log
                </span>
              </button>

              {/* Units Management */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenUnitModal();
                }}
                className="w-full min-h-[50px] px-4 py-3 bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">
                      Manage Units
                    </span>
                    <span className="text-xs text-slate-500">
                      Add, rename, or delete measurement units
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-600 px-2.5 py-1 bg-slate-200/70 rounded-lg">
                  Edit
                </span>
              </button>

              {/* Customer & Party Registry */}
              {onOpenCustomerModal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenCustomerModal();
                  }}
                  className="w-full min-h-[50px] px-4 py-3 bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">
                        Customer & Party Registry
                      </span>
                      <span className="text-xs text-slate-500">
                        Manage registered client parties and addresses
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-sky-700 px-2.5 py-1 bg-sky-50 border border-sky-200 rounded-lg">
                    {customerCount !== undefined ? `${customerCount} Parties` : 'Directory'}
                  </span>
                </button>
              )}

              {/* Tags Management */}
              {handleOpenTags && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleOpenTags();
                  }}
                  className="w-full min-h-[50px] px-4 py-3 bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                      <Tag className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">
                        Manage Tags
                      </span>
                      <span className="text-xs text-slate-500">
                        Create, color-code, or delete product tags
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-teal-700 px-2.5 py-1 bg-teal-50 border border-teal-200 rounded-lg">
                    Manage
                  </span>
                </button>
              )}

              {/* Import Excel / CSV */}
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="w-full min-h-[50px] px-4 py-3 bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">
                      Import Inventory
                    </span>
                    <span className="text-xs text-slate-500">
                      Upload .xlsx or .csv spreadsheet
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-600 px-2.5 py-1 bg-slate-200/70 rounded-lg">
                  Upload
                </span>
              </button>

              {/* Export CSV */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onExportCsv();
                }}
                disabled={itemCount === 0}
                className="w-full min-h-[50px] px-4 py-3 bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer disabled:opacity-40"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-800 flex items-center justify-center">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">
                      Export as CSV
                    </span>
                    <span className="text-xs text-slate-500">
                      Standard comma-separated format
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-600 px-2.5 py-1 bg-slate-200/70 rounded-lg">
                  Download
                </span>
              </button>
            </div>

            {/* Quick Add Button inside sheet */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onAddNewItem();
                }}
                className="w-full min-h-[48px] px-4 py-3 bg-emerald-600 active:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Stock Item</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timezone Selector Modal (if triggered internally) */}
      <TimezoneSelectorModal
        isOpen={internalTimezoneOpen}
        onClose={() => setInternalTimezoneOpen(false)}
      />
    </>
  );
};

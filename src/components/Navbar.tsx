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
} from 'lucide-react';
import type { User as FirebaseUser } from '../lib/firebase';
import { OperatorProfile, StockItem } from '../types';

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
}) => {
  const rawName = currentOperator?.name || 'Waqas';
  const opName = rawName.replace(/\s*\(Admin\)/gi, '').trim() || 'Waqas';
  const opInitial = opName.charAt(0).toUpperCase() || 'W';
  const rawRole = currentOperator?.role || 'Team Member';
  const opRole = /admin|manager/i.test(rawRole) ? 'Team Member' : rawRole;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsMobileMenuOpen(false);
    }
  };

  // Close menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
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
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
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
                  {currentUser ? (
                    <span
                      title="Connected to persistent Cloud Firestore Database"
                      className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
                    >
                      <CloudCheck className="w-3 h-3 text-emerald-600" />
                      <span>Cloud DB</span>
                    </span>
                  ) : (
                    <span
                      title="Using local browser storage. Sign in with Google to enable Cloud Database."
                      className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300"
                    >
                      <Database className="w-3 h-3 text-slate-500" />
                      <span>Local Storage</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} in inventory • Individual low stock alerts
                </p>
              </div>
            </div>

            {/* Desktop and Tablet Action Tools */}
            <div className="hidden md:flex items-center gap-2 sm:gap-2.5">
              {/* Active Staff / Operator Attribution Switcher */}
              <button
                id="btn-active-operator"
                type="button"
                onClick={onOpenOperatorModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors cursor-pointer shadow-2xs"
                title="Change active staff name for inventory modifications and audit trail"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                  {opInitial}
                </div>
                <span className="truncate max-w-[110px] text-slate-900">
                  {opName}
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 hidden lg:inline">
                  {opRole}
                </span>
              </button>

              {/* Cloud DB & User Sign-In / Account */}
              {isAuthLoading ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  <span>Checking DB...</span>
                </div>
              ) : currentUser ? (
                <div className="flex items-center gap-1.5 bg-emerald-50/70 border border-emerald-200 pl-2 pr-1 py-1 rounded-xl">
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
                  <span className="text-xs font-semibold text-emerald-900 truncate max-w-[110px]">
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
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors cursor-pointer shadow-2xs"
                  title="Sign in with Google to enable permanent Cloud Firestore database storage"
                >
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Connect Cloud DB</span>
                </button>
              )}

              {/* Confirm Deletions Preference Toggle */}
              <button
                id="btn-toggle-confirm-delete"
                type="button"
                onClick={onToggleConfirmOnDelete}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                  confirmOnDelete
                    ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    : 'bg-amber-50/80 text-amber-900 border-amber-200 hover:bg-amber-100'
                }`}
                title={
                  confirmOnDelete
                    ? 'Click to switch to Quick Delete (no popup)'
                    : 'Quick Delete active (no popup, 1-tap delete with Undo)'
                }
              >
                {confirmOnDelete ? (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                    <span>Confirm Popup: On</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-bold">Quick Delete: On</span>
                  </>
                )}
              </button>

              {/* Activity Trail / Log */}
              <button
                id="btn-open-audit-trail"
                type="button"
                onClick={onOpenAuditTrail}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                title="View full inventory activity trail (added, removed, changed items)"
              >
                <History className="w-3.5 h-3.5 text-indigo-600" />
                <span>Audit Trail</span>
              </button>

              {/* Units */}
              <button
                id="btn-open-unit-manager"
                type="button"
                onClick={onOpenUnitModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Manage measurement units"
              >
                <Scale className="w-3.5 h-3.5 text-slate-500" />
                <span>Units</span>
              </button>

              {/* Import */}
              <button
                id="btn-import-stock-file"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                title="Import items from Excel or CSV"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Import</span>
              </button>

              {/* Export Excel */}
              <button
                id="btn-export-excel-primary"
                type="button"
                onClick={onExportExcel}
                disabled={itemCount === 0}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer"
                title="Download Excel spreadsheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </button>

              {/* Talk to Gemini AI Desktop Button */}
              {onOpenGeminiChat && (
                <button
                  id="btn-navbar-gemini-chat"
                  type="button"
                  onClick={onOpenGeminiChat}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl shadow-xs transition-all cursor-pointer ring-1 ring-emerald-500/30"
                  title="Talk with Gemini AI about your stock"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>Talk to AI</span>
                </button>
              )}

              {/* Add Item Desktop Button */}
              <button
                id="btn-navbar-add-item"
                type="button"
                onClick={onAddNewItem}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                title="Add new stock item"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Mobile Actions Header (Touch-optimized, Guaranteed Zero-Overflow) */}
            <div className="flex md:hidden items-center gap-1.5 shrink-0">
              {/* Talk to Gemini AI on mobile */}
              {onOpenGeminiChat && (
                <button
                  id="btn-mobile-gemini-chat"
                  type="button"
                  onClick={onOpenGeminiChat}
                  className="min-h-[38px] px-2.5 py-1.5 inline-flex items-center justify-center gap-1 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl shadow-xs cursor-pointer active:scale-95 transition-transform"
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
                className="min-h-[38px] px-2 py-1.5 inline-flex items-center justify-center gap-1 text-xs font-bold bg-white text-slate-800 border border-slate-300 rounded-xl cursor-pointer shadow-2xs active:bg-slate-50"
                title={`Active staff: ${opName}`}
                aria-label="Active staff member"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                  {opInitial}
                </div>
                <span className="max-w-[50px] truncate text-[11px] font-bold">
                  {opName}
                </span>
              </button>

              {/* Mobile Quick Menu Trigger */}
              <button
                id="btn-mobile-nav-menu"
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-700 bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                title="More actions"
                aria-label="Open actions menu"
              >
                <MoreVertical className="w-4 h-4" />
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
            className="w-full bg-white rounded-t-3xl border-t border-slate-200 p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-5 duration-200"
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
    </>
  );
};

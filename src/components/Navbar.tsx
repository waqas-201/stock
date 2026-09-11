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
} from 'lucide-react';

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
}) => {
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
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                    Stock Management
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} in inventory • Per-item low stock alerts
                </p>
              </div>
            </div>

            {/* Desktop and Tablet Action Tools */}
            <div className="hidden md:flex items-center gap-2 sm:gap-2.5">
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

            {/* Mobile Actions Header (Touch-optimized buttons) */}
            <div className="flex md:hidden items-center gap-1.5 shrink-0">
              {/* Quick Delete Indicator / Toggle Button on mobile */}
              <button
                type="button"
                onClick={onToggleConfirmOnDelete}
                className={`min-h-[44px] px-2.5 py-1.5 inline-flex items-center justify-center gap-1 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                  confirmOnDelete
                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                    : 'bg-amber-50 text-amber-900 border-amber-300'
                }`}
                title={
                  confirmOnDelete
                    ? 'Delete confirmation popup is ON. Tap to switch to Quick Delete.'
                    : 'Quick Delete is ON (No popup). Tap to turn on confirmation popup.'
                }
                aria-label="Toggle delete confirmation choice"
              >
                {confirmOnDelete ? (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[11px]">Ask</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[11px] font-bold">Fast</span>
                  </>
                )}
              </button>

              {/* Quick Excel Export on mobile */}
              <button
                type="button"
                onClick={onExportExcel}
                disabled={itemCount === 0}
                className="min-h-[44px] min-w-[44px] px-2.5 py-2 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 rounded-xl shadow-xs cursor-pointer"
                title="Export Excel"
                aria-label="Export Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="font-semibold text-xs">Excel</span>
              </button>

              {/* Mobile Quick Menu Trigger */}
              <button
                id="btn-mobile-nav-menu"
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-700 bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                title="More actions"
                aria-label="Open actions menu"
              >
                <MoreVertical className="w-5 h-5" />
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
                <p className="text-xs text-slate-500">Quick options and settings</p>
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

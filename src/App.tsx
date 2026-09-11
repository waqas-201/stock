import React, { useState, useEffect } from 'react';
import { StockItem, StockUnit, StockFilter } from './types';
import {
  loadStoredStock,
  saveStoredStock,
  loadLowStockThreshold,
  saveLowStockThreshold,
  generateItemId,
} from './lib/stockStorage';
import {
  loadManagedUnits,
  saveManagedUnits,
  DEFAULT_UNITS,
} from './lib/unitStorage';
import {
  exportToExcel,
  exportToCsv,
  parseExcelOrCsvFile,
} from './lib/excelExport';

// Components
import { Navbar } from './components/Navbar';
import { StockSummary } from './components/StockSummary';
import { StockTable } from './components/StockTable';
import { AddItemModal } from './components/AddItemModal';
import { EditItemModal } from './components/EditItemModal';
import { UnitManagementModal } from './components/UnitManagementModal';
import { ThresholdSettingsModal } from './components/ThresholdSettingsModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { CheckCircle2, AlertCircle, Info, X, Plus } from 'lucide-react';

export function App() {
  // App states
  const [items, setItems] = useState<StockItem[]>(() => loadStoredStock());
  const [units, setUnits] = useState<StockUnit[]>(() => loadManagedUnits());
  const [globalThreshold, setGlobalThreshold] = useState<number>(() =>
    loadLowStockThreshold()
  );
  const [activeFilter, setActiveFilter] = useState<StockFilter>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Persist items
  const updateItems = (newItems: StockItem[]) => {
    setItems(newItems);
    saveStoredStock(newItems);
  };

  // Persist units
  const updateUnits = (newUnits: StockUnit[]) => {
    setUnits(newUnits);
    saveManagedUnits(newUnits);
  };

  // Persist threshold
  const handleSaveThreshold = (newThreshold: number) => {
    setGlobalThreshold(newThreshold);
    saveLowStockThreshold(newThreshold);
    showToast(`Low stock alert threshold set to ≤ ${newThreshold} units`, 'success');
  };

  // Unit management actions
  const handleAddUnit = (name: string, code?: string) => {
    const newUnit: StockUnit = {
      id: 'u_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name,
      code,
      isDefault: false,
    };
    const next = [...units, newUnit];
    updateUnits(next);
    showToast(`Added unit "${name}"`, 'success');
  };

  const handleUpdateUnit = (id: string, name: string, code?: string) => {
    const next = units.map((u) =>
      u.id === id ? { ...u, name, code } : u
    );
    updateUnits(next);
    showToast(`Updated unit to "${name}"`, 'success');
  };

  const handleDeleteUnit = (id: string) => {
    const target = units.find((u) => u.id === id);
    if (!target) return;

    // Check if any items use this unit
    const usedBy = items.filter((i) => i.unit === target.name);
    if (usedBy.length > 0) {
      showToast(`Cannot delete "${target.name}": used by ${usedBy.length} items.`, 'error');
      return;
    }

    const next = units.filter((u) => u.id !== id);
    updateUnits(next);
    showToast(`Unit "${target.name}" removed`, 'info');
  };

  const handleResetUnits = () => {
    updateUnits(DEFAULT_UNITS);
    showToast('Reset units to default list', 'info');
  };

  // Stock items actions
  const handleAddItem = (
    itemName: string,
    unit: string,
    quantity: number,
    threshold?: number
  ) => {
    const newItem: StockItem = {
      id: generateItemId(),
      itemName,
      unit,
      quantity,
      lowStockThreshold: threshold,
      updatedAt: new Date().toISOString(),
    };

    const next = [newItem, ...items];
    updateItems(next);
    showToast(`Added "${itemName}" with ${quantity} ${unit}`, 'success');
  };

  const handleSaveEditItem = (
    id: string,
    itemName: string,
    unit: string,
    quantity: number,
    threshold?: number
  ) => {
    const next = items.map((i) =>
      i.id === id
        ? {
            ...i,
            itemName,
            unit,
            quantity,
            lowStockThreshold: threshold,
            updatedAt: new Date().toISOString(),
          }
        : i
    );
    updateItems(next);
    showToast(`Updated "${itemName}"`, 'success');
  };

  const handleDeleteItemConfirm = () => {
    if (!itemToDelete) return;
    const next = items.filter((i) => i.id !== itemToDelete.id);
    updateItems(next);
    showToast(`Removed "${itemToDelete.itemName}"`, 'info');
    setItemToDelete(null);
  };

  const handleQuickQuantityChange = (item: StockItem, delta: number) => {
    const newQty = Math.max(0, (item.quantity || 0) + delta);
    const next = items.map((i) =>
      i.id === item.id
        ? {
            ...i,
            quantity: newQty,
            updatedAt: new Date().toISOString(),
          }
        : i
    );
    updateItems(next);
  };

  // File export & import
  const handleExportExcel = () => {
    if (items.length === 0) {
      showToast('No items to export.', 'info');
      return;
    }
    exportToExcel(items, 'stock-inventory.xlsx');
    showToast('Excel file exported successfully', 'success');
  };

  const handleExportCsv = () => {
    if (items.length === 0) {
      showToast('No items to export.', 'info');
      return;
    }
    exportToCsv(items, 'stock-inventory.csv');
    showToast('CSV file exported successfully', 'success');
  };

  const handleImportFile = async (file: File) => {
    try {
      const parsed = await parseExcelOrCsvFile(file);
      if (parsed.length === 0) {
        showToast('No valid items found in the uploaded file.', 'error');
        return;
      }

      const newItems: StockItem[] = parsed.map((p) => ({
        id: generateItemId(),
        itemName: p.itemName,
        unit: p.unit || 'Pieces',
        quantity: p.quantity,
        updatedAt: new Date().toISOString(),
      }));

      // Combine with existing items
      const combined = [...newItems, ...items];
      updateItems(combined);
      showToast(`Imported ${newItems.length} items from ${file.name}`, 'success');
    } catch (err: any) {
      console.error('File import error:', err);
      showToast('Failed to import file. Please check format.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col antialiased selection:bg-emerald-100 selection:text-emerald-900 pb-20 sm:pb-8">
      {/* Toast Notification - Mobile Friendly */}
      {toast && (
        <div className="fixed top-3 inset-x-3 sm:inset-x-auto sm:top-5 sm:right-5 z-50 animate-in slide-in-from-top-3 duration-200 pointer-events-none">
          <div
            className={`pointer-events-auto px-4 py-3 rounded-2xl shadow-xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold max-w-md mx-auto sm:mx-0 ${
              toast.type === 'success'
                ? 'bg-emerald-950 text-emerald-50 border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-950 text-rose-50 border-rose-700'
                : 'bg-slate-900 text-slate-50 border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-blue-400 shrink-0" />
              )}
              <span className="truncate">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="min-h-[32px] min-w-[32px] flex items-center justify-center text-white/60 hover:text-white cursor-pointer -mr-1"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        itemCount={items.length}
        globalThreshold={globalThreshold}
        onExportExcel={handleExportExcel}
        onExportCsv={handleExportCsv}
        onImportFile={handleImportFile}
        onOpenUnitModal={() => setIsUnitModalOpen(true)}
        onOpenThresholdModal={() => setIsThresholdModalOpen(true)}
        onAddNewItem={() => setIsAddModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-7 space-y-4 sm:space-y-6">
        {/* KPI / Stock Metrics (Tap to filter) */}
        <StockSummary
          items={items}
          globalThreshold={globalThreshold}
          activeFilter={activeFilter}
          onSelectFilter={setActiveFilter}
          onOpenThresholdModal={() => setIsThresholdModalOpen(true)}
        />

        {/* Stock Inventory List & Table */}
        <StockTable
          items={items}
          globalThreshold={globalThreshold}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onAddItem={() => setIsAddModalOpen(true)}
          onEditItem={(item) => setEditingItem(item)}
          onDeleteItem={(item) => setItemToDelete(item)}
          onQuickQuantityChange={handleQuickQuantityChange}
          onExportExcel={handleExportExcel}
          onOpenThresholdModal={() => setIsThresholdModalOpen(true)}
        />
      </main>

      {/* Mobile Floating Action Button (FAB) for 1-Tap Thumb Addition */}
      <button
        id="btn-mobile-fab-add"
        type="button"
        onClick={() => setIsAddModalOpen(true)}
        className="sm:hidden fixed bottom-5 right-4 z-40 min-h-[52px] px-4 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold shadow-xl shadow-emerald-950/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer border border-emerald-500"
        aria-label="Add new item"
      >
        <Plus className="w-5 h-5" />
        <span className="text-sm font-bold pr-1">Add Item</span>
      </button>

      {/* Modals */}
      <AddItemModal
        isOpen={isAddModalOpen}
        units={units}
        defaultThreshold={globalThreshold}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddItem}
        onOpenUnitModal={() => setIsUnitModalOpen(true)}
      />

      <EditItemModal
        isOpen={!!editingItem}
        item={editingItem}
        units={units}
        defaultThreshold={globalThreshold}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEditItem}
        onOpenUnitModal={() => setIsUnitModalOpen(true)}
      />

      <UnitManagementModal
        isOpen={isUnitModalOpen}
        units={units}
        onClose={() => setIsUnitModalOpen(false)}
        onAddUnit={handleAddUnit}
        onUpdateUnit={handleUpdateUnit}
        onDeleteUnit={handleDeleteUnit}
        onResetUnits={handleResetUnits}
      />

      <ThresholdSettingsModal
        isOpen={isThresholdModalOpen}
        currentThreshold={globalThreshold}
        onClose={() => setIsThresholdModalOpen(false)}
        onSaveThreshold={handleSaveThreshold}
      />

      <ConfirmDialog
        isOpen={!!itemToDelete}
        title="Delete Stock Item"
        message={`Are you sure you want to remove "${itemToDelete?.itemName}" from your inventory? This action cannot be undone.`}
        confirmLabel="Delete Item"
        cancelLabel="Keep Item"
        isDestructive={true}
        onConfirm={handleDeleteItemConfirm}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}

export default App;

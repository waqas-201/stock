import React, { useState, useEffect } from 'react';
import { StockItem, StockUnit, StockFilter } from './types';
import {
  loadStoredStock,
  saveStoredStock,
  loadConfirmOnDelete,
  saveConfirmOnDelete,
  generateItemId,
  loadGlobalAuditLog,
  saveGlobalAuditLog,
  appendGlobalAuditLog,
  createAuditEntry,
  GlobalAuditRecord,
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
import { ItemDetailsModal } from './components/ItemDetailsModal';
import { AuditTrailModal } from './components/AuditTrailModal';
import { UnitManagementModal } from './components/UnitManagementModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { CheckCircle2, AlertCircle, Info, X, Plus, RotateCcw } from 'lucide-react';

export function App() {
  // App states
  const [items, setItems] = useState<StockItem[]>(() => loadStoredStock());
  const [units, setUnits] = useState<StockUnit[]>(() => loadManagedUnits());
  const [activeFilter, setActiveFilter] = useState<StockFilter>('all');
  const [globalLogs, setGlobalLogs] = useState<GlobalAuditRecord[]>(() =>
    loadGlobalAuditLog()
  );

  // User choice: whether to show confirmation dialog before deleting items
  const [confirmOnDelete, setConfirmOnDelete] = useState<boolean>(() =>
    loadConfirmOnDelete()
  );

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [selectedItemForDetails, setSelectedItemForDetails] =
    useState<StockItem | null>(null);
  const [isAuditTrailModalOpen, setIsAuditTrailModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);
  const [dontAskAgainInDialog, setDontAskAgainInDialog] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);

  // Notification Toast with optional Action (e.g. Undo)
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  } | null>(null);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success',
    action?: { label: string; onClick: () => void }
  ) => {
    setToast({ message, type, action });
  };

  useEffect(() => {
    if (!toast) return;
    // Longer timer (5.5s) if there is an undo action
    const duration = toast.action ? 5500 : 3500;
    const timer = setTimeout(() => setToast(null), duration);
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

  // Toggle delete confirmation preference
  const handleToggleConfirmOnDelete = () => {
    const next = !confirmOnDelete;
    setConfirmOnDelete(next);
    saveConfirmOnDelete(next);
    showToast(
      next
        ? 'Delete confirmation popup enabled (will ask before deleting)'
        : 'Quick Delete enabled (1-tap delete without popup + Undo)',
      'info'
    );
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

  // Stock items actions with production date, notes, and complete audit trail
  const handleAddItem = (
    itemName: string,
    unit: string,
    quantity: number,
    lowStockThreshold: number,
    productionDate?: string,
    notes?: string
  ) => {
    const now = new Date().toISOString();
    const auditEntry = createAuditEntry(
      'created',
      'Item added to inventory',
      `Initial stock: ${quantity} ${unit}, Alert threshold: ≤ ${lowStockThreshold}${
        productionDate ? `, Production Date: ${productionDate}` : ''
      }${notes ? `, Notes: ${notes}` : ''}`,
      undefined,
      quantity
    );

    const newItem: StockItem = {
      id: generateItemId(),
      itemName,
      unit,
      quantity,
      lowStockThreshold,
      productionDate,
      notes,
      createdAt: now,
      updatedAt: now,
      auditTrail: [auditEntry],
    };

    const next = [newItem, ...items];
    updateItems(next);

    // Global audit trail recording
    const globalEntry = appendGlobalAuditLog({
      ...auditEntry,
      itemId: newItem.id,
      itemName: newItem.itemName,
      unit: newItem.unit,
    });
    setGlobalLogs((prev) => [globalEntry, ...prev]);

    showToast(
      `Added "${itemName}" (Stock: ${quantity} ${unit}, Alert ≤ ${lowStockThreshold})`,
      'success'
    );
  };

  const handleSaveEditItem = (
    id: string,
    itemName: string,
    unit: string,
    quantity: number,
    lowStockThreshold: number,
    productionDate?: string,
    notes?: string
  ) => {
    const current = items.find((i) => i.id === id);
    if (!current) return;

    const changes: string[] = [];
    if (current.itemName !== itemName) {
      changes.push(`Name: "${current.itemName}" → "${itemName}"`);
    }
    if (current.unit !== unit) {
      changes.push(`Unit: ${current.unit} → ${unit}`);
    }
    if (current.quantity !== quantity) {
      changes.push(`Stock: ${current.quantity} → ${quantity}`);
    }
    if (current.lowStockThreshold !== lowStockThreshold) {
      changes.push(
        `Alert limit: ≤${current.lowStockThreshold ?? 5} → ≤${lowStockThreshold}`
      );
    }
    if (current.productionDate !== productionDate) {
      changes.push(
        `Prod Date: ${current.productionDate || 'None'} → ${
          productionDate || 'None'
        }`
      );
    }
    if (current.notes !== notes) {
      changes.push(notes ? 'Notes updated' : 'Notes cleared');
    }

    const auditEntry = createAuditEntry(
      'edited',
      changes.length > 0 ? `Item details modified` : `Item saved without changes`,
      changes.length > 0 ? changes.join(' • ') : undefined,
      current.quantity,
      quantity
    );

    const updatedTrail = [auditEntry, ...(current.auditTrail || [])];

    const next = items.map((i) =>
      i.id === id
        ? {
            ...i,
            itemName,
            unit,
            quantity,
            lowStockThreshold,
            productionDate,
            notes,
            updatedAt: new Date().toISOString(),
            auditTrail: updatedTrail,
          }
        : i
    );
    updateItems(next);

    // Global audit trail recording
    const globalEntry = appendGlobalAuditLog({
      ...auditEntry,
      itemId: id,
      itemName,
      unit,
    });
    setGlobalLogs((prev) => [globalEntry, ...prev]);

    // Update details modal if currently open on this item
    if (selectedItemForDetails && selectedItemForDetails.id === id) {
      setSelectedItemForDetails({
        ...selectedItemForDetails,
        itemName,
        unit,
        quantity,
        lowStockThreshold,
        productionDate,
        notes,
        auditTrail: updatedTrail,
      });
    }

    showToast(`Updated "${itemName}"`, 'success');
  };

  // Core delete execution with instant 1-tap Undo support and audit logging
  const executeDelete = (item: StockItem) => {
    const itemIndex = items.findIndex((i) => i.id === item.id);
    const next = items.filter((i) => i.id !== item.id);
    updateItems(next);

    if (selectedItemForDetails?.id === item.id) {
      setSelectedItemForDetails(null);
    }

    // Log deletion in global audit trail so it's always traceable
    const deleteEntry = appendGlobalAuditLog({
      action: 'deleted',
      summary: `Removed item "${item.itemName}" from inventory`,
      details: `Had ${item.quantity} ${item.unit} when deleted (Alert limit was ≤ ${
        item.lowStockThreshold ?? 5
      })`,
      previousQuantity: item.quantity,
      newQuantity: 0,
      delta: -item.quantity,
      itemId: item.id,
      itemName: item.itemName,
      unit: item.unit,
    });
    setGlobalLogs((prev) => [deleteEntry, ...prev]);

    // Provide immediate Undo action
    showToast(`Removed "${item.itemName}"`, 'info', {
      label: 'Undo',
      onClick: () => {
        setItems((currentItems) => {
          const restored = [...currentItems];
          if (itemIndex >= 0 && itemIndex <= restored.length) {
            restored.splice(itemIndex, 0, item);
          } else {
            restored.unshift(item);
          }
          saveStoredStock(restored);
          return restored;
        });

        // Record restoration in global audit trail
        const restoreEntry = appendGlobalAuditLog({
          action: 'restored',
          summary: `Restored "${item.itemName}" back to inventory`,
          details: `Restored with ${item.quantity} ${item.unit}`,
          previousQuantity: 0,
          newQuantity: item.quantity,
          delta: item.quantity,
          itemId: item.id,
          itemName: item.itemName,
          unit: item.unit,
        });
        setGlobalLogs((prev) => [restoreEntry, ...prev]);

        showToast(`Restored "${item.itemName}"`, 'success');
      },
    });
  };

  // Handle user clicking delete on an item
  const handleDeleteItemClick = (item: StockItem) => {
    if (confirmOnDelete) {
      setDontAskAgainInDialog(false);
      setItemToDelete(item);
    } else {
      executeDelete(item);
    }
  };

  // Confirm delete from dialog
  const handleDeleteItemConfirm = () => {
    if (!itemToDelete) return;
    const item = itemToDelete;
    setItemToDelete(null);

    // If user checked "Don't ask again" in the dialog, persist their choice
    if (dontAskAgainInDialog) {
      setConfirmOnDelete(false);
      saveConfirmOnDelete(false);
    }

    executeDelete(item);
  };

  const handleQuickQuantityChange = (item: StockItem, delta: number) => {
    const newQty = Math.max(0, (item.quantity || 0) + delta);
    if (newQty === item.quantity) return;

    const auditEntry = createAuditEntry(
      'quantity_changed',
      delta > 0
        ? `Stock increased (+${delta} ${item.unit})`
        : `Stock reduced (${delta} ${item.unit})`,
      `Quantity changed from ${item.quantity} to ${newQty} ${item.unit}`,
      item.quantity,
      newQty
    );

    const updatedTrail = [auditEntry, ...(item.auditTrail || [])];

    const next = items.map((i) =>
      i.id === item.id
        ? {
            ...i,
            quantity: newQty,
            updatedAt: new Date().toISOString(),
            auditTrail: updatedTrail,
          }
        : i
    );
    updateItems(next);

    // Global audit trail recording
    const globalEntry = appendGlobalAuditLog({
      ...auditEntry,
      itemId: item.id,
      itemName: item.itemName,
      unit: item.unit,
    });
    setGlobalLogs((prev) => [globalEntry, ...prev]);

    // Update details modal if open
    if (selectedItemForDetails && selectedItemForDetails.id === item.id) {
      setSelectedItemForDetails({
        ...selectedItemForDetails,
        quantity: newQty,
        auditTrail: updatedTrail,
      });
    }
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

      const now = new Date().toISOString();
      const newItems: StockItem[] = parsed.map((p) => {
        const id = generateItemId();
        const auditEntry = createAuditEntry(
          'created',
          'Item imported from file',
          `Imported from ${file.name} with quantity ${p.quantity} ${p.unit}`,
          undefined,
          p.quantity
        );

        return {
          id,
          itemName: p.itemName,
          unit: p.unit || 'Pieces',
          quantity: p.quantity,
          lowStockThreshold: p.lowStockThreshold ?? 5,
          productionDate: p.productionDate,
          notes: p.notes,
          createdAt: now,
          updatedAt: now,
          auditTrail: [auditEntry],
        };
      });

      // Combine with existing items
      const combined = [...newItems, ...items];
      updateItems(combined);

      // Append import record to global audit log
      const logEntry = appendGlobalAuditLog({
        action: 'created',
        summary: `Imported ${newItems.length} items from ${file.name}`,
        details: `Batch file import completed`,
        itemId: 'batch_import_' + Date.now(),
        itemName: `${newItems.length} items`,
        unit: 'Batch',
      });
      setGlobalLogs((prev) => [logEntry, ...prev]);

      showToast(`Imported ${newItems.length} items from ${file.name}`, 'success');
    } catch (err: any) {
      console.error('File import error:', err);
      showToast('Failed to import file. Please check format.', 'error');
    }
  };

  const handleClearGlobalLogs = () => {
    saveGlobalAuditLog([]);
    setGlobalLogs([]);
    showToast('Audit trail history cleared', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col antialiased selection:bg-emerald-100 selection:text-emerald-900 pb-20 sm:pb-8">
      {/* Toast Notification with Undo - Mobile Friendly */}
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
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span className="truncate">{toast.message}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Undo Button */}
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    setToast(null);
                  }}
                  className="min-h-[30px] px-2.5 py-1 text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{toast.action.label}</span>
                </button>
              )}

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
        </div>
      )}

      {/* Main Navbar with Delete Confirmation Choice and Audit Trail */}
      <Navbar
        itemCount={items.length}
        confirmOnDelete={confirmOnDelete}
        onToggleConfirmOnDelete={handleToggleConfirmOnDelete}
        onExportExcel={handleExportExcel}
        onExportCsv={handleExportCsv}
        onImportFile={handleImportFile}
        onOpenUnitModal={() => setIsUnitModalOpen(true)}
        onAddNewItem={() => setIsAddModalOpen(true)}
        onOpenAuditTrail={() => setIsAuditTrailModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-7 space-y-4 sm:space-y-6">
        {/* KPI / Stock Metrics (Tap to filter) */}
        <StockSummary
          items={items}
          activeFilter={activeFilter}
          onSelectFilter={setActiveFilter}
        />

        {/* Stock Inventory List & Table with Metadata & Trail view */}
        <StockTable
          items={items}
          activeFilter={activeFilter}
          confirmOnDelete={confirmOnDelete}
          onToggleConfirmOnDelete={handleToggleConfirmOnDelete}
          onFilterChange={setActiveFilter}
          onAddItem={() => setIsAddModalOpen(true)}
          onEditItem={(item) => setEditingItem(item)}
          onDeleteItem={handleDeleteItemClick}
          onQuickQuantityChange={handleQuickQuantityChange}
          onExportExcel={handleExportExcel}
          onViewItemDetails={(item) => setSelectedItemForDetails(item)}
          onOpenAuditTrail={() => setIsAuditTrailModalOpen(true)}
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
      {/* 1. Add Item Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        units={units}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddItem}
        onOpenUnitModal={() => setIsUnitModalOpen(true)}
      />

      {/* 2. Edit Item Modal */}
      <EditItemModal
        isOpen={!!editingItem}
        item={editingItem}
        units={units}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEditItem}
        onOpenUnitModal={() => setIsUnitModalOpen(true)}
      />

      {/* 3. Item Details & Complete Audit Trail Modal */}
      <ItemDetailsModal
        isOpen={!!selectedItemForDetails}
        item={selectedItemForDetails}
        onClose={() => setSelectedItemForDetails(null)}
        onEdit={(item) => {
          setSelectedItemForDetails(null);
          setEditingItem(item);
        }}
        onQuickQuantityChange={handleQuickQuantityChange}
      />

      {/* 4. Global Inventory Audit Trail & Activity Log Modal */}
      <AuditTrailModal
        isOpen={isAuditTrailModalOpen}
        onClose={() => setIsAuditTrailModalOpen(false)}
        logs={globalLogs}
        onClearLogs={handleClearGlobalLogs}
      />

      {/* 5. Units Manager Modal */}
      <UnitManagementModal
        isOpen={isUnitModalOpen}
        units={units}
        onClose={() => setIsUnitModalOpen(false)}
        onAddUnit={handleAddUnit}
        onUpdateUnit={handleUpdateUnit}
        onDeleteUnit={handleDeleteUnit}
        onResetUnits={handleResetUnits}
      />

      {/* 6. Confirmation Dialog with "Don't ask again" choice */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        title="Delete Stock Item"
        message={`Are you sure you want to remove "${itemToDelete?.itemName}"? You can also switch to Quick Delete mode to delete items without this dialog.`}
        confirmLabel="Delete Item"
        cancelLabel="Keep Item"
        isDestructive={true}
        showDontAskAgain={true}
        dontAskAgain={dontAskAgainInDialog}
        onToggleDontAskAgain={setDontAskAgainInDialog}
        onConfirm={handleDeleteItemConfirm}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}

export default App;

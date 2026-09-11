import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  Plus,
  Scale,
} from 'lucide-react';
import { StockItem, StockUnit, AppLanguage } from './types';
import {
  loadStoredStock,
  saveStoredStock,
  generateItemId,
  INITIAL_STOCK_ITEMS,
} from './lib/stockStorage';
import {
  loadManagedUnits,
  saveManagedUnits,
  DEFAULT_PAKISTANI_UNITS,
} from './lib/unitStorage';
import {
  exportToExcel,
  exportToCsv,
  parseExcelOrCsvFile,
} from './lib/excelExport';
import { URDU_STRINGS, ENGLISH_STRINGS } from './lib/translations';
import { Navbar } from './components/Navbar';
import { StockSummary } from './components/StockSummary';
import { StockTable } from './components/StockTable';
import { AddItemModal } from './components/AddItemModal';
import { EditItemModal } from './components/EditItemModal';
import { UnitManagementModal } from './components/UnitManagementModal';
import { ConfirmDialog } from './components/ConfirmDialog';

const LANG_STORAGE_KEY = 'stock_mgmt_app_lang';

export default function App() {
  // Pakistani Urdu by default
  const [lang, setLang] = useState<AppLanguage>(() => {
    return (localStorage.getItem(LANG_STORAGE_KEY) as AppLanguage) || 'ur';
  });

  const t = lang === 'ur' ? URDU_STRINGS : ENGLISH_STRINGS;

  // Stock items list
  const [items, setItems] = useState<StockItem[]>([]);
  // Managed units list
  const [units, setUnits] = useState<StockUnit[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<StockItem | null>(null);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback(
    (message: string, type: 'success' | 'info' | 'error' = 'success') => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setToast({ message, type });
      toastTimeoutRef.current = setTimeout(() => {
        setToast(null);
      }, 4000);
    },
    []
  );

  // Initialize stock & units from local storage on mount
  useEffect(() => {
    const loadedStock = loadStoredStock();
    const loadedUnits = loadManagedUnits();
    setItems(loadedStock);
    setUnits(loadedUnits);
    setIsInitialized(true);
  }, []);

  // Update HTML document direction when language changes
  useEffect(() => {
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  }, [lang]);

  const handleToggleLanguage = () => {
    const nextLang: AppLanguage = lang === 'ur' ? 'en' : 'ur';
    setLang(nextLang);
    showToast(
      nextLang === 'ur' ? 'زبان اردو میں تبدیل ہو گئی ہے' : 'Switched to English',
      'info'
    );
  };

  // Stock storage updates
  const updateItemsAndPersist = (newItems: StockItem[]) => {
    setItems(newItems);
    saveStoredStock(newItems);
  };

  // Units storage updates
  const updateUnitsAndPersist = (newUnits: StockUnit[]) => {
    setUnits(newUnits);
    saveManagedUnits(newUnits);
  };

  // Unit Management Handlers
  const handleAddUnit = (nameUrdu: string, nameEnglish?: string) => {
    const newUnit: StockUnit = {
      id: 'unit_' + Date.now(),
      nameUrdu,
      nameEnglish,
      isDefault: false,
    };
    const nextUnits = [...units, newUnit];
    updateUnitsAndPersist(nextUnits);
    showToast(
      lang === 'ur'
        ? `نئی اکائی "${nameUrdu}" شامل کر دی گئی!`
        : `Added new unit "${nameUrdu}"!`
    );
  };

  const handleUpdateUnit = (id: string, nameUrdu: string, nameEnglish?: string) => {
    const nextUnits = units.map((u) =>
      u.id === id ? { ...u, nameUrdu, nameEnglish } : u
    );
    updateUnitsAndPersist(nextUnits);
    showToast(
      lang === 'ur' ? `اکائی "${nameUrdu}" اپ ڈیٹ ہو گئی!` : `Updated unit "${nameUrdu}"!`
    );
  };

  const handleDeleteUnit = (id: string) => {
    const unitToDelete = units.find((u) => u.id === id);
    if (!unitToDelete) return;
    const nextUnits = units.filter((u) => u.id !== id);
    updateUnitsAndPersist(nextUnits);
    showToast(
      lang === 'ur'
        ? `اکائی "${unitToDelete.nameUrdu}" حذف کر دی گئی`
        : `Deleted unit "${unitToDelete.nameUrdu}"`,
      'info'
    );
  };

  const handleResetUnits = () => {
    updateUnitsAndPersist(DEFAULT_PAKISTANI_UNITS);
    showToast(
      lang === 'ur'
        ? 'پاکستانی تجارتی اکائیاں بحال کر دی گئیں'
        : 'Restored default Pakistani units'
    );
  };

  // Add Item
  const handleAddItem = (newItem: {
    itemName: string;
    unit: string;
    quantity: number;
  }) => {
    const item: StockItem = {
      id: generateItemId(),
      itemName: newItem.itemName,
      unit: newItem.unit,
      quantity: newItem.quantity,
      updatedAt: new Date().toISOString(),
    };
    const nextItems = [item, ...items];
    updateItemsAndPersist(nextItems);
    showToast(
      lang === 'ur'
        ? `"${item.itemName}" اسٹاک میں کامیابی سے شامل ہو گیا!`
        : `Added "${item.itemName}" to stock!`
    );
  };

  // Edit Item
  const handleUpdateItem = (
    id: string,
    updated: { itemName: string; unit: string; quantity: number }
  ) => {
    const nextItems = items.map((item) =>
      item.id === id
        ? {
            ...item,
            itemName: updated.itemName,
            unit: updated.unit,
            quantity: updated.quantity,
            updatedAt: new Date().toISOString(),
          }
        : item
    );
    updateItemsAndPersist(nextItems);
    showToast(
      lang === 'ur'
        ? `"${updated.itemName}" میں ترمیم محفوظ ہو گئی!`
        : `Updated "${updated.itemName}"!`
    );
  };

  // Quick Quantity Stepper
  const handleQuickQuantityChange = (item: StockItem, delta: number) => {
    const newQty = Math.max(0, (item.quantity || 0) + delta);
    const nextItems = items.map((i) =>
      i.id === item.id ? { ...i, quantity: newQty } : i
    );
    updateItemsAndPersist(nextItems);
    showToast(
      `${item.itemName}: ${newQty} ${item.unit} (${delta > 0 ? '+' : ''}${delta})`,
      'info'
    );
  };

  // Delete Item
  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    const nextItems = items.filter((i) => i.id !== deletingItem.id);
    updateItemsAndPersist(nextItems);
    showToast(
      lang === 'ur'
        ? `"${deletingItem.itemName}" اسٹاک سے حذف کر دیا گیا۔`
        : `Removed "${deletingItem.itemName}" from inventory.`,
      'info'
    );
    setDeletingItem(null);
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (items.length === 0) {
      showToast(
        lang === 'ur'
          ? 'ایکسپورٹ کے لیے کوئی آئٹم موجود نہیں ہے۔'
          : 'No stock items to export.',
        'error'
      );
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const filename = `stock-inventory-${today}.xlsx`;
    exportToExcel(items, filename, lang);
    showToast(
      lang === 'ur'
        ? `${items.length} اشیاء پر مشتمل ایکسل شیٹ ڈاؤنلوڈ ہو گئی!`
        : `Exported ${items.length} items to ${filename}!`
    );
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (items.length === 0) {
      showToast(
        lang === 'ur'
          ? 'ایکسپورٹ کے لیے کوئی آئٹم موجود نہیں ہے۔'
          : 'No stock items to export.',
        'error'
      );
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const filename = `stock-inventory-${today}.csv`;
    exportToCsv(items, filename, lang);
    showToast(
      lang === 'ur'
        ? `سی ایس وی فائل ڈاؤنلوڈ ہو گئی!`
        : `Exported ${items.length} items to ${filename}!`
    );
  };

  // Import from Excel or CSV
  const handleImportFile = async (file: File) => {
    try {
      const parsed = await parseExcelOrCsvFile(file);
      if (parsed.length === 0) {
        showToast(
          lang === 'ur'
            ? 'فائل میں اشیاء کا کوئی ڈیٹا نہیں ملا۔'
            : 'No valid stock rows found in the uploaded file.',
          'error'
        );
        return;
      }
      const newStockItems: StockItem[] = parsed.map((p) => ({
        id: generateItemId(),
        itemName: p.itemName,
        unit: p.unit,
        quantity: p.quantity,
        updatedAt: new Date().toISOString(),
      }));

      const combined = [...newStockItems, ...items];
      updateItemsAndPersist(combined);
      showToast(
        lang === 'ur'
          ? `فائل "${file.name}" سے ${newStockItems.length} اشیاء شامل ہو گئیں!`
          : `Imported ${newStockItems.length} items from "${file.name}"!`,
        'success'
      );
    } catch (err: any) {
      console.error('Import error:', err);
      showToast(
        lang === 'ur'
          ? 'فائل پڑھنے میں غلطی ہوئی۔ برائے مہربانی درست ایکسل یا CSV فائل منتخب کریں۔'
          : 'Failed to parse file. Please upload a valid Excel or CSV file.',
        'error'
      );
    }
  };

  const handleResetSampleData = () => {
    updateItemsAndPersist(INITIAL_STOCK_ITEMS);
    showToast(
      lang === 'ur'
        ? 'نمونہ اسٹاک ڈیٹا لوڈ کر دیا گیا ہے۔'
        : 'Loaded sample stock items.'
    );
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-600">
            {lang === 'ur' ? 'اسٹاک لوڈ ہو رہا ہے...' : 'Loading inventory...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={lang === 'ur' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans"
    >
      {/* Navbar with Excel export, unit management, and Urdu language toggle */}
      <Navbar
        itemCount={items.length}
        lang={lang}
        t={t}
        onToggleLanguage={handleToggleLanguage}
        onOpenUnitManagement={() => setIsUnitModalOpen(true)}
        onExportExcel={handleExportExcel}
        onExportCsv={handleExportCsv}
        onImportFile={handleImportFile}
        onResetSampleData={handleResetSampleData}
      />

      {/* Floating Status Toast */}
      {toast && (
        <div
          id="status-toast"
          className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-3"
        >
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-bold shadow-xs transition-all ${
              toast.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : toast.type === 'info'
                ? 'bg-slate-100 text-slate-800 border-slate-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Quick Action Bar for Export, Units & Add */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {t.appName} - {t.threeColNote.split('|')[0]}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'ur'
                ? 'کسی لاگ ان کی ضرورت نہیں، تمام ڈیٹا آپ کے براؤزر میں محفوظ رہتا ہے اور فوری ایکسل میں ڈاؤنلوڈ کیا جا سکتا ہے۔'
                : 'Zero login required. Everything lives securely inside your app with instant Excel export.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Unit Management Trigger */}
            <button
              id="btn-quick-manage-units"
              type="button"
              onClick={() => setIsUnitModalOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5 text-emerald-700" />
              <span>{t.manageUnits}</span>
            </button>

            {/* Export Excel Button */}
            <button
              id="btn-quick-export-excel"
              type="button"
              onClick={handleExportExcel}
              disabled={items.length === 0}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200/90 border border-emerald-300 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>{t.exportExcel}</span>
              <Download className="w-3.5 h-3.5 text-emerald-700" />
            </button>

            {/* Add Item Button */}
            <button
              id="btn-quick-add-item"
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addItem}</span>
            </button>
          </div>
        </div>

        {/* Top Summary Bar */}
        <StockSummary items={items} t={t} />

        {/* Primary 3-Column Stock Management Table */}
        <StockTable
          items={items}
          lang={lang}
          t={t}
          onAddItem={() => setIsAddModalOpen(true)}
          onEditItem={(item) => setEditingItem(item)}
          onDeleteItem={(item) => setDeletingItem(item)}
          onQuickQuantityChange={handleQuickQuantityChange}
          onExportExcel={handleExportExcel}
        />
      </main>

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        units={units}
        lang={lang}
        t={t}
        onClose={() => setIsAddModalOpen(false)}
        onOpenUnitManagement={() => {
          setIsAddModalOpen(false);
          setIsUnitModalOpen(true);
        }}
        onAdd={handleAddItem}
      />

      {/* Edit Item Modal */}
      <EditItemModal
        isOpen={Boolean(editingItem)}
        item={editingItem}
        units={units}
        lang={lang}
        t={t}
        onClose={() => setEditingItem(null)}
        onOpenUnitManagement={() => {
          setEditingItem(null);
          setIsUnitModalOpen(true);
        }}
        onSave={handleUpdateItem}
      />

      {/* Unit Management Modal */}
      <UnitManagementModal
        isOpen={isUnitModalOpen}
        units={units}
        lang={lang}
        t={t}
        onClose={() => setIsUnitModalOpen(false)}
        onAddUnit={handleAddUnit}
        onUpdateUnit={handleUpdateUnit}
        onDeleteUnit={handleDeleteUnit}
        onResetUnits={handleResetUnits}
      />

      {/* Confirm Delete Item Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingItem)}
        title={t.deleteConfirmTitle}
        message={
          deletingItem
            ? t.deleteConfirmMsg(
                deletingItem.itemName,
                deletingItem.quantity,
                deletingItem.unit
              )
            : ''
        }
        confirmLabel={t.confirmDelete}
        cancelLabel={t.cancel}
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingItem(null)}
      />
    </div>
  );
}

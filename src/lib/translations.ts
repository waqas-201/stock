export interface AppStrings {
  appName: string;
  appSubtitle: string;
  itemsCount: (count: number) => string;
  totalQuantityLabel: string;
  unitsInStock: string;
  totalItemsLabel: string;
  lowStockLabel: string;
  outOfStockLabel: string;
  exportExcel: string;
  exportCsv: string;
  importExcel: string;
  manageUnits: string;
  addItem: string;
  editItem: string;
  deleteItem: string;
  deleteConfirmTitle: string;
  deleteConfirmMsg: (name: string, qty: number, unit: string) => string;
  confirmDelete: string;
  cancel: string;
  saveChanges: string;
  addToStock: string;
  itemNameCol: string;
  unitCol: string;
  quantityCol: string;
  actionsCol: string;
  searchPlaceholder: string;
  filterAll: string;
  filterInStock: string;
  filterLowStock: string;
  filterOutOfStock: string;
  noItemsYet: string;
  noItemsDescription: string;
  addFirstItem: string;
  noMatchFound: string;
  showingCount: (shown: number, total: number) => string;
  quickUnits: string;
  unitManagementTitle: string;
  unitManagementSubtitle: string;
  addNewUnit: string;
  unitNameUrdu: string;
  unitNameEnglish: string;
  unitPlaceholderUrdu: string;
  unitPlaceholderEnglish: string;
  saveUnit: string;
  defaultBadge: string;
  customBadge: string;
  deleteUnitConfirm: (name: string) => string;
  loadSample: string;
  threeColNote: string;
}

export const URDU_STRINGS: AppStrings = {
  appName: 'اسٹاک مینجمنٹ',
  appSubtitle: '۳ کالم انوینٹری: اشیاء کا نام • اکائی • مقدار',
  itemsCount: (count: number) => `${count} اشیاء`,
  totalQuantityLabel: 'کل تعداد / اسٹاک',
  unitsInStock: 'مجموعی مقدار',
  totalItemsLabel: 'کل اشیاء (آئٹمز)',
  lowStockLabel: 'کم اسٹاک (۵ یا کم)',
  outOfStockLabel: 'ختم شدہ مال (صفر)',
  exportExcel: 'ایکسل شیٹ ڈاؤنلوڈ کریں',
  exportCsv: 'سی ایس وی ایکسپورٹ',
  importExcel: 'ایکسل فائل امپورٹ',
  manageUnits: 'اکائیوں کا انتظام',
  addItem: 'نیا آئٹم شامل کریں',
  editItem: 'آئٹم میں ترمیم کریں',
  deleteItem: 'حذف کریں',
  deleteConfirmTitle: 'آئٹم حذف کرنے کی تصدیق',
  deleteConfirmMsg: (name: string, qty: number, unit: string) =>
    `کیا آپ واقعی "${name}" (${qty} ${unit}) کو اسٹاک لسٹ سے حذف کرنا چاہتے ہیں؟`,
  confirmDelete: 'ہاں، حذف کریں',
  cancel: 'منسوخ کریں',
  saveChanges: 'تبدیلی محفوظ کریں',
  addToStock: 'اسٹاک میں شامل کریں',
  itemNameCol: '۱. اشیاء کا نام',
  unitCol: '۲. اکائی (یونٹ)',
  quantityCol: '۳. تعداد / مقدار',
  actionsCol: 'کارروائی',
  searchPlaceholder: 'اشیاء کے نام سے تلاش کریں...',
  filterAll: 'تمام اشیاء',
  filterInStock: 'دستیاب اسٹاک',
  filterLowStock: 'کم اسٹاک',
  filterOutOfStock: 'ختم شدہ مال',
  noItemsYet: 'ابھی کوئی شے رجسٹر نہیں ہوئی',
  noItemsDescription: 'اسٹاک شروع کرنے کے لیے "نیا آئٹم شامل کریں" پر کلک کریں۔',
  addFirstItem: 'پہلا آئٹم شامل کریں',
  noMatchFound: 'تلاش کے مطابق کوئی شے نہیں ملی',
  showingCount: (shown: number, total: number) =>
    `کل ${total} میں سے ${shown} اشیاء دکھائی جا رہی ہیں`,
  quickUnits: 'اکائیاں:',
  unitManagementTitle: 'اکائیوں کا انتظام (Unit Management)',
  unitManagementSubtitle: 'کاروبار کی پیمائش کی اکائیاں شامل، تبدیل یا حذف کریں',
  addNewUnit: 'نئی اکائی شامل کریں',
  unitNameUrdu: 'اکائی کا نام (اردو)',
  unitNameEnglish: 'انگریزی نام / کوڈ (اختیاری)',
  unitPlaceholderUrdu: 'مثلاً: کلو، پیٹی، بوری، عدد، درجن',
  unitPlaceholderEnglish: 'e.g., kg, carton, bag, pcs',
  saveUnit: 'اکائی محفوظ کریں',
  defaultBadge: 'بنیادی اکائی',
  customBadge: 'کسٹم اکائی',
  deleteUnitConfirm: (name: string) => `کیا آپ واقعی اکائی "${name}" کو حذف کرنا چاہتے ہیں؟`,
  loadSample: 'نمونہ ڈیٹا لوڈ کریں',
  threeColNote: '۳ کالم کھاتہ: اشیاء کا نام • اکائی • تعداد | ایکسل ڈاؤنلوڈ دستیاب',
};

export const ENGLISH_STRINGS: AppStrings = {
  appName: 'Stock Management',
  appSubtitle: '3-Column Inventory: Item Name • Unit • Quantity',
  itemsCount: (count: number) => `${count} ${count === 1 ? 'Item' : 'Items'}`,
  totalQuantityLabel: 'Total Quantity',
  unitsInStock: 'units in stock',
  totalItemsLabel: 'Total Items',
  lowStockLabel: 'Low Stock (≤ 5)',
  outOfStockLabel: 'Out of Stock (0)',
  exportExcel: 'Export Excel Sheet',
  exportCsv: 'Export CSV',
  importExcel: 'Import Excel',
  manageUnits: 'Manage Units',
  addItem: 'Add Item',
  editItem: 'Edit Item',
  deleteItem: 'Delete',
  deleteConfirmTitle: 'Confirm Item Deletion',
  deleteConfirmMsg: (name: string, qty: number, unit: string) =>
    `Are you sure you want to remove "${name}" (${qty} ${unit}) from inventory?`,
  confirmDelete: 'Yes, Delete',
  cancel: 'Cancel',
  saveChanges: 'Save Changes',
  addToStock: 'Add to Stock',
  itemNameCol: '1. Item Name',
  unitCol: '2. Unit',
  quantityCol: '3. Quantity',
  actionsCol: 'Actions',
  searchPlaceholder: 'Search by item name...',
  filterAll: 'All Items',
  filterInStock: 'In Stock',
  filterLowStock: 'Low Stock',
  filterOutOfStock: 'Out of Stock',
  noItemsYet: 'No stock items added yet',
  noItemsDescription: 'Click "Add Item" to start tracking inventory.',
  addFirstItem: 'Add First Item',
  noMatchFound: 'No matching items found',
  showingCount: (shown: number, total: number) =>
    `Showing ${shown} of ${total} stock items`,
  quickUnits: 'Units:',
  unitManagementTitle: 'Unit Management',
  unitManagementSubtitle: 'Add, edit or remove measurement units for your inventory',
  addNewUnit: 'Add New Unit',
  unitNameUrdu: 'Unit Name (Urdu)',
  unitNameEnglish: 'English Name / Code (Optional)',
  unitPlaceholderUrdu: 'e.g., کلو, پیٹی, بوری, عدد',
  unitPlaceholderEnglish: 'e.g., kg, carton, bag, pcs',
  saveUnit: 'Save Unit',
  defaultBadge: 'Default',
  customBadge: 'Custom',
  deleteUnitConfirm: (name: string) => `Are you sure you want to delete unit "${name}"?`,
  loadSample: 'Load Sample Data',
  threeColNote: '3 Columns: Item Name • Unit • Quantity | Excel Export Ready',
};

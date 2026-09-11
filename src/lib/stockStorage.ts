import { StockItem } from '../types';

const STORAGE_KEY = 'in_app_stock_items_pk_v2';

export const INITIAL_STOCK_ITEMS: StockItem[] = [
  { id: 'item_1', itemName: 'اے فور پرنٹنگ پیپر (A4 Paper)', unit: 'ریم', quantity: 45 },
  { id: 'item_2', itemName: 'بال پوائنٹ پین (نیلا)', unit: 'ڈبہ / باکس', quantity: 14 },
  { id: 'item_3', itemName: 'باسمتی چاول (سپر کرنل)', unit: 'بوری / توڑا', quantity: 8 },
  { id: 'item_4', itemName: 'کوکنگ آئل ۵ لیٹر کین', unit: 'پیٹی / کاٹن', quantity: 12 },
  { id: 'item_5', itemName: 'چینی سفید (White Sugar)', unit: 'کلو گرام', quantity: 35 },
  { id: 'item_6', itemName: 'ہینڈ سینیٹائزر ۵۰۰ ایم ایل', unit: 'بوتل', quantity: 0 },
  { id: 'item_7', itemName: 'پیکنگ ٹیپ (چوڑا ۲ انچ)', unit: 'رول', quantity: 4 },
  { id: 'item_8', itemName: 'اسٹیپلر پن ۲۴/۶ (Stapler Pins)', unit: 'پیکٹ', quantity: 25 },
];

/**
 * Loads stock items from localStorage or returns default items on first launch
 */
export function loadStoredStock(): StockItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveStoredStock(INITIAL_STOCK_ITEMS);
      return INITIAL_STOCK_ITEMS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to parse stored stock:', err);
  }
  return INITIAL_STOCK_ITEMS;
}

/**
 * Saves stock items to localStorage
 */
export function saveStoredStock(items: StockItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save stock to localStorage:', err);
  }
}

/**
 * Generates a unique ID for new stock items
 */
export function generateItemId(): string {
  return 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
}

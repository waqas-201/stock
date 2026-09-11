import { StockItem } from '../types';

const STORAGE_KEY = 'in_app_stock_items_en_v3';
const THRESHOLD_STORAGE_KEY = 'app_global_low_stock_threshold';

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export const INITIAL_STOCK_ITEMS: StockItem[] = [
  { id: 'item_1', itemName: 'A4 Printing Paper (80 GSM)', unit: 'Ream', quantity: 45 },
  { id: 'item_2', itemName: 'Ballpoint Pens (Blue, 50pk)', unit: 'Box', quantity: 12 },
  { id: 'item_3', itemName: 'Organic Basmati Rice', unit: 'Bag / Sack', quantity: 8 },
  { id: 'item_4', itemName: 'Refined Canola Oil (5L)', unit: 'Carton', quantity: 14 },
  { id: 'item_5', itemName: 'White Cane Sugar', unit: 'Kilogram', quantity: 30 },
  { id: 'item_6', itemName: 'Hand Sanitizer (500ml)', unit: 'Bottle', quantity: 0 },
  { id: 'item_7', itemName: 'Heavy Duty Packaging Tape', unit: 'Roll', quantity: 4, lowStockThreshold: 5 },
  { id: 'item_8', itemName: 'Standard Wire Staples (24/6)', unit: 'Packet', quantity: 22 },
];

/**
 * Loads stock items from localStorage
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
 * Loads global low stock threshold from localStorage
 */
export function loadLowStockThreshold(): number {
  try {
    const raw = localStorage.getItem(THRESHOLD_STORAGE_KEY);
    if (raw !== null) {
      const num = parseInt(raw, 10);
      if (!isNaN(num) && num >= 0) return num;
    }
  } catch (err) {
    console.error('Failed to load low stock threshold:', err);
  }
  return DEFAULT_LOW_STOCK_THRESHOLD;
}

/**
 * Saves global low stock threshold to localStorage
 */
export function saveLowStockThreshold(threshold: number): void {
  try {
    localStorage.setItem(THRESHOLD_STORAGE_KEY, threshold.toString());
  } catch (err) {
    console.error('Failed to save low stock threshold:', err);
  }
}

/**
 * Generates a unique ID for new stock items
 */
export function generateItemId(): string {
  return 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
}

import { StockItem, ItemAuditEntry } from '../types';

const STORAGE_KEY = 'in_app_stock_items_en_v5';
const GLOBAL_LOG_KEY = 'stock_inventory_global_audit_trail_v1';

export const DEFAULT_ITEM_LOW_STOCK = 5;

export interface GlobalAuditRecord extends ItemAuditEntry {
  itemId: string;
  itemName: string;
  unit: string;
}

export function createAuditEntry(
  action: 'created' | 'quantity_changed' | 'edited' | 'deleted' | 'restored',
  summary: string,
  details?: string,
  previousQuantity?: number,
  newQuantity?: number
): ItemAuditEntry {
  const delta =
    previousQuantity !== undefined && newQuantity !== undefined
      ? newQuantity - previousQuantity
      : undefined;

  return {
    id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    action,
    timestamp: new Date().toISOString(),
    summary,
    details,
    previousQuantity,
    newQuantity,
    delta,
  };
}

export const INITIAL_STOCK_ITEMS: StockItem[] = [
  {
    id: 'item_1',
    itemName: 'A4 Printing Paper (80 GSM)',
    unit: 'Ream',
    quantity: 45,
    lowStockThreshold: 10,
    productionDate: '2026-08-15',
    notes: 'Warehouse Rack B-2. Double A brand.',
    createdAt: '2026-08-20T09:00:00.000Z',
    updatedAt: '2026-09-08T14:30:00.000Z',
    auditTrail: [
      {
        id: 'aud_init_1',
        action: 'created',
        timestamp: '2026-08-20T09:00:00.000Z',
        summary: 'Item added to inventory',
        details: 'Initial quantity: 50 Reams, Alert limit: ≤ 10',
        newQuantity: 50,
      },
      {
        id: 'aud_init_2',
        action: 'quantity_changed',
        timestamp: '2026-09-08T14:30:00.000Z',
        summary: 'Issued 5 Reams for Office Admin',
        previousQuantity: 50,
        newQuantity: 45,
        delta: -5,
      },
    ],
  },
  {
    id: 'item_2',
    itemName: 'Ballpoint Pens (Blue, 50pk)',
    unit: 'Box',
    quantity: 12,
    lowStockThreshold: 15,
    productionDate: '2026-07-10',
    notes: 'Supplier: Stationery Depot Ltd. Lot #2607',
    createdAt: '2026-08-22T11:15:00.000Z',
    updatedAt: '2026-09-10T10:20:00.000Z',
    auditTrail: [
      {
        id: 'aud_init_3',
        action: 'created',
        timestamp: '2026-08-22T11:15:00.000Z',
        summary: 'Item added to inventory',
        details: 'Initial quantity: 20 Boxes, Alert limit: ≤ 15',
        newQuantity: 20,
      },
      {
        id: 'aud_init_4',
        action: 'quantity_changed',
        timestamp: '2026-09-10T10:20:00.000Z',
        summary: 'Stock dispatched to sales department',
        previousQuantity: 20,
        newQuantity: 12,
        delta: -8,
      },
    ],
  },
  {
    id: 'item_3',
    itemName: 'Organic Basmati Rice',
    unit: 'Bag / Sack',
    quantity: 8,
    lowStockThreshold: 10,
    productionDate: '2026-06-01',
    notes: 'Premium grain, Harvest 2026, Bin #4',
    createdAt: '2026-08-25T08:00:00.000Z',
    updatedAt: '2026-09-05T16:00:00.000Z',
    auditTrail: [
      {
        id: 'aud_init_5',
        action: 'created',
        timestamp: '2026-08-25T08:00:00.000Z',
        summary: 'Item added to inventory',
        details: 'Initial quantity: 15 Bags, Alert limit: ≤ 10',
        newQuantity: 15,
      },
    ],
  },
  {
    id: 'item_4',
    itemName: 'Refined Canola Oil (5L)',
    unit: 'Carton',
    quantity: 14,
    lowStockThreshold: 5,
    productionDate: '2026-07-28',
    notes: 'Batch CO-881. Cold pressed.',
    createdAt: '2026-08-28T12:00:00.000Z',
    updatedAt: '2026-09-07T11:00:00.000Z',
  },
  {
    id: 'item_5',
    itemName: 'White Cane Sugar',
    unit: 'Kilogram',
    quantity: 30,
    lowStockThreshold: 10,
    productionDate: '2026-05-12',
    notes: 'Keep in dry room.',
    createdAt: '2026-08-29T10:00:00.000Z',
    updatedAt: '2026-09-09T09:00:00.000Z',
  },
  {
    id: 'item_6',
    itemName: 'Hand Sanitizer (500ml)',
    unit: 'Bottle',
    quantity: 0,
    lowStockThreshold: 5,
    productionDate: '2026-04-18',
    notes: 'Reorder pending from MedSupply.',
    createdAt: '2026-08-15T10:00:00.000Z',
    updatedAt: '2026-09-11T08:00:00.000Z',
  },
  {
    id: 'item_7',
    itemName: 'Heavy Duty Packaging Tape',
    unit: 'Roll',
    quantity: 3,
    lowStockThreshold: 5,
    productionDate: '2026-08-01',
    notes: 'Shipping desk stock.',
    createdAt: '2026-09-01T14:00:00.000Z',
    updatedAt: '2026-09-10T15:00:00.000Z',
  },
  {
    id: 'item_8',
    itemName: 'Standard Wire Staples (24/6)',
    unit: 'Packet',
    quantity: 22,
    lowStockThreshold: 8,
    productionDate: '2026-06-15',
    notes: 'Shelf C-1',
    createdAt: '2026-09-02T16:00:00.000Z',
    updatedAt: '2026-09-09T17:00:00.000Z',
  },
];

/**
 * Loads stock items from localStorage, ensuring every item has lowStockThreshold,
 * productionDate, notes, and auditTrail structure.
 */
export function loadStoredStock(): StockItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check legacy storage
      const legacyRaw =
        localStorage.getItem('in_app_stock_items_en_v4') ||
        localStorage.getItem('in_app_stock_items_en_v3');
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const migrated: StockItem[] = parsed.map((item: any) => ({
            ...item,
            lowStockThreshold:
              typeof item.lowStockThreshold === 'number'
                ? item.lowStockThreshold
                : DEFAULT_ITEM_LOW_STOCK,
            productionDate: item.productionDate || undefined,
            notes: item.notes || undefined,
            createdAt: item.createdAt || item.updatedAt || new Date().toISOString(),
            auditTrail: Array.isArray(item.auditTrail) ? item.auditTrail : [],
          }));
          saveStoredStock(migrated);
          return migrated;
        }
      }
      saveStoredStock(INITIAL_STOCK_ITEMS);
      return INITIAL_STOCK_ITEMS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        ...item,
        lowStockThreshold:
          typeof item.lowStockThreshold === 'number'
            ? item.lowStockThreshold
            : DEFAULT_ITEM_LOW_STOCK,
        productionDate: item.productionDate || undefined,
        notes: item.notes || undefined,
        createdAt: item.createdAt || item.updatedAt || new Date().toISOString(),
        auditTrail: Array.isArray(item.auditTrail) ? item.auditTrail : [],
      }));
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
 * Loads the complete global inventory audit trail (all actions across all items,
 * including deletions).
 */
export function loadGlobalAuditLog(): GlobalAuditRecord[] {
  try {
    const raw = localStorage.getItem(GLOBAL_LOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load global audit log:', err);
  }

  // Pre-seed with existing initial item trails
  const initialLogs: GlobalAuditRecord[] = [];
  INITIAL_STOCK_ITEMS.forEach((item) => {
    if (item.auditTrail) {
      item.auditTrail.forEach((entry) => {
        initialLogs.push({
          ...entry,
          itemId: item.id,
          itemName: item.itemName,
          unit: item.unit,
        });
      });
    }
  });
  saveGlobalAuditLog(initialLogs);
  return initialLogs;
}

/**
 * Saves the global audit log to localStorage
 */
export function saveGlobalAuditLog(records: GlobalAuditRecord[]): void {
  try {
    // Keep the most recent 250 log entries to prevent localStorage bloat
    const trimmed = records.slice(0, 250);
    localStorage.setItem(GLOBAL_LOG_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save global audit log:', err);
  }
}

/**
 * Adds a new entry to the global audit log
 */
export function appendGlobalAuditLog(
  record: Omit<GlobalAuditRecord, 'id' | 'timestamp'>
): GlobalAuditRecord {
  const newRecord: GlobalAuditRecord = {
    ...record,
    id: 'aud_g_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
  };

  const logs = loadGlobalAuditLog();
  const next = [newRecord, ...logs];
  saveGlobalAuditLog(next);
  return newRecord;
}

const CONFIRM_DELETE_KEY = 'stock_confirm_delete_choice';

/**
 * Loads user preference for confirming before item deletion.
 * Defaults to false (quick delete with undo) to prevent disturbing popups.
 */
export function loadConfirmOnDelete(): boolean {
  try {
    const val = localStorage.getItem(CONFIRM_DELETE_KEY);
    if (val !== null) {
      return val === 'true';
    }
  } catch (err) {
    console.error('Failed to read confirm delete preference:', err);
  }
  return false;
}

/**
 * Saves user preference for confirming before item deletion.
 */
export function saveConfirmOnDelete(enabled: boolean): void {
  try {
    localStorage.setItem(CONFIRM_DELETE_KEY, String(enabled));
  } catch (err) {
    console.error('Failed to save confirm delete preference:', err);
  }
}

/**
 * Generates a unique ID for new stock items
 */
export function generateItemId(): string {
  return 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
}

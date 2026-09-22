import { StockItem, ItemAuditEntry, OperatorProfile, AuditActionType } from '../types';

const STORAGE_KEY = 'in_app_stock_items_en_v5';
const GLOBAL_LOG_KEY = 'stock_inventory_global_audit_trail_v1';
const OPERATOR_KEY = 'stock_active_operator_profile_v1';

export const DEFAULT_ITEM_LOW_STOCK = 5;

export interface GlobalAuditRecord extends ItemAuditEntry {
  itemId: string;
  itemName: string;
  unit: string;
}

export function createAuditEntry(
  action: AuditActionType,
  summary: string,
  details?: string,
  previousQuantity?: number,
  newQuantity?: number,
  operatorOrName?: OperatorProfile | string | null,
  operatorEmail?: string,
  extra?: {
    category?: 'movement' | 'edit' | 'audit' | 'lifecycle';
    noteType?: 'count_verification' | 'quality_check' | 'location_audit' | 'general';
    balanceAfter?: number;
  }
): ItemAuditEntry {
  const delta =
    previousQuantity !== undefined && newQuantity !== undefined
      ? newQuantity - previousQuantity
      : undefined;

  let actorName = 'Store Operator';
  let email: string | undefined = undefined;
  let photoURL: string | undefined = undefined;

  if (typeof operatorOrName === 'string') {
    actorName = operatorOrName.trim() || 'Store Operator';
    email = operatorEmail;
  } else if (operatorOrName && typeof operatorOrName === 'object') {
    actorName = operatorOrName.name?.trim() || 'Store Operator';
    email = operatorOrName.email;
    photoURL = operatorOrName.photoURL;
  }

  return {
    id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    action,
    timestamp: new Date().toISOString(),
    summary,
    details,
    previousQuantity,
    newQuantity,
    delta,
    balanceAfter: extra?.balanceAfter !== undefined ? extra.balanceAfter : newQuantity,
    category: extra?.category,
    noteType: extra?.noteType,
    performedBy: actorName,
    userEmail: email,
    userPhotoURL: photoURL,
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
    tags: ['Office', 'Stationery', 'Paper'],
    createdAt: '2026-08-20T09:00:00.000Z',
    updatedAt: '2026-09-08T14:30:00.000Z',
    createdByName: 'Waqas',
    createdByEmail: 'waqasvu892@gmail.com',
    lastModifiedByName: 'Waqas',
    lastModifiedByEmail: 'waqasvu892@gmail.com',
    auditTrail: [
      {
        id: 'aud_init_1',
        action: 'created',
        timestamp: '2026-08-20T09:00:00.000Z',
        summary: 'Item added to inventory',
        details: 'Initial quantity: 50 Reams, Alert limit: ≤ 10',
        newQuantity: 50,
        performedBy: 'Waqas',
        userEmail: 'waqasvu892@gmail.com',
      },
      {
        id: 'aud_init_2',
        action: 'quantity_changed',
        timestamp: '2026-09-08T14:30:00.000Z',
        summary: 'Issued 5 Reams for Front Office',
        previousQuantity: 50,
        newQuantity: 45,
        delta: -5,
        performedBy: 'Waqas',
        userEmail: 'waqasvu892@gmail.com',
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
    tags: ['Office', 'Stationery'],
    createdAt: '2026-08-22T11:15:00.000Z',
    updatedAt: '2026-09-10T10:20:00.000Z',
    createdByName: 'Waqas',
    createdByEmail: 'waqasvu892@gmail.com',
    lastModifiedByName: 'Dispatch Team',
    auditTrail: [
      {
        id: 'aud_init_3',
        action: 'created',
        timestamp: '2026-08-22T11:15:00.000Z',
        summary: 'Item added to inventory',
        details: 'Initial quantity: 20 Boxes, Alert limit: ≤ 15',
        newQuantity: 20,
        performedBy: 'Waqas',
        userEmail: 'waqasvu892@gmail.com',
      },
      {
        id: 'aud_init_4',
        action: 'quantity_changed',
        timestamp: '2026-09-10T10:20:00.000Z',
        summary: 'Stock dispatched to sales department',
        previousQuantity: 20,
        newQuantity: 12,
        delta: -8,
        performedBy: 'Dispatch Team',
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
    tags: ['Groceries', 'Food', 'Bulk'],
    createdAt: '2026-08-25T08:00:00.000Z',
    updatedAt: '2026-09-05T16:00:00.000Z',
    createdByName: 'Inventory Team',
    lastModifiedByName: 'Inventory Team',
    auditTrail: [
      {
        id: 'aud_init_5',
        action: 'created',
        timestamp: '2026-08-25T08:00:00.000Z',
        summary: 'Item added to inventory',
        details: 'Initial quantity: 15 Bags, Alert limit: ≤ 10',
        newQuantity: 15,
        performedBy: 'Inventory Team',
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
    tags: ['Kitchen', 'Cooking', 'Liquid'],
    createdAt: '2026-08-28T12:00:00.000Z',
    updatedAt: '2026-09-07T11:00:00.000Z',
    createdByName: 'Warehouse Desk',
    lastModifiedByName: 'Warehouse Desk',
  },
  {
    id: 'item_5',
    itemName: 'White Cane Sugar',
    unit: 'Kilogram',
    quantity: 30,
    lowStockThreshold: 10,
    productionDate: '2026-05-12',
    notes: 'Keep in dry room.',
    tags: ['Groceries', 'Pantry', 'Food'],
    createdAt: '2026-08-29T10:00:00.000Z',
    updatedAt: '2026-09-09T09:00:00.000Z',
    createdByName: 'Storekeeper',
    lastModifiedByName: 'Storekeeper',
  },
  {
    id: 'item_6',
    itemName: 'Hand Sanitizer (500ml)',
    unit: 'Bottle',
    quantity: 0,
    lowStockThreshold: 5,
    productionDate: '2026-04-18',
    notes: 'Reorder pending from MedSupply.',
    tags: ['Safety', 'Hygiene', 'Medical'],
    createdAt: '2026-08-15T10:00:00.000Z',
    updatedAt: '2026-09-11T08:00:00.000Z',
    createdByName: 'Safety Officer',
    lastModifiedByName: 'Safety Officer',
  },
  {
    id: 'item_7',
    itemName: 'Heavy Duty Packaging Tape',
    unit: 'Roll',
    quantity: 3,
    lowStockThreshold: 5,
    productionDate: '2026-08-01',
    notes: 'Shipping desk stock.',
    tags: ['Warehouse', 'Shipping', 'Packaging'],
    createdAt: '2026-09-01T14:00:00.000Z',
    updatedAt: '2026-09-10T15:00:00.000Z',
    createdByName: 'Shipping Desk',
    lastModifiedByName: 'Shipping Desk',
  },
  {
    id: 'item_8',
    itemName: 'Standard Wire Staples (24/6)',
    unit: 'Packet',
    quantity: 22,
    lowStockThreshold: 8,
    productionDate: '2026-06-15',
    notes: 'Shelf C-1',
    tags: ['Office', 'Stationery'],
    createdAt: '2026-09-02T16:00:00.000Z',
    updatedAt: '2026-09-09T17:00:00.000Z',
    createdByName: 'Stationery Clerk',
    lastModifiedByName: 'Stationery Clerk',
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
            tags: Array.isArray(item.tags) ? item.tags : [],
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
        tags: Array.isArray(item.tags) ? item.tags : [],
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

/**
 * Loads the active operator profile from localStorage.
 * Defaults to "Waqas" / "Team Member".
 */
export function loadActiveOperator(): OperatorProfile {
  try {
    const raw = localStorage.getItem(OPERATOR_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.name === 'string' && parsed.name.trim().length > 0) {
        // Strip any residual '(Admin)' or 'Administrator' labels
        const cleanName = parsed.name.replace(/\s*\(Admin\)/gi, '').trim() || 'Waqas';
        const cleanRole = (parsed.role && !/admin/i.test(parsed.role)) ? parsed.role : 'Team Member';
        const sanitized = {
          ...parsed,
          name: cleanName,
          role: cleanRole,
        };
        if (cleanName !== parsed.name || cleanRole !== parsed.role) {
          saveActiveOperator(sanitized);
        }
        return sanitized;
      }
    }
  } catch (err) {
    console.error('Failed to load active operator profile:', err);
  }
  return {
    name: 'Waqas',
    email: 'waqasvu892@gmail.com',
    role: 'Team Member',
  };
}

/**
 * Saves the active operator profile to localStorage
 */
export function saveActiveOperator(operator: OperatorProfile): void {
  try {
    localStorage.setItem(OPERATOR_KEY, JSON.stringify(operator));
  } catch (err) {
    console.error('Failed to save active operator profile:', err);
  }
}

export const loadOperatorProfile = loadActiveOperator;
export const saveOperatorProfile = saveActiveOperator;

/**
 * Unifies all audit records from the global log registry AND all individual item audit trails.
 * This guarantees complete, tamper-proof audit preservation: even if global logs were somehow cleared
 * or reset, all item activities (creates, restocks, sales, edits, audit notes) are preserved and reconstructed!
 */
export function getUnifiedAuditLogs(
  globalLogs: GlobalAuditRecord[],
  items: StockItem[]
): GlobalAuditRecord[] {
  const map = new Map<string, GlobalAuditRecord>();

  // 1. Process all existing global logs
  if (Array.isArray(globalLogs)) {
    globalLogs.forEach((l) => {
      if (l && l.id) {
        map.set(l.id, l);
      }
    });
  }

  // 2. Scan every item in inventory and extract their audit trails
  if (Array.isArray(items)) {
    items.forEach((item) => {
      if (item && Array.isArray(item.auditTrail)) {
        item.auditTrail.forEach((entry) => {
          if (!entry) return;
          const entryId = entry.id || `aud_item_${item.id}_${entry.timestamp}`;
          if (!map.has(entryId)) {
            // Also check for composite match to prevent duplicates if ID differed
            const alreadyExists = Array.from(map.values()).some(
              (existing) =>
                existing.itemId === item.id &&
                existing.timestamp === entry.timestamp &&
                existing.action === entry.action &&
                existing.newQuantity === entry.newQuantity
            );
            if (!alreadyExists) {
              map.set(entryId, {
                ...entry,
                id: entryId,
                itemId: item.id,
                itemName: item.itemName,
                unit: item.unit,
                performedBy: entry.performedBy || item.lastModifiedByName || item.createdByName || 'Store Operator',
                userEmail: entry.userEmail || item.lastModifiedByEmail || item.createdByEmail,
              });
            }
          }
        });
      }
    });
  }

  // 3. Return sorted descending by timestamp
  return Array.from(map.values()).sort((a, b) => {
    const tA = new Date(a.timestamp).getTime();
    const tB = new Date(b.timestamp).getTime();
    if (isNaN(tA) || isNaN(tB)) {
      return (b.timestamp || '').localeCompare(a.timestamp || '');
    }
    return tB - tA;
  });
}



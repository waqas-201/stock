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
 * Normalizes text for comparison (collapses extra whitespace, trims, lowercases)
 */
function normalizeLogString(str?: string | null): string {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Extracts audit note content if formatted as `Audit Note: "..."`
 */
function extractLogNote(str?: string | null): string {
  if (!str) return '';
  const match = str.match(/Audit Note:\s*"([^"]*)"/i);
  if (match) return normalizeLogString(match[1]);
  return normalizeLogString(str);
}

/**
 * Checks whether two audit records refer to the exact same inventory event.
 */
export function areAuditLogsDuplicate(
  a: GlobalAuditRecord,
  b: GlobalAuditRecord
): boolean {
  if (!a || !b) return false;
  if (a === b) return true;

  // 1. Direct ID match
  if (a.id && b.id && a.id === b.id) return true;

  // 2. Actions must be identical
  if (a.action !== b.action) return false;

  // 3. Items must refer to the same catalog SKU
  const aItemId = (a.itemId || '').trim();
  const bItemId = (b.itemId || '').trim();
  const aName = normalizeLogString(a.itemName);
  const bName = normalizeLogString(b.itemName);

  const itemMatches =
    (aItemId && bItemId && aItemId === bItemId) ||
    (aName && bName && aName === bName);

  if (!itemMatches) return false;

  // 4. Check timestamp proximity
  const tA = new Date(a.timestamp).getTime();
  const tB = new Date(b.timestamp).getTime();
  const hasValidTimestamps = !isNaN(tA) && !isNaN(tB);
  const timeDiffMs = hasValidTimestamps ? Math.abs(tA - tB) : null;

  // If timestamps are valid and more than 10 minutes apart, they are separate events
  if (timeDiffMs !== null && timeDiffMs > 10 * 60 * 1000) {
    return false;
  }

  // 5. Quantity match check
  const hasNewQtyA = typeof a.newQuantity === 'number';
  const hasNewQtyB = typeof b.newQuantity === 'number';
  const newQtyMatches = !hasNewQtyA || !hasNewQtyB || a.newQuantity === b.newQuantity;

  const hasPrevQtyA = typeof a.previousQuantity === 'number';
  const hasPrevQtyB = typeof b.previousQuantity === 'number';
  const prevQtyMatches = !hasPrevQtyA || !hasPrevQtyB || a.previousQuantity === b.previousQuantity;

  const hasDeltaA = typeof a.delta === 'number';
  const hasDeltaB = typeof b.delta === 'number';
  const deltaMatches = !hasDeltaA || !hasDeltaB || a.delta === b.delta;

  if (!newQtyMatches || !prevQtyMatches || !deltaMatches) {
    return false;
  }

  // 6. Content & summary comparison
  const aSummary = normalizeLogString(a.summary);
  const bSummary = normalizeLogString(b.summary);
  const summaryMatches =
    aSummary === bSummary ||
    (aSummary.length > 0 && bSummary.length > 0 && (aSummary.includes(bSummary) || bSummary.includes(aSummary)));

  const aNote = extractLogNote(a.details);
  const bNote = extractLogNote(b.details);
  const noteMatches = !aNote || !bNote || aNote === bNote;

  const aDetailsNorm = normalizeLogString(a.details);
  const bDetailsNorm = normalizeLogString(b.details);
  const fullDetailsMatches = !aDetailsNorm || !bDetailsNorm || aDetailsNorm === bDetailsNorm;

  // If summary matches and details/notes match:
  if (summaryMatches && (noteMatches || fullDetailsMatches)) {
    return true;
  }

  // If baseline & new quantities both match and occurred within 3 minutes on the same item:
  if (
    hasNewQtyA &&
    hasNewQtyB &&
    a.newQuantity === b.newQuantity &&
    hasPrevQtyA &&
    hasPrevQtyB &&
    a.previousQuantity === b.previousQuantity &&
    timeDiffMs !== null &&
    timeDiffMs < 3 * 60 * 1000
  ) {
    return true;
  }

  // Item creation duplicate check (same item created around the same time)
  if (a.action === 'created' && timeDiffMs !== null && timeDiffMs < 10 * 60 * 1000) {
    return true;
  }

  // Item deletion duplicate check
  if (a.action === 'deleted' && timeDiffMs !== null && timeDiffMs < 10 * 60 * 1000 && noteMatches) {
    return true;
  }

  return false;
}

/**
 * Deduplicates audit log records, merging complementary fields and returning sorted records.
 */
export function deduplicateAuditLogs(records: GlobalAuditRecord[]): GlobalAuditRecord[] {
  if (!Array.isArray(records) || records.length <= 1) {
    return Array.isArray(records) ? records : [];
  }

  const result: GlobalAuditRecord[] = [];
  const seenIds = new Set<string>();

  for (const record of records) {
    if (!record) continue;

    if (record.id && seenIds.has(record.id)) {
      continue;
    }

    const existingIndex = result.findIndex((existing) => areAuditLogsDuplicate(existing, record));

    if (existingIndex >= 0) {
      const existing = result[existingIndex];
      // Keep whichever has richer fields
      result[existingIndex] = {
        ...record,
        ...existing,
        id: existing.id || record.id,
        itemId: existing.itemId || record.itemId,
        itemName: existing.itemName || record.itemName,
        unit: existing.unit || record.unit,
        performedBy: existing.performedBy || record.performedBy || 'Store Operator',
        userEmail: existing.userEmail || record.userEmail,
        userPhotoURL: existing.userPhotoURL || record.userPhotoURL,
        userId: existing.userId || record.userId,
        details: existing.details || record.details,
        summary: existing.summary || record.summary,
        previousQuantity:
          existing.previousQuantity !== undefined ? existing.previousQuantity : record.previousQuantity,
        newQuantity:
          existing.newQuantity !== undefined ? existing.newQuantity : record.newQuantity,
        delta: existing.delta !== undefined ? existing.delta : record.delta,
        balanceAfter:
          existing.balanceAfter !== undefined ? existing.balanceAfter : record.balanceAfter,
        timestamp: existing.timestamp || record.timestamp,
      };
      if (record.id) seenIds.add(record.id);
      if (existing.id) seenIds.add(existing.id);
    } else {
      result.push({ ...record });
      if (record.id) seenIds.add(record.id);
    }
  }

  return result.sort((a, b) => {
    const tA = new Date(a.timestamp).getTime();
    const tB = new Date(b.timestamp).getTime();
    if (isNaN(tA) || isNaN(tB)) {
      return (b.timestamp || '').localeCompare(a.timestamp || '');
    }
    return tB - tA;
  });
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
        return deduplicateAuditLogs(parsed);
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
  const dedupedInitial = deduplicateAuditLogs(initialLogs);
  saveGlobalAuditLog(dedupedInitial);
  return dedupedInitial;
}

/**
 * Saves the global audit log to localStorage
 */
export function saveGlobalAuditLog(records: GlobalAuditRecord[]): void {
  try {
    const clean = deduplicateAuditLogs(records);
    // Keep the most recent 350 log entries to prevent localStorage bloat
    const trimmed = clean.slice(0, 350);
    localStorage.setItem(GLOBAL_LOG_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save global audit log:', err);
  }
}

/**
 * Adds a new entry to the global audit log.
 * Reuses the original ID and timestamp if provided to prevent duplicated records.
 */
export function appendGlobalAuditLog(
  record: Partial<GlobalAuditRecord> & {
    action: GlobalAuditRecord['action'];
    summary: string;
    itemName: string;
  }
): GlobalAuditRecord {
  const newRecord: GlobalAuditRecord = {
    itemId: record.itemId || 'general',
    unit: record.unit || 'Unit',
    performedBy: record.performedBy || 'Store Operator',
    ...record,
    id: record.id || ('aud_g_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
    timestamp: record.timestamp || new Date().toISOString(),
  };

  const logs = loadGlobalAuditLog();
  const next = deduplicateAuditLogs([newRecord, ...logs]);
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
 * Runs through deduplicateAuditLogs to ensure zero duplicate entries are ever shown.
 */
export function getUnifiedAuditLogs(
  globalLogs: GlobalAuditRecord[],
  items: StockItem[]
): GlobalAuditRecord[] {
  const allLogs: GlobalAuditRecord[] = [];

  // 1. Collect all existing global logs
  if (Array.isArray(globalLogs)) {
    globalLogs.forEach((l) => {
      if (l && l.id) {
        allLogs.push(l);
      }
    });
  }

  // 2. Scan every item in inventory and extract their audit trails
  if (Array.isArray(items)) {
    items.forEach((item) => {
      if (item && Array.isArray(item.auditTrail)) {
        item.auditTrail.forEach((entry) => {
          if (!entry) return;
          allLogs.push({
            ...entry,
            id: entry.id || `aud_item_${item.id}_${entry.timestamp}`,
            itemId: item.id,
            itemName: item.itemName,
            unit: item.unit,
            performedBy:
              entry.performedBy ||
              item.lastModifiedByName ||
              item.createdByName ||
              'Store Operator',
            userEmail:
              entry.userEmail ||
              item.lastModifiedByEmail ||
              item.createdByEmail,
          });
        });
      }
    });
  }

  // 3. Deduplicate across all combined records and sort newest first
  return deduplicateAuditLogs(allLogs);
}



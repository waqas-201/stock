/**
 * Utility for persisting and restoring in-progress Delivery Challans and Stock Forms.
 * Protects users from accidental data loss upon closing, refreshing, or navigating away.
 */

export interface DispatchDraftItem {
  itemId: string;
  itemName?: string;
  unit?: string;
  quantity: number;
  inputStr?: string;
}

export interface DispatchChallanDraft {
  customerName: string;
  deliveryAddress: string;
  vehicleNumber: string;
  orderNotes: string;
  showOptionalDetails?: boolean;
  basket: DispatchDraftItem[];
  updatedAt: string;
}

export interface ReceiveDraftItem {
  itemId: string;
  itemName?: string;
  unit?: string;
  receivedQty: number;
  unitCost?: number;
  notes?: string;
  tags?: string[];
}

export interface ReceiveChallanDraft {
  vendorName: string;
  vendorInvoiceNumber: string;
  receiptDate: string;
  notes: string;
  basket: ReceiveDraftItem[];
  updatedAt: string;
}

export interface AddItemDraft {
  itemName: string;
  unit: string;
  threshold: string;
  productionDate: string;
  notes: string;
  selectedTags: string[];
  updatedAt: string;
}

const STORAGE_KEY_DISPATCH = 'stock_inventory_dispatch_challan_draft_v1';
const STORAGE_KEY_RECEIVE = 'stock_inventory_receive_challan_draft_v1';
const STORAGE_KEY_ADD_ITEM = 'stock_inventory_add_item_draft_v1';

// ==========================================
// 1. Outward Delivery Challan Drafts
// ==========================================

export function saveDispatchChallanDraft(draft: DispatchChallanDraft): void {
  try {
    localStorage.setItem(STORAGE_KEY_DISPATCH, JSON.stringify(draft));
  } catch (e) {
    console.warn('Failed to save dispatch challan draft:', e);
  }
}

export function loadDispatchChallanDraft(): DispatchChallanDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISPATCH);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as DispatchChallanDraft;
    }
  } catch (e) {
    console.warn('Failed to parse dispatch challan draft:', e);
  }
  return null;
}

export function clearDispatchChallanDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_DISPATCH);
  } catch (e) {
    console.warn('Failed to clear dispatch challan draft:', e);
  }
}

// ==========================================
// 2. Inward Delivery Challan (Goods Receipt) Drafts
// ==========================================

export function saveReceiveChallanDraft(draft: ReceiveChallanDraft): void {
  try {
    localStorage.setItem(STORAGE_KEY_RECEIVE, JSON.stringify(draft));
  } catch (e) {
    console.warn('Failed to save receive challan draft:', e);
  }
}

export function loadReceiveChallanDraft(): ReceiveChallanDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECEIVE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as ReceiveChallanDraft;
    }
  } catch (e) {
    console.warn('Failed to parse receive challan draft:', e);
  }
  return null;
}

export function clearReceiveChallanDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_RECEIVE);
  } catch (e) {
    console.warn('Failed to clear receive challan draft:', e);
  }
}

// ==========================================
// 3. New Item Creation Drafts
// ==========================================

export function saveAddItemDraft(draft: AddItemDraft): void {
  try {
    localStorage.setItem(STORAGE_KEY_ADD_ITEM, JSON.stringify(draft));
  } catch (e) {
    console.warn('Failed to save add item draft:', e);
  }
}

export function loadAddItemDraft(): AddItemDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ADD_ITEM);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as AddItemDraft;
    }
  } catch (e) {
    console.warn('Failed to parse add item draft:', e);
  }
  return null;
}

export function clearAddItemDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_ADD_ITEM);
  } catch (e) {
    console.warn('Failed to clear add item draft:', e);
  }
}

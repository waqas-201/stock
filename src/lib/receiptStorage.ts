import { GoodsReceipt } from '../types';
import { GlobalAuditRecord } from './stockStorage';

const RECEIPTS_KEY = 'stock_inventory_goods_receipts_v1';

/**
 * Loads all saved Goods Receipts (Inward Stock Receiving) from local storage.
 */
export function loadGoodsReceipts(): GoodsReceipt[] {
  try {
    const raw = localStorage.getItem(RECEIPTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => {
          const tA = new Date(a.createdAt || a.date).getTime();
          const tB = new Date(b.createdAt || b.date).getTime();
          if (isNaN(tA) || isNaN(tB)) {
            return (b.receiptNumber || '').localeCompare(a.receiptNumber || '');
          }
          return tB - tA;
        });
      }
    }
  } catch (err) {
    console.error('Failed to load goods receipts:', err);
  }
  return [];
}

/**
 * Persists all goods receipts to local storage.
 */
export function saveGoodsReceipts(receipts: GoodsReceipt[]): void {
  try {
    const trimmed = receipts.slice(0, 300);
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save goods receipts:', err);
  }
}

/**
 * Appends or updates a single goods receipt.
 */
export function saveGoodsReceipt(receipt: GoodsReceipt): GoodsReceipt {
  const current = loadGoodsReceipts();
  const existingIndex = current.findIndex(
    (r) => r.id === receipt.id || r.receiptNumber === receipt.receiptNumber
  );

  let next: GoodsReceipt[];
  if (existingIndex >= 0) {
    next = [...current];
    next[existingIndex] = receipt;
  } else {
    next = [receipt, ...current];
  }

  saveGoodsReceipts(next);
  return receipt;
}

/**
 * Deletes a goods receipt by ID.
 */
export function deleteStoredGoodsReceipt(id: string): void {
  const current = loadGoodsReceipts();
  const filtered = current.filter((r) => r.id !== id);
  saveGoodsReceipts(filtered);
}

/**
 * Generates the next sequential Goods Receipt Note number (e.g. GRN-20260924-001).
 */
export function generateNextReceiptNumber(
  existingReceipts: GoodsReceipt[] = []
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `GRN-${year}${month}${day}`;

  const todayReceipts = existingReceipts.filter(
    (r) => r.receiptNumber && r.receiptNumber.startsWith(datePrefix)
  );

  let maxSeq = 0;
  todayReceipts.forEach((r) => {
    const parts = r.receiptNumber.split('-');
    if (parts.length >= 3) {
      const seq = parseInt(parts[2], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `${datePrefix}-${nextSeq}`;
}

/**
 * Extracts past vendor names from saved receipts and audit logs.
 */
export function extractPastVendorNames(
  receipts: GoodsReceipt[] = [],
  auditLogs: GlobalAuditRecord[] = []
): string[] {
  const nameSet = new Set<string>();

  receipts.forEach((r) => {
    if (r.vendorName && r.vendorName.trim().length > 1) {
      nameSet.add(r.vendorName.trim());
    }
  });

  auditLogs.forEach((l) => {
    if (l.details) {
      const vendorMatch = l.details.match(/(?:from vendor|supplier|vendor:)\s+["']?([^"',.\n]+)["']?/i);
      if (vendorMatch && vendorMatch[1]) {
        const candidate = vendorMatch[1].trim();
        if (candidate.length >= 2 && candidate.length <= 60 && !/^\d+$/.test(candidate)) {
          nameSet.add(candidate);
        }
      }
    }
  });

  return Array.from(nameSet).sort((a, b) => a.localeCompare(b));
}

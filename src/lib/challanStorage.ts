import { DeliveryChallan } from '../types';
import { GlobalAuditRecord } from './stockStorage';

const CHALLANS_KEY = 'stock_inventory_delivery_challans_v1';

/**
 * Loads all saved Delivery Challans from local storage, sorted descending by date.
 */
export function loadDeliveryChallans(): DeliveryChallan[] {
  try {
    const raw = localStorage.getItem(CHALLANS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => {
          const tA = new Date(a.createdAt || a.date).getTime();
          const tB = new Date(b.createdAt || b.date).getTime();
          if (isNaN(tA) || isNaN(tB)) {
            return (b.challanNumber || '').localeCompare(a.challanNumber || '');
          }
          return tB - tA;
        });
      }
    }
  } catch (err) {
    console.error('Failed to load delivery challans:', err);
  }
  return [];
}

/**
 * Persists all delivery challans to local storage.
 */
export function saveDeliveryChallans(challans: DeliveryChallan[]): void {
  try {
    const trimmed = challans.slice(0, 300);
    localStorage.setItem(CHALLANS_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save delivery challans:', err);
  }
}

/**
 * Appends or updates a single delivery challan.
 */
export function saveDeliveryChallan(challan: DeliveryChallan): DeliveryChallan {
  const current = loadDeliveryChallans();
  const existingIndex = current.findIndex(
    (c) => c.id === challan.id || c.challanNumber === challan.challanNumber
  );

  let next: DeliveryChallan[];
  if (existingIndex >= 0) {
    next = [...current];
    next[existingIndex] = challan;
  } else {
    next = [challan, ...current];
  }

  saveDeliveryChallans(next);
  return challan;
}

/**
 * Deletes a delivery challan by ID.
 */
export function deleteStoredDeliveryChallan(id: string): void {
  const current = loadDeliveryChallans();
  const filtered = current.filter((c) => c.id !== id);
  saveDeliveryChallans(filtered);
}

/**
 * Generates the next sequential Delivery Challan number (e.g. DC-20260923-001).
 */
export function generateNextChallanNumber(
  existingChallans: DeliveryChallan[] = []
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `DC-${year}${month}${day}`;

  // Find all challans created on the same date
  const todayChallans = existingChallans.filter(
    (c) => c.challanNumber && c.challanNumber.startsWith(datePrefix)
  );

  let maxSeq = 0;
  todayChallans.forEach((c) => {
    const parts = c.challanNumber.split('-');
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
 * Extracts all unique past customer / party names from:
 * 1. Saved delivery challans
 * 2. Audit logs (detecting "SOLD TO [NAME]" or quoted notes)
 */
export function extractPastCustomerNames(
  challans: DeliveryChallan[] = [],
  auditLogs: GlobalAuditRecord[] = []
): string[] {
  const nameSet = new Set<string>();

  // 1. From existing challans
  challans.forEach((c) => {
    if (c.customerName && c.customerName.trim().length > 1) {
      nameSet.add(c.customerName.trim());
    }
  });

  // 2. From audit logs details
  auditLogs.forEach((l) => {
    if (l.details) {
      // Look for "SOLD TO XYZ" or "Dispatched to XYZ" or quotes
      const soldToMatch = l.details.match(/(?:sold to|dispatched to|customer|to:)\s+["']?([^"',.\n]+)["']?/i);
      if (soldToMatch && soldToMatch[1]) {
        const candidate = soldToMatch[1].trim();
        if (candidate.length >= 2 && candidate.length <= 60 && !/^\d+$/.test(candidate)) {
          nameSet.add(candidate);
        }
      }

      // Look for Audit Note: "XYZ"
      const noteMatch = l.details.match(/Audit Note:\s*"([^"]+)"/i);
      if (noteMatch && noteMatch[1]) {
        const note = noteMatch[1].trim();
        // If note starts with "SOLD TO "
        if (/^sold to\s+/i.test(note)) {
          const clean = note.replace(/^sold to\s+/i, '').trim();
          if (clean.length >= 2 && clean.length <= 60) {
            nameSet.add(clean);
          }
        } else if (note.length >= 2 && note.length <= 40 && !/^(item|restock|counted|verified|adjustment)/i.test(note)) {
          nameSet.add(note);
        }
      }
    }
  });

  // Return sorted alphabetically
  return Array.from(nameSet).sort((a, b) => a.localeCompare(b));
}

import { CustomerParty, CustomerPartyType } from '../types';
import { loadDeliveryChallans } from './challanStorage';

const CUSTOMERS_KEY = 'stock_inventory_registered_customers_v1';

export const DEFAULT_CUSTOMERS: CustomerParty[] = [
  {
    id: 'party-cust-1',
    name: 'Apex Traders',
    partyType: 'customer',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'party-vend-1',
    name: 'National Suppliers',
    partyType: 'vendor',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Loads all registered parties (Customers & Vendors) from local storage.
 * If user has deleted parties (even all of them), it respects the empty list and will NEVER resurrect them.
 */
export function loadRegisteredCustomers(): CustomerParty[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Normalize any old data so partyType is strictly 'customer' or 'vendor'
        return parsed.map((p) => ({
          ...p,
          partyType: (p.partyType === 'vendor' ? 'vendor' : 'customer') as CustomerPartyType,
        })).sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    // First time ever: initialize default list
    saveRegisteredCustomers(DEFAULT_CUSTOMERS);
    return [...DEFAULT_CUSTOMERS];
  } catch (err) {
    console.error('Failed to load registered parties:', err);
    return [];
  }
}

/**
 * Persists all party records to localStorage.
 */
export function saveRegisteredCustomers(customers: CustomerParty[]): void {
  try {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
  } catch (err) {
    console.error('Failed to save registered parties:', err);
  }
}

/**
 * Saves or updates a single party (Customer or Vendor).
 */
export function saveCustomer(customer: CustomerParty): CustomerParty[] {
  const current = loadRegisteredCustomers();
  const index = current.findIndex((c) => c.id === customer.id);
  const now = new Date().toISOString();

  const prepared: CustomerParty = {
    ...customer,
    name: customer.name.trim(),
    partyType: (customer.partyType === 'vendor' ? 'vendor' : 'customer') as CustomerPartyType,
    updatedAt: now,
  };

  let next: CustomerParty[];
  if (index >= 0) {
    next = [...current];
    next[index] = prepared;
  } else {
    next = [...current, prepared];
  }

  saveRegisteredCustomers(next);
  return next;
}

/**
 * Deletes a party by ID and guarantees permanent deletion from storage.
 */
export function deleteRegisteredCustomer(id: string): CustomerParty[] {
  const current = loadRegisteredCustomers();
  const next = current.filter((c) => c.id !== id);
  saveRegisteredCustomers(next);
  return next;
}

/**
 * Quick-registers a party (Customer or Vendor) by name if not already existing.
 */
export function quickRegisterCustomer(
  name: string,
  extra?: Partial<CustomerParty>
): { customer: CustomerParty; isNew: boolean } {
  const cleanName = name.trim();
  const current = loadRegisteredCustomers();
  const existing = current.find(
    (c) => c.name.toLowerCase() === cleanName.toLowerCase()
  );

  if (existing) {
    return { customer: existing, isNew: false };
  }

  const newParty: CustomerParty = {
    id: `party-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: cleanName,
    partyType: (extra?.partyType === 'vendor' ? 'vendor' : 'customer') as CustomerPartyType,
    phone: extra?.phone || undefined,
    address: extra?.address || undefined,
    notes: extra?.notes || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const next = [...current, newParty];
  saveRegisteredCustomers(next);
  return { customer: newParty, isNew: true };
}

/**
 * Returns dispatch stats for a customer (number of challans and total items ordered).
 */
export function getCustomerOrderStats(customerName: string): {
  challanCount: number;
  totalQuantity: number;
  lastOrderDate: string | null;
} {
  try {
    const challans = loadDeliveryChallans();
    const clean = customerName.trim().toLowerCase();
    const matched = challans.filter(
      (c) => c.customerName && c.customerName.trim().toLowerCase() === clean
    );

    let totalQuantity = 0;
    let lastDate: string | null = null;

    matched.forEach((c) => {
      totalQuantity += c.totalQuantity || 0;
      if (!lastDate || new Date(c.createdAt || c.date).getTime() > new Date(lastDate).getTime()) {
        lastDate = c.createdAt || c.date;
      }
    });

    return {
      challanCount: matched.length,
      totalQuantity,
      lastOrderDate: lastDate,
    };
  } catch {
    return { challanCount: 0, totalQuantity: 0, lastOrderDate: null };
  }
}

import { StockUnit } from '../types';

const UNITS_STORAGE_KEY = 'app_stock_units_v2';

export const DEFAULT_UNITS: StockUnit[] = [
  { id: 'u_pcs', name: 'Pieces', code: 'pcs', isDefault: true },
  { id: 'u_box', name: 'Box', code: 'box', isDefault: true },
  { id: 'u_kg', name: 'Kilogram', code: 'kg', isDefault: true },
  { id: 'u_gm', name: 'Gram', code: 'g', isDefault: true },
  { id: 'u_ltr', name: 'Liter', code: 'L', isDefault: true },
  { id: 'u_ml', name: 'Milliliter', code: 'mL', isDefault: true },
  { id: 'u_ctn', name: 'Carton', code: 'ctn', isDefault: true },
  { id: 'u_pkt', name: 'Packet', code: 'pkt', isDefault: true },
  { id: 'u_bag', name: 'Bag / Sack', code: 'bag', isDefault: true },
  { id: 'u_dz', name: 'Dozen', code: 'dz', isDefault: true },
  { id: 'u_bdl', name: 'Bundle', code: 'bdl', isDefault: true },
  { id: 'u_m', name: 'Meter', code: 'm', isDefault: true },
  { id: 'u_btl', name: 'Bottle', code: 'btl', isDefault: true },
  { id: 'u_roll', name: 'Roll', code: 'roll', isDefault: true },
  { id: 'u_ream', name: 'Ream', code: 'ream', isDefault: true },
  { id: 'u_set', name: 'Set', code: 'set', isDefault: true },
];

/**
 * Loads managed units from localStorage or initializes defaults
 */
export function loadManagedUnits(): StockUnit[] {
  try {
    const raw = localStorage.getItem(UNITS_STORAGE_KEY);
    if (!raw) {
      saveManagedUnits(DEFAULT_UNITS);
      return DEFAULT_UNITS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load units from storage:', err);
  }
  return DEFAULT_UNITS;
}

/**
 * Saves managed units to localStorage
 */
export function saveManagedUnits(units: StockUnit[]): void {
  try {
    localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(units));
  } catch (err) {
    console.error('Failed to save units to storage:', err);
  }
}

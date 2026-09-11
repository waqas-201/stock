import { StockUnit } from '../types';

const UNITS_STORAGE_KEY = 'pakistani_stock_units_v1';

export const DEFAULT_PAKISTANI_UNITS: StockUnit[] = [
  { id: 'u_pcs', nameUrdu: 'عدد / نَگ', nameEnglish: 'Pieces (pcs)', isDefault: true },
  { id: 'u_kg', nameUrdu: 'کلو گرام', nameEnglish: 'Kilogram (kg)', isDefault: true },
  { id: 'u_gm', nameUrdu: 'گرام', nameEnglish: 'Gram (g)', isDefault: true },
  { id: 'u_ltr', nameUrdu: 'لیٹر', nameEnglish: 'Liter (ltr)', isDefault: true },
  { id: 'u_ml', nameUrdu: 'ملی لیٹر', nameEnglish: 'Milliliter (ml)', isDefault: true },
  { id: 'u_ctn', nameUrdu: 'پیٹی / کاٹن', nameEnglish: 'Carton (ctn)', isDefault: true },
  { id: 'u_box', nameUrdu: 'ڈبہ / باکس', nameEnglish: 'Box', isDefault: true },
  { id: 'u_pkt', nameUrdu: 'پیکٹ', nameEnglish: 'Packet (pkt)', isDefault: true },
  { id: 'u_bag', nameUrdu: 'بوری / توڑا', nameEnglish: 'Sack / Bag', isDefault: true },
  { id: 'u_dz', nameUrdu: 'درجن', nameEnglish: 'Dozen (dz)', isDefault: true },
  { id: 'u_bdl', nameUrdu: 'بنڈل', nameEnglish: 'Bundle', isDefault: true },
  { id: 'u_m', nameUrdu: 'میٹر', nameEnglish: 'Meter (m)', isDefault: true },
  { id: 'u_yd', nameUrdu: 'گز', nameEnglish: 'Yard / Ghaz', isDefault: true },
  { id: 'u_btl', nameUrdu: 'بوتل', nameEnglish: 'Bottle', isDefault: true },
  { id: 'u_roll', nameUrdu: 'رول', nameEnglish: 'Roll', isDefault: true },
  { id: 'u_ream', nameUrdu: 'ریم', nameEnglish: 'Ream', isDefault: true },
];

/**
 * Loads managed units from localStorage or seeds defaults
 */
export function loadManagedUnits(): StockUnit[] {
  try {
    const raw = localStorage.getItem(UNITS_STORAGE_KEY);
    if (!raw) {
      saveManagedUnits(DEFAULT_PAKISTANI_UNITS);
      return DEFAULT_PAKISTANI_UNITS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load units from storage:', err);
  }
  return DEFAULT_PAKISTANI_UNITS;
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

/**
 * Generates unit display label based on Urdu or English preference
 */
export function getUnitDisplay(unit: StockUnit, lang: 'ur' | 'en' = 'ur'): string {
  if (lang === 'ur') {
    return unit.nameEnglish ? `${unit.nameUrdu} (${unit.nameEnglish})` : unit.nameUrdu;
  }
  return unit.nameEnglish || unit.nameUrdu;
}

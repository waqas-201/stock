import { StockTag } from '../types';

const TAGS_STORAGE_KEY = 'app_stock_tags_v1';
const LEGACY_LABELS_STORAGE_KEY = 'app_stock_labels_v1';

export interface TagColorOption {
  id: string;
  name: string;
  dot: string;
  bg: string;
  text: string;
  border: string;
  hover: string;
  activeBg: string;
}

export const TAG_COLOR_OPTIONS: TagColorOption[] = [
  {
    id: 'emerald',
    name: 'Emerald',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    hover: 'hover:bg-emerald-100',
    activeBg: 'bg-emerald-600 text-white border-emerald-600',
  },
  {
    id: 'sky',
    name: 'Sky Blue',
    dot: 'bg-sky-500',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    hover: 'hover:bg-sky-100',
    activeBg: 'bg-sky-600 text-white border-sky-600',
  },
  {
    id: 'violet',
    name: 'Violet',
    dot: 'bg-violet-500',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    hover: 'hover:bg-violet-100',
    activeBg: 'bg-violet-600 text-white border-violet-600',
  },
  {
    id: 'amber',
    name: 'Amber',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    hover: 'hover:bg-amber-100',
    activeBg: 'bg-amber-600 text-white border-amber-600',
  },
  {
    id: 'rose',
    name: 'Rose',
    dot: 'bg-rose-500',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    hover: 'hover:bg-rose-100',
    activeBg: 'bg-rose-600 text-white border-rose-600',
  },
  {
    id: 'indigo',
    name: 'Indigo',
    dot: 'bg-indigo-500',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    hover: 'hover:bg-indigo-100',
    activeBg: 'bg-indigo-600 text-white border-indigo-600',
  },
  {
    id: 'teal',
    name: 'Teal',
    dot: 'bg-teal-500',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    hover: 'hover:bg-teal-100',
    activeBg: 'bg-teal-600 text-white border-teal-600',
  },
  {
    id: 'orange',
    name: 'Orange',
    dot: 'bg-orange-500',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    hover: 'hover:bg-orange-100',
    activeBg: 'bg-orange-600 text-white border-orange-600',
  },
  {
    id: 'cyan',
    name: 'Cyan',
    dot: 'bg-cyan-500',
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    hover: 'hover:bg-cyan-100',
    activeBg: 'bg-cyan-600 text-white border-cyan-600',
  },
  {
    id: 'slate',
    name: 'Slate',
    dot: 'bg-slate-500',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    hover: 'hover:bg-slate-200',
    activeBg: 'bg-slate-700 text-white border-slate-700',
  },
];

export const DEFAULT_TAGS: StockTag[] = [
  {
    id: 'tag_office',
    name: 'Office',
    color: 'emerald',
    description: 'Office supplies, stationery & admin equipment',
    isDefault: true,
  },
  {
    id: 'tag_warehouse',
    name: 'Warehouse',
    color: 'sky',
    description: 'Bulk warehouse stock & storage units',
    isDefault: true,
  },
  {
    id: 'tag_electronics',
    name: 'Electronics',
    color: 'violet',
    description: 'Electronic components, gadgets & accessories',
    isDefault: true,
  },
  {
    id: 'tag_hardware',
    name: 'Hardware',
    color: 'indigo',
    description: 'Tools, fixtures, metalware & machine parts',
    isDefault: true,
  },
  {
    id: 'tag_fragile',
    name: 'Fragile',
    color: 'rose',
    description: 'Handle with care items and delicate glassware',
    isDefault: true,
  },
  {
    id: 'tag_perishable',
    name: 'Perishable',
    color: 'amber',
    description: 'Food, groceries, and limited shelf-life goods',
    isDefault: true,
  },
  {
    id: 'tag_packaging',
    name: 'Packaging',
    color: 'teal',
    description: 'Cartons, boxes, bubble wrap and sealing materials',
    isDefault: true,
  },
  {
    id: 'tag_urgent',
    name: 'Urgent',
    color: 'orange',
    description: 'High-priority restocking or fast-moving items',
    isDefault: true,
  },
  {
    id: 'tag_bulk',
    name: 'Bulk',
    color: 'cyan',
    description: 'High-volume inventory and wholesale bundles',
    isDefault: true,
  },
  {
    id: 'tag_safety',
    name: 'Safety',
    color: 'rose',
    description: 'Medical supplies, PPE & emergency safety gear',
    isDefault: true,
  },
];

/**
 * Loads managed tags from localStorage (or legacy labels) or initializes defaults
 */
export function loadManagedTags(): StockTag[] {
  try {
    const raw = localStorage.getItem(TAGS_STORAGE_KEY) || localStorage.getItem(LEGACY_LABELS_STORAGE_KEY);
    if (!raw) {
      saveManagedTags(DEFAULT_TAGS);
      return DEFAULT_TAGS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load tags from storage:', err);
  }
  return DEFAULT_TAGS;
}

/**
 * Saves managed tags to localStorage
 */
export function saveManagedTags(tags: StockTag[]): void {
  try {
    localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
  } catch (err) {
    console.error('Failed to save tags to storage:', err);
  }
}

/**
 * Helper to get visual styling for a tag color key
 */
export function getTagColorOption(colorId?: string): TagColorOption {
  if (!colorId) return TAG_COLOR_OPTIONS[0];
  const found = TAG_COLOR_OPTIONS.find((c) => c.id === colorId.toLowerCase());
  return found || TAG_COLOR_OPTIONS[0];
}

// Compatibility exports
export type LabelColorOption = TagColorOption;
export const LABEL_COLOR_OPTIONS = TAG_COLOR_OPTIONS;
export const DEFAULT_LABELS = DEFAULT_TAGS;
export const loadManagedLabels = loadManagedTags;
export const saveManagedLabels = saveManagedTags;
export const getLabelColorOption = getTagColorOption;

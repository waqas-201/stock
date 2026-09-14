import { StockItem } from '../types';

export interface TagStyle {
  bg: string;
  text: string;
  border: string;
  hover: string;
  activeBg: string;
}

const TAG_COLOR_PALETTES: TagStyle[] = [
  {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    hover: 'hover:bg-emerald-100',
    activeBg: 'bg-emerald-600 text-white border-emerald-600',
  },
  {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    hover: 'hover:bg-sky-100',
    activeBg: 'bg-sky-600 text-white border-sky-600',
  },
  {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    hover: 'hover:bg-violet-100',
    activeBg: 'bg-violet-600 text-white border-violet-600',
  },
  {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    hover: 'hover:bg-amber-100',
    activeBg: 'bg-amber-600 text-white border-amber-600',
  },
  {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    hover: 'hover:bg-rose-100',
    activeBg: 'bg-rose-600 text-white border-rose-600',
  },
  {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    hover: 'hover:bg-indigo-100',
    activeBg: 'bg-indigo-600 text-white border-indigo-600',
  },
  {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    hover: 'hover:bg-teal-100',
    activeBg: 'bg-teal-600 text-white border-teal-600',
  },
  {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    hover: 'hover:bg-orange-100',
    activeBg: 'bg-orange-600 text-white border-orange-600',
  },
  {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    hover: 'hover:bg-cyan-100',
    activeBg: 'bg-cyan-600 text-white border-cyan-600',
  },
];

/**
 * Returns a stable color style for a given tag string
 */
export function getTagStyle(tagName: string): TagStyle {
  if (!tagName) return TAG_COLOR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = (hash << 5) - hash + tagName.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % TAG_COLOR_PALETTES.length;
  return TAG_COLOR_PALETTES[index];
}

/**
 * Extracts unique tags from inventory items with item counts, sorted by frequency
 */
export function getUniqueTagsWithCounts(items: StockItem[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    if (Array.isArray(item.tags)) {
      item.tags.forEach((tag) => {
        const clean = tag.trim();
        if (clean) {
          counts.set(clean, (counts.get(clean) || 0) + 1);
        }
      });
    }
  });

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * Popular default preset suggestions
 */
export const POPULAR_TAG_SUGGESTIONS = [
  'Office',
  'Stationery',
  'Groceries',
  'Food',
  'Warehouse',
  'Packaging',
  'Medical',
  'Safety',
  'Kitchen',
  'Electronics',
  'Hardware',
  'Bulk',
  'Fragile',
  'Urgent',
];

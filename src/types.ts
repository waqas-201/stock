export interface StockItem {
  id: string;
  itemName: string;
  unit: string;
  quantity: number;
  lowStockThreshold?: number; // Optional item-specific threshold overriding global
  updatedAt?: string;
}

export interface StockUnit {
  id: string;
  name: string;
  code?: string;
  isDefault?: boolean;
}

export type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
export type SortField = 'name' | 'quantity' | 'date';
export type SortOrder = 'asc' | 'desc';

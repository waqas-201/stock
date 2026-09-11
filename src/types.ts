export interface StockItem {
  id: string;
  itemName: string;
  unit: string;
  quantity: number;
  updatedAt?: string;
}

export interface StockUnit {
  id: string;
  nameUrdu: string;
  nameEnglish?: string;
  isDefault?: boolean;
}

export type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
export type SortField = 'name' | 'quantity' | 'date';
export type SortOrder = 'asc' | 'desc';
export type AppLanguage = 'ur' | 'en';

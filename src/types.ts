export interface ItemAuditEntry {
  id: string;
  action: 'created' | 'quantity_changed' | 'edited' | 'deleted' | 'restored';
  timestamp: string;
  summary: string;
  details?: string;
  previousQuantity?: number;
  newQuantity?: number;
  delta?: number;
}

export interface StockItem {
  id: string;
  itemName: string;
  unit: string;
  quantity: number;
  lowStockThreshold: number; // Individual low stock alert threshold for this specific item
  productionDate?: string; // Optional production / manufacturing date (YYYY-MM-DD)
  notes?: string; // Optional notes (e.g., batch number, shelf, supplier, remarks)
  createdAt?: string;
  updatedAt?: string;
  auditTrail?: ItemAuditEntry[]; // History trail of actions on this item
}

export interface StockUnit {
  id: string;
  name: string;
  code?: string;
  isDefault?: boolean;
}

export type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
export type SortField = 'name' | 'quantity' | 'threshold' | 'date' | 'production_date';
export type SortOrder = 'asc' | 'desc';

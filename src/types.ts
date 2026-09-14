export interface ItemAuditEntry {
  id: string;
  action: 'created' | 'quantity_changed' | 'edited' | 'deleted' | 'restored';
  timestamp: string;
  summary: string;
  details?: string;
  previousQuantity?: number;
  newQuantity?: number;
  delta?: number;
  performedBy: string; // Name of staff who performed the action (e.g. "Waqas")
  userEmail?: string;
  userPhotoURL?: string;
  userId?: string;
}

export interface StockItem {
  id: string;
  itemName: string;
  unit: string;
  quantity: number;
  lowStockThreshold: number; // Individual low stock alert threshold for this specific item
  productionDate?: string; // Optional production / manufacturing date (YYYY-MM-DD)
  notes?: string; // Optional notes (e.g., batch number, shelf, supplier, remarks)
  tags?: string[]; // Optional product labels or categorization tags (e.g., "Office", "Groceries", "Warehouse")
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  createdByName?: string;
  createdByEmail?: string;
  createdByPhoto?: string;
  lastModifiedByName?: string;
  lastModifiedByEmail?: string;
  lastModifiedByPhoto?: string;
  auditTrail?: ItemAuditEntry[]; // History trail of actions on this item
}

export interface StockUnit {
  id: string;
  name: string;
  code?: string;
  isDefault?: boolean;
  userId?: string;
}

export interface OperatorProfile {
  name: string;
  email?: string;
  photoURL?: string;
  role?: string;
}

export interface UserSetting {
  userId: string;
  confirmOnDelete: boolean;
  operatorName?: string;
  updatedAt?: string;
}

export type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
export type SortField = 'name' | 'quantity' | 'threshold' | 'date' | 'production_date' | 'tags';
export type SortOrder = 'asc' | 'desc';

export type GeminiActionType =
  | 'update_stock'
  | 'add_item'
  | 'update_item'
  | 'delete_item'
  | 'filter_ui'
  | 'search_ui';

export interface GeminiAgentAction {
  id?: string;
  type: GeminiActionType;
  itemId?: string;
  itemName?: string;
  delta?: number;
  newQuantity?: number;
  unit?: string;
  lowStockThreshold?: number;
  productionDate?: string;
  notes?: string;
  tags?: string[];
  filter?: StockFilter;
  searchQuery?: string;
  reason?: string;
}


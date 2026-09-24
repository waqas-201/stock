export type AuditActionType =
  | 'created'
  | 'quantity_changed'
  | 'edited'
  | 'deleted'
  | 'restored'
  | 'audit_note'
  | 'restocked'
  | string;

export interface ItemAuditEntry {
  id: string;
  action: AuditActionType;
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
  balanceAfter?: number; // Stock level immediately after this event
  category?: 'movement' | 'edit' | 'audit' | 'lifecycle';
  noteType?: 'count_verification' | 'quality_check' | 'location_audit' | 'general';
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

export type StockTagColor =
  | 'emerald'
  | 'sky'
  | 'violet'
  | 'amber'
  | 'rose'
  | 'indigo'
  | 'teal'
  | 'orange'
  | 'cyan'
  | 'slate'
  | string;

export interface StockTag {
  id: string;
  name: string;
  color?: StockTagColor;
  description?: string;
  isDefault?: boolean;
  userId?: string;
}

// Aliases for compatibility
export type StockLabelColor = StockTagColor;
export type StockLabel = StockTag;

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
  quantity?: number;
  unit?: string;
  lowStockThreshold?: number;
  productionDate?: string;
  notes?: string;
  tags?: string[];
  filter?: StockFilter;
  searchQuery?: string;
  reason?: string;
}

export interface DeliveryChallanItem {
  itemId: string;
  itemName: string;
  unit: string;
  dispatchedQty: number;
  previousQty: number;
  remainingQty: number;
  tags?: string[];
  notes?: string;
}

export interface DeliveryChallan {
  id: string;
  challanNumber: string;
  customerName: string; // The required customer / party name
  date: string; // ISO string
  dispatchedByName: string;
  dispatchedByEmail?: string;
  items: DeliveryChallanItem[];
  totalItems: number;
  totalQuantity: number;
  notes?: string;
  deliveryAddress?: string;
  vehicleNumber?: string;
  status: 'dispatched' | 'delivered';
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  createdAt: string;
  userId?: string;
}

export type CustomerPartyType = 'customer' | 'vendor';

export interface CustomerParty {
  id: string;
  name: string; // Party / Company Name (required)
  partyType: CustomerPartyType; // 'customer' | 'vendor'
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  contactPerson?: string;
  taxNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface GoodsReceiptItem {
  itemId: string;
  itemName: string;
  unit: string;
  receivedQty: number;
  previousQty: number;
  newQty: number;
  unitCost?: number;
  tags?: string[];
  notes?: string;
}

export interface GoodsReceipt {
  id: string;
  receiptNumber: string; // e.g. GRN-20260924-001
  vendorName: string; // The vendor / supplier party name
  date: string; // ISO string
  receivedByName: string;
  receivedByEmail?: string;
  items: GoodsReceiptItem[];
  totalItems: number;
  totalQuantity: number;
  vendorInvoiceNumber?: string; // Optional PO, delivery note, or vendor bill #
  notes?: string;
  status: 'received' | 'verified';
  createdAt: string;
  userId?: string;
}


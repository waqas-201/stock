import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { StockItem, StockUnit, StockTag, StockLabel, UserSetting, OperatorProfile, DeliveryChallan, CustomerParty, GoodsReceipt } from '../types';
import { GlobalAuditRecord } from './stockStorage';

// ==========================================
// 1. Stock Items Services (Collaborative & Shared)
// ==========================================

export function subscribeStockItems(
  onItems: (items: StockItem[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const collectionPath = 'stock_items';
  try {
    const q = query(
      collection(db, collectionPath),
      limit(500)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: StockItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: data.id,
            itemName: data.itemName,
            unit: data.unit,
            quantity: Number(data.quantity) || 0,
            lowStockThreshold: Number(data.lowStockThreshold) ?? 5,
            productionDate: data.productionDate || undefined,
            notes: data.notes || undefined,
            tags: Array.isArray(data.tags) ? data.tags : [],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            userId: data.userId || undefined,
            createdByName: data.createdByName || undefined,
            createdByEmail: data.createdByEmail || undefined,
            lastModifiedByName: data.lastModifiedByName || undefined,
            lastModifiedByEmail: data.lastModifiedByEmail || undefined,
            auditTrail: Array.isArray(data.auditTrail) ? data.auditTrail : [],
          });
        });
        onItems(items);
      },
      (error) => {
        console.error('Snapshot error on stock_items:', error);
        onError?.(error);
        handleFirestoreError(error, OperationType.GET, collectionPath);
      }
    );

    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collectionPath);
    return () => {};
  }
}

export async function saveStockItemToFirestore(
  item: StockItem,
  operator?: OperatorProfile | null,
  userId?: string
): Promise<void> {
  const docPath = `stock_items/${item.id}`;
  try {
    const docRef = doc(db, 'stock_items', item.id);
    const actorName = operator?.name?.trim() || item.lastModifiedByName || 'Store Operator';
    const actorEmail = operator?.email || item.lastModifiedByEmail || null;

    const payload = {
      id: item.id,
      itemName: item.itemName,
      unit: item.unit,
      quantity: Number(item.quantity) || 0,
      lowStockThreshold: Number(item.lowStockThreshold) ?? 5,
      productionDate: item.productionDate || null,
      notes: item.notes || null,
      tags: Array.isArray(item.tags) ? item.tags : [],
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: userId || item.userId || null,
      createdByName: item.createdByName || actorName,
      createdByEmail: item.createdByEmail || actorEmail,
      lastModifiedByName: actorName,
      lastModifiedByEmail: actorEmail,
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteStockItemFromFirestore(
  itemId: string
): Promise<void> {
  const docPath = `stock_items/${itemId}`;
  try {
    const docRef = doc(db, 'stock_items', itemId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

// ==========================================
// 2. Custom Measurement Units Services (Shared)
// ==========================================

export function subscribeStockUnits(
  onUnits: (units: StockUnit[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const collectionPath = 'stock_units';
  try {
    const q = query(
      collection(db, collectionPath),
      limit(100)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const units: StockUnit[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          units.push({
            id: data.id,
            name: data.name,
            code: data.code || undefined,
            isDefault: !!data.isDefault,
            userId: data.userId || undefined,
          });
        });
        onUnits(units);
      },
      (error) => {
        console.error('Snapshot error on stock_units:', error);
        onError?.(error);
        handleFirestoreError(error, OperationType.GET, collectionPath);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collectionPath);
    return () => {};
  }
}

export async function saveStockUnitToFirestore(
  unit: StockUnit,
  userId?: string
): Promise<void> {
  const docPath = `stock_units/${unit.id}`;
  try {
    const docRef = doc(db, 'stock_units', unit.id);
    const payload = {
      id: unit.id,
      name: unit.name,
      code: unit.code || null,
      isDefault: !!unit.isDefault,
      userId: userId || unit.userId || null,
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteStockUnitFromFirestore(
  unitId: string
): Promise<void> {
  const docPath = `stock_units/${unitId}`;
  try {
    const docRef = doc(db, 'stock_units', unitId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

// ==========================================
// 2b. Stock Tags Services (Collaborative & Shared)
// ==========================================

export function subscribeStockTags(
  onTags: (tags: StockTag[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const collectionPath = 'stock_tags';
  try {
    const q = query(
      collection(db, collectionPath),
      limit(200)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const tags: StockTag[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          tags.push({
            id: data.id,
            name: data.name,
            color: data.color || 'slate',
            description: data.description || undefined,
            isDefault: !!data.isDefault,
            userId: data.userId || undefined,
          });
        });
        if (tags.length > 0) {
          tags.sort((a, b) => a.name.localeCompare(b.name));
          onTags(tags);
        }
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.GET, collectionPath);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collectionPath);
    return () => {};
  }
}

export async function saveStockTagToFirestore(
  tag: StockTag,
  userId?: string
): Promise<void> {
  const docPath = `stock_tags/${tag.id}`;
  try {
    const docRef = doc(db, 'stock_tags', tag.id);
    const payload = {
      id: tag.id,
      name: tag.name,
      color: tag.color || 'slate',
      description: tag.description || null,
      isDefault: !!tag.isDefault,
      userId: userId || tag.userId || null,
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteStockTagFromFirestore(
  tagId: string
): Promise<void> {
  const docPath = `stock_tags/${tagId}`;
  try {
    const docRef = doc(db, 'stock_tags', tagId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

// Aliases for compatibility
export const subscribeStockLabels = subscribeStockTags;
export const saveStockLabelToFirestore = saveStockTagToFirestore;
export const deleteStockLabelFromFirestore = deleteStockTagFromFirestore;

// ==========================================
// 3. Shared Audit Logs Services with Attribution
// ==========================================

export function subscribeAuditLogs(
  onLogs: (logs: GlobalAuditRecord[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const collectionPath = 'audit_logs';
  try {
    const q = query(
      collection(db, collectionPath),
      limit(300)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const logs: GlobalAuditRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          logs.push({
            id: data.id,
            timestamp: data.timestamp,
            action: data.action,
            summary: data.summary,
            details: data.details || undefined,
            itemId: data.itemId,
            itemName: data.itemName,
            unit: data.unit,
            previousQuantity: data.previousQuantity ?? undefined,
            newQuantity: data.newQuantity ?? undefined,
            delta: data.delta ?? undefined,
            performedBy: data.performedBy || 'Store Operator',
            userEmail: data.userEmail || undefined,
            userPhotoURL: data.userPhotoURL || undefined,
            userId: data.userId || undefined,
          });
        });
        // Sort descending by timestamp in memory to avoid index requirements
        logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        onLogs(logs);
      },
      (error) => {
        console.error('Snapshot error on audit_logs:', error);
        onError?.(error);
        handleFirestoreError(error, OperationType.GET, collectionPath);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collectionPath);
    return () => {};
  }
}

export async function saveAuditLogToFirestore(
  log: GlobalAuditRecord,
  userId?: string
): Promise<void> {
  if (!log || !log.id) return;
  const cleanId = log.id.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 128);
  const docPath = `audit_logs/${cleanId}`;
  try {
    const docRef = doc(db, 'audit_logs', cleanId);
    const cleanItemId = (log.itemId || 'general')
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .substring(0, 128);

    const payload = {
      id: cleanId,
      timestamp: log.timestamp || new Date().toISOString(),
      action: log.action || 'updated',
      summary: (log.summary || 'Inventory action logged').substring(0, 480),
      details: log.details ? log.details.substring(0, 4800) : null,
      itemId: cleanItemId,
      itemName: (log.itemName || 'Inventory Item').substring(0, 280),
      unit: (log.unit || 'Unit').substring(0, 50),
      previousQuantity: typeof log.previousQuantity === 'number' ? log.previousQuantity : null,
      newQuantity: typeof log.newQuantity === 'number' ? log.newQuantity : null,
      delta: typeof log.delta === 'number' ? log.delta : null,
      performedBy: (log.performedBy || 'Store Operator').substring(0, 100),
      userEmail: log.userEmail ? log.userEmail.substring(0, 100) : null,
      userPhotoURL: log.userPhotoURL ? log.userPhotoURL.substring(0, 800) : null,
      userId: userId || log.userId || null,
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore Audit Log write issue for ${docPath}:`, error);
  }
}

// ==========================================
// 4. User Preferences & Operator Settings
// ==========================================

export function subscribeUserSettings(
  userId: string,
  onSetting: (setting: UserSetting | null) => void,
  onError?: (error: unknown) => void
): () => void {
  const docPath = `user_settings/${userId}`;
  try {
    const docRef = doc(db, 'user_settings', userId);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          onSetting({
            userId: data.userId,
            confirmOnDelete: !!data.confirmOnDelete,
            operatorName: data.operatorName || undefined,
            updatedAt: data.updatedAt,
          });
        } else {
          onSetting(null);
        }
      },
      (error) => {
        console.error('Snapshot error on user_settings:', error);
        onError?.(error);
        handleFirestoreError(error, OperationType.GET, docPath);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
    return () => {};
  }
}

export async function saveUserSettingsToFirestore(
  userId: string,
  confirmOnDelete: boolean,
  operatorName?: string
): Promise<void> {
  const docPath = `user_settings/${userId}`;
  try {
    const docRef = doc(db, 'user_settings', userId);
    const payload: Record<string, any> = {
      userId,
      confirmOnDelete,
      updatedAt: new Date().toISOString(),
    };
    if (operatorName) {
      payload.operatorName = operatorName;
    }
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

// ==========================================
// 5. Delivery Challans & Multi-Item Dispatches
// ==========================================

export function subscribeDeliveryChallans(
  onChallans: (challans: DeliveryChallan[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const collectionPath = 'delivery_challans';
  try {
    const q = query(collection(db, collectionPath), limit(300));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const challans: DeliveryChallan[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          challans.push({
            id: data.id || docSnap.id,
            challanNumber: data.challanNumber || docSnap.id,
            customerName: data.customerName || 'Customer',
            date: data.date || new Date().toISOString(),
            dispatchedByName: data.dispatchedByName || 'Staff',
            dispatchedByEmail: data.dispatchedByEmail || undefined,
            items: Array.isArray(data.items) ? data.items : [],
            totalItems: typeof data.totalItems === 'number' ? data.totalItems : (data.items?.length || 0),
            totalQuantity: typeof data.totalQuantity === 'number' ? data.totalQuantity : 0,
            poNumber: data.poNumber || undefined,
            invoiceNumber: data.invoiceNumber || undefined,
            notes: data.notes || undefined,
            deliveryAddress: data.deliveryAddress || undefined,
            vehicleNumber: data.vehicleNumber || undefined,
            status: data.status || 'dispatched',
            companyName: data.companyName || undefined,
            companyAddress: data.companyAddress || undefined,
            companyPhone: data.companyPhone || undefined,
            companyEmail: data.companyEmail || undefined,
            createdAt: data.createdAt || data.date || new Date().toISOString(),
            userId: data.userId || undefined,
          });
        });
        challans.sort((a, b) => {
          const tA = new Date(a.createdAt || a.date).getTime();
          const tB = new Date(b.createdAt || b.date).getTime();
          if (isNaN(tA) || isNaN(tB)) {
            return (b.challanNumber || '').localeCompare(a.challanNumber || '');
          }
          return tB - tA;
        });
        onChallans(challans);
      },
      (error) => {
        onError?.(error);
        handleFirestoreError(error, OperationType.GET, collectionPath);
      }
    );
    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collectionPath);
    return () => {};
  }
}

export async function saveDeliveryChallanToFirestore(
  challan: DeliveryChallan,
  userId?: string
): Promise<void> {
  if (!challan || !challan.id) return;
  const cleanId = challan.id.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 128);
  const docPath = `delivery_challans/${cleanId}`;
  try {
    const docRef = doc(db, 'delivery_challans', cleanId);
    const sanitizedItems = (challan.items || []).map((it) => ({
      itemId: (it.itemId || 'item').substring(0, 128),
      itemName: (it.itemName || 'Item').substring(0, 200),
      unit: (it.unit || 'Unit').substring(0, 50),
      dispatchedQty: typeof it.dispatchedQty === 'number' ? it.dispatchedQty : 0,
      previousQty: typeof it.previousQty === 'number' ? it.previousQty : 0,
      remainingQty: typeof it.remainingQty === 'number' ? it.remainingQty : 0,
      tags: Array.isArray(it.tags) ? it.tags.slice(0, 10) : [],
      notes: it.notes ? String(it.notes).substring(0, 500) : null,
    }));

    const payload = {
      id: cleanId,
      challanNumber: (challan.challanNumber || cleanId).substring(0, 80),
      customerName: (challan.customerName || 'Customer').substring(0, 200),
      date: challan.date || new Date().toISOString(),
      dispatchedByName: (challan.dispatchedByName || 'Staff').substring(0, 120),
      dispatchedByEmail: challan.dispatchedByEmail ? challan.dispatchedByEmail.substring(0, 120) : null,
      items: sanitizedItems,
      totalItems: typeof challan.totalItems === 'number' ? challan.totalItems : sanitizedItems.length,
      totalQuantity: typeof challan.totalQuantity === 'number' ? challan.totalQuantity : 0,
      poNumber: challan.poNumber ? challan.poNumber.substring(0, 100) : null,
      invoiceNumber: challan.invoiceNumber ? challan.invoiceNumber.substring(0, 100) : null,
      notes: challan.notes ? challan.notes.substring(0, 2000) : null,
      deliveryAddress: challan.deliveryAddress ? challan.deliveryAddress.substring(0, 500) : null,
      vehicleNumber: challan.vehicleNumber ? challan.vehicleNumber.substring(0, 100) : null,
      status: (challan.status || 'dispatched').substring(0, 50),
      companyName: challan.companyName ? challan.companyName.substring(0, 200) : null,
      companyAddress: challan.companyAddress ? challan.companyAddress.substring(0, 300) : null,
      companyPhone: challan.companyPhone ? challan.companyPhone.substring(0, 50) : null,
      createdAt: challan.createdAt || new Date().toISOString(),
      userId: userId || challan.userId || null,
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore Delivery Challan write issue for ${docPath}:`, error);
  }
}

export async function deleteDeliveryChallanFromFirestore(challanId: string): Promise<void> {
  const cleanId = challanId.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 128);
  const docPath = `delivery_challans/${cleanId}`;
  try {
    const docRef = doc(db, 'delivery_challans', cleanId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

// ==========================================
// 5c. Customer & Party Services (Collaborative & Shared)
// ==========================================

export function subscribeCustomers(
  onCustomers: (customers: CustomerParty[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const collectionPath = 'customers';
  try {
    const q = query(
      collection(db, collectionPath),
      limit(500)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const customers: CustomerParty[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          customers.push({
            id: data.id,
            name: data.name,
            phone: data.phone || undefined,
            address: data.address || undefined,
            partyType: data.partyType === 'vendor' ? 'vendor' : 'customer',
            notes: data.notes || undefined,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            userId: data.userId || undefined,
          });
        });
        customers.sort((a, b) => a.name.localeCompare(b.name));
        onCustomers(customers);
      },
      (error) => {
        console.error('Snapshot error on customers:', error);
        onError?.(error);
        handleFirestoreError(error, OperationType.GET, collectionPath);
      }
    );
    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collectionPath);
    return () => {};
  }
}

export async function saveCustomerToFirestore(
  customer: CustomerParty,
  userId?: string
): Promise<void> {
  if (!customer || !customer.id) return;
  const cleanId = customer.id.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 128);
  const docPath = `customers/${cleanId}`;
  try {
    const docRef = doc(db, 'customers', cleanId);
    const payload = {
      id: cleanId,
      name: (customer.name || 'Unnamed Party').trim().substring(0, 200),
      partyType: customer.partyType === 'vendor' ? 'vendor' : 'customer',
      phone: customer.phone ? customer.phone.substring(0, 60) : null,
      address: customer.address ? customer.address.substring(0, 500) : null,
      notes: customer.notes ? customer.notes.substring(0, 2000) : null,
      createdAt: customer.createdAt || new Date().toISOString(),
      updatedAt: customer.updatedAt || new Date().toISOString(),
      userId: userId || customer.userId || null,
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore Customer write issue for ${docPath}:`, error);
  }
}

export async function deleteCustomerFromFirestore(customerId: string): Promise<void> {
  const cleanId = customerId.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 128);
  const docPath = `customers/${cleanId}`;
  try {
    const docRef = doc(db, 'customers', cleanId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

// ==========================================
// 6. Goods Receipts & Inward Stock Receiving
// ==========================================

export function subscribeGoodsReceipts(
  onReceipts: (receipts: GoodsReceipt[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const collectionPath = 'goods_receipts';
  try {
    const q = query(collection(db, collectionPath), limit(300));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const receipts: GoodsReceipt[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          receipts.push({
            id: data.id || docSnap.id,
            receiptNumber: data.receiptNumber || docSnap.id,
            vendorName: data.vendorName || 'Vendor',
            date: data.date || new Date().toISOString(),
            receivedByName: data.receivedByName || 'Staff',
            receivedByEmail: data.receivedByEmail || undefined,
            items: Array.isArray(data.items) ? data.items : [],
            totalItems: typeof data.totalItems === 'number' ? data.totalItems : (data.items?.length || 0),
            totalQuantity: typeof data.totalQuantity === 'number' ? data.totalQuantity : 0,
            vendorInvoiceNumber: data.vendorInvoiceNumber || undefined,
            notes: data.notes || undefined,
            status: data.status || 'received',
            createdAt: data.createdAt || data.date || new Date().toISOString(),
            userId: data.userId || undefined,
          });
        });
        receipts.sort((a, b) => {
          const tA = new Date(a.createdAt || a.date).getTime();
          const tB = new Date(b.createdAt || b.date).getTime();
          if (isNaN(tA) || isNaN(tB)) {
            return (b.receiptNumber || '').localeCompare(a.receiptNumber || '');
          }
          return tB - tA;
        });
        onReceipts(receipts);
      },
      (error) => {
        onError?.(error);
        handleFirestoreError(error, OperationType.GET, collectionPath);
      }
    );
    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collectionPath);
    return () => {};
  }
}

export async function saveGoodsReceiptToFirestore(
  receipt: GoodsReceipt,
  userId?: string
): Promise<void> {
  if (!receipt || !receipt.id) return;
  const cleanId = receipt.id.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 128);
  const docPath = `goods_receipts/${cleanId}`;
  try {
    const docRef = doc(db, 'goods_receipts', cleanId);
    const sanitizedItems = (receipt.items || []).map((it) => ({
      itemId: (it.itemId || 'item').substring(0, 128),
      itemName: (it.itemName || 'Item').substring(0, 200),
      unit: (it.unit || 'Unit').substring(0, 50),
      receivedQty: typeof it.receivedQty === 'number' ? it.receivedQty : 0,
      previousQty: typeof it.previousQty === 'number' ? it.previousQty : 0,
      newQty: typeof it.newQty === 'number' ? it.newQty : 0,
      unitCost: typeof it.unitCost === 'number' ? it.unitCost : null,
      tags: Array.isArray(it.tags) ? it.tags.slice(0, 10) : [],
      notes: it.notes ? String(it.notes).substring(0, 500) : null,
    }));

    const payload = {
      id: cleanId,
      receiptNumber: (receipt.receiptNumber || cleanId).substring(0, 80),
      vendorName: (receipt.vendorName || 'Vendor').substring(0, 200),
      date: receipt.date || new Date().toISOString(),
      receivedByName: (receipt.receivedByName || 'Staff').substring(0, 120),
      receivedByEmail: receipt.receivedByEmail ? receipt.receivedByEmail.substring(0, 120) : null,
      items: sanitizedItems,
      totalItems: typeof receipt.totalItems === 'number' ? receipt.totalItems : sanitizedItems.length,
      totalQuantity: typeof receipt.totalQuantity === 'number' ? receipt.totalQuantity : 0,
      vendorInvoiceNumber: receipt.vendorInvoiceNumber ? receipt.vendorInvoiceNumber.substring(0, 100) : null,
      notes: receipt.notes ? receipt.notes.substring(0, 2000) : null,
      status: (receipt.status || 'received').substring(0, 50),
      createdAt: receipt.createdAt || new Date().toISOString(),
      userId: userId || receipt.userId || null,
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore Goods Receipt write issue for ${docPath}:`, error);
  }
}

export async function deleteGoodsReceiptFromFirestore(receiptId: string): Promise<void> {
  const cleanId = receiptId.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 128);
  const docPath = `goods_receipts/${cleanId}`;
  try {
    const docRef = doc(db, 'goods_receipts', cleanId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn(`Firestore Goods Receipt delete issue for ${docPath}:`, error);
  }
}

// ==========================================
// 7. Initial Collaborative Seeding
// ==========================================

export async function migrateLocalDataToCloud(
  localItems: StockItem[],
  localUnits: StockUnit[],
  localLogs: GlobalAuditRecord[],
  operator: OperatorProfile,
  userId?: string,
  localTags?: StockTag[]
): Promise<{ migratedItems: number; migratedLogs: number }> {
  let migratedItems = 0;
  let migratedLogs = 0;

  for (const item of localItems) {
    await saveStockItemToFirestore(item, operator, userId);
    migratedItems++;
  }

  for (const unit of localUnits) {
    await saveStockUnitToFirestore(unit, userId);
  }

  if (Array.isArray(localTags)) {
    for (const tag of localTags) {
      await saveStockTagToFirestore(tag, userId);
    }
  }

  for (const log of localLogs.slice(0, 50)) {
    await saveAuditLogToFirestore(
      {
        ...log,
        performedBy: log.performedBy || operator.name,
        userEmail: log.userEmail || operator.email,
        userId: userId || log.userId,
      },
      userId
    );
    migratedLogs++;
  }

  return { migratedItems, migratedLogs };
}


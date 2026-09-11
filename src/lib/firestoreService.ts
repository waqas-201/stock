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
import { StockItem, StockUnit, UserSetting, OperatorProfile } from '../types';
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
  const docPath = `audit_logs/${log.id}`;
  try {
    const docRef = doc(db, 'audit_logs', log.id);
    const payload = {
      id: log.id,
      timestamp: log.timestamp,
      action: log.action,
      summary: log.summary,
      details: log.details || null,
      itemId: log.itemId,
      itemName: log.itemName,
      unit: log.unit,
      previousQuantity: log.previousQuantity ?? null,
      newQuantity: log.newQuantity ?? null,
      delta: log.delta ?? null,
      performedBy: log.performedBy || 'Store Operator',
      userEmail: log.userEmail || null,
      userPhotoURL: log.userPhotoURL || null,
      userId: userId || log.userId || null,
    };
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
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
// 5. Initial Collaborative Seeding
// ==========================================

export async function migrateLocalDataToCloud(
  localItems: StockItem[],
  localUnits: StockUnit[],
  localLogs: GlobalAuditRecord[],
  operator: OperatorProfile,
  userId?: string
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


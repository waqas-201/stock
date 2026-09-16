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
import { StockItem, StockUnit, StockTag, StockLabel, UserSetting, OperatorProfile } from '../types';
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
  // Ensure valid document ID format matching ^[a-zA-Z0-9_\-]+$ and length <= 128
  const validIdRegex = /^[a-zA-Z0-9_\-]+$/;
  const rawId = log.id ? String(log.id).trim() : '';
  const cleanId = (rawId && validIdRegex.test(rawId) && rawId.length <= 128)
    ? rawId
    : `aud_g_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const docPath = `audit_logs/${cleanId}`;
  try {
    const docRef = doc(db, 'audit_logs', cleanId);

    // Sanitize itemId to comply with firestore rules isValidId
    const rawItemId = log.itemId ? String(log.itemId).trim().replace(/[^a-zA-Z0-9_\-]/g, '_') : '';
    const cleanItemId = (rawItemId && rawItemId.length <= 128) ? rawItemId : 'item_general';

    const cleanItemName = log.itemName && typeof log.itemName === 'string' && log.itemName.trim()
      ? log.itemName.trim().slice(0, 200)
      : 'Inventory Item';

    const cleanUnit = log.unit && typeof log.unit === 'string' && log.unit.trim()
      ? log.unit.trim().slice(0, 50)
      : 'Units';

    const cleanAction = log.action && typeof log.action === 'string' && log.action.trim()
      ? log.action.trim().slice(0, 50)
      : 'quantity_changed';

    const cleanSummary = log.summary && typeof log.summary === 'string' && log.summary.trim()
      ? log.summary.trim().slice(0, 500)
      : 'Inventory Activity';

    const cleanDetails = log.details && typeof log.details === 'string'
      ? log.details.slice(0, 3000)
      : null;

    const cleanPerformedBy = log.performedBy && typeof log.performedBy === 'string' && log.performedBy.trim()
      ? log.performedBy.trim().slice(0, 100)
      : 'Store Operator';

    const cleanUserEmail = log.userEmail && typeof log.userEmail === 'string'
      ? log.userEmail.trim().slice(0, 100)
      : null;

    const cleanUserPhotoURL = log.userPhotoURL && typeof log.userPhotoURL === 'string'
      ? log.userPhotoURL.trim().slice(0, 1000)
      : null;

    const cleanTimestamp = log.timestamp && typeof log.timestamp === 'string' && log.timestamp.length <= 50
      ? log.timestamp
      : new Date().toISOString();

    const cleanUserId = (userId || log.userId) ? String(userId || log.userId).slice(0, 128) : null;

    const payload = {
      id: cleanId,
      timestamp: cleanTimestamp,
      action: cleanAction,
      summary: cleanSummary,
      details: cleanDetails,
      itemId: cleanItemId,
      itemName: cleanItemName,
      unit: cleanUnit,
      previousQuantity: typeof log.previousQuantity === 'number' ? log.previousQuantity : null,
      newQuantity: typeof log.newQuantity === 'number' ? log.newQuantity : null,
      delta: typeof log.delta === 'number' ? log.delta : null,
      performedBy: cleanPerformedBy,
      userEmail: cleanUserEmail,
      userPhotoURL: cleanUserPhotoURL,
      userId: cleanUserId,
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
    try {
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
    } catch (logErr) {
      console.warn('Skipping problematic audit log during migration:', log.id, logErr);
    }
  }

  return { migratedItems, migratedLogs };
}


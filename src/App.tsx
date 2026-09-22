import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { StockItem, StockUnit, StockFilter, OperatorProfile, GeminiAgentAction, StockTag, StockTagColor } from './types';
import {
  loadStoredStock,
  saveStoredStock,
  loadConfirmOnDelete,
  saveConfirmOnDelete,
  generateItemId,
  loadGlobalAuditLog,
  saveGlobalAuditLog,
  appendGlobalAuditLog,
  createAuditEntry,
  loadOperatorProfile,
  saveOperatorProfile,
  GlobalAuditRecord,
  getUnifiedAuditLogs,
} from './lib/stockStorage';
import {
  loadManagedUnits,
  saveManagedUnits,
  DEFAULT_UNITS,
} from './lib/unitStorage';
import {
  loadManagedTags,
  saveManagedTags,
  DEFAULT_TAGS,
} from './lib/tagStorage';
import {
  exportToExcel,
  exportToCsv,
  parseExcelOrCsvFile,
} from './lib/excelExport';
import {
  auth,
  signInWithGoogle,
  signInQuickAccess,
  signOutUser,
  onAuthStateChanged,
  User,
} from './lib/firebase';
import {
  subscribeStockItems,
  saveStockItemToFirestore,
  deleteStockItemFromFirestore,
  subscribeStockUnits,
  saveStockUnitToFirestore,
  deleteStockUnitFromFirestore,
  subscribeStockTags,
  saveStockTagToFirestore,
  deleteStockTagFromFirestore,
  subscribeAuditLogs,
  saveAuditLogToFirestore,
  subscribeUserSettings,
  saveUserSettingsToFirestore,
  migrateLocalDataToCloud,
} from './lib/firestoreService';

// Components
import { Navbar } from './components/Navbar';
import { StockSummary } from './components/StockSummary';
import { StockTable } from './components/StockTable';
import { AddItemModal } from './components/AddItemModal';
import { EditItemModal } from './components/EditItemModal';
import { ItemDetailsModal } from './components/ItemDetailsModal';
import { AuditTrailModal } from './components/AuditTrailModal';
import { UnitManagementModal } from './components/UnitManagementModal';
import { TagManagementModal } from './components/TagManagementModal';
import { OperatorModal } from './components/OperatorModal';
import { GeminiStockChatModal } from './components/GeminiStockChatModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { UnauthorizedDomainModal } from './components/UnauthorizedDomainModal';
import { ExportExcelModal } from './components/ExportExcelModal';
import { QuickSaleModal } from './components/QuickSaleModal';
import { TimezoneSelectorModal } from './components/TimezoneSelectorModal';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  Plus,
  RotateCcw,
  Database,
  CloudCheck,
  LogIn,
  Loader2,
  Sparkles,
  UserCheck,
  ShieldCheck,
  Users,
} from 'lucide-react';

export function App() {
  // Authentication & Cloud DB state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const hasMigratedRef = useRef(false);

  // App states
  const [items, setItems] = useState<StockItem[]>(() => loadStoredStock());
  const [units, setUnits] = useState<StockUnit[]>(() => loadManagedUnits());
  const [tags, setTags] = useState<StockTag[]>(() => loadManagedTags());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<StockFilter>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Available unique tags across inventory & managed tag catalog for autocomplete and suggestion pills
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    tags.forEach((tag) => {
      if (tag.name && tag.name.trim()) set.add(tag.name.trim());
    });
    items.forEach((item) => {
      if (Array.isArray(item.tags)) {
        item.tags.forEach((t) => {
          if (t && t.trim()) set.add(t.trim());
        });
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items, tags]);

  const [globalLogs, setGlobalLogs] = useState<GlobalAuditRecord[]>(() => {
    const raw = loadGlobalAuditLog();
    const storedItems = loadStoredStock();
    return getUnifiedAuditLogs(raw, storedItems);
  });

  // Compute unified audit trail that guarantees zero data loss across items and global ledger
  const unifiedLogs = useMemo(() => {
    return getUnifiedAuditLogs(globalLogs, items);
  }, [globalLogs, items]);

  // Self-heal audit records: automatically sync any missing item activities into globalLogs and Firestore
  useEffect(() => {
    const unified = getUnifiedAuditLogs(globalLogs, items);
    if (unified.length > globalLogs.length) {
      setGlobalLogs(unified);
      saveGlobalAuditLog(unified);
      if (currentUser?.uid) {
        const existingIds = new Set(globalLogs.map((l) => l.id));
        const missing = unified.filter((l) => !existingIds.has(l.id));
        if (missing.length > 0) {
          missing.slice(0, 25).forEach((log) => {
            saveAuditLogToFirestore(log, currentUser.uid).catch((err) => {
              console.warn('Sync missing item audit to Firestore:', err);
            });
          });
        }
      }
    }
  }, [items, globalLogs, currentUser]);

  // Active Operator / Staff Profile for modification attribution & audit trail
  const [operator, setOperator] = useState<OperatorProfile>(() =>
    loadOperatorProfile()
  );
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);
  const [isGeminiChatOpen, setIsGeminiChatOpen] = useState(false);

  // User choice: whether to show confirmation dialog before deleting items
  const [confirmOnDelete, setConfirmOnDelete] = useState<boolean>(() =>
    loadConfirmOnDelete()
  );

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialTab, setAddModalInitialTab] = useState<'restock' | 'new_item'>('new_item');
  const [restockTargetItem, setRestockTargetItem] = useState<StockItem | null>(null);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [selectedItemForDetails, setSelectedItemForDetails] =
    useState<StockItem | null>(null);
  const [isAuditTrailModalOpen, setIsAuditTrailModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);
  const [dontAskAgainInDialog, setDontAskAgainInDialog] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
  const [currentDomain, setCurrentDomain] = useState('');
  const [isExportExcelModalOpen, setIsExportExcelModalOpen] = useState(false);
  const [isTimezoneModalOpen, setIsTimezoneModalOpen] = useState(false);

  // Quick Sale / Rapid Stock Deduction (Alt + B shortcut)
  const [isQuickSaleModalOpen, setIsQuickSaleModalOpen] = useState(false);
  const [quickSaleTargetItem, setQuickSaleTargetItem] = useState<StockItem | null>(null);
  const [activeKeyboardItem, setActiveKeyboardItem] = useState<StockItem | null>(null);
  const activeKeyboardItemRef = useRef<StockItem | null>(null);

  const handleActiveKeyboardItemChange = useCallback((item: StockItem | null) => {
    activeKeyboardItemRef.current = item;
    setActiveKeyboardItem(item);
  }, []);

  const handleOpenQuickSale = useCallback(
    (item?: StockItem | null) => {
      const target = item || activeKeyboardItemRef.current || activeKeyboardItem || (items.length > 0 ? items[0] : null);
      if (!target) {
        showToast('No stock items available to modify or sell.', 'info');
        return;
      }
      setQuickSaleTargetItem(target);
      setIsQuickSaleModalOpen(true);
    },
    [activeKeyboardItem, items]
  );

  // Open Add Item modal directly on the "Register New Catalog SKU" tab and land inside its input box
  const openRegisterNewSKUModal = useCallback(() => {
    setRestockTargetItem(null);
    setAddModalInitialTab('new_item');
    setIsAddModalOpen(true);
    // Direct focus landing inside Register New Catalog SKU input
    setTimeout(() => {
      const input = document.getElementById('new-item-name') as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.select();
      }
    }, 60);
  }, []);

  // Notification Toast with optional Action (e.g. Undo)
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  } | null>(null);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success',
    action?: { label: string; onClick: () => void }
  ) => {
    setToast({ message, type, action });
  };

  useEffect(() => {
    if (!toast) return;
    const duration = toast.action ? 5500 : 3500;
    const timer = setTimeout(() => setToast(null), duration);
    return () => clearTimeout(timer);
  }, [toast]);

  // Dedicated keyboard shortcuts: Alt+K (Search), Alt+B (Quick Sale), A+N / Alt+N (Add Item)
  const lastKeySequenceRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });
  const activePressedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Alt + K (Windows/Linux/macOS) -> Focus search bar instantly
      if (
        e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        (e.key === 'k' || e.key === 'K' || e.code === 'KeyK')
      ) {
        e.preventDefault();
        const searchInput = document.getElementById('search-stock-input') as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // 2. Alt + B (Windows/Linux/macOS) -> Rapid Quick Sale / Modify Active Item
      if (
        e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        (e.key === 'b' || e.key === 'B' || e.code === 'KeyB')
      ) {
        e.preventDefault();
        handleOpenQuickSale();
        return;
      }

      const activeElement = document.activeElement;
      const isTypingInField =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          (activeElement as HTMLElement).isContentEditable);

      activePressedKeysRef.current.add(e.key.toLowerCase());

      // 3. Alt + N or Alt + A -> Open Register New Catalog SKU
      const isAltShortcut =
        e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        (e.key === 'n' || e.key === 'N' || e.code === 'KeyN' || e.key === 'a' || e.key === 'A' || e.code === 'KeyA');

      // 4. Chord: Holding 'A' and pressing 'N' (or vice-versa) when not inside an editable field
      const isChordAN =
        !isTypingInField &&
        ((activePressedKeysRef.current.has('a') && (e.key === 'n' || e.key === 'N')) ||
          (activePressedKeysRef.current.has('n') && (e.key === 'a' || e.key === 'A')));

      // 5. Sequence: Pressing 'a' then 'n' within 1.2s when not inside an editable field
      let isSequenceAN = false;
      if (!isTypingInField && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const lower = e.key.toLowerCase();
        if (lower === 'a') {
          lastKeySequenceRef.current = { key: 'a', time: Date.now() };
        } else if (lower === 'n') {
          if (
            lastKeySequenceRef.current.key === 'a' &&
            Date.now() - lastKeySequenceRef.current.time < 1200
          ) {
            isSequenceAN = true;
            lastKeySequenceRef.current = { key: '', time: 0 };
          }
        }
      }

      if (isAltShortcut || isChordAN || isSequenceAN) {
        e.preventDefault();
        openRegisterNewSKUModal();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activePressedKeysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleOpenQuickSale, openRegisterNewSKUModal]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
      if (user) {
        setOperator((prev) => {
          const rawName = prev?.name || 'Waqas';
          const cleanName = rawName.replace(/\s*\(Admin\)/gi, '').trim() || 'Waqas';
          const isGeneric = cleanName === 'Staff Member' || cleanName === 'Store Operator';
          const updated: OperatorProfile = {
            name: isGeneric && user.displayName ? user.displayName : cleanName,
            email: user.email || prev?.email || '',
            role: prev?.role && !/admin|manager/i.test(prev.role) ? prev.role : 'Team Member',
            photoURL: user.photoURL || prev?.photoURL,
          };
          saveOperatorProfile(updated);
          return updated;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore synchronizer for items
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeStockItems(
      async (firestoreItems) => {
        if (firestoreItems.length === 0 && !hasMigratedRef.current) {
          const localItems = loadStoredStock();
          if (localItems.length > 0) {
            hasMigratedRef.current = true;
            setIsMigrating(true);
            try {
              const localUnits = loadManagedUnits();
              const localTags = loadManagedTags();
              const localLogs = loadGlobalAuditLog();
              const { migratedItems } = await migrateLocalDataToCloud(
                localItems,
                localUnits,
                localLogs,
                operator,
                currentUser.uid,
                localTags
              );
              if (migratedItems > 0) {
                showToast(
                  `Successfully migrated ${migratedItems} local items to Cloud Firestore!`,
                  'success'
                );
              }
            } catch (err) {
              console.error('Migration error:', err);
            } finally {
              setIsMigrating(false);
            }
            return;
          }
        }
        setItems((prevItems) => {
          const prevMap = new Map<string, StockItem>(prevItems.map((i) => [i.id, i]));
          const localStoredItems: StockItem[] = loadStoredStock();
          const localStoredMap = new Map<string, StockItem>(localStoredItems.map((i) => [i.id, i]));

          const merged = firestoreItems.map((fi) => {
            const existing = prevMap.get(fi.id) || localStoredMap.get(fi.id);
            return {
              ...fi,
              auditTrail:
                fi.auditTrail && fi.auditTrail.length > 0
                  ? fi.auditTrail
                  : existing?.auditTrail || [],
            };
          });

          // Retain local items that haven't synced to Firestore yet
          const firestoreIds = new Set(firestoreItems.map((i) => i.id));
          prevItems.forEach((pi) => {
            if (!firestoreIds.has(pi.id)) {
              merged.push(pi);
            }
          });

          saveStoredStock(merged);
          return merged;
        });
      },
      (err) => {
        console.error('Firestore items subscription error:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Real-time Firestore synchronizer for units
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeStockUnits((firestoreUnits) => {
      if (firestoreUnits.length > 0) {
        setUnits(firestoreUnits);
        saveManagedUnits(firestoreUnits);
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Real-time Firestore synchronizer for tags
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeStockTags((firestoreTags) => {
      if (firestoreTags.length > 0) {
        setTags(firestoreTags);
        saveManagedTags(firestoreTags);
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Real-time Firestore synchronizer for audit logs with lossless merging
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeAuditLogs((firestoreLogs) => {
      setGlobalLogs((prevLogs) => {
        const logMap = new Map<string, GlobalAuditRecord>();

        // 1. Retain all existing local logs in memory
        prevLogs.forEach((l) => {
          if (l.id) logMap.set(l.id, l);
        });

        // 2. Retain any persisted logs from local storage
        const localStoredLogs = loadGlobalAuditLog();
        localStoredLogs.forEach((l) => {
          if (l.id) logMap.set(l.id, l);
        });

        // 3. Merge incoming Firestore logs
        firestoreLogs.forEach((l) => {
          if (l.id) logMap.set(l.id, l);
        });

        const combined = Array.from(logMap.values()).sort((a, b) =>
          b.timestamp.localeCompare(a.timestamp)
        );
        const localItems = loadStoredStock();
        const fullyUnified = getUnifiedAuditLogs(combined, localItems);
        saveGlobalAuditLog(fullyUnified);

        // 4. Background-sync any local-only logs to Firestore
        const firestoreIds = new Set(firestoreLogs.map((l) => l.id));
        const unsyncedLogs = fullyUnified.filter((l) => !firestoreIds.has(l.id));
        if (unsyncedLogs.length > 0 && currentUser?.uid) {
          unsyncedLogs.slice(0, 20).forEach((log) => {
            saveAuditLogToFirestore(log, currentUser.uid).catch((err) => {
              console.warn('Background sync audit log error:', err);
            });
          });
        }

        return fullyUnified;
      });
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Real-time Firestore synchronizer for user settings
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeUserSettings(currentUser.uid, (setting) => {
      if (setting) {
        setConfirmOnDelete(setting.confirmOnDelete);
        saveConfirmOnDelete(setting.confirmOnDelete);
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Persist items locally and to Cloud DB
  const updateItems = (newItems: StockItem[]) => {
    setItems(newItems);
    saveStoredStock(newItems);
  };

  // Persist units locally and to Cloud DB
  const updateUnits = (newUnits: StockUnit[]) => {
    setUnits(newUnits);
    saveManagedUnits(newUnits);
  };

  // Persist tags locally and to Cloud DB
  const updateTags = (newTags: StockTag[]) => {
    setTags(newTags);
    saveManagedTags(newTags);
  };

  // Google Sign-In handler with automatic fallback & domain guidance
  const handleSignInWithGoogle = async () => {
    try {
      showToast('Opening Google sign-in...', 'info');
      const user = await signInWithGoogle();
      if (user) {
        showToast(`Connected as ${user.displayName || user.email}! Cloud DB active.`, 'success');
      }
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      const isUnauthorizedDomain =
        err?.code === 'auth/unauthorized-domain' ||
        (typeof err?.message === 'string' && err.message.includes('unauthorized-domain'));

      const isNetworkOrIframeError =
        err?.code === 'auth/network-request-failed' ||
        err?.code === 'auth/popup-blocked' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/internal-error' ||
        (typeof err?.message === 'string' &&
          (err.message.includes('network-request-failed') ||
            err.message.includes('popup-blocked') ||
            err.message.includes('Cross-Origin')));

      if (isUnauthorizedDomain) {
        // Attempt quick anonymous team connection so Cloud DB connects immediately!
        try {
          showToast('Attempting quick team connection...', 'info');
          const anonUser = await signInQuickAccess();
          if (anonUser) {
            showToast('Connected to Cloud DB via Quick Team Pass! Real-time sync active.', 'success');
            return;
          }
        } catch (anonErr) {
          console.warn('Quick access fallback not available:', anonErr);
        }

        // Domain not authorized in Firebase Console - open helper modal
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        setCurrentDomain(host);
        setIsDomainModalOpen(true);
        showToast('Domain authorization required in Firebase Console for Google login.', 'error');
      } else if (isNetworkOrIframeError) {
        // Iframe or network restriction on Google popup - fall back to Quick Team Pass
        try {
          showToast('Popup restricted in iframe. Connecting via Quick Team Session...', 'info');
          const anonUser = await signInQuickAccess();
          if (anonUser) {
            showToast(
              'Connected to Cloud DB via Quick Team Pass! Real-time sync active.',
              'success'
            );
            return;
          }
        } catch (anonErr) {
          console.warn('Quick access fallback after network failure failed:', anonErr);
        }

        showToast(
          'Google popup was restricted in iframe. Click to connect directly:',
          'error',
          {
            label: 'Quick Connect',
            onClick: handleQuickConnect,
          }
        );
      } else {
        showToast(err.message || 'Could not sign in with Google', 'error');
      }
    }
  };

  // Quick Team Connect handler (doesn't require Google OAuth domain whitelist)
  const handleQuickConnect = async () => {
    try {
      showToast('Connecting via Quick Team Session...', 'info');
      const user = await signInQuickAccess();
      if (user) {
        showToast('Connected to Cloud DB! Real-time Firestore sync active.', 'success');
      }
    } catch (err: any) {
      console.error('Quick access error:', err);
      if (err?.code === 'auth/admin-restricted-operation') {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        setCurrentDomain(host);
        setIsDomainModalOpen(true);
        showToast('Please authorize your domain in Firebase Console for Google sign-in.', 'error');
      } else {
        showToast(err.message || 'Could not connect to Cloud DB', 'error');
      }
    }
  };

  // Google Sign-Out handler
  const handleSignOut = async () => {
    try {
      await signOutUser();
      hasMigratedRef.current = false;
      showToast('Signed out of Cloud DB. Working in local storage mode.', 'info');
    } catch (err: any) {
      console.error('Sign-Out error:', err);
    }
  };

  // Toggle delete confirmation preference
  const handleToggleConfirmOnDelete = () => {
    // Audit Policy Enforced: Deletion without an explanatory note is strictly impossible
    setConfirmOnDelete(true);
    saveConfirmOnDelete(true);
    if (currentUser) {
      saveUserSettingsToFirestore(currentUser.uid, true).catch(console.error);
    }
    showToast(
      'Audit Policy Enforced: Every item deletion strictly requires an explanatory note and confirmation.',
      'info'
    );
  };

  // Unit management actions
  const handleAddUnit = (name: string, code?: string) => {
    const newUnit: StockUnit = {
      id: 'u_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name,
      code,
      isDefault: false,
      userId: currentUser?.uid,
    };
    const next = [...units, newUnit];
    updateUnits(next);
    if (currentUser) {
      saveStockUnitToFirestore(newUnit, currentUser.uid).catch(console.error);
    }
    showToast(`Added unit "${name}"`, 'success');
  };

  const handleUpdateUnit = (id: string, name: string, code?: string) => {
    const target = units.find((u) => u.id === id);
    const updated: StockUnit = {
      ...(target || { id, name, isDefault: false }),
      name,
      code,
      userId: currentUser?.uid,
    };
    const next = units.map((u) => (u.id === id ? updated : u));
    updateUnits(next);
    if (currentUser) {
      saveStockUnitToFirestore(updated, currentUser.uid).catch(console.error);
    }
    showToast(`Updated unit to "${name}"`, 'success');
  };

  const handleDeleteUnit = (id: string) => {
    const target = units.find((u) => u.id === id);
    if (!target) return;

    // Check if any items use this unit
    const usedBy = items.filter((i) => i.unit === target.name);
    if (usedBy.length > 0) {
      showToast(`Cannot delete "${target.name}": used by ${usedBy.length} items.`, 'error');
      return;
    }

    const next = units.filter((u) => u.id !== id);
    updateUnits(next);
    if (currentUser) {
      deleteStockUnitFromFirestore(id).catch(console.error);
    }
    showToast(`Unit "${target.name}" removed`, 'info');
  };

  const handleResetUnits = () => {
    updateUnits(DEFAULT_UNITS);
    if (currentUser) {
      DEFAULT_UNITS.forEach((unit) => {
        saveStockUnitToFirestore({ ...unit, userId: currentUser.uid }, currentUser.uid).catch(
          console.error
        );
      });
    }
    showToast('Reset units to default list', 'info');
  };

  // Tag Management handlers
  const handleCreateTag = (name: string, color: StockTagColor, description?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`Tag "${trimmed}" already exists.`, 'error');
      return;
    }
    const newTag: StockTag = {
      id: 'tag_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: trimmed,
      color,
      description: description?.trim() || undefined,
      isDefault: false,
      userId: currentUser?.uid,
    };
    const next = [...tags, newTag];
    updateTags(next);
    if (currentUser) {
      saveStockTagToFirestore(newTag, currentUser.uid).catch(console.error);
    }
    showToast(`Created tag "${trimmed}"`, 'success');
  };

  const handleUpdateTag = (
    id: string,
    name: string,
    color: StockTagColor,
    description?: string
  ) => {
    const trimmed = name.trim();
    const target = tags.find((t) => t.id === id);
    if (!target) return;
    const oldName = target.name;

    const updated: StockTag = {
      ...target,
      name: trimmed,
      color,
      description: description?.trim() || undefined,
      userId: currentUser?.uid,
    };
    const next = tags.map((t) => (t.id === id ? updated : t));
    updateTags(next);

    // If tag name changed, update corresponding tags on existing inventory items
    if (oldName !== trimmed) {
      const updatedItems = items.map((itm) => {
        if (Array.isArray(itm.tags) && itm.tags.includes(oldName)) {
          const newTags = itm.tags.map((t) => (t === oldName ? trimmed : t));
          const updatedItem = { ...itm, tags: newTags };
          if (currentUser) {
            saveStockItemToFirestore(updatedItem, operator, currentUser.uid).catch(console.error);
          }
          return updatedItem;
        }
        return itm;
      });
      updateItems(updatedItems);
    }

    if (currentUser) {
      saveStockTagToFirestore(updated, currentUser.uid).catch(console.error);
    }
    showToast(`Updated tag "${trimmed}"`, 'success');
  };

  const handleDeleteTag = (id: string, removeTagFromItems?: boolean) => {
    const target = tags.find((t) => t.id === id);
    if (!target) return;

    const next = tags.filter((t) => t.id !== id);
    updateTags(next);

    if (removeTagFromItems) {
      const updatedItems = items.map((itm) => {
        if (Array.isArray(itm.tags) && itm.tags.includes(target.name)) {
          const newTags = itm.tags.filter((t) => t !== target.name);
          const updatedItem = { ...itm, tags: newTags };
          if (currentUser) {
            saveStockItemToFirestore(updatedItem, operator, currentUser.uid).catch(console.error);
          }
          return updatedItem;
        }
        return itm;
      });
      updateItems(updatedItems);
    }

    if (currentUser) {
      deleteStockTagFromFirestore(id).catch(console.error);
    }
    showToast(`Tag "${target.name}" removed`, 'info');
  };

  const handleResetTags = () => {
    updateTags(DEFAULT_TAGS);
    if (currentUser) {
      DEFAULT_TAGS.forEach((tag) => {
        saveStockTagToFirestore({ ...tag, userId: currentUser.uid }, currentUser.uid).catch(
          console.error
        );
      });
    }
    showToast('Reset tags to default palette', 'info');
  };

  // Stock items actions with production date, notes, tags, and complete audit trail
  const handleAddItem = (
    itemName: string,
    unit: string,
    quantity: number,
    lowStockThreshold: number,
    productionDate?: string,
    notes?: string,
    tags?: string[]
  ) => {
    const cleanNote = (notes || '').trim();
    if (!cleanNote) {
      showToast(`Cannot add "${itemName}": An audit note is strictly required.`, 'error');
      return;
    }

    const now = new Date().toISOString();
    const cleanTags = Array.isArray(tags)
      ? tags.map((t) => t.trim().replace(/^#+/, '')).filter((t) => t.length > 0)
      : [];

    const auditEntry = createAuditEntry(
      'created',
      'Item added',
      `Audit Note: "${cleanNote}" • Initial stock: ${quantity} ${unit}, Alert threshold: ≤ ${lowStockThreshold}${
        productionDate ? `, Production Date: ${productionDate}` : ''
      }${cleanTags.length > 0 ? `, Tags: [${cleanTags.join(', ')}]` : ''}`,
      undefined,
      quantity,
      operator.name,
      operator.email
    );

    const newItem: StockItem = {
      id: generateItemId(),
      itemName,
      unit,
      quantity,
      lowStockThreshold,
      productionDate,
      notes: cleanNote,
      tags: cleanTags,
      createdAt: now,
      updatedAt: now,
      userId: currentUser?.uid,
      createdByName: operator.name,
      createdByEmail: operator.email,
      lastModifiedByName: operator.name,
      lastModifiedByEmail: operator.email,
      auditTrail: [auditEntry],
    };

    const next = [newItem, ...items];
    updateItems(next);

    // Global audit trail recording
    const globalEntry = appendGlobalAuditLog({
      ...auditEntry,
      itemId: newItem.id,
      itemName: newItem.itemName,
      unit: newItem.unit,
      performedBy: operator.name,
      userEmail: operator.email,
    });
    setGlobalLogs((prev) => [globalEntry, ...prev]);

    // Firestore persistence
    if (currentUser) {
      saveStockItemToFirestore(newItem, operator, currentUser.uid).catch(console.error);
      saveAuditLogToFirestore(globalEntry, currentUser.uid).catch(console.error);
    }

    showToast(`Added "${itemName}" by ${operator.name}`, 'success');
  };

  const handleSaveEditItem = (
    id: string,
    itemName: string,
    unit: string,
    quantity: number,
    lowStockThreshold: number,
    productionDate?: string,
    notes?: string,
    tags?: string[]
  ) => {
    const current = items.find((i) => i.id === id);
    if (!current) return;

    const cleanNote = (notes || '').trim();
    if (!cleanNote) {
      showToast(`Cannot update "${itemName}": An audit note is strictly required.`, 'error');
      return;
    }

    const cleanTags = Array.isArray(tags)
      ? tags.map((t) => t.trim().replace(/^#+/, '')).filter((t) => t.length > 0)
      : [];

    const changes: string[] = [];
    if (current.itemName !== itemName) {
      changes.push(`Name: "${current.itemName}" → "${itemName}"`);
    }
    if (current.unit !== unit) {
      changes.push(`Unit: ${current.unit} → ${unit}`);
    }
    if (current.quantity !== quantity) {
      changes.push(`Stock: ${current.quantity} → ${quantity}`);
    }
    if (current.lowStockThreshold !== lowStockThreshold) {
      changes.push(
        `Alert limit: ≤${current.lowStockThreshold ?? 5} → ≤${lowStockThreshold}`
      );
    }
    if (current.productionDate !== productionDate) {
      changes.push(
        `Prod Date: ${current.productionDate || 'None'} → ${
          productionDate || 'None'
        }`
      );
    }
    const currentTagsStr = Array.isArray(current.tags) ? current.tags.join(', ') : '';
    const newTagsStr = cleanTags.join(', ');
    if (currentTagsStr !== newTagsStr) {
      changes.push(`Tags: [${currentTagsStr || 'none'}] → [${newTagsStr || 'none'}]`);
    }
    if (current.notes !== cleanNote) {
      changes.push('Note updated');
    }

    const auditEntry = createAuditEntry(
      'edited',
      changes.length > 0 ? `Item details modified` : `Item saved without changes`,
      `Audit Note: "${cleanNote}"${changes.length > 0 ? ` • ${changes.join(' • ')}` : ''}`,
      current.quantity,
      quantity,
      operator.name,
      operator.email
    );

    const updatedTrail = [auditEntry, ...(current.auditTrail || [])];

    const updatedItem: StockItem = {
      ...current,
      itemName,
      unit,
      quantity,
      lowStockThreshold,
      productionDate,
      notes: cleanNote,
      tags: cleanTags,
      updatedAt: new Date().toISOString(),
      userId: currentUser?.uid || current.userId,
      lastModifiedByName: operator.name,
      lastModifiedByEmail: operator.email,
      auditTrail: updatedTrail,
    };

    const next = items.map((i) => (i.id === id ? updatedItem : i));
    updateItems(next);

    // Global audit trail recording
    const globalEntry = appendGlobalAuditLog({
      ...auditEntry,
      itemId: id,
      itemName,
      unit,
      performedBy: operator.name,
      userEmail: operator.email,
    });
    setGlobalLogs((prev) => [globalEntry, ...prev]);

    // Firestore persistence
    if (currentUser) {
      saveStockItemToFirestore(updatedItem, operator, currentUser.uid).catch(console.error);
      saveAuditLogToFirestore(globalEntry, currentUser.uid).catch(console.error);
    }

    // Update details modal if currently open on this item
    if (selectedItemForDetails && selectedItemForDetails.id === id) {
      setSelectedItemForDetails(updatedItem);
    }

    showToast(`Updated "${itemName}" by ${operator.name}`, 'success');
  };

  // Core delete execution with instant 1-tap Undo support and audit logging
  const executeDelete = (item: StockItem, reasonNote: string) => {
    const trimmedReason = (reasonNote || '').trim();
    if (!trimmedReason) {
      showToast(`Cannot delete "${item.itemName}": An explanation note is strictly required.`, 'error');
      return;
    }

    const itemIndex = items.findIndex((i) => i.id === item.id);
    const next = items.filter((i) => i.id !== item.id);
    updateItems(next);

    if (selectedItemForDetails?.id === item.id) {
      setSelectedItemForDetails(null);
    }

    // Firestore deletion
    if (currentUser) {
      deleteStockItemFromFirestore(item.id).catch(console.error);
    }

    // Log deletion in global audit trail so it's always traceable
    const deleteEntry = appendGlobalAuditLog({
      action: 'deleted',
      summary: `Removed item "${item.itemName}" from inventory`,
      details: `Audit Note: "${trimmedReason}" • Had ${item.quantity} ${item.unit} when deleted (Alert limit was ≤ ${
        item.lowStockThreshold ?? 5
      })`,
      previousQuantity: item.quantity,
      newQuantity: 0,
      delta: -item.quantity,
      itemId: item.id,
      itemName: item.itemName,
      unit: item.unit,
      performedBy: operator.name,
      userEmail: operator.email,
    });
    setGlobalLogs((prev) => [deleteEntry, ...prev]);

    if (currentUser) {
      saveAuditLogToFirestore(deleteEntry, currentUser.uid).catch(console.error);
    }

    // Provide immediate Undo action
    showToast(`Removed "${item.itemName}" (Note: "${trimmedReason}") by ${operator.name}`, 'info', {
      label: 'Undo',
      onClick: () => {
        setItems((currentItems) => {
          const restored = [...currentItems];
          if (itemIndex >= 0 && itemIndex <= restored.length) {
            restored.splice(itemIndex, 0, item);
          } else {
            restored.unshift(item);
          }
          saveStoredStock(restored);
          return restored;
        });

        if (currentUser) {
          saveStockItemToFirestore(item, operator, currentUser.uid).catch(console.error);
        }

        // Record restoration in global audit trail
        const restoreEntry = appendGlobalAuditLog({
          action: 'restored',
          summary: `Restored "${item.itemName}" back to inventory`,
          details: `Restored with ${item.quantity} ${item.unit} (Reverted deletion note: "${trimmedReason}")`,
          previousQuantity: 0,
          newQuantity: item.quantity,
          delta: item.quantity,
          itemId: item.id,
          itemName: item.itemName,
          unit: item.unit,
          performedBy: operator.name,
          userEmail: operator.email,
        });
        setGlobalLogs((prev) => [restoreEntry, ...prev]);

        if (currentUser) {
          saveAuditLogToFirestore(restoreEntry, currentUser.uid).catch(console.error);
        }

        showToast(`Restored "${item.itemName}"`, 'success');
      },
    });
  };

  // Handle user clicking delete on an item - ALWAYS requires confirmation dialog & mandatory note
  const handleDeleteItemClick = (item: StockItem) => {
    setItemToDelete(item);
  };

  // Confirm delete from dialog with mandatory reason note
  const handleDeleteItemConfirm = (note: string) => {
    if (!itemToDelete) return;
    const item = itemToDelete;
    const trimmedNote = (note || '').trim();
    if (!trimmedNote) {
      showToast(`Cannot delete "${item.itemName}": An audit note explaining the deletion is strictly required.`, 'error');
      return;
    }
    setItemToDelete(null);
    executeDelete(item, trimmedNote);
  };

  const handleQuickQuantityChange = (item: StockItem, delta: number, note?: string) => {
    const cleanNote = (note || '').trim();
    if (!cleanNote) {
      showToast(`Cannot adjust quantity for "${item.itemName}": An audit note is strictly required. Please use "Add Stock" or "Quick Sale".`, 'error');
      return;
    }
    const newQty = Math.max(0, (item.quantity || 0) + delta);
    if (newQty === item.quantity) return;

    const auditEntry = createAuditEntry(
      'quantity_changed',
      delta > 0
        ? `Stock increased (+${delta} ${item.unit})`
        : `Stock reduced (${delta} ${item.unit})`,
      `Audit Note: "${cleanNote}" • Quantity changed from ${item.quantity} to ${newQty} ${item.unit}`,
      item.quantity,
      newQty,
      operator.name,
      operator.email
    );

    const updatedTrail = [auditEntry, ...(item.auditTrail || [])];

    const updatedItem: StockItem = {
      ...item,
      quantity: newQty,
      updatedAt: new Date().toISOString(),
      userId: currentUser?.uid || item.userId,
      lastModifiedByName: operator.name,
      lastModifiedByEmail: operator.email,
      auditTrail: updatedTrail,
    };

    const next = items.map((i) => (i.id === item.id ? updatedItem : i));
    updateItems(next);

    // Global audit trail recording
    const globalEntry = appendGlobalAuditLog({
      ...auditEntry,
      itemId: item.id,
      itemName: item.itemName,
      unit: item.unit,
      performedBy: operator.name,
      userEmail: operator.email,
    });
    setGlobalLogs((prev) => [globalEntry, ...prev]);

    // Firestore persistence
    if (currentUser) {
      saveStockItemToFirestore(updatedItem, operator, currentUser.uid).catch(console.error);
      saveAuditLogToFirestore(globalEntry, currentUser.uid).catch(console.error);
    }

    // Update details modal if open
    if (selectedItemForDetails && selectedItemForDetails.id === item.id) {
      setSelectedItemForDetails(updatedItem);
    }
  };

  // Dedicated Inbound / Outbound Stock Increment Handler
  // Safe: does NOT overwrite the baseline stock; calculates previousQuantity + delta with full audit trail and Undo
  const handleInboundStock = (
    item: StockItem,
    delta: number,
    reason?: string
  ): { previousQuantity: number; newQuantity: number; undo: () => void } => {
    const cleanReason = (reason || '').trim();
    if (!cleanReason) {
      showToast(`Cannot adjust stock for "${item.itemName}": An audit note or reason is strictly required.`, 'error');
      return { previousQuantity: item.quantity || 0, newQuantity: item.quantity || 0, undo: () => {} };
    }

    const previousQuantity = item.quantity || 0;
    const newQty = Math.max(0, previousQuantity + delta);

    const isAddition = delta >= 0;
    const actionDesc = isAddition
      ? `Inbound stock added (+${delta} ${item.unit})`
      : `Stock outbound deduction (${delta} ${item.unit})`;
    const detailMsg = `Audit Note: "${cleanReason}" • ${isAddition ? 'Added' : 'Deducted'} ${Math.abs(delta)} ${item.unit}. Baseline stock was ${previousQuantity}, new stock total is ${newQty}.`;

    const auditEntry = createAuditEntry(
      'quantity_changed',
      actionDesc,
      detailMsg,
      previousQuantity,
      newQty,
      operator.name,
      operator.email
    );

    const updatedTrail = [auditEntry, ...(item.auditTrail || [])];
    const updatedItem: StockItem = {
      ...item,
      quantity: newQty,
      updatedAt: new Date().toISOString(),
      userId: currentUser?.uid || item.userId,
      lastModifiedByName: operator.name,
      lastModifiedByEmail: operator.email,
      auditTrail: updatedTrail,
    };

    const next = items.map((i) => (i.id === item.id ? updatedItem : i));
    updateItems(next);

    const globalEntry = appendGlobalAuditLog({
      ...auditEntry,
      itemId: item.id,
      itemName: item.itemName,
      unit: item.unit,
      performedBy: operator.name,
      userEmail: operator.email,
    });
    setGlobalLogs((prev) => [globalEntry, ...prev]);

    if (currentUser) {
      saveStockItemToFirestore(updatedItem, operator, currentUser.uid).catch(console.error);
      saveAuditLogToFirestore(globalEntry, currentUser.uid).catch(console.error);
    }

    if (selectedItemForDetails && selectedItemForDetails.id === item.id) {
      setSelectedItemForDetails(updatedItem);
    }

    const undo = () => {
      handleInboundStock(updatedItem, -delta, `Undo inbound: Reverted adjustment of ${delta} ${item.unit}`);
    };

    showToast(
      `${isAddition ? 'Restocked' : 'Deducted'} "${item.itemName}": ${delta >= 0 ? '+' : ''}${delta} ${item.unit} (Total: ${newQty})`,
      'success',
      {
        label: 'Undo',
        onClick: undo,
      }
    );

    return { previousQuantity, newQuantity: newQty, undo };
  };

  // Dedicated Rapid Point-of-Sale / Stock Modification Handler (Alt + B)
  const handleConfirmQuickSale = (
    item: StockItem,
    quantitySold: number,
    notes?: string,
    customerOrRef?: string
  ) => {
    if (quantitySold <= 0) return;
    const cleanNote = (notes || '').trim();
    if (!cleanNote) {
      showToast(`Cannot record sale for "${item.itemName}": A sale note or reference is strictly required.`, 'error');
      return;
    }

    const previousQuantity = item.quantity || 0;

    // Strict validation: Stock is already 0 -> cannot record sale
    if (previousQuantity <= 0) {
      showToast(
        `Cannot record sale: "${item.itemName}" is already out of stock (0 ${item.unit}). Please restock before selling.`,
        'error'
      );
      return;
    }

    // Strict validation: Cannot sell more than available inventory
    if (quantitySold > previousQuantity) {
      showToast(
        `Cannot record sale: Attempted to sell ${quantitySold} ${item.unit}, but only ${previousQuantity} ${item.unit} available in stock.`,
        'error'
      );
      return;
    }

    const newQty = Math.max(0, previousQuantity - quantitySold);

    const refNote = customerOrRef ? `Ref: ${customerOrRef.trim()}` : '';
    const details = `Audit Note: "${cleanNote}"${refNote ? ` • ${refNote}` : ''}`;

    const auditEntry = createAuditEntry(
      'quantity_changed',
      `Sale / Outbound (-${quantitySold} ${item.unit})`,
      `Sold ${quantitySold} ${item.unit}. Baseline was ${previousQuantity}, remaining: ${newQty} ${item.unit}. ${details}`,
      previousQuantity,
      newQty,
      operator.name,
      operator.email
    );

    const updatedTrail = [auditEntry, ...(item.auditTrail || [])];

    const updatedItem: StockItem = {
      ...item,
      quantity: newQty,
      updatedAt: new Date().toISOString(),
      userId: currentUser?.uid || item.userId,
      lastModifiedByName: operator.name,
      lastModifiedByEmail: operator.email,
      auditTrail: updatedTrail,
    };

    const next = items.map((i) => (i.id === item.id ? updatedItem : i));
    updateItems(next);

    const globalEntry = appendGlobalAuditLog({
      ...auditEntry,
      itemId: item.id,
      itemName: item.itemName,
      unit: item.unit,
      performedBy: operator.name,
      userEmail: operator.email,
    });
    setGlobalLogs((prev) => [globalEntry, ...prev]);

    if (currentUser) {
      saveStockItemToFirestore(updatedItem, operator, currentUser.uid).catch(console.error);
      saveAuditLogToFirestore(globalEntry, currentUser.uid).catch(console.error);
    }

    if (selectedItemForDetails && selectedItemForDetails.id === item.id) {
      setSelectedItemForDetails(updatedItem);
    }

    showToast(
      `Sold ${quantitySold} ${item.unit} of "${item.itemName}". Balance: ${newQty} ${item.unit}`,
      'success',
      {
        label: 'Undo Sale',
        onClick: () => {
          handleInboundStock(updatedItem, quantitySold, `Undo sale of ${quantitySold} ${item.unit}`);
        },
      }
    );
  };

  const handleAddAuditNote = (
    item: StockItem,
    note: string,
    noteType: 'count_verification' | 'quality_check' | 'location_audit' | 'general' = 'general',
    verifiedCount?: number
  ) => {
    const isCountUpdate = verifiedCount !== undefined && verifiedCount !== item.quantity;
    const previousQty = item.quantity;
    const newQty = isCountUpdate ? Math.max(0, verifiedCount) : item.quantity;

    let summary = 'Staff Audit Note';
    if (noteType === 'count_verification') {
      summary = isCountUpdate
        ? `Physical Count Audit: Adjusted from ${previousQty} to ${newQty} ${item.unit}`
        : `Physical Count Audit: Verified ${newQty} ${item.unit}`;
    } else if (noteType === 'quality_check') {
      summary = 'Quality & Condition Inspection Logged';
    } else if (noteType === 'location_audit') {
      summary = 'Storage Rack & Location Check Logged';
    }

    const auditEntry = createAuditEntry(
      'audit_note',
      summary,
      note.trim() || undefined,
      previousQty,
      newQty,
      operator.name,
      operator.email,
      {
        category: 'audit',
        noteType,
        balanceAfter: newQty,
      }
    );

    const updatedTrail = [auditEntry, ...(item.auditTrail || [])];

    const updatedItem: StockItem = {
      ...item,
      quantity: newQty,
      updatedAt: new Date().toISOString(),
      userId: currentUser?.uid || item.userId,
      lastModifiedByName: operator.name,
      lastModifiedByEmail: operator.email,
      auditTrail: updatedTrail,
    };

    const next = items.map((i) => (i.id === item.id ? updatedItem : i));
    updateItems(next);

    const globalEntry = appendGlobalAuditLog({
      ...auditEntry,
      itemId: item.id,
      itemName: item.itemName,
      unit: item.unit,
      performedBy: operator.name,
      userEmail: operator.email,
    });
    setGlobalLogs((prev) => [globalEntry, ...prev]);

    if (currentUser) {
      saveStockItemToFirestore(updatedItem, operator, currentUser.uid).catch(console.error);
      saveAuditLogToFirestore(globalEntry, currentUser.uid).catch(console.error);
    }

    setSelectedItemForDetails(updatedItem);
    showToast('Audit observation recorded to product trail', 'success');
  };

  // Gemini AI Agent Action Dispatcher (Executes natural language commands directly on the UI)
  const handleExecuteGeminiAction = (
    action: GeminiAgentAction
  ): {
    success: boolean;
    message: string;
    undo?: () => void;
    previousQuantity?: number;
    newQuantity?: number;
  } => {
    if (action.type === 'update_stock') {
      const targetName = (action.itemName || '').trim().toLowerCase();
      const matchedItem = items.find(
        (i) =>
          (action.itemId && i.id === action.itemId) ||
          i.itemName.trim().toLowerCase() === targetName ||
          i.itemName.trim().toLowerCase().includes(targetName) ||
          (targetName.length > 2 && targetName.includes(i.itemName.trim().toLowerCase()))
      );

      if (!matchedItem) {
        return {
          success: false,
          message: `Item "${action.itemName}" was not found in inventory.`,
        };
      }

      const delta = action.delta !== undefined ? action.delta : 0;
      if (delta === 0) {
        return {
          success: true,
          message: `No quantity change specified for "${matchedItem.itemName}".`,
          previousQuantity: matchedItem.quantity,
          newQuantity: matchedItem.quantity,
        };
      }

      const res = handleInboundStock(
        matchedItem,
        delta,
        action.reason || 'AI Agent Prompt Command'
      );

      return {
        success: true,
        message: `Updated "${matchedItem.itemName}": ${delta > 0 ? '+' : ''}${delta} ${matchedItem.unit} (Total: ${res.newQuantity})`,
        undo: res.undo,
        previousQuantity: res.previousQuantity,
        newQuantity: res.newQuantity,
      };
    }

    if (action.type === 'add_item') {
      const newItemName = (action.itemName || '').trim() || 'New Product';
      const initialQty =
        action.quantity !== undefined
          ? Math.max(0, action.quantity)
          : action.delta !== undefined
          ? Math.max(0, action.delta)
          : 0;
      const unit =
        action.unit ||
        (units && units.length > 0 && units[0]?.name ? units[0].name : 'Pieces');
      const threshold =
        action.lowStockThreshold !== undefined && !isNaN(Number(action.lowStockThreshold))
          ? Number(action.lowStockThreshold)
          : 5;
      const prodDate = action.productionDate?.trim() || undefined;
      const notes = action.notes?.trim() || undefined;
      const tags = Array.isArray(action.tags)
        ? action.tags.map((t) => t.trim().replace(/^#+/, '')).filter(Boolean)
        : undefined;

      handleAddItem(
        newItemName,
        unit,
        initialQty,
        threshold,
        prodDate,
        notes || action.reason || 'Added via Gemini AI Assistant',
        tags
      );

      const createdSummary = `Added "${newItemName}" (${initialQty} ${unit}, Alert: ≤${threshold}${
        tags && tags.length > 0 ? `, Tags: [${tags.join(', ')}]` : ''
      }${notes ? `, Notes: ${notes}` : ''})`;

      return {
        success: true,
        message: createdSummary,
        newQuantity: initialQty,
      };
    }

    if (action.type === 'update_item') {
      const targetName = (action.itemName || '').trim().toLowerCase();
      const matchedItem = items.find(
        (i) =>
          (action.itemId && i.id === action.itemId) ||
          i.itemName.trim().toLowerCase() === targetName ||
          i.itemName.trim().toLowerCase().includes(targetName)
      );

      if (!matchedItem) {
        return {
          success: false,
          message: `Item "${action.itemName}" was not found to update.`,
        };
      }

      const nextQty =
        action.newQuantity !== undefined
          ? action.newQuantity
          : action.quantity !== undefined
          ? action.quantity
          : matchedItem.quantity;
      const nextThreshold =
        action.lowStockThreshold !== undefined ? action.lowStockThreshold : matchedItem.lowStockThreshold;
      const nextUnit = action.unit || matchedItem.unit;
      const nextNotes = (action.notes?.trim() || action.reason?.trim() || matchedItem.notes || 'Updated via Gemini AI Assistant').trim();
      const nextTags = action.tags !== undefined ? action.tags : matchedItem.tags;
      const nextProdDate =
        action.productionDate !== undefined ? action.productionDate : matchedItem.productionDate;

      handleSaveEditItem(
        matchedItem.id,
        action.itemName || matchedItem.itemName,
        nextUnit,
        nextQty,
        nextThreshold,
        nextProdDate,
        nextNotes,
        nextTags
      );

      return {
        success: true,
        message: `Updated details for "${matchedItem.itemName}".`,
        previousQuantity: matchedItem.quantity,
        newQuantity: nextQty,
      };
    }

    if (action.type === 'delete_item') {
      const targetName = (action.itemName || '').trim().toLowerCase();
      const matchedItem = items.find(
        (i) =>
          (action.itemId && i.id === action.itemId) ||
          i.itemName.trim().toLowerCase() === targetName ||
          i.itemName.trim().toLowerCase().includes(targetName)
      );

      if (!matchedItem) {
        return {
          success: false,
          message: `Item "${action.itemName}" was not found to delete.`,
        };
      }

      const deleteReason = (action.reason?.trim() || 'Deleted via Gemini AI Assistant command').trim();
      executeDelete(matchedItem, deleteReason);
      return {
        success: true,
        message: `Removed "${matchedItem.itemName}" from inventory.`,
      };
    }

    if (action.type === 'filter_ui') {
      if (action.filter) {
        setActiveFilter(action.filter);
        return {
          success: true,
          message: `Switched view filter to: ${action.filter}`,
        };
      }
    }

    if (action.type === 'search_ui') {
      if (action.searchQuery !== undefined) {
        setSearchQuery(action.searchQuery);
        return {
          success: true,
          message: `Filtered inventory by "${action.searchQuery}"`,
        };
      }
    }

    return {
      success: false,
      message: `Unsupported action type: ${action.type}`,
    };
  };

  // File export & import
  const handleExportExcel = () => {
    if (items.length === 0) {
      showToast('No items in inventory to export.', 'info');
      return;
    }
    setIsExportExcelModalOpen(true);
  };

  const handleExportCsv = () => {
    if (items.length === 0) {
      showToast('No items to export.', 'info');
      return;
    }
    exportToCsv(items, 'stock-inventory.csv');
    showToast('CSV file exported', 'success');
  };

  const handleImportFile = async (file: File) => {
    try {
      const parsed = await parseExcelOrCsvFile(file);
      if (parsed.length === 0) {
        showToast('No valid items found in the uploaded file.', 'error');
        return;
      }

      const now = new Date().toISOString();
      const newItems: StockItem[] = parsed.map((p) => {
        const id = generateItemId();
        const itemNote = (p.notes && p.notes.trim())
          ? p.notes.trim()
          : `Batch imported from ${file.name} by ${operator.name}`;

        const auditEntry = createAuditEntry(
          'created',
          'Item imported from file',
          `Audit Note: "${itemNote}" • Imported from ${file.name} with quantity ${p.quantity} ${p.unit}`,
          undefined,
          p.quantity,
          operator.name,
          operator.email
        );

        return {
          id,
          itemName: p.itemName,
          unit: p.unit || 'Pieces',
          quantity: p.quantity,
          lowStockThreshold: p.lowStockThreshold ?? 5,
          productionDate: p.productionDate,
          notes: itemNote,
          createdAt: now,
          updatedAt: now,
          userId: currentUser?.uid,
          createdByName: operator.name,
          createdByEmail: operator.email,
          lastModifiedByName: operator.name,
          lastModifiedByEmail: operator.email,
          auditTrail: [auditEntry],
        };
      });

      // Combine with existing items
      const combined = [...newItems, ...items];
      updateItems(combined);

      // Firestore persistence
      if (currentUser) {
        for (const itm of newItems) {
          saveStockItemToFirestore(itm, operator, currentUser.uid).catch(console.error);
        }
      }

      // Append import record to global audit log
      const logEntry = appendGlobalAuditLog({
        action: 'created',
        summary: `Imported ${newItems.length} items from ${file.name}`,
        details: `Batch file import completed`,
        itemId: 'batch_import_' + Date.now(),
        itemName: `${newItems.length} items`,
        unit: 'Batch',
        performedBy: operator.name,
        userEmail: operator.email,
      });
      setGlobalLogs((prev) => [logEntry, ...prev]);

      if (currentUser) {
        saveAuditLogToFirestore(logEntry, currentUser.uid).catch(console.error);
      }

      showToast(`Imported ${newItems.length} items by ${operator.name}`, 'success');
    } catch (err: any) {
      console.error('File import error:', err);
      showToast('Failed to import file. Please check format.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col antialiased selection:bg-emerald-100 selection:text-emerald-900 pb-20 sm:pb-8">
      {/* Toast Notification with Undo - Mobile Friendly */}
      {toast && (
        <div className="fixed top-3 inset-x-3 sm:inset-x-auto sm:top-5 sm:right-5 z-50 animate-in slide-in-from-top-3 duration-200 pointer-events-none">
          <div
            className={`pointer-events-auto px-4 py-3 rounded-2xl shadow-xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold max-w-md mx-auto sm:mx-0 ${
              toast.type === 'success'
                ? 'bg-emerald-950 text-emerald-50 border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-950 text-rose-50 border-rose-700'
                : 'bg-slate-900 text-slate-50 border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span className="truncate">{toast.message}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Undo Button */}
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    setToast(null);
                  }}
                  className="min-h-[30px] px-2.5 py-1 text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{toast.action.label}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setToast(null)}
                className="min-h-[32px] min-w-[32px] flex items-center justify-center text-white/60 hover:text-white cursor-pointer -mr-1"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Navbar with Delete Confirmation Choice, Audit Trail, and Google Sign-in */}
      <Navbar
        items={items}
        itemCount={items.length}
        confirmOnDelete={confirmOnDelete}
        onToggleConfirmOnDelete={handleToggleConfirmOnDelete}
        onExportExcel={handleExportExcel}
        onExportCsv={handleExportCsv}
        onImportFile={handleImportFile}
        onOpenUnitModal={() => setIsUnitModalOpen(true)}
        onOpenTagModal={() => setIsTagModalOpen(true)}
        onAddNewItem={() => setIsAddModalOpen(true)}
        onOpenAuditTrail={() => setIsAuditTrailModalOpen(true)}
        onOpenGeminiChat={() => setIsGeminiChatOpen(true)}
        currentOperator={operator}
        onOpenOperatorModal={() => setIsOperatorModalOpen(true)}
        currentUser={currentUser}
        isAuthLoading={isAuthLoading}
        onSignInWithGoogle={handleSignInWithGoogle}
        onSignOut={handleSignOut}
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
        onOpenTimezoneModal={() => setIsTimezoneModalOpen(true)}
      />

      {/* Cloud DB & Shared Access Status Banner */}
      {!isAuthLoading && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3">
          {currentUser ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                <span className="truncate">
                  Persistent Cloud DB Active • Real-time Firestore sync enabled{' '}
                  {currentUser.isAnonymous ? (
                    <>
                      <strong className="font-bold">(Quick Team Access)</strong>
                      <button
                        type="button"
                        onClick={() => setIsDomainModalOpen(true)}
                        className="ml-2 text-[11px] text-emerald-800 hover:text-emerald-950 underline font-semibold cursor-pointer"
                      >
                        Authorize Google Login
                      </button>
                    </>
                  ) : (
                    <>
                      for <strong className="font-bold">{currentUser.email}</strong>
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-medium text-emerald-800 bg-white/70 px-2 py-0.5 rounded-lg border border-emerald-200">
                  Shared Team Access: All staff can Create, Edit & Delete with full Audit Trail
                </span>
                {isMigrating && (
                  <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold shrink-0">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Migrating items...</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-xl p-3 sm:py-2.5 sm:px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5 text-xs text-slate-700">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">
                    Connect Persistent Cloud Database
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Store stock items and audit logs permanently in Firestore. All team members share full CRUD access.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={handleQuickConnect}
                  className="flex-1 sm:flex-initial min-h-[38px] px-3.5 py-1.5 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-100/60 border border-emerald-300 rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  title="Instant database connection without requiring Google OAuth domain setup"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Instant Quick Connect</span>
                </button>
                <button
                  type="button"
                  onClick={handleSignInWithGoogle}
                  className="flex-1 sm:flex-initial min-h-[38px] px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Connect Google Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const host = typeof window !== 'undefined' ? window.location.hostname : '';
                    setCurrentDomain(host);
                    setIsDomainModalOpen(true);
                  }}
                  className="min-h-[38px] px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
                  title="View domain whitelisting instructions for Firebase"
                >
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden md:inline">Domain Help</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-7 space-y-4 sm:space-y-6">
        {/* KPI / Stock Metrics (Tap to filter, reactive to selected tag) */}
        <StockSummary
          items={items}
          activeFilter={activeFilter}
          onSelectFilter={setActiveFilter}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          managedTags={tags}
        />

        {/* Stock Inventory List & Table with Metadata, Voice Search & Trail view */}
        <StockTable
          items={items}
          units={units}
          activeFilter={activeFilter}
          confirmOnDelete={confirmOnDelete}
          onToggleConfirmOnDelete={handleToggleConfirmOnDelete}
          onFilterChange={setActiveFilter}
          onAddItem={openRegisterNewSKUModal}
          onEditItem={(item) => setEditingItem(item)}
          onDeleteItem={handleDeleteItemClick}
          onQuickQuantityChange={handleQuickQuantityChange}
          onReceiveStock={(item) => {
            setRestockTargetItem(item);
            setAddModalInitialTab('restock');
            setIsAddModalOpen(true);
          }}
          onExportExcel={handleExportExcel}
          onViewItemDetails={(item) => setSelectedItemForDetails(item)}
          onOpenAuditTrail={() => setIsAuditTrailModalOpen(true)}
          onOpenGeminiChat={() => setIsGeminiChatOpen(true)}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          managedTags={tags}
          onOpenTagModal={() => setIsTagModalOpen(true)}
          onOpenQuickSale={handleOpenQuickSale}
          onActiveItemChange={handleActiveKeyboardItemChange}
        />
      </main>

      {/* Mobile Floating Action Buttons (FAB): Quick AI Chat + Add Item */}
      <div className="sm:hidden fixed bottom-5 left-3 right-3 z-40 flex items-center justify-between pointer-events-none">
        {/* Mobile FAB: Talk to Gemini AI */}
        <button
          id="btn-mobile-fab-gemini"
          type="button"
          onClick={() => setIsGeminiChatOpen(true)}
          className="pointer-events-auto min-h-[48px] px-3.5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold shadow-lg shadow-slate-950/25 flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer border border-slate-700 backdrop-blur-xs"
          aria-label="Talk to Gemini AI"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
          <span className="text-xs font-bold">Talk to AI</span>
        </button>

        {/* Mobile FAB: 1-Tap Add Item */}
        <button
          id="btn-mobile-fab-add"
          type="button"
          onClick={openRegisterNewSKUModal}
          className="pointer-events-auto min-h-[48px] px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold shadow-lg shadow-emerald-950/25 flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer border border-emerald-500"
          aria-label="Register new catalog SKU"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="text-xs font-bold">Add Item</span>
        </button>
      </div>

      {/* Modals */}
      {/* 1. Add / Restock Item Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        units={units}
        items={items}
        preSelectedItem={restockTargetItem}
        initialTab={addModalInitialTab}
        availableTags={availableTags}
        managedTags={tags}
        onCreateTag={handleCreateTag}
        onClose={() => {
          setIsAddModalOpen(false);
          setRestockTargetItem(null);
        }}
        onAdd={handleAddItem}
        onAddMoreStock={handleInboundStock}
        onOpenUnitModal={() => setIsUnitModalOpen(true)}
      />

      {/* 2. Edit Item Modal */}
      <EditItemModal
        isOpen={!!editingItem}
        item={editingItem}
        units={units}
        availableTags={availableTags}
        managedTags={tags}
        onCreateTag={handleCreateTag}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEditItem}
        onOpenUnitModal={() => setIsUnitModalOpen(true)}
      />

      {/* 3. Item Details & Complete Audit Trail Modal */}
      <ItemDetailsModal
        isOpen={!!selectedItemForDetails}
        item={selectedItemForDetails}
        managedTags={tags}
        globalLogs={globalLogs}
        onClose={() => setSelectedItemForDetails(null)}
        onEdit={(item) => {
          setSelectedItemForDetails(null);
          setEditingItem(item);
        }}
        onQuickQuantityChange={handleQuickQuantityChange}
        onReceiveStock={(item) => {
          setSelectedItemForDetails(null);
          setRestockTargetItem(item);
          setIsAddModalOpen(true);
        }}
        onSelectTag={(tag) => setSelectedTag(tag)}
        onAddAuditNote={handleAddAuditNote}
      />

      {/* 4. Global Inventory Audit Trail & Activity Log Modal */}
      <AuditTrailModal
        isOpen={isAuditTrailModalOpen}
        onClose={() => setIsAuditTrailModalOpen(false)}
        logs={unifiedLogs}
        onSelectItem={(itemId) => {
          const itm = items.find((i) => i.id === itemId);
          if (itm) {
            setSelectedItemForDetails(itm);
          }
        }}
      />

      {/* 4b. Export Excel with Time-Span & Scope Options */}
      <ExportExcelModal
        isOpen={isExportExcelModalOpen}
        onClose={() => setIsExportExcelModalOpen(false)}
        items={items}
        globalLogs={unifiedLogs}
        onShowToast={(msg, type) => showToast(msg, type)}
      />

      {/* 5. Units Manager Modal */}
      <UnitManagementModal
        isOpen={isUnitModalOpen}
        units={units}
        onClose={() => setIsUnitModalOpen(false)}
        onAddUnit={handleAddUnit}
        onUpdateUnit={handleUpdateUnit}
        onDeleteUnit={handleDeleteUnit}
        onResetUnits={handleResetUnits}
      />

      {/* 5b. Tags Manager Modal */}
      <TagManagementModal
        isOpen={isTagModalOpen}
        tags={tags}
        items={items}
        onClose={() => setIsTagModalOpen(false)}
        onAddTag={handleCreateTag}
        onCreateTag={handleCreateTag}
        onUpdateTag={handleUpdateTag}
        onDeleteTag={handleDeleteTag}
        onResetTags={handleResetTags}
        onSelectTagToFilter={(tag) => {
          setSelectedTag(tag);
          setIsTagModalOpen(false);
        }}
      />

      {/* 6. Confirmation Dialog requiring mandatory audit note */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        title="Delete Stock Item"
        message={`Are you sure you want to remove "${itemToDelete?.itemName}" from inventory? An explanation note is strictly mandatory to approve any deletion.`}
        confirmLabel="Approve Deletion"
        cancelLabel="Cancel"
        isDestructive={true}
        requireNote={true}
        notePlaceholder="Enter mandatory deletion reason (e.g. Scrapped, Damaged, Expired, Catalog Obsolete)..."
        onConfirmWithNote={(note) => handleDeleteItemConfirm(note)}
        onCancel={() => setItemToDelete(null)}
      />

      {/* 7. Active Operator Profile Switcher Modal */}
      <OperatorModal
        isOpen={isOperatorModalOpen}
        onClose={() => setIsOperatorModalOpen(false)}
        currentOperator={operator}
        currentProfile={operator}
        currentUser={currentUser}
        onSaveOperator={(newProfile) => {
          setOperator(newProfile);
          saveOperatorProfile(newProfile);
          showToast(
            `Active staff set to "${newProfile.name}" (${newProfile.role})`,
            'success'
          );
        }}
      />

      {/* 8. Firebase Domain Authorization Helper Modal */}
      <UnauthorizedDomainModal
        isOpen={isDomainModalOpen}
        onClose={() => setIsDomainModalOpen(false)}
        domain={currentDomain || (typeof window !== 'undefined' ? window.location.hostname : '')}
        onRetryGoogleSignIn={handleSignInWithGoogle}
        onQuickConnect={handleQuickConnect}
      />

      {/* 9. Gemini AI Interactive Stock Chat Modal */}
      <GeminiStockChatModal
        isOpen={isGeminiChatOpen}
        onClose={() => setIsGeminiChatOpen(false)}
        items={items}
        units={units}
        availableTags={availableTags}
        onQuickQuantityChange={handleQuickQuantityChange}
        onExecuteAgentAction={handleExecuteGeminiAction}
        onApplyFilter={(f) => setActiveFilter(f)}
        onSearchItem={(q) => setSearchQuery(q)}
      />

      {/* 10. Rapid Quick Sale & Item Modification Modal (Shortcut: Alt + B) */}
      <QuickSaleModal
        isOpen={isQuickSaleModalOpen}
        item={quickSaleTargetItem}
        onClose={() => {
          setIsQuickSaleModalOpen(false);
          setQuickSaleTargetItem(null);
        }}
        onConfirmSale={handleConfirmQuickSale}
        onSwitchToEdit={(item) => setEditingItem(item)}
        onRestockItem={(item) => setRestockTargetItem(item)}
      />

      {/* 11. Timezone & Local Date Sync Modal */}
      <TimezoneSelectorModal
        isOpen={isTimezoneModalOpen}
        onClose={() => setIsTimezoneModalOpen(false)}
        onShowToast={(msg, type) => showToast(msg, type)}
      />
    </div>
  );
}

export default App;

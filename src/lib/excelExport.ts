import * as XLSX from 'xlsx';
import { StockItem } from '../types';
import { GlobalAuditRecord } from './stockStorage';
import {
  formatLocalDate,
  formatLocalDateTime,
  getTodayDateString,
  getLocalDateRange,
} from './dateUtils';

/**
 * Checks if an ISO timestamp string falls within [startDate, endDate] inclusive.
 * Handles exact millisecond comparisons as well as optional timezone boundary checks.
 */
export function isTimestampInRange(
  timestamp?: string | null,
  startDate?: Date | null,
  endDate?: Date | null,
  tz?: string
): boolean {
  if (!timestamp) return false;
  const d = new Date(timestamp);
  const time = d.getTime();
  if (isNaN(time)) return false;

  // Direct millisecond boundary comparison
  if (startDate && time < startDate.getTime()) return false;
  if (endDate && time > endDate.getTime()) return false;

  return true;
}

/**
 * Computes start/end dates for a given number of past days (e.g. 20 days)
 * aligned to the user's active timezone boundaries.
 */
export function getDateRangeFromDays(days: number, tz?: string): { startDate: Date; endDate: Date } {
  const range = getLocalDateRange(days, tz);
  return { startDate: range.startDate, endDate: range.endDate };
}

/**
 * Identifies items that were created, updated, or had activity logs within the given date range.
 */
export function getAffectedItems(
  items: StockItem[],
  startDate: Date | null,
  endDate: Date | null,
  globalLogs?: GlobalAuditRecord[]
): {
  affectedItems: StockItem[];
  itemStatsMap: Map<string, { movementCount: number; netDelta: number; lastActivity?: string }>;
} {
  const safeItems = Array.isArray(items) ? items : [];
  const itemStatsMap = new Map<string, { movementCount: number; netDelta: number; lastActivity?: string }>();
  const affectedItemIds = new Set<string>();

  // If no date boundaries, all items are considered
  if (!startDate && !endDate) {
    safeItems.forEach((item) => {
      affectedItemIds.add(item.id);
      itemStatsMap.set(item.id, {
        movementCount: item.auditTrail?.length || 0,
        netDelta: 0,
        lastActivity: item.updatedAt || item.createdAt,
      });
    });
    return { affectedItems: safeItems, itemStatsMap };
  }

  // 1. Process global audit records
  if (Array.isArray(globalLogs)) {
    globalLogs.forEach((log) => {
      if (isTimestampInRange(log.timestamp, startDate, endDate)) {
        if (log.itemId) {
          affectedItemIds.add(log.itemId);
          const current = itemStatsMap.get(log.itemId) || { movementCount: 0, netDelta: 0, lastActivity: undefined };
          current.movementCount += 1;
          if (typeof log.delta === 'number') {
            current.netDelta += log.delta;
          }
          if (!current.lastActivity || new Date(log.timestamp) > new Date(current.lastActivity)) {
            current.lastActivity = log.timestamp;
          }
          itemStatsMap.set(log.itemId, current);
        }
      }
    });
  }

  // 2. Process item-level audit trails and timestamps
  safeItems.forEach((item) => {
    let isAffected = affectedItemIds.has(item.id);

    // Created or updated within range
    if (isTimestampInRange(item.updatedAt, startDate, endDate)) {
      isAffected = true;
    }
    if (isTimestampInRange(item.createdAt, startDate, endDate)) {
      isAffected = true;
    }

    // Check item's internal audit trail entries
    if (Array.isArray(item.auditTrail)) {
      item.auditTrail.forEach((entry) => {
        if (isTimestampInRange(entry.timestamp, startDate, endDate)) {
          isAffected = true;
          const current = itemStatsMap.get(item.id) || { movementCount: 0, netDelta: 0, lastActivity: undefined };
          if (!affectedItemIds.has(item.id)) {
            current.movementCount += 1;
            if (typeof entry.delta === 'number') {
              current.netDelta += entry.delta;
            }
          }
          if (!current.lastActivity || new Date(entry.timestamp) > new Date(current.lastActivity)) {
            current.lastActivity = entry.timestamp;
          }
          itemStatsMap.set(item.id, current);
        }
      });
    }

    if (isAffected) {
      affectedItemIds.add(item.id);
      if (!itemStatsMap.has(item.id)) {
        itemStatsMap.set(item.id, {
          movementCount: 1,
          netDelta: 0,
          lastActivity: item.updatedAt || item.createdAt,
        });
      }
    }
  });

  const affectedItems = safeItems.filter((item) => affectedItemIds.has(item.id));
  return { affectedItems, itemStatsMap };
}

export interface AdvancedExportOptions {
  items: StockItem[];
  scope: 'whole_stock' | 'affected_only';
  startDate?: Date | null;
  endDate?: Date | null;
  timeSpanLabel?: string;
  includeAuditTrail?: boolean;
  globalLogs?: GlobalAuditRecord[];
  filename?: string;
}

/**
 * Advanced Excel export with time span and scope options (Whole Stock vs Affected Only).
 */
export function exportToExcelAdvanced(options: AdvancedExportOptions): void {
  const {
    items,
    scope,
    startDate,
    endDate,
    timeSpanLabel = '',
    includeAuditTrail = false,
    globalLogs = [],
    filename,
  } = options;

  const { affectedItems, itemStatsMap } = getAffectedItems(
    items,
    startDate ?? null,
    endDate ?? null,
    globalLogs
  );

  const exportList = scope === 'affected_only' ? affectedItems : items;

  // Build Sheet 1: Stock Inventory
  const data = exportList.map((item) => {
    const stats = itemStatsMap.get(item.id);
    const row: Record<string, string | number> = {
      'Item Name': item.itemName,
      'Unit': item.unit,
      'Current Stock': item.quantity,
      'Low Stock Alert (Min)': item.lowStockThreshold ?? 5,
      'Production Date': item.productionDate || '',
      'Tags': Array.isArray(item.tags) && item.tags.length > 0 ? item.tags.join(', ') : '',
      'Notes': item.notes || '',
    };

    if (startDate || endDate) {
      row['Movements in Period'] = stats ? stats.movementCount : 0;
      row['Net Change in Period'] =
        stats && stats.netDelta !== 0
          ? stats.netDelta > 0
            ? `+${stats.netDelta}`
            : stats.netDelta
          : 0;
      row['Last Activity'] = stats?.lastActivity
        ? formatLocalDateTime(stats.lastActivity)
        : item.updatedAt
        ? formatLocalDateTime(item.updatedAt)
        : '';
    }

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 36 }, // Item Name
    { wch: 18 }, // Unit
    { wch: 16 }, // Current Stock
    { wch: 22 }, // Low Stock Alert
    { wch: 18 }, // Production Date
    { wch: 26 }, // Tags
    { wch: 36 }, // Notes
    ...(startDate || endDate
      ? [
          { wch: 20 }, // Movements in Period
          { wch: 20 }, // Net Change in Period
          { wch: 18 }, // Last Activity
        ]
      : []),
  ];

  const workbook = XLSX.utils.book_new();
  const sheetTitle = scope === 'affected_only' ? 'Affected Items' : 'Stock Inventory';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle);

  // Build Sheet 2: Audit Trail & Movement History (if requested)
  if (includeAuditTrail && Array.isArray(globalLogs) && globalLogs.length > 0) {
    const filteredLogs = globalLogs.filter((log) => {
      const matchDate = isTimestampInRange(log.timestamp, startDate, endDate);
      if (!matchDate) return false;
      if (scope === 'affected_only') {
        return affectedItems.some(
          (ai) =>
            ai.id === log.itemId ||
            (log.itemName && log.itemName.toLowerCase() === ai.itemName.toLowerCase())
        );
      }
      return true;
    });

    if (filteredLogs.length > 0) {
      const auditData = filteredLogs.map((log) => ({
        'Timestamp': log.timestamp ? formatLocalDateTime(log.timestamp) : '',
        'Item Name': log.itemName || '',
        'Action': log.action || '',
        'Staff Member': log.performedBy || '',
        'Staff Email': log.userEmail || '',
        'Previous Qty': log.previousQuantity ?? '',
        'New Qty': log.newQuantity ?? '',
        'Change (Delta)':
          log.delta !== undefined
            ? log.delta > 0
              ? `+${log.delta}`
              : log.delta
            : '',
        'Unit': log.unit || '',
        'Summary': log.summary || '',
        'Details': log.details || '',
      }));

      const auditSheet = XLSX.utils.json_to_sheet(auditData);
      auditSheet['!cols'] = [
        { wch: 24 }, // Timestamp
        { wch: 30 }, // Item Name
        { wch: 16 }, // Action
        { wch: 20 }, // Staff Member
        { wch: 25 }, // Staff Email
        { wch: 14 }, // Previous Qty
        { wch: 14 }, // New Qty
        { wch: 16 }, // Delta
        { wch: 12 }, // Unit
        { wch: 38 }, // Summary
        { wch: 40 }, // Details
      ];
      XLSX.utils.book_append_sheet(workbook, auditSheet, 'Activity Trail');
    }
  }

  const defaultFilename =
    scope === 'affected_only'
      ? `stock-inventory-affected-${
          timeSpanLabel ? timeSpanLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'period'
        }-${getTodayDateString()}.xlsx`
      : `stock-inventory-whole-stock-${getTodayDateString()}.xlsx`;

  XLSX.writeFile(workbook, filename || defaultFilename);
}

/**
 * Exports Audit Trail directly to an Excel file
 */
export function exportAuditTrailToExcel(
  logs: GlobalAuditRecord[],
  filename = `inventory-audit-trail-${getTodayDateString()}.xlsx`
): void {
  const data = logs.map((log) => ({
    'Timestamp': log.timestamp ? formatLocalDateTime(log.timestamp) : '',
    'Item Name': log.itemName || '',
    'Action': log.action || '',
    'Staff Member': log.performedBy || '',
    'Staff Email': log.userEmail || '',
    'Previous Qty': log.previousQuantity ?? '',
    'New Qty': log.newQuantity ?? '',
    'Change (Delta)':
      log.delta !== undefined
        ? log.delta > 0
          ? `+${log.delta}`
          : log.delta
        : '',
    'Unit': log.unit || '',
    'Summary': log.summary || '',
    'Details': log.details || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 24 },
    { wch: 30 },
    { wch: 16 },
    { wch: 20 },
    { wch: 25 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 12 },
    { wch: 38 },
    { wch: 40 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Trail');
  XLSX.writeFile(workbook, filename);
}

/**
 * Exports Audit Trail to a standard CSV file
 */
export function exportAuditTrailToCsv(
  logs: GlobalAuditRecord[],
  filename = `inventory-audit-trail-${getTodayDateString()}.csv`
): void {
  const headers = [
    'Timestamp',
    'Item Name',
    'Action',
    'Staff Member',
    'Staff Email',
    'Previous Qty',
    'New Qty',
    'Change (Delta)',
    'Unit',
    'Summary',
    'Details',
  ];

  const escape = (val: string | number | undefined | null) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = logs.map((log) => [
    escape(log.timestamp ? formatLocalDateTime(log.timestamp) : ''),
    escape(log.itemName),
    escape(log.action),
    escape(log.performedBy),
    escape(log.userEmail),
    escape(log.previousQuantity ?? ''),
    escape(log.newQuantity ?? ''),
    escape(log.delta !== undefined ? (log.delta > 0 ? `+${log.delta}` : log.delta) : ''),
    escape(log.unit),
    escape(log.summary),
    escape(log.details),
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports current stock items to an Excel (.xlsx) file
 */
export function exportToExcel(
  items: StockItem[],
  filename = 'stock-inventory.xlsx'
): void {
  const data = items.map((item) => {
    return {
      'Item Name': item.itemName,
      Unit: item.unit,
      'Current Stock': item.quantity,
      'Low Stock Alert (Min)': item.lowStockThreshold ?? 5,
      'Production Date': item.productionDate || '',
      Tags: Array.isArray(item.tags) && item.tags.length > 0 ? item.tags.join(', ') : '',
      Notes: item.notes || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 36 }, // Item Name
    { wch: 18 }, // Unit
    { wch: 16 }, // Current Stock
    { wch: 22 }, // Low Stock Alert
    { wch: 18 }, // Production Date
    { wch: 26 }, // Tags
    { wch: 36 }, // Notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock');

  XLSX.writeFile(workbook, filename);
}

/**
  * Exports stock items as a standard CSV file
  */
export function exportToCsv(
  items: StockItem[],
  filename = 'stock-inventory.csv'
): void {
  const headers = [
    'Item Name',
    'Unit',
    'Current Stock',
    'Low Stock Alert',
    'Production Date',
    'Tags',
    'Notes',
  ];

  const rows = items.map((item) => {
    const escape = (val: string | number | undefined) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    return [
      escape(item.itemName),
      escape(item.unit),
      escape(item.quantity),
      escape(item.lowStockThreshold ?? 5),
      escape(item.productionDate || ''),
      escape(Array.isArray(item.tags) && item.tags.length > 0 ? item.tags.join('; ') : ''),
      escape(item.notes || ''),
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
  * Parses an uploaded Excel or CSV file to import stock items
  */
export async function parseExcelOrCsvFile(
  file: File
): Promise<
  {
    itemName: string;
    unit: string;
    quantity: number;
    lowStockThreshold: number;
    productionDate?: string;
    notes?: string;
    tags?: string[];
  }[]
> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          blankrows: false,
        });

        if (rawRows.length === 0) {
          resolve([]);
          return;
        }

        // Detect if row 0 is header
        const firstRow = rawRows[0] || [];
        const f0 = String(firstRow[0] || '').toLowerCase();
        const f1 = String(firstRow[1] || '').toLowerCase();
        const f2 = String(firstRow[2] || '').toLowerCase();

        const isHeader =
          f0.includes('item') ||
          f0.includes('name') ||
          f1.includes('unit') ||
          f2.includes('quant') ||
          f2.includes('stock') ||
          f2.includes('qty');

        const startIndex = isHeader ? 1 : 0;
        const parsedItems: {
          itemName: string;
          unit: string;
          quantity: number;
          lowStockThreshold: number;
          productionDate?: string;
          notes?: string;
          tags?: string[];
        }[] = [];

        for (let i = startIndex; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          const itemName = String(row[0] ?? '').trim();
          const unit = String(row[1] ?? 'Pieces').trim();
          const rawQty = row[2];
          const parsedQty =
            typeof rawQty === 'number'
              ? rawQty
              : parseFloat(String(rawQty ?? '0'));
          const quantity = isNaN(parsedQty) ? 0 : Math.max(0, parsedQty);

          const rawThreshold = row[3];
          const parsedThreshold =
            typeof rawThreshold === 'number'
              ? rawThreshold
              : parseFloat(String(rawThreshold ?? '5'));
          const lowStockThreshold = isNaN(parsedThreshold)
            ? 5
            : Math.max(0, parsedThreshold);

          const rawProdDate = row[4] ? String(row[4]).trim() : '';
          const rawTags = row[5] ? String(row[5]).trim() : '';
          const rawNotes = row[6] ? String(row[6]).trim() : '';

          let tags: string[] | undefined;
          if (rawTags) {
            tags = rawTags
              .split(/[,;|]/)
              .map((t) => t.trim().replace(/^#/, ''))
              .filter((t) => t.length > 0);
          }

          if (itemName) {
            parsedItems.push({
              itemName,
              unit: unit || 'Pieces',
              quantity,
              lowStockThreshold,
              productionDate: rawProdDate || undefined,
              tags: tags && tags.length > 0 ? tags : undefined,
              notes: rawNotes || undefined,
            });
          }
        }

        resolve(parsedItems);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

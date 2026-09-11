import * as XLSX from 'xlsx';
import { StockItem, CompanyProfile } from '../types';

/**
  * Exports current stock items to an Excel (.xlsx) file with:
  * - Item Name
  * - Company
  * - Unit
  * - Current Quantity
  * - Low Stock Alert Threshold
  * - Production Date
  * - Notes
  */
export function exportToExcel(
  items: StockItem[],
  filename = 'stock-inventory.xlsx',
  companies?: CompanyProfile[]
): void {
  const companyMap = new Map((companies || []).map((c) => [c.id, c.name]));
  const data = items.map((item) => {
    const compName =
      (item.companyId ? companyMap.get(item.companyId) : undefined) ||
      item.companyName ||
      'General';
    return {
      'Item Name': item.itemName,
      Company: compName,
      Unit: item.unit,
      'Current Stock': item.quantity,
      'Low Stock Alert (Min)': item.lowStockThreshold ?? 5,
      'Production Date': item.productionDate || '',
      Notes: item.notes || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 36 }, // Item Name
    { wch: 24 }, // Company
    { wch: 18 }, // Unit
    { wch: 16 }, // Current Stock
    { wch: 22 }, // Low Stock Alert
    { wch: 18 }, // Production Date
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
  filename = 'stock-inventory.csv',
  companies?: CompanyProfile[]
): void {
  const companyMap = new Map((companies || []).map((c) => [c.id, c.name]));
  const headers = [
    'Item Name',
    'Company',
    'Unit',
    'Current Stock',
    'Low Stock Alert',
    'Production Date',
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
    const compName =
      (item.companyId ? companyMap.get(item.companyId) : undefined) ||
      item.companyName ||
      'General';
    return [
      escape(item.itemName),
      escape(compName),
      escape(item.unit),
      escape(item.quantity),
      escape(item.lowStockThreshold ?? 5),
      escape(item.productionDate || ''),
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
          const rawNotes = row[5] ? String(row[5]).trim() : '';

          if (itemName) {
            parsedItems.push({
              itemName,
              unit: unit || 'Pieces',
              quantity,
              lowStockThreshold,
              productionDate: rawProdDate || undefined,
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

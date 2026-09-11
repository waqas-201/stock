import * as XLSX from 'xlsx';
import { StockItem } from '../types';

/**
 * Exports current stock items to an Excel (.xlsx) file with 3 columns:
 * - Item Name
 * - Unit
 * - Quantity
 */
export function exportToExcel(
  items: StockItem[],
  filename = 'stock-inventory.xlsx'
): void {
  const data = items.map((item) => ({
    'Item Name': item.itemName,
    Unit: item.unit,
    Quantity: item.quantity,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 36 }, // Item Name
    { wch: 18 }, // Unit
    { wch: 18 }, // Quantity
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
  const headers = ['Item Name', 'Unit', 'Quantity'];

  const rows = items.map((item) => {
    const escape = (val: string | number) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    return [escape(item.itemName), escape(item.unit), escape(item.quantity)].join(',');
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
): Promise<{ itemName: string; unit: string; quantity: number }[]> {
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
          f2.includes('qty');

        const startIndex = isHeader ? 1 : 0;
        const parsedItems: { itemName: string; unit: string; quantity: number }[] = [];

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

          if (itemName) {
            parsedItems.push({
              itemName,
              unit: unit || 'Pieces',
              quantity,
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

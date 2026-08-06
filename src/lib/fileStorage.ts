import Papa from "papaparse";
import { supabase } from "./supabase";

export interface ImportedFile {
  id: string;
  companyId: string;
  fileName: string;
  fileSize: number;
  fileType: "csv" | "json" | "excel" | "pdf" | "text";
  uploadedAt: string;
  rowCount: number;
  headers: string[];
  parsedData: Record<string, any>[];
  rawText: string;
  summaryStats: {
    numericCols: string[];
    categoryCols: string[];
    totalNumericSum: Record<string, number>;
    avgNumericVal: Record<string, number>;
  };
}

const STORAGE_KEY_PREFIX = "workspace_imported_files_";

function getStorageKey(companyId: string): string {
  return `${STORAGE_KEY_PREFIX}${companyId || "default"}`;
}

export function getStoredFiles(companyId: string): ImportedFile[] {
  try {
    const raw = localStorage.getItem(getStorageKey(companyId));
    if (!raw) return [];
    return JSON.parse(raw) as ImportedFile[];
  } catch (err) {
    console.error("Failed to load files from storage:", err);
    return [];
  }
}

export function getStoredFileById(id: string, companyId: string): ImportedFile | null {
  const files = getStoredFiles(companyId);
  return files.find((f) => f.id === id) || null;
}

export function saveImportedFile(file: ImportedFile): void {
  try {
    const files = getStoredFiles(file.companyId);
    const updated = [file, ...files.filter((f) => f.id !== file.id)];
    localStorage.setItem(getStorageKey(file.companyId), JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save file to storage:", err);
  }
}

export function deleteImportedFile(id: string, companyId: string): void {
  try {
    const files = getStoredFiles(companyId);
    const updated = files.filter((f) => f.id !== id);
    localStorage.setItem(getStorageKey(companyId), JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to delete file from storage:", err);
  }
}

export function computeSummaryStats(data: Record<string, any>[], headers: string[]) {
  const numericCols: string[] = [];
  const categoryCols: string[] = [];
  const totalNumericSum: Record<string, number> = {};
  const avgNumericVal: Record<string, number> = {};

  if (!data || data.length === 0) {
    return { numericCols, categoryCols, totalNumericSum, avgNumericVal };
  }

  headers.forEach((h) => {
    let isNum = true;
    let sum = 0;
    let count = 0;

    for (let i = 0; i < Math.min(data.length, 100); i++) {
      const val = data[i][h];
      if (val === null || val === undefined || val === "") continue;
      const num = Number(val);
      if (isNaN(num)) {
        isNum = false;
        break;
      }
    }

    if (isNum) {
      numericCols.push(h);
      data.forEach((row) => {
        const val = Number(row[h]);
        if (!isNaN(val)) {
          sum += val;
          count++;
        }
      });
      totalNumericSum[h] = sum;
      avgNumericVal[h] = count > 0 ? sum / count : 0;
    } else {
      categoryCols.push(h);
    }
  });

  return { numericCols, categoryCols, totalNumericSum, avgNumericVal };
}

export async function parseAndSaveFile(file: File, companyId: string): Promise<ImportedFile> {
  const rawText = await file.text();
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  
  let fileType: ImportedFile["fileType"] = "csv";
  if (ext === "json") fileType = "json";
  else if (ext === "xlsx" || ext === "xls") fileType = "excel";
  else if (ext === "pdf") fileType = "pdf";
  else if (ext === "txt") fileType = "text";

  let headers: string[] = [];
  let parsedData: Record<string, any>[] = [];

  if (fileType === "json") {
    try {
      const json = JSON.parse(rawText);
      if (Array.isArray(json)) {
        parsedData = json;
        if (json.length > 0 && typeof json[0] === "object") {
          headers = Object.keys(json[0]);
        }
      } else if (typeof json === "object") {
        parsedData = [json];
        headers = Object.keys(json);
      }
    } catch {
      parsedData = [{ content: rawText }];
      headers = ["content"];
    }
  } else {
    // CSV / Excel / TXT
    const result = Papa.parse(rawText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    parsedData = (result.data as Record<string, any>[]) || [];
    headers = result.meta.fields || (parsedData.length > 0 ? Object.keys(parsedData[0]) : []);

    if (headers.length === 0 && rawText.trim()) {
      // Fallback line-by-line parsing if no headers found
      const lines = rawText.split("\n").filter((l) => l.trim());
      parsedData = lines.map((l, idx) => ({ row: idx + 1, content: l }));
      headers = ["row", "content"];
    }
  }

  const stats = computeSummaryStats(parsedData, headers);

  const importedFile: ImportedFile = {
    id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    companyId,
    fileName: file.name,
    fileSize: file.size,
    fileType,
    uploadedAt: new Date().toISOString(),
    rowCount: parsedData.length,
    headers,
    parsedData,
    rawText,
    summaryStats: stats,
  };

  saveImportedFile(importedFile);
  return importedFile;
}

export function createSampleFile(type: "sales" | "expenses" | "inventory" | "customers", companyId: string): ImportedFile {
  let fileName = "";
  let headers: string[] = [];
  let parsedData: Record<string, any>[] = [];

  if (type === "sales") {
    fileName = "q3_sales_records.csv";
    headers = ["item_name", "category", "quantity", "amount", "sold_at"];
    parsedData = [
      { item_name: "Espresso Beans 1kg", category: "Coffee", quantity: 15, amount: 450, sold_at: "2026-08-01" },
      { item_name: "Matcha Powder 500g", category: "Tea", quantity: 8, amount: 240, sold_at: "2026-08-02" },
      { item_name: "Almond Milk 1L Box", category: "Beverages", quantity: 50, amount: 200, sold_at: "2026-08-03" },
      { item_name: "Oat Milk 1L Box", category: "Beverages", quantity: 40, amount: 180, sold_at: "2026-08-04" },
      { item_name: "Cold Brew Keg 20L", category: "Beverages", quantity: 3, amount: 360, sold_at: "2026-08-05" },
      { item_name: "Dark Roast Blend", category: "Coffee", quantity: 25, amount: 625, sold_at: "2026-08-06" },
    ];
  } else if (type === "expenses") {
    fileName = "monthly_operating_expenses.csv";
    headers = ["description", "category", "amount", "incurred_at", "vendor"];
    parsedData = [
      { description: "Commercial Roaster Maintenance", category: "Equipment", amount: 850, incurred_at: "2026-08-01", vendor: "Tech Services" },
      { description: "Organic Beans Wholesale Bulk", category: "Supplies", amount: 2400, incurred_at: "2026-08-02", vendor: "Bean Imports" },
      { description: "Storefront Rent August", category: "Rent & Lease", amount: 3200, incurred_at: "2026-08-03", vendor: "Real Estate Corp" },
      { description: "Digital Marketing Campaign", category: "Marketing", amount: 600, incurred_at: "2026-08-04", vendor: "Ad Agency" },
      { description: "Utilities & Fiber Network", category: "Utilities", amount: 420, incurred_at: "2026-08-05", vendor: "Power & Fiber" },
    ];
  } else if (type === "inventory") {
    fileName = "warehouse_inventory_stock.csv";
    headers = ["item_name", "sku", "category", "quantity", "unit_cost"];
    parsedData = [
      { item_name: "Ethiopian Yirgacheffe Beans", sku: "BE-ET-001", category: "Coffee", quantity: 120, unit_cost: 14.5 },
      { item_name: "Colombian Supremo Beans", sku: "BE-CO-002", category: "Coffee", quantity: 85, unit_cost: 12.0 },
      { item_name: "Japanese Ceramic Mugs", sku: "MER-MUG-01", category: "Merchandise", quantity: 45, unit_cost: 8.5 },
      { item_name: "Handheld Burr Grinders", sku: "EQ-GRN-02", category: "Equipment", quantity: 18, unit_cost: 35.0 },
      { item_name: "Biodegradable Coffee Cups", sku: "SUP-CUP-12", category: "Packaging", quantity: 1500, unit_cost: 0.15 },
    ];
  } else {
    fileName = "customer_directory_list.csv";
    headers = ["name", "email", "phone", "visit_count", "total_spent", "notes"];
    parsedData = [
      { name: "Alice Johnson", email: "alice@example.com", phone: "+1 555-0192", visit_count: 34, total_spent: 420.5, notes: "VIP Customer" },
      { name: "Bob Martinez", email: "bob@example.com", phone: "+1 555-0143", visit_count: 22, total_spent: 285.0, notes: "Regular morning visitor" },
      { name: "Carol Chen", email: "carol@example.com", phone: "+1 555-0188", visit_count: 15, total_spent: 180.75, notes: "Prefers oat milk" },
      { name: "David Smith", email: "david@example.com", phone: "+1 555-0176", visit_count: 28, total_spent: 350.0, notes: "Corporate account" },
    ];
  }

  const rawText = Papa.unparse({ fields: headers, data: parsedData });
  const stats = computeSummaryStats(parsedData, headers);

  const file: ImportedFile = {
    id: `file_sample_${type}_${Date.now()}`,
    companyId,
    fileName,
    fileSize: rawText.length,
    fileType: "csv",
    uploadedAt: new Date().toISOString(),
    rowCount: parsedData.length,
    headers,
    parsedData,
    rawText,
    summaryStats: stats,
  };

  saveImportedFile(file);
  return file;
}

export async function importRowsToDatabase(
  file: ImportedFile,
  targetTable: "sales" | "expenses" | "inventory" | "customers",
  mapping: Record<string, string>,
  companyId: string
): Promise<{ success: boolean; insertedCount: number; error?: string }> {
  if (!companyId) {
    return { success: false, insertedCount: 0, error: "No company linked to user profile." };
  }

  try {
    const payload = file.parsedData.map((row) => {
      const record: Record<string, any> = { company_id: companyId };
      Object.entries(mapping).forEach(([targetCol, sourceHeader]) => {
        if (targetCol && sourceHeader && row[sourceHeader] !== undefined && row[sourceHeader] !== null && row[sourceHeader] !== "") {
          let val = row[sourceHeader];
          if (targetCol === "amount" || targetCol === "quantity" || targetCol === "unit_cost" || targetCol === "total_spent" || targetCol === "visit_count") {
            val = Number(val) || 0;
          }
          record[targetCol] = val;
        }
      });
      return record;
    });

    const { error } = await supabase.from(targetTable).insert(payload);
    if (error) {
      console.error(`Supabase insert to ${targetTable} failed:`, error);
      return { success: false, insertedCount: 0, error: error.message };
    }

    return { success: true, insertedCount: payload.length };
  } catch (err: any) {
    return { success: false, insertedCount: 0, error: err?.message || "Import failed" };
  }
}

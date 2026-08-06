import { useState, useEffect } from "react";
import { X, Database, Check, AlertCircle, ArrowRight } from "lucide-react";
import type { ImportedFile } from "../../lib/fileStorage";
import { importRowsToDatabase } from "../../lib/fileStorage";
import Button from "../ui/Button";

interface DataImportMappingModalProps {
  file: ImportedFile;
  companyId: string;
  onClose: () => void;
  onSuccess: (targetTable: string, count: number) => void;
}

type TargetTable = "sales" | "expenses" | "inventory" | "customers";

interface TableField {
  key: string;
  label: string;
  required: boolean;
}

const TABLE_SCHEMAS: Record<TargetTable, { label: string; fields: TableField[] }> = {
  sales: {
    label: "Sales Records Table",
    fields: [
      { key: "item_name", label: "Item Name", required: true },
      { key: "category", label: "Category", required: false },
      { key: "quantity", label: "Quantity", required: false },
      { key: "amount", label: "Sale Amount ($)", required: true },
      { key: "sold_at", label: "Sold Date (YYYY-MM-DD)", required: false },
    ],
  },
  expenses: {
    label: "Operating Expenses Table",
    fields: [
      { key: "description", label: "Expense Description", required: true },
      { key: "category", label: "Category", required: false },
      { key: "amount", label: "Expense Amount ($)", required: true },
      { key: "incurred_at", label: "Incurred Date (YYYY-MM-DD)", required: false },
      { key: "vendor", label: "Vendor / Supplier", required: false },
    ],
  },
  inventory: {
    label: "Inventory Items Table",
    fields: [
      { key: "item_name", label: "Item Name", required: true },
      { key: "sku", label: "SKU / Code", required: false },
      { key: "category", label: "Category", required: false },
      { key: "quantity", label: "Stock Quantity", required: true },
      { key: "unit_cost", label: "Unit Cost ($)", required: false },
    ],
  },
  customers: {
    label: "Customer Directory Table",
    fields: [
      { key: "name", label: "Customer Name", required: true },
      { key: "email", label: "Email Address", required: false },
      { key: "phone", label: "Phone Number", required: false },
      { key: "visit_count", label: "Number of Visits / Orders", required: false },
      { key: "total_spent", label: "Total Spent ($)", required: false },
      { key: "notes", label: "Notes / Comments", required: false },
    ],
  },
};

const FIELD_ALIASES: Record<string, string[]> = {
  visit_count: ["visit", "visits", "visitcount", "numberofvisits", "totalvisits", "orders", "ordercount", "frequency"],
  total_spent: ["spent", "totalspent", "spend", "totalspend", "totalamount", "amountspent", "revenue"],
  item_name: ["item", "itemname", "product", "productname", "title", "name"],
  amount: ["amount", "price", "total", "cost", "sale", "value"],
  quantity: ["quantity", "qty", "count", "units", "stock"],
  unit_cost: ["unitcost", "cost", "price", "unitprice"],
  sold_at: ["soldat", "date", "solddate", "transactiondate", "time", "createdat"],
  incurred_at: ["incurredat", "date", "spentat", "expensedate", "time"],
  description: ["description", "desc", "details", "item", "title", "notes"],
  vendor: ["vendor", "supplier", "merchant", "payee"],
  name: ["name", "customer", "customername", "client", "contact"],
  email: ["email", "emailaddress", "mail"],
  phone: ["phone", "phonenumber", "mobile", "tel", "contactnumber"],
  sku: ["sku", "code", "barcode", "itemcode"],
  category: ["category", "cat", "type", "group"],
};

export default function DataImportMappingModal({
  file,
  companyId,
  onClose,
  onSuccess,
}: DataImportMappingModalProps) {
  // Infer best table based on filename / headers
  const initialTable = (): TargetTable => {
    const fn = file.fileName.toLowerCase();
    const headers = file.headers.map((h) => h.toLowerCase());
    if (fn.includes("expense") || headers.some((h) => h.includes("spent") || h.includes("cost") || h.includes("vendor"))) return "expenses";
    if (fn.includes("inventory") || headers.some((h) => h.includes("sku") || h.includes("stock"))) return "inventory";
    if (fn.includes("customer") || headers.some((h) => h.includes("visit") || h.includes("customer"))) return "customers";
    return "sales";
  };

  const [targetTable, setTargetTable] = useState<TargetTable>(initialTable);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-map headers whenever target table changes
  useEffect(() => {
    const newMapping: Record<string, string> = {};
    const schema = TABLE_SCHEMAS[targetTable];
    schema.fields.forEach((field) => {
      // Find matching source header using exact/contains or alias match
      const aliases = FIELD_ALIASES[field.key] || [field.key];
      const matchedHeader = file.headers.find((h) => {
        const hl = h.toLowerCase().replace(/[^a-z0-9]/g, "");
        const fl = field.key.toLowerCase().replace(/[^a-z0-9]/g, "");

        if (hl === fl || hl.includes(fl) || fl.includes(hl)) return true;
        return aliases.some((alias) => hl === alias || hl.includes(alias));
      });
      newMapping[field.key] = matchedHeader || "";
    });
    setMapping(newMapping);
  }, [targetTable, file.headers]);

  const handleImport = async () => {
    setError(null);
    setImporting(true);

    const result = await importRowsToDatabase(file, targetTable, mapping, companyId);
    setImporting(false);

    if (!result.success) {
      setError(result.error || "Failed to import rows into database.");
    } else {
      onSuccess(TABLE_SCHEMAS[targetTable].label, result.insertedCount);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col glass-card border border-border overflow-hidden rounded-2xl shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent/20 flex items-center justify-center">
              <Database size={20} className="text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Import File Data to Database</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Map columns from <span className="text-text-primary font-medium">{file.fileName}</span> into your workspace tables
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl border border-danger/30 bg-danger/10 text-danger text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Table Selection */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">
              Target Workspace Database Table
            </label>
            <select
              value={targetTable}
              onChange={(e) => setTargetTable(e.target.value as TargetTable)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-text-primary text-sm font-medium focus:outline-none focus:border-accent/50"
            >
              {Object.entries(TABLE_SCHEMAS).map(([key, schema]) => (
                <option key={key} value={key} className="bg-bg text-text-primary">
                  {schema.label} ({file.rowCount} rows will be inserted)
                </option>
              ))}
            </select>
          </div>

          {/* Column Mapping Section */}
          <div>
            <h4 className="text-xs font-semibold text-text-secondary uppercase mb-3">
              Column Mapping Rules
            </h4>
            <div className="space-y-2">
              {TABLE_SCHEMAS[targetTable].fields.map((field) => (
                <div
                  key={field.key}
                  className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface/30 gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-primary flex items-center gap-1.5">
                      {field.label}
                      {field.required && <span className="text-danger">*</span>}
                    </p>
                    <p className="text-[10px] text-text-muted font-mono">{field.key}</p>
                  </div>

                  <ArrowRight size={14} className="text-text-muted shrink-0" />

                  <select
                    value={mapping[field.key] || ""}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="w-48 sm:w-56 px-3 py-1.5 rounded-lg bg-surface border border-border text-text-primary text-xs focus:outline-none focus:border-accent/50 truncate"
                  >
                    <option value="">-- Ignore Column --</option>
                    {file.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface/50 shrink-0">
          <p className="text-xs text-text-muted">
            Inserting <strong className="text-text-primary">{file.rowCount}</strong> rows into active workspace
          </p>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={importing}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" icon={Check} onClick={handleImport} disabled={importing}>
              {importing ? "Importing Data…" : `Import ${file.rowCount} Records`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

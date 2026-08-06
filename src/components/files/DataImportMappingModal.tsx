import { useState, useMemo } from "react";
import { X, Database, CheckCircle2, ArrowRight, AlertCircle } from "lucide-react";
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

interface TableOption {
  label: string;
  icon: string;
  fields: string[];
}

const TABLE_OPTIONS: Record<TargetTable, TableOption> = {
  sales: {
    label: "Sales",
    icon: "📊",
    fields: ["item_name", "category", "quantity", "amount", "sold_at"],
  },
  expenses: {
    label: "Expenses",
    icon: "💸",
    fields: ["description", "category", "amount", "incurred_at", "vendor"],
  },
  inventory: {
    label: "Inventory",
    icon: "📦",
    fields: ["name", "sku", "category", "quantity", "unit_cost"],
  },
  customers: {
    label: "Customers",
    icon: "👥",
    fields: ["name", "email", "phone", "visit_count", "total_spent", "notes"],
  },
};

const FIELD_ALIASES: Record<string, string[]> = {
  item_name: ["item", "itemname", "product", "productname", "title", "name"],
  name: ["customer", "customername", "client", "contact", "fullname"],
  amount: ["amount", "price", "total", "cost", "sale", "value", "spent", "revenue"],
  quantity: ["quantity", "qty", "count", "units", "stock", "visit", "visits", "ordercount"],
  unit_cost: ["unitcost", "cost", "unitprice", "price"],
  sold_at: ["soldat", "date", "solddate", "transactiondate", "time", "createdat"],
  incurred_at: ["incurredat", "date", "spentat", "expensedate", "time"],
  description: ["description", "desc", "details", "item", "title", "notes"],
  vendor: ["vendor", "supplier", "merchant", "payee"],
  email: ["email", "emailaddress", "mail", "e-mail"],
  phone: ["phone", "phonenumber", "mobile", "tel", "contactnumber"],
  sku: ["sku", "code", "barcode", "skuid"],
  category: ["category", "cat", "type", "group", "department"],
  total_spent: ["totalspent", "spend", "totalspend", "totalamount", "amountspent"],
  visit_count: ["visitcount", "totalvisits", "numberofvisits", "orders"],
};

function autoMapHeaders(
  fileHeaders: string[],
  targetFields: string[],
): Record<string, string> {
  const mapping: Record<string, string> = {};

  targetFields.forEach((field) => {
    const aliases = FIELD_ALIASES[field] || [field];
    const fieldNormalized = field.toLowerCase().replace(/[^a-z0-9]/g, "");

    const matched = fileHeaders.find((h) => {
      const hl = h.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (hl === fieldNormalized) return true;
      return aliases.some((a) => hl === a || hl.includes(a) || a.includes(hl));
    });

    if (matched) mapping[field] = matched;
  });

  return mapping;
}

const IMPORT_STATUS = {
  IDLE: "idle",
  IMPORTING: "importing",
  SUCCESS: "success",
  ERROR: "error",
} as const;

export default function DataImportMappingModal({
  file,
  companyId,
  onClose,
  onSuccess,
}: DataImportMappingModalProps) {
  const [targetTable, setTargetTable] = useState<TargetTable>("sales");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importStatus, setImportStatus] = useState<keyof typeof IMPORT_STATUS>("IDLE");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialise mapping when target table changes
  useMemo(() => {
    const tableFields = TABLE_OPTIONS[targetTable].fields;
    setMapping(autoMapHeaders(file.headers, tableFields));
    setImportStatus("IDLE");
    setErrorMessage(null);
  }, [targetTable, file.headers]);

  const handleSelectMapping = (field: string, header: string) => {
    setMapping((prev) => ({ ...prev, [field]: header }));
    setImportStatus("IDLE");
    setErrorMessage(null);
  };

  const handleImport = async () => {
    setImportStatus("IMPORTING");
    setErrorMessage(null);

    try {
      const res = await importRowsToDatabase(file, targetTable, mapping, companyId);
      if (res.success) {
        setImportStatus("SUCCESS");
        setTimeout(() => {
          onClose();
          onSuccess(TABLE_OPTIONS[targetTable].label, res.insertedCount);
        }, 1200);
      } else {
        setImportStatus("ERROR");
        setErrorMessage(res.error || "Import failed — unknown error.");
      }
    } catch (err: any) {
      setImportStatus("ERROR");
      setErrorMessage(err?.message || "Unexpected error during import.");
    }
  };

  const isImporting = importStatus === "IMPORTING";
  const isSuccess = importStatus === "SUCCESS";
  const tableFields = TABLE_OPTIONS[targetTable].fields;
  const unmappedCount = tableFields.filter((f) => !mapping[f]).length;

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
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
              <Database size={20} className="text-accent" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-text-primary truncate">
                Import to Database
              </h3>
              <p className="text-xs text-text-muted mt-0.5 truncate">
                Map columns from <span className="text-text-primary font-medium">{file.fileName}</span> to a database table
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isImporting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors shrink-0 disabled:opacity-30"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Target Table Selector */}
        <div className="px-6 py-3 border-b border-border bg-surface/30 shrink-0">
          <p className="text-xs font-semibold text-text-secondary uppercase mb-2.5">Target Table</p>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(TABLE_OPTIONS) as [TargetTable, TableOption][]).map(
              ([key, opt]) => (
                <button
                  key={key}
                  onClick={() => setTargetTable(key)}
                  disabled={isImporting}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    targetTable === key
                      ? "bg-accent-subtle border border-accent/40 text-accent shadow-sm"
                      : "bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span>{opt.icon}</span> {opt.label}
                </button>
              ),
            )}
          </div>
          <p className="text-[10px] text-text-muted mt-2">
            Target fields: <span className="text-text-secondary font-medium">{tableFields.join(", ")}</span>
          </p>
        </div>

        {/* Column Mapping */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-10 text-success">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-success" />
              </div>
              <p className="text-base font-semibold text-text-primary">Import Complete!</p>
              <p className="text-xs text-text-muted mt-1">Closing &amp; refreshing data…</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-text-secondary uppercase">
                  Column Mapping
                </p>
                {unmappedCount > 0 && (
                  <span className="text-[10px] font-medium text-warning flex items-center gap-1">
                    <AlertCircle size={12} />
                    {unmappedCount} field{unmappedCount !== 1 ? "s" : ""} unmapped
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {tableFields.map((field) => (
                  <div
                    key={field}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      mapping[field]
                        ? "border-border bg-surface/40"
                        : "border-dashed border-warning/30 bg-warning/5"
                    }`}
                  >
                    {/* Target field name */}
                    <div className="w-[120px] shrink-0">
                      <p className="text-xs font-medium text-text-primary font-mono">{field}</p>
                    </div>

                    <div className="flex items-center gap-2 text-text-muted shrink-0">
                      <ArrowRight size={14} />
                    </div>

                    {/* Source header selector */}
                    <select
                      value={mapping[field] || ""}
                      onChange={(e) => handleSelectMapping(field, e.target.value)}
                      disabled={isImporting}
                      className={`flex-1 h-9 px-3 text-xs rounded-lg border bg-surface text-text-primary outline-none transition-colors cursor-pointer
                        ${mapping[field]
                          ? "border-border hover:border-border-hover"
                          : "border-warning/40 hover:border-warning/60"
                        }
                        focus:border-accent/50 focus:ring-1 focus:ring-accent/20
                        disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <option value="">— Skip this field —</option>
                      {file.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>

                    {/* Sample preview */}
                    {mapping[field] && (
                      <div className="hidden sm:block w-[160px] shrink-0">
                        <p className="text-[10px] text-text-muted truncate" title={String(file.parsedData[0]?.[mapping[field]] ?? "")}>
                          e.g. {String(file.parsedData[0]?.[mapping[field]] ?? "—").slice(0, 24)}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Error */}
        {importStatus === "ERROR" && errorMessage && (
          <div className="mx-6 mb-2 p-3 rounded-xl bg-danger/10 border border-danger/30 text-xs text-danger flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface/50 shrink-0">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isImporting}>
            Cancel
          </Button>

          {!isSuccess && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-muted">
                {file.rowCount} rows will be inserted
              </span>
              <Button
                variant="primary"
                size="sm"
                icon={isImporting ? undefined : Database}
                loading={isImporting}
                disabled={isImporting}
                onClick={handleImport}
              >
                {isImporting ? "Importing…" : `Import to ${TABLE_OPTIONS[targetTable].label}`}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
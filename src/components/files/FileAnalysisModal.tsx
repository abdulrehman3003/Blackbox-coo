import { useState, useMemo } from "react";
import { X, Sparkles, TrendingUp, CheckCircle, Database, FileText, ArrowRight, DollarSign, ShoppingCart, Package, Users } from "lucide-react";
import type { ImportedFile } from "../../lib/fileStorage";
import { autoIngestFile, importRowsToDatabase } from "../../lib/fileStorage";
import Button from "../ui/Button";

interface FileAnalysisModalProps {
  file: ImportedFile;
  companyId?: string;
  onClose: () => void;
  onImportToDb: (file: ImportedFile) => void;
  onRunFullAnalysis?: () => void;
}

type AnalysisMode = "auto" | "sales" | "expenses" | "inventory" | "customers";

interface MaxRecord {
  label: string;
  val: number;
}

export default function FileAnalysisModal({
  file,
  onClose,
  onImportToDb,
  onRunFullAnalysis,
}: FileAnalysisModalProps) {
  // Mode selection state
  const [mode, setMode] = useState<AnalysisMode>("auto");
  const [analyzing, setAnalyzing] = useState(false);

  // Ingest specific file data & run full workspace analysis directly in place
  const handleRunFullAnalysis = async (targetMode?: AnalysisMode) => {
    setAnalyzing(true);
    const activeMode = targetMode || mode;
    if (activeMode !== "auto") {
      let targetTable: "sales" | "expenses" | "inventory" | "customers" = "sales";
      if (activeMode === "expenses") targetTable = "expenses";
      else if (activeMode === "inventory") targetTable = "inventory";
      else if (activeMode === "customers") targetTable = "customers";

      const mapping: Record<string, string> = {};
      file.headers.forEach((h) => {
        const hl = h.toLowerCase();
        if (hl.includes("item") || hl.includes("name") || hl.includes("desc")) mapping["item_name"] = h;
        if (hl.includes("price") || hl.includes("amount") || hl.includes("cost") || hl.includes("spent")) mapping["amount"] = h;
        if (hl.includes("qty") || hl.includes("quantity") || hl.includes("stock") || hl.includes("visit")) mapping["quantity"] = h;
        if (hl.includes("date") || hl.includes("time")) mapping["sold_at"] = h;
      });
      await importRowsToDatabase(file, targetTable, mapping, file.companyId);
    } else {
      await autoIngestFile(file, file.companyId);
    }

    setAnalyzing(false);
    onClose();
    if (onRunFullAnalysis) {
      onRunFullAnalysis();
    }
  };

  // Compute targeted analysis based on selected mode
  const analysis = useMemo(() => {
    const fn = file.fileName.toLowerCase();
    const headers = file.headers.map((h) => h.toLowerCase());

    let detectedType = "Business Data Record";
    if (headers.some((h) => h.includes("sale") || h.includes("sold") || h.includes("customer")) || fn.includes("sales")) {
      detectedType = "Sales Ledger";
    } else if (headers.some((h) => h.includes("expense") || h.includes("cost") || h.includes("vendor")) || fn.includes("expense")) {
      detectedType = "Operating Expenses";
    } else if (headers.some((h) => h.includes("sku") || h.includes("stock") || h.includes("inventory")) || fn.includes("inventory")) {
      detectedType = "Inventory Stock";
    } else if (headers.some((h) => h.includes("visit") || h.includes("mail") || h.includes("customer")) || fn.includes("customer")) {
      detectedType = "Customer Directory";
    }

    const activeType = mode === "auto" ? detectedType : mode.toUpperCase();

    // Identify best numeric column
    const numCol =
      file.summaryStats.numericCols.find((c) => {
        const cl = c.toLowerCase();
        if (mode === "sales") return cl.includes("amount") || cl.includes("total") || cl.includes("price");
        if (mode === "expenses") return cl.includes("amount") || cl.includes("cost") || cl.includes("spent");
        if (mode === "inventory") return cl.includes("quantity") || cl.includes("stock") || cl.includes("unit_cost");
        if (mode === "customers") return cl.includes("visit") || cl.includes("spent") || cl.includes("order");
        return true;
      }) || file.summaryStats.numericCols[0] || null;

    // Identify best label column
    const labelCol =
      file.headers.find((h) => {
        const hl = h.toLowerCase();
        if (mode === "sales") return hl.includes("item") || hl.includes("product") || hl.includes("name");
        if (mode === "expenses") return hl.includes("desc") || hl.includes("vendor") || hl.includes("category");
        if (mode === "inventory") return hl.includes("item") || hl.includes("sku") || hl.includes("name");
        if (mode === "customers") return hl.includes("name") || hl.includes("customer") || hl.includes("email");
        return false;
      }) || file.summaryStats.categoryCols[0] || file.headers[0] || "Row";

    let totalVal = 0;
    let avgVal = 0;
    let maxRecord: MaxRecord | null = null;

    if (numCol) {
      totalVal = file.summaryStats.totalNumericSum[numCol] || 0;
      avgVal = file.summaryStats.avgNumericVal[numCol] || 0;

      let max = -Infinity;
      file.parsedData.forEach((row) => {
        const v = Number(row[numCol]);
        if (!isNaN(v) && v > max) {
          max = v;
          maxRecord = {
            label: String(row[labelCol] || "Record"),
            val: v,
          };
        }
      });
    }

    // AI Insights Generator
    const insights: string[] = [];
    if (mode === "sales" || (mode === "auto" && detectedType.includes("Sales"))) {
      insights.push(`Analyzed ${file.rowCount} sales transaction rows.`);
      if (numCol) insights.push(`Total Revenue parsed: $${totalVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}.`);
      if (maxRecord) {
        const rec = maxRecord as MaxRecord;
        insights.push(`Top performing sale item: '${rec.label}' ($${rec.val.toLocaleString()}).`);
      }
    } else if (mode === "expenses" || (mode === "auto" && detectedType.includes("Expenses"))) {
      insights.push(`Analyzed ${file.rowCount} expense ledger items.`);
      if (numCol) insights.push(`Total Operating Spend parsed: $${totalVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}.`);
      if (maxRecord) {
        const rec = maxRecord as MaxRecord;
        insights.push(`Highest expense item: '${rec.label}' ($${rec.val.toLocaleString()}).`);
      }
    } else if (mode === "inventory" || (mode === "auto" && detectedType.includes("Inventory"))) {
      insights.push(`Analyzed ${file.rowCount} inventory stock items.`);
      if (numCol) insights.push(`Aggregate metric sum for attribute '${numCol}': ${totalVal.toLocaleString()}.`);
      if (maxRecord) {
        const rec = maxRecord as MaxRecord;
        insights.push(`Highest stock count: '${rec.label}' (${rec.val.toLocaleString()} units).`);
      }
    } else if (mode === "customers" || (mode === "auto" && detectedType.includes("Customer"))) {
      insights.push(`Analyzed ${file.rowCount} registered customer records.`);
      if (numCol) insights.push(`Aggregate metric sum for attribute '${numCol}': ${totalVal.toLocaleString()}.`);
      if (maxRecord) {
        const rec = maxRecord as MaxRecord;
        insights.push(`Top customer record: '${rec.label}' (${rec.val.toLocaleString()}).`);
      }
    } else {
      insights.push(`Parsed ${file.rowCount} data entries across ${file.headers.length} structured attributes.`);
      if (numCol) insights.push(`Calculated aggregate total of ${totalVal.toLocaleString()} for '${numCol}'.`);
    }

    return {
      activeType,
      numCol,
      labelCol,
      totalVal,
      avgVal,
      maxRecord,
      insights,
    };
  }, [file, mode]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col glass-card border border-border overflow-hidden rounded-2xl shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center">
              <Sparkles size={20} className="text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-text-primary">File Data Analysis</h3>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent/10 text-accent border border-accent/20">
                  {analysis.activeType}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Targeted AI analysis for <span className="text-text-primary font-medium">{file.fileName}</span>
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

        {/* Targeted Analysis Selector Bar */}
        <div className="px-6 py-2.5 border-b border-border bg-surface/30 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <span className="text-xs font-semibold text-text-secondary uppercase">
            Targeted Perspective Analysis:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setMode("auto")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                mode === "auto"
                  ? "bg-accent-subtle border border-accent/40 text-accent"
                  : "bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              <Sparkles size={12} /> Auto Detect
            </button>

            <button
              onClick={() => setMode("sales")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                mode === "sales"
                  ? "bg-accent-subtle border border-accent/40 text-accent"
                  : "bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              <DollarSign size={12} /> Sales Analysis
            </button>

            <button
              onClick={() => setMode("expenses")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                mode === "expenses"
                  ? "bg-accent-subtle border border-accent/40 text-accent"
                  : "bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              <ShoppingCart size={12} /> Expenses Analysis
            </button>

            <button
              onClick={() => setMode("inventory")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                mode === "inventory"
                  ? "bg-accent-subtle border border-accent/40 text-accent"
                  : "bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              <Package size={12} /> Inventory Analysis
            </button>

            <button
              onClick={() => setMode("customers")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                mode === "customers"
                  ? "bg-accent-subtle border border-accent/40 text-accent"
                  : "bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              <Users size={12} /> Customers Analysis
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-border bg-surface/30">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>Total Rows Parsed</span>
                <FileText size={14} className="text-accent" />
              </div>
              <p className="text-2xl font-bold text-text-primary mt-2">{file.rowCount}</p>
              <p className="text-xs text-text-muted mt-1">{file.headers.length} attributes detected</p>
            </div>

            {analysis.numCol && (
              <div className="p-4 rounded-xl border border-border bg-surface/30">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>Aggregate Total ({analysis.numCol})</span>
                  <TrendingUp size={14} className="text-accent" />
                </div>
                <p className="text-2xl font-bold text-accent mt-2">
                  {analysis.totalVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-text-muted mt-1">Average: {analysis.avgVal.toFixed(2)}</p>
              </div>
            )}

            {analysis.maxRecord && (
              <div className="p-4 rounded-xl border border-border bg-surface/30">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>Top Record</span>
                  <CheckCircle size={14} className="text-success" />
                </div>
                <p className="text-base font-bold text-text-primary mt-2 truncate">
                  {(analysis.maxRecord as MaxRecord).label}
                </p>
                <p className="text-xs text-accent mt-1">
                  {(analysis.maxRecord as MaxRecord).val.toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* AI Key Insights Block */}
          <div className="p-5 rounded-xl border border-accent/20 bg-accent-subtle/30 space-y-3">
            <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Sparkles size={16} className="text-accent" />
              AI Key Observations ({mode === "auto" ? "General" : mode.toUpperCase()})
            </h4>
            <ul className="space-y-2 text-xs text-text-secondary">
              {analysis.insights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface/50 shrink-0">
          <Button
            variant="primary"
            size="sm"
            icon={Database}
            onClick={() => {
              onClose();
              onImportToDb(file);
            }}
          >
            Import Data to Workspace
          </Button>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={ArrowRight}
              disabled={analyzing}
              onClick={() => handleRunFullAnalysis(mode)}
            >
              {analyzing ? "Ingesting Data…" : `Run Executive Suite (${mode.toUpperCase()})`}
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

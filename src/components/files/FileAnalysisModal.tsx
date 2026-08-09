import { useState, useMemo, useEffect, useCallback } from "react";
import {
  X,
  Sparkles,
  TrendingUp,
  CheckCircle,
  Database,
  FileText,
  ArrowRight,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  AlertCircle,
  Brain,
  Zap,
  CheckCircle2,
  Play,
} from "lucide-react";
import type { ImportedFile } from "../../lib/fileStorage";
import { autoIngestFile, importRowsToDatabase } from "../../lib/fileStorage";
import { runFileGeminiAnalysis, type FileGeminiResult } from "../../lib/ai/fileGeminiAnalysis";
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
  companyId,
  onClose,
  onImportToDb,
  onRunFullAnalysis,
}: FileAnalysisModalProps) {
  // Mode selection state
  const [mode, setMode] = useState<AnalysisMode>("auto");
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingGemini, setLoadingGemini] = useState(false);
  const [geminiResult, setGeminiResult] = useState<FileGeminiResult | null>(null);

  const activeCompanyId = companyId || file.companyId || "";

  // Run Gemini analysis directly on this file
  const handleRunGeminiAnalysis = useCallback(
    async (targetMode?: AnalysisMode) => {
      setLoadingGemini(true);
      const activeMode = targetMode || mode;
      try {
        const res = await runFileGeminiAnalysis(activeCompanyId, file, activeMode);
        setGeminiResult(res);
      } catch (err) {
        console.error("Gemini file analysis failed:", err);
      } finally {
        setLoadingGemini(false);
      }
    },
    [activeCompanyId, file, mode]
  );

  // Run Gemini automatically on modal open
  useEffect(() => {
    handleRunGeminiAnalysis("auto");
  }, [handleRunGeminiAnalysis]);

  // Ingest specific file data & run full workspace analysis
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
      await importRowsToDatabase(file, targetTable, mapping, activeCompanyId);
    } else {
      await autoIngestFile(file, activeCompanyId);
    }

    setAnalyzing(false);
    onClose();
    if (onRunFullAnalysis) {
      onRunFullAnalysis();
    }
  };

  // Compute local summary statistics
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

    return {
      activeType,
      numCol,
      totalVal,
      avgVal,
      maxRecord,
    };
  }, [file, mode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl max-h-[90vh] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center">
              <Brain size={20} className="text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-text-primary">Gemini AI File Agent Analysis</h3>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent/10 text-accent border border-accent/20">
                  {analysis.activeType}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Targeted AI Agent inspection for <span className="text-text-primary font-medium">{file.fileName}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-border bg-surface/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-text-secondary uppercase mr-1">Perspective:</span>
            <button
              type="button"
              onClick={() => {
                setMode("auto");
                handleRunGeminiAnalysis("auto");
              }}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                mode === "auto"
                  ? "bg-accent-subtle border border-accent/40 text-accent"
                  : "bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              <Sparkles size={12} /> Auto Detect
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("sales");
                handleRunGeminiAnalysis("sales");
              }}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                mode === "sales"
                  ? "bg-accent-subtle border border-accent/40 text-accent"
                  : "bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              <DollarSign size={12} /> Sales Focus
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("expenses");
                handleRunGeminiAnalysis("expenses");
              }}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                mode === "expenses"
                  ? "bg-accent-subtle border border-accent/40 text-accent"
                  : "bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              <ShoppingCart size={12} /> Expense Focus
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("inventory");
                handleRunGeminiAnalysis("inventory");
              }}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                mode === "inventory"
                  ? "bg-accent-subtle border border-accent/40 text-accent"
                  : "bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              <Package size={12} /> Inventory Focus
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("customers");
                handleRunGeminiAnalysis("customers");
              }}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                mode === "customers"
                  ? "bg-accent-subtle border border-accent/40 text-accent"
                  : "bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              <Users size={12} /> Customer Intelligence
            </button>
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={Sparkles}
            loading={loadingGemini}
            onClick={() => handleRunGeminiAnalysis(mode)}
          >
            {loadingGemini ? "Running AI Agent…" : "Run AI Analysis"}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                  <span>Aggregate Sum ({analysis.numCol})</span>
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

          {/* GEMINI AI AGENT ANALYSIS CARD */}
          {loadingGemini ? (
            <div className="p-8 rounded-2xl border border-accent/20 bg-accent-subtle/20 text-center animate-pulse space-y-3">
              <Brain size={32} className="mx-auto text-accent animate-spin" />
              <p className="text-sm font-semibold text-text-primary">AI is analyzing file contents & headers…</p>
              <p className="text-xs text-text-muted">Evaluating {file.rowCount} rows for risks, opportunities, and insights.</p>
            </div>
          ) : geminiResult ? (
            <div className="space-y-4">
              {/* Gemini Header & Engine Badge */}
              <div className="p-5 rounded-2xl border border-accent/30 bg-accent-subtle/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-accent" />
                    <h4 className="text-base font-bold text-text-primary">AI Executive Summary</h4>
                  </div>
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-accent/15 text-accent border border-accent/30 flex items-center gap-1.5">
                    {geminiResult.executionMode === "ai" ? (
                      <><Brain size={13} /> {geminiResult.modelUsed || "AI Analysis"}</>
                    ) : (
                      <><Zap size={13} className="text-warning" /> Rule Engine Fallback</>
                    )}
                  </span>
                </div>

                <p className="text-sm text-text-secondary leading-relaxed">{geminiResult.summary}</p>

                <div className="flex items-center gap-4 text-xs font-semibold pt-1 border-t border-accent/10">
                  <span className="text-text-muted">File Score: <strong className="text-success text-sm font-bold">{geminiResult.score}/100</strong></span>
                  <span className="text-text-muted">Risks: <strong className="text-danger">{geminiResult.risks.length}</strong></span>
                  <span className="text-text-muted">Opportunities: <strong className="text-success">{geminiResult.opportunities.length}</strong></span>
                </div>
              </div>

              {/* Gemini Statistical Insights */}
              {geminiResult.insights.length > 0 && (
                <div className="p-4 rounded-xl border border-border bg-surface/30 space-y-2">
                  <h5 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
                    <Brain size={14} className="text-accent" /> Key File Observations
                  </h5>
                  <ul className="space-y-1.5 text-xs text-text-secondary">
                    {geminiResult.insights.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Gemini Identified Risks */}
              {geminiResult.risks.length > 0 && (
                <div className="p-4 rounded-xl border border-danger/20 bg-danger/5 space-y-2.5">
                  <h5 className="text-xs font-semibold text-danger uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle size={14} /> Detected File Risks ({geminiResult.risks.length})
                  </h5>
                  <div className="space-y-2">
                    {geminiResult.risks.map((risk, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs">
                        <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${risk.severity === "high" ? "bg-danger" : "bg-warning"}`} />
                        <div>
                          <strong className="text-text-primary">{risk.title}:</strong>{" "}
                          <span className="text-text-muted">{risk.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gemini Opportunities */}
              {geminiResult.opportunities.length > 0 && (
                <div className="p-4 rounded-xl border border-success/20 bg-success/5 space-y-2.5">
                  <h5 className="text-xs font-semibold text-success uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp size={14} /> Growth Opportunities ({geminiResult.opportunities.length})
                  </h5>
                  <div className="space-y-2">
                    {geminiResult.opportunities.map((opp, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs">
                        <span className="w-2 h-2 rounded-full mt-1 shrink-0 bg-success" />
                        <div>
                          <strong className="text-text-primary">{opp.title}:</strong>{" "}
                          <span className="text-text-muted">{opp.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gemini Recommendations */}
              {geminiResult.recommendations.length > 0 && (
                <div className="p-4 rounded-xl border border-accent/20 bg-accent-subtle/20 space-y-2.5">
                  <h5 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-accent" /> Actionable Recommendations ({geminiResult.recommendations.length})
                  </h5>
                  <div className="space-y-2">
                    {geminiResult.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs">
                        <span className="w-2 h-2 rounded-full mt-1 shrink-0 bg-accent" />
                        <div>
                          <strong className="text-text-primary">{rec.title}:</strong>{" "}
                          <span className="text-text-muted">{rec.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
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

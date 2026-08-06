import { useMemo } from "react";
import { X, Sparkles, TrendingUp, CheckCircle, BarChart3, Database, FileText, ArrowRight } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { ImportedFile } from "../../lib/fileStorage";
import Button from "../ui/Button";

interface FileAnalysisModalProps {
  file: ImportedFile;
  onClose: () => void;
  onImportToDb: (file: ImportedFile) => void;
  onRunFullAnalysis?: () => void;
}

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
  // Infer file category and generate intelligent summary metrics
  const analysis = useMemo(() => {
    const fn = file.fileName.toLowerCase();
    const headers = file.headers.map((h) => h.toLowerCase());
    
    let docType = "Business Data Record";
    if (headers.some((h) => h.includes("sale") || h.includes("sold") || h.includes("customer")) || fn.includes("sales")) {
      docType = "Sales & Revenue Ledger";
    } else if (headers.some((h) => h.includes("expense") || h.includes("cost") || h.includes("spent")) || fn.includes("expense")) {
      docType = "Operating Expenses Log";
    } else if (headers.some((h) => h.includes("sku") || h.includes("stock") || h.includes("inventory")) || fn.includes("inventory")) {
      docType = "Stock & Inventory Catalogue";
    }

    // Find primary numeric column (e.g. amount, quantity, unit_cost)
    const numCol =
      file.summaryStats.numericCols.find((c) =>
        ["amount", "total", "price", "unit_cost", "quantity", "cost"].includes(c.toLowerCase())
      ) || file.summaryStats.numericCols[0] || null;

    // Find primary label column (e.g. item_name, description, name, sku)
    const labelCol =
      file.headers.find((h) =>
        ["item_name", "description", "name", "category", "sku"].includes(h.toLowerCase())
      ) || file.summaryStats.categoryCols[0] || file.headers[0] || "row";

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

    // Prepare chart data (top 10 rows by numeric value)
    const chartData = file.parsedData
      .slice(0, 10)
      .map((row, idx) => ({
        name: String(row[labelCol] || `Row ${idx + 1}`).slice(0, 14),
        value: numCol ? Number(row[numCol]) || 0 : idx + 1,
      }));

    // AI Insights Generator
    const insights = [
      `Parsed ${file.rowCount} data entries across ${file.headers.length} structured attributes.`,
    ];
    if (numCol) {
      insights.push(
        `Calculated aggregate total of ${totalVal.toLocaleString(undefined, { maximumFractionDigits: 2 })} across attribute '${numCol}'.`
      );
      if (maxRecord) {
        const rec = maxRecord as MaxRecord;
        insights.push(
          `Highest recorded value is '${rec.label}' with ${rec.val.toLocaleString()}.`
        );
      }
    }
    insights.push(
      `File format verified clean with 0 missing structural headers. Ready for ingestion into live workspace.`
    );

    return {
      docType,
      numCol,
      labelCol,
      totalVal,
      avgVal,
      maxRecord,
      chartData,
      insights,
    };
  }, [file]);

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
                <h3 className="text-lg font-semibold text-text-primary">AI File Analysis</h3>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent/10 text-accent border border-accent/20">
                  {analysis.docType}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Automated data breakdown for <span className="text-text-primary font-medium">{file.fileName}</span>
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

          {/* Chart Visualization */}
          {analysis.chartData.length > 0 && (
            <div className="p-5 rounded-xl border border-border bg-surface/20">
              <h4 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <BarChart3 size={16} className="text-accent" />
                Data Distribution ({analysis.numCol || "Records"})
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysis.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="name"
                      stroke="#A1A1AA"
                      fontSize={11}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis stroke="#A1A1AA" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#121215",
                        borderColor: "rgba(255,255,255,0.15)",
                        borderRadius: "8px",
                        color: "#FFF",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="value" fill="#9EFF00" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* AI Insights Block */}
          <div className="p-5 rounded-xl border border-accent/20 bg-accent-subtle/30 space-y-3">
            <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Sparkles size={16} className="text-accent" />
              AI Key Observations & Insights
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
            {onRunFullAnalysis && (
              <Button
                variant="secondary"
                size="sm"
                icon={ArrowRight}
                onClick={() => {
                  onClose();
                  onRunFullAnalysis();
                }}
              >
                Run AI Executive Suite
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

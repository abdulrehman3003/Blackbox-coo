import { useState, useMemo } from "react";
import { X, Search, Table, FileText, BarChart2, Download, Database, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import type { ImportedFile } from "../../lib/fileStorage";
import Button from "../ui/Button";

interface FileViewerModalProps {
  file: ImportedFile;
  onClose: () => void;
  onAnalyze: (file: ImportedFile) => void;
  onImportToDb: (file: ImportedFile) => void;
}

export default function FileViewerModal({
  file,
  onClose,
  onAnalyze,
  onImportToDb,
}: FileViewerModalProps) {
  const [activeTab, setActiveTab] = useState<"table" | "summary" | "raw">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filter rows by search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return file.parsedData;
    const q = searchQuery.toLowerCase();
    return file.parsedData.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? "").toLowerCase().includes(q)
      )
    );
  }, [file.parsedData, searchQuery]);

  // Paginated rows
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleDownload = () => {
    const blob = new Blob([file.rawText], { type: "text/plain;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = file.fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] flex flex-col glass-card border border-border overflow-hidden rounded-2xl shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent/20 flex items-center justify-center shrink-0">
              <FileText size={20} className="text-accent" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-text-primary truncate">{file.fileName}</h3>
                <span className="px-2 py-0.5 text-xs font-medium uppercase rounded-full bg-surface border border-border text-text-secondary">
                  {file.fileType}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                {formatFileSize(file.fileSize)} • {file.rowCount} rows • Uploaded {new Date(file.uploadedAt).toLocaleString()}
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

        {/* Tab Selector */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-border bg-surface/20 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("table")}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === "table"
                  ? "bg-accent-subtle border border-accent/30 text-accent"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              <Table size={14} /> Data Grid ({filteredData.length})
            </button>

            <button
              onClick={() => setActiveTab("summary")}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === "summary"
                  ? "bg-accent-subtle border border-accent/30 text-accent"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              <BarChart2 size={14} /> Column Analysis
            </button>

            <button
              onClick={() => setActiveTab("raw")}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === "raw"
                  ? "bg-accent-subtle border border-accent/30 text-accent"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              <FileText size={14} /> Raw File
            </button>
          </div>

          {activeTab === "table" && (
            <div className="relative w-48 sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Filter records…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-1 text-xs rounded-lg bg-surface border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50"
              />
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "table" && (
            <div className="space-y-4">
              {file.parsedData.length === 0 ? (
                <div className="py-12 text-center text-text-muted">No parsed records found in file.</div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface border-b border-border text-text-secondary uppercase">
                        <tr>
                          <th className="py-2.5 px-3 w-12 font-mono text-center">#</th>
                          {file.headers.map((h) => (
                            <th key={h} className="py-2.5 px-3 font-semibold text-text-primary whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {paginatedData.map((row, idx) => {
                          const rowNum = (currentPage - 1) * pageSize + idx + 1;
                          return (
                            <tr key={idx} className="hover:bg-surface-hover/50 transition-colors">
                              <td className="py-2 px-3 text-text-muted font-mono text-center">{rowNum}</td>
                              {file.headers.map((h) => (
                                <td key={h} className="py-2 px-3 text-text-primary whitespace-nowrap truncate max-w-xs">
                                  {row[h] !== undefined && row[h] !== null ? String(row[h]) : "-"}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between text-xs text-text-secondary pt-2">
                    <div>
                      Showing {filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
                      {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} records
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="p-1 rounded-lg border border-border hover:bg-surface-hover disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="px-2">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="p-1 rounded-lg border border-border hover:bg-surface-hover disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "summary" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-border bg-surface/30">
                  <p className="text-xs text-text-secondary">Total Rows</p>
                  <p className="text-xl font-bold text-text-primary mt-1">{file.rowCount}</p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-surface/30">
                  <p className="text-xs text-text-secondary">Total Columns</p>
                  <p className="text-xl font-bold text-text-primary mt-1">{file.headers.length}</p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-surface/30">
                  <p className="text-xs text-text-secondary">Numeric Columns</p>
                  <p className="text-xl font-bold text-accent mt-1">{file.summaryStats.numericCols.length}</p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-surface/30">
                  <p className="text-xs text-text-secondary">Categorical Columns</p>
                  <p className="text-xl font-bold text-text-primary mt-1">{file.summaryStats.categoryCols.length}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-text-primary mb-3">Column Breakdown</h4>
                <div className="space-y-2">
                  {file.headers.map((header) => {
                    const isNum = file.summaryStats.numericCols.includes(header);
                    const totalSum = file.summaryStats.totalNumericSum[header];
                    const avgVal = file.summaryStats.avgNumericVal[header];
                    return (
                      <div
                        key={header}
                        className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface/20 hover:bg-surface/40 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-0.5 font-mono text-[10px] rounded-md ${
                              isNum ? "bg-accent-subtle text-accent border border-accent/20" : "bg-surface border border-border text-text-muted"
                            }`}
                          >
                            {isNum ? "NUMBER" : "STRING"}
                          </span>
                          <span className="font-medium text-text-primary">{header}</span>
                        </div>

                        {isNum ? (
                          <div className="flex gap-4 text-text-secondary">
                            <span>Sum: <strong className="text-text-primary">{totalSum?.toLocaleString() ?? 0}</strong></span>
                            <span>Avg: <strong className="text-text-primary">{avgVal?.toFixed(2) ?? 0}</strong></span>
                          </div>
                        ) : (
                          <span className="text-text-muted">Text / Descriptor</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "raw" && (
            <div className="rounded-xl border border-border bg-black/80 p-4 font-mono text-xs text-text-secondary overflow-x-auto max-h-[500px]">
              <pre>{file.rawText}</pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-border bg-surface/50 shrink-0">
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={Sparkles}
              onClick={() => {
                onClose();
                onAnalyze(file);
              }}
            >
              AI File Analysis
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Database}
              onClick={() => {
                onClose();
                onImportToDb(file);
              }}
            >
              Import to Database
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" icon={Download} onClick={handleDownload}>
              Download CSV
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

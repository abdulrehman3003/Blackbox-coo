import { useState, useMemo } from "react";
import { X, Eye, Sparkles, Database, ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
import type { ImportedFile } from "../../lib/fileStorage";
import Button from "../ui/Button";

interface FileViewerModalProps {
  file: ImportedFile;
  onClose: () => void;
  onAnalyze: (file: ImportedFile) => void;
  onImportToDb: (file: ImportedFile) => void;
}

const ROWS_PER_PAGE = 15;

export default function FileViewerModal({
  file,
  onClose,
  onAnalyze,
  onImportToDb,
}: FileViewerModalProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(file.parsedData.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages - 1);

  const pageData = useMemo(() => {
    const start = currentPage * ROWS_PER_PAGE;
    return file.parsedData.slice(start, start + ROWS_PER_PAGE);
  }, [file.parsedData, currentPage]);

  const formatCellValue = (val: unknown): string => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "number") {
      if (Number.isInteger(val)) return val.toLocaleString();
      return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return String(val);
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
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={20} className="text-accent" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-text-primary truncate">
                {file.fileName}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                {file.rowCount} rows &middot; {file.headers.length} columns &middot; {(file.fileSize / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors shrink-0"
            aria-label="Close viewer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Column Legend */}
        <div className="px-6 py-2.5 border-b border-border bg-surface/30 shrink-0 flex flex-wrap gap-1.5">
          {file.headers.map((header) => (
            <span
              key={header}
              className="px-2.5 py-0.5 text-[10px] font-medium rounded-md bg-accent/10 text-accent border border-accent/20"
            >
              {header}
            </span>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-0">
          {pageData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-muted">
              <Eye size={32} className="mb-2 opacity-30" />
              <p className="text-sm font-medium">No data rows to display</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface/40 sticky top-0 z-10">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wider border-b border-border whitespace-nowrap w-[50px]">
                    #
                  </th>
                  {file.headers.map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wider border-b border-border whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageData.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-xs text-text-muted font-mono">
                      {currentPage * ROWS_PER_PAGE + rowIdx + 1}
                    </td>
                    {file.headers.map((header) => (
                      <td
                        key={header}
                        className="px-4 py-2.5 text-xs text-text-primary whitespace-nowrap max-w-[240px] truncate"
                        title={formatCellValue(row[header])}
                      >
                        {formatCellValue(row[header])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-surface/30 shrink-0">
          <p className="text-xs text-text-muted">
            Showing {currentPage * ROWS_PER_PAGE + 1}–{Math.min((currentPage + 1) * ROWS_PER_PAGE, file.parsedData.length)} of {file.parsedData.length} rows
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-text-secondary font-medium tabular-nums min-w-[4rem] text-center">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface/50 shrink-0">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Sparkles}
              onClick={() => {
                onClose();
                onAnalyze(file);
              }}
            >
              Analyze Data
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Database}
              onClick={() => {
                onClose();
                onImportToDb(file);
              }}
            >
              Import to Workspace
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
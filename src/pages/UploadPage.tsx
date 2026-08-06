import { UploadCloud, FileType, Shield, CheckCircle2, ArrowRight, Eye, Sparkles, Database, Trash2, Loader2, FileSpreadsheet } from "lucide-react";
import { useState, useEffect, type DragEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/ui/PageHeader";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import {
  type ImportedFile,
  getStoredFiles,
  parseAndSaveFile,
  deleteImportedFile,
  createSampleFile,
} from "../lib/fileStorage";
import FileViewerModal from "../components/files/FileViewerModal";
import FileAnalysisModal from "../components/files/FileAnalysisModal";
import DataImportMappingModal from "../components/files/DataImportMappingModal";

export default function UploadPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const companyId = profile?.company_id ?? "";

  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [files, setFiles] = useState<ImportedFile[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [viewingFile, setViewingFile] = useState<ImportedFile | null>(null);
  const [analyzingFile, setAnalyzingFile] = useState<ImportedFile | null>(null);
  const [mappingFile, setMappingFile] = useState<ImportedFile | null>(null);

  // Load files on mount & company change
  useEffect(() => {
    setFiles(getStoredFiles(companyId));
  }, [companyId]);

  const refreshFiles = () => {
    setFiles(getStoredFiles(companyId));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleProcessFile = async (file: File) => {
    setProcessing(true);
    try {
      const imported = await parseAndSaveFile(file, companyId);
      refreshFiles();
      showToast(`Successfully processed "${imported.fileName}" (${imported.rowCount} rows parsed)`);
    } catch (err) {
      console.error("File processing failed:", err);
      showToast("Error processing file format.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleProcessFile(e.target.files[0]);
      e.target.value = "";
    }
  };

  const handleDelete = (id: string) => {
    deleteImportedFile(id, companyId);
    refreshFiles();
    showToast("File removed from workspace.");
  };

  const handleCreateSample = (type: "sales" | "expenses" | "inventory" | "customers") => {
    const sample = createSampleFile(type, companyId);
    refreshFiles();
    showToast(`Loaded sample file "${sample.fileName}" with ${sample.rowCount} records.`);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Upload & Data Import"
        subtitle="Import CSV, Excel, or JSON files into your workspace for viewing, DB ingestion, and AI analysis"
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-accent-subtle border border-accent/30 text-accent text-xs font-semibold flex items-center justify-between animate-fade-in shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-text-muted hover:text-text-primary">
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard padding="lg">
            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer ${
                dragging
                  ? "border-accent bg-accent/5"
                  : processing
                    ? "border-accent/50 bg-surface animate-pulse"
                    : "border-border hover:border-accent/50 hover:bg-surface-hover"
              }`}
            >
              {processing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={32} className="text-accent animate-spin" />
                  <p className="text-lg font-medium text-text-primary">Parsing File Data…</p>
                  <p className="text-xs text-text-secondary">Reading structures, headers, and computing statistics</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-accent-subtle flex items-center justify-center">
                    <UploadCloud size={28} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-text-primary">Drop your file here</p>
                    <p className="text-xs text-text-secondary mt-1">
                      Supports CSV (.csv), Excel (.xlsx, .xls), JSON (.json), and text files
                    </p>
                  </div>

                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.pdf,.json,.txt"
                    className="hidden"
                    id="file-upload"
                    onChange={handleFileSelect}
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center justify-center h-10 px-4 text-xs gap-2 rounded-xl font-medium transition-all duration-150 ease-out cursor-pointer bg-surface border border-border text-text-primary hover:bg-surface-hover hover:border-border-hover active:scale-[0.97] mt-1"
                  >
                    <UploadCloud size={14} />
                    Choose File to Import
                  </label>
                </div>
              )}
            </div>

            {/* Quick Sample Data Buttons */}
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs font-semibold text-text-secondary uppercase mb-3">
                Or Load Demo Sample Files
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleCreateSample("sales")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface border border-border text-text-primary hover:bg-surface-hover hover:border-accent/30 transition-all cursor-pointer"
                >
                  <FileSpreadsheet size={14} className="text-accent" /> + Sample Sales CSV
                </button>
                <button
                  onClick={() => handleCreateSample("expenses")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface border border-border text-text-primary hover:bg-surface-hover hover:border-accent/30 transition-all cursor-pointer"
                >
                  <FileSpreadsheet size={14} className="text-warning" /> + Sample Expenses CSV
                </button>
                <button
                  onClick={() => handleCreateSample("inventory")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface border border-border text-text-primary hover:bg-surface-hover hover:border-accent/30 transition-all cursor-pointer"
                >
                  <FileSpreadsheet size={14} className="text-success" /> + Sample Inventory CSV
                </button>
                <button
                  onClick={() => handleCreateSample("customers")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface border border-border text-text-primary hover:bg-surface-hover hover:border-accent/30 transition-all cursor-pointer"
                >
                  <FileSpreadsheet size={14} className="text-accent" /> + Sample Customers CSV
                </button>
              </div>
            </div>

            {/* Recent Uploads Section */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <UploadCloud size={16} className="text-accent" />
                  Imported Workspace Files ({files.length})
                </h4>
                {files.length > 0 && (
                  <span className="text-xs text-text-muted">
                    Click 👁️ View to inspect rows or 📊 Analyze for AI insights
                  </span>
                )}
              </div>

              {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-text-muted border border-dashed border-border rounded-xl bg-surface/20">
                  <UploadCloud size={28} className="mb-2 opacity-30" />
                  <p className="text-sm font-medium">No files imported yet</p>
                  <p className="text-xs text-text-muted mt-0.5">Upload a file or click a demo sample file above</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border bg-surface/30 hover:bg-surface/60 transition-all gap-4 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent/20 flex items-center justify-center shrink-0">
                          <FileType size={18} className="text-accent" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-text-primary truncate">{file.fileName}</p>
                            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded-md bg-surface border border-border text-text-secondary">
                              {file.fileType}
                            </span>
                          </div>
                          <p className="text-xs text-text-muted mt-0.5">
                            {formatFileSize(file.fileSize)} • <strong className="text-text-secondary">{file.rowCount} rows</strong> • {new Date(file.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Eye}
                          onClick={() => setViewingFile(file)}
                        >
                          View
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Sparkles}
                          onClick={() => setAnalyzingFile(file)}
                        >
                          Analyze
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Database}
                          onClick={() => setMappingFile(file)}
                        >
                          Import
                        </Button>
                        <button
                          aria-label={`Delete ${file.fileName}`}
                          onClick={() => handleDelete(file.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <GlassCard title="Supported Formats" icon={FileType} padding="md">
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-success shrink-0" />
                CSV (.csv) — Auto parsed
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-success shrink-0" />
                Excel (.xlsx, .xls)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-success shrink-0" />
                JSON (.json) — Array/Object
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-success shrink-0" />
                Text & Reports (.txt, .pdf)
              </li>
            </ul>
          </GlassCard>

          <GlassCard title="Security & Privacy" icon={Shield} padding="md">
            <p className="text-sm text-text-secondary">
              All uploaded files are processed locally within your workspace session. Data imported into live tables is encrypted and protected by Supabase RLS policies.
            </p>
          </GlassCard>

          <Button
            variant="primary"
            className="w-full justify-center"
            icon={ArrowRight}
            onClick={() => navigate("/reports")}
          >
            Go to Executive Reports
          </Button>
        </div>
      </div>

      {/* Modals */}
      {viewingFile && (
        <FileViewerModal
          file={viewingFile}
          onClose={() => setViewingFile(null)}
          onAnalyze={(f) => setAnalyzingFile(f)}
          onImportToDb={(f) => setMappingFile(f)}
        />
      )}

      {analyzingFile && (
        <FileAnalysisModal
          file={analyzingFile}
          onClose={() => setAnalyzingFile(null)}
          onImportToDb={(f) => setMappingFile(f)}
          onRunFullAnalysis={() => navigate("/reports")}
        />
      )}

      {mappingFile && (
        <DataImportMappingModal
          file={mappingFile}
          companyId={companyId}
          onClose={() => setMappingFile(null)}
          onSuccess={(targetTable, count) => {
            showToast(`Successfully imported ${count} records into ${targetTable}!`);
          }}
        />
      )}
    </div>
  );
}
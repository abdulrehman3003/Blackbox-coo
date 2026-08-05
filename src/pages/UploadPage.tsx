import { UploadCloud, FileType, Shield, CheckCircle2, ArrowRight } from "lucide-react";
import { useState, type DragEvent } from "react";
import PageHeader from "../components/ui/PageHeader";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    // In a real app, handle file upload here
    setUploaded(true);
  };

  return (
    <div>
      <PageHeader
        title="Upload Data"
        subtitle="Import CSV, Excel, or PDF files into your workspace"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GlassCard padding="lg">
            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 cursor-pointer ${
                dragging
                  ? "border-accent bg-accent/5"
                  : uploaded
                    ? "border-success bg-success/5"
                    : "border-border hover:border-accent/50 hover:bg-surface-hover"
              }`}
            >
              {uploaded ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-success" />
                  </div>
                  <p className="text-lg font-medium text-text-primary">Upload Complete</p>
                  <p className="text-sm text-text-secondary">Your file has been processed</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setUploaded(false)}
                  >
                    Upload Another
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-accent-subtle flex items-center justify-center">
                    <UploadCloud size={32} className="text-accent" />
                  </div>
                  <p className="text-lg font-medium text-text-primary">
                    Drop your file here
                  </p>
                  <p className="text-sm text-text-secondary max-w-xs mx-auto">
                    or click to browse — supports CSV, XLSX, PDF, and JSON
                  </p>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.pdf,.json"
                    className="hidden"
                    id="file-upload"
                    onChange={() => setUploaded(true)}
                  />
                  <label htmlFor="file-upload" className="inline-flex items-center justify-center h-10 px-4 text-sm gap-2 rounded-xl font-medium transition-all duration-150 ease-out cursor-pointer bg-surface border border-border text-text-primary hover:bg-surface-hover hover:border-border-hover active:scale-[0.97]">
                    <UploadCloud size={16} />
                    Choose File
                  </label>
                </div>
              )}
            </div>

            {/* Recent uploads */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-text-primary mb-3">Recent Uploads</h4>
              <div className="flex flex-col items-center justify-center py-8 text-text-muted">
                <UploadCloud size={24} className="mb-2 opacity-30" />
                <p className="text-sm">No uploads yet — import your first file above</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <GlassCard title="Supported Formats" icon={FileType} padding="md">
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-success shrink-0" />
                CSV (.csv)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-success shrink-0" />
                Excel (.xlsx, .xls)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-success shrink-0" />
                PDF (.pdf)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-success shrink-0" />
                JSON (.json)
              </li>
            </ul>
          </GlassCard>

          <GlassCard title="Security" icon={Shield} padding="md">
            <p className="text-sm text-text-secondary">
              All uploaded files are encrypted at rest and processed in your private workspace. Data never leaves your Supabase project.
            </p>
          </GlassCard>

          <Button variant="primary" className="w-full justify-center" icon={ArrowRight}>
            Learn about data mapping
          </Button>
        </div>
      </div>
    </div>
  );
}
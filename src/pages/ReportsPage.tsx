import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FileText, Sparkles, Download, Play, Trash2, ArrowRight, TrendingUp } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import ExecutiveReportView from "../components/reports/ExecutiveReportView";
import { AnalysisRunner, useAnalysisRunner } from "../components/analysis";
import { getLocalReports } from "../components/analysis/useAnalysisRunner";

interface SavedReport {
  id: string;
  title: string;
  created_at: string;
  summary: Record<string, unknown>;
  health_score?: number;
}

export default function ReportsPage() {
  const { profile } = useAuth();
  const location = useLocation();
  const companyId = profile?.company_id ?? "";

  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SavedReport | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    let dbReports: SavedReport[] = [];
    if (companyId) {
      const { data } = await supabase
        .from("reports")
        .select("id, title, created_at, summary")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      dbReports = (data ?? []) as SavedReport[];
    }

    const local = getLocalReports(companyId) as SavedReport[];
    
    // Combine DB reports and local reports (deduplicate by id)
    const combinedMap = new Map<string, SavedReport>();
    [...dbReports, ...local].forEach((r) => {
      if (!combinedMap.has(r.id)) {
        combinedMap.set(r.id, r);
      }
    });

    const combined = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setReports(combined);
    setLoading(false);
  }, [companyId]);

  const { steps, running, error, report, progress, run, clearReport } = useAnalysisRunner(companyId, loadReports);

  useEffect(() => {
    loadReports();
  }, [companyId, loadReports]);

  // Auto-run AI Executive Suite when navigating from file import / analysis modal
  useEffect(() => {
    if (location.state?.autoRun) {
      window.history.replaceState({}, document.title);
      run();
    }
  }, [location.state, run]);

  const onDelete = async (id: string) => {
    setDeleting(id);
    if (companyId) {
      await supabase.from("reports").delete().eq("id", id);
    }
    // Also remove from local storage
    try {
      const local = getLocalReports(companyId).filter((r: any) => r.id !== id);
      localStorage.setItem(`local_reports_${companyId || "default"}`, JSON.stringify(local));
    } catch {
      // ignore
    }
    setDeleting(null);
    await loadReports();
  };

  const onExport = () => {
    const content = JSON.stringify(selected?.summary ?? reports[0]?.summary ?? {}, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const latest = reports[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports"
        subtitle="Executive summaries and AI-generated business insights"
        actions={
          <div className="flex gap-2">
            {reports.length > 0 && (
              <Button variant="ghost" size="sm" icon={Download} onClick={onExport}>
                Export
              </Button>
            )}
            <Button variant="primary" size="sm" icon={Play} onClick={run} disabled={running}>
              {running ? "Analyzing…" : "New Analysis"}
            </Button>
          </div>
        }
      />

      {/* ── Live Analysis Runner Modal Overlay ── */}
      {running && (
        <AnalysisRunner
          steps={steps}
          progress={progress}
          running={running}
          error={error}
          onClose={() => {
            clearReport();
            loadReports();
          }}
        />
      )}

      {error && (
        <div className="glass-card p-4 border border-danger/30 bg-danger/5 text-danger text-sm">
          {error}
        </div>
      )}

      {/* Fresh generated report preview */}
      {report && (
        <section className="glass-card p-5 border border-accent/30 bg-accent-subtle/20 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Sparkles size={16} className="text-accent" />
              Newly Generated Report
            </h3>
            <Button variant="ghost" size="sm" onClick={clearReport}>
              Dismiss
            </Button>
          </div>
          <ExecutiveReportView report={report} onClose={clearReport} />
        </section>
      )}

      {/* Latest saved report preview */}
      {!report && latest && (
        <section className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <TrendingUp size={16} className="text-accent" />
              Latest Report
            </h3>
            <span className="text-xs text-text-muted">{new Date(latest.created_at).toLocaleString()}</span>
          </div>
          <ExecutiveReportView report={latest.summary as never} onClose={() => {}} />
          <div className="flex gap-2 mt-4">
            <Button variant="secondary" size="sm" icon={ArrowRight} onClick={() => setSelected(latest)}>
              Open Full Report
            </Button>
          </div>
        </section>
      )}

      {/* Report history */}
      <section className="glass-card p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <FileText size={16} className="text-accent" />
          Report History ({reports.length})
        </h3>

        {loading ? (
          <div className="space-y-3 py-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-surface animate-pulse" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <FileText size={32} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No reports generated yet</p>
            <p className="text-xs mt-1">
              Run your first AI analysis to generate an executive report
            </p>
            <div className="mt-4">
              <Button variant="primary" size="sm" icon={Sparkles} onClick={run} disabled={running}>
                Run AI Analysis
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-accent/30 hover:bg-surface-hover/40 transition-all cursor-pointer group"
                onClick={() => setSelected(r)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{r.title}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-accent hidden sm:flex items-center gap-1">
                    View <ArrowRight size={12} />
                  </span>
                  <button
                    aria-label={`Delete report ${r.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(r.id);
                    }}
                    disabled={deleting === r.id}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Full report modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto bg-black/60 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-4xl my-8 glass-card p-6 sm:p-8 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{selected.title}</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  {new Date(selected.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" icon={Download} onClick={onExport}>
                  Export
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
            </div>
            <ExecutiveReportView report={selected.summary as never} onClose={() => setSelected(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
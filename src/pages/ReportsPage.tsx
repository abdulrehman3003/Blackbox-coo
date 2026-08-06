/**
 * Reports Page — AI-powered executive reports with history, comparison, and export.
 *
 * Shows:
 *   - Freshly generated reports (from the analysis runner)
 *   - Historical AI reports (from ai_reports table)
 *   - Regular saved reports (from reports table)
 *   - PDF/print export
 *   - Report comparison side-by-side
 */

import { useCallback, useEffect, useState } from "react";
import {
  FileText,
  Sparkles,
  Play,
  Trash2,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Brain,
  Clock,
  Printer,
  Layers,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import ExecutiveReportView from "../components/reports/ExecutiveReportView";
import { AnalysisRunner, useAnalysisRunner } from "../components/analysis";
import { getLocalReports } from "../components/analysis/useAnalysisRunner";

/* ─── Types ─── */

interface SavedReport {
  id: string;
  title: string;
  created_at: string;
  summary: Record<string, unknown>;
  health_score?: number;
  type?: "regular" | "ai";
  execution_mode?: string;
  total_execution_time_ms?: number;
}

/* ─── Helpers ─── */

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-danger";
}

function getScoreBg(score: number): string {
  if (score >= 70) return "bg-success/10";
  if (score >= 40) return "bg-warning/10";
  return "bg-danger/10";
}

/* ─── Print-friendly PDF export ─── */

function exportAsPDF(summary: Record<string, unknown>, title: string) {
  const data = summary as Record<string, unknown>;
  const healthScore = (data as any)?.businessScore ?? (data as any)?.score ?? 0;
  const summaryText = (data as any)?.summary ?? "";
  const risks = (data as any)?.topRisks ?? (data as any)?.risks ?? [];
  const opportunities = (data as any)?.topOpportunities ?? (data as any)?.opportunities ?? [];
  const tasks = (data as any)?.priorityTasks ?? (data as any)?.recommendations ?? [];

  const printWin = window.open("", "_blank");
  if (!printWin) return;

  printWin.document.write(`<!DOCTYPE html>
<html><head><title>${title}</title>
<style>
  @page { margin: 20mm; }
  body { font-family: Inter, sans-serif; color: #1a1a2e; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
  h1 { font-size: 24px; border-bottom: 3px solid #9EFF00; padding-bottom: 8px; }
  h2 { font-size: 18px; margin-top: 24px; color: #333; }
  .score { font-size: 48px; font-weight: bold; text-align: center; padding: 20px; }
  .score-70 { color: #22C55E; } .score-40 { color: #F59E0B; } .score-low { color: #EF4444; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
  .badge-high { background: #FEE2E2; color: #DC2626; } .badge-medium { background: #FEF3C7; color: #D97706; } .badge-low { background: #F3F4F6; color: #6B7280; }
  .card { border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; margin-bottom: 8px; }
  .summary { font-size: 14px; color: #4B5563; padding: 12px; background: #F9FAFB; border-radius: 8px; }
  .meta { font-size: 12px; color: #9CA3AF; margin-top: 20px; border-top: 1px solid #E5E7EB; padding-top: 8px; }
</style></head><body>
<h1>${title}</h1>
<div class="meta">Generated: ${new Date().toLocaleString()}</div>
<div class="score ${healthScore >= 70 ? 'score-70' : healthScore >= 40 ? 'score-40' : 'score-low'}">
  ${healthScore}/100<div style="font-size:14px;color:#6B7280;font-weight:normal;">Business Health Score</div>
</div>
${summaryText ? `<div class="summary">${summaryText}</div>` : ""}
${risks.length > 0 ? `<h2>Risks (${risks.length})</h2>${risks.slice(0, 5).map((r: any) => `<div class="card"><strong>${r.title}</strong><span class="badge badge-${r.severity === 'high' ? 'high' : r.severity === 'medium' ? 'medium' : 'low'}">${r.severity}</span><p style="margin:4px 0 0;font-size:13px;color:#6B7280;">${r.detail || ""}</p></div>`).join("")}` : ""}
${opportunities.length > 0 ? `<h2>Opportunities (${opportunities.length})</h2>${opportunities.slice(0, 5).map((o: any) => `<div class="card"><strong>${o.title}</strong><span class="badge badge-${o.impact === 'high' ? 'high' : 'medium'}">${o.impact}</span><p style="margin:4px 0 0;font-size:13px;color:#6B7280;">${o.detail || ""}</p></div>`).join("")}` : ""}
${tasks.length > 0 ? `<h2>Recommended Actions (${tasks.length})</h2>${tasks.slice(0, 8).map((t: any) => `<div class="card"><strong>${t.title}</strong><span class="badge badge-${t.priority === 'urgent' || t.priority === 'high' ? 'high' : 'medium'}">${t.priority || "medium"}</span>${t.category ? `<span style="font-size:12px;color:#9CA3AF;"> &mdash; ${t.category}</span>` : ""}${t.description ? `<p style="margin:4px 0 0;font-size:13px;color:#6B7280;">${t.description}</p>` : ""}</div>`).join("")}` : ""}
<div class="meta">Powered by BlackBox COO &mdash; AI-Powered Business Analysis</div>
<script>window.onload=function(){window.print();window.close()}</script>
</body></html>`);
  printWin.document.close();
}

/* ─── Main Component ─── */

export default function ReportsPage() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? "";

  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SavedReport | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const loadReports = useCallback(async () => {
    let dbReports: SavedReport[] = [];
    let aiReports: SavedReport[] = [];

    if (companyId) {
      const { data: regData } = await supabase
        .from("reports")
        .select("id, title, created_at, summary")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      dbReports = ((regData ?? []) as SavedReport[]).map((r) => ({ ...r, type: "regular" }));

      const { data: aiData } = await supabase
        .from("ai_reports")
        .select("id, created_at, business_health_score, summary, execution_mode, total_execution_time_ms")
        .eq("company_id", companyId)
        .eq("status", "completed")
        .order("created_at", { ascending: false });
      aiReports = ((aiData ?? []) as any[]).map((r) => ({
        id: r.id,
        title: `AI Report &mdash; ${new Date(r.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
        created_at: r.created_at,
        summary: { businessScore: r.business_health_score, summary: r.summary, executionMode: r.execution_mode, totalTime: r.total_execution_time_ms, ...r } as never,
        health_score: r.business_health_score,
        type: "ai" as const,
        execution_mode: r.execution_mode,
        total_execution_time_ms: r.total_execution_time_ms,
      }));
    }

    const local = getLocalReports(companyId) as SavedReport[];
    const combinedMap = new Map<string, SavedReport>();
    [...dbReports, ...aiReports, ...local].forEach((r) => {
      if (!combinedMap.has(r.id)) combinedMap.set(r.id, r);
    });

    setReports(Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ));
    setLoading(false);
  }, [companyId]);

  const { steps, running, error, report, progress, run, clearReport } = useAnalysisRunner(companyId, loadReports);

  useEffect(() => { loadReports(); }, [companyId, loadReports]);

  const onDelete = async (id: string) => {
    setDeleting(id);
    if (companyId) {
      await supabase.from("reports").delete().eq("id", id);
      await supabase.from("ai_reports").delete().eq("id", id);
    }
    try {
      const local = getLocalReports(companyId).filter((r: any) => r.id !== id);
      localStorage.setItem(`local_reports_${companyId || "default"}`, JSON.stringify(local));
    } catch { /* ignore */ }
    setDeleting(null);
    await loadReports();
  };

  const onExport = () => { if (selected) exportAsPDF(selected.summary, selected.title); };
  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]
    );
  };

  const latest = reports[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports"
        subtitle="Executive summaries and AI-generated business insights"
        actions={
          <div className="flex gap-2">
            {reports.length > 1 && (
              <Button variant="ghost" size="sm" icon={Layers} onClick={() => setCompareMode(!compareMode)}>
                {compareMode ? "Exit Compare" : "Compare"}
              </Button>
            )}
            {selected && (
              <Button variant="ghost" size="sm" icon={Printer} onClick={onExport}>PDF</Button>
            )}
            <Button variant="primary" size="sm" icon={Play} onClick={run} disabled={running}>
              {running ? "Analyzing&hellip;" : "New Analysis"}
            </Button>
          </div>
        }
      />

      {running && (
        <AnalysisRunner steps={steps} progress={progress} running={running} error={error}
          onClose={() => { clearReport(); loadReports(); }} />
      )}

      {error && (
        <div className="glass-card p-4 border border-danger/30 bg-danger/5 text-danger text-sm">{error}</div>
      )}

      {report && (
        <section className="glass-card p-5 border border-accent/30 bg-accent-subtle/20 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Sparkles size={16} className="text-accent" /> Newly Generated Report
            </h3>
            <Button variant="ghost" size="sm" onClick={clearReport}>Dismiss</Button>
          </div>
          <ExecutiveReportView report={report} onClose={clearReport} />
        </section>
      )}

      {!report && latest && (
        <section className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <TrendingUp size={16} className="text-accent" /> Latest Report
            </h3>
            <div className="flex items-center gap-2">
              {latest.type === "ai" && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  latest.execution_mode === "ai" ? "text-accent bg-accent/10" : "text-warning bg-warning/10"
                }`}>{latest.execution_mode}</span>
              )}
              <span className="text-xs text-text-muted">{new Date(latest.created_at).toLocaleString()}</span>
            </div>
          </div>
          <ExecutiveReportView report={latest.summary as never} onClose={() => {}} />
          <div className="flex gap-2 mt-4">
            <Button variant="secondary" size="sm" icon={ArrowRight} onClick={() => setSelected(latest)}>Open Full Report</Button>
            <Button variant="ghost" size="sm" icon={Printer} onClick={() => exportAsPDF(latest.summary, latest.title)}>PDF</Button>
          </div>
        </section>
      )}

      <section className="glass-card p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <FileText size={16} className="text-accent" /> Report History ({reports.length})
        </h3>

        {loading ? (
          <div className="space-y-3 py-8">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-surface animate-pulse" />)}
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <FileText size={32} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No reports generated yet</p>
            <p className="text-xs mt-1">Run your first AI analysis to generate an executive report</p>
            <div className="mt-4">
              <Button variant="primary" size="sm" icon={Sparkles} onClick={run} disabled={running}>Run AI Analysis</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => {
              const healthScore = r.health_score ?? (r.summary as any)?.businessScore ?? 0;
              const showCheckbox = compareMode && selected?.id !== r.id;
              const isCompared = compareIds.includes(r.id);

              return (
                <div key={r.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group ${
                    isCompared ? "border-accent bg-accent-subtle/20" : compareMode ? "border-border hover:border-accent/30" : "border-border hover:border-accent/30 hover:bg-surface-hover/40"
                  }`}
                  onClick={() => !compareMode && setSelected(r)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {showCheckbox && (
                      <input type="checkbox" checked={isCompared} onChange={() => toggleCompare(r.id)}
                        className="w-4 h-4 rounded border-border accent-accent cursor-pointer" />
                    )}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${getScoreBg(healthScore)}`}>
                      {r.type === "ai" ? <BarChart3 size={16} className={getScoreColor(healthScore)} /> : <FileText size={16} className="text-accent" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate flex items-center gap-2">
                        {r.title}
                        {r.type === "ai" && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            r.execution_mode === "ai" ? "text-accent bg-accent/10" : "text-warning bg-warning/10"
                          }`}>{r.execution_mode}</span>
                        )}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5 flex items-center gap-2">
                        {new Date(r.created_at).toLocaleString()}
                        {healthScore > 0 && <span className={`font-medium ${getScoreColor(healthScore)}`}>{healthScore}/100</span>}
                        {r.total_execution_time_ms && (
                          <span className="flex items-center gap-0.5"><Clock size={10} />{formatDuration(r.total_execution_time_ms)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!compareMode && (
                      <>
                        <span className="text-xs text-accent hidden sm:flex items-center gap-1">View <ArrowRight size={12} /></span>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(r.id); }}
                          disabled={deleting === r.id}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer disabled:opacity-50"
                          aria-label="Delete"><Trash2 size={15} /></button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Compare */}
      {compareIds.length === 2 && compareMode && (
        <section className="animate-slide-up">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Layers size={16} className="text-accent" /> Comparing Reports
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {compareIds.map((id) => {
              const r = reports.find((rep) => rep.id === id);
              if (!r) return null;
              const hs = r.health_score ?? (r.summary as any)?.businessScore ?? 0;
              return (
                <div key={id} className="glass-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{r.title}</p>
                      <p className="text-xs text-text-muted">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <span className={`text-lg font-bold ${getScoreColor(hs)}`}>{hs}</span>
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-3 mb-3">{(r.summary as any)?.summary || "No summary"}</p>
                  <div className="flex items-center gap-2 text-[11px] text-text-muted">
                    <Brain size={10} /><span>Mode: {r.execution_mode || "N/A"}</span>
                    <Clock size={10} /><span>{formatDuration(r.total_execution_time_ms || 0)}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="mt-3" onClick={() => setSelected(r)} icon={ArrowRight}>View Report</Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Full report modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto bg-black/60 backdrop-blur-sm"
          onClick={() => { setSelected(null); setCompareMode(false); setCompareIds([]); }}>
          <div className="w-full max-w-4xl my-8 glass-card p-6 sm:p-8 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{selected.title}</h2>
                <p className="text-xs text-text-muted mt-0.5">{new Date(selected.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" icon={Printer} onClick={onExport}>PDF</Button>
                <Button variant="secondary" size="sm" onClick={() => { setSelected(null); setCompareMode(false); }}>Close</Button>
              </div>
            </div>
            <ExecutiveReportView report={selected.summary as never} onClose={() => setSelected(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
/**
 * ReportsPage — Executive & Historical Business Reports View
 */

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Sparkles,
  Clock,
  Layers,
  ArrowRight,
  Trash2,
  BarChart3,
  RefreshCw,
  Search,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useAnalysisRunner, getLocalReports } from "../components/analysis/useAnalysisRunner";
import ExecutiveReportView, { createFallbackExecutiveReport } from "../components/reports/ExecutiveReportView";
import Button from "../components/ui/Button";

export interface SavedReport {
  id: string;
  company_id: string;
  created_at: string;
  title: string;
  type: "ai" | "manual";
  health_score?: number;
  summary: any;
  execution_mode?: "ai" | "fallback";
  total_execution_time_ms?: number;
}

/** Safe date formatter to prevent RangeError: Invalid time value crashes */
function formatReportDate(dateVal: any): string {
  if (!dateVal) return new Date().toLocaleDateString();
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return new Date().toLocaleDateString();
    return d.toLocaleString();
  } catch {
    return new Date().toLocaleDateString();
  }
}

/**
 * Reconstructs a full ExecutiveReport object from database columns if summary is a string
 */
function buildExecutiveReportFromDbRow(r: any): any {
  if (!r) return createFallbackExecutiveReport();

  // If r.summary is stringified JSON, parse it first
  if (typeof r.summary === "string" && r.summary.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(r.summary.trim());
      if (typeof parsed === "object" && parsed !== null && (parsed.revenueSummary || parsed.businessScore || parsed.summary)) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  // If summary is already an object with revenue/score details
  if (typeof r.summary === "object" && r.summary !== null && (r.summary.revenueSummary || r.summary.businessScore)) {
    return r.summary;
  }

  const fin = r.finance_result || {};
  const sal = r.sales_result || {};
  const inv = r.inventory_result || {};
  const mkt = r.marketing_result || {};
  const ceo = r.ceo_result || {};

  const fallback = createFallbackExecutiveReport(typeof r.summary === "string" ? r.summary : undefined);

  return {
    businessScore: r.ceo_score ?? r.business_health_score ?? r.health_score ?? fallback.businessScore,
    summary: typeof r.summary === "string" ? r.summary : ceo.summary || fallback.summary,
    topRisks: ceo.risks || fallback.topRisks,
    topOpportunities: ceo.opportunities || fallback.topOpportunities,
    priorityTasks: ceo.recommendations?.map((rec: any) => typeof rec === "string" ? { title: rec, priority: "high", category: "Action" } : rec) || fallback.priorityTasks,
    revenueSummary: fin.revenueSummary || fin.revenueTrend || fallback.revenueSummary,
    expenseSummary: fin.expenseSummary || fin.topExpenseCategories || fallback.expenseSummary,
    salesAnalysis: {
      topCustomers: sal.topCustomers || fallback.salesAnalysis.topCustomers,
      atRiskCustomers: sal.atRiskCustomers || fallback.salesAnalysis.atRiskCustomers,
      upsellRecommendations: sal.upsellRecommendations || sal.recommendations || fallback.salesAnalysis.upsellRecommendations,
      totalSales: sal.totalSales ?? fallback.salesAnalysis.totalSales,
      salesGrowth: sal.salesGrowth ?? fallback.salesAnalysis.salesGrowth,
    },
    inventoryHealth: {
      lowStock: inv.lowStock || fallback.inventoryHealth.lowStock,
      shortages: inv.shortages || fallback.inventoryHealth.shortages,
      totalItems: inv.totalItems ?? fallback.inventoryHealth.totalItems,
      stockHealth: inv.stockHealth ?? fallback.inventoryHealth.stockHealth,
    },
    marketingRecommendations: {
      recommendations: mkt.recommendations || fallback.marketingRecommendations.recommendations,
      promotionIdeas: mkt.promotionIdeas || mkt.promotions || fallback.marketingRecommendations.promotionIdeas,
      campaignSuggestions: mkt.campaignSuggestions || mkt.campaigns || fallback.marketingRecommendations.campaignSuggestions,
    },
    warnings: r.warnings || fallback.warnings,
    generatedAt: r.created_at || new Date().toISOString(),
    periodStart: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    periodEnd: new Date().toISOString().slice(0, 10),
  };
}

export default function ReportsPage() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? "";

  const { run, running } = useAnalysisRunner(companyId);

  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SavedReport | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // Load Reports safely from DB + Local Storage
  const loadReports = useCallback(async () => {
    setLoading(true);
    let dbReports: SavedReport[] = [];
    try {
      if (companyId) {
        const { data } = await supabase
          .from("ai_reports")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(30);

        if (data) {
          dbReports = data.map((r: any) => ({
            id: r.id || `db-${Math.random()}`,
            company_id: r.company_id || companyId,
            created_at: r.created_at || new Date().toISOString(),
            title: r.title || `Executive COO Analysis — ${formatReportDate(r.created_at)}`,
            type: "ai",
            health_score: r.ceo_score ?? r.business_health_score ?? r.health_score ?? 85,
            summary: buildExecutiveReportFromDbRow(r),
            execution_mode: r.execution_mode ?? "ai",
            total_execution_time_ms: r.total_execution_time_ms ?? 0,
          }));
        }
      }
    } catch {
      // non-fatal
    }

    const local = (getLocalReports(companyId) as any[]).map((r) => ({
      ...r,
      summary: buildExecutiveReportFromDbRow(r),
    }));

    const map = new Map<string, SavedReport>();
    [...dbReports, ...local].forEach((r) => {
      if (r && r.id && !map.has(r.id)) map.set(r.id, r);
    });

    const combined = Array.from(map.values()).sort((a, b) => {
      const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
    });

    setReports(combined);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Handle Delete
  const onDelete = async (id: string) => {
    setDeleting(id);
    try {
      await supabase.from("ai_reports").delete().eq("id", id);
    } catch {
      // ignore DB failure
    }
    const updated = reports.filter((r) => r.id !== id);
    setReports(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(`local_ai_reports_${companyId}`, JSON.stringify(updated));
    }
    if (selected?.id === id) setSelected(null);
    setDeleting(null);
  };

  // Compare Toggle
  const toggleCompare = (id: string) => {
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter((i) => i !== id));
    } else {
      if (compareIds.length >= 2) setCompareIds([compareIds[1], id]);
      else setCompareIds([...compareIds, id]);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-accent";
    if (score >= 40) return "text-warning";
    return "text-danger";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-success/10";
    if (score >= 60) return "bg-accent/10";
    if (score >= 40) return "bg-warning/10";
    return "bg-danger/10";
  };

  const formatDuration = (ms: number) => {
    if (!ms) return "0s";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const latest = reports[0];
  const filteredReports = reports.filter((r) =>
    (r.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <FileText size={22} className="text-accent" />
            Executive Reports Hub
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Full multi-agent synthesized executive reports & business health audits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={loadReports}
          >
            Refresh
          </Button>

          {reports.length >= 2 && (
            <Button
              variant={compareMode ? "primary" : "secondary"}
              size="sm"
              icon={Layers}
              onClick={() => {
                setCompareMode(!compareMode);
                setCompareIds([]);
              }}
            >
              {compareMode ? "Exit Compare" : "Compare Reports"}
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            icon={Sparkles}
            loading={running}
            onClick={async () => {
              await run();
              await loadReports();
            }}
          >
            {running ? "Synthesizing AI Audit…" : "Run Complete AI Analysis"}
          </Button>
        </div>
      </div>

      {/* Latest Report Feature Banner */}
      {latest && (
        <section className="glass-card p-6 space-y-4 border border-accent/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-accent" />
              <h2 className="text-sm font-semibold text-text-primary">Latest Executive Audit</h2>
            </div>
            <div className="flex items-center gap-2">
              {latest.execution_mode && (
                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${
                  latest.execution_mode === "ai" ? "text-accent bg-accent/10" : "text-warning bg-warning/10"
                }`}>
                  {latest.execution_mode === "ai" ? "AI Analysis" : "Rule Fallback"}
                </span>
              )}
              <span className="text-xs text-text-muted">{formatReportDate(latest.created_at)}</span>
            </div>
          </div>

          <ExecutiveReportView report={latest.summary} />

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" size="sm" icon={ArrowRight} onClick={() => setSelected(latest)}>
              Open Full Details
            </Button>
          </div>
        </section>
      )}

      {/* Report History List */}
      <section className="glass-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <BarChart3 size={16} className="text-accent" />
            Report History ({reports.length})
          </h3>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-text-muted" />
            <input
              type="text"
              placeholder="Search reports…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 py-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-surface animate-pulse" />
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted border border-dashed border-border rounded-xl">
            <FileText size={32} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No executive reports found</p>
            <p className="text-xs mt-1">Run your first AI analysis to generate executive insights</p>
            <Button variant="primary" size="sm" icon={Sparkles} className="mt-4" onClick={run} loading={running}>
              Run AI Analysis
            </Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredReports.map((r) => {
              const healthScore = r.health_score ?? 85;
              const showCheckbox = compareMode;
              const isCompared = compareIds.includes(r.id);

              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group ${
                    isCompared
                      ? "border-accent bg-accent-subtle/20"
                      : compareMode
                      ? "border-border hover:border-accent/30"
                      : "border-border hover:border-accent/30 hover:bg-surface-hover/40"
                  }`}
                  onClick={() => (!compareMode ? setSelected(r) : toggleCompare(r.id))}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {showCheckbox && (
                      <input
                        type="checkbox"
                        checked={isCompared}
                        onChange={() => toggleCompare(r.id)}
                        className="w-4 h-4 rounded border-border accent-accent cursor-pointer"
                      />
                    )}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${getScoreBg(healthScore)}`}>
                      <BarChart3 size={16} className={getScoreColor(healthScore)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate flex items-center gap-2">
                        {r.title}
                        {r.execution_mode && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            r.execution_mode === "ai" ? "text-accent bg-accent/10" : "text-warning bg-warning/10"
                          }`}>
                            {r.execution_mode}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5 flex items-center gap-3">
                        <span>{formatReportDate(r.created_at)}</span>
                        <span className={`font-medium ${getScoreColor(healthScore)}`}>{healthScore}/100</span>
                        {r.total_execution_time_ms ? (
                          <span className="flex items-center gap-0.5">
                            <Clock size={10} />
                            {formatDuration(r.total_execution_time_ms)}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!compareMode && (
                      <>
                        <span className="text-xs text-accent hidden sm:flex items-center gap-1 font-medium">
                          View <ArrowRight size={12} />
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(r.id);
                          }}
                          disabled={deleting === r.id}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer disabled:opacity-50"
                          aria-label="Delete report"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Compare Side-by-Side View */}
      {compareIds.length === 2 && compareMode && (
        <section className="animate-slide-up space-y-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Layers size={16} className="text-accent" /> Side-by-Side Comparison
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {compareIds.map((id) => {
              const r = reports.find((rep) => rep.id === id);
              if (!r) return null;
              const hs = r.health_score ?? 85;
              return (
                <div key={id} className="glass-card p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{r.title}</p>
                      <p className="text-xs text-text-muted">{formatReportDate(r.created_at)}</p>
                    </div>
                    <span className={`text-xl font-bold ${getScoreColor(hs)}`}>{hs}/100</span>
                  </div>

                  <ExecutiveReportView report={r.summary} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Full Report Modal Overlay */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto bg-black/60 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-4xl my-8 glass-card p-6 sm:p-8 animate-slide-up space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{selected.title}</h2>
                <p className="text-xs text-text-muted mt-0.5">{formatReportDate(selected.created_at)}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>

            <ExecutiveReportView report={selected.summary} />
          </div>
        </div>
      )}
    </div>
  );
}
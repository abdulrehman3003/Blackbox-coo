/**
 * AgentDashboardPage — per-agent detailed view of historical analysis
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Brain,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Zap,
  Sparkles,
  Download,
  BarChart3,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { AGENT_VISUALS } from "../components/ai/AgentCard";
import type { AgentName, AIReportRecord, AgentOutput } from "../lib/ai/types";

const AGENT_LABELS: Record<AgentName, string> = {
  finance: "Finance Agent",
  sales: "Sales Agent",
  inventory: "Inventory Agent",
  marketing: "Marketing Agent",
  operations: "Operations Agent",
  ceo: "CEO Agent",
};

const AGENT_DESCRIPTIONS: Record<AgentName, string> = {
  finance: "Analyzes revenue, expenses, profit, margins, cash flow, and forecasts",
  sales: "Analyzes customers, revenue, products, retention, churn, and upsell opportunities",
  inventory: "Analyzes stock levels, turnover, low stock, shortages, and reorder needs",
  marketing: "Generates campaign ideas, promotions, growth opportunities, and audience insights",
  operations: "Analyzes workflows, priorities, and efficiency improvements",
  ceo: "Synthesizes all agent results into an executive report",
};

export default function AgentDashboardPage() {
  const { agentName } = useParams<{ agentName: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? "";

  const name = (agentName as AgentName) || "ceo";
  const visual = AGENT_VISUALS[name];

  const [reports, setReports] = useState<AIReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<AIReportRecord | null>(null);

  useEffect(() => {
    if (!companyId || !name) return;

    async function load() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("ai_reports")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(20);

        setReports((data ?? []) as AIReportRecord[]);
        if (data && data.length > 0) setSelectedReport(data[0] as AIReportRecord);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [companyId, name]);

  const getAgentOutput = (report: AIReportRecord): AgentOutput | null => {
    const key = `${name}_result` as keyof AIReportRecord;
    return (report[key] as AgentOutput | null) ?? null;
  };

  const getAgentConfidence = (report: AIReportRecord): number | null => {
    const key = `${name}_confidence` as keyof AIReportRecord;
    return (report[key] as number | null) ?? null;
  };

  const getAgentTime = (report: AIReportRecord): number | null => {
    const key = `${name}_execution_time_ms` as keyof AIReportRecord;
    return (report[key] as number | null) ?? null;
  };

  const getAgentMode = (report: AIReportRecord): string => {
    return report.execution_mode ?? "unknown";
  };

  const exportReport = () => {
    if (!selectedReport) return;
    const content = JSON.stringify(getAgentOutput(selectedReport), null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}-report-${new Date(selectedReport.created_at).toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const output = selectedReport ? getAgentOutput(selectedReport) : null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate("/command-center")}
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} />
        Back to Command Center
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{visual?.emoji ?? "🎯"}</span>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">{AGENT_LABELS[name]}</h1>
            <p className="text-xs text-text-muted">{AGENT_DESCRIPTIONS[name]}</p>
          </div>
        </div>

        {output && (
          <button
            onClick={exportReport}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs text-text-secondary hover:text-text-primary hover:border-border-hover transition-all cursor-pointer"
          >
            <Download size={14} />
            Export
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-surface animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-text-muted">
          <BarChart3 size={40} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">No analysis history</p>
          <p className="text-xs mt-1">Run a full analysis from the Command Center to see results here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* History list */}
          <div className="lg:col-span-1 space-y-2">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Run History ({reports.length})
            </h2>
            {reports.map((r) => {
              const agentOutput = getAgentOutput(r);
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedReport(r)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedReport?.id === r.id
                      ? "border-accent bg-accent-subtle/30"
                      : "border-border bg-surface hover:border-border-hover"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-muted">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface-active text-text-muted">
                      {r.execution_mode}
                    </span>
                  </div>
                  {agentOutput && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`font-medium ${
                        agentOutput.score >= 70 ? "text-success" :
                        agentOutput.score >= 40 ? "text-warning" : "text-danger"
                      }`}>
                        {agentOutput.score}/100
                      </span>
                      <span className="text-text-muted">{getAgentTime(r)}ms</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Detail view */}
          <div className="lg:col-span-2 space-y-4">
            {selectedReport && output ? (
              <>
                {/* Score cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="glass-panel p-3">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Score</p>
                    <p className={`text-xl font-bold mt-0.5 ${
                      output.score >= 70 ? "text-success" :
                      output.score >= 40 ? "text-warning" : "text-danger"
                    }`}>
                      {output.score}/100
                    </p>
                  </div>
                  <div className="glass-panel p-3">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Confidence</p>
                    <p className="text-xl font-bold mt-0.5 text-accent flex items-center gap-1">
                      <Brain size={16} />
                      {getAgentConfidence(selectedReport) ?? output.confidence}%
                    </p>
                  </div>
                  <div className="glass-panel p-3">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Time</p>
                    <p className="text-xl font-bold mt-0.5 text-text-primary flex items-center gap-1">
                      <Clock size={16} className="text-text-muted" />
                      {getAgentTime(selectedReport) ?? 0}ms
                    </p>
                  </div>
                  <div className="glass-panel p-3">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Mode</p>
                    <p className="text-xl font-bold mt-0.5 flex items-center gap-1">
                      {getAgentMode(selectedReport) === "ai" ? (
                        <><Sparkles size={16} className="text-accent" /> AI</>
                      ) : (
                        <><Zap size={16} className="text-warning" /> Fallback</>
                      )}
                    </p>
                  </div>
                </div>

                {/* Summary */}
                <div className="glass-panel p-4">
                  <h3 className="text-sm font-semibold text-text-primary mb-2">Summary</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{output.summary}</p>
                </div>

                {/* Risks */}
                {output.risks.length > 0 && (
                  <div className="glass-panel p-4">
                    <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                      <AlertCircle size={14} className="text-danger" />
                      Risks ({output.risks.length})
                    </h3>
                    <div className="space-y-2">
                      {output.risks.map((risk, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-danger/5 border border-danger/15">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                            risk.severity === "high" ? "bg-danger" :
                            risk.severity === "medium" ? "bg-warning" : "bg-warning/50"
                          }`} />
                          <div>
                            <p className="text-sm font-medium text-text-primary">{risk.title}</p>
                            <p className="text-xs text-text-muted mt-0.5">{risk.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Opportunities */}
                {output.opportunities.length > 0 && (
                  <div className="glass-panel p-4">
                    <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                      <TrendingUp size={14} className="text-success" />
                      Opportunities ({output.opportunities.length})
                    </h3>
                    <div className="space-y-2">
                      {output.opportunities.map((opp, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-success/5 border border-success/15">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                            opp.impact === "high" ? "bg-success" :
                            opp.impact === "medium" ? "bg-accent" : "bg-accent/50"
                          }`} />
                          <div>
                            <p className="text-sm font-medium text-text-primary">{opp.title}</p>
                            <p className="text-xs text-text-muted mt-0.5">{opp.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {output.recommendations.length > 0 && (
                  <div className="glass-panel p-4">
                    <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-accent" />
                      Recommendations ({output.recommendations.length})
                    </h3>
                    <div className="space-y-2">
                      {output.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-accent-subtle/30 border border-accent/10">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                            rec.priority === "urgent" ? "bg-danger" :
                            rec.priority === "high" ? "bg-warning" :
                            rec.priority === "medium" ? "bg-accent" : "bg-text-muted"
                          }`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-text-primary">{rec.title}</p>
                            {rec.description && (
                              <p className="text-xs text-text-muted mt-0.5">{rec.description}</p>
                            )}
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                            rec.priority === "urgent" ? "bg-danger/10 text-danger" :
                            rec.priority === "high" ? "bg-warning/10 text-warning" :
                            rec.priority === "medium" ? "bg-accent/10 text-accent" :
                            "bg-surface text-text-muted"
                          }`}>
                            {rec.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {output.warnings.length > 0 && (
                  <div className="glass-panel p-4 border border-warning/20">
                    <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                      <AlertCircle size={14} className="text-warning" />
                      Warnings
                    </h3>
                    <ul className="space-y-1">
                      {output.warnings.map((w, i) => (
                        <li key={i} className="text-xs text-warning flex items-start gap-1.5">
                          <span className="mt-1">•</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Reasoning */}
                {output.reasoning && (
                  <div className="glass-panel p-4">
                    <h3 className="text-sm font-semibold text-text-primary mb-2">Reasoning</h3>
                    <p className="text-xs text-text-muted leading-relaxed">{output.reasoning}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center py-12 text-text-muted">
                <p className="text-sm">Select a report from the history to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
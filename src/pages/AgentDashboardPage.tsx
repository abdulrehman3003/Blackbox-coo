/**
 * AgentDashboardPage — per-agent detailed view of quantitative business metrics & AI insights
 */

import { useState, useEffect, useCallback } from "react";
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
  Play,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  PieChart as PieChartIcon,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import type { AgentName, AIReportRecord, AgentOutput, FinanceAgentData, SalesAgentData, InventoryAgentData, MarketingAgentData, OperationsAgentData } from "../lib/ai/types";
import { getLocalReports, saveLocalReport } from "../components/analysis/useAnalysisRunner";
import { gatherFinanceData } from "../lib/ai/financeAgent";
import Button from "../components/ui/Button";

export const AGENT_VISUALS: Record<AgentName, { emoji: string; color: string; label: string }> = {
  finance: { emoji: "💰", color: "#22C55E", label: "Finance Agent" },
  sales: { emoji: "📈", color: "#3B82F6", label: "Sales Agent" },
  inventory: { emoji: "📦", color: "#F59E0B", label: "Inventory Agent" },
  marketing: { emoji: "🎯", color: "#EC4899", label: "Marketing Agent" },
  operations: { emoji: "⚙️", color: "#8B5CF6", label: "Operations Agent" },
  ceo: { emoji: "🎯", color: "#9EFF00", label: "CEO Agent" },
};

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

/** Utility to guarantee text format and prevent React object child errors */
function formatSummaryText(val: unknown): string {
  if (!val) return "Agent analysis report";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if (typeof obj.summary === "string") return obj.summary;
    if (typeof obj.description === "string") return obj.description;
    if (typeof obj.detail === "string") return obj.detail;
  }
  return "Agent report analysis";
}

export default function AgentDashboardPage() {
  const { agentName } = useParams<{ agentName: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? "";

  const name: AgentName = (agentName as AgentName) in AGENT_LABELS ? (agentName as AgentName) : "finance";
  const visual = AGENT_VISUALS[name] || AGENT_VISUALS.finance;

  const [reports, setReports] = useState<AIReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AIReportRecord | null>(null);

  // Live quantitative metrics gathered for active company
  const [financeMetrics, setFinanceMetrics] = useState<FinanceAgentData | null>(null);
  const [salesMetrics, setSalesMetrics] = useState<SalesAgentData | null>(null);
  const [inventoryMetrics, setInventoryMetrics] = useState<InventoryAgentData | null>(null);
  const [marketingMetrics, setMarketingMetrics] = useState<MarketingAgentData | null>(null);
  const [operationsMetrics, setOperationsMetrics] = useState<OperationsAgentData | null>(null);

  // Load Reports & Live Data
  const loadReports = useCallback(async () => {
    setLoading(true);
    let dbReports: AIReportRecord[] = [];
    try {
      if (companyId) {
        const { data } = await supabase
          .from("ai_reports")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(20);
        dbReports = (data ?? []) as AIReportRecord[];
      }
    } catch {
      // non-fatal
    }

    const local = getLocalReports(companyId) as AIReportRecord[];
    const combinedMap = new Map<string, AIReportRecord>();
    [...dbReports, ...local].forEach((r) => {
      if (r && r.id && !combinedMap.has(r.id)) combinedMap.set(r.id, r);
    });

    const combined = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.created_at || Date.now()).getTime() - new Date(a.created_at || Date.now()).getTime()
    );

    setReports(combined);
    if (combined.length > 0) {
      setSelectedReport(combined[0]);
    }

    // Gather specific quantitative data for current agent
    try {
      if (name === "finance") {
        const data = await gatherFinanceData(companyId);
        setFinanceMetrics(data);
      } else if (name === "sales") {
        const { gatherSalesData } = await import("../lib/ai/salesAgent");
        const data = await gatherSalesData(companyId);
        setSalesMetrics(data);
      } else if (name === "inventory") {
        const { gatherInventoryData } = await import("../lib/ai/inventoryAgent");
        const data = await gatherInventoryData(companyId);
        setInventoryMetrics(data);
      } else if (name === "marketing") {
        const { gatherMarketingData } = await import("../lib/ai/marketingAgent");
        const data = await gatherMarketingData(companyId);
        setMarketingMetrics(data);
      } else if (name === "operations") {
        const { gatherOperationsData } = await import("../lib/ai/operationsAgent");
        const data = await gatherOperationsData(companyId);
        setOperationsMetrics(data);
      }
    } catch (err) {
      console.warn("Could not load structured metrics:", err);
    }

    setLoading(false);
  }, [companyId, name]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Extract standard AgentOutput safely from any report schema
  const getAgentOutput = (report: AIReportRecord | null): AgentOutput | null => {
    if (!report) return null;

    // Check specific agent result field (e.g. report.finance_result)
    const key = `${name}_result` as keyof AIReportRecord;
    if (report[key] && typeof report[key] === "object") {
      const res = report[key] as unknown as Record<string, unknown>;
      return {
        summary: formatSummaryText(res.summary),
        score: typeof res.score === "number" ? res.score : 80,
        risks: Array.isArray(res.risks) ? (res.risks as any) : [],
        opportunities: Array.isArray(res.opportunities) ? (res.opportunities as any) : [],
        recommendations: Array.isArray(res.recommendations) ? (res.recommendations as any) : [],
        confidence: typeof res.confidence === "number" ? res.confidence : 90,
        warnings: Array.isArray(res.warnings) ? (res.warnings as any) : [],
        reasoning: typeof res.reasoning === "string" ? res.reasoning : "",
      };
    }

    // Check nested summary object (e.g. report.summary.finance or executive summary object)
    if (report.summary && typeof report.summary === "object") {
      const sumObj = report.summary as Record<string, unknown>;
      if (sumObj[name] && typeof sumObj[name] === "object") {
        const res = sumObj[name] as Record<string, unknown>;
        return {
          summary: formatSummaryText(res.summary),
          score: typeof res.score === "number" ? res.score : 80,
          risks: Array.isArray(res.risks) ? (res.risks as any) : [],
          opportunities: Array.isArray(res.opportunities) ? (res.opportunities as any) : [],
          recommendations: Array.isArray(res.recommendations) ? (res.recommendations as any) : [],
          confidence: typeof res.confidence === "number" ? res.confidence : 90,
          warnings: Array.isArray(res.warnings) ? (res.warnings as any) : [],
          reasoning: typeof res.reasoning === "string" ? res.reasoning : "",
        };
      }

      // Executive summary object shape
      if (sumObj.summary || sumObj.businessScore) {
        return {
          summary: formatSummaryText(sumObj.summary),
          score: typeof sumObj.businessScore === "number" ? sumObj.businessScore : 85,
          risks: Array.isArray(sumObj.topRisks)
            ? (sumObj.topRisks as any[]).map((r) => ({
                title: typeof r === "string" ? r : r?.title || "Identified Risk",
                severity: r?.severity || "medium",
                detail: typeof r === "string" ? r : r?.detail || "",
              }))
            : [],
          opportunities: Array.isArray(sumObj.topOpportunities)
            ? (sumObj.topOpportunities as any[]).map((o) => ({
                title: typeof o === "string" ? o : o?.title || "Growth Opportunity",
                impact: o?.impact || "high",
                detail: typeof o === "string" ? o : o?.detail || "",
              }))
            : [],
          recommendations: Array.isArray(sumObj.priorityTasks)
            ? (sumObj.priorityTasks as any[]).map((t) => ({
                title: typeof t === "string" ? t : t?.title || "Tactical Action",
                priority: t?.priority || "high",
                category: t?.category || "Strategic",
                description: typeof t === "string" ? t : t?.description || "",
              }))
            : [],
          confidence: 95,
          warnings: Array.isArray(sumObj.warnings) ? (sumObj.warnings as any[]) : [],
        };
      }
    }

    // Direct output object
    if ((report as unknown as { output?: Record<string, unknown> }).output) {
      const res = (report as unknown as { output: Record<string, unknown> }).output;
      return {
        summary: formatSummaryText(res.summary),
        score: typeof res.score === "number" ? res.score : 80,
        risks: Array.isArray(res.risks) ? (res.risks as any) : [],
        opportunities: Array.isArray(res.opportunities) ? (res.opportunities as any) : [],
        recommendations: Array.isArray(res.recommendations) ? (res.recommendations as any) : [],
        confidence: typeof res.confidence === "number" ? res.confidence : 90,
        warnings: Array.isArray(res.warnings) ? (res.warnings as any) : [],
        reasoning: typeof res.reasoning === "string" ? res.reasoning : "",
      };
    }

    // Fallback if report.summary is string
    if (typeof report.summary === "string") {
      return {
        summary: report.summary,
        score: typeof (report as any).score === "number" ? (report as any).score : 80,
        risks: [],
        opportunities: [],
        recommendations: [],
        confidence: 90,
        warnings: [],
      };
    }

    return null;
  };

  const getAgentConfidence = (report: AIReportRecord | null): number => {
    if (!report) return 90;
    const key = `${name}_confidence` as keyof AIReportRecord;
    const conf = report[key] as number | null;
    if (conf !== null && conf !== undefined) return conf;
    const output = getAgentOutput(report);
    return output?.confidence ?? 90;
  };

  const getAgentTime = (report: AIReportRecord | null): number => {
    if (!report) return 0;
    const key = `${name}_execution_time_ms` as keyof AIReportRecord;
    const t = report[key] as number | null;
    if (t !== null && t !== undefined) return t;
    return report.total_execution_time_ms ?? 0;
  };

  const getAgentMode = (report: AIReportRecord | null): string => {
    return report?.execution_mode ?? "ai";
  };

  const handleRunSingleAgent = async () => {
    setRunning(true);
    try {
      let agentRes: { output: AgentOutput; executionMode: "ai" | "fallback"; executionTimeMs: number; structuredData?: Record<string, unknown> } | null = null;
      if (name === "finance") {
        const { runFinanceAgent } = await import("../lib/ai/financeAgent");
        agentRes = await runFinanceAgent(companyId);
      } else if (name === "sales") {
        const { runSalesAgent } = await import("../lib/ai/salesAgent");
        agentRes = await runSalesAgent(companyId);
      } else if (name === "inventory") {
        const { runInventoryAgent } = await import("../lib/ai/inventoryAgent");
        agentRes = await runInventoryAgent(companyId);
      } else if (name === "marketing") {
        const { runMarketingAgent } = await import("../lib/ai/marketingAgent");
        agentRes = await runMarketingAgent(companyId);
      } else if (name === "operations") {
        const { runOperationsAgent } = await import("../lib/ai/operationsAgent");
        agentRes = await runOperationsAgent(companyId);
      } else {
        const { ceoFallback } = await import("../lib/ai/fallbackEngine");
        agentRes = { output: ceoFallback([]), executionMode: "fallback", executionTimeMs: 150 };
      }

      if (agentRes) {
        const newRecord: Partial<AIReportRecord> = {
          id: `report-${Date.now()}`,
          company_id: companyId,
          created_at: new Date().toISOString(),
          execution_mode: agentRes.executionMode,
          total_execution_time_ms: agentRes.executionTimeMs,
          [`${name}_result`]: agentRes.output as unknown as Record<string, unknown>,
          [`${name}_confidence`]: agentRes.output.confidence,
          [`${name}_execution_time_ms`]: agentRes.executionTimeMs,
          summary: agentRes.output.summary,
        };

        saveLocalReport(companyId, newRecord);
        await loadReports();
      }
    } catch (err) {
      console.error("Agent execution failed:", err);
    } finally {
      setRunning(false);
    }
  };

  const exportReport = () => {
    if (!selectedReport) return;
    const output = getAgentOutput(selectedReport);
    if (!output) return;
    const content = JSON.stringify({ output, metrics: name === "finance" ? financeMetrics : name === "sales" ? salesMetrics : name === "inventory" ? inventoryMetrics : null }, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}-report-${new Date(selectedReport.created_at || Date.now()).toISOString().slice(0, 10)}.json`;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{visual?.emoji ?? "🎯"}</span>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{AGENT_LABELS[name]}</h1>
            <p className="text-xs text-text-muted">{AGENT_DESCRIPTIONS[name]}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {output && (
            <Button variant="ghost" size="sm" icon={Download} onClick={exportReport}>
              Export JSON
            </Button>
          )}
          <Button variant="primary" size="sm" icon={Play} onClick={handleRunSingleAgent} loading={running}>
            {running ? "Analyzing…" : `Run ${AGENT_LABELS[name]}`}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-text-muted animate-pulse py-8">Loading agent report data…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* History Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <BarChart3 size={16} className="text-accent" />
              Run History ({reports.length})
            </h2>

            {reports.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-text-muted">
                No runs recorded yet.
                <button
                  onClick={handleRunSingleAgent}
                  className="block mx-auto mt-2 text-accent hover:underline font-semibold cursor-pointer"
                >
                  Run First Analysis
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {reports.map((r) => {
                  const out = getAgentOutput(r);
                  const isSelected = selectedReport?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedReport(r)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-accent bg-accent-subtle/40 text-text-primary"
                          : "border-border bg-surface/50 hover:bg-surface hover:border-border-hover text-text-secondary"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="truncate">
                          {new Date(r.created_at || Date.now()).toLocaleDateString()}{" "}
                          {new Date(r.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {out?.score !== undefined && (
                          <span
                            className={`font-bold ${
                              out.score >= 70 ? "text-success" : out.score >= 40 ? "text-warning" : "text-danger"
                            }`}
                          >
                            {out.score}/100
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-muted mt-1 line-clamp-2">
                        {formatSummaryText(out?.summary || r.summary)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Main Agent Report View */}
          <div className="lg:col-span-3 space-y-6">
            {/* ── AGENT-SPECIFIC QUANTITATIVE METRICS CARDS ── */}

            {/* FINANCE METRICS */}
            {name === "finance" && financeMetrics && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <DollarSign size={16} className="text-accent" />
                  Financial Data Metrics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Total Revenue</p>
                    <p className="text-xl font-bold text-accent mt-1">${financeMetrics.revenue.toLocaleString()}</p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Operating Spend</p>
                    <p className="text-xl font-bold text-warning mt-1">${financeMetrics.expenses.toLocaleString()}</p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Net Profit</p>
                    <p className={`text-xl font-bold mt-1 ${financeMetrics.profit >= 0 ? "text-success" : "text-danger"}`}>
                      ${financeMetrics.profit.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-text-muted">{financeMetrics.margin.toFixed(1)}% margin</span>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Forecast</p>
                    <p className="text-xl font-bold text-text-primary mt-1">${financeMetrics.forecast.toLocaleString()}</p>
                    <span className="text-[10px] text-text-muted">{financeMetrics.monthlyGrowth.toFixed(1)}% growth</span>
                  </div>
                </div>

                {/* Expense Breakdown Table */}
                {financeMetrics.topExpenseCategories.length > 0 && (
                  <div className="glass-card p-5 space-y-3">
                    <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
                      <PieChartIcon size={14} className="text-accent" /> Expense Breakdown
                    </h4>
                    <div className="space-y-2">
                      {financeMetrics.topExpenseCategories.map((cat: any, idx: number) => {
                        const pct = financeMetrics.expenses > 0 ? (cat.amount / financeMetrics.expenses) * 100 : 0;
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-text-primary">{cat.category}</span>
                              <span className="text-text-secondary">${cat.amount.toLocaleString()} ({pct.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-surface overflow-hidden">
                              <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SALES METRICS */}
            {name === "sales" && salesMetrics && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <ShoppingCart size={16} className="text-accent" />
                  Sales Quantitative Metrics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Total Sales</p>
                    <p className="text-xl font-bold text-accent mt-1">${salesMetrics.totalSales.toLocaleString()}</p>
                    <span className="text-[10px] text-text-muted">{salesMetrics.salesGrowth.toFixed(1)}% growth</span>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Avg Order Value</p>
                    <p className="text-xl font-bold text-text-primary mt-1">${salesMetrics.averageOrderValue.toFixed(2)}</p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Retention Rate</p>
                    <p className="text-xl font-bold text-success mt-1">{salesMetrics.retentionRate}%</p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Churn Rate</p>
                    <p className="text-xl font-bold text-danger mt-1">{salesMetrics.churnRate}%</p>
                  </div>
                </div>

                {/* Top Customers */}
                {salesMetrics.topCustomers.length > 0 && (
                  <div className="glass-card p-5 space-y-3">
                    <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Top Customers</h4>
                    <div className="divide-y divide-border">
                      {salesMetrics.topCustomers.map((c: any, idx: number) => (
                        <div key={idx} className="py-2 flex items-center justify-between text-xs">
                          <span className="font-semibold text-text-primary">{c.name}</span>
                          <span className="text-text-secondary">${c.totalSpent.toLocaleString()} ({c.visits} visits)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* INVENTORY METRICS */}
            {name === "inventory" && inventoryMetrics && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Package size={16} className="text-accent" />
                  Inventory Metrics & Stock Alerts
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Stock Health</p>
                    <p className="text-xl font-bold text-success mt-1">{inventoryMetrics.stockHealth}%</p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Inventory Value</p>
                    <p className="text-xl font-bold text-accent mt-1">${inventoryMetrics.inventoryValue.toLocaleString()}</p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Total Items</p>
                    <p className="text-xl font-bold text-text-primary mt-1">{inventoryMetrics.totalItems}</p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Turnover Rate</p>
                    <p className="text-xl font-bold text-text-primary mt-1">{inventoryMetrics.turnoverRate}x</p>
                  </div>
                </div>

                {/* Low Stock Alerts Table */}
                {inventoryMetrics.lowStockItems.length > 0 && (
                  <div className="glass-card p-5 space-y-3 border border-warning/30 bg-warning/5">
                    <h4 className="text-xs font-semibold text-warning uppercase tracking-wider flex items-center gap-2">
                      <AlertCircle size={14} /> Low Stock & Reorder Alerts
                    </h4>
                    <div className="divide-y divide-border">
                      {inventoryMetrics.lowStockItems.map((item: any, idx: number) => (
                        <div key={idx} className="py-2 flex items-center justify-between text-xs">
                          <span className="font-semibold text-text-primary">{item.name}</span>
                          <span className="text-warning">Stock: {item.quantity} (Reorder level: {item.reorderLevel}) — Suggest: +{item.suggestedReorder}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MARKETING METRICS */}
            {name === "marketing" && marketingMetrics && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Users size={16} className="text-accent" />
                  Marketing Customer Data
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Registered Customers</p>
                    <p className="text-2xl font-bold text-accent mt-1">{marketingMetrics.totalCustomers}</p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Campaign Readiness</p>
                    <p className="text-2xl font-bold text-success mt-1">High</p>
                  </div>
                </div>
              </div>
            )}

            {/* OPERATIONAL METRICS */}
            {name === "operations" && operationsMetrics && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Zap size={16} className="text-accent" />
                  Operational Efficiency Metrics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Efficiency Score</p>
                    <p className="text-2xl font-bold text-success mt-1">{operationsMetrics.efficiencyScore}%</p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Priority Actions</p>
                    <p className="text-2xl font-bold text-accent mt-1">{operationsMetrics.dailyPriorities.length}</p>
                  </div>
                </div>
              </div>
            )}

            {/* AI SYNTHESIZED REPORT CARD */}
            {output ? (
              <>
                {/* Score & Meta Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Score</p>
                    <p
                      className={`text-2xl font-bold mt-1 ${
                        output.score >= 70 ? "text-success" : output.score >= 40 ? "text-warning" : "text-danger"
                      }`}
                    >
                      {output.score}/100
                    </p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Confidence</p>
                    <p className="text-2xl font-bold mt-1 text-accent flex items-center gap-1.5">
                      <Brain size={18} />
                      {getAgentConfidence(selectedReport)}%
                    </p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Execution Time</p>
                    <p className="text-2xl font-bold mt-1 text-text-primary flex items-center gap-1.5">
                      <Clock size={18} className="text-text-muted" />
                      {getAgentTime(selectedReport)}ms
                    </p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Engine Mode</p>
                    <p className="text-base font-bold mt-1 flex items-center gap-1.5">
                      {getAgentMode(selectedReport) === "ai" ? (
                        <><Sparkles size={16} className="text-accent" /> AI Agent</>
                      ) : (
                        <><Zap size={16} className="text-warning" /> Rule Fallback</>
                      )}
                    </p>
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="glass-card p-5">
                  <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                    <Sparkles size={16} className="text-accent" />
                    Executive Summary
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{formatSummaryText(output.summary)}</p>
                </div>

                {/* Risks */}
                {output.risks && output.risks.length > 0 && (
                  <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                      <AlertCircle size={16} className="text-danger" />
                      Detected Risks ({output.risks.length})
                    </h3>
                    <div className="space-y-2.5">
                      {output.risks.map((risk, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-danger/5 border border-danger/15">
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              risk.severity === "high"
                                ? "bg-danger"
                                : risk.severity === "medium"
                                ? "bg-warning"
                                : "bg-warning/50"
                            }`}
                          />
                          <div>
                            <p className="text-sm font-semibold text-text-primary">{risk.title}</p>
                            <p className="text-xs text-text-muted mt-0.5">{risk.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Opportunities */}
                {output.opportunities && output.opportunities.length > 0 && (
                  <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                      <TrendingUp size={16} className="text-success" />
                      Opportunities ({output.opportunities.length})
                    </h3>
                    <div className="space-y-2.5">
                      {output.opportunities.map((opp, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-success/5 border border-success/15">
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              opp.impact === "high"
                                ? "bg-success"
                                : opp.impact === "medium"
                                ? "bg-accent"
                                : "bg-accent/50"
                            }`}
                          />
                          <div>
                            <p className="text-sm font-semibold text-text-primary">{opp.title}</p>
                            <p className="text-xs text-text-muted mt-0.5">{opp.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {output.recommendations && output.recommendations.length > 0 && (
                  <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-accent" />
                      Tactical Recommendations ({output.recommendations.length})
                    </h3>
                    <div className="space-y-2.5">
                      {output.recommendations.map((rec, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3.5 rounded-xl bg-accent-subtle/30 border border-accent/15"
                        >
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              rec.priority === "urgent"
                                ? "bg-danger"
                                : rec.priority === "high"
                                ? "bg-warning"
                                : rec.priority === "medium"
                                ? "bg-accent"
                                : "bg-text-muted"
                            }`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-text-primary">{rec.title}</p>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase ${
                                  rec.priority === "urgent"
                                    ? "bg-danger/10 text-danger"
                                    : rec.priority === "high"
                                    ? "bg-warning/10 text-warning"
                                    : rec.priority === "medium"
                                    ? "bg-accent/10 text-accent"
                                    : "bg-surface text-text-muted"
                                }`}
                              >
                                {rec.priority}
                              </span>
                            </div>
                            {rec.description && (
                              <p className="text-xs text-text-muted mt-1 leading-relaxed">{rec.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {output.warnings && output.warnings.length > 0 && (
                  <div className="glass-card p-5 border border-warning/20">
                    <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                      <AlertCircle size={16} className="text-warning" />
                      Agent Warnings
                    </h3>
                    <ul className="space-y-1">
                      {output.warnings.map((w, i) => (
                        <li key={i} className="text-xs text-warning flex items-start gap-1.5">
                          <span className="mt-1">•</span>
                          <span>{typeof w === "string" ? w : String(w)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="glass-card p-10 flex flex-col items-center justify-center text-center text-text-muted space-y-4">
                <Brain size={40} className="text-accent opacity-40" />
                <div>
                  <h3 className="text-base font-semibold text-text-primary">No Report Loaded for {AGENT_LABELS[name]}</h3>
                  <p className="text-xs text-text-muted mt-1 max-w-md">
                    Run your agent analysis or run a complete business pipeline to see synthesized AI reports, risks, and tactical recommendations.
                  </p>
                </div>
                <Button variant="primary" size="sm" icon={Play} onClick={handleRunSingleAgent} loading={running}>
                  Run {AGENT_LABELS[name]} Now
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
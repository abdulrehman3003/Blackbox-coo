/**
 * AICommandCenter — aggregated view of all AI agents with pipeline runner
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Cpu,
  Play,
  History,
  Clock,
  AlertCircle,
  Brain,
  BarChart3,
  Sparkles,
  Settings,
  ChevronRight,
  Zap,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { getPersonalApiKey } from "../lib/ai/aiService";
import PipelineRunner from "../components/ai/PipelineRunner";
import AgentCard from "../components/ai/AgentCard";
import ExecutiveReportView from "../components/reports/ExecutiveReportView";
import PageHeader from "../components/ui/PageHeader";
import { AGENT_VISUALS } from "../components/ai/AgentCard";
import type {
  AgentExecutionResult,
  AgentName,
  AgentStatus,
  AIReportRecord,
  PipelineExecution,
} from "../lib/ai/types";

export default function AICommandCenter() {
  const { profile, company } = useAuth();
  const companyId = profile?.company_id || company?.id || localStorage.getItem("active_company_id") || "demo-company";
  const navigate = useNavigate();

  const [agentStates, setAgentStates] = useState<Record<AgentName, {
    status: AgentStatus;
    result: AgentExecutionResult | null;
    lastRun: string | null;
  }>>({
    finance: { status: "idle", result: null, lastRun: null },
    sales: { status: "idle", result: null, lastRun: null },
    inventory: { status: "idle", result: null, lastRun: null },
    marketing: { status: "idle", result: null, lastRun: null },
    operations: { status: "idle", result: null, lastRun: null },
    ceo: { status: "idle", result: null, lastRun: null },
  });

  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [latestReport, setLatestReport] = useState<AIReportRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLatestReport = useCallback(async () => {
    if (!companyId) return;
    try {
      const { data } = await supabase
        .from("ai_reports")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const report = data as AIReportRecord;
        setLatestReport(report);

        // Restore agent states from the report
        const updates: Record<string, { status: AgentStatus; result: AgentExecutionResult | null; lastRun: string | null }> = {};

        const mapResult = (name: string, resultField: Record<string, unknown> | null, confidence: number | null, timeMs: number | null, status: string | null): AgentExecutionResult | null => {
          if (!resultField) return null;
          const output = resultField as unknown as AgentExecutionResult["output"];
          return {
            agentName: name as AgentName,
            agentLabel: AGENT_VISUALS[name as AgentName]?.label ?? name,
            status: (status === "completed" ? "completed" : "completed") as AgentStatus,
            executionMode: report.execution_mode as "ai" | "fallback",
            confidence: confidence ?? 0,
            executionTimeMs: timeMs ?? 0,
            output,
            startedAt: report.created_at,
            completedAt: report.created_at,
          };
        };

        const agents: AgentName[] = ["finance", "sales", "inventory", "marketing", "operations"];
        agents.forEach((name) => {
          const reportKey = `${name}_result` as keyof AIReportRecord;
          const confKey = `${name}_confidence` as keyof AIReportRecord;
          const timeKey = `${name}_execution_time_ms` as keyof AIReportRecord;
          const statusKey = `${name}_status` as keyof AIReportRecord;

          updates[name] = {
            status: "completed" as AgentStatus,
            result: mapResult(
              name,
              report[reportKey] as Record<string, unknown> | null,
              report[confKey] as number | null,
              report[timeKey] as number | null,
              report[statusKey] as string | null,
            ),
            lastRun: report.created_at,
          };
        });

        updates["ceo"] = {
          status: "completed" as AgentStatus,
          result: mapResult("ceo", report.ceo_result as Record<string, unknown> | null, report.ceo_score ?? null, report.ceo_execution_time_ms ?? null, "completed"),
          lastRun: report.created_at,
        };

        setAgentStates((prev) => ({ ...prev, ...updates }));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadLatestReport();
  }, [loadLatestReport]);

  const handlePipelineComplete = (result: PipelineExecution) => {
    setPipelineRunning(false);

    // Update agent states from results
    const updates: Record<string, { status: AgentStatus; result: AgentExecutionResult | null; lastRun: string | null }> = {};
    result.agentResults.forEach((r) => {
      updates[r.agentName] = {
        status: r.status === "completed" ? "completed" : "failed",
        result: r,
        lastRun: new Date().toISOString(),
      };
    });
    setAgentStates((prev) => ({ ...prev, ...updates }));
    loadLatestReport();
  };

  const handleRunAgent = async (name: AgentName) => {
    if (pipelineRunning) return;

    setAgentStates((prev) => ({
      ...prev,
      [name]: { ...prev[name], status: "running" },
    }));

    try {
      // Import and run individual agent
      let result: { output: { summary: string; score: number; risks: unknown[]; opportunities: unknown[]; recommendations: unknown[]; confidence: number; warnings: string[] }; executionMode: "ai" | "fallback"; executionTimeMs: number };

      switch (name) {
        case "finance": {
          const { runFinanceAgent } = await import("../lib/ai/financeAgent");
          result = await runFinanceAgent(companyId);
          break;
        }
        case "sales": {
          const { runSalesAgent } = await import("../lib/ai/salesAgent");
          result = await runSalesAgent(companyId);
          break;
        }
        case "inventory": {
          const { runInventoryAgent } = await import("../lib/ai/inventoryAgent");
          result = await runInventoryAgent(companyId);
          break;
        }
        case "marketing": {
          const { runMarketingAgent } = await import("../lib/ai/marketingAgent");
          result = await runMarketingAgent(companyId);
          break;
        }
        case "operations": {
          const { runOperationsAgent } = await import("../lib/ai/operationsAgent");
          result = await runOperationsAgent(companyId);
          break;
        }
        case "ceo": {
          const { runCEOAgent } = await import("../lib/ai/ceoAgent");
          const previousOutputs = Object.entries(agentStates)
            .filter(([k, v]) => k !== "ceo" && v.result?.output)
            .map(([k, v]) => ({ name: k, output: v.result!.output }));

          result = await runCEOAgent(companyId, previousOutputs, []);
          break;
        }
        default:
          return;
      }

      const executionResult: AgentExecutionResult = {
        agentName: name,
        agentLabel: AGENT_VISUALS[name].label,
        status: "completed",
        executionMode: result.executionMode,
        confidence: result.output.confidence,
        executionTimeMs: result.executionTimeMs,
        output: {
          summary: result.output.summary,
          score: result.output.score,
          risks: result.output.risks as AgentExecutionResult["output"]["risks"],
          opportunities: result.output.opportunities as AgentExecutionResult["output"]["opportunities"],
          recommendations: result.output.recommendations as AgentExecutionResult["output"]["recommendations"],
          confidence: result.output.confidence,
          warnings: result.output.warnings,
        },
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      setAgentStates((prev) => ({
        ...prev,
        [name]: {
          status: "completed",
          result: executionResult,
          lastRun: new Date().toISOString(),
        },
      }));
    } catch (err) {
      setAgentStates((prev) => ({
        ...prev,
        [name]: {
          ...prev[name],
          status: "failed",
          result: {
            agentName: name,
            agentLabel: AGENT_VISUALS[name]?.label || name,
            status: "failed",
            executionMode: "fallback",
            confidence: 0,
            executionTimeMs: 0,
            output: { summary: "Execution failed", score: 0, risks: [], opportunities: [], recommendations: [], confidence: 0, warnings: [] },
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            error: err instanceof Error ? err.message : "Execution error",
          },
        },
      }));
    }
  };

  const handleAgentHistory = (name: AgentName) => {
    navigate(`/command-center/${name}`);
  };

  const allAgents: AgentName[] = ["finance", "sales", "inventory", "marketing", "operations", "ceo"];

  const [hasApiKey, setHasApiKey] = useState<boolean>(true);

  useEffect(() => {
    getPersonalApiKey().then((key) => setHasApiKey(Boolean(key)));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Command Center"
        description="Multi-agent business analysis powered by advanced AI models"
        icon={Cpu}
        actions={
          <button
            onClick={() => navigate("/settings")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm text-text-secondary hover:text-text-primary hover:border-border-hover transition-all cursor-pointer"
          >
            <Settings size={14} />
            AI Settings
          </button>
        }
      />

      {!hasApiKey && (
        <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 flex items-center justify-between gap-4 text-warning animate-slide-up">
          <div className="flex items-center gap-3">
            <Zap size={20} className="shrink-0 text-warning" />
            <div>
              <p className="text-sm font-semibold">No AIML API Key Configured</p>
              <p className="text-xs text-text-secondary">
                Agents are running in <strong>Rule Fallback Mode</strong>. Enter your AIML API Key in Settings to enable live AI multi-model analysis.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/settings")}
            className="px-3.5 py-1.5 rounded-lg bg-warning text-bg text-xs font-bold shrink-0 hover:bg-warning/90 transition-all cursor-pointer"
          >
            Configure Key →
          </button>
        </div>
      )}

      {/* Pipeline execution */}
      <div className="glass-panel p-5 border border-accent/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Play size={16} className="text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Full Analysis Pipeline</h2>
              <p className="text-xs text-text-muted">
                Runs all agents in sequence: Finance → Sales → Inventory → Marketing → Operations → CEO
              </p>
            </div>
          </div>
        </div>
        <PipelineRunner
          companyId={companyId}
          onComplete={handlePipelineComplete}
        />
      </div>

      {/* Agents Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Brain size={16} className="text-accent" />
            Agent Overview
          </h2>
          {latestReport && (
            <button
              onClick={() => navigate("/reports")}
              className="flex items-center gap-1 text-xs text-accent hover:underline cursor-pointer"
            >
              <History size={12} />
              View Reports <ChevronRight size={12} />
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allAgents.map((name) => (
            <AgentCard
              key={name}
              agentName={name}
              result={agentStates[name]?.result ?? null}
              status={agentStates[name]?.status ?? "idle"}
              isRunning={pipelineRunning}
              onRun={handleRunAgent}
              onHistory={handleAgentHistory}
            />
          ))}
        </div>
      </div>

      {/* Latest report summary */}
      {latestReport && (
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <BarChart3 size={16} className="text-accent" />
              Latest Analysis Results
            </h3>
            <span className="text-xs text-text-muted">
              {new Date(latestReport.created_at).toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div className="p-3 rounded-xl bg-surface border border-border">
              <p className="text-[11px] text-text-muted uppercase tracking-wider">Health Score</p>
              <p className={`text-lg font-bold mt-0.5 ${
                (latestReport.business_health_score ?? 0) >= 70 ? "text-success" :
                (latestReport.business_health_score ?? 0) >= 40 ? "text-warning" : "text-danger"
              }`}>
                {latestReport.business_health_score ?? "—"}/100
              </p>
            </div>
            <div className="p-3 rounded-xl bg-surface border border-border">
              <p className="text-[11px] text-text-muted uppercase tracking-wider">Mode</p>
              <p className="text-sm font-medium text-text-primary mt-0.5 flex items-center gap-1.5">
                {latestReport.execution_mode === "ai" ? (
                  <><Sparkles size={12} className="text-accent" /> AI</>
                ) : latestReport.execution_mode === "fallback" ? (
                  <><Zap size={12} className="text-warning" /> Fallback</>
                ) : (
                  <><Brain size={12} className="text-accent" /> Hybrid</>
                )}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-surface border border-border">
              <p className="text-[11px] text-text-muted uppercase tracking-wider">Time</p>
              <p className="text-sm font-medium text-text-primary mt-0.5 flex items-center gap-1">
                <Clock size={12} className="text-text-muted" />
                {latestReport.total_execution_time_ms}ms
              </p>
            </div>
            <div className="p-3 rounded-xl bg-surface border border-border">
              <p className="text-[11px] text-text-muted uppercase tracking-wider">Warnings</p>
              <p className="text-sm font-medium text-text-primary mt-0.5 flex items-center gap-1">
                <AlertCircle size={12} className={latestReport.warnings?.length > 0 ? "text-warning" : "text-text-muted"} />
                {latestReport.warnings?.length ?? 0}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-card-border">
            <ExecutiveReportView report={latestReport.summary || latestReport} />
          </div>
        </div>
      )}

      {loading && (
        <div className="text-sm text-text-muted animate-pulse">Loading latest analysis...</div>
      )}

      {!loading && !latestReport && (
        <div className="flex flex-col items-center justify-center py-12 text-text-muted">
          <Cpu size={40} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">No analysis run yet</p>
          <p className="text-xs mt-1">Click "Run AI Analysis" above to start your first analysis</p>
        </div>
      )}
    </div>
  );
}
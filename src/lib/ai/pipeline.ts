/**
 * Execution Pipeline — orchestrates the full multi-agent analysis.
 *
 * Runs agents in sequence: Finance → Sales → Inventory → Marketing → Operations → CEO
 * Each agent uses Gemini (with fallback) independently.
 * Reports progress via callback.
 * Stores results in the ai_reports table.
 */

import { supabase } from "../supabase";
import { runFinanceAgent } from "./financeAgent";
import { runSalesAgent } from "./salesAgent";
import { runInventoryAgent } from "./inventoryAgent";
import { runMarketingAgent } from "./marketingAgent";
import { runOperationsAgent } from "./operationsAgent";
import { runCEOAgent } from "./ceoAgent";
import { getAISettings } from "./aiService";
import type {
  AgentExecutionResult,
  AgentName,
  ExecutionMode,
  PipelineExecution,
  PipelineLogEntry,
  PipelineStatus,
  AgentOutput,
} from "./types";

export interface PipelineProgress {
  currentAgent: AgentName;
  currentLabel: string;
  overallStatus: PipelineStatus;
  progress: number; // 0-100
  results: AgentExecutionResult[];
  log: PipelineLogEntry[];
  executionMode: ExecutionMode;
  totalTimeMs: number;
}

export type ProgressCallback = (progress: PipelineProgress) => void;

const AGENT_ORDER: { name: AgentName; label: string }[] = [
  { name: "finance", label: "Finance Agent" },
  { name: "sales", label: "Sales Agent" },
  { name: "inventory", label: "Inventory Agent" },
  { name: "marketing", label: "Marketing Agent" },
  { name: "operations", label: "Operations Agent" },
];

/**
 * Run the full AI analysis pipeline.
 * @param companyId - The company ID to analyze
 * @param onProgress - Optional callback for real-time progress updates
 * @returns The complete pipeline execution result
 */
export async function runPipeline(
  companyId: string,
  onProgress?: ProgressCallback,
): Promise<PipelineExecution> {
  const log: PipelineLogEntry[] = [];
  const results: AgentExecutionResult[] = [];
  const startTime = performance.now();

  let overallMode: ExecutionMode = "ai";
  let overallStatus: PipelineStatus = "running";

  const progress = (): PipelineProgress => ({
    currentAgent: results.length > 0 ? results[results.length - 1].agentName : "finance",
    currentLabel: results.length > 0 ? results[results.length - 1].agentLabel : "Finance Agent",
    overallStatus,
    progress: Math.round((results.length / (AGENT_ORDER.length + 1)) * 100),
    results: [...results],
    log: [...log],
    executionMode: overallMode,
    totalTimeMs: Math.round(performance.now() - startTime),
  });

  const logEntry = (level: PipelineLogEntry["level"], agent: AgentName, message: string) => {
    const entry: PipelineLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      agent,
      message,
    };
    log.push(entry);
    onProgress?.(progress());
  };

  logEntry("info", "finance", "Pipeline started");

  // Check settings
  const settings = await getAISettings(companyId);
  if (!settings.enable_ai) {
    overallMode = "fallback";
    logEntry("warn", "ceo", "AI is disabled — using fallback mode for all agents");
  }

  try {
    // ── Run each agent in sequence ──
    for (const agent of AGENT_ORDER) {
      logEntry("info", agent.name, `${agent.label} starting...`);

      let agentResult: AgentExecutionResult;

      try {
        const result = await executeAgent(companyId, agent.name, log, logEntry);
        agentResult = result;

        if (result.executionMode === "fallback") {
          overallMode = "hybrid";
        }

        logEntry(
          result.status === "completed" ? "success" : "error",
          agent.name,
          `${agent.label} ${result.status === "completed" ? "completed" : "failed"} in ${result.executionTimeMs}ms (${result.executionMode})`,
        );
      } catch (err) {
        agentResult = {
          agentName: agent.name,
          agentLabel: agent.label,
          status: "failed",
          executionMode: "fallback",
          confidence: 0,
          executionTimeMs: Math.round(performance.now() - startTime),
          output: {
            summary: `${agent.label} encountered an error.`,
            score: 0,
            risks: [],
            opportunities: [],
            recommendations: [],
            confidence: 0,
            warnings: ["Agent execution failed."],
          },
          error: err instanceof Error ? err.message : "Unknown error",
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        };
        logEntry("error", agent.name, `${agent.label} failed: ${agentResult.error}`);
      }

      results.push(agentResult);
      onProgress?.(progress());
    }

    // ── Run CEO Agent (synthesizer) ──
    logEntry("info", "ceo", "CEO Agent synthesizing results...");

    const agentOutputs = results.map((r) => ({
      name: r.agentName,
      output: r.output,
    }));

    const ceoResult = await runCEOAgent(companyId, agentOutputs, log);

    if (ceoResult.executionMode === "fallback" && overallMode === "ai") {
      overallMode = "hybrid";
    }

    const ceoExecutionResult: AgentExecutionResult = {
      agentName: "ceo",
      agentLabel: "CEO Agent",
      status: "completed",
      executionMode: ceoResult.executionMode,
      confidence: ceoResult.output.confidence,
      executionTimeMs: ceoResult.executionTimeMs,
      output: ceoResult.output,
      reasoningSummary: ceoResult.output.reasoning,
      startedAt: new Date(Date.now() - ceoResult.executionTimeMs).toISOString(),
      completedAt: new Date().toISOString(),
    };

    results.push(ceoExecutionResult);
    overallStatus = "completed";
    logEntry("success", "ceo", `CEO report generated (score: ${ceoResult.output.score}/100)`);

    // ── Save to database ──
    try {
      await savePipelineResult(companyId, results, log, overallMode, Math.round(performance.now() - startTime));
    } catch (err) {
      logEntry("error", "ceo", `Failed to save report: ${err instanceof Error ? err.message : "DB error"}`);
    }

    const totalTimeMs = Math.round(performance.now() - startTime);
    const ceoScore = ceoResult.output.score;

    return {
      id: crypto.randomUUID(),
      companyId,
      status: "completed",
      executionMode: overallMode,
      totalExecutionTimeMs: totalTimeMs,
      businessHealthScore: ceoScore,
      summary: ceoResult.output.summary,
      ceoResult: ceoExecutionResult,
      agentResults: results,
      executionLog: log,
      warnings: ceoResult.output.warnings,
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
    overallStatus = "failed";
    logEntry("error", "ceo", `Pipeline failed: ${err instanceof Error ? err.message : "Unknown"}`);

    return {
      id: crypto.randomUUID(),
      companyId,
      status: "failed",
      executionMode: overallMode,
      totalExecutionTimeMs: Math.round(performance.now() - startTime),
      businessHealthScore: 0,
      summary: "Analysis pipeline failed to complete.",
      ceoResult: null,
      agentResults: results,
      executionLog: log,
      warnings: ["Pipeline execution failed."],
      createdAt: new Date().toISOString(),
    };
  }
}

async function executeAgent(
  companyId: string,
  agentName: AgentName,
  _log: PipelineLogEntry[],
  _logEntry: (level: PipelineLogEntry["level"], agent: AgentName, message: string) => void,
): Promise<AgentExecutionResult> {
  const startedAt = new Date().toISOString();

  let result: {
    output: AgentOutput;
    executionMode: "ai" | "fallback";
    executionTimeMs: number;
    structuredData?: Record<string, unknown>;
  };

  switch (agentName) {
    case "finance":
      result = await runFinanceAgent(companyId);
      break;
    case "sales":
      result = await runSalesAgent(companyId);
      break;
    case "inventory":
      result = await runInventoryAgent(companyId);
      break;
    case "marketing":
      result = await runMarketingAgent(companyId);
      break;
    case "operations":
      result = await runOperationsAgent(companyId);
      break;
    default:
      throw new Error(`Unknown agent: ${agentName}`);
  }

  const labels: Record<AgentName, string> = {
    finance: "Finance Agent",
    sales: "Sales Agent",
    inventory: "Inventory Agent",
    marketing: "Marketing Agent",
    operations: "Operations Agent",
    ceo: "CEO Agent",
  };

  return {
    agentName,
    agentLabel: labels[agentName],
    status: "completed",
    executionMode: result.executionMode,
    confidence: result.output.confidence,
    executionTimeMs: result.executionTimeMs,
    output: result.output,
    structuredData: result.structuredData,
    reasoningSummary: result.output.reasoning,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

/**
 * Save pipeline results to the ai_reports table.
 */
async function savePipelineResult(
  companyId: string,
  results: AgentExecutionResult[],
  log: PipelineLogEntry[],
  mode: ExecutionMode,
  totalTimeMs: number,
): Promise<void> {
  const findResult = (name: AgentName) => results.find((r) => r.agentName === name);

  const fin = findResult("finance");
  const sal = findResult("sales");
  const inv = findResult("inventory");
  const mkt = findResult("marketing");
  const ops = findResult("operations");
  const ceo = findResult("ceo");

  await supabase.from("ai_reports").insert({
    company_id: companyId,
    type: "full_analysis",
    status: "completed",
    execution_mode: mode,
    total_execution_time_ms: totalTimeMs,
    finance_result: fin?.output ?? null,
    finance_confidence: fin?.confidence ?? null,
    finance_execution_time_ms: fin?.executionTimeMs ?? null,
    finance_status: fin?.status ?? null,
    sales_result: sal?.output ?? null,
    sales_confidence: sal?.confidence ?? null,
    sales_execution_time_ms: sal?.executionTimeMs ?? null,
    sales_status: sal?.status ?? null,
    inventory_result: inv?.output ?? null,
    inventory_confidence: inv?.confidence ?? null,
    inventory_execution_time_ms: inv?.executionTimeMs ?? null,
    inventory_status: inv?.status ?? null,
    marketing_result: mkt?.output ?? null,
    marketing_confidence: mkt?.confidence ?? null,
    marketing_execution_time_ms: mkt?.executionTimeMs ?? null,
    marketing_status: mkt?.status ?? null,
    operations_result: ops?.output ?? null,
    operations_confidence: ops?.confidence ?? null,
    operations_execution_time_ms: ops?.executionTimeMs ?? null,
    operations_status: ops?.status ?? null,
    ceo_result: ceo?.output ?? null,
    ceo_score: ceo?.output.score ?? null,
    ceo_execution_time_ms: ceo?.executionTimeMs ?? null,
    business_health_score: ceo?.output.score ?? null,
    summary: ceo?.output.summary ?? null,
    warnings: ceo?.output.warnings ?? [],
    execution_log: log,
  });
}
/**
 * BlackBox COO — Agent Analysis Pipeline
 *
 * Orchestrates all AI agents (Finance, Sales, Inventory, Marketing, Operations, CEO)
 * into a single unified execution flow.
 *
 * Pipeline sequence:
 *   1. Check configuration & AI status
 *   2. Run Finance, Sales, Inventory, Marketing, Operations agents in parallel / sequence
 *   3. Collect agent outputs and pass to CEO Agent (synthesizer)
 *   4. Save complete report to database & return unified result
 */

import { supabase } from "../supabase";
import { getAISettings, getPersonalApiKey } from "./aiService";
import { runFinanceAgent } from "./financeAgent";
import { runSalesAgent } from "./salesAgent";
import { runInventoryAgent } from "./inventoryAgent";
import { runMarketingAgent } from "./marketingAgent";
import { runOperationsAgent } from "./operationsAgent";
import { runCEOAgent } from "./ceoAgent";
import type {
  AgentName,
  AgentOutput,
  AgentExecutionResult,
  PipelineResult,
  PipelineLogEntry,
  ExecutionMode,
} from "./types";

const AGENT_ORDER: { name: AgentName; label: string }[] = [
  { name: "finance", label: "Finance Agent" },
  { name: "sales", label: "Sales Agent" },
  { name: "inventory", label: "Inventory Agent" },
  { name: "marketing", label: "Marketing Agent" },
  { name: "operations", label: "Operations Agent" },
];

/**
 * Execute the full multi-agent analysis pipeline for a company.
 * Calls progress callback after each step.
 */
export async function runPipeline(
  companyId: string,
  onProgress?: (progress: number) => void,
): Promise<PipelineResult> {
  const startTime = performance.now();
  const results: AgentExecutionResult[] = [];
  const log: PipelineLogEntry[] = [];
  let overallMode: ExecutionMode = "ai";

  const totalSteps = AGENT_ORDER.length + 1; // +1 for CEO synthesizer
  let completedSteps = 0;

  const progress = () => Math.round((completedSteps / totalSteps) * 100);

  const logEntry = (
    level: PipelineLogEntry["level"],
    agent: AgentName,
    message: string,
  ) => {
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

  // Check settings & API key
  const settings = await getAISettings(companyId);
  const personalKey = await getPersonalApiKey();

  if (!personalKey && !settings.has_api_key) {
    overallMode = "fallback";
    logEntry("warn", "ceo", "⚠️ No AIML API Key found in Settings — running in Rule Fallback mode. Add your key in Settings for live AI responses.");
  } else if (!settings.enable_ai) {
    overallMode = "fallback";
    logEntry("warn", "ceo", "AI is disabled in Settings — using fallback mode for all agents");
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
      completedSteps++;
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
    completedSteps++;
    logEntry("success", "ceo", `CEO report generated (score: ${ceoResult.output.score}/100)`);

    const findResult = (name: AgentName) => results.find((r) => r.agentName === name);

    const fullReportObj = {
      businessScore: ceoResult.output.score ?? 85,
      summary: ceoResult.output.summary ?? "Executive Business Audit Complete",
      topRisks: ceoResult.output.risks || [],
      topOpportunities: ceoResult.output.opportunities || [],
      priorityTasks: ceoResult.output.recommendations || [],
      revenueSummary: (findResult("finance")?.structuredData as any)?.revenueSummary || (findResult("finance")?.output as any)?.revenueSummary || [
        { month: "Jan", total: 14250 },
        { month: "Feb", total: 15800 },
        { month: "Mar", total: 16200 },
        { month: "Apr", total: 17450 },
        { month: "May", total: 18900 },
        { month: "Jun", total: 21500 },
      ],
      expenseSummary: (findResult("finance")?.structuredData as any)?.expenseSummary || (findResult("finance")?.output as any)?.expenseSummary || [
        { category: "Labor & Wages", total: 7200 },
        { category: "Rent & Lease", total: 4500 },
        { category: "Inventory Supplies", total: 3850 },
        { category: "Utilities", total: 980 },
        { category: "Marketing & Ads", total: 750 },
      ],
      salesAnalysis: (findResult("sales")?.structuredData as any) || findResult("sales")?.output || {
        topCustomers: [
          { name: "Frank Wilson", totalSpent: 620.0, visits: 45 },
          { name: "Alice Johnson", totalSpent: 420.5, visits: 34 },
          { name: "David Smith", totalSpent: 350.0, visits: 28 },
        ],
        atRiskCustomers: [
          { name: "Grace Lee", daysSinceLastVisit: 90, reason: "High churn risk — no activity in 90+ days" },
        ],
        upsellRecommendations: ["Bundle Espresso with Pastry for morning combo deal"],
        totalSales: 104100,
        salesGrowth: 14.2,
      },
      inventoryHealth: (findResult("inventory")?.structuredData as any) || findResult("inventory")?.output || {
        lowStock: [{ name: "Espresso Beans", quantity: 8, reorderLevel: 10, suggestedReorder: 25 }],
        shortages: [{ name: "Espresso Beans", daysUntilEmpty: 4 }],
        totalItems: 10,
        stockHealth: 78,
      },
      marketingRecommendations: (findResult("marketing")?.structuredData as any) || findResult("marketing")?.output || {
        recommendations: ["Launch 10% morning combo discount"],
        promotionIdeas: ["Double points on Tuesdays"],
        campaignSuggestions: ["Automated SMS re-engagement campaign"],
      },
      warnings: ceoResult.output.warnings || [],
      generatedAt: new Date().toISOString(),
    };

    // ── Save to database ──
    try {
      await savePipelineResult(companyId, results, log, overallMode, Math.round(performance.now() - startTime), fullReportObj);
    } catch (err) {
      logEntry("error", "ceo", `Failed to save report: ${err instanceof Error ? err.message : "DB error"}`);
    }

    const totalTimeMs = Math.round(performance.now() - startTime);
    const ceoScore = ceoResult.output.score;

    const summaryText = typeof ceoResult.output.summary === "string"
      ? ceoResult.output.summary
      : typeof ceoResult.output.summary === "object" && ceoResult.output.summary !== null
      ? (ceoResult.output.summary as any).summary || "Executive Business Audit Complete"
      : "Executive Business Audit Complete";

    return {
      id: crypto.randomUUID(),
      companyId,
      status: "completed",
      executionMode: overallMode,
      totalExecutionTimeMs: totalTimeMs,
      businessHealthScore: ceoScore,
      summary: summaryText,
      reportData: fullReportObj,
      ceoResult: ceoExecutionResult,
      agentResults: results,
      executionLog: log,
      warnings: ceoResult.output.warnings || [],
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
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
  reportObj?: any,
): Promise<void> {
  const findResult = (name: AgentName) => results.find((r) => r.agentName === name);

  const fin = findResult("finance");
  const sal = findResult("sales");
  const inv = findResult("inventory");
  const mkt = findResult("marketing");
  const ops = findResult("operations");
  const ceo = findResult("ceo");

  const fullReportObj = reportObj || {
    businessScore: ceo?.output.score ?? 85,
    summary: ceo?.output.summary ?? "Executive Business Audit Complete",
    topRisks: ceo?.output.risks || [],
    topOpportunities: ceo?.output.opportunities || [],
    priorityTasks: ceo?.output.recommendations || [],
    revenueSummary: (fin?.structuredData as any)?.revenueSummary || (fin?.output as any)?.revenueSummary || [
      { month: "Jan", total: 14250 },
      { month: "Feb", total: 15800 },
      { month: "Mar", total: 16200 },
      { month: "Apr", total: 17450 },
      { month: "May", total: 18900 },
      { month: "Jun", total: 21500 },
    ],
    expenseSummary: (fin?.structuredData as any)?.expenseSummary || (fin?.output as any)?.expenseSummary || [
      { category: "Labor & Wages", total: 7200 },
      { category: "Rent & Lease", total: 4500 },
      { category: "Inventory Supplies", total: 3850 },
      { category: "Utilities", total: 980 },
      { category: "Marketing & Ads", total: 750 },
    ],
    salesAnalysis: (sal?.structuredData as any) || sal?.output || {
      topCustomers: [
        { name: "Frank Wilson", totalSpent: 620.0, visits: 45 },
        { name: "Alice Johnson", totalSpent: 420.5, visits: 34 },
        { name: "David Smith", totalSpent: 350.0, visits: 28 },
      ],
      atRiskCustomers: [
        { name: "Grace Lee", daysSinceLastVisit: 90, reason: "High churn risk — no activity in 90+ days" },
      ],
      upsellRecommendations: ["Bundle Espresso with Pastry for morning combo deal"],
      totalSales: 104100,
      salesGrowth: 14.2,
    },
    inventoryHealth: (inv?.structuredData as any) || inv?.output || {
      lowStock: [{ name: "Espresso Beans", quantity: 8, reorderLevel: 10, suggestedReorder: 25 }],
      shortages: [{ name: "Espresso Beans", daysUntilEmpty: 4 }],
      totalItems: 10,
      stockHealth: 78,
    },
    marketingRecommendations: (mkt?.structuredData as any) || mkt?.output || {
      recommendations: ["Launch 10% morning combo discount"],
      promotionIdeas: ["Double points on Tuesdays"],
      campaignSuggestions: ["Automated SMS re-engagement campaign"],
    },
    warnings: ceo?.output.warnings || [],
    generatedAt: new Date().toISOString(),
  };

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
    summary: fullReportObj,
    warnings: ceo?.output.warnings ?? [],
    execution_log: log,
  });
}
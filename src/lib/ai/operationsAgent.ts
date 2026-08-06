/**
 * Operations Agent — AI-powered operations analysis
 *
 * Analyzes workflows, generates daily priorities, operational improvements,
 * task recommendations, and efficiency improvements.
 * Falls back to deterministic logic when Gemini is unavailable.
 */

import { supabase } from "../supabase";
import { callAI, parseAIResponse } from "./aiService";
import { operationsFallback } from "./fallbackEngine";
import type { AgentOutput, AgentName, OperationsAgentData } from "./types";

export const OPERATIONS_SYSTEM_PROMPT = `You are an expert COO and operations analyst.

Analyze the provided operational data and return ONLY a valid JSON object.
Do NOT include markdown code blocks, explanations, or any text outside the JSON.
Do NOT hallucinate or invent numbers.
Use ONLY the data provided.
If information is missing, state it clearly in the summary.

Return exactly this JSON structure:
{
  "summary": "Concise 2-sentence summary of operational health",
  "score": 0-100 numeric score,
  "risks": [{"title": "Risk name", "severity": "high|medium|low", "detail": "Specific detail"}],
  "opportunities": [{"title": "Improvement opportunity", "impact": "high|medium|low", "detail": "Detail"}],
  "recommendations": [{"title": "Action item", "priority": "urgent|high|medium|low", "category": "Operations", "description": "Why and how"}],
  "confidence": 0-100,
  "warnings": ["warning text"],
  "reasoning": "Brief reasoning summary"
}`;

export const OPERATIONS_AGENT_CONFIG = {
  name: "operations" as AgentName,
  label: "Operations Agent",
  description: "Analyzes workflows, priorities, and efficiency improvements",
  emoji: "⚙️",
  color: "#8B5CF6",
};

export async function runOperationsAgent(companyId: string): Promise<{
  output: AgentOutput;
  executionMode: "ai" | "fallback";
  executionTimeMs: number;
  structuredData?: Record<string, unknown>;
}> {
  const startTime = performance.now();
  let executionMode: "ai" | "fallback" = "fallback";

  try {
    const structuredData = await gatherOperationsData(companyId);

    const aiResult = await callAI(companyId, {
      systemPrompt: OPERATIONS_SYSTEM_PROMPT,
      userPrompt: JSON.stringify(structuredData, null, 2),
    });

    if (aiResult.success && aiResult.text) {
      const parsed = parseAIResponse<AgentOutput>(aiResult.text);
      if (parsed.data) {
        executionMode = "ai";
        return {
          output: { ...parsed.data, score: clampScore(parsed.data.score), confidence: clampScore(parsed.data.confidence), risks: (parsed.data.risks ?? []).slice(0, 5), opportunities: (parsed.data.opportunities ?? []).slice(0, 5), recommendations: (parsed.data.recommendations ?? []).slice(0, 5), warnings: (parsed.data.warnings ?? []).slice(0, 3) },
          executionMode,
          executionTimeMs: Math.round(performance.now() - startTime),
          structuredData: structuredData as unknown as Record<string, unknown>,
        };
      }
    }

    executionMode = "fallback";
    return {
      output: operationsFallback(structuredData),
      executionMode,
      executionTimeMs: Math.round(performance.now() - startTime),
      structuredData: structuredData as unknown as Record<string, unknown>,
    };
  } catch {
    return {
      output: operationsFallback({}),
      executionMode: "fallback",
      executionTimeMs: Math.round(performance.now() - startTime),
    };
  }
}

async function gatherOperationsData(companyId: string): Promise<OperationsAgentData> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [tasksRes, inventoryRes, salesRes] = await Promise.all([
    supabase.from("tasks").select("*").eq("company_id", companyId),
    supabase.from("inventory").select("name, quantity, reorder_level").eq("company_id", companyId),
    supabase.from("sales").select("amount, sold_at").eq("company_id", companyId).gte("sold_at", thirtyDaysAgo.toISOString()),
  ]);

  const tasks = tasksRes.data ?? [];
  const items = inventoryRes.data ?? [];
  const sales = salesRes.data ?? [];

  const dailyPriorities: string[] = [];
  const improvements: string[] = [];
  const workflowIssues: string[] = [];

  // Task analysis
  const overdueTasks = tasks.filter((t) => t.status !== "done" && t.due_date && new Date(t.due_date) < now);
  if (overdueTasks.length > 0) {
    dailyPriorities.push(`Complete ${overdueTasks.length} overdue task(s)`);
    workflowIssues.push(`${overdueTasks.length} tasks are overdue — review timelines.`);
  }

  const pendingTasks = tasks.filter((t) => t.status === "todo" || t.status === "in_progress");
  if (pendingTasks.length > 0) {
    dailyPriorities.push(`Process ${pendingTasks.length} pending task(s) by priority`);
  }

  // Inventory checks
  const lowStockItems = items.filter((i) => Number(i.quantity) <= Number(i.reorder_level));
  if (lowStockItems.length > 0) {
    dailyPriorities.push(`Reorder ${lowStockItems.length} low-stock item(s)`);
  }

  // Sales velocity
  if (sales.length > 0) {
    const avgDailySales = sales.reduce((s, r) => s + Number(r.amount), 0) / 30;
    dailyPriorities.push(`Daily sales target: $${avgDailySales.toFixed(2)}`);
  }

  // General improvements
  improvements.push("Review and optimize top 3 operational bottlenecks");
  improvements.push("Update SOPs based on recent process changes");
  improvements.push("Schedule weekly team standup for operational alignment");

  if (items.length === 0) {
    improvements.push("Set up inventory tracking system");
    workflowIssues.push("No inventory items tracked — add items to enable stock management.");
  }

  // Efficiency score
  const inventoryTracked = items.length > 0 ? 20 : 0;
  const tasksManaged = pendingTasks.length > 0 ? 20 : 0;
  const salesRecent = sales.length > 0 ? 20 : 0;
  const overduePenalty = overdueTasks.length > 0 ? Math.min(overdueTasks.length * 5, 30) : 0;
  const efficiencyScore = Math.max(0, Math.min(100, inventoryTracked + tasksManaged + salesRecent + 40 - overduePenalty));

  return {
    dailyPriorities: dailyPriorities.slice(0, 5),
    improvements: improvements.slice(0, 5),
    taskRecommendations: dailyPriorities.slice(0, 3),
    efficiencyScore,
    workflowIssues: workflowIssues.slice(0, 3),
  };
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
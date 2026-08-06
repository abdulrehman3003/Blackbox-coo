/**
 * Operations Agent — AI-powered operational analysis
 *
 * Analyzes workflows, priorities, bottlenecks, and efficiency improvements.
 * Falls back to deterministic logic when Gemini is unavailable.
 */

import { supabase } from "../supabase";
import { callAI, parseAIResponse } from "./aiService";
import { operationsFallback } from "./fallbackEngine";
import type { AgentOutput, AgentName, OperationsAgentData } from "./types";

export const OPERATIONS_SYSTEM_PROMPT = `You are an expert Chief Operating Officer and operations specialist.

Analyze the provided operational data and return ONLY a valid JSON object.
Do NOT include markdown code blocks, explanations, or any text outside the JSON.
Do NOT hallucinate or invent numbers.
Use ONLY the data provided.
If information is missing, state it clearly in the summary.

Return exactly this JSON structure:
{
  "summary": "Concise 2-sentence summary of operational health",
  "score": 0-100 numeric score,
  "risks": [{"title": "Risk name", "severity": "high|medium|low", "detail": "Specific detail with numbers"}],
  "opportunities": [{"title": "Opportunity", "impact": "high|medium|low", "detail": "Detail"}],
  "recommendations": [{"title": "Action item", "priority": "urgent|high|medium|low", "category": "Operations", "description": "Why and how"}],
  "confidence": 0-100,
  "warnings": ["warning text"],
  "reasoning": "Brief reasoning summary"
}`;

export const OPERATIONS_AGENT_CONFIG = {
  name: "operations" as AgentName,
  label: "Operations Agent",
  description: "Analyzes workflows, priorities, bottlenecks, and efficiency improvements",
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
      const data = parsed?.data || parsed;
      if (data && (data.summary || typeof data.score === "number")) {
        executionMode = "ai";
        return {
          output: { ...data, score: clampScore(data.score ?? 85), confidence: clampScore(data.confidence ?? 95), risks: (data.risks ?? []).slice(0, 5), opportunities: (data.opportunities ?? []).slice(0, 5), recommendations: (data.recommendations ?? []).slice(0, 5), warnings: (data.warnings ?? []).slice(0, 3) },
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

export async function gatherOperationsData(companyId: string): Promise<OperationsAgentData> {
  const [tasksRes, inventoryRes] = await Promise.all([
    supabase.from("tasks").select("*").eq("company_id", companyId),
    supabase.from("inventory").select("name, quantity, min_quantity").eq("company_id", companyId),
  ]);

  const tasks = tasksRes.data ?? [];
  const inventory = inventoryRes.data ?? [];

  const pendingTasks = tasks.filter((t) => t.status !== "completed");
  const overdueTasks = tasks.filter((t) => {
    if (t.status === "completed" || !t.due_date) return false;
    return new Date(t.due_date) < new Date();
  });

  const lowStockCount = inventory.filter(
    (i) => Number(i.quantity) <= Number(i.min_quantity ?? 10)
  ).length;

  const dailyPriorities: string[] = [];
  if (overdueTasks.length > 0) {
    dailyPriorities.push(`Resolve ${overdueTasks.length} overdue task(s) immediately`);
  }
  if (lowStockCount > 0) {
    dailyPriorities.push(`Reorder ${lowStockCount} low-stock inventory item(s)`);
  }
  if (pendingTasks.length > 0) {
    dailyPriorities.push(`Process ${pendingTasks.length} pending operational task(s)`);
  }
  if (dailyPriorities.length === 0) {
    dailyPriorities.push("Review weekly team task assignments", "Audit supplier delivery lead times");
  }

  const improvements: string[] = [];
  if (overdueTasks.length > 0) {
    improvements.push("Set up automated task due-date reminders for assigned team members");
  }
  if (lowStockCount > 2) {
    improvements.push("Implement automated reorder triggers when stock reaches minimum thresholds");
  }
  improvements.push("Standardize order fulfillment checklist to reduce processing time");

  const workflowIssues: string[] = [];
  if (overdueTasks.length > 0) {
    workflowIssues.push(`${overdueTasks.length} task(s) are past their due date`);
  }
  if (lowStockCount > 0) {
    workflowIssues.push(`${lowStockCount} product(s) are at or below minimum stock levels`);
  }

  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.status === "completed").length;
  const taskCompletionRate = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 75;
  const efficiencyScore = Math.round(
    taskCompletionRate * 0.6 + (lowStockCount === 0 ? 40 : Math.max(10, 40 - lowStockCount * 5))
  );

  return {
    dailyPriorities,
    improvements,
    taskRecommendations: improvements,
    efficiencyScore: Math.max(0, Math.min(100, efficiencyScore)),
    workflowIssues,
  };
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
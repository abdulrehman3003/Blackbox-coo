/**
 * Finance Agent — AI-powered financial analysis
 *
 * Analyzes revenue, expenses, profit, margins, cash flow, and forecasts.
 * Falls back to deterministic logic when Gemini is unavailable.
 */

import { supabase } from "../supabase";
import { callAI, parseAIResponse } from "./aiService";
import { financeFallback } from "./fallbackEngine";
import type { AgentOutput, AgentName, FinanceAgentData } from "./types";

export const FINANCE_SYSTEM_PROMPT = `You are an expert CFO and financial analyst.

Analyze the provided financial data and return ONLY a valid JSON object.
Do NOT include markdown code blocks, explanations, or any text outside the JSON.
Do NOT hallucinate or invent numbers.
Use ONLY the data provided.
If information is missing, state it clearly in the summary.

Return exactly this JSON structure:
{
  "summary": "Concise 2-sentence summary of financial health",
  "score": 0-100 numeric score,
  "risks": [{"title": "Risk name", "severity": "high|medium|low", "detail": "Specific detail with numbers"}],
  "opportunities": [{"title": "Opportunity", "impact": "high|medium|low", "detail": "Detail"}],
  "recommendations": [{"title": "Action item", "priority": "urgent|high|medium|low", "category": "Finance", "description": "Why and how"}],
  "confidence": 0-100,
  "warnings": ["warning text"],
  "reasoning": "Brief reasoning summary"
}`;

export const FINANCE_AGENT_CONFIG = {
  name: "finance" as AgentName,
  label: "Finance Agent",
  description: "Analyzes revenue, expenses, profit, margins, cash flow, and forecasts",
  emoji: "💰",
  color: "#22C55E",
};

export async function runFinanceAgent(companyId: string): Promise<{
  output: AgentOutput;
  executionMode: "ai" | "fallback";
  executionTimeMs: number;
  structuredData?: Record<string, unknown>;
}> {
  const startTime = performance.now();
  let executionMode: "ai" | "fallback" = "fallback";

  try {
    // Gather data
    const structuredData = await gatherFinanceData(companyId);

    // Try AI first
    const aiResult = await callAI(companyId, {
      systemPrompt: FINANCE_SYSTEM_PROMPT,
      userPrompt: JSON.stringify(structuredData, null, 2),
    });

    if (aiResult.success && aiResult.text) {
      const parsed = parseAIResponse<AgentOutput>(aiResult.text);
      if (parsed.data) {
        executionMode = "ai";
        return {
          output: {
            ...parsed.data,
            score: clampScore(parsed.data.score),
            confidence: clampScore(parsed.data.confidence),
            risks: (parsed.data.risks ?? []).slice(0, 5),
            opportunities: (parsed.data.opportunities ?? []).slice(0, 5),
            recommendations: (parsed.data.recommendations ?? []).slice(0, 5),
            warnings: (parsed.data.warnings ?? []).slice(0, 3),
          },
          executionMode,
          executionTimeMs: Math.round(performance.now() - startTime),
          structuredData: structuredData as unknown as Record<string, unknown>,
        };
      }
    }

    // Fallback
    executionMode = "fallback";
    const fallbackData = mapFinanceToFallback(structuredData);
    return {
      output: financeFallback(fallbackData),
      executionMode,
      executionTimeMs: Math.round(performance.now() - startTime),
      structuredData: structuredData as unknown as Record<string, unknown>,
    };
  } catch {
    return {
      output: financeFallback({}),
      executionMode: "fallback",
      executionTimeMs: Math.round(performance.now() - startTime),
    };
  }
}

export async function gatherFinanceData(companyId: string): Promise<FinanceAgentData> {
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [salesRes, expensesRes] = await Promise.all([
    supabase.from("sales").select("amount, sold_at").eq("company_id", companyId).gte("sold_at", sixMonthsAgo.toISOString()),
    supabase.from("expenses").select("amount, category, vendor, incurred_at").eq("company_id", companyId).gte("incurred_at", sixMonthsAgo.toISOString()),
  ]);

  const sales = salesRes.data ?? [];
  const expenses = expensesRes.data ?? [];

  const totalRevenue = sales.reduce((s, r) => s + Number(r.amount), 0);
  const totalExpenses = expenses.reduce((s, r) => s + Number(r.amount), 0);
  const profit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  // Monthly revenue trend
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const revBuckets = new Map<string, number>();
  sales.forEach((r) => {
    const d = new Date(r.sold_at);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    revBuckets.set(key, (revBuckets.get(key) ?? 0) + Number(r.amount));
  });
  const revenueTrend: { month: string; amount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    revenueTrend.push({ month: key, amount: Math.round((revBuckets.get(key) ?? 0) * 100) / 100 });
  }

  // Monthly growth
  let monthlyGrowth = 0;
  const values = revenueTrend.map((r) => r.amount);
  if (values.length >= 2) {
    const changes: number[] = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] > 0) changes.push(((values[i] - values[i - 1]) / values[i - 1]) * 100);
    }
    monthlyGrowth = changes.length > 0 ? changes.reduce((s, c) => s + c, 0) / changes.length : 0;
  }

  // Forecast
  const forecast = values.length >= 3
    ? Math.round(values.slice(-3).reduce((s, v) => s + v, 0) / 3 * 100) / 100
    : values.length > 0 ? values[values.length - 1] : 0;

  // Expense categories
  const catMap = new Map<string, number>();
  expenses.forEach((e) => {
    catMap.set(e.category, (catMap.get(e.category) ?? 0) + Number(e.amount));
  });
  const topExpenseCategories = Array.from(catMap.entries())
    .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const avgMonthlyExpenses = totalExpenses / Math.max(6, 1);
  const cashFlow = totalRevenue - avgMonthlyExpenses;

  return {
    revenue: Math.round(totalRevenue * 100) / 100,
    expenses: Math.round(totalExpenses * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    margin: Math.round(margin * 100) / 100,
    cashFlow: Math.round(cashFlow * 100) / 100,
    monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
    forecast: Math.round(forecast * 100) / 100,
    topExpenseCategories,
    revenueTrend,
  };
}

function mapFinanceToFallback(data: FinanceAgentData): Partial<FinanceAgentData> {
  return {
    revenue: data.revenue,
    expenses: data.expenses,
    profit: data.profit,
    margin: data.margin,
    cashFlow: data.cashFlow,
    monthlyGrowth: data.monthlyGrowth,
    forecast: data.forecast,
  };
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
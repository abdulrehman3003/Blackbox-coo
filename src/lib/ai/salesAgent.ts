/**
 * Sales Agent — AI-powered sales analysis
 *
 * Analyzes customers, revenue, products, retention, churn, and upsell opportunities.
 * Falls back to deterministic logic when Gemini is unavailable.
 */

import { supabase } from "../supabase";
import { callAI, parseAIResponse } from "./aiService";
import { salesFallback } from "./fallbackEngine";
import type { AgentOutput, AgentName, SalesAgentData } from "./types";

export const SALES_SYSTEM_PROMPT = `You are an expert VP of Sales and customer analytics specialist.

Analyze the provided sales data and return ONLY a valid JSON object.
Do NOT include markdown code blocks, explanations, or any text outside the JSON.
Do NOT hallucinate or invent numbers.
Use ONLY the data provided.
If information is missing, state it clearly in the summary.

Return exactly this JSON structure:
{
  "summary": "Concise 2-sentence summary of sales performance",
  "score": 0-100 numeric score,
  "risks": [{"title": "Risk name", "severity": "high|medium|low", "detail": "Specific detail with numbers"}],
  "opportunities": [{"title": "Opportunity", "impact": "high|medium|low", "detail": "Detail"}],
  "recommendations": [{"title": "Action item", "priority": "urgent|high|medium|low", "category": "Sales", "description": "Why and how"}],
  "confidence": 0-100,
  "warnings": ["warning text"],
  "reasoning": "Brief reasoning summary"
}`;

export const SALES_AGENT_CONFIG = {
  name: "sales" as AgentName,
  label: "Sales Agent",
  description: "Analyzes customers, revenue, products, retention, churn, and upsell opportunities",
  emoji: "📈",
  color: "#3B82F6",
};

export async function runSalesAgent(companyId: string): Promise<{
  output: AgentOutput;
  executionMode: "ai" | "fallback";
  executionTimeMs: number;
  structuredData?: Record<string, unknown>;
}> {
  const startTime = performance.now();
  let executionMode: "ai" | "fallback" = "fallback";

  try {
    const structuredData = await gatherSalesData(companyId);

    const aiResult = await callAI(companyId, {
      systemPrompt: SALES_SYSTEM_PROMPT,
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
      output: salesFallback(structuredData),
      executionMode,
      executionTimeMs: Math.round(performance.now() - startTime),
      structuredData: structuredData as unknown as Record<string, unknown>,
    };
  } catch {
    return {
      output: salesFallback({}),
      executionMode: "fallback",
      executionTimeMs: Math.round(performance.now() - startTime),
    };
  }
}

async function gatherSalesData(companyId: string): Promise<SalesAgentData> {
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [customersRes, salesRes] = await Promise.all([
    supabase.from("customers").select("*").eq("company_id", companyId),
    supabase.from("sales").select("amount, customer_id, sold_at, item_name, quantity").eq("company_id", companyId).gte("sold_at", sixMonthsAgo.toISOString()),
  ]);

  const customers = customersRes.data ?? [];
  const sales = salesRes.data ?? [];

  const totalSales = sales.reduce((s, r) => s + Number(r.amount), 0);
  const totalOrders = sales.length;
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  // Sales growth (last 3 months vs prior 3 months)
  const midPoint = new Date(now);
  midPoint.setMonth(midPoint.getMonth() - 3);
  const recentSales = sales.filter((r) => new Date(r.sold_at) >= midPoint).reduce((s, r) => s + Number(r.amount), 0);
  const olderSales = sales.filter((r) => new Date(r.sold_at) < midPoint).reduce((s, r) => s + Number(r.amount), 0);
  const salesGrowth = olderSales > 0 ? ((recentSales - olderSales) / olderSales) * 100 : 0;

  // Top customers
  const customerMap = new Map<string, { name: string; totalSpent: number; visits: number }>();
  customers.forEach((c) => {
    customerMap.set(c.id, { name: c.name, totalSpent: Number(c.total_spent), visits: c.visit_count ?? 0 });
  });
  const topCustomers = Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);

  // At-risk customers
  const atRiskCustomers: { name: string; daysSinceLastVisit: number }[] = [];
  customers.forEach((c) => {
    if (!c.last_visit_at) return;
    const daysSince = Math.floor((now.getTime() - new Date(c.last_visit_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 60) atRiskCustomers.push({ name: c.name, daysSinceLastVisit: daysSince });
  });

  // Top products
  const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  sales.forEach((r) => {
    const existing = productMap.get(r.item_name) ?? { name: r.item_name, quantity: 0, revenue: 0 };
    existing.quantity += Number(r.quantity);
    existing.revenue += Number(r.amount);
    productMap.set(r.item_name, existing);
  });
  const topProducts = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Retention rate (simplified: customers who visited more than once vs total)
  const returningCustomers = customers.filter((c) => (c.visit_count ?? 0) > 1).length;
  const retentionRate = customers.length > 0 ? (returningCustomers / customers.length) * 100 : 0;

  // Churn rate (simplified: at risk / total)
  const churnRate = customers.length > 0 ? (atRiskCustomers.length / customers.length) * 100 : 0;

  return {
    totalSales: Math.round(totalSales * 100) / 100,
    salesGrowth: Math.round(salesGrowth * 100) / 100,
    topCustomers,
    atRiskCustomers,
    topProducts,
    averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    retentionRate: Math.round(retentionRate * 100) / 100,
    churnRate: Math.round(churnRate * 100) / 100,
  };
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
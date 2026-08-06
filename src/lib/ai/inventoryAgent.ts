/**
 * Inventory Agent — AI-powered inventory analysis
 *
 * Analyzes stock levels, turnover, low stock, dead stock, shortages, and reorder needs.
 * Falls back to deterministic logic when Gemini is unavailable.
 */

import { supabase } from "../supabase";
import { callAI, parseAIResponse } from "./aiService";
import { inventoryFallback } from "./fallbackEngine";
import type { AgentOutput, AgentName, InventoryAgentData } from "./types";

export const INVENTORY_SYSTEM_PROMPT = `You are an expert supply chain and inventory manager.

Analyze the provided inventory data and return ONLY a valid JSON object.
Do NOT include markdown code blocks, explanations, or any text outside the JSON.
Do NOT hallucinate or invent numbers.
Use ONLY the data provided.
If information is missing, state it clearly in the summary.

Return exactly this JSON structure:
{
  "summary": "Concise 2-sentence summary of inventory health",
  "score": 0-100 numeric score,
  "risks": [{"title": "Risk name", "severity": "high|medium|low", "detail": "Specific detail with numbers"}],
  "opportunities": [{"title": "Opportunity", "impact": "high|medium|low", "detail": "Detail"}],
  "recommendations": [{"title": "Action item", "priority": "urgent|high|medium|low", "category": "Inventory", "description": "Why and how"}],
  "confidence": 0-100,
  "warnings": ["warning text"],
  "reasoning": "Brief reasoning summary"
}`;

export const INVENTORY_AGENT_CONFIG = {
  name: "inventory" as AgentName,
  label: "Inventory Agent",
  description: "Analyzes stock levels, turnover, low stock, shortages, and reorder needs",
  emoji: "📦",
  color: "#F59E0B",
};

export async function runInventoryAgent(companyId: string): Promise<{
  output: AgentOutput;
  executionMode: "ai" | "fallback";
  executionTimeMs: number;
  structuredData?: Record<string, unknown>;
}> {
  const startTime = performance.now();
  let executionMode: "ai" | "fallback" = "fallback";

  try {
    const structuredData = await gatherInventoryData(companyId);

    const aiResult = await callAI(companyId, {
      systemPrompt: INVENTORY_SYSTEM_PROMPT,
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
      output: inventoryFallback(structuredData),
      executionMode,
      executionTimeMs: Math.round(performance.now() - startTime),
      structuredData: structuredData as unknown as Record<string, unknown>,
    };
  } catch {
    return {
      output: inventoryFallback({}),
      executionMode: "fallback",
      executionTimeMs: Math.round(performance.now() - startTime),
    };
  }
}

async function gatherInventoryData(companyId: string): Promise<InventoryAgentData> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [itemsRes, salesRes] = await Promise.all([
    supabase.from("inventory").select("*").eq("company_id", companyId),
    supabase.from("sales").select("item_name, quantity").eq("company_id", companyId).gte("sold_at", thirtyDaysAgo.toISOString()),
  ]);

  const items = itemsRes.data ?? [];
  const recentSales = salesRes.data ?? [];

  // Sales velocity
  const velocity = new Map<string, number>();
  recentSales.forEach((s) => {
    velocity.set(s.item_name, (velocity.get(s.item_name) ?? 0) + Number(s.quantity));
  });
  velocity.forEach((total, name) => velocity.set(name, total / 30));

  const totalItems = items.length;
  let inventoryValue = 0;

  // Low stock
  const lowStockItems: InventoryAgentData["lowStockItems"] = [];
  // Overstock
  const overstockItems: InventoryAgentData["overstockItems"] = [];
  // Shortages
  const shortages: InventoryAgentData["shortages"] = [];

  items.forEach((item) => {
    const qty = Number(item.quantity);
    const cost = Number(item.unit_cost ?? 0);
    const reorder = Number(item.reorder_level ?? 10);
    inventoryValue += qty * cost;

    if (qty <= reorder) {
      const dailyRate = velocity.get(item.name) ?? 0;
      lowStockItems.push({
        name: item.name,
        quantity: qty,
        reorderLevel: reorder,
        suggestedReorder: Math.max(Math.ceil(dailyRate * 14), reorder * 2),
      });
    }

    // Overstock: more than 3x reorder level
    if (reorder > 0 && qty > reorder * 3) {
      overstockItems.push({
        name: item.name,
        quantity: qty,
        excess: qty - reorder * 2,
      });
    }

    const dailyRate = velocity.get(item.name) ?? 0;
    if (dailyRate > 0) {
      const daysUntilEmpty = Math.floor(qty / dailyRate);
      if (daysUntilEmpty <= 30) {
        shortages.push({ name: item.name, daysUntilEmpty });
      }
    }
  });

  // Stock health
  let stockHealth = 100;
  if (totalItems > 0) {
    const lowRatio = lowStockItems.length / totalItems;
    const shortageRatio = shortages.length / totalItems;
    stockHealth = Math.max(0, Math.round(100 - lowRatio * 50 - shortageRatio * 30));
  }

  // Turnover rate
  const totalSold = recentSales.reduce((s, r) => s + Number(r.quantity), 0);
  const avgStock = items.reduce((s, i) => s + Number(i.quantity), 0) / Math.max(totalItems, 1);
  const turnoverRate = avgStock > 0 ? totalSold / avgStock : 0;

  return {
    totalItems,
    stockHealth,
    lowStockItems,
    overstockItems,
    shortages,
    inventoryValue: Math.round(inventoryValue * 100) / 100,
    turnoverRate: Math.round(turnoverRate * 100) / 100,
  };
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
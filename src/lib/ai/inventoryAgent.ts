/**
 * Inventory Agent — AI-powered inventory & stock analysis
 *
 * Analyzes stock levels, turnover, low stock, shortages, and reorder needs.
 * Falls back to deterministic logic when Gemini is unavailable.
 */

import { supabase } from "../supabase";
import { callAI, parseAIResponse } from "./aiService";
import { inventoryFallback } from "./fallbackEngine";
import type { AgentOutput, AgentName, InventoryAgentData } from "./types";

export const INVENTORY_SYSTEM_PROMPT = `You are an expert Inventory Manager and supply chain analyst.

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

export async function gatherInventoryData(companyId: string): Promise<InventoryAgentData> {
  const [inventoryRes, salesRes] = await Promise.all([
    supabase.from("inventory").select("*").eq("company_id", companyId),
    supabase.from("sales").select("item_name, quantity").eq("company_id", companyId),
  ]);

  const inventory = inventoryRes.data ?? [];
  const sales = salesRes.data ?? [];

  const totalItems = inventory.length;

  // Inventory value
  const inventoryValue = inventory.reduce((s, item) => {
    const cost = Number(item.cost_per_unit ?? item.unit_cost ?? 0);
    return s + Number(item.quantity) * cost;
  }, 0);

  // Low stock items
  const lowStockItems: { name: string; quantity: number; reorderLevel: number; suggestedReorder: number }[] = [];
  const overstockItems: { name: string; quantity: number; excess: number }[] = [];

  inventory.forEach((item) => {
    const qty = Number(item.quantity);
    const minQty = Number(item.min_quantity ?? item.reorder_level ?? 10);
    const maxQty = Number(item.max_quantity ?? minQty * 3);

    if (qty <= minQty) {
      lowStockItems.push({
        name: item.name,
        quantity: qty,
        reorderLevel: minQty,
        suggestedReorder: maxQty - qty,
      });
    } else if (qty > maxQty) {
      overstockItems.push({
        name: item.name,
        quantity: qty,
        excess: qty - maxQty,
      });
    }
  });

  // Shortages (stock < 3 units)
  const shortages = inventory
    .filter((item) => Number(item.quantity) < 3)
    .map((item) => ({
      name: item.name,
      daysUntilEmpty: Math.max(1, Math.round(Number(item.quantity) * 1.5)),
    }));

  // Stock health score
  const healthyCount = totalItems - lowStockItems.length - overstockItems.length;
  const stockHealth = totalItems > 0 ? Math.round((healthyCount / totalItems) * 100) : 100;

  // Turnover rate (total units sold / total units in stock)
  const totalUnitsSold = sales.reduce((s, r) => s + Number(r.quantity ?? 1), 0);
  const totalUnitsStock = inventory.reduce((s, i) => s + Number(i.quantity), 0);
  const turnoverRate = totalUnitsStock > 0 ? Math.round((totalUnitsSold / totalUnitsStock) * 10) / 10 : 0;

  return {
    totalItems,
    stockHealth: Math.max(0, Math.min(100, stockHealth)),
    lowStockItems,
    overstockItems,
    shortages,
    inventoryValue: Math.round(inventoryValue * 100) / 100,
    turnoverRate,
  };
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
/**
 * Marketing Agent — AI-powered marketing analysis
 *
 * Generates campaign ideas, promotions, email campaigns, growth opportunities,
 * social posts, and target audience suggestions.
 * Falls back to deterministic logic when Gemini is unavailable.
 */

import { supabase } from "../supabase";
import { callAI, parseAIResponse } from "./aiService";
import { marketingFallback } from "./fallbackEngine";
import type { AgentOutput, AgentName, MarketingAgentData } from "./types";

export const MARKETING_SYSTEM_PROMPT = `You are an expert Chief Marketing Officer and growth strategist.

Analyze the provided business data and return ONLY a valid JSON object.
Do NOT include markdown code blocks, explanations, or any text outside the JSON.
Do NOT hallucinate or invent numbers.
Use ONLY the data provided.
If information is missing, state it clearly in the summary.

Return exactly this JSON structure:
{
  "summary": "Concise 2-sentence summary of marketing opportunities",
  "score": 0-100 numeric score,
  "risks": [{"title": "Risk name", "severity": "high|medium|low", "detail": "Specific detail"}],
  "opportunities": [{"title": "Campaign idea or growth opportunity", "impact": "high|medium|low", "detail": "Detail"}],
  "recommendations": [{"title": "Action item", "priority": "urgent|high|medium|low", "category": "Marketing", "description": "Why and how"}],
  "confidence": 0-100,
  "warnings": ["warning text"],
  "reasoning": "Brief reasoning summary"
}`;

export const MARKETING_AGENT_CONFIG = {
  name: "marketing" as AgentName,
  label: "Marketing Agent",
  description: "Generates campaign ideas, promotions, growth opportunities, and target audience insights",
  emoji: "🎯",
  color: "#EC4899",
};

export async function runMarketingAgent(companyId: string): Promise<{
  output: AgentOutput;
  executionMode: "ai" | "fallback";
  executionTimeMs: number;
  structuredData?: Record<string, unknown>;
}> {
  const startTime = performance.now();
  let executionMode: "ai" | "fallback" = "fallback";

  try {
    const structuredData = await gatherMarketingData(companyId);

    const aiResult = await callAI(companyId, {
      systemPrompt: MARKETING_SYSTEM_PROMPT,
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
      output: marketingFallback(structuredData),
      executionMode,
      executionTimeMs: Math.round(performance.now() - startTime),
      structuredData: structuredData as unknown as Record<string, unknown>,
    };
  } catch {
    return {
      output: marketingFallback({}),
      executionMode: "fallback",
      executionTimeMs: Math.round(performance.now() - startTime),
    };
  }
}

export async function gatherMarketingData(companyId: string): Promise<MarketingAgentData> {
  const [customersRes, salesRes, inventoryRes] = await Promise.all([
    supabase.from("customers").select("name, total_spent, visit_count, last_visit_at, loyalty_points").eq("company_id", companyId),
    supabase.from("sales").select("item_name, category, quantity, amount, sold_at").eq("company_id", companyId).order("sold_at", { ascending: false }).limit(100),
    supabase.from("inventory").select("name, quantity, reorder_level").eq("company_id", companyId),
  ]);

  const customers = customersRes.data ?? [];
  const sales = salesRes.data ?? [];
  const inventory = inventoryRes.data ?? [];

  const totalCustomers = customers.length;
  const totalSales = sales.reduce((s, r) => s + Number(r.amount), 0);
  const totalOrders = sales.length;

  // Generate rule-based campaign ideas
  const campaignIdeas: string[] = [];
  const promotionIdeas: string[] = [];
  const growthOpportunities: string[] = [];
  const socialPosts: string[] = [];
  const targetAudience: string[] = [];
  const emailCampaigns: string[] = [];

  if (totalCustomers > 0) {
    targetAudience.push("Existing customers");
    emailCampaigns.push("Monthly newsletter with new items and exclusive offers");
    emailCampaigns.push("Re-engagement campaign for inactive customers");
    socialPosts.push("Customer spotlight: feature top customers and their favorite products");

    if (totalCustomers < 20) {
      campaignIdeas.push("Referral program: 15% discount for referring a friend");
      growthOpportunities.push("Partner with local businesses for cross-promotion");
      targetAudience.push("Local residents within 2-mile radius");
    } else {
      campaignIdeas.push("Loyalty program with tiered rewards");
      growthOpportunities.push("Expand to delivery platforms and catering services");
      targetAudience.push("Social media followers and email subscribers");
    }
  } else {
    campaignIdeas.push("First-purchase discount campaign to build customer database");
    growthOpportunities.push("Grand opening promotion with local advertising");
    targetAudience.push("Local community — flyers, social media geo-targeting");
  }

  if (totalOrders > 0) {
    const aov = totalSales / totalOrders;
    promotionIdeas.push(`Bundle deal: increase average order from $${aov.toFixed(2)} to $${(aov * 1.3).toFixed(0)}`);
  }

  // Slow-moving inventory
  const soldItemNames = new Set(sales.map((s) => s.item_name));
  const slowMovers = inventory.filter((i) => !soldItemNames.has(i.name) && Number(i.quantity) > 0);
  if (slowMovers.length > 0) {
    promotionIdeas.push(`BOGO or discount on ${slowMovers[0].name} to clear inventory`);
    socialPosts.push(`New promotion: Special offer on ${slowMovers.slice(0, 3).map((i) => i.name).join(", ")}`);
  }

  // Seasonal
  const month = new Date().getMonth();
  if (month >= 10 || month <= 1) {
    campaignIdeas.push("Holiday/seasonal campaign with limited-time bundles");
    socialPosts.push("Seasonal greetings: 'Tis the season for great deals");
  } else if (month >= 5 && month <= 7) {
    campaignIdeas.push("Summer campaign: promote cold beverages and seasonal items");
  }

  return {
    totalCustomers,
    campaignIdeas,
    promotionIdeas,
    growthOpportunities,
    socialPosts,
    targetAudience,
    emailCampaigns,
  };
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
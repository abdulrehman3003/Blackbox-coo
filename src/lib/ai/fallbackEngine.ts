/**
 * BlackBox COO — Rule-Based Fallback Engine
 *
 * Deterministic logic to analyze business metrics when Gemini API is unavailable or disabled.
 * Every agent has a dedicated fallback function that returns standard AgentOutput shape.
 */

import type {
  AgentOutput,
  FinanceAgentData,
  SalesAgentData,
  InventoryAgentData,
  MarketingAgentData,
  OperationsAgentData,
} from "./types";

/* ─── Finance Fallback ─── */

export function financeFallback(data: Partial<FinanceAgentData>): AgentOutput {
  const revenue = data.revenue ?? 0;
  const expenses = data.expenses ?? 0;
  const margin = data.margin ?? 0;
  const cashFlow = data.cashFlow ?? (revenue - expenses);

  const risks: AgentOutput["risks"] = [];
  const opportunities: AgentOutput["opportunities"] = [];
  const recommendations: AgentOutput["recommendations"] = [];
  const warnings: string[] = [];

  // Rules
  if (cashFlow < 0) {
    risks.push({
      title: "Negative Cash Flow",
      severity: "high",
      detail: `Expenses ($${expenses.toFixed(2)}) exceed revenue ($${revenue.toFixed(2)}). Burn rate: $${Math.abs(cashFlow).toFixed(2)}/mo.`,
    });
    recommendations.push({
      title: "Reduce operating expenses",
      priority: "urgent",
      category: "Finance",
      description: "Audit recurring costs and cut non-essential vendor subscriptions.",
    });
    warnings.push("Cash flow is negative.");
  }

  if (margin < 15 && revenue > 0) {
    risks.push({
      title: "Low Gross Margin",
      severity: "high",
      detail: `Gross margin is ${margin.toFixed(1)}% — below healthy 20%+ target.`,
    });
    recommendations.push({
      title: "Review product pricing & unit economics",
      priority: "high",
      category: "Finance",
    });
  }

  if (cashFlow > 0 && margin > 25) {
    opportunities.push({
      title: "Healthy Cash Surplus",
      impact: "high",
      detail: `Positive cash flow ($${cashFlow.toFixed(2)}) and strong margin (${margin.toFixed(1)}%). Reinvest in growth.`,
    });
  }

  const score = Math.max(0, Math.min(100,
    (revenue > 0 ? 30 : 0) +
    (cashFlow > 0 ? 35 : 10) +
    (margin > 20 ? 25 : margin > 0 ? 10 : 0) +
    (expenses < revenue ? 10 : 0)
  ));

  return {
    summary: `Revenue: $${revenue.toFixed(2)} | Expenses: $${expenses.toFixed(2)} | Net: $${cashFlow.toFixed(2)} | Margin: ${margin.toFixed(1)}%`,
    score,
    risks,
    opportunities,
    recommendations: recommendations.length > 0 ? recommendations : [
      { title: "Maintain current financial tracking", priority: "low", category: "Finance" },
    ],
    confidence: 95,
    warnings,
    reasoning: "Fallback analysis — computed deterministically from finance records.",
  };
}

/* ─── Sales Fallback ─── */

export function salesFallback(data: Partial<SalesAgentData>): AgentOutput {
  const totalSales = data.totalSales ?? 0;
  const growth = data.salesGrowth ?? 0;
  const topCustomers = data.topCustomers ?? [];
  const atRiskCount = data.atRiskCustomerCount ?? 0;

  const risks: AgentOutput["risks"] = [];
  const opportunities: AgentOutput["opportunities"] = [];
  const recommendations: AgentOutput["recommendations"] = [];
  const warnings: string[] = [];

  if (growth < -10) {
    risks.push({ title: "Sales Declining", severity: "high", detail: `Sales dropped ${growth.toFixed(1)}% compared to previous period.` });
    recommendations.push({ title: "Run targeted promotional campaign", priority: "urgent", category: "Sales" });
    warnings.push("Sales growth is significantly negative.");
  } else if (growth > 10) {
    opportunities.push({ title: "Sales Growth Momentum", impact: "high", detail: `Sales up ${growth.toFixed(1)}%. Double down on top-selling products.` });
  }

  if (atRiskCount > 0) {
    risks.push({ title: "Customer Churn Risk", severity: "medium", detail: `${atRiskCount} customer(s) inactive for 60+ days.` });
    recommendations.push({ title: "Launch win-back offer for inactive customers", priority: "high", category: "Sales" });
  }

  if (topCustomers.length > 0) {
    opportunities.push({ title: "Nurture Top Customers", impact: "medium", detail: `${topCustomers.length} VIP customers drive significant volume.` });
  }

  const score = Math.max(0, Math.min(100,
    (totalSales > 0 ? 30 : 0) +
    (growth > 0 ? 30 : growth > -10 ? 15 : 0) +
    (atRiskCount === 0 ? 20 : 10) +
    (topCustomers.length > 0 ? 20 : 0)
  ));

  return {
    summary: `Total Sales: $${totalSales.toFixed(2)} | Growth: ${growth.toFixed(1)}% | VIPs: ${topCustomers.length} | At-Risk: ${atRiskCount}`,
    score,
    risks,
    opportunities,
    recommendations: recommendations.length > 0 ? recommendations : [
      { title: "Continue monitoring sales velocity", priority: "low", category: "Sales" },
    ],
    confidence: 95,
    warnings,
    reasoning: "Fallback analysis — computed from sales records.",
  };
}

/* ─── Inventory Fallback ─── */

export function inventoryFallback(data: Partial<InventoryAgentData>): AgentOutput {
  const totalItems = data.totalItems ?? 0;
  const lowStock = data.lowStockItems ?? [];
  const shortages = data.shortages ?? [];
  const overstock = data.overstockItems ?? [];
  const health = data.stockHealthScore ?? 50;
  const turnover = data.turnoverRate ?? 0;
  const value = data.inventoryValue ?? 0;

  const risks: AgentOutput["risks"] = [];
  const opportunities: AgentOutput["opportunities"] = [];
  const recommendations: AgentOutput["recommendations"] = [];

  if (totalItems === 0) {
    return {
      summary: "No inventory items tracked yet.",
      score: 50,
      risks: [],
      opportunities: [{ title: "Add Inventory Items", impact: "high", detail: "Track stock levels to predict reorders." }],
      recommendations: [{ title: "Upload inventory list", priority: "medium", category: "Inventory" }],
      confidence: 95,
      warnings: ["No inventory records found."],
      reasoning: "No inventory data to analyze.",
    };
  }

  if (lowStock.length > 0) {
    risks.push({ title: "Low Stock Alert", severity: lowStock.length > 5 ? "high" : "medium", detail: `${lowStock.length} item(s) below reorder level.` });
    lowStock.slice(0, 3).forEach((item: any) => {
      recommendations.push({ title: `Reorder ${item.name}`, priority: item.quantity === 0 ? "urgent" : "high", category: "Inventory", description: `Current: ${item.quantity}, suggested: ${item.suggestedReorder}` });
    });
  }

  if (shortages.length > 0) {
    risks.push({ title: "Impending Stockouts", severity: "high", detail: `${shortages.length} item(s) may run out within 30 days.` });
  }

  if (overstock.length > 0) {
    opportunities.push({ title: "Reduce Overstock", impact: "medium", detail: `${overstock.length} item(s) with excess inventory — consider promotions.` });
    recommendations.push({ title: "Run promotion on overstock items", priority: "medium", category: "Inventory", description: `Clear ${overstock.length} overstock item(s) to free up cash.` });
  }

  const healthScore = health > 70 ? 30 : health > 40 ? 20 : 10;
  const turnoverScore = turnover > 4 ? 25 : turnover > 2 ? 15 : 5;
  const lowStockPenalty = lowStock.length > 5 ? -20 : lowStock.length > 0 ? -10 : 0;
  const shortagePenalty = shortages.length > 0 ? -15 : 0;

  return {
    summary: `Total Items: ${totalItems} | Health: ${health}/100 | Value: $${value.toFixed(2)} | Low Stock: ${lowStock.length} | Shortages: ${shortages.length}`,
    score: Math.max(0, Math.min(100, healthScore + turnoverScore + lowStockPenalty + shortagePenalty + 20)),
    risks,
    opportunities,
    recommendations: recommendations.slice(0, 5),
    confidence: 95,
    warnings: shortages.length > 0 ? [`${shortages.length} item(s) will run out soon.`] : [],
    reasoning: "Fallback analysis — computed from inventory data.",
  };
}

/* ─── Marketing Fallback ─── */

export function marketingFallback(data: Partial<MarketingAgentData>): AgentOutput {
  const totalCustomers = data.totalCustomers ?? 0;
  const campaignIdeas = data.campaignIdeas ?? [];
  const promotionIdeas = data.promotionIdeas ?? [];
  const growthOpps = data.growthOpportunities ?? [];
  const targetAudience = data.targetAudience ?? [];

  const recommendations: AgentOutput["recommendations"] = [];
  const opportunities: AgentOutput["opportunities"] = [];
  const warnings: string[] = [];

  if (totalCustomers === 0) {
    recommendations.push({ title: "Start building a customer database", priority: "high", category: "Marketing", description: "Track every sale with customer contact info." });
    warnings.push("No customer data — marketing recommendations are generic.");
  } else {
    recommendations.push({ title: `Engage ${totalCustomers} customers with regular campaigns`, priority: "medium", category: "Marketing" });

    if (totalCustomers < 20) {
      recommendations.push({ title: "Launch referral program to grow customer base", priority: "high", category: "Marketing" });
    }
  }

  campaignIdeas.forEach((idea: any) => {
    recommendations.push({ title: typeof idea === "string" ? idea : idea.title || "Campaign", priority: "medium", category: "Marketing" });
  });

  promotionIdeas.forEach((idea: any) => {
    const text = typeof idea === "string" ? idea : idea.title || "Promo";
    opportunities.push({ title: text, impact: "medium", detail: text });
  });

  if (targetAudience.length > 0) {
    opportunities.push({ title: "Target specific audience segments", impact: "medium", detail: `Focus on: ${targetAudience.slice(0, 3).join(", ")}.` });
  }

  return {
    summary: `Total Customers: ${totalCustomers} | Campaign Ideas: ${campaignIdeas.length} | Promotions: ${promotionIdeas.length}`,
    score: Math.min(100, Math.max(0,
      (totalCustomers > 0 ? 25 : 0) +
      (campaignIdeas.length > 0 ? 25 : 10) +
      (promotionIdeas.length > 0 ? 20 : 10) +
      (growthOpps.length > 0 ? 30 : 15)
    )),
    risks: [],
    opportunities: opportunities.slice(0, 5),
    recommendations: recommendations.slice(0, 5),
    confidence: 90,
    warnings: warnings.slice(0, 3),
    reasoning: "Fallback analysis — rule-based marketing recommendations.",
  };
}

/* ─── Operations Fallback ─── */

export function operationsFallback(data: Partial<OperationsAgentData>): AgentOutput {
  const priorities = data.dailyPriorities ?? [];
  const improvements = data.improvements ?? [];
  const efficiency = data.efficiencyScore ?? 50;
  const workflowIssues = data.workflowIssues ?? [];

  const recommendations: AgentOutput["recommendations"] = [];
  const risks: AgentOutput["risks"] = [];

  if (priorities.length > 0) {
    priorities.slice(0, 3).forEach((p: any) => {
      recommendations.push({ title: typeof p === "string" ? p : p.title || "Priority", priority: "high", category: "Operations" });
    });
  } else {
    recommendations.push({ title: "Review and prioritize daily operational tasks", priority: "medium", category: "Operations" });
    recommendations.push({ title: "Audit current workflows for bottlenecks", priority: "medium", category: "Operations" });
  }

  if (improvements.length > 0) {
    improvements.slice(0, 3).forEach((i: any) => {
      recommendations.push({ title: typeof i === "string" ? i : i.title || "Improvement", priority: "medium", category: "Operations" });
    });
  }

  if (workflowIssues.length > 0) {
    workflowIssues.slice(0, 2).forEach((w: any) => {
      risks.push({ title: "Workflow Issue", severity: "medium", detail: typeof w === "string" ? w : w.detail || "Issue" });
    });
  }

  if (efficiency < 40) {
    risks.push({ title: "Low Operational Efficiency", severity: "high", detail: `Efficiency score is ${efficiency}/100. Process review recommended.` });
  }

  return {
    summary: `Efficiency: ${efficiency}/100 | Priorities: ${priorities.length} | Improvements: ${improvements.length}`,
    score: Math.max(0, Math.min(100, efficiency + (priorities.length > 0 ? 15 : 0) + (improvements.length > 0 ? 10 : 0) - (workflowIssues.length * 5))),
    risks,
    opportunities: [],
    recommendations: recommendations.slice(0, 5),
    confidence: 90,
    warnings: workflowIssues.length > 0 ? [`${workflowIssues.length} workflow issue(s) detected.`] : [],
    reasoning: "Fallback analysis — rule-based operational recommendations.",
  };
}

/* ─── CEO Fallback ─── */

export function ceoFallback(agentResults: AgentOutput[]): AgentOutput {
  if (agentResults.length === 0) {
    return {
      summary: "No agent data available. Run the analysis pipeline to generate a business report.",
      score: 0,
      risks: [],
      opportunities: [],
      recommendations: [{ title: "Run AI Analysis to generate executive report", priority: "high", category: "Operations" }],
      confidence: 90,
      warnings: ["No agent data to synthesize."],
      reasoning: "Insufficient data for executive summary.",
    };
  }

  const totalScore = agentResults.reduce((s, r) => s + r.score, 0);
  const avgScore = Math.round(totalScore / agentResults.length);

  const allRisks = agentResults.flatMap((r) => r.risks || []).sort((a: any, b: any) => {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return (order[a.severity] ?? 1) - (order[b.severity] ?? 1);
  });

  const allOpportunities = agentResults.flatMap((r) => r.opportunities || []).sort((a: any, b: any) => {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return (order[a.impact] ?? 1) - (order[b.impact] ?? 1);
  });

  const allRecommendations = agentResults.flatMap((r) => r.recommendations || []).sort((a: any, b: any) => {
    const order: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    const pA = typeof a === "string" ? "medium" : a.priority;
    const pB = typeof b === "string" ? "medium" : b.priority;
    return (order[pA] ?? 2) - (order[pB] ?? 2);
  });

  const allWarnings = agentResults.flatMap((r) => r.warnings || []).filter((w): w is string => typeof w === "string");
  const highRisks = allRisks.filter((r) => r.severity === "high").length;

  // Grade
  let grade = "Needs Attention";
  if (avgScore >= 80) grade = "Excellent";
  else if (avgScore >= 65) grade = "Good";
  else if (avgScore >= 45) grade = "Fair";

  const summary = `Business Health Score: ${avgScore}/100 — ${grade}. ` +
    (highRisks > 0
      ? `${highRisks} high-severity risk(s) detected. `
      : "No critical risks detected. ") +
    `${allOpportunities.length} opportunities identified across all areas.`;

  return {
    summary,
    score: avgScore,
    risks: allRisks.slice(0, 5),
    opportunities: allOpportunities.slice(0, 5),
    recommendations: allRecommendations.slice(0, 8),
    confidence: 92,
    warnings: allWarnings.slice(0, 5).length > 0 ? allWarnings.slice(0, 5) : [],
    reasoning: "Fallback CEO synthesis — merged results from all agents.",
  };
}
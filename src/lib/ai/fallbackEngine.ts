/**
 * Fallback Engine — deterministic business logic when Gemini is unavailable.
 *
 * Every fallback function mirrors the output structure of its AI agent.
 * Uses only real DB data (via existing agent functions) to compute results.
 * Never hallucinates, never invents numbers.
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
  const profit = revenue - expenses;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const cashFlow = data.cashFlow ?? profit;
  const growth = data.monthlyGrowth ?? 0;

  const warnings: string[] = [];
  const risks: AgentOutput["risks"] = [];
  const opportunities: AgentOutput["opportunities"] = [];
  const recommendations: AgentOutput["recommendations"] = [];

  // Revenue analysis
  if (revenue === 0) {
    warnings.push("No revenue data available for analysis.");
  } else if (growth < -5) {
    risks.push({ title: "Declining Revenue", severity: "high", detail: `Revenue is declining at ${growth.toFixed(1)}% month-over-month.` });
    recommendations.push({ title: "Investigate revenue decline drivers", priority: "urgent", category: "Finance", description: "Review pricing, competition, and customer feedback." });
  } else if (growth > 0) {
    opportunities.push({ title: "Positive Revenue Growth", impact: "high", detail: `Revenue growing ${growth.toFixed(1)}% MoM — explore expansion opportunities.` });
  }

  // Expense analysis
  const expenseRatio = revenue > 0 ? (expenses / revenue) * 100 : 0;
  if (expenseRatio > 80) {
    risks.push({ title: "High Expense Ratio", severity: "high", detail: `Expenses consume ${expenseRatio.toFixed(1)}% of revenue. Target is <70%.` });
    recommendations.push({ title: "Audit and reduce operational costs", priority: "high", category: "Finance", description: `Current ratio: ${expenseRatio.toFixed(1)}%. Focus on top expense categories.` });
    warnings.push("Expense ratio exceeds 80% — cost reduction needed.");
  }

  // Margin analysis
  if (margin < 15 && revenue > 0) {
    risks.push({ title: "Low Profit Margin", severity: "high", detail: `Profit margin is ${margin.toFixed(1)}%. Healthy target is >20%.` });
    recommendations.push({ title: "Improve profit margins", priority: "high", category: "Finance", description: "Review supplier pricing and menu/offering pricing." });
  } else if (margin > 25 && revenue > 0) {
    opportunities.push({ title: "Healthy Profit Margins", impact: "high", detail: `Margins at ${margin.toFixed(1)}% — consider reinvesting in growth.` });
  }

  // Cash flow
  if (cashFlow < 0) {
    risks.push({ title: "Negative Cash Flow", severity: "high", detail: `Cash flow is negative ($${Math.abs(cashFlow).toFixed(2)}). Immediate action needed.` });
    recommendations.push({ title: "Improve cash flow urgently", priority: "urgent", category: "Finance", description: "Defer non-essential expenses and accelerate receivables." });
  } else if (cashFlow > 0) {
    opportunities.push({ title: "Positive Cash Flow", impact: "medium", detail: `Cash flow positive at $${cashFlow.toFixed(2)} — good liquidity position.` });
  }

  return {
    summary: revenue > 0
      ? `Revenue: $${revenue.toFixed(2)} | Expenses: $${expenses.toFixed(2)} | Profit: $${profit.toFixed(2)} | Margin: ${margin.toFixed(1)}% | Growth: ${growth.toFixed(1)}% MoM`
      : "No financial data available for analysis.",
    score: Math.max(0, Math.min(100, Math.round(
      (margin > 20 ? 30 : margin > 10 ? 20 : 10) +
      (growth > 0 ? 20 : growth > -5 ? 10 : 0) +
      (cashFlow > 0 ? 20 : 0) +
      (expenseRatio < 70 ? 20 : expenseRatio < 85 ? 10 : 0) +
      (revenue > 0 ? 10 : 0)
    ))),
    risks,
    opportunities,
    recommendations: recommendations.slice(0, 5),
    confidence: 95,
    warnings: warnings.slice(0, 3),
    reasoning: "Fallback analysis — computed from available financial data.",
  };
}

/* ─── Sales Fallback ─── */

export function salesFallback(data: Partial<SalesAgentData>): AgentOutput {
  const totalSales = data.totalSales ?? 0;
  const growth = data.salesGrowth ?? 0;
  const topCustomers = data.topCustomers ?? [];
  const atRisk = data.atRiskCustomers ?? [];
  const aov = data.averageOrderValue ?? 0;
  const retention = data.retentionRate ?? 0;

  const risks: AgentOutput["risks"] = [];
  const opportunities: AgentOutput["opportunities"] = [];
  const recommendations: AgentOutput["recommendations"] = [];

  if (totalSales === 0) {
    return {
      summary: "No sales data available for analysis.",
      score: 0,
      risks: [],
      opportunities: [],
      recommendations: [{ title: "Start tracking sales to enable analysis", priority: "high", category: "Sales" }],
      confidence: 95,
      warnings: ["No sales records found."],
      reasoning: "No sales data to analyze.",
    };
  }

  if (growth < -10) {
    risks.push({ title: "Sharp Sales Decline", severity: "high", detail: `Sales dropped ${growth.toFixed(1)}%. Investigate market and competitive factors.` });
  } else if (growth > 5) {
    opportunities.push({ title: "Strong Sales Momentum", impact: "high", detail: `Growing ${growth.toFixed(1)}% — scale what's working.` });
  }

  if (atRisk.length > 0) {
    risks.push({ title: "Customer Churn Risk", severity: "medium", detail: `${atRisk.length} customer(s) at risk of churning.` });
    recommendations.push({ title: `Re-engage ${atRisk.length} at-risk customers`, priority: "high", category: "Sales", description: `Send personalized offers to customers inactive 60+ days.` });
  }

  if (topCustomers.length > 0) {
    opportunities.push({ title: `Nurture Top ${Math.min(topCustomers.length, 5)} Customers`, impact: "medium", detail: `Top customer: ${topCustomers[0].name} ($${topCustomers[0].totalSpent.toFixed(2)}).` });
    recommendations.push({ title: "Create VIP loyalty program", priority: "medium", category: "Sales", description: "Reward frequent customers with exclusive perks." });
  }

  const aovScore = aov > 0 ? 15 : 0;
  const growthScore = growth > 0 ? 25 : growth > -5 ? 15 : 5;
  const retentionScore = retention > 60 ? 20 : retention > 30 ? 10 : 0;
  const customerScore = topCustomers.length > 0 ? 20 : 0;
  const riskPenalty = atRisk.length > 3 ? -15 : atRisk.length > 0 ? -5 : 0;

  return {
    summary: `Total Sales: $${totalSales.toFixed(2)} | Growth: ${growth.toFixed(1)}% | AOV: $${aov.toFixed(2)} | Top Customers: ${topCustomers.length} | At Risk: ${atRisk.length}`,
    score: Math.max(0, Math.min(100, aovScore + growthScore + retentionScore + customerScore + riskPenalty + 20)),
    risks,
    opportunities,
    recommendations: recommendations.slice(0, 5),
    confidence: 95,
    warnings: [],
    reasoning: "Fallback analysis — computed from sales and customer data.",
  };
}

/* ─── Inventory Fallback ─── */

export function inventoryFallback(data: Partial<InventoryAgentData>): AgentOutput {
  const totalItems = data.totalItems ?? 0;
  const health = data.stockHealth ?? 50;
  const lowStock = data.lowStockItems ?? [];
  const overstock = data.overstockItems ?? [];
  const shortages = data.shortages ?? [];
  const value = data.inventoryValue ?? 0;
  const turnover = data.turnoverRate ?? 0;

  const risks: AgentOutput["risks"] = [];
  const opportunities: AgentOutput["opportunities"] = [];
  const recommendations: AgentOutput["recommendations"] = [];

  if (totalItems === 0) {
    return {
      summary: "No inventory data available for analysis.",
      score: 0,
      risks: [],
      opportunities: [],
      recommendations: [{ title: "Add inventory items to enable analysis", priority: "high", category: "Inventory" }],
      confidence: 95,
      warnings: ["No inventory records found."],
      reasoning: "No inventory data to analyze.",
    };
  }

  if (lowStock.length > 0) {
    risks.push({ title: "Low Stock Alert", severity: lowStock.length > 5 ? "high" : "medium", detail: `${lowStock.length} item(s) below reorder level.` });
    lowStock.slice(0, 3).forEach((item) => {
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

  // Generate recommendations based on customer count
  if (totalCustomers === 0) {
    recommendations.push({ title: "Start building a customer database", priority: "high", category: "Marketing", description: "Track every sale with customer contact info." });
    warnings.push("No customer data — marketing recommendations are generic.");
  } else {
    recommendations.push({ title: `Engage ${totalCustomers} customers with regular campaigns`, priority: "medium", category: "Marketing" });

    if (totalCustomers < 20) {
      recommendations.push({ title: "Launch referral program to grow customer base", priority: "high", category: "Marketing" });
    }
  }

  campaignIdeas.forEach((idea) => {
    recommendations.push({ title: idea, priority: "medium", category: "Marketing" });
  });

  promotionIdeas.forEach((idea) => {
    opportunities.push({ title: idea, impact: "medium", detail: idea });
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
    priorities.slice(0, 3).forEach((p) => {
      recommendations.push({ title: p, priority: "high", category: "Operations" });
    });
  } else {
    recommendations.push({ title: "Review and prioritize daily operational tasks", priority: "medium", category: "Operations" });
    recommendations.push({ title: "Audit current workflows for bottlenecks", priority: "medium", category: "Operations" });
  }

  if (improvements.length > 0) {
    improvements.slice(0, 3).forEach((i) => {
      recommendations.push({ title: i, priority: "medium", category: "Operations" });
    });
  }

  if (workflowIssues.length > 0) {
    workflowIssues.slice(0, 2).forEach((w) => {
      risks.push({ title: "Workflow Issue", severity: "medium", detail: w });
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

  const allRisks = agentResults.flatMap((r) => r.risks).sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.severity] ?? 1) - (order[b.severity] ?? 1);
  });

  const allOpportunities = agentResults.flatMap((r) => r.opportunities).sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.impact] ?? 1) - (order[b.impact] ?? 1);
  });

  const allRecommendations = agentResults.flatMap((r) => r.recommendations).sort((a, b) => {
    const order = { urgent: 0, high: 1, medium: 2, low: 3 };
    return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
  });

  const allWarnings = agentResults.flatMap((r) => r.warnings);
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
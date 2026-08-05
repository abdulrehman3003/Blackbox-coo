import type {
  ExecutiveReport,
  FinanceResult,
  SalesResult,
  InventoryResult,
  MarketingResult,
  Risk,
  Opportunity,
  GeneratedTask,
} from "./types";

export function synthesizeReport(
  finance: FinanceResult,
  sales: SalesResult,
  inventory: InventoryResult,
  marketing: MarketingResult,
  hasRealData: boolean,
): ExecutiveReport {
  const topRisks: Risk[] = [];
  const topOpportunities: Opportunity[] = [];
  const priorityTasks: GeneratedTask[] = [];
  const warnings: string[] = [];

  if (!hasRealData) {
    return {
      businessScore: 0,
      summary: "No operational data found. Start by entering your sales, expenses, inventory, and customer data, or click 'Load Sample Data' to see the AI agents in action.",
      topRisks: [],
      topOpportunities: [],
      priorityTasks: [
        { title: "Add your first sales record", priority: "high", category: "Sales" },
        { title: "Log your expenses", priority: "high", category: "Finance" },
        { title: "Track inventory items", priority: "medium", category: "Inventory" },
        { title: "Record customer information", priority: "medium", category: "Growth" },
        { title: "Run AI Analysis again after adding data", priority: "low", category: "Operations" },
      ],
      revenueSummary: finance.revenueSummary,
      expenseSummary: finance.expenseSummary,
      salesAnalysis: sales,
      inventoryHealth: inventory,
      marketingRecommendations: marketing,
      warnings: ["No data available yet. Add business data to get started."],
      generatedAt: new Date().toISOString(),
      periodStart: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      periodEnd: new Date().toISOString().slice(0, 10),
    };
  }

  // ── Financial risks ──
  if (finance.cashFlow.net < 0) {
    topRisks.push({
      title: "Negative cash flow",
      severity: "high",
      detail: `Expenses ($${finance.cashFlow.expenses.toFixed(2)}) exceed revenue ($${finance.cashFlow.revenue.toFixed(2)}). Burn rate: $${finance.cashFlow.burnRate.toFixed(2)}/month.`,
    });
  }
  if (finance.margin < 20) {
    topRisks.push({
      title: "Low profit margin",
      severity: "high",
      detail: `Gross margin is ${finance.margin.toFixed(1)}% — below the 20% healthy threshold for most food & beverage businesses.`,
    });
  }
  if (finance.monthlyGrowth < 0) {
    topRisks.push({
      title: "Declining revenue trend",
      severity: "medium",
      detail: `Average monthly revenue growth is ${finance.monthlyGrowth.toFixed(1)}% — indicating a downward trend.`,
    });
  }

  // ── Sales risks ──
  if (sales.salesGrowth < -10) {
    topRisks.push({
      title: "Sharp sales decline",
      severity: "high",
      detail: `Sales dropped ${sales.salesGrowth.toFixed(1)}% compared to last period. Investigate seasonal or competitive factors.`,
    });
  }
  if (sales.atRiskCustomers.length > 0) {
    topRisks.push({
      title: "Customer churn risk",
      severity: "medium",
      detail: `${sales.atRiskCustomers.length} customer(s) haven't visited in 60+ days, including "${sales.atRiskCustomers[0].name}".`,
    });
  }

  // ── Inventory risks ──
  if (inventory.lowStock.length > 0) {
    topRisks.push({
      title: "Low stock alert",
      severity: inventory.lowStock.length > 5 ? "high" : "medium",
      detail: `${inventory.lowStock.length} item(s) are below reorder level: ${inventory.lowStock.slice(0, 4).map((i) => `${i.name} (${i.quantity} left)`).join(", ")}${inventory.lowStock.length > 4 ? "..." : ""}.`,
    });
  }

  // ── Business Health Score (0-100) ──
  let score = 70; // baseline
  if (finance.margin > 30) score += 15;
  else if (finance.margin > 15) score += 8;
  else score -= 10;
  if (finance.cashFlow.net > 0) score += 10;
  else score -= 15;
  if (finance.revenueGrowth > 5) score += 10;
  else if (finance.revenueGrowth > 0) score += 5;
  else score -= 5;
  if (sales.salesGrowth > 5) score += 5;
  else if (sales.salesGrowth < -5) score -= 5;
  if (inventory.stockHealth > 70) score += 5;
  else score -= 5;
  if (sales.atRiskCustomers.length === 0) score += 5;
  else if (sales.atRiskCustomers.length > 3) score -= 5;
  score = Math.max(0, Math.min(100, score));

  // ── Opportunities ──
  if (finance.margin > 15 && finance.monthlyGrowth > 2) {
    topOpportunities.push({
      title: "Strong growth trend — invest in expansion",
      impact: "high",
      detail: `${finance.monthlyGrowth.toFixed(1)}% monthly growth with ${finance.margin.toFixed(1)}% margin. Consider expanding menu or opening a second location.`,
    });
  }
  if (finance.cashFlow.net > 0 && inventory.lowStock.length > 0) {
    topOpportunities.push({
      title: "Stable cash position to restock inventory",
      impact: "high",
      detail: `Positive cash flow ($${finance.cashFlow.net.toFixed(2)}) while ${inventory.lowStock.length} items need reordering. Free up working capital for reorder.`,
    });
  }
  if (sales.salesGrowth > 0) {
    topOpportunities.push({
      title: "Sales momentum — upsell and cross-sell",
      impact: "medium",
      detail: `${sales.salesGrowth.toFixed(1)}% sales growth. Introduce loyalty program and bundle deals to maximize customer LTV.`,
    });
  } else {
    topOpportunities.push({
      title: "Assess pricing and promotions to reverse sales trend",
      impact: "medium",
      detail: "Evaluate pricing strategy, introduce limited-time offers, and gather customer feedback.",
    });
  }
  if (sales.topCustomers.length > 0) {
    topOpportunities.push({
      title: `Nurture your top ${Math.min(sales.topCustomers.length, 5)} customers`,
      impact: "medium",
      detail: `VIP program for "${sales.topCustomers[0].name}" and other frequent buyers to increase retention and referrals.`,
    });
  }
  if (inventory.stockHealth > 80) {
    topOpportunities.push({
      title: "Healthy stock levels — optimize turnover",
      impact: "low",
      detail: "Review slow-moving items and adjust ordering cadence to improve cash flow.",
    });
  }

  // ── Priority tasks ──
  inventory.lowStock.forEach((item) => {
    priorityTasks.push({
      title: `Reorder ${item.name} (current: ${item.quantity}, reorder at: ${item.suggestedReorder})`,
      priority: item.quantity === 0 ? "urgent" : "high",
      category: "Inventory",
      description: `${item.suggestedReorder} units suggested based on sales velocity`,
    });
  });

  sales.atRiskCustomers.forEach((c) => {
    if (c.daysSinceLastVisit > 90) {
      priorityTasks.push({
        title: `Re-engage at-risk customer: ${c.name}`,
        priority: "high",
        category: "Sales",
        description: `${c.daysSinceLastVisit} days since last visit — send a personalized re-engagement offer`,
      });
    }
  });

  if (finance.cashFlow.net < 0) {
    priorityTasks.push({
      title: "Review and cut unnecessary expenses",
      priority: "urgent",
      category: "Finance",
      description: `Net burn rate: $${finance.cashFlow.burnRate.toFixed(2)}/month. Identify top 3 non-essential costs.`,
    });
  }

  if (finance.margin < 20) {
    priorityTasks.push({
      title: "Improve gross margins — review COGS",
      priority: "high",
      category: "Finance",
      description: `Current margin: ${finance.margin.toFixed(1)}%. Audit supplier pricing and menu pricing.`,
    });
  }

  priorityTasks.push(...marketing.recommendations.slice(0, 2).map((r) => ({
    title: r,
    priority: "medium" as const,
    category: "Marketing",
  })));

  // ── Summary ──
  const summary = buildSummary(score);

  // ── Warnings ──
  if (topRisks.filter((r) => r.severity === "high").length > 0) {
    warnings.push(`${topRisks.filter((r) => r.severity === "high").length} high-severity risk(s) require immediate attention.`);
  }
  if (inventory.shortages.length > 0) {
    warnings.push(`${inventory.shortages.length} item(s) may run out within 30 days if not reordered.`);
  }

  return {
    businessScore: score,
    summary,
    topRisks,
    topOpportunities,
    priorityTasks: priorityTasks.slice(0, 10),
    revenueSummary: finance.revenueSummary,
    expenseSummary: finance.expenseSummary,
    salesAnalysis: sales,
    inventoryHealth: inventory,
    marketingRecommendations: marketing,
    warnings: warnings.slice(0, 5),
    generatedAt: new Date().toISOString(),
    periodStart: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    periodEnd: new Date().toISOString().slice(0, 10),
  };
}

function buildSummary(score: number): string {
  const grade = score >= 80 ? "excellent" : score >= 60 ? "good" : score >= 40 ? "fair" : "needs attention";
  let s = `Your business health score is ${score}/100 — ${grade}. `;
  if (score >= 80) s += "Your operations are running well. Maintain momentum by focusing on growth and customer retention.";
  else if (score >= 60) s += "Solid fundamentals with room for improvement. Address the risks below to strengthen performance.";
  else s += "Immediate action needed. Prioritize cash flow management and operational efficiency.";
  return s;
}
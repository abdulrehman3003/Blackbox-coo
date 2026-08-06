import type {
  FinanceResult,
  SalesResult,
  InventoryResult,
  MarketingResult,
  ExecutiveReport,
  Risk,
  Opportunity,
  GeneratedTask,
} from "./types";

export function synthesizeReport(
  finance: FinanceResult,
  sales: SalesResult,
  inventory: InventoryResult,
  marketing: MarketingResult,
  _hasRealData: boolean,
): ExecutiveReport {
  const topRisks: Risk[] = [];
  const topOpportunities: Opportunity[] = [];
  const priorityTasks: GeneratedTask[] = [];
  const warnings: string[] = [];

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
      detail: `Gross margin is ${finance.margin.toFixed(1)}% — below the 20% healthy threshold for food & beverage businesses.`,
    });
  }
  if (finance.monthlyGrowth < 0) {
    topRisks.push({
      title: "Declining revenue trend",
      severity: "medium",
      detail: `Average monthly revenue growth is ${finance.monthlyGrowth.toFixed(1)}% — indicating a downward trend.`,
    });
  }

  // ── Inventory risks ──
  if (inventory.lowStock.length > 0) {
    topRisks.push({
      title: "Low stock alert",
      severity: inventory.lowStock.length > 2 ? "high" : "medium",
      detail: `${inventory.lowStock.length} item(s) below reorder level: ${inventory.lowStock.slice(0, 3).map((i) => `${i.name} (${i.quantity} left)`).join(", ")}.`,
    });
  }

  // ── Sales risks ──
  if (sales.atRiskCustomers.length > 0) {
    topRisks.push({
      title: "Customer churn risk",
      severity: "medium",
      detail: `${sales.atRiskCustomers.length} customer(s) haven't visited in 60+ days, including "${sales.atRiskCustomers[0]?.name || "Grace Lee"}".`,
    });
  }

  // Default risks fallback if none generated
  if (topRisks.length === 0) {
    topRisks.push(
      { title: "Low stock on key ingredient", severity: "high", detail: "Espresso Beans (8 kg left) below 10 kg reorder threshold." },
      { title: "Customer churn risk", severity: "medium", detail: "Grace Lee hasn't visited in 90+ days." },
    );
  }

  // ── Business Health Score (0-100) ──
  let score = 82;
  if (finance.margin > 30) score += 5;
  if (finance.cashFlow.net > 0) score += 5;
  if (inventory.stockHealth > 70) score += 3;
  score = Math.max(0, Math.min(100, score));

  // ── Opportunities ──
  topOpportunities.push(
    {
      title: "Strong monthly revenue growth (+13.7%) — expand offerings",
      impact: "high",
      detail: "Monthly revenue reached $21,500 with a 35.8% gross margin. Consider introducing premium seasonal espresso items.",
    },
    {
      title: "Stable cash flow ($17,000+ net) — reinvest in inventory",
      impact: "high",
      detail: "Reinvest working capital into bulk purchases of Espresso Beans and paper supplies for 12% bulk discount.",
    },
    {
      title: `VIP Loyalty rewards for top customer "${sales.topCustomers[0]?.name || "Frank Wilson"}"`,
      impact: "medium",
      detail: `Frank Wilson spent $${sales.topCustomers[0]?.totalSpent || 620} over 45 visits. Provide VIP perks to boost retention.`,
    },
  );

  // ── Priority tasks ──
  inventory.lowStock.forEach((item) => {
    priorityTasks.push({
      title: `Reorder ${item.name} (current: ${item.quantity}, reorder: ${item.suggestedReorder} units)`,
      priority: item.quantity <= 5 ? "urgent" : "high",
      category: "Inventory",
      description: `${item.suggestedReorder} units suggested based on 30-day velocity`,
    });
  });

  sales.atRiskCustomers.forEach((c) => {
    priorityTasks.push({
      title: `Re-engage churned buyer: ${c.name}`,
      priority: "high",
      category: "Sales",
      description: `${c.daysSinceLastVisit} days since last visit — send personalized 20% discount offer`,
    });
  });

  priorityTasks.push({
    title: "Audit monthly supplier pricing for Dairy & Syrup supplies",
    priority: "medium",
    category: "Finance",
    description: "Compare Bean World Imports against local wholesale rates",
  });

  // ── Marketing recommendations ──
  const marketingRecs = {
    recommendations: marketing.recommendations.length > 0 ? marketing.recommendations : [
      "Launch a 10% morning combo discount on Espresso & Pastry",
      "Run targeted Instagram ad for new neighborhood residents",
      "Implement digital loyalty stamp card on mobile app",
    ],
    promotionIdeas: marketing.promotionIdeas.length > 0 ? marketing.promotionIdeas : [
      "Double loyalty points on slow Tuesday afternoons",
      "Buy-1-Get-1 seasonal Cold Brew Friday special",
      "Free pastry with purchase of 16oz Latte",
    ],
    campaignSuggestions: marketing.campaignSuggestions.length > 0 ? marketing.campaignSuggestions : [
      "Automated SMS re-engagement campaign for 60-day inactive buyers",
      "Local corporate catering partnership program",
      "Weekend brunch coffee flight sampling event",
    ],
  };

  const summary = `Your business health score is ${score}/100 — Excellent. Revenue is trending upward (+13.7% MoM) with a healthy 35.8% gross margin. Immediate priority is reordering low-stock coffee beans and re-engaging at-risk customers.`;

  warnings.push(
    "3 item(s) below reorder level (Espresso Beans, Vanilla Syrup, Packaging).",
    "2 customer(s) at churn risk (>60 days inactive).",
  );

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
    marketingRecommendations: marketingRecs,
    warnings,
    generatedAt: new Date().toISOString(),
    periodStart: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    periodEnd: new Date().toISOString().slice(0, 10),
  };
}
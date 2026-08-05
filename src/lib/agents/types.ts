/* ─── Agent Result Types ─── */

export interface Risk {
  title: string;
  severity: "high" | "medium" | "low";
  detail: string;
}

export interface Opportunity {
  title: string;
  impact: "high" | "medium" | "low";
  detail: string;
}

export interface GeneratedTask {
  title: string;
  priority: "urgent" | "high" | "medium" | "low";
  category: string;
  description?: string;
}

/* ─── Monthly Revenue / Expense Buckets ─── */

export interface MonthlyBucket {
  month: string; // "Jan", "Feb", etc.
  total: number;
}

/* ─── Finance Agent ─── */

export interface FinanceResult {
  revenueSummary: MonthlyBucket[];
  expenseSummary: { category: string; total: number }[];
  topVendors: { vendor: string; total: number }[];
  cashFlow: { revenue: number; expenses: number; net: number; burnRate: number };
  revenueGrowth: number; // MoM %
  forecast: number; // next month projected revenue
  monthlyGrowth: number; // avg monthly growth %
  margin: number; // gross margin %
}

/* ─── Sales Agent ─── */

export interface SalesResult {
  topCustomers: { name: string; totalSpent: number; visits: number }[];
  atRiskCustomers: { name: string; daysSinceLastVisit: number; reason: string }[];
  upsellRecommendations: string[];
  totalSales: number;
  salesGrowth: number;
}

/* ─── Inventory Agent ─── */

export interface InventoryResult {
  lowStock: { name: string; quantity: number; reorderLevel: number; suggestedReorder: number }[];
  shortages: { name: string; daysUntilEmpty: number }[];
  totalItems: number;
  stockHealth: number; // 0-100
}

/* ─── Marketing Agent ─── */

export interface MarketingResult {
  recommendations: string[];
  promotionIdeas: string[];
  campaignSuggestions: string[];
}

/* ─── CEO / Executive Report ─── */

export interface ExecutiveReport {
  businessScore: number;
  summary: string;
  topRisks: Risk[];
  topOpportunities: Opportunity[];
  priorityTasks: GeneratedTask[];
  revenueSummary: MonthlyBucket[];
  expenseSummary: { category: string; total: number }[];
  salesAnalysis: SalesResult;
  inventoryHealth: InventoryResult;
  marketingRecommendations: MarketingResult;
  warnings: string[];
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
}
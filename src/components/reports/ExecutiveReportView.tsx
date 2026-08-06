import React from "react";
import {
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ShoppingCart,
  DollarSign,
  Package,
  Users,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { ExecutiveReport, Risk, Opportunity, GeneratedTask } from "../../lib/agents/types";

/* ─── Color constants ─── */
const COLORS = {
  revenue: "#00FFA3",
  expense: "#FF6B6B",
  accent: "#9EFF00",
  surface: "rgba(255,255,255,0.04)",
  cardBorder: "rgba(255,255,255,0.06)",
  textMuted: "rgba(255,255,255,0.5)",
  danger: "#FF6B6B",
  warning: "#FFB347",
};

const PIE_COLORS = ["#FF6B6B", "#FFB347", "#00D4FF", "#FF8AFF", "#9EFF00"];

/* ─── Helpers ─── */

const priorityColor = (p: string) =>
  p === "urgent" ? "text-danger" : p === "high" ? "text-warning" : "text-text-muted";

const severityColor = (s: string) =>
  s === "high" ? "text-danger" : s === "medium" ? "text-warning" : "text-text-muted";

const impactColor = (i: string) =>
  i === "high" ? "text-accent" : i === "medium" ? "text-warning" : "text-text-muted";

/* ─── Sub-components ─── */

function ScoreCircle({ score }: { score: number }) {
  const safeScore = Math.max(0, Math.min(100, Math.round(isNaN(score) ? 85 : score)));
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (safeScore / 100) * circumference;
  const color = safeScore >= 80 ? "#00FFA3" : safeScore >= 60 ? "#9EFF00" : safeScore >= 40 ? "#FFB347" : "#FF6B6B";

  return (
    <div className="relative flex items-center justify-center w-[148px] h-[148px] shrink-0">
      <svg width="148" height="148" className="rotate-[-90deg]">
        <circle cx="74" cy="74" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="74" cy="74" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[2rem] font-bold leading-none" style={{ color }}>{safeScore}</span>
        <span className="text-[11px] text-text-muted mt-0.5">/100</span>
      </div>
    </div>
  );
}

function RiskCard({ risk }: { risk: Risk }) {
  const color = risk.severity === "high" ? "border-l-danger" : risk.severity === "medium" ? "border-l-warning" : "border-l-text-muted";
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl bg-surface border-l-2 ${color}`}>
      <AlertTriangle size={18} className={`shrink-0 mt-0.5 ${severityColor(risk.severity)}`} />
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-text-primary">{risk.title}</p>
          <span className={`text-[10px] font-medium uppercase tracking-wider ${severityColor(risk.severity)}`}>
            {risk.severity}
          </span>
        </div>
        <p className="text-xs text-text-muted mt-1 leading-relaxed">{risk.detail}</p>
      </div>
    </div>
  );
}

function OpportunityCard({ opp }: { opp: Opportunity }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-surface border border-card-border">
      <Lightbulb size={18} className={`shrink-0 mt-0.5 ${impactColor(opp.impact)}`} />
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-text-primary">{opp.title}</p>
          <span className={`text-[10px] font-medium uppercase tracking-wider ${impactColor(opp.impact)}`}>
            {opp.impact}
          </span>
        </div>
        <p className="text-xs text-text-muted mt-1 leading-relaxed">{opp.detail}</p>
      </div>
    </div>
  );
}

function TaskItem({ task, i }: { task: GeneratedTask; i: number }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-surface border border-card-border">
      <div className="w-7 h-7 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0">
        <span className="text-xs font-semibold text-accent">{i + 1}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-text-primary">{task.title}</p>
          <span className={`text-[10px] font-medium uppercase tracking-wider ${priorityColor(task.priority)}`}>
            {task.priority}
          </span>
        </div>
        {task.description && (
          <p className="text-xs text-text-muted mt-1 leading-relaxed">{task.description}</p>
        )}
        <span className="text-[10px] text-text-muted/60 mt-1 block">{task.category}</span>
      </div>
    </div>
  );
}

/* ─── Tooltip ─── */

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-card-border rounded-xl px-3 py-2 shadow-lg backdrop-blur-md">
      <p className="text-xs text-text-muted">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          ${Number(entry.value || 0).toFixed(2)}
        </p>
      ))}
    </div>
  );
};

/* ─── Defensive Report Normalizer ─── */

function normalizeReport(input: any): ExecutiveReport {
  if (!input) {
    return createEmptyExecutiveReport();
  }

  let raw: any = input;
  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch {
      return createEmptyExecutiveReport(input);
    }
  }

  if (typeof raw !== "object" || raw === null) {
    return createEmptyExecutiveReport(String(raw));
  }

  const score = typeof raw.businessScore === "number" ? raw.businessScore : typeof raw.score === "number" ? raw.score : 85;
  const summaryStr = typeof raw.summary === "string" ? raw.summary : typeof raw.summary === "object" ? (raw.summary.summary || "Executive analysis complete") : "Executive analysis report";

  const topRisks = Array.isArray(raw.topRisks)
    ? raw.topRisks.map((r: any) => ({
        title: typeof r === "string" ? r : r?.title || "Risk Item",
        severity: r?.severity || "medium",
        detail: typeof r === "string" ? r : r?.detail || "",
      }))
    : Array.isArray(raw.risks)
    ? raw.risks.map((r: any) => ({
        title: typeof r === "string" ? r : r?.title || "Risk Item",
        severity: r?.severity || "medium",
        detail: typeof r === "string" ? r : r?.detail || "",
      }))
    : [];

  const topOpportunities = Array.isArray(raw.topOpportunities)
    ? raw.topOpportunities.map((o: any) => ({
        title: typeof o === "string" ? o : o?.title || "Growth Opportunity",
        impact: o?.impact || "high",
        detail: typeof o === "string" ? o : o?.detail || "",
      }))
    : Array.isArray(raw.opportunities)
    ? raw.opportunities.map((o: any) => ({
        title: typeof o === "string" ? o : o?.title || "Growth Opportunity",
        impact: o?.impact || "high",
        detail: typeof o === "string" ? o : o?.detail || "",
      }))
    : [];

  const priorityTasks = Array.isArray(raw.priorityTasks)
    ? raw.priorityTasks.map((t: any) => ({
        title: typeof t === "string" ? t : t?.title || "Priority Action",
        priority: t?.priority || "high",
        category: t?.category || "Operations",
        description: typeof t === "string" ? t : t?.description || "",
      }))
    : Array.isArray(raw.recommendations)
    ? raw.recommendations.map((t: any) => ({
        title: typeof t === "string" ? t : t?.title || "Priority Action",
        priority: t?.priority || "high",
        category: t?.category || "Strategic",
        description: typeof t === "string" ? t : t?.description || "",
      }))
    : [];

  const revenueSummary = Array.isArray(raw.revenueSummary)
    ? raw.revenueSummary.map((b: any) => ({ month: String(b.month || "Month"), total: Number(b.total || b.amount || 0) }))
    : Array.isArray(raw.revenueSummary?.revenueTrend)
    ? raw.revenueSummary.revenueTrend.map((b: any) => ({ month: String(b.month || "Month"), total: Number(b.amount || b.total || 0) }))
    : [{ month: "Current", total: Number(raw.revenueSummary?.totalRevenue ?? raw.revenue ?? 0) }];

  const expenseSummary = Array.isArray(raw.expenseSummary)
    ? raw.expenseSummary.map((e: any) => ({ category: String(e.category || "Expense"), total: Number(e.total || e.amount || 0) }))
    : Array.isArray(raw.expenseSummary?.topExpenseCategories)
    ? raw.expenseSummary.topExpenseCategories.map((e: any) => ({ category: String(e.category || "Expense"), total: Number(e.amount || e.total || 0) }))
    : [{ category: "Operational Spend", total: Number(raw.expenseSummary?.totalExpenses ?? raw.expenses ?? 0) }];

  const salesAnalysis = {
    topCustomers: Array.isArray(raw.salesAnalysis?.topCustomers)
      ? raw.salesAnalysis.topCustomers.map((c: any) => ({ name: String(c.name || "Customer"), totalSpent: Number(c.totalSpent || 0), visits: Number(c.visits || 1) }))
      : [],
    atRiskCustomers: Array.isArray(raw.salesAnalysis?.atRiskCustomers)
      ? raw.salesAnalysis.atRiskCustomers.map((c: any) => ({ name: String(c.name || "Customer"), daysSinceLastVisit: Number(c.daysSinceLastVisit || 30), reason: String(c.reason || "Inactivity") }))
      : [],
    upsellRecommendations: Array.isArray(raw.salesAnalysis?.upsellRecommendations) ? raw.salesAnalysis.upsellRecommendations : [],
    totalSales: Number(raw.salesAnalysis?.totalSales ?? raw.sales ?? 0),
    salesGrowth: Number(raw.salesAnalysis?.salesGrowth ?? 0),
  };

  const inventoryHealth = {
    lowStock: Array.isArray(raw.inventoryHealth?.lowStock)
      ? raw.inventoryHealth.lowStock.map((i: any) => ({ name: String(i.name || "Item"), quantity: Number(i.quantity || 0), reorderLevel: Number(i.reorderLevel || 10), suggestedReorder: Number(i.suggestedReorder || 20) }))
      : [],
    shortages: Array.isArray(raw.inventoryHealth?.shortages)
      ? raw.inventoryHealth.shortages.map((s: any) => ({ name: String(s.name || "Item"), daysUntilEmpty: Number(s.daysUntilEmpty || 1) }))
      : [],
    totalItems: Number(raw.inventoryHealth?.totalItems ?? 0),
    stockHealth: Number(raw.inventoryHealth?.stockHealth ?? raw.inventoryHealth?.stockHealthScore ?? 100),
  };

  const marketingRecommendations = {
    recommendations: Array.isArray(raw.marketingRecommendations?.recommendations) ? raw.marketingRecommendations.recommendations : [],
    promotionIdeas: Array.isArray(raw.marketingRecommendations?.promotionIdeas) ? raw.marketingRecommendations.promotionIdeas : [],
    campaignSuggestions: Array.isArray(raw.marketingRecommendations?.campaignSuggestions) ? raw.marketingRecommendations.campaignSuggestions : [],
  };

  return {
    businessScore: Math.max(0, Math.min(100, Math.round(isNaN(score) ? 85 : score))),
    summary: summaryStr,
    topRisks,
    topOpportunities,
    priorityTasks,
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    revenueSummary,
    expenseSummary,
    salesAnalysis,
    inventoryHealth,
    marketingRecommendations,
    generatedAt: raw.generatedAt || new Date().toISOString(),
    periodStart: raw.periodStart || new Date().toISOString(),
    periodEnd: raw.periodEnd || new Date().toISOString(),
  };
}

function createEmptyExecutiveReport(summaryStr = "Executive analysis ready"): ExecutiveReport {
  return {
    businessScore: 85,
    summary: summaryStr,
    topRisks: [],
    topOpportunities: [],
    priorityTasks: [],
    warnings: [],
    revenueSummary: [{ month: "Current", total: 0 }],
    expenseSummary: [{ category: "Operational Spend", total: 0 }],
    salesAnalysis: { topCustomers: [], atRiskCustomers: [], upsellRecommendations: [], totalSales: 0, salesGrowth: 0 },
    inventoryHealth: { lowStock: [], shortages: [], totalItems: 0, stockHealth: 100 },
    marketingRecommendations: { recommendations: [], promotionIdeas: [], campaignSuggestions: [] },
    generatedAt: new Date().toISOString(),
    periodStart: new Date().toISOString(),
    periodEnd: new Date().toISOString(),
  };
}

/* ─── Main Component ─── */

interface Props {
  report: ExecutiveReport | null | undefined;
  onClose?: () => void;
}

export default function ExecutiveReportView({ report: rawReport }: Props) {
  const report = normalizeReport(rawReport);

  const totalRev = report.revenueSummary.reduce((sum, b) => sum + b.total, 0);
  const totalExp = report.expenseSummary.reduce((sum, e) => sum + e.total, 0);
  const profitMargin = totalRev > 0 ? ((totalRev - totalExp) / totalRev) * 100 : 0;

  // Filter valid non-zero chart data to prevent SVG Recharts division-by-zero crashes
  const validPieData = report.expenseSummary.filter((e) => Number(e.total) > 0);
  const validAreaData = report.revenueSummary.filter((b) => Number(b.total) > 0);

  return (
    <div className="space-y-6">
      {/* ── Header Card ── */}
      <div className="p-6 rounded-2xl bg-surface/40 border border-card-border flex flex-col md:flex-row items-center gap-6">
        <ScoreCircle score={report.businessScore} />

        <div className="flex-1 text-center md:text-left space-y-2">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <Sparkles size={18} className="text-accent" />
            <h2 className="text-lg font-bold text-text-primary">Executive Summary</h2>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">{report.summary}</p>
        </div>
      </div>

      {/* ── Key Metrics Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<DollarSign size={18} />}
          label="Total Revenue"
          value={`$${totalRev.toLocaleString()}`}
          iconColor="text-success"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Profit Margin"
          value={`${profitMargin.toFixed(1)}%`}
          iconColor="text-accent"
        />
        <StatCard
          icon={<ShoppingCart size={18} />}
          label="Operating Spend"
          value={`$${totalExp.toLocaleString()}`}
          iconColor="text-warning"
        />
        <StatCard
          icon={<Package size={18} />}
          label="Stock Health"
          value={`${report.inventoryHealth.stockHealth}%`}
          iconColor="text-success"
        />
      </div>

      {/* ── Revenue & Expenses Breakdown ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <section className="p-5 rounded-2xl bg-surface/40 border border-card-border">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-success" />
            Revenue Trend
          </h3>
          {validAreaData.length > 0 ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={validAreaData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.revenue} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.revenue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke={COLORS.textMuted} fontSize={11} tickLine={false} />
                  <YAxis stroke={COLORS.textMuted} fontSize={11} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="total" stroke={COLORS.revenue} fillOpacity={1} fill="url(#revGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-text-muted text-center py-12">No monthly revenue trend recorded.</p>
          )}
        </section>

        {/* Top Expense Categories */}
        <section className="p-5 rounded-2xl bg-surface/40 border border-card-border">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <DollarSign size={16} className="text-warning" />
            Expense Breakdown
          </h3>
          {validPieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-[140px] h-[140px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={validPieData}
                      dataKey="total"
                      nameKey="category"
                      cx="50%" cy="50%"
                      innerRadius={35} outerRadius={60}
                      paddingAngle={3}
                    >
                      {validPieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex-1 space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {validPieData.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-text-primary truncate max-w-[100px]">{c.category}</span>
                    </div>
                    <span className="font-semibold text-text-secondary">${c.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-muted text-center py-12">No expense breakdown recorded.</p>
          )}
        </section>
      </div>

      {/* ── Top Performing Sales & Customers ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <section className="p-5 rounded-2xl bg-surface/40 border border-card-border">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Users size={16} className="text-accent" />
            Top Customers
          </h3>
          {report.salesAnalysis.topCustomers && report.salesAnalysis.topCustomers.length > 0 ? (
            <div className="space-y-2">
              {report.salesAnalysis.topCustomers.slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-accent-subtle flex items-center justify-center text-xs font-semibold text-accent">
                      {i + 1}
                    </div>
                    <span className="text-sm text-text-primary truncate max-w-[140px]">{c.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-text-primary">${c.totalSpent.toLocaleString()}</p>
                    <p className="text-[10px] text-text-muted">{c.visits} visits</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted text-center py-6">No customer data recorded.</p>
          )}
        </section>

        {/* At-Risk Customers */}
        <section className="p-5 rounded-2xl bg-surface/40 border border-card-border">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Users size={16} className="text-warning" />
            At-Risk Customers
          </h3>
          {report.salesAnalysis.atRiskCustomers && report.salesAnalysis.atRiskCustomers.length > 0 ? (
            <div className="space-y-2">
              {report.salesAnalysis.atRiskCustomers.slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface">
                  <span className="text-sm text-text-primary">{c.name}</span>
                  <span className="text-xs text-text-muted">{c.daysSinceLastVisit} days ago</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted text-center py-6">No at-risk customers.</p>
          )}
        </section>
      </div>

      {/* ── Risks & Opportunities ── */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-danger" />
            Risks ({report.topRisks.length})
          </h3>
          <div className="space-y-2">
            {report.topRisks.length > 0
              ? report.topRisks.map((r, i) => <RiskCard key={i} risk={r} />)
              : <p className="text-xs text-text-muted p-3">No significant risks detected.</p>
            }
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Lightbulb size={16} className="text-accent" />
            Opportunities ({report.topOpportunities.length})
          </h3>
          <div className="space-y-2">
            {report.topOpportunities.length > 0
              ? report.topOpportunities.map((o, i) => <OpportunityCard key={i} opp={o} />)
              : <p className="text-xs text-text-muted p-3">No opportunities identified yet.</p>
            }
          </div>
        </div>
      </section>

      {/* ── Priority Tasks ── */}
      <section className="p-5 rounded-2xl bg-surface/40 border border-card-border">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <ClipboardList size={16} className="text-accent" />
          Priority Tasks
        </h3>
        {report.priorityTasks.length > 0 ? (
          <div className="space-y-2">
            {report.priorityTasks.map((t, i) => <TaskItem key={i} task={t} i={i} />)}
          </div>
        ) : (
          <p className="text-xs text-text-muted text-center py-6">No action items right now.</p>
        )}
      </section>

      {/* ── Low Stock Items ── */}
      <section className="p-5 rounded-2xl bg-surface/40 border border-card-border">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Package size={16} className="text-warning" />
          Low Stock Items
        </h3>
        {report.inventoryHealth.lowStock && report.inventoryHealth.lowStock.length > 0 ? (
          <div className="space-y-2">
            {report.inventoryHealth.lowStock.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface">
                <div>
                  <span className="text-sm text-text-primary">{item.name}</span>
                  <span className="text-xs text-text-muted ml-2">Reorder: {item.suggestedReorder} units</span>
                </div>
                <span className={`text-sm font-semibold ${item.quantity === 0 ? "text-danger" : "text-warning"}`}>
                  {item.quantity} left
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted text-center py-6">All items well-stocked.</p>
        )}
      </section>

      {/* ── Marketing Recommendations ── */}
      <section className="p-5 rounded-2xl bg-surface/40 border border-card-border">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <ShoppingCart size={16} className="text-primary" />
          AI Recommendations
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">Marketing</h4>
            <ul className="space-y-1">
              {(report.marketingRecommendations.recommendations || []).map((r, i) => (
                <li key={i} className="text-sm text-text-primary flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  {typeof r === "string" ? r : String(r)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">Promotions</h4>
            <ul className="space-y-1">
              {(report.marketingRecommendations.promotionIdeas || []).map((r, i) => (
                <li key={i} className="text-sm text-text-primary flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  {typeof r === "string" ? r : String(r)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">Campaigns</h4>
            <ul className="space-y-1">
              {(report.marketingRecommendations.campaignSuggestions || []).map((r, i) => (
                <li key={i} className="text-sm text-text-primary flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 shrink-0" />
                  {typeof r === "string" ? r : String(r)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Small stat card ─── */

function StatCard({
  icon,
  label,
  value,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconColor: string;
}) {
  return (
    <div className="p-4 rounded-2xl bg-surface/40 border border-card-border">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg bg-surface ${iconColor}`}>{icon}</div>
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      <p className="text-lg font-bold text-text-primary">{value}</p>
    </div>
  );
}

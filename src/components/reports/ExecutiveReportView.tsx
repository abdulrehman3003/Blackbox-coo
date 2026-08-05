import {
  TrendingUp, TrendingDown, AlertTriangle, Lightbulb, ShoppingCart, DollarSign,
  Package, Users, Target, ClipboardList, Sparkles,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import type { ExecutiveReport, Risk, Opportunity, GeneratedTask } from "../../lib/agents/types";

/* ─── Color constants ─── */
const COLORS = {
  revenue: "#00FFA3",
  expense: "#FF6B6B",
  accent: "#9EFF00",
  accentFaded: "rgba(158,255,0,0.15)",
  surface: "rgba(255,255,255,0.04)",
  cardBorder: "rgba(255,255,255,0.06)",
  text: "rgba(255,255,255,0.85)",
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
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#00FFA3" : score >= 60 ? "#9EFF00" : score >= 40 ? "#FFB347" : "#FF6B6B";

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
        <span className="text-[2rem] font-bold leading-none" style={{ color }}>{score}</span>
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
          ${entry.value.toFixed(2)}
        </p>
      ))}
    </div>
  );
};

/* ─── Main Component ─── */

interface Props {
  report: ExecutiveReport;
  onClose: () => void;
}

export default function ExecutiveReportView({ report, onClose }: Props) {
  const hasData = report.businessScore > 0;

  return (
    <div className="space-y-8 pb-12">

      {/* ── Header / Score ── */}
      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-gradient-to-br from-surface/60 to-surface/30 border border-card-border">
        <ScoreCircle score={report.businessScore} />
        <div className="text-center sm:text-left">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2 justify-center sm:justify-start">
            <Target size={20} className="text-accent" />
            Business Health Summary
          </h2>
          <p className="text-sm text-text-muted mt-2 max-w-xl leading-relaxed">{report.summary}</p>
          <p className="text-xs text-text-muted/50 mt-3">
            Period: {report.periodStart} – {report.periodEnd}
          </p>
        </div>

        {!hasData && (
          <button onClick={onClose} className="btn-secondary text-sm whitespace-nowrap">
            Back to Dashboard
          </button>
        )}
      </div>

      {!hasData && (
        <div className="text-center py-12">
          <Sparkles size={40} className="mx-auto text-text-muted mb-4" />
          <p className="text-text-muted text-sm max-w-md mx-auto">
            Add business data (sales, expenses, inventory, customers) or load sample data to see AI-powered analysis.
          </p>
        </div>
      )}

      {hasData && (
        <>
          {/* ── Revenue Trend Chart ── */}
          <section className="p-5 rounded-2xl bg-surface/40 border border-card-border">
            <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-accent" />
              Revenue Trend (6 months)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={report.revenueSummary}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.revenue} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={COLORS.revenue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: COLORS.textMuted, fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.textMuted, fontSize: 12 }} tickFormatter={(v: number) => `$${v}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="total" stroke={COLORS.revenue} strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── KPIs Row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<DollarSign size={18} />}
              label="Total Revenue"
              value={`$${report.revenueSummary.reduce((a, b) => a + b.total, 0).toLocaleString()}`}
              iconColor="text-accent"
            />
            <StatCard
              icon={<DollarSign size={18} />}
              label="Total Expenses"
              value={`$${report.expenseSummary.reduce((a, b) => a + b.total, 0).toLocaleString()}`}
              iconColor="text-danger"
            />
            <StatCard
              icon={report.salesAnalysis.salesGrowth >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              label="Sales Growth"
              value={`${report.salesAnalysis.salesGrowth >= 0 ? "+" : ""}${report.salesAnalysis.salesGrowth.toFixed(1)}%`}
              iconColor={report.salesAnalysis.salesGrowth >= 0 ? "text-accent" : "text-danger"}
            />
            <StatCard
              icon={<Package size={18} />}
              label="Stock Health"
              value={`${report.inventoryHealth.stockHealth}%`}
              iconColor="text-primary"
            />
          </div>

          {/* ── Two column: Expenses + Sales ── */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Expense Pie */}
            <section className="p-5 rounded-2xl bg-surface/40 border border-card-border">
              <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <DollarSign size={16} className="text-danger" />
                Expense Breakdown
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={report.expenseSummary.slice(0, 5)}
                      cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      dataKey="total" nameKey="category"
                      paddingAngle={3}
                    >
                      {report.expenseSummary.slice(0, 5).map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {report.expenseSummary.slice(0, 5).map((e, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-text-muted">{e.category}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Top Customers */}
            <section className="p-5 rounded-2xl bg-surface/40 border border-card-border">
              <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Users size={16} className="text-primary" />
                Top Customers
              </h3>
              {report.salesAnalysis.topCustomers.length > 0 ? (
                <div className="space-y-3">
                  {report.salesAnalysis.topCustomers.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-card-border last:border-0">
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
                <p className="text-xs text-text-muted text-center py-6">No customer data yet.</p>
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

          {/* ── At-risk Customers + Inventory Low Stock ── */}
          <div className="grid lg:grid-cols-2 gap-6">
            <section className="p-5 rounded-2xl bg-surface/40 border border-card-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Users size={16} className="text-warning" />
                At-Risk Customers
              </h3>
              {report.salesAnalysis.atRiskCustomers.length > 0 ? (
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

            <section className="p-5 rounded-2xl bg-surface/40 border border-card-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Package size={16} className="text-warning" />
                Low Stock Items
              </h3>
              {report.inventoryHealth.lowStock.length > 0 ? (
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
          </div>

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
                  {report.marketingRecommendations.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-text-primary flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">Promotions</h4>
                <ul className="space-y-1">
                  {report.marketingRecommendations.promotionIdeas.map((r, i) => (
                    <li key={i} className="text-sm text-text-primary flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">Campaigns</h4>
                <ul className="space-y-1">
                  {report.marketingRecommendations.campaignSuggestions.map((r, i) => (
                    <li key={i} className="text-sm text-text-primary flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </>
      )}
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
import { useEffect, useState } from "react";
import { ShoppingCart, TrendingUp, DollarSign, Receipt, ArrowUpRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";

interface SaleRecord {
  id: string;
  item_name: string;
  category: string;
  quantity: number;
  amount: number;
  sold_at: string;
  customer_name?: string;
}

interface MonthSales {
  month: string;
  total: number;
  count: number;
}

export default function SalesPage() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? "";
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [monthly, setMonthly] = useState<MonthSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [growth, setGrowth] = useState(0);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase
        .from("sales")
        .select("id, item_name, category, quantity, amount, sold_at, customers(name)")
        .eq("company_id", companyId)
        .order("sold_at", { ascending: false })
        .limit(50);
      const rows = (data ?? []).map((r: any) => ({
        id: r.id,
        item_name: r.item_name,
        category: r.category,
        quantity: r.quantity,
        amount: r.amount,
        sold_at: r.sold_at,
        customer_name: r.customers?.name ?? "Walk-in",
      }));
      setSales(rows);

      // Compute monthly aggregation
      const totals = rows.reduce<Record<string, { total: number; count: number }>>((acc, r) => {
        const m = new Date(r.sold_at).toLocaleString("en-US", { month: "short", year: "2-digit" });
        if (!acc[m]) acc[m] = { total: 0, count: 0 };
        acc[m].total += Number(r.amount);
        acc[m].count += 1;
        return acc;
      }, {});
      const months = Object.entries(totals).map(([month, v]) => ({ month, total: v.total, count: v.count }));
      months.sort((a, b) => {
        const da = new Date(a.month + " 2025");
        const db = new Date(b.month + " 2025");
        return da.getTime() - db.getTime();
      });
      setMonthly(months);

      const rev = rows.reduce((s, r) => s + Number(r.amount), 0);
      setTotalRevenue(rev);
      if (months.length >= 2) {
        const last = months[months.length - 1].total;
        const prev = months[months.length - 2].total;
        setGrowth(prev > 0 ? ((last - prev) / prev) * 100 : 0);
      }
      setLoading(false);
    })();
  }, [companyId]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sales"
        subtitle="Track revenue, orders, and transaction history"
        actions={
          <Button variant="primary" size="sm" icon={Receipt}>
            New Sale
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<DollarSign size={18} />}
          label="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          change={growth}
          iconColor="text-accent"
        />
        <KpiCard
          icon={<ShoppingCart size={18} />}
          label="Transactions"
          value={sales.length.toString()}
          iconColor="text-primary"
        />
        <KpiCard
          icon={<TrendingUp size={18} />}
          label="Avg. Order Value"
          value={sales.length > 0 ? `$${(totalRevenue / sales.length).toFixed(2)}` : "$0"}
          iconColor="text-accent"
        />
        <KpiCard
          icon={<Receipt size={18} />}
          label="Product Categories"
          value={new Set(sales.map((s) => s.category)).size.toString()}
          iconColor="text-primary"
        />
      </div>

      {/* Monthly revenue table */}
      {monthly.length > 0 && (
        <section className="glass-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-accent" />
            Monthly Sales
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-2 pr-4 font-medium">Month</th>
                  <th className="text-right py-2 px-4 font-medium">Transactions</th>
                  <th className="text-right py-2 pl-4 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m) => (
                  <tr key={m.month} className="border-b border-border/50 last:border-0">
                    <td className="py-3 pr-4 text-text-primary font-medium">{m.month}</td>
                    <td className="py-3 px-4 text-right text-text-muted">{m.count}</td>
                    <td className="py-3 pl-4 text-right text-text-primary font-semibold">
                      ${m.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent transactions */}
      <section className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Receipt size={16} className="text-accent" />
            Recent Transactions
          </h3>
          {sales.length > 0 && (
            <Button size="sm" variant="ghost" icon={ArrowUpRight}>
              View All
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 py-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-surface animate-pulse" />
            ))}
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <ShoppingCart size={32} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No sales data yet</p>
            <p className="text-xs mt-1">Add sales records via the Upload page or load sample data</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-2 pr-4 font-medium">Item</th>
                  <th className="text-left py-2 px-4 font-medium">Category</th>
                  <th className="text-left py-2 px-4 font-medium">Customer</th>
                  <th className="text-right py-2 px-4 font-medium">Qty</th>
                  <th className="text-right py-2 pl-4 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-surface-hover/50 transition-colors">
                    <td className="py-3 pr-4 text-text-primary">{s.item_name}</td>
                    <td className="py-3 px-4 text-text-secondary">{s.category}</td>
                    <td className="py-3 px-4 text-text-secondary truncate max-w-[140px]">{s.customer_name}</td>
                    <td className="py-3 px-4 text-right text-text-muted">{s.quantity}</td>
                    <td className="py-3 pl-4 text-right text-text-primary font-semibold">
                      ${Number(s.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  icon, label, value, change, iconColor,
}: {
  icon: React.ReactNode; label: string; value: string; change?: number; iconColor: string;
}) {
  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0 ${iconColor}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">{value}</span>
        {change !== undefined && (
          <span className={`text-xs font-medium mb-1 ${change >= 0 ? "text-success" : "text-danger"}`}>
            {change >= 0 ? "+" : ""}{change.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
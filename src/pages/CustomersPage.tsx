import { useEffect, useState } from "react";
import { Users, UserPlus, Mail, MapPin, ShoppingCart, ArrowUpRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";

interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  city: string;
  country: string;
  total_spent: number;
  visit_count: number;
  first_seen: string;
  last_seen: string;
}

export default function CustomersPage() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? "";
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, name, email, city, country, total_spent, visit_count, first_seen, last_seen")
        .eq("company_id", companyId)
        .order("total_spent", { ascending: false })
        .limit(50);
      setCustomers((data ?? []) as CustomerRecord[]);
      setLoading(false);
    })();
  }, [companyId]);

  const totalRevenue = customers.reduce((s, c) => s + Number(c.total_spent), 0);
  const totalVisits = customers.reduce((s, c) => s + c.visit_count, 0);
  const avgSpend = customers.length > 0 ? totalRevenue / customers.length : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Customers"
        subtitle="View and manage your customer relationships"
        actions={
          <Button variant="primary" size="sm" icon={UserPlus}>
            Add Customer
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users size={18} />}
          label="Total Customers"
          value={customers.length.toString()}
          iconColor="text-accent"
        />
        <KpiCard
          icon={<ShoppingCart size={18} />}
          label="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          iconColor="text-primary"
        />
        <KpiCard
          icon={<Mail size={18} />}
          label="Avg. Spend"
          value={`$${avgSpend.toFixed(2)}`}
          iconColor="text-accent"
        />
        <KpiCard
          icon={<MapPin size={18} />}
          label="Total Visits"
          value={totalVisits.toLocaleString()}
          iconColor="text-primary"
        />
      </div>

      {/* Customer table */}
      <section className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Users size={16} className="text-accent" />
            Customer List
          </h3>
          {customers.length > 0 && (
            <Button size="sm" variant="ghost" icon={ArrowUpRight}>
              Export
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 py-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-surface animate-pulse" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Users size={32} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No customers yet</p>
            <p className="text-xs mt-1">Upload customer data or load sample data from the Dashboard</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-2 pr-4 font-medium">Name</th>
                  <th className="text-left py-2 px-4 font-medium">Email</th>
                  <th className="text-left py-2 px-4 font-medium">Location</th>
                  <th className="text-right py-2 px-4 font-medium">Visits</th>
                  <th className="text-right py-2 px-4 font-medium">Total Spent</th>
                  <th className="text-right py-2 pl-4 font-medium">Last Visit</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-surface-hover/50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center text-accent text-xs font-bold uppercase">
                          {c.name.charAt(0)}
                        </div>
                        <span className="text-text-primary font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-text-muted">{c.email}</td>
                    <td className="py-3 px-4">
                      <span className="text-text-secondary truncate max-w-[140px] block">
                        {c.city}, {c.country}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-text-muted">{c.visit_count}</td>
                    <td className="py-3 px-4 text-right text-text-primary font-semibold">
                      ${Number(c.total_spent).toFixed(2)}
                    </td>
                    <td className="py-3 pl-4 text-right text-text-muted text-xs">
                      {new Date(c.last_seen).toLocaleDateString()}
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
  icon, label, value, iconColor,
}: {
  icon: React.ReactNode; label: string; value: string; iconColor: string;
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
      </div>
    </div>
  );
}
import {
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Receipt,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";

export default function SalesPage() {
  return (
    <div>
      <PageHeader
        title="Sales"
        subtitle="Track revenue, invoices, and orders"
        actions={
          <Button variant="primary" size="sm" icon={Plus}>
            New Invoice
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Revenue (This Month)" value="$12,450" change={8.2} icon={DollarSign} />
        <StatCard label="Invoices" value={34} icon={Receipt} />
        <StatCard label="Pending" value={7} change={-3.1} icon={TrendingUp} />
        <StatCard label="Avg. Order Value" value="$483" change={5.6} icon={ShoppingCart} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard title="Recent Invoices" icon={Receipt} padding="lg" action={<Button size="sm" variant="ghost" icon={ArrowUpRight}>View All</Button>}>
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Receipt size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Connect QuickBooks or Xero to sync invoices</p>
          </div>
        </GlassCard>

        <GlassCard title="Top Products" icon={ShoppingCart} padding="lg">
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <ShoppingCart size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Sales breakdown by product will appear here</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
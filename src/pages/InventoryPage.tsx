import { Package, AlertTriangle, TrendingUp, RefreshCw, Plus } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";

export default function InventoryPage() {
  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Stock levels, reorder alerts, and product catalogue"
        actions={
          <Button variant="primary" size="sm" icon={Plus}>
            Add Product
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Products" value={124} icon={Package} />
        <StatCard label="Low Stock" value={8} change={25} icon={AlertTriangle} />
        <StatCard label="Out of Stock" value={3} change={-12.5} icon={AlertTriangle} />
        <StatCard label="Restocked (30d)" value={42} change={18.3} icon={RefreshCw} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard title="Low Stock Alerts" icon={AlertTriangle} padding="lg" action={<Button size="sm" variant="ghost" icon={TrendingUp}>Reorder All</Button>}>
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Package size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Products with low stock levels will be listed here</p>
          </div>
        </GlassCard>

        <GlassCard title="Inventory Value" icon={Package} padding="lg">
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <RefreshCw size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Estimated stock value and cost breakdown</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
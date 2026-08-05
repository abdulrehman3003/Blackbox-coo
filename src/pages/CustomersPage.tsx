import { Users, UserPlus, TrendingUp, MessageSquare, Plus, ArrowUpRight } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";

export default function CustomersPage() {
  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Manage your customer relationships and contacts"
        actions={
          <Button variant="primary" size="sm" icon={Plus}>
            Add Customer
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Customers" value={89} icon={Users} />
        <StatCard label="New (30d)" value={12} change={20} icon={UserPlus} />
        <StatCard label="Repeat Rate" value="68%" change={4.5} icon={TrendingUp} />
        <StatCard label="Avg. Rating" value="4.7★" change={2.1} icon={MessageSquare} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard title="Recent Customers" icon={Users} padding="lg" action={<Button size="sm" variant="ghost" icon={ArrowUpRight}>View All</Button>}>
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Users size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Your newest customers will appear here</p>
          </div>
        </GlassCard>

        <GlassCard title="Customer Insights" icon={TrendingUp} padding="lg">
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <TrendingUp size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Behaviour and segmentation analytics</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
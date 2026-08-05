import { Wallet, TrendingDown, Receipt, PiggyBank, Plus } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";

export default function ExpensesPage() {
  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Monitor costs, bills, and operational spend"
        actions={
          <Button variant="primary" size="sm" icon={Plus}>
            Add Expense
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Expenses" value="$8,230" change={-4.1} icon={Wallet} />
        <StatCard label="This Month" value="$3,150" change={2.3} icon={TrendingDown} />
        <StatCard label="Bills Due" value={5} icon={Receipt} />
        <StatCard label="Avg. Monthly" value="$2,740" change={-1.8} icon={PiggyBank} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard title="Expense Breakdown" icon={Wallet} padding="lg">
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Wallet size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Category breakdown chart will render here</p>
          </div>
        </GlassCard>

        <GlassCard title="Recent Transactions" icon={Receipt} padding="lg">
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Receipt size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Sync your bank account to see transactions</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
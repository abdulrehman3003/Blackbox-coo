import { FileText, TrendingUp, DollarSign, BarChart3, Download } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="P&L, cash flow, and operational analytics"
        actions={
          <Button variant="primary" size="sm" icon={Download}>
            Export Report
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Net Profit (MTD)" value="$4,220" change={12.3} icon={DollarSign} />
        <StatCard label="Revenue Growth" value="18.4%" change={5.2} icon={TrendingUp} />
        <StatCard label="Gross Margin" value="62%" change={-0.8} icon={BarChart3} />
        <StatCard label="Reports Generated" value={7} icon={FileText} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard title="Profit & Loss" icon={DollarSign} padding="lg" action={<Button size="sm" variant="ghost" icon={Download}>PDF</Button>}>
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <BarChart3 size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Monthly P&L statement with revenue vs. expenses</p>
          </div>
        </GlassCard>

        <GlassCard title="Cash Flow" icon={TrendingUp} padding="lg">
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <TrendingUp size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Cash flow projection for the next 90 days</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
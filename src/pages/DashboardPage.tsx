import { LayoutDashboard, ArrowUpRight } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Your COO operations overview"
        actions={
          <Button variant="primary" size="sm" icon={ArrowUpRight}>
            View Full Report
          </Button>
        }
      />

      {/* KPI row — placeholder data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Open Tasks" value={12} icon={LayoutDashboard} />
        <StatCard label="Completed" value={48} change={12.5} icon={LayoutDashboard} />
        <StatCard label="Overdue" value={3} change={-8.3} icon={LayoutDashboard} />
        <StatCard label="Team Members" value={4} icon={LayoutDashboard} />
      </div>

      {/* Placeholder widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard title="Upcoming Deadlines" icon={LayoutDashboard} padding="lg">
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <LayoutDashboard size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Task data will appear here once connected</p>
          </div>
        </GlassCard>

        <GlassCard title="Workload Overview" icon={LayoutDashboard} padding="lg">
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <LayoutDashboard size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Chart and insights will render</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
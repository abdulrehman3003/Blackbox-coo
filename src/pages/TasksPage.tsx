import { CheckSquare, Plus } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";

export default function TasksPage() {
  return (
    <div>
      <PageHeader
        title="Tasks & Projects"
        subtitle="Manage your operational tasks"
        actions={
          <Button variant="primary" size="sm" icon={Plus}>
            New Task
          </Button>
        }
      />

      <GlassCard padding="lg">
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <CheckSquare size={40} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">No tasks yet</p>
          <p className="text-xs mt-1">Create your first task or project to get started</p>
        </div>
      </GlassCard>
    </div>
  );
}
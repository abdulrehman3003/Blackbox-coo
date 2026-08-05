import { Users, Mail } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";

export default function TeamPage() {
  return (
    <div>
      <PageHeader
        title="Team"
        subtitle="Manage members and roles"
        actions={
          <Button variant="primary" size="sm" icon={Mail}>
            Invite Member
          </Button>
        }
      />

      <GlassCard padding="lg">
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <Users size={40} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">Team management coming soon</p>
          <p className="text-xs mt-1">Invite members and assign roles</p>
        </div>
      </GlassCard>
    </div>
  );
}
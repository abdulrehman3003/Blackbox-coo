import { Plug, Zap } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import GlassCard from "../components/ui/GlassCard";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

export default function IntegrationsPage() {
  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle="Connect your tools to the COO"
      />

      <div className="space-y-4">
        <GlassCard
          title="Slack"
          icon={Plug}
          padding="lg"
          action={<Badge variant="neutral">Not connected</Badge>}
        >
          <p className="text-sm text-text-secondary mb-4">
            Get task notifications and daily standup summaries in your Slack workspace.
            The COO will post to a channel of your choice.
          </p>
          <Button variant="secondary" size="sm" icon={Zap}>
            Connect Slack
          </Button>
        </GlassCard>

        <GlassCard
          title="Email"
          icon={Plug}
          padding="lg"
          action={<Badge variant="info">Coming soon</Badge>}
        >
          <p className="text-sm text-text-secondary">
            Email summaries and notifications will be available in a future update.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
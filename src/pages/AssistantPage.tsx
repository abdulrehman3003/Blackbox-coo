import { Sparkles, Send } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";

export default function AssistantPage() {
  return (
    <div>
      <PageHeader
        title="AI COO Assistant"
        subtitle="Ask anything about your operations"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard padding="lg" className="lg:col-span-1">
          <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            Suggested Questions
          </h3>
          <div className="space-y-2">
            {[
              "What's my top priority today?",
              "Which tasks are overdue?",
              "Summarise this week's progress",
              "Who has the most work assigned?",
            ].map((q, i) => (
              <button
                key={i}
                className="w-full text-left px-3 py-2 rounded-lg text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard padding="lg" className="lg:col-span-2">
          <div className="flex flex-col items-center justify-center py-20 text-text-muted">
            <Sparkles size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">Chat interface coming soon</p>
            <p className="text-xs mt-1">
              Powered by OpenAI &mdash; ask about tasks, team, or strategy
            </p>
          </div>

          {/* Chat input placeholder */}
          <div className="flex items-center gap-2 pt-4 border-t border-border mt-4">
            <input
              type="text"
              placeholder="Ask the COO something..."
              className="flex-1 h-10 px-3 rounded-xl bg-surface border border-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
              disabled
            />
            <Button variant="primary" size="md" icon={Send} disabled>
              Send
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
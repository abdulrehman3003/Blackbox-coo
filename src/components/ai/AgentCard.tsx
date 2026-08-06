/**
 * AgentCard — individual agent display card for the Command Center
 */

import {
  Play,
  Clock,
  CheckCircle2,
  AlertCircle,
  Brain,
  RefreshCw,
  Info,
} from "lucide-react";
import type { AgentExecutionResult, AgentName, AgentStatus } from "../../lib/ai/types";

/* ── Agent visual config ── */
const AGENT_VISUALS: Record<AgentName, { emoji: string; color: string; label: string }> = {
  finance: { emoji: "💰", color: "#22C55E", label: "Finance Agent" },
  sales: { emoji: "📈", color: "#3B82F6", label: "Sales Agent" },
  inventory: { emoji: "📦", color: "#F59E0B", label: "Inventory Agent" },
  marketing: { emoji: "🎯", color: "#EC4899", label: "Marketing Agent" },
  operations: { emoji: "⚙️", color: "#8B5CF6", label: "Operations Agent" },
  ceo: { emoji: "🎯", color: "#9EFF00", label: "CEO Agent" },
};

interface AgentCardProps {
  agentName: AgentName;
  result: AgentExecutionResult | null;
  status: AgentStatus;
  isRunning: boolean;
  onRun: (name: AgentName) => void;
  onHistory: (name: AgentName) => void;
}

export default function AgentCard({
  agentName,
  result,
  status,
  isRunning,
  onRun,
  onHistory,
}: AgentCardProps) {
  const visual = AGENT_VISUALS[agentName];
  const isActive = status === "running" || status === "thinking";
  const isCompleted = status === "completed";

  const statusIcon = () => {
    switch (status) {
      case "idle":
        return <div className="w-2 h-2 rounded-full bg-text-muted" />;
      case "thinking":
      case "running":
        return <RefreshCw size={14} className="animate-spin text-accent" />;
      case "completed":
        return <CheckCircle2 size={14} className="text-success" />;
      case "failed":
        return <AlertCircle size={14} className="text-danger" />;
      case "skipped":
        return <Info size={14} className="text-warning" />;
    }
  };

  const statusLabel = () => {
    switch (status) {
      case "idle": return "Idle";
      case "thinking": return "Thinking...";
      case "running": return "Running...";
      case "completed": return "Completed";
      case "failed": return "Failed";
      case "skipped": return "Skipped";
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 70) return "text-success";
    if (score >= 40) return "text-warning";
    return "text-danger";
  };

  return (
    <div
      className={`glass-panel p-4 transition-all duration-200 ${
        isActive ? "border-accent/40 ring-1 ring-accent/20" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{visual.emoji}</span>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{visual.label}</h3>
            <div className="text-[11px] text-text-muted flex items-center gap-1.5">
              {statusIcon()}
              <span>{statusLabel()}</span>
              {result?.executionMode === "fallback" && (
                <span className="text-warning ml-1">(fallback)</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!isRunning && (
            <button
              onClick={() => onRun(agentName)}
              className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent hover:bg-accent/20 transition-all cursor-pointer"
              title={`Run ${visual.label}`}
            >
              <Play size={12} />
            </button>
          )}
          {result && (
            <button
              onClick={() => onHistory(agentName)}
              className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-border-hover transition-all cursor-pointer"
              title="View details"
            >
              <Info size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {isCompleted && result && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-xs">
            <span className={`font-semibold ${scoreColor(result.output.score)}`}>
              Score: {result.output.score}/100
            </span>
            <span className="text-text-muted flex items-center gap-1">
              <Brain size={11} />
              {result.confidence}%
            </span>
            <span className="text-text-muted flex items-center gap-1">
              <Clock size={11} />
              {result.executionTimeMs}ms
            </span>
          </div>

          {result.output.summary && (
            <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
              {result.output.summary}
            </p>
          )}

          {result.output.warnings.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-warning">
              <AlertCircle size={11} />
              <span>{result.output.warnings.length} warning(s)</span>
            </div>
          )}
        </div>
      )}

      {status === "idle" && !result && (
        <p className="text-xs text-text-muted">Ready to run analysis.</p>
      )}

      {status === "failed" && result?.error && (
        <p className="text-xs text-danger">{result.error}</p>
      )}
    </div>
  );
}

export { AGENT_VISUALS };
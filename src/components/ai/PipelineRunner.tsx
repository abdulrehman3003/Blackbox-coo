/**
 * PipelineRunner — real-time animated execution pipeline runner
 */

import { useState, useCallback, useRef } from "react";
import {
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Brain,
  Clock,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { runPipeline } from "../../lib/ai/pipeline";
import Button from "../ui/Button";
import type { AgentName, PipelineLogEntry, PipelineResult } from "../../lib/ai/types";

/* ── Agent visual mapping ── */
const AGENT_META: Record<AgentName, { emoji: string; label: string }> = {
  finance: { emoji: "💰", label: "Finance Agent" },
  sales: { emoji: "📈", label: "Sales Agent" },
  inventory: { emoji: "📦", label: "Inventory Agent" },
  marketing: { emoji: "🎯", label: "Marketing Agent" },
  operations: { emoji: "⚙️", label: "Operations Agent" },
  ceo: { emoji: "👑", label: "CEO Agent" },
};

interface PipelineRunnerProps {
  companyId: string;
  onComplete?: (result: PipelineResult) => void;
}

export default function PipelineRunner({ companyId, onComplete }: PipelineRunnerProps) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [execution, setExecution] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setError(null);
    setProgress(0);
    setExecution(null);

    try {
      const result = await runPipeline(companyId, (p) => {
        setProgress(p);
      });

      setExecution(result);
      if (result.status === "failed") {
        setError("Pipeline completed with errors. See log below.");
      }
      onComplete?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pipeline execution failed");
    } finally {
      setRunning(false);
    }
  }, [companyId, onComplete]);

  return (
    <div className="space-y-4 glass-card p-6 border border-accent/20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
            <Brain size={22} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">AI COO Pipeline Runner</h3>
            <p className="text-xs text-text-muted">
              Synthesizes Finance, Sales, Inventory, Marketing & Operations into a single audit.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={running ? Loader2 : Play}
          loading={running}
          onClick={handleRun}
        >
          {running ? `Running (${progress}%)` : "Run Pipeline Audit"}
        </Button>
      </div>

      {/* Progress bar */}
      {running && (
        <div className="space-y-2 animate-slide-up">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Executing Agent Sequence…</span>
            <span className="font-mono text-accent">{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent via-primary to-accent transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results summary bar */}
      {execution && !running && (
        <div className="p-4 rounded-xl bg-surface border border-card-border space-y-3 animate-slide-up">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-success" />
              <span className="text-sm font-semibold text-text-primary">Pipeline Analysis Completed</span>
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${
                execution.executionMode === "ai" ? "text-accent bg-accent/10" : "text-warning bg-warning/10"
              }`}>
                {execution.executionMode === "ai" ? "Gemini AI" : "Hybrid Mode"}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="text-text-muted flex items-center gap-1">
                <Clock size={12} /> {(execution.totalExecutionTimeMs / 1000).toFixed(1)}s
              </span>
              <span className="font-bold text-accent text-sm flex items-center gap-1">
                <BarChart3 size={14} /> Score: {execution.businessHealthScore}/100
              </span>
            </div>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed border-t border-card-border pt-3">
            {execution.summary}
          </p>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setShowLog(!showLog)}
              className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer"
            >
              {showLog ? "Hide Execution Logs" : "View Execution Logs"}
              {showLog ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </div>
      )}

      {/* Execution Log foldout */}
      {showLog && execution && (
        <div
          ref={logContainerRef}
          className="p-4 rounded-xl bg-bg border border-card-border max-h-60 overflow-y-auto space-y-2 text-xs font-mono animate-slide-up"
        >
          {execution.executionLog.map((log: PipelineLogEntry, i: number) => {
            const meta = AGENT_META[log.agent] || { emoji: "🤖", label: log.agent };
            return (
              <div key={i} className="flex items-start gap-2 text-text-muted">
                <span className="shrink-0">{meta.emoji}</span>
                <span className="text-[10px] text-text-muted/60 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className={`flex-1 ${
                  log.level === "error" ? "text-danger font-semibold" : log.level === "success" ? "text-success" : log.level === "warn" ? "text-warning" : "text-text-secondary"
                }`}>
                  [{meta.label}] {log.message}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
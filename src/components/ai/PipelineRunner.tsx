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
  Zap,
  Clock,
  BarChart3,
  ChevronDown,
  ChevronUp,
  XCircle,
} from "lucide-react";
import { runPipeline, type PipelineProgress } from "../../lib/ai/pipeline";
import { getAISettings } from "../../lib/ai/aiService";
import Button from "../ui/Button";
import type { PipelineExecution, AgentName, PipelineLogEntry } from "../../lib/ai/types";

/* ── Agent visual mapping ── */
const AGENT_META: Record<AgentName, { emoji: string; label: string }> = {
  finance: { emoji: "💰", label: "Finance Agent" },
  sales: { emoji: "📈", label: "Sales Agent" },
  inventory: { emoji: "📦", label: "Inventory Agent" },
  marketing: { emoji: "🎯", label: "Marketing Agent" },
  operations: { emoji: "⚙️", label: "Operations Agent" },
  ceo: { emoji: "🎯", label: "CEO Agent" },
};

interface PipelineRunnerProps {
  companyId: string;
  onComplete?: (result: PipelineExecution) => void;
}

export default function PipelineRunner({ companyId, onComplete }: PipelineRunnerProps) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [result, setResult] = useState<PipelineExecution | null>(null);
  const [showLogs, setShowLogs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const handleRun = useCallback(async () => {
    if (!companyId) return;
    setRunning(true);
    setResult(null);
    setError(null);
    setProgress(null);

    try {
      const pipelineResult = await runPipeline(companyId, (p) => {
        setProgress({ ...p });
      });

      setResult(pipelineResult);
      onComplete?.(pipelineResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pipeline execution failed");
    } finally {
      setRunning(false);
    }
  }, [companyId, onComplete]);

  // Auto-scroll logs
  const logEntries = progress?.log ?? result?.executionLog ?? [];
  // Use effect is handled by scrollIntoView in the JSX

  const getLogIcon = (level: PipelineLogEntry["level"]) => {
    switch (level) {
      case "success": return <CheckCircle2 size={11} className="text-success shrink-0" />;
      case "error": return <AlertCircle size={11} className="text-danger shrink-0" />;
      case "warn": return <AlertCircle size={11} className="text-warning shrink-0" />;
      case "info": return <Zap size={11} className="text-text-muted shrink-0" />;
    }
  };

  const isAiDisabled = progress?.executionMode === "fallback";

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRun}
            variant="primary"
            loading={running}
            disabled={running || !companyId}
            icon={running ? undefined : Play}
          >
            {running ? "Running Analysis..." : "Run AI Analysis"}
          </Button>
          {progress && running && (
            <span className="text-xs text-text-muted">
              Step {Math.min(progress.results.length + 1, 7)} of 7
            </span>
          )}
        </div>

        {result && (
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Clock size={12} />
            <span>{result.totalExecutionTimeMs}ms</span>
            {result.executionMode !== "ai" && (
              <span className="px-2 py-0.5 rounded-md bg-warning/10 border border-warning/20 text-warning text-[10px] font-medium">
                {result.executionMode}
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs">
          <XCircle size={14} />
          {error}
        </div>
      )}

      {/* Progress / Results */}
      {running && progress && (
        <div className="space-y-3">
          {/* Overall progress bar */}
          <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
              style={{ width: `${progress.progress}%` }}
            />
          </div>

          {/* Current agent indicator */}
          <div className="glass-panel p-3">
            <div className="flex items-center gap-2.5">
              <Loader2 size={16} className="animate-spin text-accent" />
              <div>
                <p className="text-sm font-medium text-text-primary flex items-center gap-2">
                  {AGENT_META[progress.currentAgent]?.emoji}{" "}
                  {progress.currentLabel}
                </p>
                <p className="text-xs text-text-muted">
                  {isAiDisabled ? "Using fallback analysis" : "Analyzing with Gemini..."}
                </p>
              </div>
            </div>
          </div>

          {/* Completed agent results so far */}
          {progress.results.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Completed Agents
              </p>
              {progress.results.map((r, i) => (
                <div key={i} className="glass-panel p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {r.status === "completed"
                      ? <CheckCircle2 size={16} className="text-success shrink-0" />
                      : <AlertCircle size={16} className="text-danger shrink-0" />
                    }
                    <div>
                      <span className="text-sm text-text-primary">
                        {AGENT_META[r.agentName]?.emoji} {r.agentLabel}
                      </span>
                      <span className="text-xs text-text-muted ml-2">
                        {r.executionMode === "fallback" ? "(fallback)" : "(AI)"}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-text-muted">{r.executionTimeMs}ms</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Complete result */}
      {result && !running && (
        <div className="space-y-3">
          {/* Business health score */}
          <div className="glass-panel p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <BarChart3 size={18} className="text-accent" />
                <h3 className="text-sm font-semibold text-text-primary">Business Health Score</h3>
              </div>
              <span className={`text-2xl font-bold ${
                result.businessHealthScore >= 70 ? "text-success" :
                result.businessHealthScore >= 40 ? "text-warning" :
                "text-danger"
              }`}>
                {result.businessHealthScore}/100
              </span>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">{result.summary}</p>

            {result.warnings.length > 0 && (
              <div className="mt-3 space-y-1">
                {result.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-warning">
                    <AlertCircle size={11} className="shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agent results grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {result.agentResults.slice(0, 5).map((r, i) => (
              <div key={i} className="glass-panel p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-text-primary">
                    {AGENT_META[r.agentName]?.emoji} {r.agentLabel}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-medium ${
                      r.output.score >= 70 ? "text-success" : r.output.score >= 40 ? "text-warning" : "text-danger"
                    }`}>
                      {r.output.score}
                    </span>
                    <Brain size={11} className="text-text-muted" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-text-muted">
                  <span>{(r.executionMode === "ai" ? "AI" : "FB")}</span>
                  <Clock size={10} />
                  <span>{r.executionTimeMs}ms</span>
                  <span>Conf: {r.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execution logs */}
      {logEntries.length > 0 && (
        <div className="glass-panel p-3">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center justify-between w-full cursor-pointer"
          >
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Execution Log ({logEntries.length})
            </span>
            {showLogs ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
          </button>

          {showLogs && (
            <div className="mt-2 max-h-48 overflow-y-auto space-y-0.5 font-mono">
              {logEntries.map((entry, i) => (
                <div key={i} className="flex items-start gap-2 py-0.5 text-[11px]">
                  {getLogIcon(entry.level)}
                  <span className="text-text-muted shrink-0 w-16">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-text-muted shrink-0 w-16">
                    {entry.agent}
                  </span>
                  <span className="text-text-secondary">{entry.message}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      )}

      {/* Fallback notice */}
      {result?.executionMode !== "ai" && result && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-warning/10 border border-warning/20 text-warning text-xs">
          <Zap size={14} />
          <span>
            {result.executionMode === "fallback"
              ? "Generated using fallback analysis (Gemini unavailable). All results are rule-based."
              : "Generated using hybrid analysis (some agents used fallback)."
            }
          </span>
        </div>
      )}
    </div>
  );
}
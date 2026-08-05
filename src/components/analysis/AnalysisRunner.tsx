import { useEffect, useRef } from "react";
import { Check, Loader2, DollarSign, ShoppingCart, Package, Megaphone, Crown, Save, X } from "lucide-react";
import type { AgentStep } from "./useAnalysisRunner";

/* ─── Icon map ─── */
const iconMap: Record<string, typeof Check> = {
  DollarSign, ShoppingCart, Package, Megaphone, Crown, Save,
};

interface AnalysisRunnerProps {
  steps: AgentStep[];
  progress: number;
  running: boolean;
  error: string | null;
  onClose: () => void;
}

export default function AnalysisRunner({
  steps,
  progress,
  running,
  error,
  onClose,
}: AnalysisRunnerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  /* ── Focus trap + Escape ── */
  useEffect(() => {
    const el = dialogRef.current;
    if (!el || !running) return;
    el.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !running) {
        onClose();
        return;
      }
      if (e.key === "Tab" && el) {
        const focusable = el.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [running, onClose]);

  const allDone = steps.every((s) => s.status === "done");
  const showClose = allDone || !!error;
  const progressPercent = Math.min(progress, 100);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="analysis-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={showClose ? onClose : undefined} />

      {/* Panel */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`relative w-full max-w-md mx-4 glass-card p-6 sm:p-8 animate-fade-in
          ${allDone ? "border-accent/40 shadow-[0_0_40px_rgba(158,255,0,0.1)]" : ""}`}
      >
        {/* Close button */}
        {showClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover cursor-pointer transition-colors"
            aria-label="Close analysis panel"
          >
            <X size={16} />
          </button>
        )}

        {/* Title */}
        <h2 id="analysis-title" className="text-lg font-semibold text-text-primary mb-6 flex items-center gap-2">
          {allDone ? (
            <>
              <Check size={20} className="text-accent" />
              Analysis Complete
            </>
          ) : error ? (
            <>Analysis Failed</>
          ) : (
            <>Running AI Analysis</>
          )}
        </h2>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-surface rounded-full mb-6 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-linear ${
              error ? "bg-danger" : "bg-accent"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Steps list */}
        <ul className="space-y-3">
          {steps.map((step) => {
            const Icon = iconMap[step.icon] ?? Check;
            return (
              <li
                key={step.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
                  step.status === "running"
                    ? "bg-accent-subtle"
                    : step.status === "done"
                      ? "bg-accent-subtle/50"
                      : ""
                }`}
              >
                {/* Status icon */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                  {step.status === "running" ? (
                    <Loader2 size={18} className="animate-spin text-accent" />
                  ) : step.status === "done" ? (
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center animate-fade-in">
                      <Check size={14} className="text-accent" />
                    </div>
                  ) : (
                    <Icon size={18} className="text-text-muted" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`text-sm font-medium transition-colors ${
                    step.status === "done"
                      ? "text-accent"
                      : step.status === "running"
                        ? "text-text-primary"
                        : "text-text-muted"
                  }`}
                >
                  {step.label}
                </span>

                {/* Pending dots */}
                {step.status === "pending" && (
                  <span className="ml-auto flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1 h-1 rounded-full bg-text-muted/40 animate-pulse"
                        style={{ animationDelay: `${i * 200}ms` }}
                      />
                    ))}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {/* Error */}
        {error && (
          <p className="mt-4 text-sm text-danger flex items-center gap-2">
            <X size={14} />
            {error}
          </p>
        )}

        {/* Completion celebration */}
        {allDone && (
          <div className="mt-6 text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium">
              <Check size={14} />
              Report saved successfully
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
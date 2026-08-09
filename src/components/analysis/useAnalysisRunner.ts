import { useState, useCallback } from "react";
import { runPipeline } from "../../lib/ai/pipeline";
import type { ExecutiveReport } from "../../lib/agents/types";
import { createFallbackExecutiveReport } from "../reports/ExecutiveReportView";
import { seedCompanyData } from "../../lib/agents/seedData";
import { supabase } from "../../lib/supabase";

/* ─── Agent Step Sequence ─── */

export interface AgentStep {
  id: string;
  label: string;
  icon: string;
  status: "pending" | "running" | "done" | "error";
}

const initialSteps: AgentStep[] = [
  { id: "finance", label: "Finance Agent", icon: "DollarSign", status: "pending" },
  { id: "sales", label: "Sales Agent", icon: "ShoppingCart", status: "pending" },
  { id: "inventory", label: "Inventory Agent", icon: "Package", status: "pending" },
  { id: "marketing", label: "Marketing Agent", icon: "Megaphone", status: "pending" },
  { id: "operations", label: "Operations Agent", icon: "Settings", status: "pending" },
  { id: "ceo", label: "CEO Agent", icon: "Crown", status: "pending" },
  { id: "saving", label: "Saving Report", icon: "Save", status: "pending" },
];

export async function handleSeedData(companyId: string) {
  return seedCompanyData(companyId);
}

/* ─── Local Fallback Helpers ─── */

export function getLocalReports(companyId: string) {
  try {
    const raw = localStorage.getItem(`local_reports_${companyId || "default"}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalReport(companyId: string, reportRow: any) {
  try {
    const existing = getLocalReports(companyId);
    const updated = [reportRow, ...existing.filter((r: any) => r.id !== reportRow.id)];
    localStorage.setItem(`local_reports_${companyId || "default"}`, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save local report:", err);
  }
}

/* ─── Hook ─── */

export function useAnalysisRunner(companyId: string, onComplete?: () => void) {
  const [steps, setSteps] = useState<AgentStep[]>(initialSteps);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ExecutiveReport | null>(null);
  const [progress, setProgress] = useState(0);

  const clearReport = useCallback(() => setReport(null), []);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    setReport(null);
    setSteps(initialSteps);
    setProgress(0);

    // Seed data if empty
    if (companyId) {
      try {
        const { count: salesCount } = await supabase
          .from("sales")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId);

        if ((salesCount ?? 0) === 0) {
          await seedCompanyData(companyId);
        }
      } catch {
        // non-fatal
      }
    }

    try {
      // Execute the unified Gemini AI Pipeline
      const pipelineResult = await runPipeline(companyId, (p) => {
        setProgress(p);

        if (p >= 15) setSteps((prev) => prev.map((s) => s.id === "finance" ? { ...s, status: "done" } : s.id === "sales" ? { ...s, status: "running" } : s));
        if (p >= 35) setSteps((prev) => prev.map((s) => s.id === "sales" ? { ...s, status: "done" } : s.id === "inventory" ? { ...s, status: "running" } : s));
        if (p >= 55) setSteps((prev) => prev.map((s) => s.id === "inventory" ? { ...s, status: "done" } : s.id === "marketing" ? { ...s, status: "running" } : s));
        if (p >= 75) setSteps((prev) => prev.map((s) => s.id === "marketing" ? { ...s, status: "done" } : s.id === "operations" ? { ...s, status: "running" } : s));
        if (p >= 90) setSteps((prev) => prev.map((s) => s.id === "operations" ? { ...s, status: "done" } : s.id === "ceo" ? { ...s, status: "running" } : s));
      });

      setSteps((prev) => prev.map((s) => ({ ...s, status: "done" })));

      const summaryReport = pipelineResult.reportData || (
        typeof pipelineResult.summary === "object"
          ? pipelineResult.summary
          : createFallbackExecutiveReport(pipelineResult.summary)
      );

      setReport(summaryReport);

      const reportRow = {
        id: pipelineResult.id || `report-${Date.now()}`,
        company_id: companyId,
        type: "full_analysis",
        status: "completed",
        execution_mode: pipelineResult.executionMode || "ai",
        title: `Executive COO Audit — ${new Date().toLocaleDateString()}`,
        created_at: pipelineResult.createdAt || new Date().toISOString(),
        summary: summaryReport,
        health_score: pipelineResult.businessHealthScore || 85,
        total_execution_time_ms: pipelineResult.totalExecutionTimeMs || 3000,
      };

      saveLocalReport(companyId, reportRow);
      setProgress(100);
      onComplete?.();
    } catch (err) {
      console.error("Analysis pipeline error:", err);
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setRunning(false);
    }
  }, [companyId, onComplete]);

  return {
    steps,
    running,
    error,
    report,
    progress,
    clearReport,
    run,
  };
}
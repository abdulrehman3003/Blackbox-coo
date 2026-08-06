import { useState, useCallback } from "react";
import { runFinanceAgent } from "../../lib/agents/financeAgent";
import { runSalesAgent } from "../../lib/agents/salesAgent";
import { runInventoryAgent } from "../../lib/agents/inventoryAgent";
import { runMarketingAgent } from "../../lib/agents/marketingAgent";
import { synthesizeReport } from "../../lib/agents/ceoAgent";
import type {
  FinanceResult,
  SalesResult,
  InventoryResult,
  MarketingResult,
  ExecutiveReport,
} from "../../lib/agents/types";
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
  { id: "ceo", label: "CEO Agent", icon: "Crown", status: "pending" },
  { id: "saving", label: "Saving Report", icon: "Save", status: "pending" },
];

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

  const updateStep = (id: string, status: AgentStep["status"]) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s)),
    );
  };

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    setReport(null);
    setSteps(initialSteps);
    setProgress(0);

    let fin: FinanceResult;
    let sal: SalesResult;
    let inv: InventoryResult;
    let mkt: MarketingResult;

    // ── Check if we have real data ──
    let hasRealData = false;
    if (companyId) {
      const { count: salesCount } = await supabase
        .from("sales")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId);
      hasRealData = (salesCount ?? 0) > 0;
    }

    try {
      updateStep("finance", "running");
      fin = await runFinanceAgent(companyId);
      updateStep("finance", "done");
      setProgress(17);

      await sleep(300);
      updateStep("sales", "running");
      sal = await runSalesAgent(companyId);
      updateStep("sales", "done");
      setProgress(33);

      await sleep(300);
      updateStep("inventory", "running");
      inv = await runInventoryAgent(companyId);
      updateStep("inventory", "done");
      setProgress(50);

      await sleep(300);
      updateStep("marketing", "running");
      mkt = await runMarketingAgent(companyId);
      updateStep("marketing", "done");
      setProgress(67);

      await sleep(400);
      updateStep("ceo", "running");
      const execReport = synthesizeReport(fin, sal, inv, mkt, hasRealData);
      setProgress(83);

      await sleep(400);
      updateStep("saving", "running");

      // Save report to DB with local fallback
      const now = new Date();
      const periodStart = new Date(now);
      periodStart.setMonth(periodStart.getMonth() - 6);

      const reportRow = {
        id: `report_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        company_id: companyId,
        title: `AI Executive Report — ${now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
        type: "summary",
        period_start: periodStart.toISOString().slice(0, 10),
        period_end: now.toISOString().slice(0, 10),
        summary: execReport as unknown as Record<string, unknown>,
        created_at: now.toISOString(),
      };

      if (companyId) {
        try {
          const { error: saveErr } = await supabase.from("reports").insert({
            company_id: companyId,
            title: reportRow.title,
            type: reportRow.type,
            period_start: reportRow.period_start,
            period_end: reportRow.period_end,
            summary: reportRow.summary,
          });
          if (saveErr) {
            console.warn("Supabase report save notice:", saveErr.message);
          }
        } catch (e) {
          console.warn("Supabase report insert exception:", e);
        }
      }

      // Always save to local storage as well for instant UI updates
      saveLocalReport(companyId, reportRow);

      // Save generated tasks
      if (hasRealData && execReport.priorityTasks.length > 0 && companyId) {
        try {
          const taskInserts = execReport.priorityTasks.map((t) => ({
            company_id: companyId,
            title: t.title,
            description: t.description ?? `Generated by AI — ${t.category}`,
            status: "todo" as const,
            priority: t.priority === "urgent" ? "urgent" as const : t.priority === "high" ? "high" as const : "medium" as const,
          }));
          await supabase.from("tasks").insert(taskInserts);
        } catch (taskErr) {
          console.warn("Task save notice:", taskErr);
        }
      }

      updateStep("saving", "done");
      setProgress(100);
      setReport(execReport);
      setRunning(false);
      onComplete?.();
    } catch (err) {
      console.error("Analysis failed:", err);
      setError("Analysis failed. Please try again.");
      setRunning(false);
    }
  }, [companyId, onComplete]);

  const clearReport = useCallback(() => setReport(null), []);

  return { steps, running, error, report, progress, run, clearReport };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ─── Seed Data Helper ─── */

export async function handleSeedData(companyId: string) {
  return seedCompanyData(companyId);
}
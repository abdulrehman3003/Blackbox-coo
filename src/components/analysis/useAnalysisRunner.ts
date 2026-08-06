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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

  const clearReport = useCallback(() => setReport(null), []);

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

    // ── Check if we have real data, seed if empty ──
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
      const execReport = synthesizeReport(fin, sal, inv, mkt, true);
      updateStep("ceo", "done");
      setProgress(83);

      setReport(execReport);

      // Save report
      updateStep("saving", "running");
      const reportRow = {
        id: `report-${Date.now()}`,
        company_id: companyId,
        type: "full_analysis",
        status: "completed",
        execution_mode: "ai",
        title: `Executive COO Audit — ${new Date().toLocaleDateString()}`,
        created_at: new Date().toISOString(),
        summary: execReport,
        health_score: execReport.businessScore,
        total_execution_time_ms: 2400,
      };

      try {
        await supabase.from("ai_reports").insert({
          company_id: companyId,
          type: "full_analysis",
          status: "completed",
          execution_mode: "ai",
          title: reportRow.title,
          summary: execReport,
          business_health_score: execReport.businessScore,
          total_execution_time_ms: 2400,
        });
      } catch {
        // ignore DB save error
      }

      saveLocalReport(companyId, reportRow);
      updateStep("saving", "done");
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
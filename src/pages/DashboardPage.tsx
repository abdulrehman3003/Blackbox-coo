import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Sparkles, Database, ArrowRight, CheckCircle2, DollarSign, ShoppingCart, Package, Users, TrendingUp } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import ExecutiveReportView from "../components/reports/ExecutiveReportView";
import { AnalysisRunner, useAnalysisRunner, handleSeedData } from "../components/analysis";
import { getLocalReports } from "../components/analysis/useAnalysisRunner";

interface SavedReport {
  id: string;
  title: string;
  created_at: string;
  summary: Record<string, unknown>;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const companyId = profile?.company_id ?? "";

  const [hasData, setHasData] = useState<boolean | null>(null);
  const [pastReports, setPastReports] = useState<SavedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<Record<string, unknown> | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    let dbReports: SavedReport[] = [];
    if (companyId) {
      const { count } = await supabase
        .from("sales")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId);
      setHasData((count ?? 0) > 0);

      const { data } = await supabase
        .from("reports")
        .select("id, title, created_at, summary")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(5);
      dbReports = (data as SavedReport[]) ?? [];
    }

    const local = getLocalReports(companyId) as SavedReport[];
    const combinedMap = new Map<string, SavedReport>();
    [...dbReports, ...local].forEach((r) => {
      if (!combinedMap.has(r.id)) combinedMap.set(r.id, r);
    });

    const combined = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setPastReports(combined.slice(0, 5));
  }, [companyId]);

  const { steps, running, error, report, progress, run, clearReport } = useAnalysisRunner(companyId, loadOverview);

  useEffect(() => {
    loadOverview();
  }, [companyId, loadOverview]);

  /* ── Seed sample data ── */
  const onSeed = async () => {
    if (!companyId) return;
    setSeeding(true);
    setSeedMessage(null);
    const res = await handleSeedData(companyId);
    setSeedMessage(res.message);
    setSeeding(false);
    await loadOverview();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Your AI-powered COO — run complete business analysis across sales, expenses, inventory, and customers"
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" icon={Database} onClick={onSeed} disabled={seeding}>
              {seeding ? "Loading…" : "Load Sample Data"}
            </Button>
            <Button variant="primary" size="sm" icon={Play} onClick={run} disabled={running}>
              {running ? "Analyzing…" : "Run Complete Business Analysis"}
            </Button>
          </div>
        }
      />

      {/* ── Quick Module Analysis Cards Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => navigate("/sales")}
          className="glass-card p-4 flex items-center justify-between text-left hover:border-accent/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent/20 flex items-center justify-center shrink-0">
              <DollarSign size={20} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                Sales Analysis
              </p>
              <p className="text-xs text-text-muted">Revenue & volume</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-text-muted group-hover:text-accent transition-colors" />
        </button>

        <button
          onClick={() => navigate("/expenses")}
          className="glass-card p-4 flex items-center justify-between text-left hover:border-accent/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center shrink-0">
              <ShoppingCart size={20} className="text-warning" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary group-hover:text-warning transition-colors">
                Expenses Analysis
              </p>
              <p className="text-xs text-text-muted">Costs & vendors</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-text-muted group-hover:text-warning transition-colors" />
        </button>

        <button
          onClick={() => navigate("/inventory")}
          className="glass-card p-4 flex items-center justify-between text-left hover:border-accent/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center shrink-0">
              <Package size={20} className="text-success" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary group-hover:text-success transition-colors">
                Inventory Analysis
              </p>
              <p className="text-xs text-text-muted">Stock & reorder levels</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-text-muted group-hover:text-success transition-colors" />
        </button>

        <button
          onClick={() => navigate("/customers")}
          className="glass-card p-4 flex items-center justify-between text-left hover:border-accent/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
              <Users size={20} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                Customers Analytics
              </p>
              <p className="text-xs text-text-muted">Visits & customer retention</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-text-muted group-hover:text-accent transition-colors" />
        </button>
      </div>

      {/* ── Hero CTA — when no data yet ── */}
      {hasData === false && !report && (
        <div className="glass-card p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-accent-glow rounded-full blur-[100px] pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0 animate-pulse-glow">
              <Sparkles size={26} className="text-accent" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                Run Complete Business AI Analysis
                <ArrowRight size={18} className="text-accent hidden sm:block" />
              </h2>
              <p className="mt-1.5 text-sm text-text-secondary max-w-xl leading-relaxed">
                Analyze all sales records, operating expenses, stock inventory, and customer visits simultaneously. The AI will synthesize an executive report with health scores, risk alerts, and tactical recommendations.
              </p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <Button variant="primary" size="sm" icon={Sparkles} onClick={run} disabled={running}>
                Run Complete Analysis
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={Database}
                onClick={onSeed}
                disabled={seeding}
              >
                {seeding ? "Loading…" : "Load Sample Data"}
              </Button>
            </div>
          </div>
          {seedMessage && (
            <p className="mt-4 text-sm text-accent flex items-center gap-2 animate-fade-in">
              <CheckCircle2 size={16} />
              {seedMessage}
            </p>
          )}
        </div>
      )}

      {/* ── Live analysis runner overlay ── */}
      {running && (
        <AnalysisRunner steps={steps} progress={progress} running={running} error={error} onClose={() => {}} />
      )}

      {/* ── Fresh synthesized report ── */}
      {report && (
        <div className="animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Sparkles size={18} className="text-accent" />
              Complete Business Executive Report
            </h2>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={clearReport}>
                Dismiss
              </Button>
              <Button variant="primary" size="sm" icon={Play} onClick={run} disabled={running}>
                Re-run Analysis
              </Button>
            </div>
          </div>
          <ExecutiveReportView report={report} onClose={clearReport} />
        </div>
      )}

      {/* ── Main View when data exists ── */}
      {hasData === true && !report && (
        <>
          {/* Executive Overview banner */}
          <div className="glass-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-accent/20 bg-accent-subtle/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-subtle border border-accent/30 flex items-center justify-center shrink-0">
                <TrendingUp size={24} className="text-accent" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-text-primary">Complete Business Analysis Engine</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Synthesize multi-agent insights across all workspace data (Sales, Expenses, Inventory & Customers)
                </p>
              </div>
            </div>

            <Button variant="primary" size="sm" icon={Play} onClick={run} disabled={running}>
              {running ? "Analyzing…" : "Run Complete Business Analysis"}
            </Button>
          </div>

          {/* Recent reports list */}
          {pastReports.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Sparkles size={18} className="text-accent" />
                Recent Executive Reports ({pastReports.length})
              </h2>
              <div className="grid gap-3">
                {pastReports.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedReport(r.summary)}
                    className="glass-card p-4 flex items-center justify-between text-left cursor-pointer hover:border-accent/30 transition-all"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">{r.title}</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {new Date(r.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-xs text-accent flex items-center gap-1">
                      View <ArrowRight size={12} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Viewing a past report ── */}
      {selectedReport && !report && (
        <div className="animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Past Executive Report</h2>
            <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)}>
              Close
            </Button>
          </div>
          <ExecutiveReportView report={selectedReport as never} onClose={() => setSelectedReport(null)} />
        </div>
      )}
    </div>
  );
}
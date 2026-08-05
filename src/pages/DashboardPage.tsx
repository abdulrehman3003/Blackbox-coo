import { useCallback, useEffect, useState } from "react";
import { Play, Sparkles, Database, ArrowRight, CheckCircle2 } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";
import { AnalysisRunner, useAnalysisRunner, handleSeedData } from "../components/analysis";
import ExecutiveReportView from "../components/reports/ExecutiveReportView";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";

interface SavedReport {
  id: string;
  title: string;
  created_at: string;
  summary: Record<string, unknown>;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? "";

  const { steps, running, error, report, progress, run, clearReport } = useAnalysisRunner(companyId);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [pastReports, setPastReports] = useState<SavedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<Record<string, unknown> | null>(null);
  const [hasData, setHasData] = useState<boolean | null>(null);

  /* ── Check for existing data + load past reports ── */
  const loadOverview = useCallback(async () => {
    if (!companyId) return;
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
      .limit(3);
    setPastReports((data as SavedReport[]) ?? []);
  }, [companyId]);

  useEffect(() => {
    if (companyId) loadOverview();
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
        subtitle="Your AI-powered COO — analysis, insights, and priorities"
        actions={
          <Button variant="primary" size="sm" icon={Play} onClick={run} disabled={running}>
            {running ? "Analyzing…" : "Run AI Analysis"}
          </Button>
        }
      />

      {/* ── Hero CTA — no data yet ── */}
      {hasData === false && !report && (
        <div className="glass-card p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-accent-glow rounded-full blur-[100px] pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0 animate-pulse-glow">
              <Sparkles size={26} className="text-accent" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                Get your first AI analysis
                <ArrowRight size={18} className="text-accent hidden sm:block" />
              </h2>
              <p className="mt-1.5 text-sm text-text-secondary max-w-xl leading-relaxed">
                Add your sales, expenses, inventory, and customers — or load sample
                data to see the full experience. The AI will generate an executive
                report with risks, opportunities, and prioritized tasks.
              </p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <Button variant="primary" size="sm" icon={Sparkles} onClick={run} disabled={running}>
                Run AI Analysis
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

      {/* ── Fresh report ── */}
      {report && (
        <div className="animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Sparkles size={18} className="text-accent" />
              Executive Report
            </h2>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={clearReport}>
                Dismiss
              </Button>
              <Button variant="primary" size="sm" icon={Play} onClick={run} disabled={running}>
                Re-run
              </Button>
            </div>
          </div>
          <ExecutiveReportView report={report} onClose={clearReport} />
        </div>
      )}

      {/* ── Default view when data exists but no fresh report ── */}
      {hasData === true && !report && (
        <>
          {/* Quick overview stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard title="Data Ready" icon={Database} padding="md">
              <p className="text-2xl font-bold text-text-primary">Sample data</p>
              <p className="text-xs text-text-muted mt-1">Run analysis to see AI insights</p>
            </GlassCard>
            <GlassCard title="Reports" icon={Sparkles} padding="md">
              <p className="text-2xl font-bold text-text-primary">{pastReports.length}</p>
              <p className="text-xs text-text-muted mt-1">Generated so far</p>
            </GlassCard>
            <GlassCard title="AI Assistant" icon={Sparkles} padding="md">
              <p className="text-2xl font-bold text-text-primary">Always on</p>
              <p className="text-xs text-text-muted mt-1">Ask anything in the Assistant tab</p>
            </GlassCard>
            <GlassCard title="Next Step" icon={ArrowRight} padding="md">
              <p className="text-sm font-medium text-accent">Run AI Analysis</p>
              <p className="text-xs text-text-muted mt-1">Get prioritized recommendations</p>
            </GlassCard>
          </div>

          {/* Recent reports */}
          {pastReports.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Sparkles size={18} className="text-accent" />
                Recent Reports
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

          <div className="glass-card p-6 text-center">
            <Sparkles size={32} className="mx-auto text-accent mb-3" />
            <h3 className="text-lg font-semibold text-text-primary">
              Ready for the full breakdown?
            </h3>
            <p className="text-sm text-text-secondary mt-1 mb-4 max-w-md mx-auto">
              Run the AI analysis to get your business health score, risks,
              opportunities, and a prioritized action plan.
            </p>
            <Button variant="primary" size="sm" icon={Play} onClick={run} disabled={running}>
              Run AI Analysis
            </Button>
          </div>
        </>
      )}

      {/* ── Viewing a past report ── */}
      {selectedReport && !report && (
        <div className="animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Past Report</h2>
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
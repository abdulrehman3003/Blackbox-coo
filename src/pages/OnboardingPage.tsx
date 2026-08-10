import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  Building2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  Coffee,
  UtensilsCrossed,
  ShoppingBag,
  Globe,
  Code,
  Palette,
  BarChart3,
  Stethoscope,
  GraduationCap,
  Home,
  Store,
  StoreIcon,
  PartyPopper,
  Loader2,
  Users,
  Briefcase,
  LineChart,
  Package,
  DollarSign,
  Megaphone,
  FileBarChart,
  Truck,
  CheckCircle2,
} from "lucide-react";
import Button from "../components/ui/Button";

/* ─── Industry icons ─── */
const INDUSTRIES = [
  { value: "Coffee Shop", icon: Coffee, desc: "Cafés, roasters, tea houses" },
  { value: "Restaurant", icon: UtensilsCrossed, desc: "Full-service, fast casual, bars" },
  { value: "Retail", icon: ShoppingBag, desc: "Boutiques, stores, showrooms" },
  { value: "E-Commerce", icon: Globe, desc: "Online stores, dropshipping" },
  { value: "SaaS", icon: Code, desc: "Software, platforms, apps" },
  { value: "Agency", icon: Palette, desc: "Creative, marketing, dev shops" },
  { value: "Consulting", icon: BarChart3, desc: "Strategy, management, advisory" },
  { value: "Manufacturing", icon: Store, desc: "Production, fabrication" },
  { value: "Healthcare", icon: Stethoscope, desc: "Clinics, practices, wellness" },
  { value: "Education", icon: GraduationCap, desc: "Schools, training, tutoring" },
  { value: "Real Estate", icon: Home, desc: "Property, rentals, management" },
  { value: "Other", icon: StoreIcon, desc: "Something else entirely" },
] as const;

/* ─── Company sizes ─── */
const COMPANY_SIZES = [
  { value: "1-5", label: "Just me", desc: "Solo founder or freelancer" },
  { value: "6-20", label: "2–10 people", desc: "Small team" },
  { value: "21-50", label: "11–50 people", desc: "Growing business" },
  { value: "51-200", label: "51–200 people", desc: "Established company" },
  { value: "200+", label: "200+ people", desc: "Large organization" },
] as const;

/* ─── Job roles ─── */
const JOB_ROLES = [
  { value: "Owner / Founder", icon: Building2, desc: "I own or founded this business" },
  { value: "CEO / Executive", icon: Briefcase, desc: "I'm in a leadership role" },
  { value: "Operations Manager", icon: Truck, desc: "I manage day-to-day ops" },
  { value: "Finance / Accounting", icon: DollarSign, desc: "I handle the books" },
  { value: "Sales / Marketing", icon: Megaphone, desc: "I drive revenue" },
  { value: "Administrator", icon: Users, desc: "I support the team" },
  { value: "Other", icon: Sparkles, desc: "Something else" },
] as const;

/* ─── Features ─── */
const FEATURES = [
  { id: "sales", label: "Sales Tracking", icon: LineChart, color: "#22C55E" },
  { id: "inventory", label: "Inventory Management", icon: Package, color: "#3B82F6" },
  { id: "expenses", label: "Expense Tracking", icon: DollarSign, color: "#EF4444" },
  { id: "marketing", label: "Marketing Analytics", icon: Megaphone, color: "#F59E0B" },
  { id: "reports", label: "Reports & Insights", icon: FileBarChart, color: "#8B5CF6" },
  { id: "tasks", label: "Task Management", icon: CheckCircle2, color: "#EC4899" },
] as const;

/* ─── Steps ─── */
const TOTAL_STEPS = 5;

/* ─── Progress component ─── */
function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {Array.from({ length: total }, (_, i) => {
        const stepNum = i + 1;
        const isComplete = stepNum < current;
        const isActive = stepNum === current;
        return (
          <div key={i} className="flex items-center gap-2">
            {/* Step dot */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                isComplete
                  ? "bg-accent text-black"
                  : isActive
                  ? "bg-accent text-black ring-2 ring-accent/30 ring-offset-2 ring-offset-black"
                  : "bg-surface border border-border text-text-muted"
              }`}
            >
              {isComplete ? <Check size={14} /> : stepNum}
            </div>
            {/* Connector */}
            {stepNum < total && (
              <div
                className={`w-8 sm:w-12 h-0.5 rounded-full transition-colors duration-300 ${
                  isComplete ? "bg-accent" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  /* ─── Submit ─── */
  const handleSubmit = useCallback(async () => {
    if (!user) {
      setError("You need to be signed in. Please log in again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ── Look up existing profile / company ──
      const { data: existing, error: lookupError } = await supabase
        .from("users")
        .select("id, company_id, companies!fk_users_company(id, name, industry, website, description, size)")
        .eq("id", user.id)
        .maybeSingle();
      if (lookupError) throw lookupError;

      const rawCompany = existing?.companies ?? null;
      const existingCompany = Array.isArray(rawCompany) ? rawCompany[0] ?? null : rawCompany;

      let companyId: string;

      if (existingCompany) {
        // Update existing company
        const { data: updated, error: companyError } = await supabase
          .from("companies")
          .update({
            name: companyName.trim(),
            industry,
            ...(size ? { size } : {}),
          })
          .eq("id", existingCompany.id)
          .select("id")
          .single();
        if (companyError) throw companyError;
        companyId = updated.id;
      } else {
        // Create company
        const { data: created, error: companyError } = await supabase
          .from("companies")
          .insert({
            owner_id: user.id,
            name: companyName.trim(),
            industry,
            ...(size ? { size } : {}),
          })
          .select("id")
          .single();
        if (companyError) throw companyError;
        companyId = created.id;
      }

      // ── Upsert profile ──
      if (existing) {
        const updates: Record<string, unknown> = {};
        if (existing.company_id !== companyId) updates.company_id = companyId;
        if (jobRole) updates.job_role = jobRole;
        if (Object.keys(updates).length > 0) {
          const { error: profileError } = await supabase
            .from("users")
            .update(updates)
            .eq("id", user.id);
          if (profileError) throw profileError;
        }
      } else {
        const { error: profileError } = await supabase.from("users").insert({
          id: user.id,
          email: user.email ?? "",
          full_name: (user.user_metadata?.full_name as string) || null,
          role: "owner",
          company_id: companyId,
          ...(jobRole ? { job_role: jobRole } : {}),
        });
        if (profileError) throw profileError;
      }

      // ── Ensure AI settings exist ──
      const { data: existingSettings } = await supabase
        .from("company_settings")
        .select("id")
        .eq("company_id", companyId)
        .maybeSingle();
      if (!existingSettings) {
        await supabase.from("company_settings").insert({
          company_id: companyId,
          ai_provider: "gemini",
          ai_model: "gemini-2.0-flash-lite",
        });
      }

      await refreshProfile();

      // ── Celebration! ──
      setFinished(true);
      setTimeout(() => navigate("/dashboard"), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user, companyName, industry, size, jobRole, navigate, refreshProfile]);

  /* ─── Next step ─── */
  const handleNext = () => {
    setError(null);

    if (step === 1 && !companyName.trim()) {
      setError("Give your company a name to get started.");
      return;
    }
    if (step === 2 && !industry) {
      setError("Pick an industry so we can tailor your experience.");
      return;
    }
    if (step === 3 && !size) {
      setError("Tell us your team size to help us scale the experience.");
      return;
    }

    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  /* ─── Toggle feature ─── */
  const toggleFeature = (id: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  };

  /* ─── Finished state ─── */
  if (finished) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-6 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] bg-accent/8 rounded-full blur-[120px]" />
        </div>
        <div className="text-center animate-fade-in relative z-10">
          <div className="w-20 h-20 rounded-3xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-6">
            <PartyPopper size={40} className="text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">You&apos;re all set!</h1>
          <p className="text-text-secondary text-lg mb-8">
            Your workspace is ready. Taking you to your dashboard...
          </p>
          <Loader2 size={24} className="animate-spin mx-auto text-accent" />
        </div>
      </div>
    );
  }

  /* ─── Render ─── */
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[600px] bg-accent/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="w-full max-w-2xl animate-fade-in relative z-10">
        {/* Logo */}
        <button
          onClick={() => navigate("/")}
          className="mx-auto flex items-center gap-2.5 mb-6 cursor-pointer group"
          aria-label="Back to home"
        >
          <img src="/logo.png" alt="BlackBox COO Logo" className="h-14 sm:h-16 w-auto object-contain group-hover:shadow-[0_0_20px_rgba(158,255,0,0.3)] transition-shadow duration-300" />
          <span className="font-semibold text-lg text-text-primary">BlackBox</span>
          <span className="text-xs font-medium text-accent mt-1">COO</span>
        </button>

        {/* Step progress */}
        <StepProgress current={step} total={TOTAL_STEPS} />

        {/* ── Step 1: Company name ── */}
        {step === 1 && (
          <div className="glass-panel space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                <Building2 size={28} className="text-accent" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary">Name your company</h1>
              <p className="text-sm text-text-secondary mt-1 max-w-sm mx-auto">
                This is your workspace — your team, data, and AI agents all live here. You can
                always change it later.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary" htmlFor="companyName">
                Company name
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Brew & Bean Coffee Co."
                required
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleNext()}
                className="w-full h-12 px-4 rounded-xl bg-surface border border-border text-text-primary text-base placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
              />
            </div>
          </div>
        )}

        {/* ── Step 2: Industry selection ── */}
        {step === 2 && (
          <div className="glass-panel space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                <Store size={28} className="text-accent" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary">What&apos;s your industry?</h1>
              <p className="text-sm text-text-secondary mt-1">
                We&apos;ll tailor the dashboard, AI reports, and suggestions to your business type.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {INDUSTRIES.map(({ value, icon: Icon, desc }) => {
                const selected = industry === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setIndustry(value)}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all duration-150 cursor-pointer ${
                      selected
                        ? "bg-accent/10 border-2 border-accent shadow-[0_0_20px_rgba(158,255,0,0.1)]"
                        : "bg-surface border border-border hover:border-border-hover hover:bg-surface-hover"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        selected ? "bg-accent text-black" : "bg-accent-subtle text-accent"
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <span
                        className={`text-sm font-medium block ${
                          selected ? "text-accent" : "text-text-primary"
                        }`}
                      >
                        {value}
                      </span>
                      <span className="text-[11px] text-text-muted leading-tight block mt-0.5">
                        {desc}
                      </span>
                    </div>
                    {selected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                        <Check size={12} className="text-black" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 3: Company size & job role ── */}
        {step === 3 && (
          <div className="glass-panel space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                <Users size={28} className="text-accent" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary">Tell us about your team</h1>
              <p className="text-sm text-text-secondary mt-1">
                This helps us scale the experience. Pick what fits best.
              </p>
            </div>

            {/* Company size */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary">Company size</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COMPANY_SIZES.map(({ value, label, desc }) => {
                  const selected = size === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSize(value)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                        selected
                          ? "bg-accent/10 border-2 border-accent"
                          : "bg-surface border border-border hover:border-border-hover hover:bg-surface-hover"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          selected ? "bg-accent text-black" : "bg-accent-subtle text-accent"
                        }`}
                      >
                        {selected ? <Check size={16} /> : <Users size={16} />}
                      </div>
                      <div>
                        <span
                          className={`text-sm font-medium block ${
                            selected ? "text-accent" : "text-text-primary"
                          }`}
                        >
                          {label}
                        </span>
                        <span className="text-[11px] text-text-muted">{desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Job role */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary">Your role</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {JOB_ROLES.map(({ value, icon: Icon, desc }) => {
                  const selected = jobRole === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setJobRole(value)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                        selected
                          ? "bg-accent/10 border-2 border-accent"
                          : "bg-surface border border-border hover:border-border-hover hover:bg-surface-hover"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          selected ? "bg-accent text-black" : "bg-accent-subtle text-accent"
                        }`}
                      >
                        <Icon size={16} />
                      </div>
                      <div>
                        <span
                          className={`text-sm font-medium block ${
                            selected ? "text-accent" : "text-text-primary"
                          }`}
                        >
                          {value}
                        </span>
                        <span className="text-[11px] text-text-muted">{desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Feature interests ── */}
        {step === 4 && (
          <div className="glass-panel space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles size={28} className="text-accent" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary">What do you want to track?</h1>
              <p className="text-sm text-text-secondary mt-1">
                Pick the areas you care about most. We&apos;ll set up the relevant dashboards, AI
                agents, and reports.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FEATURES.map(({ id, label, icon: Icon, color }) => {
                const selected = selectedFeatures.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleFeature(id)}
                    className={`flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                      selected
                        ? "bg-accent/10 border-2 border-accent"
                        : "bg-surface border border-border hover:border-border-hover hover:bg-surface-hover"
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: selected ? color : `${color}15`,
                      }}
                    >
                      <Icon
                        size={16}
                        style={{ color: selected ? "#000" : color }}
                      />
                    </div>
                    <div className="flex-1">
                      <span
                        className={`text-sm font-medium block ${
                          selected ? "text-accent" : "text-text-primary"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        selected
                          ? "bg-accent border-accent"
                          : "border-border bg-transparent"
                      }`}
                    >
                      {selected && <Check size={12} className="text-black" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-text-muted text-center">
              You can enable or disable features anytime in Settings.
            </p>
          </div>
        )}

        {/* ── Step 5: Review & confirm ── */}
        {step === 5 && (
          <div className="glass-panel space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-accent" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary">Almost there!</h1>
              <p className="text-sm text-text-secondary mt-1">
                Here&apos;s a summary of your setup. Everything can be changed later.
              </p>
            </div>

            <div className="space-y-3">
              {/* Company */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface border border-border">
                <div className="w-9 h-9 rounded-lg bg-accent-subtle flex items-center justify-center">
                  <Building2 size={16} className="text-accent" />
                </div>
                <div>
                  <p className="text-xs text-text-muted">Company</p>
                  <p className="text-sm font-medium text-text-primary">{companyName}</p>
                </div>
              </div>

              {/* Industry */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface border border-border">
                <div className="w-9 h-9 rounded-lg bg-accent-subtle flex items-center justify-center">
                  <Store size={16} className="text-accent" />
                </div>
                <div>
                  <p className="text-xs text-text-muted">Industry</p>
                  <p className="text-sm font-medium text-text-primary">{industry}</p>
                </div>
              </div>

              {/* Size */}
              {size && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface border border-border">
                  <div className="w-9 h-9 rounded-lg bg-accent-subtle flex items-center justify-center">
                    <Users size={16} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Company size</p>
                    <p className="text-sm font-medium text-text-primary">
                      {COMPANY_SIZES.find((s) => s.value === size)?.label ?? size}
                    </p>
                  </div>
                </div>
              )}

              {/* Role */}
              {jobRole && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface border border-border">
                  <div className="w-9 h-9 rounded-lg bg-accent-subtle flex items-center justify-center">
                    <Briefcase size={16} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Your role</p>
                    <p className="text-sm font-medium text-text-primary">{jobRole}</p>
                  </div>
                </div>
              )}

              {/* Features */}
              {selectedFeatures.length > 0 && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface border border-border">
                  <div className="w-9 h-9 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0">
                    <Sparkles size={16} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-text-muted mb-1">Selected features</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFeatures.map((f) => {
                        const feat = FEATURES.find((x) => x.id === f);
                        if (!feat) return null;
                        return (
                          <span
                            key={f}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-accent bg-accent/10"
                          >
                            <feat.icon size={11} />
                            {feat.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-accent/5 border border-accent/10 rounded-xl p-3 text-center">
              <p className="text-xs text-text-secondary">
                <Sparkles size={12} className="inline mr-1 text-accent" />
                Your AI COO will be ready to help you manage{" "}
                {industry?.toLowerCase() ?? "your business"} right away.
              </p>
            </div>
          </div>
        )}

        {/* ── Error message ── */}
        {error && (
          <div
            role="alert"
            className="mt-4 px-4 py-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm animate-fade-in"
          >
            {error}
          </div>
        )}

        {/* ── Navigation buttons ── */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleBack}
              icon={ArrowLeft}
              className="flex-1 sm:flex-none"
            >
              Back
            </Button>
          )}

          {step < TOTAL_STEPS ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
              icon={ArrowRight}
              className="flex-1"
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              loading={loading}
              icon={Sparkles}
              className="flex-1 sm:flex-1"
            >
              Launch my dashboard
            </Button>
          )}
        </div>

        {/* ── Skip hint ── */}
        <p className="text-xs text-text-muted text-center mt-4">
          <Sparkles size={12} className="inline mr-1 text-accent" />
          Everything can be changed later in Settings.
        </p>
      </div>
    </div>
  );
}
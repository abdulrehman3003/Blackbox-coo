import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Building2, ArrowRight, Sparkles } from "lucide-react";
import Button from "../components/ui/Button";

const industries = [
  "Coffee Shop",
  "Restaurant",
  "Retail",
  "E-Commerce",
  "SaaS",
  "Agency",
  "Consulting",
  "Manufacturing",
  "Healthcare",
  "Education",
  "Real Estate",
  "Other",
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("Give your company a name to get started.");
      return;
    }
    if (!industry) {
      setError("Pick an industry so we can tailor your experience.");
      return;
    }
    if (!user) {
      setError("You need to be signed in. Please log in again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Look up any existing profile/company. A legacy signup trigger used to
      // auto-create a "My Coffee Shop" company for every new user — in that
      // case we update it instead of inserting (which would violate the
      // unique owner_id constraint). On a normal fresh signup nothing exists.
      const { data: existing, error: lookupError } = await supabase
        .from("users")
        .select("id, company_id, companies!fk_users_company(id, name, industry)")
        .eq("id", user.id)
        .maybeSingle();
      if (lookupError) throw lookupError;

      const rawCompany = existing?.companies ?? null;
      const existingCompany = Array.isArray(rawCompany) ? rawCompany[0] ?? null : rawCompany;

      let companyId: string;

      if (existingCompany) {
        // Company already exists (auto-created) — update with chosen details
        const { data: updatedCompany, error: companyError } = await supabase
          .from("companies")
          .update({ name: companyName.trim(), industry })
          .eq("id", existingCompany.id)
          .select("id")
          .single();
        if (companyError) throw companyError;
        companyId = updatedCompany.id;
      } else {
        // Fresh signup — create the company
        const { data: companyRow, error: companyError } = await supabase
          .from("companies")
          .insert({
            owner_id: user.id,
            name: companyName.trim(),
            industry,
          })
          .select("id")
          .single();
        if (companyError) throw companyError;
        companyId = companyRow.id;
      }

      if (existing) {
        // Profile exists — make sure it's linked to the company
        if (existing.company_id !== companyId) {
          const { error: linkError } = await supabase
            .from("users")
            .update({ company_id: companyId })
            .eq("id", user.id);
          if (linkError) throw linkError;
        }
      } else {
        // Fresh signup — create the user profile linked to the company
        const { error: profileError } = await supabase.from("users").insert({
          id: user.id,
          email: user.email ?? "",
          full_name: (user.user_metadata?.full_name as string) || null,
          role: "owner",
          company_id: companyId,
        });
        if (profileError) throw profileError;
      }

      // Ensure default AI settings exist for the company
      const { data: existingSettings } = await supabase
        .from("company_settings")
        .select("id")
        .eq("company_id", companyId)
        .maybeSingle();
      if (!existingSettings) {
        const { error: settingsError } = await supabase
          .from("company_settings")
          .insert({
            company_id: companyId,
            ai_provider: "gemini",
            ai_model: "gemini-2.0-flash-lite",
          });
        if (settingsError) throw settingsError;
      }

      await refreshProfile();
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 w-[600px] h-[500px] bg-accent/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="w-full max-w-lg animate-fade-in relative z-10">
        {/* Logo */}
        <button
          onClick={() => navigate("/")}
          className="mx-auto flex items-center gap-2.5 mb-8 cursor-pointer"
          aria-label="Back to home"
        >
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <span className="text-black font-bold text-lg">B</span>
          </div>
          <span className="font-semibold text-lg text-text-primary">BlackBox</span>
          <span className="text-xs font-medium text-accent mt-1">COO</span>
        </button>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s <= step ? "bg-accent w-12" : "bg-border w-6"
              }`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="glass-panel space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
              <Building2 size={28} className="text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">
              {step === 1 ? "Name your company" : "What industry?"}
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              {step === 1
                ? "This is your workspace — your team, data, and AI all live here."
                : "We'll tailor the dashboard, reports, and AI suggestions to your industry."}
            </p>
          </div>

          {step === 1 && (
            <div className="space-y-1">
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
                className="w-full h-11 px-4 rounded-xl bg-surface border border-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
              />
              <p className="text-[11px] text-text-muted mt-1.5">
                You can always change this later in Settings.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary" htmlFor="industry">
                Industry
              </label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {industries.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => setIndustry(ind)}
                    className={`h-10 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                      industry === ind
                        ? "bg-accent text-black border-accent border"
                        : "bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-border-hover"
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="px-3 py-2.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs"
            >
              {error}
            </div>
          )}

          <div className="flex gap-3">
            {step === 2 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Back
              </Button>
            )}
            {step === 1 ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => setStep(2)}
                className="flex-1"
                icon={ArrowRight}
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                loading={loading}
                icon={Sparkles}
              >
                Launch my dashboard
              </Button>
            )}
          </div>
        </form>

        <p className="text-xs text-text-muted text-center mt-4">
          <Sparkles size={12} className="inline mr-1 text-accent" />
          Everything is saved and stays private to your company
        </p>
      </div>
    </div>
  );
}
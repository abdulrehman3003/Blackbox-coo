import { useState, type FormEvent, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { User, Building2, Mail, Save } from "lucide-react";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import GlassCard from "../components/ui/GlassCard";

export default function ProfilePage() {
  const { profile, company, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
    if (company?.name) setCompanyName(company.name);
    if (company?.industry) setIndustry(company.industry);
  }, [profile, company]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      // Update user profile
      if (fullName.trim() !== profile?.full_name) {
        const { error: userErr } = await supabase
          .from("users")
          .update({ full_name: fullName.trim() })
          .eq("id", profile?.id);
        if (userErr) throw userErr;
      }

      // Update company info
      if (company && (companyName.trim() !== company.name || industry !== company.industry)) {
        const { error: companyErr } = await supabase
          .from("companies")
          .update({
            name: companyName.trim(),
            industry: industry || "Coffee Shop",
          })
          .eq("id", company.id);
        if (companyErr) throw companyErr;
      }

      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save changes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your account and company details"
        icon={User}
      />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Profile section */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <User size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Personal Information</h2>
              <p className="text-xs text-text-muted">Your name and contact details</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary" htmlFor="fullName">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary" htmlFor="email">
                Email
              </label>
              <div className="flex items-center h-10 px-3 rounded-xl bg-surface border border-border/50 text-text-muted text-sm gap-2">
                <Mail size={14} />
                <span>{profile?.email || "—"}</span>
              </div>
              <p className="text-[11px] text-text-muted mt-1">
                Email is managed via your auth provider and cannot be changed here.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Company section */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Building2 size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Company</h2>
              <p className="text-xs text-text-muted">Your business details</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary" htmlFor="companyName">
                Company name
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. My Coffee Shop"
                className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary" htmlFor="industry">
                Industry
              </label>
              <select
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
              >
                <option value="">Select industry</option>
                {["Coffee Shop", "Restaurant", "Retail", "E-Commerce", "SaaS", "Agency", "Consulting", "Manufacturing", "Healthcare", "Education", "Real Estate", "Other"].map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
          </div>
        </GlassCard>

        {error && (
          <div
            role="alert"
            className="px-3 py-2.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs"
          >
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" loading={loading} icon={Save}>
            Save Changes
          </Button>
          {saved && (
            <span className="text-xs text-success animate-fade-in">
              ✓ Changes saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
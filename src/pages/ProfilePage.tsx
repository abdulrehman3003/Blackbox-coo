import { useState, useRef, type FormEvent, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  User,
  Building2,
  Mail,
  Save,
  Camera,
  Globe,
  Phone,
  Briefcase,
  FileText,
  Users,
  Lock,
  LogOut,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Clock,
} from "lucide-react";
import Button from "../components/ui/Button";
import GlassCard from "../components/ui/GlassCard";
import Modal from "../components/ui/Modal";

/* ─── Industry options ─── */
const INDUSTRIES = [
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
] as const;

const COMPANY_SIZES = [
  { value: "1-5", label: "1–5 employees" },
  { value: "6-20", label: "6–20 employees" },
  { value: "21-50", label: "21–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "200+", label: "200+ employees" },
] as const;

const JOB_ROLES = [
  "Owner / Founder",
  "CEO / Executive",
  "Operations Manager",
  "Finance / Accounting",
  "Sales / Marketing",
  "Product Manager",
  "Administrator",
  "Other",
] as const;

/* ─── Tab config ─── */
type TabId = "personal" | "company" | "security";

const TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: "personal", label: "Personal", icon: User },
  { id: "company", label: "Company", icon: Building2 },
  { id: "security", label: "Security", icon: Lock },
];

/* ─── Utils ─── */
function getAvatarUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

export default function ProfilePage() {
  const { user, profile, company, refreshProfile, updatePassword, signOut } = useAuth();

  /* ─── Local state ─── */
  const [activeTab, setActiveTab] = useState<TabId>("personal");

  // Personal
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [jobRole, setJobRole] = useState("");

  // Company
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [size, setSize] = useState("");

  // Security
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Delete confirm modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ─── Hydrate from auth context ─── */
  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
    if (profile?.phone) setPhone(profile.phone);
    if (profile?.bio) setBio(profile.bio);
    if (profile?.job_role) setJobRole(profile.job_role);
    if (company?.name) setCompanyName(company.name);
    if (company?.industry) setIndustry(company.industry);
    if (company?.website) setWebsite(company.website);
    if (company?.description) setDescription(company.description);
    if (company?.size) setSize(company.size);
  }, [profile, company]);

  /* ─── Avatar upload ─── */
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2 MB.");
      return;
    }

    setUploadLoading(true);
    setError(null);

    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { error: updateErr } = await supabase
        .from("users")
        .update({ avatar_url: filePath })
        .eq("id", user.id);
      if (updateErr) throw updateErr;

      await refreshProfile();
      setSaved("Avatar updated!");
      setTimeout(() => setSaved(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* ─── Remove avatar ─── */
  const handleRemoveAvatar = async () => {
    if (!profile?.avatar_url || !user) return;
    setLoading(true);
    try {
      const { error: removeErr } = await supabase.storage
        .from("avatars")
        .remove([profile.avatar_url]);
      if (removeErr) throw removeErr;

      await supabase.from("users").update({ avatar_url: null }).eq("id", user.id);
      await refreshProfile();
      setSaved("Avatar removed.");
      setTimeout(() => setSaved(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove avatar.");
    } finally {
      setLoading(false);
    }
  };

  /* ─── Save personal info ─── */
  const savePersonal = async () => {
    if (!user || !profile) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          bio: bio.trim() || null,
          job_role: jobRole || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      setSaved("Personal info saved!");
      setTimeout(() => setSaved(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setLoading(false);
    }
  };

  /* ─── Save company info ─── */
  const saveCompany = async () => {
    if (!company) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from("companies")
        .update({
          name: companyName.trim(),
          industry: industry || "Coffee Shop",
          website: website.trim() || null,
          description: description.trim() || null,
          size: size || null,
        })
        .eq("id", company.id);
      if (error) throw error;
      await refreshProfile();
      setSaved("Company info saved!");
      setTimeout(() => setSaved(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setLoading(false);
    }
  };

  /* ─── Change password ─── */
  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) throw error;
      setSaved("Password updated!");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSaved(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update password.");
    } finally {
      setLoading(false);
    }
  };

  /* ─── Delete account ─── */
  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("delete_user_account");
      if (error) throw error;
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete account. Contact support.");
      setLoading(false);
      setDeleteModalOpen(false);
    }
  };

  /* ─── Render ─── */
  const avatarUrl = getAvatarUrl(profile?.avatar_url ?? null);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Profile
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your account, company details, and security
          </p>
        </div>
        <Button variant="secondary" onClick={signOut} icon={LogOut}>
          Sign Out
        </Button>
      </div>

      {/* ── Avatar section ── */}
      <div className="glass-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="relative group shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-surface border border-border flex items-center justify-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile?.full_name ?? "Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={32} className="text-text-muted" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadLoading}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-accent text-black flex items-center justify-center hover:bg-accent-hover transition-colors shadow-lg cursor-pointer disabled:opacity-50"
              aria-label="Upload avatar"
            >
              {uploadLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={14} />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-text-primary">
              {profile?.full_name || "Your Name"}
            </h2>
            <p className="text-sm text-text-secondary">{profile?.email}</p>
            <p className="text-xs text-text-muted mt-1 capitalize">
              {profile?.role?.replace("_", " ")} · Joined{" "}
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })
                : "recently"}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {profile?.avatar_url && (
              <Button variant="ghost" size="sm" onClick={handleRemoveAvatar} loading={loading}>
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-surface rounded-xl border border-border w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-accent text-black shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Personal Tab ── */}
      {activeTab === "personal" && (
        <GlassCard padding="lg">
          <div className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary" htmlFor="fullName">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
              />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Email address</label>
              <div className="flex items-center h-10 px-3 rounded-xl bg-surface border border-border/50 text-text-muted text-sm gap-2">
                <Mail size={14} />
                <span>{profile?.email || "—"}</span>
              </div>
              <p className="text-[11px] text-text-muted">
                Managed via your auth provider. To change it, contact support.
              </p>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary" htmlFor="phone">
                Phone number
              </label>
              <div className="relative">
                <Phone
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface border border-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
                />
              </div>
            </div>

            {/* Job role */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary" htmlFor="jobRole">
                Job role
              </label>
              <div className="relative">
                <Briefcase
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted z-10"
                />
                <select
                  id="jobRole"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface border border-border text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Select your role</option>
                  {JOB_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary" htmlFor="bio">
                Bio
              </label>
              <textarea
                id="bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short description about yourself..."
                className="w-full resize-none px-3 py-2.5 rounded-xl bg-surface border border-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
              />
            </div>

            <div className="pt-2">
              <Button variant="primary" onClick={savePersonal} loading={loading} icon={Save}>
                Save Personal Info
              </Button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ── Company Tab ── */}
      {activeTab === "company" && (
        <div className="space-y-5">
          <GlassCard padding="lg">
            <div className="space-y-5">
              {/* Company name */}
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
                  className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
                />
              </div>

              {/* Industry */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary" htmlFor="industry">
                  Industry
                </label>
                <select
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors cursor-pointer"
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              {/* Company size */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary" htmlFor="size">
                  Company size
                </label>
                <div className="relative">
                  <Users
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted z-10"
                  />
                  <select
                    id="size"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface border border-border text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="">Select company size</option>
                    {COMPANY_SIZES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Website */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary" htmlFor="website">
                  Website
                </label>
                <div className="relative">
                  <Globe
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface border border-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary" htmlFor="description">
                  Company description
                </label>
                <div className="relative">
                  <FileText
                    size={14}
                    className="absolute left-3 top-3 text-text-muted"
                  />
                  <textarea
                    id="description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell us about your business..."
                    className="w-full resize-none pl-9 pr-3 py-2.5 rounded-xl bg-surface border border-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button variant="primary" onClick={saveCompany} loading={loading} icon={Save}>
                  Save Company Info
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* Industry stats */}
          <GlassCard padding="md">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0">
                <Building2 size={16} className="text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-text-primary">Industry tailoring</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Your industry helps us tailor the dashboard metrics, AI reports, and suggestions.
                  {industry
                    ? ` Currently set to ${industry}.`
                    : " Select one above to get started."}
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Security Tab ── */}
      {activeTab === "security" && (
        <div className="space-y-5">
          {/* Change password */}
          <GlassCard padding="lg" title="Change Password" icon={Lock}>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-text-secondary"
                  htmlFor="newPassword"
                >
                  New password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-text-secondary"
                  htmlFor="confirmPassword"
                >
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  minLength={8}
                  className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
                />
              </div>
              <div className="pt-1">
                <Button type="submit" variant="primary" loading={loading} icon={Lock}>
                  Update Password
                </Button>
              </div>
            </form>
          </GlassCard>

          {/* Password requirements */}
          <GlassCard padding="md">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0">
                <Shield size={16} className="text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-text-primary">Security tips</h3>
                <ul className="text-xs text-text-muted mt-1.5 space-y-1">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-success shrink-0" />
                    Use at least 8 characters
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-success shrink-0" />
                    Mix letters, numbers, and symbols
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-success shrink-0" />
                    Don&apos;t reuse passwords from other sites
                  </li>
                </ul>
              </div>
            </div>
          </GlassCard>

          {/* Session info */}
          <GlassCard padding="md" title="Session" icon={Clock}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-text-secondary">Signed in as</span>
                <span className="text-text-primary font-medium">{profile?.email}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-text-secondary">Account created</span>
                <span className="text-text-primary">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-text-secondary">Role</span>
                <span className="text-text-primary capitalize">
                  {profile?.role?.replace("_", " ") || "—"}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Danger zone */}
          <GlassCard padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-danger/10 border border-danger/30 flex items-center justify-center">
                <AlertTriangle size={16} className="text-danger" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Danger Zone</h3>
                <p className="text-xs text-text-muted">Irreversible account actions</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-danger/[0.03] border border-danger/10">
              <div>
                <p className="text-sm font-medium text-text-primary">Delete your account</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Permanently delete your account and all associated data.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeleteModalOpen(true)}
                icon={Trash2}
              >
                Delete Account
              </Button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Feedback messages ── */}
      {saved && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-success/10 border border-success/30 text-success text-sm shadow-lg animate-slide-up">
          <CheckCircle2 size={16} />
          {saved}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm shadow-lg animate-slide-up"
        >
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete your account?"
        description="This action cannot be undone. All data — including company info, tasks, reports, and uploaded files — will be permanently deleted."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={loading}
              onClick={handleDeleteAccount}
              icon={Trash2}
            >
              Yes, delete everything
            </Button>
          </>
        }
      >
        <div className="p-4 rounded-xl bg-danger/[0.03] border border-danger/10 text-xs text-text-muted leading-relaxed">
          <p className="font-medium text-danger mb-1">This will:</p>
          <ul className="space-y-1">
            <li>· Permanently delete your user profile</li>
            <li>· Remove your company and all its data</li>
            <li>· Delete all tasks, sales, expenses, and reports</li>
            <li>· Cancel all pending invitations</li>
            <li>· You will be signed out immediately</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
}
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus, KeyRound, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import Button from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";

type AuthMode = "login" | "signup" | "reset";

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const switchMode = (m: AuthMode) => {
    setMode(m);
    setError(null);
    setResetSent(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error: err } = await signIn(email.trim(), password);
        if (err) {
          setError(
            err.message === "Invalid login credentials"
              ? "That email and password don't match. Double-check and try again."
              : err.message,
          );
        }
      } else if (mode === "signup") {
        if (password.length < 6) {
          setError("Password needs at least 6 characters.");
          setLoading(false);
          return;
        }
        const { error: err } = await signUp(email.trim(), password, fullName.trim());
        if (err) setError(err.message);
      } else {
        const { error: err } = await resetPassword(email.trim());
        if (err) {
          setError(err.message);
        } else {
          setResetSent(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const modes: { key: AuthMode; label: string; icon: typeof LogIn }[] = [
    { key: "login", label: "Sign In", icon: LogIn },
    { key: "signup", label: "Sign Up", icon: UserPlus },
    { key: "reset", label: "Reset", icon: KeyRound },
  ];

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 w-[500px] h-[400px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm animate-fade-in relative z-10">
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

        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold text-text-primary">
            {mode === "login" && "Welcome back"}
            {mode === "signup" && "Create your account"}
            {mode === "reset" && "Reset your password"}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {mode === "login" && "Sign in to your BlackBox COO dashboard"}
            {mode === "signup" && "Set up your company in under a minute"}
            {mode === "reset" && "We'll email you a link to reset it"}
          </p>
        </div>

        {/* Mode switcher */}
        <div className="flex p-1 rounded-xl bg-surface border border-border mb-6" role="tablist" aria-label="Authentication mode">
          {modes.map((m) => (
            <button
              key={m.key}
              role="tab"
              aria-selected={mode === m.key}
              onClick={() => switchMode(m.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                mode === m.key
                  ? "bg-accent text-black shadow-[0_0_16px_rgba(158,255,0,0.2)]"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <m.icon size={13} />
              {m.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="glass-panel space-y-4">
          {mode === "signup" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary" htmlFor="fullName">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required
                className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
            />
          </div>

          {mode !== "reset" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
              />
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

          {resetSent && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-success/10 border border-success/30 text-success text-xs">
              <CheckCircle2 size={14} className="shrink-0" />
              Reset link sent — check your inbox.
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={loading}
            icon={mode === "login" ? LogIn : mode === "signup" ? UserPlus : KeyRound}
          >
            {mode === "login" && "Sign In"}
            {mode === "signup" && "Create Account"}
            {mode === "reset" && "Send Reset Link"}
          </Button>

          {mode === "login" && (
            <button
              type="button"
              onClick={() => switchMode("reset")}
              className="w-full text-center text-xs text-text-muted hover:text-accent transition-colors cursor-pointer"
            >
              Forgot your password?
            </button>
          )}

          {mode === "signup" && (
            <div className="flex items-center gap-1.5 text-xs text-text-muted justify-center">
              <Sparkles size={12} className="text-accent" />
              Your company workspace is created automatically
            </div>
          )}

          {mode !== "login" && (
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="w-full flex items-center justify-center gap-1 text-xs text-text-muted hover:text-accent transition-colors cursor-pointer"
            >
              Already have an account? Sign in <ArrowRight size={12} />
            </button>
          )}
        </form>

        <p className="text-xs text-text-muted text-center mt-4">
          Protected by Supabase Auth &middot; Your data stays yours
        </p>
      </div>
    </div>
  );
}
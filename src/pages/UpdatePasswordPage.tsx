import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, CheckCircle2 } from "lucide-react";
import Button from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";

export default function UpdatePasswordPage() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password needs at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await updatePassword(password);
      if (err) {
        setError(err.message);
      } else {
        setUpdated(true);
        setTimeout(() => navigate("/login"), 2500);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-1/3 w-[500px] h-[400px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm animate-fade-in relative z-10">
        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
            <KeyRound size={28} className="text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Set new password</h1>
          <p className="text-sm text-text-secondary mt-1">
            Choose a strong password you haven't used before
          </p>
        </div>

        {updated ? (
          <div className="glass-panel text-center space-y-3">
            <CheckCircle2 size={40} className="text-success mx-auto" />
            <p className="text-sm font-medium text-text-primary">Password updated!</p>
            <p className="text-xs text-text-muted">Redirecting to login…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-panel space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary" htmlFor="password">
                New password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoFocus
                className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary" htmlFor="confirm">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="px-3 py-2.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs"
              >
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" loading={loading}>
              Update Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
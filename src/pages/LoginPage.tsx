import Button from "../components/ui/Button";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent mb-4">
            <span className="text-black font-bold text-lg">B</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
          <p className="text-sm text-text-secondary mt-1">
            Sign in to your BlackBox COO dashboard
          </p>
        </div>

        {/* Placeholder — real form in task 3 */}
        <div className="glass-panel space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
            />
          </div>
          <Button variant="primary" className="w-full" icon={LogIn}>
            Sign In
          </Button>
        </div>

        <p className="text-xs text-text-muted text-center mt-4">
          Protected by Supabase Auth &middot; Enterprise-grade security
        </p>
      </div>
    </div>
  );
}
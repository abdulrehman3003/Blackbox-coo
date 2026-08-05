import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import Button from "../components/ui/Button";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg overflow-hidden flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 sm:px-12 lg:px-24">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-black font-bold text-sm">B</span>
          </div>
          <span className="font-semibold text-sm text-text-primary">BlackBox</span>
          <span className="text-xs font-medium text-accent">COO</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
          Sign In
        </Button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center relative">
        {/* Glow */}
        <div className="absolute top-1/4 w-[600px] h-[400px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-8">
            <Sparkles size={12} />
            Your Virtual COO
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary tracking-tight leading-tight">
            Run your business like{" "}
            <span className="text-accent">a CEO</span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-text-secondary max-w-xl mx-auto leading-relaxed">
            BlackBox COO is the AI-powered operations dashboard for solo founders
            and small teams. Assign tasks, manage projects, and let AI drive your
            daily standups, reminders, and strategy.
          </p>

          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="primary"
              size="lg"
              icon={Sparkles}
              onClick={() => navigate("/login")}
            >
              Get Started Free
            </Button>
            <Button
              variant="ghost"
              size="lg"
              icon={ArrowRight}
              onClick={() => navigate("/login")}
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* Bottom dot grid */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-dot-grid opacity-50 pointer-events-none" />
      </main>
    </div>
  );
}
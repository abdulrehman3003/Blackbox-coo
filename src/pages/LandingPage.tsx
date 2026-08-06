import { useNavigate } from "react-router-dom";
import {
  Sparkles, ArrowRight, CheckCircle2, LayoutDashboard,
  FileText, Package, Upload, ChevronRight, Shield,
  BrainCircuit, TrendingUp, Zap, GraduationCap, Building2,
} from "lucide-react";
import Button from "../components/ui/Button";

const FEATURES = [
  {
    icon: BrainCircuit,
    title: "Multi-Agent AI Analysis",
    desc: "Sales, expenses, inventory, and customers analyzed simultaneously by a team of specialized AI agents.",
  },
  {
    icon: LayoutDashboard,
    title: "Executive Dashboard",
    desc: "Real-time metrics, health scores, and trend indicators. Know your business health at a glance.",
  },
  {
    icon: FileText,
    title: "Executive Reports",
    desc: "AI-synthesized reports with business scores, risk alerts, and tactical recommendations — delivered in seconds.",
  },
  {
    icon: Package,
    title: "Inventory Intelligence",
    desc: "Track stock levels, identify slow-moving items, and get reorder alerts before you run out.",
  },
  {
    icon: TrendingUp,
    title: "Revenue & Expense Tracking",
    desc: "Connect your data and get profit margin analysis, cost breakdowns, and revenue trend insights.",
  },
  {
    icon: Upload,
    title: "CSV / PDF Import",
    desc: "Upload your existing spreadsheets and invoices. The AI reads and structures them automatically.",
  },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: Upload,
    title: "Add Your Data",
    desc: "Upload CSV files, import from spreadsheets, or use sample data to get started in seconds.",
  },
  {
    step: 2,
    icon: BrainCircuit,
    title: "AI Analyzes Everything",
    desc: "A fleet of AI agents — Sales, Finance, Inventory, Marketing, Operations — processes every record.",
  },
  {
    step: 3,
    icon: Sparkles,
    title: "Get Actionable Insights",
    desc: "Receive a complete executive report with health scores, risks, opportunities, and step-by-step recommendations.",
  },
];

const PRICING_TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Perfect for solo founders testing the waters.",
    features: [
      "AI-powered business analysis",
      "Up to 500 records per module",
      "1 workspace",
      "Sample data included",
      "CSV & PDF import",
      "Basic executive reports",
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    desc: "For growing teams that need deeper insights.",
    features: [
      "Everything in Free",
      "Unlimited records",
      "Up to 5 team members",
      "Advanced AI models",
      "Custom report templates",
      "Priority support",
      "API access",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For organizations with dedicated requirements.",
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "Custom AI model tuning",
      "SSO & SAML",
      "Dedicated support",
      "On-premise deployment",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg overflow-hidden">
      {/* ──────────── HEADER ──────────── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-bg/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3 sm:px-10">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2.5 cursor-pointer"
            aria-label="Scroll to top"
          >
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-black font-bold text-sm">B</span>
            </div>
            <span className="font-semibold text-sm text-text-primary hidden sm:inline">
              BlackBox
            </span>
            <span className="text-xs font-medium text-accent hidden sm:inline">COO</span>
          </button>

          <nav className="hidden md:flex items-center gap-8">
            {["Features", "How It Works", "Pricing"].map((item) => (
              <button
                key={item}
                onClick={() => {
                  const id = item.toLowerCase().replace(/\s+/g, "-");
                  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
              Sign In
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Sparkles}
              onClick={() => navigate("/login")}
              className="hidden sm:inline-flex"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* ──────────── HERO ──────────── */}
      <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16 px-6">
        {/* Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-accent-glow rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-accent/3 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center animate-fade-in">
          {/* Badge */}
          <a
            href="#features"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-8 hover:bg-accent/15 transition-colors cursor-pointer"
          >
            <Sparkles size={12} />
            Your Virtual COO
            <ChevronRight size={12} />
          </a>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-text-primary tracking-tight leading-[1.1]">
            Run your business like{" "}
            <span className="text-accent relative">
              a CEO
              <span className="absolute -bottom-2 left-0 right-0 h-1 bg-accent/30 rounded-full blur-sm" />
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg md:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
            BlackBox COO is the AI-powered operations dashboard for solo founders
            and small teams. Upload your data, and let AI agents analyze your entire
            business — sales, expenses, inventory, and customers — in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
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
              onClick={() =>
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              See Features
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-success" /> No credit card
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-success" /> Free tier included
            </span>
            <span className="flex items-center gap-1.5">
              <Shield size={14} className="text-accent" /> Your data stays private
            </span>
          </div>

          {/* Hero mockup card */}
          <div className="mt-16 max-w-3xl mx-auto glass-card p-4 sm:p-6 md:p-8 text-left border-border-hover/50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-danger" />
              <div className="w-3 h-3 rounded-full bg-warning" />
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="ml-3 text-xs text-text-muted font-mono">executive-report</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted font-mono">Business Health Score</span>
                <span className="text-lg font-bold text-accent font-mono">87</span>
              </div>
              <div className="h-2 rounded-full bg-surface overflow-hidden">
                <div className="h-full w-[87%] rounded-full bg-accent transition-all duration-1000" />
              </div>
              <div className="grid grid-cols-3 gap-4 pt-2">
                {[
                  { label: "Revenue", value: "$12,450", trend: "+12%" },
                  { label: "Profit Margin", value: "34.2%", trend: "+2.1%" },
                  { label: "Orders", value: "342", trend: "+8%" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-[10px] text-text-muted font-mono uppercase tracking-wider">{stat.label}</p>
                    <p className="text-sm font-semibold text-text-primary mt-0.5">{stat.value}</p>
                    <p className="text-[10px] text-success mt-0.5">{stat.trend}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── FEATURES ──────────── */}
      <section id="features" className="relative py-24 sm:py-32 px-6">
        <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-4">
              <Zap size={12} />
              Features
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
              Everything you need to{" "}
              <span className="text-accent">run your business</span>
            </h2>
            <p className="mt-4 text-base text-text-secondary">
              From data import to executive insights — BlackBox COO handles the heavy lifting.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="glass-card p-5 sm:p-6 hover:border-accent/30 transition-all duration-300 group"
              >
                <div className="w-11 h-11 rounded-xl bg-accent-subtle border border-accent/20 flex items-center justify-center mb-4 group-hover:bg-accent/10 transition-colors">
                  <feature.icon size={20} className="text-accent" />
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-2">{feature.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── HOW IT WORKS ──────────── */}
      <section id="how-it-works" className="relative py-24 sm:py-32 px-6">
        <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-accent/3 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-4">
              <GraduationCap size={12} />
              How It Works
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
              Three steps to{" "}
              <span className="text-accent">business clarity</span>
            </h2>
            <p className="mt-4 text-base text-text-secondary">
              No setup, no training. Just upload and get insights.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 sm:gap-10">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="text-center relative">
                {/* Connector line */}
                {step.step < 3 && (
                  <div className="hidden sm:block absolute top-16 left-[60%] w-[80%] h-px bg-border/50" />
                )}
                <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-5">
                  <step.icon size={24} className="text-accent" />
                </div>
                <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent text-black text-xs font-bold mb-3">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">{step.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── PRICING ──────────── */}
      <section id="pricing" className="relative py-24 sm:py-32 px-6">
        <div className="absolute inset-0 bg-dot-grid opacity-20 pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-4">
              <Building2 size={12} />
              Pricing
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
              Start free,{" "}
              <span className="text-accent">scale as you grow</span>
            </h2>
            <p className="mt-4 text-base text-text-secondary">
              No hidden fees. No surprises. Upgrade when you need more.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative glass-card p-6 sm:p-8 transition-all duration-300 ${
                  tier.popular
                    ? "border-accent/40 shadow-[0_0_30px_rgba(158,255,0,0.08)] scale-[1.02] sm:scale-105"
                    : "hover:border-border-hover"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-black text-[10px] font-bold uppercase tracking-wider">
                    Most Popular
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-text-primary">{tier.name}</h3>
                  <div className="mt-3">
                    <span className="text-4xl font-bold text-text-primary">{tier.price}</span>
                    {tier.period && (
                      <span className="text-sm text-text-muted ml-1">{tier.period}</span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-2">{tier.desc}</p>
                </div>

                <ul className="space-y-2.5 mb-8">
                  {tier.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm text-text-secondary">
                      <CheckCircle2 size={15} className="text-accent shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={tier.popular ? "primary" : "ghost"}
                  className="w-full"
                  onClick={() => navigate("/login")}
                  icon={tier.popular ? Sparkles : undefined}
                >
                  {tier.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── CTA ──────────── */}
      <section className="relative py-24 sm:py-32 px-6">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent-glow rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
            Ready to take control of{" "}
            <span className="text-accent">your business data?</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-text-secondary max-w-xl mx-auto">
            Join thousands of founders using BlackBox COO to run smarter, faster, and with total clarity.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
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
              onClick={() => navigate("/login")}
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* ──────────── FOOTER ──────────── */}
      <footer className="border-t border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                  <span className="text-black font-bold text-sm">B</span>
                </div>
                <span className="font-semibold text-sm text-text-primary">BlackBox</span>
                <span className="text-xs font-medium text-accent">COO</span>
              </div>
              <p className="text-sm text-text-secondary max-w-sm leading-relaxed">
                AI-powered operations dashboard for solo founders and small teams.
                Analyze your entire business with a team of specialized AI agents.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Product</h4>
              <ul className="space-y-3">
                {[
                  { label: "Features", href: "#features" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "How It Works", href: "#how-it-works" },
                  { label: "Dashboard", href: "/login" },
                ].map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => {
                        if (link.href.startsWith("#")) {
                          document.getElementById(link.href.slice(1))?.scrollIntoView({ behavior: "smooth" });
                        } else {
                          navigate(link.href);
                        }
                      }}
                      className="text-sm text-text-secondary hover:text-accent transition-colors cursor-pointer"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-3">
                {[
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Sign In", href: "/login" },
                  { label: "Create Account", href: "/login" },
                ].map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => navigate(link.href)}
                      className="text-sm text-text-secondary hover:text-accent transition-colors cursor-pointer"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-text-muted">
              &copy; {new Date().getFullYear()} BlackBox COO. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/privacy")}
                className="text-xs text-text-muted hover:text-accent transition-colors cursor-pointer"
              >
                Privacy
              </button>
              <button
                onClick={() => navigate("/login")}
                className="text-xs text-text-muted hover:text-accent transition-colors cursor-pointer"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, ArrowRight, CheckCircle2, BarChart3, LayoutDashboard,
  FileText, Package, Users2, Upload, ChevronRight, Shield,
  BrainCircuit, TrendingUp, Zap, GraduationCap, Building2,
  Menu, X, ChevronDown, Quote, Clock, Target, Star,
  HelpCircle, Layers, MessageSquareText, Globe, CreditCard,
  HardDrive, Bot, LineChart, Activity,
} from "lucide-react";
import { SiTwitter, SiGithub, SiLinkedin } from "react-icons/si";
import Button from "../components/ui/Button";

// ─── Data ──────────────────────────────────────────────────────────────────────

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
    desc: "AI-synthesized reports with business scores, risk alerts, and tactical recommendations.",
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
    icon: MessageSquareText,
    title: "AI COO Assistant",
    desc: "Chat with your virtual COO. Ask questions, get recommendations, and explore your data in plain English.",
  },
  {
    icon: Upload,
    title: "CSV / PDF Import",
    desc: "Upload your existing spreadsheets and invoices. The AI reads and structures them automatically.",
  },
  {
    icon: BarChart3,
    title: "Visual Analytics",
    desc: "Interactive charts, trend lines, and comparison views that make your data easy to understand.",
  },
  {
    icon: Bot,
    title: "Command Center",
    desc: "View every AI agent's analysis in one unified mission-control interface.",
  },
];

const HOW_IT_WORKS = [
  { step: 1, icon: Upload, title: "Add Your Data", desc: "Upload CSV files, import from spreadsheets, or use sample data to get started in seconds." },
  { step: 2, icon: BrainCircuit, title: "AI Analyzes Everything", desc: "A fleet of AI agents — Sales, Finance, Inventory, Marketing, Operations — processes every record." },
  { step: 3, icon: Sparkles, title: "Get Actionable Insights", desc: "Receive a complete executive report with health scores, risks, opportunities, and step-by-step recommendations." },
];

const STATS = [
  { value: "10K+", label: "Businesses onboarded", icon: Building2 },
  { value: "98.5%", label: "Accuracy rate", icon: Target },
  { value: "<30s", label: "Average report time", icon: Clock },
  { value: "4.9/5", label: "User rating", icon: Star },
];

const PRICING_TIERS = [
  {
    name: "Free",
    monthlyPrice: "$0",
    annualPrice: "$0",
    period: "forever",
    desc: "Perfect for solo founders testing the waters.",
    popular: false,
    features: [
      { text: "AI-powered business analysis", included: true },
      { text: "Up to 500 records per module", included: true },
      { text: "1 workspace", included: true },
      { text: "Sample data included", included: true },
      { text: "CSV & PDF import", included: true },
      { text: "Basic executive reports", included: true },
      { text: "Unlimited records", included: false },
      { text: "Team collaboration", included: false },
      { text: "API access", included: false },
    ],
    cta: "Get Started Free",
  },
  {
    name: "Pro",
    monthlyPrice: "$29",
    annualPrice: "$24",
    period: "/month",
    desc: "For growing teams that need deeper insights.",
    popular: true,
    features: [
      { text: "AI-powered business analysis", included: true },
      { text: "Unlimited records", included: true },
      { text: "Up to 5 workspaces", included: true },
      { text: "Advanced AI models (GPT-4)", included: true },
      { text: "Custom report templates", included: true },
      { text: "Priority support", included: true },
      { text: "API access", included: true },
      { text: "Team collaboration (up to 5)", included: true },
      { text: "Command Center", included: true },
    ],
    cta: "Start Free Trial",
  },
  {
    name: "Enterprise",
    monthlyPrice: "Custom",
    annualPrice: "Custom",
    period: "",
    desc: "For organizations with dedicated requirements.",
    popular: false,
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Unlimited team members", included: true },
      { text: "Unlimited workspaces", included: true },
      { text: "Custom AI model tuning", included: true },
      { text: "SSO & SAML", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "On-premise deployment", included: true },
      { text: "99.99% SLA guarantee", included: true },
      { text: "Custom integrations", included: true },
    ],
    cta: "Contact Sales",
  },
];

const FAQS = [
  { q: "What kind of data can I upload?", a: "You can upload CSV files, PDF invoices, and spreadsheets. The AI automatically reads, structures, and analyzes your data. We also provide sample datasets so you can explore the platform before importing your own data." },
  { q: "How does the AI analysis work?", a: "When you upload data, a team of specialized AI agents — Sales, Finance, Inventory, Marketing, and Operations — process your records in parallel. Each agent analyzes its domain, then synthesizes findings into a unified executive report with health scores, risk alerts, and actionable recommendations." },
  { q: "Is my data secure and private?", a: "Absolutely. Your data is encrypted at rest and in transit. We use industry-standard security practices, and your business data is never used to train our models. Enterprise plans include SSO, SAML, and on-premise deployment options." },
  { q: "Can I collaborate with my team?", a: "Yes! Pro plans support up to 5 team members, and Enterprise plans support unlimited members. You can share reports, assign tasks, and view the same dashboards in real-time." },
  { q: "Do I need a credit card to start?", a: "Not at all. The Free plan has no credit card required. You can explore all features, upload up to 500 records per module, and see exactly what BlackBox COO can do for your business before committing." },
  { q: "Can I switch plans later?", a: "Yes, you can upgrade or downgrade at any time. If you upgrade, you get immediate access to the new features. If you downgrade, your data stays intact." },
  { q: "What kind of support do you offer?", a: "Free users get access to our help center and community. Pro users get priority email support within 4 hours. Enterprise users get a dedicated account manager with 24/7 support and a 99.99% SLA." },
  { q: "Can I export my data?", a: "Yes, you can export any report, dashboard view, or raw dataset to CSV, PDF, or Excel at any time. There are no data lock-in practices — your data is yours." },
];

const TESTIMONIALS = [
  { quote: "BlackBox COO saved us 15+ hours a week on reporting. The AI agents catch things we would have missed — like a slow-moving inventory item that was tying up $12K in cash.", author: "Sarah Chen", role: "Founder, Lumos Retail", rating: 5 },
  { quote: "I was spending my Sundays manually crunching numbers. Now I open BlackBox COO Monday morning and have a complete executive report ready. Game changer for solo founders.", author: "Marcus Webb", role: "CEO, Webb Creative", rating: 5 },
  { quote: "The multi-agent approach is brilliant. Seeing my sales data analyzed alongside expenses and inventory gives me context I never had before.", author: "Priya Kapoor", role: "Operations Lead, Artisan Goods Co.", rating: 5 },
];

const QUICK_LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, desc: "Business overview" },
  { label: "Sales", href: "/sales", icon: TrendingUp, desc: "Revenue & pipeline" },
  { label: "Reports", href: "/reports", icon: FileText, desc: "Executive summaries" },
  { label: "Inventory", href: "/inventory", icon: Package, desc: "Stock & orders" },
  { label: "Upload", href: "/upload", icon: Upload, desc: "Import your data" },
  { label: "Command Center", href: "/command-center", icon: Bot, desc: "AI agent HQ" },
];

// ─── Components ────────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={14} className={i < rating ? "text-accent fill-accent" : "text-border"} />
      ))}
    </div>
  );
}

function SectionBadge({ icon: Icon, label }: { icon: typeof Zap; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-4">
      <Icon size={12} />
      {label}
    </div>
  );
}

function useScrollAnimation() {
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        }
      },
      { threshold: 0.1 },
    );
    const sections = document.querySelectorAll("[data-animate]");
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return visibleSections;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [annualBilling, setAnnualBilling] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const visibleSections = useScrollAnimation();

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  }, []);

  const animateClass = (id: string) =>
    visibleSections.has(id) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6";

  return (
    <div className="min-h-screen bg-bg overflow-hidden">
      {/* ─── HEADER ─── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-bg/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3 sm:px-10">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2.5 cursor-pointer shrink-0" aria-label="Scroll to top">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-black font-bold text-sm">B</span>
            </div>
            <span className="font-semibold text-sm text-text-primary hidden sm:inline">BlackBox</span>
            <span className="text-xs font-medium text-accent hidden sm:inline">COO</span>
          </button>

          <nav className="hidden md:flex items-center gap-1" aria-label="Landing page sections">
            {[
              { label: "Features", id: "features" },
              { label: "How It Works", id: "how-it-works" },
              { label: "Pricing", id: "pricing" },
              { label: "FAQ", id: "faq" },
            ].map((item) => (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-surface-hover cursor-pointer">
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1 mr-2">
              {QUICK_LINKS.slice(0, 4).map((link) => (
                <button key={link.label} onClick={() => navigate(link.href)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-secondary hover:text-accent transition-colors rounded-lg hover:bg-accent/5 cursor-pointer"
                  title={link.desc}>
                  <link.icon size={13} />
                  <span>{link.label}</span>
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Sign In</Button>
            <Button variant="primary" size="sm" icon={Sparkles} onClick={() => navigate("/login")}>Get Started</Button>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-text-secondary hover:text-text-primary cursor-pointer"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={mobileMenuOpen}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-bg/95 backdrop-blur-xl">
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">On this page</p>
                <div className="flex flex-wrap gap-2">
                  {["Features", "How It Works", "Pricing", "FAQ"].map((item) => (
                    <button key={item} onClick={() => scrollTo(item.toLowerCase().replace(/\s+/g, "-"))}
                      className="text-sm text-text-secondary hover:text-text-primary transition-colors px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover cursor-pointer">
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Quick links</p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_LINKS.map((link) => (
                    <button key={link.label} onClick={() => { navigate(link.href); setMobileMenuOpen(false); }}
                      className="flex items-center gap-2.5 text-sm text-text-secondary hover:text-text-primary transition-colors px-3 py-2 rounded-lg bg-surface hover:bg-surface-hover cursor-pointer">
                      <link.icon size={14} className="text-accent" />
                      <div className="text-left">
                        <p className="text-sm">{link.label}</p>
                        <p className="text-[10px] text-text-muted">{link.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => navigate("/login")}>Sign In</Button>
                <Button variant="primary" size="sm" className="flex-1" icon={Sparkles} onClick={() => navigate("/login")}>Get Started</Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center justify-center pt-28 pb-16 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-accent-glow rounded-full blur-[180px]" />
          <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-accent/3 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-0 w-[300px] h-[300px] bg-accent/2 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center animate-fade-in">
          <button onClick={() => scrollTo("features")}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-8 hover:bg-accent/15 transition-colors cursor-pointer">
            <Sparkles size={12} /> Your Virtual COO <ChevronRight size={12} />
          </button>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-text-primary tracking-tight leading-[1.1]">
            Run your business like{" "}
            <span className="text-accent relative">
              a CEO
              <span className="absolute -bottom-2 left-0 right-0 h-1 bg-accent/30 rounded-full blur-sm" />
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg md:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
            BlackBox COO is the AI-powered operations dashboard for solo founders and small teams.
            Upload your data, and let AI agents analyze your entire business in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Button variant="primary" size="lg" icon={Sparkles} onClick={() => navigate("/login")}>Get Started Free</Button>
            <Button variant="ghost" size="lg" icon={ArrowRight} onClick={() => scrollTo("features")}>See Features</Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-xs text-text-muted">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-success" /> No credit card</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-success" /> Free tier included</span>
            <span className="flex items-center gap-1.5"><Shield size={14} className="text-accent" /> Your data stays private</span>
            <span className="flex items-center gap-1.5"><Activity size={14} className="text-accent" /> Real-time analysis</span>
          </div>

          <div className="mt-16 max-w-3xl mx-auto glass-card p-4 sm:p-6 md:p-8 text-left border-border-hover/50 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-danger" />
              <div className="w-3 h-3 rounded-full bg-warning" />
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="ml-3 text-xs text-text-muted font-mono">executive-report — live</span>
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

      {/* ─── STATS BAR ─── */}
      <section className="relative py-16 sm:py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="glass-card p-6 text-center hover:border-accent/20 transition-all duration-300">
                <stat.icon size={20} className="text-accent mx-auto mb-3" />
                <p className="text-3xl sm:text-4xl font-bold text-text-primary">{stat.value}</p>
                <p className="text-xs text-text-secondary mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── QUICK LINKS GRID ─── */}
      <section className="relative py-16 sm:py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <SectionBadge icon={Layers} label="Quick Links" />
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
              Everything at your <span className="text-accent">fingertips</span>
            </h2>
            <p className="mt-3 text-sm text-text-secondary max-w-xl mx-auto">
              Jump straight into the tools you need. Each section is powered by AI agents working in real-time.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {QUICK_LINKS.map((link) => (
              <button key={link.label} onClick={() => navigate(link.href)}
                className="glass-card p-5 flex items-center gap-4 text-left hover:border-accent/30 hover:bg-accent-subtle/50 transition-all duration-300 group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent/20 flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors">
                  <link.icon size={18} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">{link.label}</p>
                  <p className="text-xs text-text-muted mt-0.5">{link.desc}</p>
                </div>
                <ChevronRight size={16} className="text-text-muted ml-auto group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="relative py-24 sm:py-32 px-6">
        <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <SectionBadge icon={Zap} label="Features" />
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
              Everything you need to <span className="text-accent">run your business</span>
            </h2>
            <p className="mt-4 text-base text-text-secondary">From data import to executive insights — BlackBox COO handles the heavy lifting.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {FEATURES.map((feature, i) => (
              <div key={feature.title} id={`feature-${i}`} data-animate
                className={`glass-card p-5 sm:p-6 hover:border-accent/30 transition-all duration-300 group ${animateClass(`feature-${i}`)} transition-all duration-500`}
                style={{ transitionDelay: `${i * 50}ms` }}>
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

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="relative py-24 sm:py-32 px-6">
        <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-accent/3 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <SectionBadge icon={GraduationCap} label="How It Works" />
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
              Three steps to <span className="text-accent">business clarity</span>
            </h2>
            <p className="mt-4 text-base text-text-secondary">No setup, no training. Just upload and get insights.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 sm:gap-10">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="text-center relative">
                {step.step < 3 && (
                  <div className="hidden sm:block absolute top-16 left-[60%] w-[80%] h-px bg-gradient-to-r from-accent/40 to-transparent" />
                )}
                <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-5">
                  <step.icon size={24} className="text-accent" />
                </div>
                <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent text-black text-xs font-bold mb-3">{step.step}</div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">{step.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="relative py-24 sm:py-32 px-6">
        <div className="absolute inset-0 bg-dot-grid opacity-20 pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <SectionBadge icon={Building2} label="Pricing" />
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
              Start free, <span className="text-accent">scale as you grow</span>
            </h2>
            <p className="mt-4 text-base text-text-secondary">No hidden fees. No surprises. Upgrade when you need more.</p>
          </div>

          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-sm transition-colors ${!annualBilling ? "text-text-primary font-medium" : "text-text-muted"}`}>Monthly</span>
            <button onClick={() => setAnnualBilling(!annualBilling)}
              className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${annualBilling ? "bg-accent" : "bg-surface-active"}`}
              role="switch" aria-checked={annualBilling} aria-label="Toggle annual billing">
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${annualBilling ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
            <span className={`text-sm transition-colors ${annualBilling ? "text-text-primary font-medium" : "text-text-muted"}`}>Annual</span>
            {annualBilling && (
              <span className="text-[10px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">Save ~17%</span>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {PRICING_TIERS.map((tier) => (
              <div key={tier.name}
                className={`relative glass-card p-6 sm:p-8 transition-all duration-300 ${
                  tier.popular
                    ? "border-accent/40 shadow-[0_0_40px_rgba(158,255,0,0.1)] scale-[1.02] sm:scale-105"
                    : "hover:border-border-hover"
                }`}>
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-black text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Star size={10} className="fill-black" /> Most Popular
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-text-primary">{tier.name}</h3>
                  <div className="mt-3">
                    <span className="text-4xl font-bold text-text-primary">
                      {annualBilling && tier.annualPrice !== "Custom" ? tier.annualPrice : tier.monthlyPrice}
                    </span>
                    {tier.period && (
                      <span className="text-sm text-text-muted ml-1">
                        {annualBilling && tier.annualPrice !== "Custom" ? "/month, billed annually" : tier.period}
                      </span>
                    )}
                  </div>
                  {annualBilling && tier.annualPrice !== "Custom" && tier.monthlyPrice !== "$0" && (
                    <p className="text-[11px] text-accent mt-1">
                      ${parseInt(tier.monthlyPrice.replace("$", "")) * 12 - parseInt(tier.annualPrice.replace("$", "")) * 12}/yr savings
                    </p>
                  )}
                  <p className="text-xs text-text-secondary mt-2">{tier.desc}</p>
                </div>

                <ul className="space-y-2.5 mb-8">
                  {tier.features.map((feat) => (
                    <li key={feat.text} className={`flex items-start gap-2 text-sm ${feat.included ? "text-text-secondary" : "text-text-muted"}`}>
                      <CheckCircle2 size={15} className={`shrink-0 mt-0.5 ${feat.included ? "text-accent" : "text-border"}`} />
                      <span className={feat.included ? "" : "line-through"}>{feat.text}</span>
                    </li>
                  ))}
                </ul>

                <Button variant={tier.popular ? "primary" : "ghost"} className="w-full"
                  onClick={() => navigate("/login")} icon={tier.popular ? Sparkles : undefined}>
                  {tier.cta}
                </Button>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-text-muted mt-8">
            All plans include a 14-day free trial on Pro features. No credit card required to start.
          </p>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="relative py-24 sm:py-32 px-6">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent-glow rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <SectionBadge icon={Quote} label="Testimonials" />
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
              Trusted by founders{" "}<span className="text-accent">like you</span>
            </h2>
            <p className="mt-4 text-base text-text-secondary">
              See what business owners say about BlackBox COO.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} data-animate
                className={`glass-card p-6 hover:border-accent/20 transition-all duration-500 ${animateClass(`testimonial-${i}`)}`}
                style={{ transitionDelay: `${i * 100}ms` }}>
                <StarRating rating={t.rating} />
                <blockquote className="mt-4 text-sm text-text-secondary leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="mt-4 pt-4 border-t border-border/50">
                  <p className="text-sm font-semibold text-text-primary">{t.author}</p>
                  <p className="text-xs text-text-muted">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="relative py-24 sm:py-32 px-6">
        <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <SectionBadge icon={HelpCircle} label="FAQ" />
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
              Got questions?{" "}<span className="text-accent">We&apos;ve got answers</span>
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="glass-card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer hover:bg-surface-hover transition-colors"
                  aria-expanded={openFaq === i}
                >
                  <span className="text-sm sm:text-base font-medium text-text-primary pr-4">{faq.q}</span>
                  <ChevronDown size={16}
                    className={`text-text-muted shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openFaq === i ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
                }`}>
                  <p className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm text-text-secondary leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative py-24 sm:py-32 px-6">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent-glow rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
            Ready to take control of <span className="text-accent">your business data?</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-text-secondary max-w-xl mx-auto">
            Join thousands of founders using BlackBox COO to run smarter, faster, and with total clarity.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Button variant="primary" size="lg" icon={Sparkles} onClick={() => navigate("/login")}>
              Get Started Free
            </Button>
            <Button variant="ghost" size="lg" onClick={() => navigate("/login")}>
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
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
              <div className="flex items-center gap-3 mt-5">
                <button onClick={() => window.open("https://twitter.com", "_blank")}
                  className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-text-secondary hover:text-accent hover:border-accent/30 transition-all cursor-pointer"
                  aria-label="Twitter">
                  <SiTwitter size={14} />
                </button>
                <button onClick={() => window.open("https://github.com", "_blank")}
                  className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-text-secondary hover:text-accent hover:border-accent/30 transition-all cursor-pointer"
                  aria-label="GitHub">
                  <SiGithub size={14} />
                </button>
                <button onClick={() => window.open("https://linkedin.com", "_blank")}
                  className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-text-secondary hover:text-accent hover:border-accent/30 transition-all cursor-pointer"
                  aria-label="LinkedIn">
                  <SiLinkedin size={14} />
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Product</h4>
              <ul className="space-y-3">
                {[
                  { label: "Features", href: "#features" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "How It Works", href: "#how-it-works" },
                  { label: "Dashboard", href: "/dashboard" },
                  { label: "Integrations", href: "/integrations" },
                ].map((link) => (
                  <li key={link.label}>
                    <button onClick={() => {
                      if (link.href.startsWith("#")) { document.getElementById(link.href.slice(1))?.scrollIntoView({ behavior: "smooth" }); }
                      else { navigate(link.href); }
                    }}
                      className="text-sm text-text-secondary hover:text-accent transition-colors cursor-pointer">
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-3">
                {[
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Terms of Service", href: "/privacy" },
                  { label: "Sign In", href: "/login" },
                  { label: "Create Account", href: "/login" },
                ].map((link) => (
                  <li key={link.label}>
                    <button onClick={() => navigate(link.href)}
                      className="text-sm text-text-secondary hover:text-accent transition-colors cursor-pointer">
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
              <button onClick={() => navigate("/privacy")}
                className="text-xs text-text-muted hover:text-accent transition-colors cursor-pointer">Privacy</button>
              <button onClick={() => navigate("/login")}
                className="text-xs text-text-muted hover:text-accent transition-colors cursor-pointer">Login</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
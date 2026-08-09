# BlackBox COO — AI-Powered Operations Dashboard

> **Your Virtual COO.** Upload your business data and let a team of specialized AI agents analyze sales, expenses, inventory, customers, and operations — delivering executive reports, health scores, risks, opportunities, and tactical recommendations in seconds.

---

## 🚀 Features

### 🧠 Multi-Agent AI Analysis
A fleet of specialized AI agents work together to analyze every aspect of your business:
- **Finance Agent** — Revenue, expenses, profit margins, cash flow, forecasts
- **Sales Agent** — Revenue trends, customer retention, churn analysis, upsell opportunities
- **Inventory Agent** — Stock levels, low-stock alerts, turnover rates, reorder suggestions
- **Marketing Agent** — Campaign ideas, growth opportunities, audience insights
- **Operations Agent** — Workflow efficiency, daily priorities, process improvements
- **CEO Agent** — Synthesizes all agent outputs into an executive report with a business health score

### 📊 Executive Dashboard
- Real-time business health score with trend indicators
- Key metrics at a glance: revenue, orders, profit margin
- Agent-by-agent breakdown with drill-down detail pages

### 📈 AI-Generated Executive Reports
- One-click report generation from the entire agent pipeline
- Scores, risks, opportunities, and prioritized tactical recommendations
- Confidence ratings and execution timestamps
- Exportable JSON reports

### 📦 Inventory Intelligence
- Track stock levels across your product catalog
- Automatic low-stock and reorder alerts
- Shortage predictions with "days until empty" estimates

### 💰 Revenue & Expense Management
- Sales and expense data import and analysis
- Profit margin calculations and trend tracking
- Expense breakdown by category

### 👥 Team Management
- Invite team members with role-based access
- Manage teams and company profiles
- Multi-user workspaces

### 📄 CSV / PDF Import
- Upload CSV and PDF files directly
- AI reads and structures data automatically
- File storage and history

### 🔔 Integrations
- Slack integration for operational notifications
- Extensible integration framework

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18, TypeScript |
| **Build Tool** | Vite 7 |
| **Routing** | React Router 7 |
| **Styling** | TailwindCSS v4 |
| **UI Icons** | Lucide React, React Icons (Simple Icons) |
| **Charts** | Recharts |
| **Authentication** | Supabase Auth (email/password, implicit flow) |
| **Database** | Supabase PostgreSQL with Row Level Security |
| **AI Engine** | Google Gemini API (via Edge Functions) |
| **File Parsing** | PapaParse (CSV) |
| **Hosting** | Vite build → static deployment |

---

## 📁 Project Structure

```
src/
├── lib/
│   ├── ai/               # AI agent engine (types, agents, pipeline, fallback)
│   │   ├── types.ts          # Shared AI types & interfaces
│   │   ├── ceoAgent.ts       # CEO synthesis agent
│   │   ├── salesAgent.ts     # Sales analysis agent
│   │   ├── financeAgent.ts   # Finance analysis agent
│   │   ├── inventoryAgent.ts # Inventory analysis agent
│   │   ├── marketingAgent.ts # Marketing analysis agent
│   │   ├── operationsAgent.ts# Operations analysis agent
│   │   ├── aiService.ts      # AI service layer (Gemini API calls)
│   │   ├── pipeline.ts       # Full analysis pipeline runner
│   │   ├── fallbackEngine.ts # Rule-based fallback when AI is unavailable
│   │   └── fileGeminiAnalysis.ts # File-based analysis
│   ├── agents/            # Agent data gathering & metrics
│   │   ├── types.ts          # Agent-specific data types
│   │   ├── seedData.ts       # Sample/seed business data
│   │   ├── salesAgent.ts     # Sales data gathering
│   │   ├── financeAgent.ts   # Finance data gathering
│   │   ├── inventoryAgent.ts # Inventory data gathering
│   │   ├── marketingAgent.ts # Marketing data gathering
│   │   └── ceoAgent.ts       # Executive data synthesis
│   ├── supabase.ts        # Supabase client setup
│   ├── exportCsv.ts       # CSV export utilities
│   └── fileStorage.ts     # File storage helpers
├── hooks/
│   └── useAuth.tsx        # Authentication context & hook
├── components/
│   ├── ui/                # Reusable UI primitives
│   │   ├── Button.tsx, Badge.tsx, Modal.tsx, Spinner.tsx
│   │   ├── Skeleton.tsx, StatCard.tsx, FormField.tsx
│   │   ├── GlassCard.tsx, PageHeader.tsx, ErrorBoundary.tsx
│   ├── layout/
│   │   ├── AppShell.tsx       # Protected app layout (sidebar + content)
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   └── ProtectedRoute.tsx # Auth guard route wrapper
│   ├── ai/
│   │   ├── AgentCard.tsx      # Agent status card
│   │   └── PipelineRunner.tsx # Full pipeline execution UI
│   ├── analysis/
│   │   ├── AnalysisRunner.tsx # Per-module analysis trigger UI
│   │   └── useAnalysisRunner.ts # Analysis runner hook
│   ├── files/
│   │   ├── FileViewerModal.tsx, FileAnalysisModal.tsx
│   │   └── DataImportMappingModal.tsx
│   └── reports/
│       └── ExecutiveReportView.tsx # Report display component
├── pages/                 # All application routes
│   ├── LandingPage.tsx    # Public marketing page (/)
│   ├── LoginPage.tsx      # Login / sign-up (/login)
│   ├── PrivacyPage.tsx    # Privacy policy (/privacy)
│   ├── OnboardingPage.tsx # Post-signup onboarding (/onboarding)
│   ├── DashboardPage.tsx  # Main dashboard (/dashboard)
│   ├── CommandCenterPage.tsx # AI agent overview (/command-center)
│   ├── AgentDashboardPage.tsx # Per-agent detail (/command-center/:agentName)
│   ├── SalesPage.tsx, ExpensesPage.tsx, InventoryPage.tsx
│   ├── CustomersPage.tsx, ReportsPage.tsx, TasksPage.tsx
│   ├── TeamPage.tsx, AssistantPage.tsx, UploadPage.tsx
│   ├── IntegrationsPage.tsx, ProfilePage.tsx, SettingsPage.tsx
│   └── UpdatePasswordPage.tsx
├── constants/
│   └── config.ts          # Publishable config (Supabase URL, anon key)
├── App.tsx                # Route definitions
├── main.tsx               # Entry point
└── index.css              # Tailwind v4 theme + global styles
```

---

## 🚦 Routes

| Path | Page | Auth Required | Description |
|------|------|:---:|-------------|
| `/` | LandingPage | ❌ | Public landing/marketing page |
| `/login` | LoginPage | ❌ | Authentication (email/password) |
| `/update-password` | UpdatePasswordPage | ❌ | Password reset |
| `/privacy` | PrivacyPage | ❌ | Privacy policy |
| `/onboarding` | OnboardingPage | ✅ | Post-signup setup wizard |
| `/dashboard` | DashboardPage | ✅ | Main operational dashboard |
| `/command-center` | CommandCenterPage | ✅ | AI agent overview |
| `/command-center/:agentName` | AgentDashboardPage | ✅ | Per-agent deep dive |
| `/sales` | SalesPage | ✅ | Sales records & analysis |
| `/expenses` | ExpensesPage | ✅ | Expense tracking |
| `/inventory` | InventoryPage | ✅ | Inventory management |
| `/customers` | CustomersPage | ✅ | Customer data |
| `/reports` | ReportsPage | ✅ | Executive report library |
| `/tasks` | TasksPage | ✅ | Operational tasks |
| `/team` | TeamPage | ✅ | Team management |
| `/assistant` | AssistantPage | ✅ | AI COO chat assistant |
| `/integrations` | IntegrationsPage | ✅ | Third-party integrations |
| `/upload` | UploadPage | ✅ | CSV/PDF data import |
| `/profile` | ProfilePage | ✅ | User profile settings |
| `/settings` | SettingsPage | ✅ | Application settings |

---

## 🧠 AI Architecture

### How the AI Pipeline Works

1. **Data Ingestion** — Business data enters via CSV/PDF upload, manual entry, or sample seed data
2. **Agent Execution** — Five specialized agents run in parallel (configurable):
   - Each agent queries Supabase for its domain data
   - Data is formatted into structured prompts
   - If Gemini API is configured, AI-generated analysis is produced
   - If AI is unavailable, a rule-based fallback engine generates realistic outputs
3. **CEO Synthesis** — The CEO agent aggregates all five agent outputs into a unified executive report with:
   - Business health score (0-100)
   - Top risks with severity ratings
   - Growth opportunities with impact assessments
   - Prioritized tactical recommendations
   - Warnings and confidence levels
4. **Presentation** — Results are displayed in the dashboard, command center, and reports page

### AI vs. Fallback Mode

| Mode | When Used | Output |
|------|-----------|--------|
| **AI Mode** | Gemini API key is configured | LLM-powered insights with reasoning |
| **Fallback Mode** | No API key or API error | Rule-based analysis with statistical heuristics |

---

## 🔧 Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- Supabase project (for auth & database)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd blackbox-coo

# Install dependencies
npm install

# Start development server
npm run dev
```

### Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the database migrations (see `supabase/migrations` folder)
3. Set up authentication with email/password
4. Configure Row Level Security policies
5. Update `src/constants/config.ts` with your Supabase URL and anon key

### Environment (AI Integration)

To enable AI-powered analysis, store your Gemini API key as a Supabase Edge Function secret:

```bash
# Via Supabase CLI
supabase secrets set GEMINI_API_KEY=your_key_here
```

Without a Gemini key, the app falls back to a rule-based engine that still produces useful analysis.

---

## 🏗️ Building for Production

```bash
npm run build
```

The output is in `dist/` — deployable to any static hosting (Netlify, Vercel, Cloudflare Pages, etc.).

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support

For questions, issues, or feature requests:
- Open a GitHub issue
- Email: ar30032006@gmail.com


---

<p align="center">
  <sub>Built with ❤️</sub>
</p>

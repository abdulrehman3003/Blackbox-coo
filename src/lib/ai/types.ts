/* ──────────────────────────────────────────────
   BlackBox COO — AI Agent Framework Types
   ────────────────────────────────────────────── */

/** Status of an individual agent execution */
export type AgentStatus = "idle" | "thinking" | "running" | "completed" | "failed" | "skipped";

/** Execution mode */
export type ExecutionMode = "ai" | "fallback" | "hybrid";

/** Overall pipeline status */
export type PipelineStatus = "idle" | "running" | "completed" | "failed" | "partial";

/** Agent name keys */
export type AgentName = "finance" | "sales" | "inventory" | "marketing" | "operations" | "ceo";

/** Risk item */
export interface RiskItem {
  title: string;
  severity: "high" | "medium" | "low";
  detail: string;
}

/** Opportunity item */
export interface OpportunityItem {
  title: string;
  impact: "high" | "medium" | "low";
  detail: string;
}

/** Recommendation item */
export interface RecommendationItem {
  title: string;
  priority: "urgent" | "high" | "medium" | "low";
  category: string;
  description?: string;
}

/* ─── Individual Agent Standard Output ─── */

export interface AgentOutput {
  summary: string;
  score: number;
  risks: RiskItem[];
  opportunities: OpportunityItem[];
  recommendations: RecommendationItem[];
  confidence: number;
  warnings: string[];
  reasoning?: string;
}

/* ─── Per-Agent Structured Data ─── */

export interface FinanceAgentData {
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  cashFlow: number;
  monthlyGrowth: number;
  forecast: number;
  topExpenseCategories: { category: string; amount: number }[];
  revenueTrend: { month: string; amount: number }[];
}

export interface SalesAgentData {
  totalSales: number;
  salesGrowth: number;
  topCustomers: { name: string; totalSpent: number; visits: number }[];
  atRiskCustomers: { name: string; daysSinceLastVisit: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  averageOrderValue: number;
  retentionRate: number;
  churnRate: number;
}

export interface InventoryAgentData {
  totalItems: number;
  stockHealth: number;
  lowStockItems: { name: string; quantity: number; reorderLevel: number; suggestedReorder: number }[];
  overstockItems: { name: string; quantity: number; excess: number }[];
  shortages: { name: string; daysUntilEmpty: number }[];
  inventoryValue: number;
  turnoverRate: number;
}

export interface MarketingAgentData {
  totalCustomers: number;
  campaignIdeas: string[];
  promotionIdeas: string[];
  growthOpportunities: string[];
  socialPosts: string[];
  targetAudience: string[];
  emailCampaigns: string[];
}

export interface OperationsAgentData {
  dailyPriorities: string[];
  improvements: string[];
  taskRecommendations: string[];
  efficiencyScore: number;
  workflowIssues: string[];
}

/* ─── Agent Execution Result ─── */

export interface AgentExecutionResult {
  agentName: AgentName;
  agentLabel: string;
  status: AgentStatus;
  executionMode: ExecutionMode;
  confidence: number;
  executionTimeMs: number;
  output: AgentOutput;
  structuredData?: Record<string, unknown>;
  reasoningSummary?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

/* ─── AI Settings ─── */

export interface AISettings {
  ai_model: string;
  temperature: number;
  top_p: number;
  max_output_tokens: number;
  enable_streaming: boolean;
  enable_ai: boolean;
  enable_fallback: boolean;
  has_api_key: boolean;
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  ai_model: "gemini-3.5-flash",
  temperature: 0.7,
  top_p: 0.95,
  max_output_tokens: 4096,
  enable_streaming: false,
  enable_ai: true,
  enable_fallback: true,
  has_api_key: false,
};

export const GEMINI_MODELS = [
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", desc: "Ultra performance & high-speed reasoning" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", desc: "Fastest & lowest token cost model" },
  { id: "gemini-3-flash-preview", label: "Gemini 3.0 Flash Preview", desc: "Cutting-edge preview model" },
  { id: "gemini-3.1-flash-live-preview", label: "Gemini 3.1 Flash Live Preview", desc: "Real-time low latency preview model" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", desc: "Advanced multi-agent reasoning & complex analysis" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "High quality model for daily operations" },
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", desc: "Production-ready stable fallback model" },
] as const;

/* ─── Pipeline Execution ─── */

export interface PipelineExecution {
  id: string;
  companyId: string;
  status: PipelineStatus;
  executionMode: ExecutionMode;
  totalExecutionTimeMs: number;
  businessHealthScore: number;
  summary: string;
  ceoResult: AgentExecutionResult | null;
  agentResults: AgentExecutionResult[];
  executionLog: PipelineLogEntry[];
  warnings: string[];
  createdAt: string;
}

export interface PipelineLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  agent: AgentName;
  message: string;
}

/* ─── Reports (DB shape) ─── */

export interface AIReportRecord {
  id: string;
  company_id: string;
  type: string;
  status: string;
  execution_mode: ExecutionMode;
  total_execution_time_ms: number;
  finance_result: Record<string, unknown> | null;
  finance_confidence: number | null;
  finance_execution_time_ms: number | null;
  finance_status: string | null;
  sales_result: Record<string, unknown> | null;
  sales_confidence: number | null;
  sales_execution_time_ms: number | null;
  sales_status: string | null;
  inventory_result: Record<string, unknown> | null;
  inventory_confidence: number | null;
  inventory_execution_time_ms: number | null;
  inventory_status: string | null;
  marketing_result: Record<string, unknown> | null;
  marketing_confidence: number | null;
  marketing_execution_time_ms: number | null;
  marketing_status: string | null;
  operations_result: Record<string, unknown> | null;
  operations_confidence: number | null;
  operations_execution_time_ms: number | null;
  operations_status: string | null;
  ceo_result: Record<string, unknown> | null;
  ceo_score: number | null;
  ceo_execution_time_ms: number | null;
  business_health_score: number | null;
  summary: string | null;
  warnings: string[];
  execution_log: PipelineLogEntry[];
  created_at: string;
  updated_at: string;
}

/* ─── Test Connection Result ─── */

export interface TestConnectionResult {
  success: boolean;
  latency_ms?: number;
  model?: string;
  error?: string;
  error_type?: string;
}
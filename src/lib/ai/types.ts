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
  risks: RiskItem[] | any[];
  opportunities: OpportunityItem[] | any[];
  recommendations: RecommendationItem[] | string[] | any[];
  confidence: number;
  warnings: string[];
  reasoning?: string;
  [key: string]: unknown;
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
  completedAt: string;
}

/* ─── Pipeline Log Entry ─── */

export interface PipelineLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  agent: AgentName;
  message: string;
}

/* ─── Full Pipeline Output ─── */

export interface PipelineResult {
  id: string;
  companyId: string;
  status: "completed" | "failed";
  executionMode: ExecutionMode;
  totalExecutionTimeMs: number;
  businessHealthScore: number;
  summary: any;
  reportData?: any;
  ceoResult: AgentExecutionResult | null;
  agentResults: AgentExecutionResult[];
  executionLog: PipelineLogEntry[];
  warnings: string[];
  createdAt: string;
}

export type PipelineExecution = PipelineResult;
export type PipelineProgress = (progress: number) => void;

export type FinanceAgentData = any;
export type SalesAgentData = any;
export type InventoryAgentData = any;
export type MarketingAgentData = any;
export type OperationsAgentData = any;

/* ─── Gemini Settings ─── */

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

export const AIML_MODELS = [
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Google)", desc: "Fast, reliable & high reasoning performance" },
  { id: "gpt-4o", label: "GPT-4o (OpenAI)", desc: "Flagship OpenAI model for complex strategy" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini (OpenAI)", desc: "High speed & low cost model" },
  { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (Anthropic)", desc: "Advanced operational strategy & analysis" },
  { id: "deepseek-ai/deepseek-r1", label: "DeepSeek R1", desc: "Open-weights deep reasoning engine" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B (Meta)", desc: "High capability open-source model" },
] as const;

export const GEMINI_MODELS = AIML_MODELS;

export function getModelLabel(modelId: string): string {
  const found = AIML_MODELS.find((m) => m.id === modelId);
  return found ? found.label : modelId;
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
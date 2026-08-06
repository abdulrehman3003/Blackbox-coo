/**
 * BlackBox COO — File-level Gemini AI Analysis
 *
 * Analyzes an uploaded file's headers, sample rows, and summary stats
 * through Google Gemini to return structured insights, risks, opportunities,
 * and recommendations.
 */

import { callAI, parseAIResponse, invalidateSettingsCache } from "./aiService";
import type { ImportedFile } from "../fileStorage";

/* ─── Types ─── */

export type AnalysisMode = "auto" | "sales" | "expenses" | "inventory" | "customers";

export interface FileGeminiRisk {
  title: string;
  severity: "high" | "medium" | "low";
  detail: string;
}

export interface FileGeminiOpportunity {
  title: string;
  impact: "high" | "medium" | "low";
  detail: string;
}

export interface FileGeminiRecommendation {
  title: string;
  description: string;
}

export interface FileGeminiResult {
  executionMode: "ai" | "fallback";
  modelUsed?: string;
  summary: string;
  score: number;
  risks: FileGeminiRisk[];
  opportunities: FileGeminiOpportunity[];
  recommendations: FileGeminiRecommendation[];
  insights: string[];
}

/* ─── Prompt Builder ─── */

function buildSystemPrompt(mode: AnalysisMode): string {
  const perspectiveMap: Record<AnalysisMode, string> = {
    auto: "general business file analyst",
    sales: "sales & revenue analyst",
    expenses: "expense & cost control analyst",
    inventory: "inventory & supply chain analyst",
    customers: "customer relationship & retention analyst",
  };

  return `You are an expert ${perspectiveMap[mode]}. Analyze the uploaded file data below and return a JSON object with exactly these fields:

{
  "summary": "brief executive summary of what the file contains and key findings",
  "score": <number 0-100 representing data quality / health>,
  "insights": ["string insight 1", "string insight 2", ...],
  "risks": [
    { "title": "Risk name", "severity": "high|medium|low", "detail": "What the risk means" }
  ],
  "opportunities": [
    { "title": "Opportunity name", "impact": "high|medium|low", "detail": "Description of opportunity" }
  ],
  "recommendations": [
    { "title": "Recommendation", "description": "Actionable next step" }
  ]
}

Return ONLY valid JSON. No markdown, no extra text.`;
}

function buildUserPrompt(file: ImportedFile, mode: AnalysisMode): string {
  const headerSample = file.rawText.slice(0, 3000);

  return `FILE NAME: ${file.fileName}
FILE TYPE: ${file.fileType}
ROW COUNT: ${file.rowCount}
HEADERS: ${file.headers.join(", ")}
NUMERIC COLUMNS: ${file.summaryStats.numericCols.join(", ") || "none"}
CATEGORY COLUMNS: ${file.summaryStats.categoryCols.join(", ") || "none"}
ANALYSIS PERSPECTIVE: ${mode}

SAMPLE DATA (first rows):
${headerSample}

Analyze this data from a "${mode}" perspective and return the JSON result.`;
}

/* ─── Rule-based Fallback ─── */

function ruleBasedFallback(file: ImportedFile, mode: AnalysisMode): FileGeminiResult {
  const headerCount = file.headers.length;
  const rowCount = file.rowCount;
  const numCols = file.summaryStats.numericCols.length;
  const insights: string[] = [];
  const risks: FileGeminiRisk[] = [];
  const opportunities: FileGeminiOpportunity[] = [];
  const recommendations: FileGeminiRecommendation[] = [];

  // Basic quality checks
  if (headerCount === 0) {
    risks.push({ title: "No Headers Detected", severity: "high", detail: "The file has no column headers. Data mapping may fail." });
  } else {
    insights.push(`Detected ${headerCount} columns: ${file.headers.join(", ")}`);
  }

  if (rowCount === 0) {
    risks.push({ title: "Empty File", severity: "high", detail: "The file contains zero data rows. Nothing to analyze." });
  } else {
    insights.push(`File contains ${rowCount} data rows ready for analysis.`);
  }

  if (numCols === 0) {
    insights.push("No numeric columns found — the file may contain only text or categorical data.");
    recommendations.push({ title: "Review Data Types", description: "Consider converting numeric values from text format to enable quantitative analysis." });
  } else {
    const totalSum = Object.values(file.summaryStats.totalNumericSum).reduce((a, b) => a + b, 0);
    insights.push(`${numCols} numeric column(s) detected with a combined sum of ${totalSum.toLocaleString()}.`);

    if (mode !== "auto") {
      recommendations.push({
        title: `Analyze ${mode} data in depth`,
        description: `Run the Executive Suite to get a full AI-powered business health report using this ${mode} file.`,
      });
    }
  }

  // Mode-specific heuristics
  if (mode === "sales" || mode === "auto") {
    const hasAmount = file.headers.some((h) => /amount|price|total|revenue|sale/i.test(h));
    const hasDate = file.headers.some((h) => /date|time|sold/i.test(h));
    if (!hasAmount) risks.push({ title: "Missing Revenue Column", severity: "medium", detail: "No column resembling amount/price/revenue found. Revenue analysis will be limited." });
    if (!hasDate) risks.push({ title: "Missing Date Column", severity: "low", detail: "No date column found. Temporal trends cannot be computed." });
  }

  if (mode === "inventory" || mode === "auto") {
    const hasQty = file.headers.some((h) => /qty|quantity|stock|count/i.test(h));
    if (!hasQty) risks.push({ title: "Missing Quantity Column", severity: "medium", detail: "Stock level tracking requires a quantity/numeric column." });
  }

  if (mode === "customers" || mode === "auto") {
    const hasName = file.headers.some((h) => /name|customer|client/i.test(h));
    const hasEmail = file.headers.some((h) => /email|mail/i.test(h));
    if (!hasName) insights.push("No customer name column identified — consider renaming a column to 'name'.");
    if (!hasEmail) recommendations.push({ title: "Capture Emails", description: "Add an email column to enable CRM-style communications." });
  }

  // Score estimate based on data quality
  let score = 75;
  if (headerCount === 0) score -= 25;
  if (rowCount === 0) score -= 40;
  if (numCols === 0) score -= 10;
  if (risks.length > 2) score -= 10;
  score = Math.max(10, Math.min(100, score));

  const modeLabel = mode === "auto" ? "general business" : mode;

  return {
    executionMode: "fallback",
    summary: `Rule-based analysis of "${file.fileName}" from a ${modeLabel} perspective. ${file.rowCount} rows, ${file.headers.length} columns, ${numCols} numeric field(s). ${risks.length > 0 ? `${risks.length} potential issue(s) identified.` : "No major issues detected."}`,
    score,
    risks,
    opportunities,
    recommendations,
    insights,
  };
}

/* ─── Main Export ─── */

/**
 * Run Gemini AI analysis on a single uploaded file.
 * Falls back to rule-based analysis if AI is unavailable.
 */
export async function runFileGeminiAnalysis(
  companyId: string,
  file: ImportedFile,
  mode: AnalysisMode = "auto",
): Promise<FileGeminiResult> {
  const systemPrompt = buildSystemPrompt(mode);
  const userPrompt = buildUserPrompt(file, mode);

  try {
    const result = await callAI(companyId, {
      systemPrompt,
      userPrompt,
      maxRetries: 1,
    });

    if (result.success && result.text) {
      const parsed = parseAIResponse<FileGeminiResult>(result.text);
      const data = parsed?.data || parsed;

      if (data && (data.summary || typeof data.score === "number")) {
        return {
          executionMode: "ai",
          modelUsed: result.model || "gemini-3.5-flash",
          summary: data.summary || `Analysis of ${file.fileName}`,
          score: typeof data.score === "number" ? Math.max(0, Math.min(100, data.score)) : 75,
          risks: Array.isArray(data.risks) ? data.risks : [],
          opportunities: Array.isArray(data.opportunities) ? data.opportunities : [],
          recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
          insights: Array.isArray(data.insights) ? data.insights : [],
        };
      }
    }

    // AI returned but couldn't parse — fall through to rule-based
    invalidateSettingsCache();
    return ruleBasedFallback(file, mode);
  } catch {
    // Network or unexpected error — safe fallback
    return ruleBasedFallback(file, mode);
  }
}
/**
 * File Gemini AI Analysis Service
 *
 * Runs Google Gemini AI agent directly on imported workspace files.
 */

import { callAI, parseAIResponse } from "./aiService";
import type { ImportedFile } from "../fileStorage";

export interface FileGeminiResult {
  summary: string;
  score: number;
  risks: { title: string; severity: "high" | "medium" | "low"; detail: string }[];
  opportunities: { title: string; impact: "high" | "medium" | "low"; detail: string }[];
  recommendations: { title: string; priority: "urgent" | "high" | "medium" | "low"; description: string }[];
  warnings: string[];
  insights: string[];
  executionMode: "ai" | "fallback";
  modelUsed?: string;
}

export const FILE_ANALYSIS_SYSTEM_PROMPT = `You are an expert Google Gemini AI Data Analyst and Business Intelligence Agent.

Analyze the provided file data (file name, headers, row count, sample records, aggregate statistics) and return ONLY a valid JSON object.
Do NOT include markdown code blocks, explanations, or any text outside the JSON.
Do NOT hallucinate or invent numbers. Base your analysis strictly on the provided file headers, data types, sample rows, and numerical metrics.

Return exactly this JSON structure:
{
  "summary": "2-sentence executive summary of the file content, data quality, and key takeaway",
  "score": 0-100 numeric score reflecting file data quality & business performance,
  "risks": [{"title": "Risk title", "severity": "high|medium|low", "detail": "Specific detail with numbers"}],
  "opportunities": [{"title": "Opportunity title", "impact": "high|medium|low", "detail": "Specific detail with numbers"}],
  "recommendations": [{"title": "Action item", "priority": "urgent|high|medium|low", "description": "Specific action to take"}],
  "warnings": ["Warning or data anomaly text"],
  "insights": ["Key statistical observation 1", "Key statistical observation 2", "Key statistical observation 3"]
}`;

export async function runFileGeminiAnalysis(
  companyId: string,
  file: ImportedFile,
  mode: string = "auto"
): Promise<FileGeminiResult> {
  const sampleRows = file.parsedData ? file.parsedData.slice(0, 15) : [];
  const numericStats = file.summaryStats
    ? {
        numericCols: file.summaryStats.numericCols,
        totalNumericSum: file.summaryStats.totalNumericSum,
        avgNumericVal: file.summaryStats.avgNumericVal,
      }
    : {};

  const payload = {
    fileName: file.fileName,
    fileType: file.fileType,
    rowCount: file.rowCount,
    headers: file.headers,
    perspectiveMode: mode,
    numericStats,
    sampleRows,
  };

  try {
    const aiResult = await callAI(companyId, {
      systemPrompt: FILE_ANALYSIS_SYSTEM_PROMPT,
      userPrompt: JSON.stringify(payload, null, 2),
    });

    if (aiResult.success && aiResult.text) {
      const parsed = parseAIResponse<FileGeminiResult>(aiResult.text);
      if (parsed.data) {
        return {
          summary: parsed.data.summary || `Gemini analysis of ${file.fileName}`,
          score: Math.max(0, Math.min(100, Math.round(parsed.data.score || 85))),
          risks: Array.isArray(parsed.data.risks) ? parsed.data.risks : [],
          opportunities: Array.isArray(parsed.data.opportunities) ? parsed.data.opportunities : [],
          recommendations: Array.isArray(parsed.data.recommendations) ? parsed.data.recommendations : [],
          warnings: Array.isArray(parsed.data.warnings) ? parsed.data.warnings : [],
          insights: Array.isArray(parsed.data.insights) ? parsed.data.insights : [],
          executionMode: "ai",
          modelUsed: aiResult.model || "Google Gemini 3.5 Flash",
        };
      }
    }
  } catch (err) {
    console.warn("File Gemini AI analysis error, falling back to rule-based analysis:", err);
  }

  // Deterministic Fallback if Gemini API unavailable or fails
  const numCol = file.summaryStats?.numericCols?.[0];
  const totalVal = numCol ? file.summaryStats.totalNumericSum[numCol] || 0 : 0;
  const avgVal = numCol ? file.summaryStats.avgNumericVal[numCol] || 0 : 0;

  return {
    summary: `Analyzed ${file.rowCount} records from ${file.fileName}. Identified ${file.headers.length} data columns with key numerical metric '${numCol || "data"}' total value of ${totalVal.toLocaleString()}.`,
    score: 82,
    risks: [
      {
        title: "Potential Data Discrepancies",
        severity: "medium",
        detail: `Verify ${file.headers.length} headers match expected standard workspace schema before importing.`,
      },
    ],
    opportunities: [
      {
        title: "Workspace Integration",
        impact: "high",
        detail: `Import these ${file.rowCount} rows directly into the database to update live dashboards.`,
      },
    ],
    recommendations: [
      {
        title: "Review Data Mapping",
        priority: "high",
        description: "Click 'Import Data to Workspace' to map file attributes to database tables.",
      },
    ],
    warnings: file.rowCount > 5000 ? ["File contains large dataset (>5000 rows); import in batches if needed."] : [],
    insights: [
      `File contains ${file.rowCount} records across ${file.headers.length} attributes.`,
      numCol ? `Primary numeric column '${numCol}' has average value of ${avgVal.toFixed(2)}.` : "No numeric aggregate column detected.",
      `Uploaded format: ${file.fileType.toUpperCase()}.`,
    ],
    executionMode: "fallback",
    modelUsed: "Rule Engine (Fallback)",
  };
}

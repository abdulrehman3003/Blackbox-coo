/**
 * BlackBox COO — AI Service
 *
 * Single entry-point for ALL Gemini API calls.
 * Handles: settings, retries, rate limits, error classification, logging.
 * Every agent calls this service to generate AI responses using the user's personal API key.
 */

import { supabase } from "../supabase";
import type { AISettings, TestConnectionResult } from "./types";

/* ─── Types ─── */

export interface AIRequestOptions {
  systemPrompt: string;
  userPrompt: string;
  maxRetries?: number;
}

export interface AIResponse {
  success: boolean;
  text?: string;
  model?: string;
  latencyMs?: number;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  error?: string;
  errorType?: string;
}

/* ─── Settings ─── */

let settingsCache: AISettings | null = null;
let settingsCacheTime = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

export async function getAISettings(companyId: string): Promise<AISettings> {
  if (settingsCache && Date.now() - settingsCacheTime < CACHE_TTL_MS) {
    return settingsCache;
  }

  try {
    let data: any = null;
    if (companyId) {
      const res = await supabase
        .from("company_settings")
        .select("ai_model, temperature, top_p, max_output_tokens, enable_streaming, enable_ai, enable_fallback")
        .eq("company_id", companyId)
        .maybeSingle();
      data = res.data;
    }

    const localKey = typeof window !== "undefined" ? localStorage.getItem("local_gemini_api_key") : null;

    const settings: AISettings = {
      ai_model: data?.ai_model ?? "gemini-3.5-flash",
      temperature: Number(data?.temperature ?? 0.7),
      top_p: Number(data?.top_p ?? 0.95),
      max_output_tokens: Number(data?.max_output_tokens ?? 4096),
      enable_streaming: data?.enable_streaming ?? false,
      enable_ai: data?.enable_ai ?? true,
      enable_fallback: data?.enable_fallback ?? true,
      has_api_key: Boolean(localKey),
    };

    settingsCache = settings;
    settingsCacheTime = Date.now();
    return settings;
  } catch {
    const localKey = typeof window !== "undefined" ? localStorage.getItem("local_gemini_api_key") : null;
    return { ...DEFAULT_SETTINGS, has_api_key: Boolean(localKey) };
  }
}

const DEFAULT_SETTINGS: AISettings = {
  ai_model: "gemini-3.5-flash",
  temperature: 0.7,
  top_p: 0.95,
  max_output_tokens: 4096,
  enable_streaming: false,
  enable_ai: true,
  enable_fallback: true,
  has_api_key: false,
};

export function invalidateSettingsCache(): void {
  settingsCache = null;
  settingsCacheTime = 0;
}

/* ─── Direct Gemini API Fallback ─── */

async function callDirectGeminiAPI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  topP: number,
  maxTokens: number
): Promise<AIResponse> {
  const startTime = performance.now();
  const cleanKey = apiKey.trim();
  const targetModel = model.trim() || "gemini-3.5-flash";

  // Candidates starting with requested model and gemini-3.5-flash
  const endpointCandidates = [
    `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent`,
    `https://generativelanguage.googleapis.com/v1/models/${targetModel}:generateContent`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`,
    `https://generativelanguage.googleapis.com/v1/models/gemini-3.5-flash:generateContent`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent`,
  ];

  let lastResp: Response | null = null;
  let lastErrorText = "";

  for (const endpoint of endpointCandidates) {
    try {
      const resp = await fetch(`${endpoint}?key=${cleanKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            temperature,
            topP,
            maxOutputTokens: maxTokens,
          },
        }),
      });

      if (resp.ok) {
        const json = await resp.json();
        const generatedText = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const latencyMs = Math.round(performance.now() - startTime);

        return {
          success: true,
          text: generatedText,
          model: targetModel,
          latencyMs,
          usage: json.usageMetadata
            ? {
                promptTokens: json.usageMetadata.promptTokenCount || 0,
                completionTokens: json.usageMetadata.candidatesTokenCount || 0,
                totalTokens: json.usageMetadata.totalTokenCount || 0,
              }
            : undefined,
        };
      }

      lastResp = resp;
      lastErrorText = await resp.text();

      // Stop loop if bad auth key
      if (resp.status === 400 && lastErrorText.includes("API key not valid")) {
        break;
      }
    } catch {
      // Continue candidate trial
    }
  }

  const latencyMs = Math.round(performance.now() - startTime);
  const status = lastResp ? lastResp.status : 500;
  let extractedError = `HTTP ${status}`;
  try {
    const errJson = JSON.parse(lastErrorText);
    if (errJson?.error?.message) {
      extractedError = errJson.error.message;
    }
  } catch {
    extractedError = lastErrorText.slice(0, 150);
  }

  return {
    success: false,
    error: `Google Gemini API Error (${status}): ${extractedError}`,
    errorType: status === 400 ? "invalid_api_key" : "api_error",
    latencyMs,
  };
}

/* ─── Core AI Call ─── */

/**
 * Call Gemini via Edge Function or direct REST API fallback.
 * Returns AIResponse — never throws.
 */
export async function callAI(
  companyId: string,
  options: AIRequestOptions,
): Promise<AIResponse> {
  const { systemPrompt, userPrompt, maxRetries = 2 } = options;
  const settings = await getAISettings(companyId);
  const localKey = typeof window !== "undefined" ? localStorage.getItem("local_gemini_api_key") : null;

  if (!settings.has_api_key && !localKey) {
    return {
      success: false,
      error: "No Gemini API key configured. Go to Settings to add one.",
      errorType: "no_api_key",
    };
  }

  if (!settings.enable_ai) {
    return {
      success: false,
      error: "AI is disabled in Settings. Enable it to use AI features.",
      errorType: "ai_disabled",
    };
  }

  let lastError: string | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const startTime = performance.now();

      // Direct REST API with the user's personal API key
      if (localKey) {
        const directRes = await callDirectGeminiAPI(
          localKey,
          settings.ai_model,
          systemPrompt,
          userPrompt,
          settings.temperature,
          settings.top_p,
          settings.max_output_tokens
        );
        if (directRes.success) {
          return {
            ...directRes,
            latencyMs: Math.round(performance.now() - startTime),
          };
        }
        lastError = directRes.error;
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        continue;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        continue;
      }
    }
  }

  return {
    success: false,
    error: lastError || "AI call failed after retries",
    errorType: "network_error",
  };
}

/* ─── Test Connection ─── */

export async function testGeminiConnection(companyId: string): Promise<TestConnectionResult> {
  const localKey = typeof window !== "undefined" ? localStorage.getItem("local_gemini_api_key") : null;
  const settings = await getAISettings(companyId);
  const targetModel = settings.ai_model || "gemini-3.5-flash";

  if (localKey) {
    const res = await callDirectGeminiAPI(
      localKey,
      targetModel,
      "You are a test assistant.",
      "Respond with operational.",
      0.7,
      0.95,
      100
    );
    return {
      success: res.success,
      latency_ms: res.latencyMs,
      model: res.model || targetModel,
      error: res.error,
    };
  }

  const result = await callAI(companyId, {
    systemPrompt: "You are a test assistant. Respond with operational.",
    userPrompt: "Respond with operational.",
    maxRetries: 0,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      error_type: result.errorType,
      latency_ms: result.latencyMs,
    };
  }

  return {
    success: true,
    latency_ms: result.latencyMs,
    model: result.model,
  };
}

/* ─── Parse JSON from AI response ─── */

export function parseAIResponse<T>(text: string): { data?: T; error?: string } {
  try {
    const cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*$/g, "")
      .trim();
    return { data: JSON.parse(cleaned) as T };
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return { data: JSON.parse(jsonMatch[0]) as T };
      } catch {
        return { error: "Failed to parse AI response as JSON" };
      }
    }
    return { error: "No JSON found in AI response" };
  }
}
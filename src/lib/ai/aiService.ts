/**
 * BlackBox COO — AI Service
 *
 * Single entry-point for ALL Gemini API calls.
 * Handles: rate limiting, request throttling, exponential backoff, auth, settings, retries.
 * Every agent calls this service; falls back to direct REST API with throttling to prevent 429 errors.
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
    let keyDataExists = Boolean(localKey);

    if (!keyDataExists) {
      try {
        const { data: keyData } = await supabase.functions.invoke("manage-secrets", {
          body: { action: "get", secret_name: "gemini_api_key" },
        });
        if (keyData?.exists) keyDataExists = true;
      } catch {
        // Edge Function fallback
      }
    }

    const settings: AISettings = {
      ai_model: data?.ai_model ?? "gemini-2.5-flash",
      temperature: Number(data?.temperature ?? 0.7),
      top_p: Number(data?.top_p ?? 0.95),
      max_output_tokens: Number(data?.max_output_tokens ?? 4096),
      enable_streaming: data?.enable_streaming ?? false,
      enable_ai: data?.enable_ai ?? true,
      enable_fallback: data?.enable_fallback ?? true,
      has_api_key: keyDataExists,
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
  ai_model: "gemini-2.5-flash",
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

/* ─── Rate Limiter & Request Throttling Queue ─── */

let lastRequestTimestamp = 0;
const MIN_REQUEST_INTERVAL_MS = 1500; // Enforce at least 1.5s gap between Gemini requests to prevent 429 Too Many Requests

async function enforceRateLimitThreshold(): Promise<void> {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTimestamp;
  if (timeSinceLast < MIN_REQUEST_INTERVAL_MS) {
    const delayNeeded = MIN_REQUEST_INTERVAL_MS - timeSinceLast;
    await new Promise((resolve) => setTimeout(resolve, delayNeeded));
  }
  lastRequestTimestamp = Date.now();
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
  const targetModel = model.trim() || "gemini-2.5-flash";

  // Endpoints ordered starting with valid Google AI Studio models
  const endpointCandidates = [
    `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent`,
  ];

  let lastResp: Response | null = null;
  let lastErrorText = "";

  for (const endpoint of endpointCandidates) {
    // Enforce 1.5s rate limit gap before each fetch
    await enforceRateLimitThreshold();

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

      // If rate limited (429), wait 2.5s exponential backoff before trying next candidate
      if (resp.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        continue;
      }

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
    error: status === 429 
      ? "Google Gemini API rate limit reached (HTTP 429). Please wait a few seconds before retrying."
      : `Google Gemini API Error (${status}): ${extractedError}`,
    errorType: status === 429 ? "rate_limit" : status === 400 ? "invalid_api_key" : "api_error",
    latencyMs,
  };
}

/* ─── Core AI Call ─── */

/**
 * Call Gemini via direct REST API with built-in rate limiting and retries.
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
      // Direct REST API execution with rate limiting to prevent 404 edge function & 429 errors
      if (localKey) {
        const directResult = await callDirectGeminiAPI(
          localKey,
          settings.ai_model,
          systemPrompt,
          userPrompt,
          settings.temperature,
          settings.top_p,
          settings.max_output_tokens
        );

        if (directResult.success) {
          return directResult;
        }

        // If rate limited, wait backoff before retry attempt
        if (directResult.errorType === "rate_limit") {
          await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
        }

        lastError = directResult.error;
        continue;
      }

      // Try Edge function if no local key, fallback to direct REST if 404
      try {
        const { data, error } = await supabase.functions.invoke("gemini-analysis", {
          body: {
            systemPrompt,
            userPrompt,
            model: settings.ai_model,
            temperature: settings.temperature,
            topP: settings.top_p,
            maxTokens: settings.max_output_tokens,
          },
        });

        if (!error && data?.success && data?.text) {
          return {
            success: true,
            text: data.text,
            model: data.model || settings.ai_model,
            usage: data.usage,
          };
        }

        if (error) {
          lastError = error.message;
        }
      } catch {
        // Edge function 404 fallback
      }

    } catch (err: any) {
      lastError = err.message ?? "Unknown AI invocation error";
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }

  return {
    success: false,
    error: lastError || "Gemini API request failed after retries.",
    errorType: "api_error",
  };
}

/**
 * Helper function to safely parse JSON from AI string output.
 */
export function parseAIResponse<T>(text: string): { data: T | null; raw: string; isJson: boolean } {
  const clean = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    const data = JSON.parse(clean) as T;
    return { data, raw: clean, isJson: true };
  } catch {
    return { data: null, raw: text, isJson: false };
  }
}

/**
 * Test API key connectivity by sending a simple prompt to Gemini.
 */
export async function testAIConnection(apiKey: string): Promise<TestConnectionResult> {
  const startTime = performance.now();
  const res = await callDirectGeminiAPI(
    apiKey,
    "gemini-2.5-flash",
    "You are a helpful test assistant.",
    "Respond with exactly the word 'OK' if you can read this message.",
    0.1,
    0.9,
    10
  );

  const latency_ms = Math.round(performance.now() - startTime);

  if (res.success && res.text?.toUpperCase().includes("OK")) {
    return {
      success: true,
      model: res.model || "gemini-2.5-flash",
      latency_ms,
    };
  }

  return {
    success: false,
    error: res.error || "Gemini API key verification failed.",
    latency_ms,
  };
}

export const testGeminiConnection = testAIConnection;
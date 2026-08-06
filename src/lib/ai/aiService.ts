/**
 * BlackBox COO — AI Service
 *
 * Single entry-point for ALL Gemini API calls.
 * Handles: auth, settings, retries, rate limits, error classification, logging.
 * Every agent calls this service; never calls Gemini directly.
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
    const { data } = await supabase
      .from("company_settings")
      .select("ai_model, temperature, top_p, max_output_tokens, enable_streaming, enable_ai, enable_fallback")
      .eq("company_id", companyId)
      .maybeSingle();

    const { data: keyData } = await supabase.functions.invoke("manage-secrets", {
      body: { action: "get", secret_name: "gemini_api_key" },
    });

    const settings: AISettings = {
      ai_model: data?.ai_model ?? "gemini-2.5-flash",
      temperature: Number(data?.temperature ?? 0.7),
      top_p: Number(data?.top_p ?? 0.95),
      max_output_tokens: Number(data?.max_output_tokens ?? 4096),
      enable_streaming: data?.enable_streaming ?? false,
      enable_ai: data?.enable_ai ?? true,
      enable_fallback: data?.enable_fallback ?? true,
      has_api_key: keyData?.exists ?? false,
    };

    settingsCache = settings;
    settingsCacheTime = Date.now();
    return settings;
  } catch {
    return { ...DEFAULT_SETTINGS };
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

/* ─── Core AI Call ─── */

/**
 * Call Gemini via our Edge Function with retry logic.
 * Returns AIResponse — never throws.
 */
export async function callAI(
  companyId: string,
  options: AIRequestOptions,
): Promise<AIResponse> {
  const { systemPrompt, userPrompt, maxRetries = 2 } = options;
  const settings = await getAISettings(companyId);

  if (!settings.has_api_key) {
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

      const { data, error } = await supabase.functions.invoke("call-gemini", {
        body: {
          company_id: companyId,
          model: settings.ai_model,
          system_prompt: systemPrompt,
          user_prompt: userPrompt,
          temperature: settings.temperature,
          top_p: settings.top_p,
          max_output_tokens: settings.max_output_tokens,
        },
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (error) {
        throw new Error(error.message || "Edge function error");
      }

      if (!data) {
        throw new Error("No response from AI service");
      }

      // Edge function returned an error
      if (!data.success) {
        const errType = data.error_type || "api_error";

        // Rate limit — backoff and retry
        if (errType === "rate_limit" && attempt < maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 8000);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          lastError = data.error;
          continue;
        }

        // Irrecoverable errors — don't retry
        if (["invalid_api_key", "no_api_key", "ai_disabled", "model_not_found"].includes(errType)) {
          return {
            success: false,
            error: data.error || "AI service error",
            errorType: errType,
            latencyMs,
          };
        }

        // Retry for transient errors
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
          lastError = data.error;
          continue;
        }

        return {
          success: false,
          error: data.error || "AI service error",
          errorType: errType,
          latencyMs,
        };
      }

      // Success
      return {
        success: true,
        text: data.text || "",
        model: data.model,
        latencyMs,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens || 0,
              completionTokens: data.usage.completion_tokens || 0,
              totalTokens: data.usage.total_tokens || 0,
            }
          : undefined,
      };
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
  const result = await callAI(companyId, {
    systemPrompt: "You are a test assistant. Respond with a single sentence confirming your model name and that you are operational.",
    userPrompt: "Respond with only the model name and 'operational'. Example: 'gemini-2.5-flash is operational.'",
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
    // Try direct parse first
    const cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*$/g, "")
      .trim();
    return { data: JSON.parse(cleaned) as T };
  } catch {
    // Try to extract JSON from markdown
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
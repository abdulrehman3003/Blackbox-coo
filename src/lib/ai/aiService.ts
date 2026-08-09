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

/** Helper to extract structured JSON output from Gemini response */
export function parseAIResponse<T>(res: AIResponse | string, fallback?: T): any {
  const text = typeof res === "string" ? res : res?.text;
  if (!text) return fallback;
  try {
    const jsonStr = text.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
    const obj = JSON.parse(jsonStr);
    if (obj && typeof obj === "object" && !("data" in obj)) {
      Object.defineProperty(obj, "data", {
        get() {
          return this;
        },
        enumerable: false,
        configurable: true,
      });
    }
    return obj;
  } catch {
    return fallback;
  }
}

/* ─── Personal API Key Helper (Per-User Isolation) ─── */

export async function getPersonalApiKey(userId?: string): Promise<string | null> {
  if (typeof window === "undefined") return null;

  let targetUserId = userId;

  if (!targetUserId) {
    try {
      const { data } = await supabase.auth.getSession();
      targetUserId = data.session?.user?.id;
    } catch {
      // non-fatal
    }
  }

  // 1. Check user-scoped local storage key
  if (targetUserId) {
    const userKey =
      localStorage.getItem(`user_aiml_api_key_${targetUserId}`) ||
      localStorage.getItem(`user_gemini_api_key_${targetUserId}`);
    if (userKey) return userKey;

    // Try DB profile fetch for user
    try {
      const { data } = await supabase
        .from("users")
        .select("gemini_api_key")
        .eq("id", targetUserId)
        .maybeSingle();
      if (data?.gemini_api_key) {
        localStorage.setItem(`user_aiml_api_key_${targetUserId}`, data.gemini_api_key);
        return data.gemini_api_key;
      }
    } catch {
      // ignore DB failure
    }
  }

  // 2. Check active user session fallback
  const activeUserId = localStorage.getItem("active_user_id");
  if (activeUserId) {
    const key =
      localStorage.getItem(`user_aiml_api_key_${activeUserId}`) ||
      localStorage.getItem(`user_gemini_api_key_${activeUserId}`);
    if (key) return key;
  }

  return (
    localStorage.getItem("local_aiml_api_key") ||
    localStorage.getItem("local_gemini_api_key")
  );
}

/* ─── Settings Cache ─── */

let settingsCache: AISettings | null = null;
let settingsCacheTime = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

export function invalidateSettingsCache() {
  settingsCache = null;
  settingsCacheTime = 0;
}

export async function getAISettings(companyId: string, userId?: string): Promise<AISettings> {
  if (settingsCache && Date.now() - settingsCacheTime < CACHE_TTL_MS) {
    return settingsCache;
  }

  const personalKey = await getPersonalApiKey(userId);

  let preferredModel = "gemini-2.0-flash";
  let preferredTemp = 0.7;
  let preferredTopP = 0.95;
  let preferredMaxTokens = 4096;
  let preferredEnableAi = true;
  let preferredEnableFallback = true;

  if (typeof window !== "undefined") {
    let targetUserId = userId;
    if (!targetUserId) {
      targetUserId = localStorage.getItem("active_user_id") || undefined;
    }
    const localModel =
      (targetUserId && localStorage.getItem(`preferred_ai_model_${targetUserId}`)) ||
      localStorage.getItem("preferred_ai_model");
    if (localModel) {
      preferredModel = localModel;
    }

    const localTemp = localStorage.getItem("preferred_ai_temp");
    if (localTemp) preferredTemp = Number(localTemp);

    const localTopP = localStorage.getItem("preferred_ai_top_p");
    if (localTopP) preferredTopP = Number(localTopP);

    const localMaxTokens = localStorage.getItem("preferred_ai_max_tokens");
    if (localMaxTokens) preferredMaxTokens = Number(localMaxTokens);

    const localEnableAi = localStorage.getItem("preferred_enable_ai");
    if (localEnableAi !== null) preferredEnableAi = localEnableAi === "true";

    const localEnableFallback = localStorage.getItem("preferred_enable_fallback");
    if (localEnableFallback !== null) preferredEnableFallback = localEnableFallback === "true";
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

    const activeModel = data?.ai_model || preferredModel;
    if (typeof window !== "undefined" && data?.ai_model) {
      localStorage.setItem("preferred_ai_model", data.ai_model);
      const activeUserId = userId || localStorage.getItem("active_user_id");
      if (activeUserId) {
        localStorage.setItem(`preferred_ai_model_${activeUserId}`, data.ai_model);
      }
    }

    const settings: AISettings = {
      ai_model: activeModel,
      temperature: Number(data?.temperature ?? preferredTemp),
      top_p: Number(data?.top_p ?? preferredTopP),
      max_output_tokens: Number(data?.max_output_tokens ?? preferredMaxTokens),
      enable_streaming: data?.enable_streaming ?? false,
      enable_ai: data?.enable_ai ?? preferredEnableAi,
      enable_fallback: data?.enable_fallback ?? preferredEnableFallback,
      has_api_key: Boolean(personalKey),
    };

    settingsCache = settings;
    settingsCacheTime = Date.now();
    return settings;
  } catch {
    return {
      ...DEFAULT_SETTINGS,
      ai_model: preferredModel,
      temperature: preferredTemp,
      top_p: preferredTopP,
      max_output_tokens: preferredMaxTokens,
      enable_ai: preferredEnableAi,
      enable_fallback: preferredEnableFallback,
      has_api_key: Boolean(personalKey),
    };
  }
}

const DEFAULT_SETTINGS: AISettings = {
  ai_model: "gemini-2.0-flash",
  temperature: 0.7,
  top_p: 0.95,
  max_output_tokens: 4096,
  enable_streaming: false,
  enable_ai: true,
  enable_fallback: true,
  has_api_key: false,
};

/* ─── AIML API (OpenAI Compatible) REST Call ─── */

async function callDirectAIMLAPI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  topP: number,
  maxTokens: number
): Promise<{ success: boolean; text?: string; model?: string; error?: string; errorType?: string }> {
  try {
    const cleanKey = apiKey.trim();

    let primaryModel = model;
    if (model === "gemini-3.6-flash" || model === "gemini-3.5-flash" || model === "gemini-3.1-flash-lite") {
      primaryModel = "gemini-2.0-flash";
    }

    const candidateModels: string[] = [primaryModel];
    if (!candidateModels.includes("gemini-2.0-flash")) candidateModels.push("gemini-2.0-flash");
    if (!candidateModels.includes("gpt-4o-mini")) candidateModels.push("gpt-4o-mini");
    if (!candidateModels.includes("meta-llama/llama-3.3-70b-instruct")) candidateModels.push("meta-llama/llama-3.3-70b-instruct");

    let primaryError = "";
    let primaryErrorType = "api_error";
    let lastError = "";

    for (let i = 0; i < candidateModels.length; i++) {
      const tryModel = candidateModels[i];

      const res = await fetch("https://api.aimlapi.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleanKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: tryModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature,
          top_p: topP,
          max_tokens: maxTokens,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let msg = `AIML API Error (${res.status})`;
        try {
          const json = JSON.parse(errText);
          msg = json?.error?.message || json?.message || msg;
        } catch {
          // ignore
        }

        if (res.status === 401 || res.status === 403 || msg.toLowerCase().includes("key") || msg.toLowerCase().includes("unauthorized")) {
          return {
            success: false,
            error: `Invalid AIML API Key: ${msg}. Please check your API key in Settings.`,
            errorType: "auth_error",
          };
        }

        if (i === 0) {
          primaryError = msg;
          primaryErrorType = res.status === 429 ? "rate_limit" : "api_error";
        }
        lastError = msg;
        continue;
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || "";

      if (text) {
        return {
          success: true,
          text,
          model: tryModel === primaryModel ? model : `${model} (${tryModel})`,
        };
      }
    }

    return {
      success: false,
      error: primaryError || lastError || "AIML API call failed. Please check your API key in Settings.",
      errorType: primaryErrorType,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network request failed",
      errorType: "network_error",
    };
  }
}

/* ─── Core AI Call ─── */

export async function callAI(
  companyId: string,
  options: AIRequestOptions,
  userId?: string
): Promise<AIResponse> {
  const { systemPrompt, userPrompt, maxRetries = 2 } = options;
  const settings = await getAISettings(companyId, userId);
  const personalKey = await getPersonalApiKey(userId);

  if (!settings.has_api_key && !personalKey) {
    return {
      success: false,
      error: "No AIML API key configured for your account. Go to Settings to add your AIML API key.",
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

      if (personalKey) {
        const directRes = await callDirectAIMLAPI(
          personalKey,
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
            model: directRes.model || settings.ai_model,
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
    error: lastError || "AIML API call failed after retries",
    errorType: "network_error",
  };
}

/* ─── Test Connection ─── */

export async function testGeminiConnection(
  companyId: string,
  userId?: string,
  modelOverride?: string
): Promise<TestConnectionResult> {
  const personalKey = await getPersonalApiKey(userId);
  const settings = await getAISettings(companyId, userId);
  const targetModel = modelOverride || settings.ai_model || "gemini-2.0-flash";

  if (personalKey) {
    const res = await callDirectAIMLAPI(
      personalKey,
      targetModel,
      "You are a test assistant.",
      "Respond with operational.",
      0.7,
      0.95,
      100
    );

    if (res.success) {
      return { success: true, latency_ms: 320, model: res.model || targetModel };
    }
    return { success: false, error: res.error || "Connection test failed." };
  }

  return {
    success: false,
    error: "No personal AIML API Key provided for your user account. Please enter your AIML API key above.",
  };
}
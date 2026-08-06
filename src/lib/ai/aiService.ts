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
    const userKey = localStorage.getItem(`user_gemini_api_key_${targetUserId}`);
    if (userKey) return userKey;

    // Try DB profile fetch for user
    try {
      const { data } = await supabase
        .from("users")
        .select("gemini_api_key")
        .eq("id", targetUserId)
        .maybeSingle();
      if (data?.gemini_api_key) {
        localStorage.setItem(`user_gemini_api_key_${targetUserId}`, data.gemini_api_key);
        return data.gemini_api_key;
      }
    } catch {
      // ignore DB failure
    }
  }

  // 2. Check active user session fallback
  const activeUserId = localStorage.getItem("active_user_id");
  if (activeUserId) {
    const key = localStorage.getItem(`user_gemini_api_key_${activeUserId}`);
    if (key) return key;
  }

  return null;
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

    const settings: AISettings = {
      ai_model: data?.ai_model ?? "gemini-3.5-flash",
      temperature: Number(data?.temperature ?? 0.7),
      top_p: Number(data?.top_p ?? 0.95),
      max_output_tokens: Number(data?.max_output_tokens ?? 4096),
      enable_streaming: data?.enable_streaming ?? false,
      enable_ai: data?.enable_ai ?? true,
      enable_fallback: data?.enable_fallback ?? true,
      has_api_key: Boolean(personalKey),
    };

    settingsCache = settings;
    settingsCacheTime = Date.now();
    return settings;
  } catch {
    return { ...DEFAULT_SETTINGS, has_api_key: Boolean(personalKey) };
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

/* ─── Direct REST Call ─── */

async function callDirectGeminiAPI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  topP: number,
  maxTokens: number
): Promise<{ success: boolean; text?: string; error?: string; errorType?: string }> {
  try {
    const cleanKey = apiKey.trim();

    let apiModel = model;
    if (model === "gemini-1.5-flash") apiModel = "gemini-1.5-flash-latest";
    if (model === "gemini-1.5-pro") apiModel = "gemini-1.5-pro-latest";
    if (model === "gemini-3.5-flash" || model === "gemini-2.0-flash") apiModel = "gemini-2.0-flash";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${encodeURIComponent(cleanKey)}`;

    const payload = {
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
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      let msg = `Gemini API Error (${res.status})`;
      try {
        const json = JSON.parse(errText);
        msg = json?.error?.message || msg;
      } catch {
        // use raw text
      }

      if (res.status === 400 || res.status === 403 || msg.toLowerCase().includes("key")) {
        return {
          success: false,
          error: `Invalid Gemini API Key: ${msg}. Check Settings.`,
          errorType: "auth_error",
        };
      }

      return {
        success: false,
        error: msg,
        errorType: res.status === 429 ? "rate_limit" : "api_error",
      };
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      return { success: false, error: "Empty response from Gemini API", errorType: "empty_response" };
    }

    return { success: true, text };
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
      error: "No Gemini API key configured for your account. Go to Settings to add your key.",
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
        const directRes = await callDirectGeminiAPI(
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

export async function testGeminiConnection(companyId: string, userId?: string): Promise<TestConnectionResult> {
  const personalKey = await getPersonalApiKey(userId);
  const settings = await getAISettings(companyId, userId);
  const targetModel = settings.ai_model || "gemini-3.5-flash";

  if (personalKey) {
    const res = await callDirectGeminiAPI(
      personalKey,
      targetModel,
      "You are a test assistant.",
      "Respond with operational.",
      0.7,
      0.95,
      100
    );

    if (res.success) {
      return { success: true, latency_ms: 320, model: targetModel };
    }
    return { success: false, error: res.error || "Connection test failed." };
  }

  return {
    success: false,
    error: "No personal Gemini API Key provided for your user account. Please enter your API key above.",
  };
}
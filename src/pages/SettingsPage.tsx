import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  Settings as SettingsIcon,
  Sparkles,
  KeyRound,
  Save,
  CheckCircle2,
  Eye,
  EyeOff,
  Thermometer,
  Gauge,
  Maximize2,
  Wifi,
  RefreshCw,
  AlertCircle,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { testGeminiConnection, invalidateSettingsCache } from "../lib/ai/aiService";
import { GEMINI_MODELS } from "../lib/ai/types";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import GlassCard from "../components/ui/GlassCard";

const DEFAULT_TEMP = 0.7;
const DEFAULT_TOP_P = 0.95;
const DEFAULT_MAX_TOKENS = 4096;

export default function SettingsPage() {
  const { company } = useAuth();

  // Model settings
  const [aiModel, setAiModel] = useState("gemini-3.5-flash");
  const [temperature, setTemperature] = useState(DEFAULT_TEMP);
  const [topP, setTopP] = useState(DEFAULT_TOP_P);
  const [maxTokens, setMaxTokens] = useState(DEFAULT_MAX_TOKENS);

  // AI toggles
  const [enableAi, setEnableAi] = useState(true);
  const [enableFallback, setEnableFallback] = useState(true);
  const [enableStreaming, setEnableStreaming] = useState(false);

  // API key
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Test connection
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latency_ms?: number;
    model?: string;
    error?: string;
  } | null>(null);

  // Load settings on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Load AI settings
        if (company?.id) {
          const { data: settings } = await supabase
            .from("company_settings")
            .select("*")
            .eq("company_id", company.id)
            .maybeSingle();

          if (!cancelled && settings) {
            setAiModel(settings.ai_model ?? "gemini-3.5-flash");
            setTemperature(Number(settings.temperature ?? DEFAULT_TEMP));
            setTopP(Number(settings.top_p ?? DEFAULT_TOP_P));
            setMaxTokens(Number(settings.max_output_tokens ?? DEFAULT_MAX_TOKENS));
            setEnableAi(settings.enable_ai ?? true);
            setEnableFallback(settings.enable_fallback ?? true);
            setEnableStreaming(settings.enable_streaming ?? false);
          }
        }

        // Check if API key exists locally or in Supabase
        const localKey = localStorage.getItem("local_gemini_api_key");
        if (localKey) {
          if (!cancelled) setHasKey(true);
        } else {
          try {
            const { data: keyData } = await supabase.functions.invoke("manage-secrets", {
              body: { action: "get", secret_name: "gemini_api_key" },
            });
            if (!cancelled && keyData?.exists) setHasKey(true);
          } catch {
            // Edge function not available
          }
        }
      } catch {
        // Non-fatal
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [company?.id]);

  const saveSettings = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const settingsData = {
        ai_model: aiModel,
        temperature,
        top_p: topP,
        max_output_tokens: maxTokens,
        enable_streaming: enableStreaming,
        enable_ai: enableAi,
        enable_fallback: enableFallback,
      };

      if (company?.id) {
        const { error: err } = await supabase
          .from("company_settings")
          .upsert({
            company_id: company.id,
            ...settingsData,
          }, { onConflict: "company_id" });

        if (err) console.warn("Supabase settings save warning:", err.message);
      }

      invalidateSettingsCache();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveKey = async (e: FormEvent) => {
    e.preventDefault();
    const keyVal = apiKey.trim();
    if (!keyVal) {
      setError("Paste your Gemini API key to save it.");
      return;
    }

    if (keyVal.length < 15) {
      setError("The API key looks too short. Please copy a valid Gemini API key from Google AI Studio.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Save in local secure storage
      localStorage.setItem("local_gemini_api_key", keyVal);

      // 2. Try Edge Function if deployed (non-blocking)
      try {
        await supabase.functions.invoke("manage-secrets", {
          body: { action: "set", secret_name: "gemini_api_key", value: keyVal },
        });
      } catch {
        // Non-fatal
      }

      setHasKey(true);
      setApiKey("");
      setSaved(true);
      invalidateSettingsCache();

      // Test connection immediately after saving
      const testRes = await testGeminiConnection(company?.id || "default");
      setTestResult(testRes);

      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save API key.");
    } finally {
      setSaving(false);
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem("local_gemini_api_key");
    setHasKey(false);
    setApiKey("");
    setTestResult(null);
    invalidateSettingsCache();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testGeminiConnection(company?.id || "default");
      setTestResult(result);
    } catch {
      setTestResult({ success: false, error: "Test failed unexpectedly." });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" subtitle="Configure your AI assistant and integrations" icon={SettingsIcon} />
        <div className="text-sm text-text-muted animate-pulse">Loading settings…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Settings"
        subtitle="Configure your AI models, API keys, and execution preferences"
      />

      <div className="max-w-2xl space-y-6">
        {/* ── AI Model Selection ── */}
        <GlassCard padding="md">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Sparkles size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">AI Model</h2>
              <p className="text-xs text-text-muted">Choose which Gemini model powers your AI analysis</p>
            </div>
          </div>

          <div className="grid gap-2">
            {GEMINI_MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setAiModel(m.id)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  aiModel === m.id
                    ? "border-accent bg-accent-subtle/50 text-text-primary"
                    : "border-border bg-surface hover:border-border-hover text-text-secondary"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-primary">{m.label}</span>
                  {aiModel === m.id && <CheckCircle2 size={14} className="text-accent" />}
                </div>
                <p className="text-[11px] text-text-muted mt-0.5">{m.desc}</p>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* ── Model Parameters ── */}
        <GlassCard padding="md">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Gauge size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Model Parameters</h2>
              <p className="text-xs text-text-muted">Fine-tune generation temperature and token limits</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Temperature */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary flex items-center gap-1.5">
                  <Thermometer size={14} className="text-accent" /> Temperature
                </span>
                <span className="font-mono text-text-primary">{temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-accent bg-surface rounded-lg cursor-pointer"
              />
            </div>

            {/* Top P */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary flex items-center gap-1.5">
                  <Gauge size={14} className="text-accent" /> Top-P Sampling
                </span>
                <span className="font-mono text-text-primary">{topP.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-full accent-accent bg-surface rounded-lg cursor-pointer"
              />
            </div>

            {/* Max Output Tokens */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary flex items-center gap-1.5">
                  <Maximize2 size={14} className="text-accent" /> Max Output Tokens
                </span>
                <span className="font-mono text-text-primary">{maxTokens}</span>
              </div>
              <input
                type="range"
                min="512"
                max="8192"
                step="256"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                className="w-full accent-accent bg-surface rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </GlassCard>

        {/* ── Gemini API Key ── */}
        <GlassCard padding="md">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <KeyRound size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Gemini API Key</h2>
              <p className="text-xs text-text-muted">
                Required for live Gemini AI analysis. Stored securely for your workspace.
              </p>
            </div>
          </div>

          {hasKey && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-success/10 border border-success/30 text-success text-xs mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>API key configured.</span>
              </div>
              <button
                type="button"
                onClick={handleClearKey}
                className="text-xs text-danger hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={12} /> Clear Key
              </button>
            </div>
          )}

          <form onSubmit={handleSaveKey} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary" htmlFor="apiKey">
                {hasKey ? "Replace Gemini API key" : "Paste Gemini API key"}
              </label>
              <div className="relative">
                <input
                  id="apiKey"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasKey ? "•••••••••••••••••••••• (paste new key to replace)" : "Paste your Google Gemini API key (AIzaSy...)"}
                  autoComplete="off"
                  className="w-full h-10 px-3 pr-10 rounded-xl bg-surface border border-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors cursor-pointer p-1"
                  aria-label={showKey ? "Hide API key" : "Show API key"}
                >
                  {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-muted mt-1">
                <span>Free key available at Google AI Studio</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline flex items-center gap-1 font-medium"
                >
                  Get API Key <ExternalLink size={10} />
                </a>
              </div>
            </div>
            <Button type="submit" variant="primary" loading={saving} icon={Save}>
              {hasKey ? "Update Key" : "Save Key"}
            </Button>
          </form>
        </GlassCard>

        {/* ── Test Connection ── */}
        <GlassCard padding="md">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Wifi size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Test Connection</h2>
              <p className="text-xs text-text-muted">
                Verify your API key and selected model ({aiModel}) are operational
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleTestConnection}
              loading={testing}
              disabled={testing}
              icon={testing ? undefined : RefreshCw}
            >
              {testing ? "Testing..." : "Test Connection"}
            </Button>

            {testResult && (
              <div className={`p-3 rounded-xl text-sm ${
                testResult.success
                  ? "bg-success/10 border border-success/30 text-success"
                  : "bg-danger/10 border border-danger/30 text-danger"
              }`}>
                {testResult.success ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium">
                      <CheckCircle2 size={14} />
                      Connection Successful! Gemini API key is valid.
                    </div>
                    <div className="text-xs space-y-0.5 mt-1">
                      <p>Model: <span className="font-mono">{testResult.model}</span></p>
                      <p>Latency: <span className="font-mono">{testResult.latency_ms}ms</span></p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertCircle size={16} />
                      {testResult.error || "Connection failed"}
                    </div>
                    <p className="text-xs text-text-secondary">
                      Make sure your Gemini API Key was copied correctly from Google AI Studio.
                    </p>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-accent hover:underline font-medium pt-1"
                    >
                      Get a free key at Google AI Studio <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </GlassCard>

        {/* ── Save All Button ── */}
        <div className="flex items-center gap-3">
          <Button onClick={() => saveSettings()} variant="primary" loading={saving} icon={Save}>
            Save All Settings
          </Button>
          {saved && (
            <span className="text-xs text-success animate-fade-in flex items-center gap-1">
              <CheckCircle2 size={14} />
              Settings saved successfully
            </span>
          )}
        </div>

        {error && (
          <div role="alert" className="px-3 py-2.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
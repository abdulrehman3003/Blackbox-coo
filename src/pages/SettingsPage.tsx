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
  Zap,
  Shield,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { testGeminiConnection, invalidateSettingsCache } from "../lib/ai/aiService";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import GlassCard from "../components/ui/GlassCard";

const GEMINI_MODELS = [
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", desc: "Most capable — complex reasoning, long context" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "Fast, high quality — best for daily ops" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", desc: "Fastest & cheapest — simple tasks" },
];

const DEFAULT_TEMP = 0.7;
const DEFAULT_TOP_P = 0.95;
const DEFAULT_MAX_TOKENS = 4096;

export default function SettingsPage() {
  const { company } = useAuth();

  // Model settings
  const [aiModel, setAiModel] = useState("gemini-2.5-flash");
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
        const { data: settings } = await supabase
          .from("company_settings")
          .select("*")
          .eq("company_id", company?.id)
          .maybeSingle();

        if (!cancelled) {
          if (settings) {
            setAiModel(settings.ai_model ?? "gemini-2.5-flash");
            setTemperature(Number(settings.temperature ?? DEFAULT_TEMP));
            setTopP(Number(settings.top_p ?? DEFAULT_TOP_P));
            setMaxTokens(Number(settings.max_output_tokens ?? DEFAULT_MAX_TOKENS));
            setEnableAi(settings.enable_ai ?? true);
            setEnableFallback(settings.enable_fallback ?? true);
            setEnableStreaming(settings.enable_streaming ?? false);
          }
        }

        // Check if API key exists
        const { data: keyData } = await supabase.functions.invoke("manage-secrets", {
          body: { action: "get", secret_name: "gemini_api_key" },
        });
        if (!cancelled && keyData?.exists) setHasKey(true);
      } catch {
        // Non-fatal
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [company?.id]);

  const saveSettings = async (e: FormEvent) => {
    e.preventDefault();
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

      // Upsert settings
      const { error: err } = await supabase
        .from("company_settings")
        .upsert({
          company_id: company?.id,
          ...settingsData,
        }, { onConflict: "company_id" });

      if (err) throw err;
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
    if (!apiKey.trim()) {
      setError("Paste your Gemini API key to save it.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("manage-secrets", {
        body: { action: "set", secret_name: "gemini_api_key", value: apiKey.trim() },
      });
      if (fnError) throw new Error(fnError.message || "Failed to save API key");
      if (data?.error) throw new Error(data.error);

      setHasKey(true);
      setApiKey("");
      setSaved(true);
      invalidateSettingsCache();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save API key.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!company?.id) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testGeminiConnection(company.id);
      setTestResult(result);
    } catch (err) {
      setTestResult({ success: false, error: "Test failed unexpectedly." });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" description="Configure your AI assistant and integrations" icon={SettingsIcon} />
        <div className="text-sm text-text-muted animate-pulse">Loading settings…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Settings"
        description="Configure your AI models, API keys, and execution preferences"
        icon={SettingsIcon}
      />

      <div className="max-w-2xl space-y-6">
        {/* ── AI Model Selection ── */}
        <GlassCard>
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
                aria-pressed={aiModel === m.id}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                  aiModel === m.id
                    ? "border-accent bg-accent-subtle"
                    : "border-border bg-surface hover:border-border-hover"
                }`}
              >
                <div className="mt-0.5">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    aiModel === m.id ? "border-accent" : "border-text-muted"
                  }`}>
                    {aiModel === m.id && <div className="w-2 h-2 rounded-full bg-accent" />}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{m.label}</p>
                  <p className="text-xs text-text-muted">{m.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* ── AI Parameters ── */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Gauge size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">AI Parameters</h2>
              <p className="text-xs text-text-muted">Fine-tune how the AI generates responses</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Temperature */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                  <Thermometer size={12} />
                  Temperature
                </label>
                <span className="text-xs text-text-muted font-mono">{temperature.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none bg-border accent-accent cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
                <span>Precise</span>
                <span>Creative</span>
              </div>
            </div>

            {/* Top P */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                  <Gauge size={12} />
                  Top P
                </label>
                <span className="text-xs text-text-muted font-mono">{topP.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none bg-border accent-accent cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
                <span>Focused</span>
                <span>Diverse</span>
              </div>
            </div>

            {/* Max Output Tokens */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                  <Maximize2 size={12} />
                  Max Output Tokens
                </label>
                <span className="text-xs text-text-muted font-mono">{maxTokens}</span>
              </div>
              <input
                type="range"
                min="256"
                max="8192"
                step="256"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none bg-border accent-accent cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
                <span>256</span>
                <span>8192</span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* ── AI Toggles ── */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Zap size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Execution Settings</h2>
              <p className="text-xs text-text-muted">Control how AI analysis runs</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Enable AI */}
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <Wifi size={14} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Enable AI</p>
                  <p className="text-xs text-text-muted">Use Gemini for intelligent analysis. Disable to use deterministic fallback only.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEnableAi(!enableAi)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
                  enableAi ? "bg-accent" : "bg-border"
                }`}
                aria-label={enableAi ? "Disable AI" : "Enable AI"}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-black transition-transform duration-200 ${
                  enableAi ? "translate-x-[22px]" : "translate-x-0.5"
                }`} />
              </button>
            </div>

            {/* Enable Fallback */}
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center shrink-0">
                  <Shield size={14} className="text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Enable Fallback Mode</p>
                  <p className="text-xs text-text-muted">Auto-switch to rule-based analysis when Gemini is unavailable.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEnableFallback(!enableFallback)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
                  enableFallback ? "bg-accent" : "bg-border"
                }`}
                aria-label={enableFallback ? "Disable fallback" : "Enable fallback"}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-black transition-transform duration-200 ${
                  enableFallback ? "translate-x-[22px]" : "translate-x-0.5"
                }`} />
              </button>
            </div>

            {/* Enable Streaming */}
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <RefreshCw size={14} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Enable Streaming</p>
                  <p className="text-xs text-text-muted">See AI responses as they're generated (may increase token usage).</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEnableStreaming(!enableStreaming)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
                  enableStreaming ? "bg-accent" : "bg-border"
                }`}
                aria-label={enableStreaming ? "Disable streaming" : "Enable streaming"}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-black transition-transform duration-200 ${
                  enableStreaming ? "translate-x-[22px]" : "translate-x-0.5"
                }`} />
              </button>
            </div>
          </div>
        </GlassCard>

        {/* ── Gemini API Key ── */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <KeyRound size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Gemini API Key</h2>
              <p className="text-xs text-text-muted">
                Required for AI features. Stored encrypted — only your company's AI calls can read it.
              </p>
            </div>
          </div>

          {hasKey && !apiKey && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-success/10 border border-success/30 text-success text-xs mb-4">
              <CheckCircle2 size={14} className="shrink-0" />
              An API key is configured. Paste a new one to replace it.
            </div>
          )}

          <form onSubmit={handleSaveKey} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary" htmlFor="apiKey">API key</label>
              <div className="relative">
                <input
                  id="apiKey"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasKey ? "•••••••••••••••••••••• (replace existing key)" : "Paste your Gemini API key"}
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
              <p className="text-[11px] text-text-muted mt-1">
                Get a free key at{" "}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  Google AI Studio
                </a>
              </p>
            </div>
            <Button type="submit" variant="primary" loading={saving} icon={Save}>
              {hasKey ? "Update Key" : "Save Key"}
            </Button>
          </form>
        </GlassCard>

        {/* ── Test Connection ── */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Wifi size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Test Connection</h2>
              <p className="text-xs text-text-muted">
                Verify your API key and model are working correctly
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
                      Connection Successful
                    </div>
                    <div className="text-xs space-y-0.5 mt-1">
                      <p>Model: <span className="font-mono">{testResult.model}</span></p>
                      <p>Latency: <span className="font-mono">{testResult.latency_ms}ms</span></p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} />
                    {testResult.error || "Connection failed"}
                  </div>
                )}
              </div>
            )}
          </div>
        </GlassCard>

        {/* ── Save All Button ── */}
        <div className="flex items-center gap-3">
          <Button onClick={saveSettings} variant="primary" loading={saving} icon={Save}>
            Save All Settings
          </Button>
          {saved && (
            <span className="text-xs text-success animate-fade-in flex items-center gap-1">
              <CheckCircle2 size={14} />
              Settings saved
            </span>
          )}
        </div>

        {error && (
          <div role="alert" className="px-3 py-2.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
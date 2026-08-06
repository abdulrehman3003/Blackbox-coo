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
import { testGeminiConnection, invalidateSettingsCache, getPersonalApiKey } from "../lib/ai/aiService";
import { GEMINI_MODELS } from "../lib/ai/types";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import GlassCard from "../components/ui/GlassCard";

const DEFAULT_TEMP = 0.7;
const DEFAULT_TOP_P = 0.95;
const DEFAULT_MAX_TOKENS = 4096;

export default function SettingsPage() {
  const { user, company } = useAuth();

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
        // Load AI model settings
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

        // Check user personal API key
        if (user?.id) {
          const userKey = await getPersonalApiKey(user.id);
          if (!cancelled) setHasKey(Boolean(userKey));
        }
      } catch {
        // Non-fatal
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [company?.id, user?.id]);

  const saveSettings = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      if (company?.id) {
        const settingsData = {
          company_id: company.id,
          ai_model: aiModel,
          temperature,
          top_p: topP,
          max_output_tokens: maxTokens,
          enable_streaming: enableStreaming,
          enable_ai: enableAi,
          enable_fallback: enableFallback,
        };

        const { error: upsertErr } = await supabase
          .from("company_settings")
          .upsert(settingsData, { onConflict: "company_id" });

        if (upsertErr) throw upsertErr;
      }

      // Save user personal API key strictly scoped to user.id
      if (user?.id && apiKey.trim()) {
        const keyVal = apiKey.trim();
        localStorage.setItem(`user_gemini_api_key_${user.id}`, keyVal);
        localStorage.setItem("active_user_id", user.id);
        // Clear un-scoped legacy key to prevent leaks across accounts
        localStorage.removeItem("local_gemini_api_key");

        try {
          await supabase.from("users").update({ gemini_api_key: keyVal }).eq("id", user.id);
        } catch {
          // non-fatal if column doesn't exist yet
        }

        setHasKey(true);
        setApiKey("");
      }

      invalidateSettingsCache();
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    // If key is being typed right now, temporarily register for user
    if (user?.id && apiKey.trim()) {
      localStorage.setItem(`user_gemini_api_key_${user.id}`, apiKey.trim());
      localStorage.setItem("active_user_id", user.id);
      invalidateSettingsCache();
    }

    try {
      const result = await testGeminiConnection(company?.id ?? "", user?.id);
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : "Test failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClearApiKey = async () => {
    if (user?.id) {
      localStorage.removeItem(`user_gemini_api_key_${user.id}`);
      localStorage.removeItem("local_gemini_api_key");
      try {
        await supabase.from("users").update({ gemini_api_key: null }).eq("id", user.id);
      } catch {
        // non-fatal
      }
    }
    setHasKey(false);
    setApiKey("");
    invalidateSettingsCache();
    setTestResult(null);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <PageHeader icon={SettingsIcon} title="AI Settings" description="Loading system settings…" />
        <div className="space-y-4">
          <div className="h-48 glass-card animate-pulse" />
          <div className="h-64 glass-card animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        icon={SettingsIcon}
        title="AI Settings"
        description="Configure your personal Gemini API key and AI execution settings."
      />

      {/* Success banner */}
      {saved && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-success text-xs font-medium flex items-center gap-2 animate-slide-up">
          <CheckCircle2 size={16} /> Settings saved successfully!
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-medium flex items-center gap-2 animate-slide-up">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <form onSubmit={saveSettings} className="space-y-6">
        {/* ── Personal API Key Section ── */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-card-border pb-4">
            <div className="flex items-center gap-2">
              <KeyRound size={18} className="text-accent" />
              <h2 className="text-sm font-semibold text-text-primary">Personal Gemini API Key</h2>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-accent hover:underline flex items-center gap-1"
            >
              Get Free Key <ExternalLink size={12} />
            </a>
          </div>

          <p className="text-xs text-text-muted leading-relaxed">
            Your API key is private to your user account (<span className="text-text-primary font-mono">{user?.email}</span>) and is never shared with other users or team members.
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="user-api-key" className="text-xs font-medium text-text-secondary">
                Personal API Key
              </label>
              {hasKey && (
                <span className="text-[10px] text-success font-semibold px-2 py-0.5 rounded-full bg-success/10 border border-success/20 flex items-center gap-1">
                  <CheckCircle2 size={10} /> Key Configured (Personal)
                </span>
              )}
            </div>

            <div className="relative">
              <input
                id="user-api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasKey ? "•••••••••••••••••••••••• (Key set)" : "AIzaSy..."}
                className="w-full px-3 py-2 pr-10 text-xs bg-surface border border-card-border rounded-xl text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-text-muted hover:text-text-primary transition-colors"
                aria-label={showKey ? "Hide API key" : "Show API key"}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={Wifi}
                loading={testing}
                onClick={handleTestConnection}
              >
                Test Key Connection
              </Button>

              {hasKey && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={handleClearApiKey}
                >
                  Remove Key
                </Button>
              )}
            </div>
          </div>

          {/* Connection Test Result */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs leading-relaxed animate-slide-up ${
                testResult.success
                  ? "bg-success/10 border-success/30 text-success"
                  : "bg-danger/10 border-danger/30 text-danger"
              }`}
            >
              {testResult.success ? (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 size={14} /> Connection Verified ({testResult.model || aiModel})
                  </span>
                  <span className="text-[10px] text-text-muted">{testResult.latency_ms}ms response</span>
                </div>
              ) : (
                <div className="flex items-start gap-1.5 font-medium">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{testResult.error || "Connection failed. Please check key."}</span>
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* ── AI Model Configuration ── */}
        <GlassCard className="p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-card-border pb-4">
            <Sparkles size={18} className="text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">Model Configuration</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Model Selector */}
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="ai-model" className="text-xs font-medium text-text-secondary">Default AI Model</label>
              <select
                id="ai-model"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface border border-card-border rounded-xl text-text-primary focus:outline-none focus:border-accent"
              >
                {GEMINI_MODELS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-bg text-text-primary">
                    {m.label} — {m.desc}
                  </option>
                ))}
              </select>
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <label htmlFor="temp-slider" className="font-medium text-text-secondary flex items-center gap-1">
                  <Thermometer size={14} className="text-accent" /> Temperature
                </label>
                <span className="font-mono text-accent">{temperature}</span>
              </div>
              <input
                id="temp-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-accent cursor-pointer"
              />
              <p className="text-[10px] text-text-muted">Lower = predictable, Higher = creative</p>
            </div>

            {/* Top P */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <label htmlFor="top-p-slider" className="font-medium text-text-secondary flex items-center gap-1">
                  <Gauge size={14} className="text-accent" /> Top P
                </label>
                <span className="font-mono text-accent">{topP}</span>
              </div>
              <input
                id="top-p-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-full accent-accent cursor-pointer"
              />
              <p className="text-[10px] text-text-muted">Nucleus sampling threshold</p>
            </div>

            {/* Max Output Tokens */}
            <div className="space-y-2 sm:col-span-2">
              <div className="flex justify-between text-xs">
                <label htmlFor="max-tokens-slider" className="font-medium text-text-secondary flex items-center gap-1">
                  <Maximize2 size={14} className="text-accent" /> Max Tokens
                </label>
                <span className="font-mono text-accent">{maxTokens}</span>
              </div>
              <input
                id="max-tokens-slider"
                type="range"
                min="512"
                max="8192"
                step="256"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                className="w-full accent-accent cursor-pointer"
              />
              <p className="text-[10px] text-text-muted">Maximum token length generated per response</p>
            </div>
          </div>
        </GlassCard>

        {/* ── System Toggles ── */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-card-border pb-4">
            <RefreshCw size={18} className="text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">Execution Controls</h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-surface border border-card-border cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-text-primary block">Enable Live AI Calls</span>
                <span className="text-[10px] text-text-muted">Use live Gemini models for business audits</span>
              </div>
              <input
                type="checkbox"
                checked={enableAi}
                onChange={(e) => setEnableAi(e.target.checked)}
                className="w-4 h-4 rounded border-card-border accent-accent cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-surface border border-card-border cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-text-primary block">Rule Fallback Engine</span>
                <span className="text-[10px] text-text-muted">Automatically use rule analysis if API limits are reached</span>
              </div>
              <input
                type="checkbox"
                checked={enableFallback}
                onChange={(e) => setEnableFallback(e.target.checked)}
                className="w-4 h-4 rounded border-card-border accent-accent cursor-pointer"
              />
            </label>
          </div>
        </GlassCard>

        {/* Save Bar */}
        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" size="md" icon={Save} loading={saving}>
            Save All Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Settings as SettingsIcon, Sparkles, KeyRound, Save, CheckCircle2, Eye, EyeOff } from "lucide-react";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import GlassCard from "../components/ui/GlassCard";

const GEMINI_MODELS = [
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", desc: "Most capable — complex reasoning, long context" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "Fast, high quality — best for daily ops" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", desc: "Balanced speed & intelligence" },
  { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash-Lite", desc: "Fastest & cheapest — simple tasks" },
];

export default function SettingsPage() {
  const { company } = useAuth();

  const [aiModel, setAiModel] = useState("gemini-2.0-flash-lite");
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingModel, setSavingModel] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [modelSaved, setModelSaved] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Load AI model preference
        const { data: settings } = await supabase
          .from("company_settings")
          .select("ai_model, ai_provider")
          .eq("company_id", company?.id)
          .maybeSingle();

        if (!cancelled && settings?.ai_model) {
          setAiModel(settings.ai_model);
        }

        // Load whether an API key exists (never reveal the key itself)
        const { data: keyData, error: keyError } = await supabase.functions.invoke("manage-secrets", {
          body: { action: "get", secret_name: "gemini_api_key" },
        });
        if (!cancelled && !keyError && keyData?.exists) setHasKey(true);
      } catch {
        // Non-fatal — user can still save a new key
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [company?.id]);

  const handleSaveModel = async (e: FormEvent) => {
    e.preventDefault();
    setSavingModel(true);
    setModelSaved(false);
    setError(null);
    try {
      const { error: err } = await supabase
        .from("company_settings")
        .update({ ai_model: aiModel })
        .eq("company_id", company?.id);
      if (err) throw err;
      setModelSaved(true);
      setTimeout(() => setModelSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save model preference.");
    } finally {
      setSavingModel(false);
    }
  };

  const handleSaveKey = async (e: FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError("Paste your Gemini API key to save it.");
      return;
    }
    setSavingKey(true);
    setKeySaved(false);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("manage-secrets", {
        body: {
          action: "set",
          secret_name: "gemini_api_key",
          value: apiKey.trim(),
        },
      });
      if (fnError) throw new Error(fnError.message || "Failed to save API key");
      if (data?.error) throw new Error(data.error);

      setHasKey(true);
      setApiKey("");
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save API key.");
    } finally {
      setSavingKey(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure your AI assistant and integrations"
        icon={SettingsIcon}
      />

      {loading ? (
        <div className="text-sm text-text-muted animate-pulse">Loading settings…</div>
      ) : (
        <div className="max-w-2xl space-y-6">
          {/* AI model selection */}
          <GlassCard>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                <Sparkles size={20} className="text-accent" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text-primary">AI Model</h2>
                <p className="text-xs text-text-muted">
                  Choose which Gemini model powers your AI assistant
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveModel} className="space-y-4">
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

              <Button type="submit" variant="primary" loading={savingModel} icon={Save}>
                Save Model
              </Button>
              {modelSaved && (
                <span className="ml-3 text-xs text-success animate-fade-in">
                  <CheckCircle2 size={14} className="inline mr-1" />
                  Model saved
                </span>
              )}
            </form>
          </GlassCard>

          {/* Gemini API key */}
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
                <label className="text-xs font-medium text-text-secondary" htmlFor="apiKey">
                  API key
                </label>
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
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    Google AI Studio
                  </a>
                  {" "}— your key never leaves our encrypted storage.
                </p>
              </div>

              <Button type="submit" variant="primary" loading={savingKey} icon={Save}>
                {hasKey ? "Update Key" : "Save Key"}
              </Button>
              {keySaved && (
                <span className="ml-3 text-xs text-success animate-fade-in">
                  <CheckCircle2 size={14} className="inline mr-1" />
                  API key saved securely
                </span>
              )}
            </form>
          </GlassCard>

          {error && (
            <div
              role="alert"
              className="px-3 py-2.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs"
            >
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
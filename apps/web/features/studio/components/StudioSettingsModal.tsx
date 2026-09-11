"use client";

import { useState, useEffect } from "react";
import { Key, Shield, Check, Trash2, X, Plus, ExternalLink, RefreshCw } from "lucide-react";
import { getSupabaseClient } from "@/shared/supabase/client";

interface StudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CredentialSummary {
  id: string;
  provider: string;
  label: string;
  maskedKey: string;
  createdAt: string;
}

export function StudioSettingsModal({ isOpen, onClose }: StudioSettingsModalProps) {
  const [credentials, setCredentials] = useState<CredentialSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState<"openrouter" | "anthropic" | "openai" | "groq">("openrouter");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getAuthHeaders = async (): Promise<HeadersInit> => {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        return {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };
      }
    } catch (e) {
      console.warn("Failed to get supabase session token:", e);
    }
    return {
      "Content-Type": "application/json",
    };
  };

  const fetchCredentials = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/studio/credentials", { headers });
      if (res.ok) {
        const data = await res.json();
        setCredentials(data.credentials || []);
      }
    } catch (err) {
      console.error("Failed to load credentials:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCredentials();
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/studio/credentials", {
        method: "POST",
        headers,
        body: JSON.stringify({
          provider,
          label: label.trim() || `${provider.toUpperCase()} Key`,
          apiKey: apiKey.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to store key");
      }

      setApiKey("");
      setLabel("");
      setSuccessMsg("API key encrypted and saved securely to vault!");
      await fetchCredentials();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save key");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="flex w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-[#0f111a] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex h-13 shrink-0 items-center justify-between border-b border-white/[0.08] px-4 bg-[#141724]">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">
              <Key size={14} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">AI Provider Keys & Vault</h3>
              <p className="text-[10px] text-white/50">Server-side AES-256-GCM encrypted BYOK vault</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Add Key Form */}
          <form onSubmit={handleSave} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Add Provider API Key</span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <Shield size={10} /> Encrypted at rest
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono text-white/50 block mb-1">Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as any)}
                  className="w-full h-8 rounded-lg bg-black/50 border border-white/10 px-2 text-xs text-white outline-none focus:border-orange-500"
                >
                  <option value="openrouter">OpenRouter</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="groq">Groq</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-white/50 block mb-1">Label (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Personal Key"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full h-8 rounded-lg bg-black/50 border border-white/10 px-2 text-xs text-white outline-none focus:border-orange-500 placeholder-white/30"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-white/50 block mb-1">API Key Secret</label>
              <input
                type="password"
                placeholder={
                  provider === "openrouter"
                    ? "sk-or-v1-..."
                    : provider === "anthropic"
                    ? "sk-ant-api..."
                    : "sk-proj-..."
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full h-8 rounded-lg bg-black/50 border border-white/10 px-2.5 text-xs font-mono text-white outline-none focus:border-orange-500 placeholder-white/30"
              />
            </div>

            {successMsg && (
              <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-1.5 font-mono">
                <Check size={12} />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={!apiKey.trim() || saving}
              className="w-full h-8 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium text-xs shadow-md hover:brightness-110 active:scale-[0.99] disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
            >
              {saving ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={13} />}
              <span>Save & Encrypt Key</span>
            </button>
          </form>

          {/* Active Vault Keys List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">Your Saved Keys</span>
              <span className="text-[10px] text-white/40">{credentials.length} configured</span>
            </div>

            {loading ? (
              <div className="p-4 text-center text-xs font-mono text-white/40">Loading keys...</div>
            ) : credentials.length === 0 ? (
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] text-center text-xs text-white/40 font-mono">
                No custom API keys registered. Corvus default platform routing will be used.
              </div>
            ) : (
              <div className="space-y-2">
                {credentials.map((cred) => (
                  <div
                    key={cred.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-white/10 bg-white/[0.03]"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white">{cred.label}</span>
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-white/10 text-orange-400">
                          {cred.provider}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-white/40 mt-0.5">{cred.maskedKey}</div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                        <Check size={11} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Cpu,
  Globe,
  Sliders,
} from "lucide-react";
import { cn } from "@corvus/ui";
import { useToastStore } from "@/shared/stores/toast-store";

interface ModIncident {
  id: string;
  actor_user_id: string;
  action: string;
  category: string;
  entity_type: string;
  entity_id: string;
  metadata: {
    flagged_content?: string;
    normalized_text?: string;
    category?: string;
    severity?: number;
    confidence?: number;
    reason?: string;
    language?: string;
    script?: string;
    is_code_switched?: boolean;
    evasion_detected?: boolean;
    model_used?: string;
    author_name?: string;
    appeal?: {
      user_id: string;
      user_name: string;
      reason: string;
      status: string;
    };
    moderator_review?: {
      reviewer_name: string;
      decision: string;
      reviewed_at: string;
      overturned?: boolean;
    };
  };
  created_at: string;
}

const COMMUNITY_RULES = [
  { id: "r1", name: "No Harassment & Slurs", description: "Zero tolerance for hate speech, targeted attacks, or racial/sexual slurs in all languages.", severity: "Level 3 Critical", enabled: true },
  { id: "r2", name: "Anti-Spam & Burst Protection", description: "Enforces rate limiting, prevents repeated identical messages, and protects against raids.", severity: "Level 2 Serious", enabled: true },
  { id: "r3", name: "Protected @all / @here Mentions", description: "Restricts mass notification broadcasts to Lead & Admin hierarchy roles.", severity: "Level 1 Minor", enabled: true },
  { id: "r4", name: "Multilingual Evasion Resistance", description: "Detects spaced out, leetspeak, or obfuscated toxic keywords across Devanagari, Hinglish & regional scripts.", severity: "Level 2 Serious", enabled: true },
];

export default function AdminSecurity() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalIncidents: 0,
    warningsIssued: 0,
    escalations: 0,
    appeals: 0,
    overturned: 0,
    falsePositiveRate: "0.0%",
  });
  const [incidents, setIncidents] = useState<ModIncident[]>([]);
  const [languageCounts, setLanguageCounts] = useState<Record<string, number>>({});
  const [filterLang, setFilterLang] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchTelemetry = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/moderation/stats");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics || metrics);
        setIncidents(data.recentIncidents || []);
        setLanguageCounts(data.languageCounts || {});
      }
    } catch (err) {
      console.warn("Failed to load telemetry", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  const handleDecision = async (logId: string, decision: "overturn" | "confirm" | "dismiss") => {
    try {
      setProcessingId(logId);
      const res = await fetch("/api/moderation/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId, decision }),
      });
      if (res.ok) {
        useToastStore.getState().addToast({
          title: "Decision Recorded",
          body: `Incident successfully ${decision === "overturn" ? "overturned" : "reviewed"}.`,
          variant: "success",
        });
        fetchTelemetry();
      }
    } catch {
      useToastStore.getState().addToast({
        title: "Action Failed",
        body: "Could not record moderator decision.",
        variant: "error",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (filterLang === "all") return true;
    return (inc.metadata?.language || "en") === filterLang;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[26px] font-bold text-text-primary tracking-tight">
              AI Sentinel Governance & Security
            </h1>
            <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              NVIDIA NEMOTRON ACTIVE
            </span>
          </div>
          <p className="mt-1 text-[13px] text-text-muted">
            Autonomous multi-layered community safety, evasion resistance, and multilingual policy enforcement.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchTelemetry}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-text-primary transition-all hover:bg-white/[0.08] active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={13} className={cn(loading && "animate-spin")} />
          Sync Sentinel Telemetry
        </button>
      </div>

      {/* Model Architecture Info */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c0c]/80 p-4 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Safety Scanner
            </span>
            <ShieldCheck size={16} className="text-emerald-400" />
          </div>
          <div className="mt-2 font-mono text-[13px] font-bold text-text-primary">
            nemotron-3.5-content-safety
          </div>
          <div className="mt-1 text-[11px] text-text-muted">
            Zero-latency pre/post message moderation
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c0c]/80 p-4 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Governance Brain
            </span>
            <Cpu size={16} className="text-accent" />
          </div>
          <div className="mt-2 font-mono text-[13px] font-bold text-text-primary">
            nemotron-3.5-lightning
          </div>
          <div className="mt-1 text-[11px] text-text-muted">
            On-demand @Corvus brain & summarizer
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c0c]/80 p-4 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Omni Vision Ready
            </span>
            <Zap size={16} className="text-amber-400" />
          </div>
          <div className="mt-2 font-mono text-[13px] font-bold text-text-primary">
            nemotron-3-nano-omni
          </div>
          <div className="mt-1 text-[11px] text-text-muted">
            Multimodal media & attachment scanner
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c0c]/80 p-4 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Knowledge Memory
            </span>
            <Globe size={16} className="text-sky-400" />
          </div>
          <div className="mt-2 font-mono text-[13px] font-bold text-text-primary">
            nemotron-3-embed-1b
          </div>
          <div className="mt-1 text-[11px] text-text-muted">
            Rules, FAQ & policy retrieval index
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
          <div className="text-[11px] font-mono uppercase text-text-muted">Incidents Prevented</div>
          <div className="mt-1.5 text-2xl font-bold text-text-primary">{metrics.totalIncidents}</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
          <div className="text-[11px] font-mono uppercase text-text-muted">Warnings Issued</div>
          <div className="mt-1.5 text-2xl font-bold text-amber-400">{metrics.warningsIssued}</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
          <div className="text-[11px] font-mono uppercase text-text-muted">Critical Escalations</div>
          <div className="mt-1.5 text-2xl font-bold text-rose-400">{metrics.escalations}</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
          <div className="text-[11px] font-mono uppercase text-text-muted">Pending Appeals</div>
          <div className="mt-1.5 text-2xl font-bold text-accent">{metrics.appeals}</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
          <div className="text-[11px] font-mono uppercase text-text-muted">Overturned / Dismissed</div>
          <div className="mt-1.5 text-2xl font-bold text-text-secondary">{metrics.overturned}</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
          <div className="text-[11px] font-mono uppercase text-text-muted">False Positive Rate</div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-400">{metrics.falsePositiveRate}</div>
        </div>
      </div>

      {/* Community Rules Engine */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c0c]/80 p-5 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Sliders size={17} className="text-accent" />
          <h2 className="text-base font-bold text-text-primary">Configured Governance Rules</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {COMMUNITY_RULES.map((rule) => (
            <div
              key={rule.id}
              className="flex items-start justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-text-primary">{rule.name}</span>
                  <span className="font-mono text-[10px] rounded bg-white/[0.06] px-1.5 py-0.5 text-text-muted">
                    {rule.severity}
                  </span>
                </div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-text-muted">{rule.description}</p>
              </div>
              <span className="flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-400">
                <CheckCircle2 size={13} /> ACTIVE
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Incidents & Moderation Log */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c0c]/80 p-5 backdrop-blur-xl shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert size={17} className="text-rose-400" />
            <h2 className="text-base font-bold text-text-primary">Recent Flagged Incidents & Appeals</h2>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {["all", "en", "hi", "hinglish", "ur", "bn", "ta"].map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setFilterLang(lang)}
                className={cn(
                  "h-7 rounded-lg px-2.5 font-mono text-[11px] transition-all",
                  filterLang === lang
                    ? "bg-accent text-on-accent font-bold"
                    : "bg-white/[0.04] text-text-muted hover:bg-white/[0.08] hover:text-text-primary"
                )}
              >
                {lang.toUpperCase()} {languageCounts[lang] ? `(${languageCounts[lang]})` : ""}
              </button>
            ))}
          </div>
        </div>

        {filteredIncidents.length === 0 ? (
          <div className="py-12 text-center">
            <ShieldCheck size={32} className="mx-auto text-emerald-400/60 mb-2" />
            <p className="text-[13px] font-medium text-text-primary">All Clear · No Unresolved Violations</p>
            <p className="text-[11px] text-text-muted mt-0.5">
              The NVIDIA Nemotron Sentinel is continuously scanning active channels.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06] overflow-x-auto">
            {filteredIncidents.map((incident) => {
              const meta = incident.metadata || {};
              const severity = meta.severity ?? 2;
              const isOverturned = meta.moderator_review?.overturned;

              return (
                <div key={incident.id} className="py-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-text-primary">
                        @{meta.author_name || "Unknown Member"}
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase",
                          severity >= 3
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : severity >= 2
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                        )}
                      >
                        Level {severity} · {meta.category || "Harassment"}
                      </span>
                      <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
                        Lang: {meta.language?.toUpperCase() || "EN"} ({meta.script || "Latin"})
                      </span>
                      {meta.evasion_detected && (
                        <span className="rounded bg-rose-500/10 px-1.5 py-0.5 font-mono text-[10px] text-rose-400 border border-rose-500/20">
                          Evasion Detected
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-text-muted">
                      {new Date(incident.created_at).toLocaleTimeString()} · Conf:{" "}
                      {Math.round((meta.confidence || 0.95) * 100)}%
                    </span>
                  </div>

                  {/* Message Content & Reason */}
                  <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3">
                    <div className="font-mono text-[12px] text-rose-300">
                      &ldquo;{meta.flagged_content || "Flagged content"}&rdquo;
                    </div>
                    {meta.normalized_text && meta.normalized_text !== meta.flagged_content && (
                      <div className="mt-1 font-mono text-[10.5px] text-text-muted">
                        Normalized Form: {meta.normalized_text}
                      </div>
                    )}
                    <div className="mt-1.5 text-[11px] text-text-muted flex items-center gap-1.5">
                      <AlertTriangle size={12} className="text-amber-400 shrink-0" />
                      <span>{meta.reason || "Violated community standards"}</span>
                    </div>
                  </div>

                  {/* Appeal Notice if Present */}
                  {meta.appeal && (
                    <div className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-[12px]">
                      <span className="font-bold text-accent">Member Appeal:</span> &ldquo;{meta.appeal.reason}&rdquo;
                    </div>
                  )}

                  {/* Moderator Controls */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] text-text-muted font-mono">
                      {isOverturned ? (
                        <span className="text-emerald-400 font-semibold">
                          ✓ Overturned by {meta.moderator_review?.reviewer_name}
                        </span>
                      ) : meta.moderator_review ? (
                        <span className="text-text-secondary">
                          Confirmed by {meta.moderator_review?.reviewer_name}
                        </span>
                      ) : (
                        <span className="text-amber-400">Action Pending Review</span>
                      )}
                    </div>

                    {!isOverturned && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={processingId === incident.id}
                          onClick={() => handleDecision(incident.id, "overturn")}
                          className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-emerald-400 transition-all hover:bg-emerald-500/20 active:scale-95 disabled:opacity-50"
                        >
                          <CheckCircle2 size={12} /> Overturn (False Positive)
                        </button>
                        <button
                          type="button"
                          disabled={processingId === incident.id}
                          onClick={() => handleDecision(incident.id, "confirm")}
                          className="flex items-center gap-1 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-text-secondary transition-all hover:bg-white/[0.08] active:scale-95 disabled:opacity-50"
                        >
                          <XCircle size={12} /> Confirm Violation
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

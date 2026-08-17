"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@corvus/ui";
import {
  Plus,
  Trash2,
  Check,
  Sparkles,
  FolderGit2,
  GitPullRequest,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  Shield,
  Layers,
} from "lucide-react";
import {
  fetchSpaceAutomations,
  saveSpaceAutomations,
  fetchSpaceWebhooks,
  saveSpaceWebhooks,
  type AutomationRule,
} from "@/shared/lib/user-settings-supabase";

const TRIGGERS = [
  "PR opened",
  "PR merged",
  "CI failed",
  "Review requested",
  "PR approved",
  "Incident created",
  "Incident resolved",
  "Card moved",
  "Card created",
  "Message posted in channel",
  "User joins space",
];

const CONDITIONS = [
  "repository = aiic-platform",
  "repository = aiic-web",
  "branch = main",
  "column = In Progress",
  "severity = P0",
  "severity = P1",
  "team = Upper Pool (Core)",
  "team = Lower Pool (Engineering)",
  "label = priority:high",
  "author = lead",
];

const ACTIONS = [
  "Send channel message",
  "Move card to Done",
  "Move card to In Progress",
  "Create incident",
  "Notify team",
  "Create postmortem doc",
  "Create card",
  "Archive card",
  "Run webhook (POST to URL)",
];

/**
 * Automations — First-Class Space Rules Engine backed by persistent Supabase store.
 */
export function AutomationsSettings({ spaceId = "default" }: { spaceId?: string }) {
  const [rules, setRules] = useState<AutomationRule[]>([
    { id: "r1", trigger: "PR merged", action: "Move card to Done", condition: "column = In Progress", enabled: true },
    { id: "r2", trigger: "CI failed", action: "Create incident", condition: "severity = P0", enabled: true },
    { id: "r3", trigger: "Review requested", action: "Notify team", condition: "team = Upper Pool (Core)", enabled: true },
    { id: "r4", trigger: "Incident resolved", action: "Create postmortem doc", enabled: true },
  ]);
  const [building, setBuilding] = useState(false);
  const [trigger, setTrigger] = useState(TRIGGERS[0]);
  const [action, setAction] = useState(ACTIONS[0]);
  const [condition, setCondition] = useState("");

  useEffect(() => {
    fetchSpaceAutomations(spaceId).then((loaded) => {
      if (loaded && loaded.length > 0) setRules(loaded);
    });
  }, [spaceId]);

  const handleSaveRule = () => {
    const nextRules = [
      ...rules,
      {
        id: `rule_${Date.now()}`,
        trigger,
        action,
        condition: condition.trim() || undefined,
        enabled: true,
      },
    ];
    setRules(nextRules);
    saveSpaceAutomations(spaceId, nextRules);
    setBuilding(false);
    setCondition("");
  };

  const handleDeleteRule = (id: string) => {
    const nextRules = rules.filter((r) => r.id !== id);
    setRules(nextRules);
    saveSpaceAutomations(spaceId, nextRules);
  };

  return (
    <div className="mt-6 space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            Space Automation Engine
          </h2>
          <p className="text-[12px] text-text-secondary mt-0.5">
            Rules evaluate incoming GitHub webhooks, incident lifecycles, and Kanban board triggers in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/github"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.04] text-xs font-mono text-text-muted hover:text-text-primary transition-all"
          >
            <FolderGit2 size={13} className="text-accent" />
            <span>Admin Integration Matrix</span>
          </Link>

          <button
            type="button"
            onClick={() => setBuilding((v) => !v)}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-accent px-3 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-violet-bright active:scale-95"
          >
            <Plus size={14} /> New rule
          </button>
        </div>
      </div>

      {/* ─── Rule Builder ─── */}
      {building && (
        <div className="flex flex-col gap-3.5 rounded-2xl border border-accent/30 bg-[#121622] p-4 sm:p-5 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
              <Sparkles size={13} /> Construct Automation Rule
            </span>
            <span className="text-[11px] font-mono text-text-muted">WHEN → IF → THEN</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            {/* WHEN */}
            <div className="space-y-1">
              <Keyword>When (Trigger)</Keyword>
              <RuleSelect value={trigger} options={TRIGGERS} onChange={setTrigger} />
            </div>

            {/* IF */}
            <div className="space-y-1">
              <Keyword>If (Condition - Optional)</Keyword>
              <input
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="e.g. repository = web or column = In Progress"
                className="h-9 w-full rounded-md border border-border bg-surface-input px-3 text-xs text-text-primary outline-none focus:border-accent font-mono"
              />
            </div>

            {/* THEN */}
            <div className="space-y-1">
              <Keyword>Then (Action)</Keyword>
              <RuleSelect value={action} options={ACTIONS} onChange={setAction} />
            </div>
          </div>

          {/* Quick Condition Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-mono text-text-muted">
            <span>Quick presets:</span>
            {CONDITIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCondition(c)}
                className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-text-primary transition-all"
              >
                {c}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setBuilding(false)}
              className="h-8 rounded-md px-3 text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveRule}
              className="h-8 rounded-md bg-accent px-4 text-xs font-semibold text-on-accent transition-all hover:bg-accent-violet-bright shadow-sm"
            >
              Save Rule
            </button>
          </div>
        </div>
      )}

      {/* ─── Active Rules List ─── */}
      <div className="space-y-2">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised/40 hover:bg-surface-raised p-3.5 transition-all shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-text-primary">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded">
                WHEN
              </span>
              <strong className="text-text-primary font-semibold">{rule.trigger}</strong>

              {rule.condition ? (
                <>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted bg-white/[0.04] px-1.5 py-0.5 rounded">
                    IF
                  </span>
                  <code className="font-mono text-[11px] text-text-secondary px-2 py-0.5 rounded bg-black/40 border border-white/[0.06]">
                    {rule.condition}
                  </code>
                </>
              ) : (
                <span className="font-mono text-[10px] text-text-muted/60">—</span>
              )}

              <ArrowRight size={13} className="text-text-muted" />

              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                THEN
              </span>
              <span className="font-semibold text-emerald-400">{rule.action}</span>
            </div>

            <button
              type="button"
              aria-label="Delete rule"
              onClick={() => handleDeleteRule(rule.id)}
              className="text-text-muted hover:text-danger p-1 rounded transition-colors self-end sm:self-center opacity-70 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {rules.length === 0 && (
          <p className="py-6 text-center text-xs font-mono text-text-muted">
            No automation rules configured for this space yet.
          </p>
        )}
      </div>
    </div>
  );
}

function Keyword({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted block">
      {children}
    </span>
  );
}

function RuleSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-border bg-surface-input px-2 text-xs text-text-primary outline-none transition-colors focus:border-accent font-mono"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/**
 * Webhooks — lower-level automation/integration payload template configuration.
 */
export function WebhooksSettings({ spaceId = "default" }: { spaceId?: string }) {
  const [payload, setPayload] = useState(
    `{\n  "event": "{{event}}",\n  "channel": "{{channel}}",\n  "actor": "{{actor}}",\n  "url": "{{url}}"\n}`
  );
  const [outboundUrl, setOutboundUrl] = useState("");
  const [method, setMethod] = useState("POST");
  const [inboundToken, setInboundToken] = useState(`whk_${spaceId.slice(0, 8)}`);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSpaceWebhooks(spaceId).then((wh) => {
      if (wh) {
        if (wh.payloadTemplate) setPayload(wh.payloadTemplate);
        if (wh.outboundUrl) setOutboundUrl(wh.outboundUrl);
        if (wh.method) setMethod(wh.method);
        if (wh.inboundToken) setInboundToken(wh.inboundToken);
      }
    });
  }, [spaceId]);

  const handleSave = () => {
    saveSpaceWebhooks(spaceId, {
      inboundToken,
      outboundUrl,
      method,
      payloadTemplate: payload,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div>
        <SettingLabel>Inbound webhook endpoint</SettingLabel>
        <p className="mt-1 text-[12px] text-text-muted">
          POST JSON here — it routes to a channel as a formatted event.
        </p>
        <code className="mt-2 block truncate rounded-md border border-border bg-surface-raised px-3 py-2.5 font-mono text-[12px] text-text-secondary">
          https://aiic-bbs.vercel.app/api/hooks/{spaceId}/{inboundToken}
        </code>
      </div>

      <div>
        <SettingLabel>Outbound payload template</SettingLabel>
        <p className="mt-1 text-[12px] text-text-muted">
          Sent by “Run webhook” actions. Raw JSON with {"{{variable}}"} interpolation.
        </p>
        <textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          rows={7}
          spellCheck={false}
          className="mt-2 w-full resize-y rounded-md border border-border bg-surface-input p-3 font-mono text-[12px] leading-[1.6] text-text-primary outline-none transition-colors focus:border-border-active"
        />
      </div>

      <div className="grid grid-cols-[1fr_120px] gap-3">
        <div>
          <SettingLabel>URL</SettingLabel>
          <input
            value={outboundUrl}
            onChange={(e) => setOutboundUrl(e.target.value)}
            placeholder="https://example.com/hook"
            className="mt-2 h-9 w-full rounded-md border border-border bg-surface-input px-3 font-mono text-[12px] text-text-primary outline-none transition-colors placeholder:text-text-faint focus:border-border-active"
          />
        </div>
        <div>
          <SettingLabel>Method</SettingLabel>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="mt-2 h-9 w-full rounded-md border border-border bg-surface-input px-2 font-mono text-[12px] text-text-primary outline-none"
          >
            <option>POST</option>
            <option>PUT</option>
          </select>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={handleSave}
          className="h-9 rounded-md bg-accent px-4 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-violet-bright"
        >
          {saved ? "Saved to Supabase" : "Save Webhook Settings"}
        </button>
      </div>
    </div>
  );
}

function SettingLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className={cn("font-mono text-[12px] uppercase tracking-[0.08em] text-text-secondary")}>
      {children}
    </p>
  );
}

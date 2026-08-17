"use client";

import { useState } from "react";
import { cn } from "@corvus/ui";
import { PanelRight } from "lucide-react";
import { Avatar, ChannelGlyph } from "@/shared/components/ui";
import type { Attachment, ChatMessage, IncidentMeta, IncidentStatus, MemberRef } from "./types";
import { Composer } from "./Composer";
import { MessageFeed } from "./MessageFeed";

const STATUS_TONE: Record<IncidentStatus, string> = {
  active: "text-danger border-danger",
  monitoring: "text-warning border-warning",
  resolved: "text-success border-success",
};

const STATUS_ORDER: IncidentStatus[] = ["active", "monitoring", "resolved"];
const SEVERITIES: IncidentMeta["severity"][] = ["P0", "P1", "P2", "P3"];

const stamp = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/**
 * Incident channel (brief §Incidents) — a structured channel type for
 * engineering incidents. Replaces the standard channel header and uses the
 * Thread Panel slot for the incident sidebar.
 */
export function IncidentView({
  channelName,
  incident,
  messages,
  me,
  onUpdate,
  onSend,
  onBack,
}: {
  channelName: string;
  incident: IncidentMeta;
  messages: ChatMessage[];
  /** Current user — for claiming command. */
  me?: MemberRef;
  /** Persist incident changes (status, severity, commander, timeline). */
  onUpdate?: (incident: IncidentMeta) => void;
  onSend?: (text: string, attachments?: Attachment[]) => void;
  onBack?: () => void;
}) {
  const [showSidebar, setShowSidebar] = useState(true);

  const addTimeline = (text: string, patch?: Partial<IncidentMeta>) =>
    onUpdate?.({
      ...incident,
      ...patch,
      timeline: [...incident.timeline, { at: stamp(), text }],
    });

  const setStatus = (status: IncidentStatus) => {
    if (status === incident.status) return;
    addTimeline(`Status → ${status}`, { status });
  };

  return (
    <div className="relative flex h-full min-h-0 min-w-0 w-full flex-1 overflow-hidden bg-[#0b0e14]">
      <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* ─── Floating Glass Header ─── */}
        <div className="relative z-10 px-3 pt-3 sm:px-4 sm:pt-4">
          <header className="flex h-13 shrink-0 items-center gap-2 sm:gap-3 rounded-[20px] border border-white/[0.08] bg-[#121722]/75 px-4 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.08)]">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back to channels"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-white/[0.06] hover:text-text-primary active:scale-95 transition-all md:hidden"
              >
                ←
              </button>
            )}
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-danger/15 border border-danger/30 text-danger shrink-0">
              <ChannelGlyph type="incident" size={15} />
            </div>
            <h1 className="truncate text-[14.5px] font-bold text-danger">{channelName}</h1>
            <StatusPill status={incident.status} />
            <span className="hidden font-mono text-[10.5px] uppercase font-bold tracking-wider text-accent sm:inline bg-accent/15 border border-accent/30 rounded-lg px-2 py-0.5">
              {incident.severity}
            </span>
            <span className="hidden font-mono text-[11px] text-text-muted md:inline">{incident.duration}</span>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              {incident.status !== "resolved" && (
                <button
                  type="button"
                  onClick={() => setStatus("resolved")}
                  className="flex h-8 items-center rounded-xl border border-success/40 bg-success/15 px-3 font-mono text-[11.5px] font-bold text-success transition-all hover:bg-success/25 active:scale-95"
                >
                  Resolve
                </button>
              )}
              <button
                type="button"
                aria-label="Toggle incident sidebar"
                onClick={() => setShowSidebar((v) => !v)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-all active:scale-95",
                  showSidebar ? "text-text-primary bg-white/[0.08] border border-white/[0.1]" : "text-text-muted hover:text-text-primary hover:bg-white/[0.04]"
                )}
              >
                <PanelRight size={16} />
              </button>
            </div>
          </header>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto py-4">
          {/* Auto-generated timeline entries as system lines */}
          {incident.timeline.slice(0, 2).map((entry, i) => (
            <TimelineLine key={i} at={entry.at} text={entry.text} active={incident.status === "active"} />
          ))}
          <MessageFeed messages={messages} />
        </div>

        <Composer channelName={channelName} onSend={onSend} />
      </section>

      {showSidebar && (
        <IncidentSidebar
          incident={incident}
          me={me}
          onSetStatus={setStatus}
          onSetSeverity={(severity) =>
            severity !== incident.severity && addTimeline(`Severity → ${severity}`, { severity })
          }
          onClaimCommand={() =>
            me && addTimeline(`${me.name} took incident command`, { commander: me })
          }
          onPostUpdate={(text) => addTimeline(text)}
          onClose={() => setShowSidebar(false)}
        />
      )}
    </div>
  );
}

function StatusPill({ status }: { status: IncidentStatus }) {
  return (
    <span
      data-status={status}
      className={cn(
        "flex h-5 items-center rounded-[3px] border px-2 font-mono text-[10px] uppercase tracking-[0.06em]",
        STATUS_TONE[status]
      )}
    >
      {status}
    </span>
  );
}

/** System line in the feed — github-event styling with an error border while active. */
function TimelineLine({ at, text, active }: { at: string; text: string; active: boolean }) {
  return (
    <div
      className={cn(
        "mx-4 my-0.5 rounded-r-sm border-l-2 py-1 pl-8 pr-4 font-mono text-[12px] text-text-muted",
        active ? "border-danger/60" : "border-border"
      )}
    >
      {text}
      {"  ·  "}
      <span className="text-text-faint">{at}</span>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[88px] shrink-0 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

function IncidentSidebar({
  incident,
  me,
  onSetStatus,
  onSetSeverity,
  onClaimCommand,
  onPostUpdate,
  onClose,
}: {
  incident: IncidentMeta;
  me?: MemberRef;
  onSetStatus: (status: IncidentStatus) => void;
  onSetSeverity: (severity: IncidentMeta["severity"]) => void;
  onClaimCommand: () => void;
  onPostUpdate: (text: string) => void;
  onClose: () => void;
}) {
  const [update, setUpdate] = useState("");
  const postUpdate = () => {
    if (!update.trim()) return;
    onPostUpdate(update.trim());
    setUpdate("");
  };

  return (
    <aside className="absolute inset-y-0 right-0 z-20 flex h-full w-full max-w-full shrink-0 flex-col overflow-y-auto border-l border-border bg-surface-overlay sm:static sm:w-[300px] md:w-[340px] lg:w-[360px] sm:bg-surface-raised">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">Incident</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-[12px] text-text-faint transition-colors hover:bg-hover-row hover:text-text-primary"
        >
          Close
        </button>
      </div>

      <div className="flex flex-col gap-5 p-4">
        <Row label="Status">
          <span className="flex flex-wrap gap-1.5">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={incident.status === s}
                onClick={() => onSetStatus(s)}
                className={cn(
                  "flex h-5 items-center rounded-[3px] border px-2 font-mono text-[10px] uppercase tracking-[0.06em] transition-colors",
                  incident.status === s
                    ? STATUS_TONE[s]
                    : "border-border text-text-muted hover:border-border-active hover:text-text-secondary"
                )}
              >
                {s}
              </button>
            ))}
          </span>
        </Row>
        <Row label="Severity">
          <span className="flex flex-wrap gap-1.5">
            {SEVERITIES.map((sev) => (
              <button
                key={sev}
                type="button"
                aria-pressed={incident.severity === sev}
                onClick={() => onSetSeverity(sev)}
                className={cn(
                  "flex h-5 items-center rounded-[3px] border px-2 font-mono text-[10px] tracking-[0.06em] transition-colors",
                  incident.severity === sev
                    ? "border-danger/50 bg-danger/10 text-danger"
                    : "border-border text-text-muted hover:border-border-active hover:text-text-secondary"
                )}
              >
                {sev}
              </button>
            ))}
          </span>
        </Row>
        <Row label="Commander">
          {incident.commander ? (
            <span className="flex items-center gap-2">
              <Avatar size={20} radius={4} src={incident.commander.avatar} name={incident.commander.name} />
              <span className="text-[13px] text-text-primary">{incident.commander.name}</span>
            </span>
          ) : me ? (
            <button
              type="button"
              onClick={onClaimCommand}
              className="h-6 rounded-md border border-border px-2.5 text-[12px] text-text-secondary transition-colors hover:border-border-active hover:text-text-primary"
            >
              Take command
            </button>
          ) : (
            <span className="text-[13px] text-text-faint">Unassigned</span>
          )}
        </Row>
        <Row label="Affected">
          <span className="flex flex-wrap gap-1.5">
            {incident.services.length === 0 && (
              <span className="text-[13px] text-text-faint">None recorded</span>
            )}
            {incident.services.map((s) => (
              <span
                key={s}
                className="rounded-[3px] border border-border px-[5px] py-px font-mono text-[10px] uppercase tracking-[0.06em] text-text-secondary"
              >
                {s}
              </span>
            ))}
          </span>
        </Row>

        <hr className="border-border" />

        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">Timeline</p>
          <div className="mt-3 flex flex-col gap-2.5">
            {incident.timeline.map((entry, i) => (
              <div key={i} className="flex gap-3">
                <span className="shrink-0 font-mono text-[11px] text-text-faint">{entry.at}</span>
                <span className="text-[12px] leading-[1.5] text-text-secondary">{entry.text}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-input px-2">
            <input
              value={update}
              onChange={(e) => setUpdate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") postUpdate();
              }}
              placeholder="Post a timeline update…"
              className="w-full bg-transparent text-[12px] text-text-primary outline-none placeholder:text-text-faint"
            />
          </div>
        </div>

        <hr className="border-border" />

        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">Postmortem</p>
          <p className="mt-2 text-[13px] text-text-muted">
            {incident.status === "resolved"
              ? "↗ Postmortem doc created."
              : "A postmortem doc is created automatically on resolve."}
          </p>
        </div>
      </div>
    </aside>
  );
}

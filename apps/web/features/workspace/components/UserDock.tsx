"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@corvus/ui";
import { Mic, MicOff, Headphones, VolumeX, Settings, AudioLines, Check, X } from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import {
  NOISE_SUPPRESSION_LEVELS,
  getNoiseSuppressionLevel,
  onNoiseSuppressionChange,
  setNoiseSuppressionLevel,
  type NoiseSuppressionLevel,
} from "@/shared/lib/noise-suppression";
import type { MemberRef, Presence } from "./types";

const PRESENCE_DOT: Record<Presence, string> = {
  online: "bg-status-online shadow-[0_0_8px_rgba(34,197,94,0.6)]",
  idle: "bg-status-idle shadow-[0_0_8px_rgba(245,158,11,0.6)]",
  dnd: "bg-status-dnd shadow-[0_0_8px_rgba(239,68,68,0.6)]",
  offline: "bg-text-faint",
};

const PRESENCE_OPTIONS: { id: Presence; label: string; hint?: string }[] = [
  { id: "online", label: "Online" },
  { id: "idle", label: "Idle" },
  { id: "dnd", label: "Do not disturb", hint: "Mutes notifications" },
  { id: "offline", label: "Invisible", hint: "Appear offline" },
];

/**
 * Premium Personal Glass Dock (Floating Capsule & Liquid Status Card).
 */
export function UserDock({
  me,
  muted,
  deafened,
  onToggleMute,
  onToggleDeafen,
  onOpenSettings,
  onSetStatus,
}: {
  me: MemberRef & { statusText?: string };
  muted?: boolean;
  deafened?: boolean;
  onToggleMute?: () => void;
  onToggleDeafen?: () => void;
  onOpenSettings?: () => void;
  /** Presence + custom status — applied across the whole app, live. */
  onSetStatus?: (presence: Presence, text?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(
    me.statusText && me.statusText !== me.presence ? me.statusText : ""
  );
  const [nsLevel, setNsLevel] = useState<NoiseSuppressionLevel>("standard");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNsLevel(getNoiseSuppressionLevel());
    return onNoiseSuppressionChange(setNsLevel);
  }, []);

  // Click-outside closes the status card.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const presence = me.presence ?? "online";
  const saveStatusText = (text: string) => onSetStatus?.(presence, text || undefined);

  return (
    <div ref={ref} className="relative shrink-0 p-2 sm:p-2.5">
      {/* ─── Floating Liquid Glass Status Panel ─── */}
      {open && (
        <div
          className="absolute bottom-full left-2 right-2 z-50 mb-2 rounded-[22px] border border-white/[0.12] bg-[#141926]/95 p-4 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] animate-in fade-in zoom-in-95 duration-150"
        >
          {/* User Header */}
          <div className="flex items-center gap-3 border-b border-white/[0.08] pb-3.5">
            <div className="relative">
              <div className="rounded-full ring-2 ring-white/10 ring-offset-1 ring-offset-black/40">
                <Avatar src={me.avatar} name={me.name} size={40} shape="circle" />
              </div>
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#141926]",
                  PRESENCE_DOT[presence]
                )}
              />
            </div>

            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[14.5px] font-bold text-text-primary">{me.name}</p>
              <p className="truncate font-mono text-[11px] text-accent mt-0.5">
                {me.statusText ?? presence}
              </p>
            </div>
          </div>

          {/* Presence Options */}
          <p className="pb-1.5 pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted/80">
            Status Presence
          </p>
          <div className="flex flex-col gap-0.5">
            {PRESENCE_OPTIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={presence === p.id}
                onClick={() => onSetStatus?.(p.id, draft || undefined)}
                className={cn(
                  "flex h-8 items-center gap-2.5 rounded-xl px-2.5 text-left transition-all active:scale-[0.98]",
                  presence === p.id
                    ? "bg-white/[0.08] text-text-primary font-semibold border border-white/[0.06]"
                    : "hover:bg-white/[0.04] text-text-secondary hover:text-text-primary"
                )}
              >
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", PRESENCE_DOT[p.id])} />
                <span className="flex-1 text-[13px]">{p.label}</span>
                {p.hint && (
                  <span className="font-mono text-[10px] text-text-muted">{p.hint}</span>
                )}
                {presence === p.id && <Check size={14} className="text-accent shrink-0" />}
              </button>
            ))}
          </div>

          {/* Custom status input */}
          <p className="pb-1.5 pt-3.5 font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted/80">
            Custom Status
          </p>
          <div className="flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-black/40 px-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveStatusText(draft.trim());
              }}
              onBlur={() => saveStatusText(draft.trim())}
              placeholder="What's happening?"
              className="w-full bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-muted/50"
            />
            {draft && (
              <button
                type="button"
                aria-label="Clear status"
                onClick={() => {
                  setDraft("");
                  saveStatusText("");
                }}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Noise suppression selector */}
          <p className="flex items-center gap-1.5 pb-1.5 pt-3.5 font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted/80">
            <AudioLines size={12} className="text-accent" /> Noise Suppression
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {NOISE_SUPPRESSION_LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={nsLevel === l.id}
                onClick={() => setNoiseSuppressionLevel(l.id)}
                className={cn(
                  "h-7 rounded-lg border font-mono text-[11px] font-medium transition-all active:scale-95",
                  nsLevel === l.id
                    ? "border-accent/50 bg-accent/20 text-accent font-semibold shadow-sm"
                    : "border-white/[0.06] bg-white/[0.02] text-text-muted hover:bg-white/[0.05] hover:text-text-primary"
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Floating Glass Capsule Dock Bar ─── */}
      <div className="flex h-[58px] items-center justify-between rounded-[20px] border border-white/[0.08] bg-[#121622]/80 px-2.5 backdrop-blur-xl shadow-[0_6px_20px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]">
        <button
          type="button"
          aria-label="Set status"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1.5 py-1 text-left transition-all hover:bg-white/[0.06] active:scale-[0.98]"
        >
          <div className="relative shrink-0">
            <div className="rounded-full ring-1 ring-white/10 ring-offset-1 ring-offset-black/40">
              <Avatar src={me.avatar} name={me.name} size={32} shape="circle" />
            </div>
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#121622]",
                PRESENCE_DOT[presence]
              )}
            />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13.5px] font-semibold text-text-primary">
              {me.name}
            </div>
            <div className="truncate font-mono text-[10.5px] text-accent/90">
              {me.statusText ?? presence}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-0.5 text-text-muted">
          <DockIcon label={muted ? "Unmute" : "Mute"} active={muted} onClick={onToggleMute}>
            {muted ? <MicOff size={15} /> : <Mic size={15} />}
          </DockIcon>
          <DockIcon
            label={deafened ? "Undeafen" : "Deafen"}
            active={deafened}
            onClick={onToggleDeafen}
          >
            {deafened ? <VolumeX size={15} /> : <Headphones size={15} />}
          </DockIcon>
          <DockIcon label="User settings" onClick={onOpenSettings}>
            <Settings size={15} />
          </DockIcon>
        </div>
      </div>
    </div>
  );
}

function DockIcon({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg transition-all active:scale-95",
        active
          ? "bg-danger/20 text-danger"
          : "hover:bg-white/[0.08] hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}

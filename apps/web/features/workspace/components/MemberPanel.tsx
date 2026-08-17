"use client";

import { cn } from "@corvus/ui";
import { X } from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import type { MemberRef, Presence } from "./types";

const DOT: Record<Presence, string> = {
  online: "bg-status-online shadow-[0_0_6px_rgba(34,197,94,0.6)]",
  idle: "bg-status-idle shadow-[0_0_6px_rgba(245,158,11,0.6)]",
  dnd: "bg-status-dnd shadow-[0_0_6px_rgba(239,68,68,0.6)]",
  offline: "bg-text-faint",
};

/**
 * On-demand Member Panel (Premium Glass Sidebar).
 */
export function MemberPanel({
  members,
  onClose,
}: {
  members: MemberRef[];
  onClose?: () => void;
}) {
  const online = members.filter((m) => m.presence && m.presence !== "offline");
  const offline = members.filter((m) => !m.presence || m.presence === "offline");

  return (
    <aside className="absolute inset-0 z-30 flex h-full w-full shrink-0 flex-col bg-[#0e121a]/95 border-l border-white/[0.08] backdrop-blur-2xl shadow-2xl lg:static lg:w-[240px] lg:bg-[#0e121a]/85 lg:backdrop-blur-xl">
      <header className="flex h-13 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
        <span className="text-[14px] font-bold text-text-primary">Space Members</span>
        <button
          type="button"
          aria-label="Close members"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-xl text-text-muted hover:bg-white/[0.06] hover:text-text-primary active:scale-95 transition-all"
        >
          <X size={15} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-2.5 py-3 scrollbar-thin scrollbar-thumb-white/10">
        <Group label={`Online — ${online.length}`} members={online} />
        {offline.length > 0 && <Group label={`Offline — ${offline.length}`} members={offline} dim />}
      </div>
    </aside>
  );
}

function Group({ label, members, dim }: { label: string; members: MemberRef[]; dim?: boolean }) {
  if (members.length === 0) return null;
  return (
    <div className="mb-4">
      <p className="px-2 pb-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-text-muted/80">
        {label}
      </p>
      <div className="space-y-0.5">
        {members.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-all hover:bg-white/[0.04] active:scale-[0.98]",
              dim && "opacity-60"
            )}
          >
            <div className="relative shrink-0">
              <div className="rounded-full ring-1 ring-white/10 ring-offset-1 ring-offset-black/40">
                <Avatar src={m.avatar} name={m.name} size={28} shape="circle" />
              </div>
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0e121a]",
                  DOT[m.presence ?? "offline"]
                )}
              />
            </div>
            <div className="flex min-w-0 items-center gap-1.5">
              {m.roleColor && (
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{ background: m.roleColor }}
                />
              )}
              <span className="truncate text-[13px] font-medium text-text-secondary">{m.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

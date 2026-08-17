"use client";

import { cn } from "@corvus/ui";
import { Search, Plus } from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import { ItemLink } from "./ItemLink";
import { UserDock } from "./UserDock";
import type { DMSummary, MemberRef, Presence } from "./types";

const DOT: Record<Presence, string> = {
  online: "bg-status-online shadow-[0_0_6px_rgba(34,197,94,0.6)]",
  idle: "bg-status-idle shadow-[0_0_6px_rgba(245,158,11,0.6)]",
  dnd: "bg-status-dnd shadow-[0_0_6px_rgba(239,68,68,0.6)]",
  offline: "bg-text-faint",
};

/**
 * DM panel (Premium Glass Direct Messages List).
 */
export function DMPanel({
  conversations,
  activeId,
  onSelect,
  onNewConversation,
  conversationHref,
  me,
  muted,
  deafened,
  onToggleMute,
  onToggleDeafen,
  onOpenSettings,
  onSetStatus,
}: {
  conversations: DMSummary[];
  activeId?: string;
  onSelect?: (id: string) => void;
  /** Open the new DM / group DM dialog. */
  onNewConversation?: () => void;
  /** Real href per conversation (routed shell) — rows render as anchors. */
  conversationHref?: (id: string) => string;
  /** Personal dock (same as the space sidebar). */
  me?: MemberRef & { statusText?: string };
  muted?: boolean;
  deafened?: boolean;
  onToggleMute?: () => void;
  onToggleDeafen?: () => void;
  onOpenSettings?: () => void;
  onSetStatus?: (presence: Presence, text?: string) => void;
}) {
  return (
    <aside className="flex h-full min-w-0 flex-1 md:flex-initial md:w-[244px] shrink-0 flex-col overflow-hidden bg-[#0e121a]/85 border-r border-white/[0.06] backdrop-blur-xl shadow-[inset_-1px_0_rgba(255,255,255,0.03)]">
      <div className="px-3.5 pb-2.5 pt-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[14.5px] font-bold text-text-primary">Direct Messages</h2>
          <button
            type="button"
            aria-label="New conversation"
            title="New DM or group"
            onClick={onNewConversation}
            className="flex h-7 w-7 items-center justify-center rounded-xl text-text-muted hover:bg-white/[0.06] hover:text-text-primary active:scale-95 transition-all"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-3 flex h-8.5 items-center gap-2 rounded-xl border border-white/[0.08] bg-black/40 px-2.5 backdrop-blur-md">
          <Search size={13} className="text-text-muted" />
          <input
            placeholder="Search conversations…"
            className="w-full bg-transparent text-[12.5px] text-text-primary outline-none placeholder:text-text-muted/60"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1.5 scrollbar-thin scrollbar-thumb-white/10">
        {conversations.map((c) => (
          <ItemLink
            key={c.id}
            href={conversationHref?.(c.id)}
            onPress={() => onSelect?.(c.id)}
            active={c.id === activeId}
            current={c.id === activeId}
            className={cn(
              "my-0.5 flex h-11 w-full items-center gap-2.5 rounded-xl px-2.5 transition-all duration-150 active:scale-[0.98]",
              c.id === activeId
                ? "border border-accent/30 bg-accent/15 text-text-primary font-semibold shadow-sm"
                : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
            )}
          >
            {c.group && c.group.length > 0 ? (
              <GroupStack members={c.group} />
            ) : (
              <div className="relative shrink-0">
                <div className="rounded-full ring-1 ring-white/10 ring-offset-1 ring-offset-black/40">
                  <Avatar src={c.avatar} name={c.name} size={30} shape="circle" />
                </div>
                {c.presence && (
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0e121a]",
                      DOT[c.presence]
                    )}
                  />
                )}
              </div>
            )}
            <span className="min-w-0 flex-1 truncate text-left text-[13.5px] font-medium text-text-primary">
              {c.name}
            </span>
            {c.unreadCount ? (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 font-mono text-[10px] font-bold text-on-accent shadow-sm">
                {c.unreadCount}
              </span>
            ) : c.lastLabel ? (
              <span className="font-mono text-[10px] text-text-muted">{c.lastLabel}</span>
            ) : null}
          </ItemLink>
        ))}
      </div>

      {me && (
        <UserDock
          me={me}
          muted={muted}
          deafened={deafened}
          onToggleMute={onToggleMute}
          onToggleDeafen={onToggleDeafen}
          onOpenSettings={onOpenSettings}
          onSetStatus={onSetStatus}
        />
      )}
    </aside>
  );
}

function GroupStack({ members }: { members: { id: string; name: string; avatar?: string | null }[] }) {
  return (
    <div className="flex w-7 shrink-0 items-center">
      {members.slice(0, 2).map((m, i) => (
        <div key={m.id} className={cn("rounded-full border-2 border-[#0e121a]", i > 0 && "-ml-2.5")}>
          <Avatar src={m.avatar} name={m.name} size={20} shape="circle" />
        </div>
      ))}
    </div>
  );
}

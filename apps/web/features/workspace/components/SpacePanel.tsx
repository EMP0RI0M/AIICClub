"use client";

import { useState } from "react";
import { cn } from "@corvus/ui";
import { ChevronDown, Plus } from "lucide-react";
import { Avatar, ChannelGlyph } from "@/shared/components/ui";
import { usePermissions } from "@/shared/lib/permissions";
import { ItemLink } from "./ItemLink";
import { UserDock } from "./UserDock";
import type { ChannelSection, ChannelSummary, MemberRef, Presence } from "./types";

/**
 * 260px Space Sidebar (Premium Glass Channel Panel).
 */
export function SpacePanel({
  spaceName,
  sections,
  activeChannelId,
  me,
  onSelectChannel,
  onOpenSpaceSettings,
  onAddChannel,
  onAddSection,
  channelHref,
  muted,
  deafened,
  onToggleMute,
  onToggleDeafen,
  onSetStatus,
}: {
  spaceName: string;
  sections: ChannelSection[];
  activeChannelId?: string;
  me: MemberRef & { statusText?: string };
  onSelectChannel?: (id: string) => void;
  onOpenSpaceSettings?: () => void;
  /** Open the add-channel dialog for a section. */
  onAddChannel?: (sectionId: string) => void;
  /** Open the add-section dialog. */
  onAddSection?: () => void;
  /** Real href per channel (routed shell) — rows render as anchors. */
  channelHref?: (id: string) => string;
  /** Self mute/deafen — carried into the next call you join. */
  muted?: boolean;
  deafened?: boolean;
  onToggleMute?: () => void;
  onToggleDeafen?: () => void;
  /** Presence + custom status from the dock's status card. */
  onSetStatus?: (presence: Presence, text?: string) => void;
}) {
  const { can } = usePermissions();
  const canManageSpace = can("SPACE_MANAGE_SETTINGS") || can("ORG_MANAGE_ROLES") || can("CHANNEL_CREATE_TEXT") || can("INVITE_CREATE") || can("SPACE_VIEW_AUDIT_LOGS");

  return (
    <aside className="flex h-full min-w-0 flex-1 md:flex-initial md:w-[244px] shrink-0 flex-col overflow-hidden bg-[#0e121a]/85 border-r border-white/[0.06] backdrop-blur-xl shadow-[inset_-1px_0_rgba(255,255,255,0.03)]">
      {/* Header */}
      {canManageSpace ? (
        <button
          type="button"
          onClick={onOpenSpaceSettings}
          className="flex h-13 shrink-0 items-center justify-between border-b border-white/[0.06] px-4 text-left transition-colors hover:bg-white/[0.04] active:scale-[0.99]"
        >
          <span className="truncate text-[14.5px] font-bold text-text-primary">{spaceName}</span>
          <ChevronDown size={15} className="text-text-muted" />
        </button>
      ) : (
        <div className="flex h-13 shrink-0 items-center border-b border-white/[0.06] px-4">
          <span className="truncate text-[14.5px] font-bold text-text-primary">{spaceName}</span>
        </div>
      )}

      {/* Channels */}
      <div className="flex-1 overflow-y-auto px-2 py-2.5 scrollbar-thin scrollbar-thumb-white/10">
        {sections.map((section) => (
          <Section
            key={section.id}
            section={section}
            activeChannelId={activeChannelId}
            onSelect={onSelectChannel}
            onAddChannel={can("CHANNEL_CREATE_TEXT") ? onAddChannel : undefined}
            hrefFor={channelHref}
          />
        ))}
        {onAddSection && can("CHANNEL_MANAGE_CATEGORIES") && (
          <button
            type="button"
            onClick={onAddSection}
            className="mt-2 flex h-8 w-full items-center gap-2 rounded-xl px-2.5 text-[12.5px] font-medium text-text-muted transition-all hover:bg-white/[0.05] hover:text-text-primary active:scale-[0.98]"
          >
            <Plus size={13} />
            Add Section
          </button>
        )}
      </div>


      {/* Footer — personal dock */}
      <UserDock
        me={me}
        muted={muted}
        deafened={deafened}
        onToggleMute={onToggleMute}
        onToggleDeafen={onToggleDeafen}
        onOpenSettings={onOpenSpaceSettings}
        onSetStatus={onSetStatus}
      />
    </aside>
  );
}

function Section({
  section,
  activeChannelId,
  onSelect,
  onAddChannel,
  hrefFor,
}: {
  section: ChannelSection;
  activeChannelId?: string;
  onSelect?: (id: string) => void;
  onAddChannel?: (sectionId: string) => void;
  hrefFor?: (id: string) => string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="mb-1.5">
      <div className="group flex items-center justify-between px-2 pb-1 pt-3">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-text-muted/80 transition-colors hover:text-text-primary"
        >
          {section.name}
        </button>
        <button
          type="button"
          aria-label={`Add channel to ${section.name}`}
          title="Add channel"
          onClick={() => onAddChannel?.(section.id)}
          className="text-text-muted opacity-0 transition-opacity hover:text-text-primary group-hover:opacity-100"
        >
          <Plus size={13} />
        </button>
      </div>
      {!collapsed &&
        section.channels.map((ch) => (
          <ChannelRow
            key={ch.id}
            channel={ch}
            active={ch.id === activeChannelId}
            onSelect={onSelect}
            href={hrefFor?.(ch.id)}
          />
        ))}
    </div>
  );
}

function ChannelRow({
  channel,
  active,
  onSelect,
  href,
}: {
  channel: ChannelSummary;
  active?: boolean;
  onSelect?: (id: string) => void;
  href?: string;
}) {
  return (
    <div className="relative my-0.5">
      <ItemLink
        href={href}
        onPress={() => onSelect?.(channel.id)}
        active={active}
        current={active}
        className={cn(
          "flex h-9 md:h-[34px] w-full items-center gap-2 rounded-xl px-2.5 text-[13.5px] font-medium transition-all duration-150 active:scale-[0.98]",
          active
            ? "border border-accent/30 bg-accent/15 text-text-primary font-semibold shadow-sm"
            : channel.unread
            ? "font-semibold text-text-primary hover:bg-white/[0.05]"
            : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
        )}
      >
        <ChannelGlyph type={channel.type} size={15} />
        <span className="truncate">{channel.name}</span>
        {channel.unread && !active && (
          <span className="ml-auto h-2 w-2 rounded-full bg-accent" />
        )}
      </ItemLink>

      {/* Voice participants inline */}
      {channel.type === "voice" && channel.participants && channel.participants.length > 0 && (
        <div className="mb-1 ml-6 mt-1 flex flex-col gap-1">
          {channel.participants.slice(0, 3).map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <Avatar src={p.avatar} name={p.name} size={16} shape="circle" />
              <span className="truncate font-mono text-[10.5px] text-text-muted">{p.name}</span>
            </div>
          ))}
          {channel.participants.length > 3 && (
            <span className="ml-[24px] font-mono text-[10px] text-text-faint">
              +{channel.participants.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

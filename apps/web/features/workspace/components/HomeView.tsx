"use client";

import { useState } from "react";
import { cn } from "@corvus/ui";
import { Avatar, ChannelGlyph } from "@/shared/components/ui";
import { FriendsView } from "./FriendsView";
import type { FriendSearchResult } from "@/shared/lib/api";
import type { AppShellData } from "./AppShell";
import { Radio, Users, Sparkles, MessageSquare, Hash, Volume2 } from "lucide-react";

type HomeTab = "overview" | "friends";

/**
 * Home (Discord + Linear + Raycast + AIIC Amber Glass Dashboard).
 */
export function HomeView({
  data,
  onOpenChannel,
  onOpenDM,
  onCallFriend,
  onSendFriendRequest,
  onSearchFriendUsers,
  onAcceptFriend,
  onDeclineFriend,
}: {
  data: AppShellData;
  onOpenChannel?: (spaceId: string, channelId: string) => void;
  onOpenDM?: (friendId: string) => void;
  onCallFriend?: (friendId: string) => void;
  onSendFriendRequest?: (target: string) => void;
  onSearchFriendUsers?: (query: string) => Promise<FriendSearchResult[]>;
  onAcceptFriend?: (id: string) => void;
  onDeclineFriend?: (id: string) => void;
}) {
  const [tab, setTab] = useState<HomeTab>("overview");

  const friends = data.friends ?? [];
  const friendsOnline = friends.filter((f) => !f.pending && f.presence !== "offline").length;

  const allChannels = Object.entries(data.sectionsBySpace).flatMap(([spaceId, sections]) =>
    sections.flatMap((s) => s.channels.map((c) => ({ ...c, spaceId })))
  );
  const unread = allChannels.filter((c) => c.unread);
  const dmUnread = (data.dmConversations ?? []).reduce((n, c) => n + (c.unreadCount ?? 0), 0);

  const recent = allChannels.filter((c) => c.type !== "voice").slice(0, 6);
  const voiceActive = Object.entries(data.voiceByChannel ?? {}).flatMap(([channelId, parts]) => {
    const ch = allChannels.find((c) => c.id === channelId);
    return ch && parts.length > 0 ? [{ channel: ch, parts }] : [];
  });

  const stats = [
    { value: String(unread.length), label: "Unread channels", icon: Hash },
    { value: String(dmUnread), label: "DM mentions", icon: MessageSquare },
    { value: String(friendsOnline), label: "Friends online", icon: Users },
    { value: String(data.spaces.length), label: "AIIC Spaces", icon: Sparkles },
  ];

  return (
    <section className="relative flex h-full min-w-0 flex-1 flex-col bg-[#0b0e14] overflow-hidden">
      {/* ─── Floating Glass Header ─── */}
      <div className="relative z-10 px-3 pt-3 sm:px-4 sm:pt-4">
        <header className="flex h-13 shrink-0 items-center justify-between rounded-[20px] border border-white/[0.08] bg-[#121722]/75 px-4 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-bold text-text-primary">Home Overview</h1>
            <span className="font-mono text-[11px] text-accent uppercase tracking-wider hidden sm:inline">
              {new Date().toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {(
              [
                { id: "overview", label: "Overview" },
                { id: "friends", label: "Friends" },
              ] as { id: HomeTab; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                data-active={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "h-7 rounded-xl px-3 font-mono text-[11px] font-semibold transition-all active:scale-95",
                  tab === t.id
                    ? "border border-accent/40 bg-accent/20 text-accent shadow-sm"
                    : "border border-transparent text-text-muted hover:bg-white/[0.04] hover:text-text-primary"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>
      </div>

      {tab === "friends" ? (
        <FriendsView
          friends={friends}
          embedded
          onMessage={onOpenDM}
          onCall={onCallFriend}
          onSendRequest={onSendFriendRequest}
          onSearchUsers={onSearchFriendUsers}
          onAccept={onAcceptFriend}
          onDecline={onDeclineFriend}
        />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin scrollbar-thumb-white/10">
          <div className="mx-auto max-w-[800px] space-y-6">
            {/* Unified Stat Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className="rounded-[22px] border border-white/[0.08] bg-[#121622]/80 p-4 backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition-all hover:border-accent/30"
                  >
                    <div className="flex items-center justify-between text-accent/80 mb-2">
                      <Icon size={16} />
                    </div>
                    <div className="font-mono text-2xl font-bold tracking-tight text-text-primary">
                      {s.value}
                    </div>
                    <div className="mt-1 font-mono text-[10.5px] uppercase tracking-wider text-text-muted">
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Jump Back In */}
            <div>
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-accent flex items-center gap-1.5 mb-2.5">
                <Hash size={13} /> Jump Back In
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {recent.map((ch) => {
                  const space = data.spaces.find((s) => s.id === ch.spaceId);
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => onOpenChannel?.(ch.spaceId, ch.id)}
                      className="flex h-12 w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#131824]/75 px-3.5 text-left transition-all hover:border-accent/40 hover:bg-[#181e2e]/85 active:scale-[0.98]"
                    >
                      <ChannelGlyph type={ch.type} size={15} />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-bold text-text-primary">
                          {ch.name}
                        </span>
                        <span className="block font-mono text-[10px] text-text-muted truncate">
                          {space?.name}
                        </span>
                      </div>
                      {ch.unread && <span className="h-2 w-2 rounded-full bg-accent ring-2 ring-accent/30" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Now */}
            <div>
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-status-online flex items-center gap-1.5 mb-2.5">
                <Volume2 size={13} /> Active Voice &amp; Teams
              </h2>
              {voiceActive.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-center font-mono text-xs text-text-muted/70">
                  No active voice lounges right now. Hop into any voice room to chat with your teammates.
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {voiceActive.map(({ channel, parts }) => (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => onOpenChannel?.(channel.spaceId, channel.id)}
                      className="flex h-13 w-full items-center gap-3 rounded-2xl border border-status-online/30 bg-status-online/5 px-3.5 text-left transition-all hover:border-status-online/50 hover:bg-status-online/10 active:scale-[0.98]"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-status-online/20 text-status-online">
                        <Volume2 size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-bold text-text-primary">
                          {channel.name}
                        </span>
                        <span className="block font-mono text-[10px] text-status-online">
                          {parts.length} in call
                        </span>
                      </div>
                      <div className="flex items-center -space-x-2">
                        {parts.slice(0, 3).map((p) => (
                          <Avatar key={p.id} src={p.avatar} name={p.name} size={22} shape="circle" />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

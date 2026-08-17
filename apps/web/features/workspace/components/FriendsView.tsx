"use client";

import { useEffect, useState } from "react";
import { cn } from "@corvus/ui";
import { MessageSquare, Phone, Check, X, UserPlus, Loader2, Search } from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import type { FriendSearchResult } from "@/shared/lib/api";
import type { FriendEntry, Presence } from "./types";

type FriendsTab = "online" | "all" | "pending" | "add";

const TABS: { id: FriendsTab; label: string }[] = [
  { id: "online", label: "Online" },
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "add", label: "Add friend" },
];

const DOT: Record<Presence, string> = {
  online: "bg-status-online shadow-[0_0_6px_rgba(34,197,94,0.6)]",
  idle: "bg-status-idle shadow-[0_0_6px_rgba(245,158,11,0.6)]",
  dnd: "bg-status-dnd shadow-[0_0_6px_rgba(239,68,68,0.6)]",
  offline: "bg-text-faint",
};

const PRESENCE_LABEL: Record<Presence, string> = {
  online: "Online",
  idle: "Idle",
  dnd: "Do Not Disturb",
  offline: "Offline",
};

/**
 * Friends (Discord + Linear + Raycast Glass Friends Hub).
 */
export function FriendsView({
  friends,
  onMessage,
  onCall,
  onSendRequest,
  onSearchUsers,
  onAccept,
  onDecline,
  embedded,
}: {
  friends: FriendEntry[];
  onMessage?: (id: string) => void;
  onCall?: (id: string) => void;
  onSendRequest?: (target: string) => void;
  onSearchUsers?: (query: string) => Promise<FriendSearchResult[]>;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  embedded?: boolean;
}) {
  const [tab, setTab] = useState<FriendsTab>("online");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "add" || !onSearchUsers) {
      setSearchResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    const nextQuery = query.trim();
    if (nextQuery.length < 2) {
      setSearchResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    let active = true;
    setSearching(true);
    setSearchError(null);

    const timer = window.setTimeout(() => {
      onSearchUsers(nextQuery)
        .then((users) => {
          if (active) setSearchResults(users);
        })
        .catch((err) => {
          if (!active) return;
          setSearchResults([]);
          setSearchError(err instanceof Error ? err.message : "Could not search users.");
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [onSearchUsers, query, tab]);

  const sendRequest = () => {
    const target = query.trim();
    if (!target) return;
    onSendRequest?.(target);
    setQuery("");
    setTab("pending");
  };

  const accepted = friends.filter((f) => !f.pending);
  const visible =
    tab === "online"
      ? accepted.filter((f) => f.presence !== "offline")
      : tab === "all"
        ? accepted
        : friends.filter((f) => f.pending);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      {!embedded && (
        <header className="flex h-13 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
          <h1 className="text-[15px] font-bold text-text-primary">Friends</h1>
        </header>
      )}

      {/* Tabs */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-white/[0.06] px-4 py-2.5">
        {TABS.map((t) => (
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
            {t.id === "pending" && friends.some((f) => f.pending === "incoming") && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {tab === "add" ? (
        <div className="mx-auto w-full max-w-[560px] p-4 sm:p-8">
          <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
            Add a Friend by Username or ID
          </h2>
          <p className="mt-1 text-xs text-text-secondary leading-relaxed">
            Search for fellow AIIC engineers and club members to collaborate, voice call, and DM.
          </p>

          <div className="mt-4 flex gap-2">
            <div className="relative flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-white/[0.08] bg-black/40 px-3 backdrop-blur-md">
              <Search size={15} className="text-text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendRequest();
                }}
                placeholder="Enter username (e.g. rafi, alex)..."
                className="w-full bg-transparent font-mono text-xs text-text-primary outline-none placeholder:text-text-muted/60"
              />
            </div>
            <button
              type="button"
              disabled={!query.trim()}
              onClick={sendRequest}
              className={cn(
                "flex h-11 shrink-0 items-center gap-1.5 rounded-2xl px-5 font-mono text-xs font-bold transition-all active:scale-95",
                query.trim()
                  ? "bg-accent text-on-accent shadow-[0_2px_12px_rgba(var(--c-accent-rgb,138,92,246),0.4)] hover:scale-105"
                  : "cursor-not-allowed border border-white/[0.06] bg-white/[0.04] text-text-muted/50"
              )}
            >
              <UserPlus size={14} /> Send Request
            </button>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121622]/80 backdrop-blur-xl shadow-lg">
            <div className="flex h-10 items-center justify-between border-b border-white/[0.06] px-4">
              <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-text-muted">
                Live Directory Search
              </span>
              {searching && <Loader2 size={13} className="animate-spin text-accent" />}
            </div>

            <div className="divide-y divide-white/[0.04] p-1">
              {searchError ? (
                <p className="p-4 text-xs text-danger">{searchError}</p>
              ) : query.trim().length < 2 ? (
                <p className="p-4 text-xs text-text-muted">Type at least 2 characters to search AIIC members.</p>
              ) : searchResults.length === 0 && !searching ? (
                <p className="p-4 text-xs text-text-muted">No members found matching &quot;{query}&quot;.</p>
              ) : (
                searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex min-h-[56px] items-center gap-3 rounded-xl px-3 py-2 transition-all hover:bg-white/[0.04]"
                  >
                    <div className="rounded-full ring-1 ring-white/10 ring-offset-1 ring-offset-black/40">
                      <Avatar src={user.avatarUrl} name={user.displayName || user.username} size={32} shape="circle" />
                    </div>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="truncate text-[13.5px] font-bold text-text-primary">
                        {user.displayName || user.username}
                      </p>
                      <p className="truncate font-mono text-[10.5px] text-accent mt-0.5">
                        @{user.username} · {relationLabel(user)}
                      </p>
                    </div>
                    <SearchResultAction user={user} onSendRequest={onSendRequest} onAccept={onAccept} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
          <p className="px-2 pb-1 font-mono text-[10.5px] font-bold uppercase tracking-wider text-text-muted">
            {tab === "pending" ? "Pending Requests" : tab === "online" ? "Online Friends" : "All Connections"} — {visible.length}
          </p>
          {visible.map((f) => (
            <div
              key={f.id}
              className="group flex h-14 items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#121622]/70 px-3.5 backdrop-blur-md transition-all hover:border-accent/40 hover:bg-[#161c2b]/85"
            >
              <div className="relative shrink-0">
                <div className="rounded-full ring-1 ring-white/10 ring-offset-1 ring-offset-black/40">
                  <Avatar src={f.avatar} name={f.name} size={34} shape="circle" />
                </div>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#121622]",
                    DOT[f.presence]
                  )}
                />
              </div>

              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[14px] font-bold text-text-primary">{f.name}</p>
                <p className="truncate font-mono text-[10.5px] text-text-muted mt-0.5">
                  {f.pending
                    ? f.pending === "incoming"
                      ? "Incoming friend request"
                      : "Request pending"
                    : f.status ?? PRESENCE_LABEL[f.presence]}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {f.pending === "incoming" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onAccept?.(f.id)}
                      title="Accept Request"
                      className="flex h-8 items-center gap-1.5 rounded-xl border border-success/40 bg-success/15 px-3 font-mono text-[11px] font-bold text-success transition-all hover:bg-success/25 active:scale-95"
                    >
                      <Check size={13} /> Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => onDecline?.(f.id)}
                      title="Decline Request"
                      className="flex h-8 items-center gap-1.5 rounded-xl border border-danger/40 bg-danger/15 px-3 font-mono text-[11px] font-bold text-danger transition-all hover:bg-danger/25 active:scale-95"
                    >
                      <X size={13} /> Decline
                    </button>
                  </>
                ) : f.pending === "outgoing" ? (
                  <button
                    type="button"
                    onClick={() => onDecline?.(f.id)}
                    className="flex h-8 items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 font-mono text-[11px] text-text-muted hover:bg-danger/15 hover:text-danger hover:border-danger/30 transition-all"
                  >
                    <X size={12} /> Cancel
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      aria-label="Direct message"
                      onClick={() => onMessage?.(f.id)}
                      className="flex h-8.5 w-8.5 items-center justify-center rounded-xl text-text-muted hover:bg-accent/20 hover:text-accent hover:border hover:border-accent/30 active:scale-95 transition-all"
                    >
                      <MessageSquare size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label="Start voice call"
                      onClick={() => onCall?.(f.id)}
                      className="flex h-8.5 w-8.5 items-center justify-center rounded-xl text-text-muted hover:bg-status-online/20 hover:text-status-online hover:border hover:border-status-online/30 active:scale-95 transition-all"
                    >
                      <Phone size={15} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {visible.length === 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center font-mono text-xs text-text-muted/70">
              {tab === "online" ? "No friends are online right now." : "No entries found."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function relationLabel(user: FriendSearchResult) {
  switch (user.relationStatus) {
    case "friends":
      return "Already friends";
    case "incoming_request":
      return "Sent you a request";
    case "outgoing_request":
      return "Request pending";
    default:
      return "AIIC Member";
  }
}

function SearchResultAction({
  user,
  onSendRequest,
  onAccept,
}: {
  user: FriendSearchResult;
  onSendRequest?: (target: string) => void;
  onAccept?: (id: string) => void;
}) {
  if (user.relationStatus === "friends") {
    return <span className="font-mono text-[10.5px] text-text-muted">Friends</span>;
  }
  if (user.relationStatus === "incoming_request" && user.pendingRequestId) {
    return (
      <button
        type="button"
        onClick={() => onAccept?.(user.pendingRequestId!)}
        className="flex h-8 items-center gap-1 rounded-xl bg-success/20 border border-success/40 px-3 font-mono text-[11px] font-bold text-success hover:bg-success/30 transition-all active:scale-95"
      >
        <Check size={12} /> Accept
      </button>
    );
  }
  if (user.relationStatus === "outgoing_request") {
    return <span className="font-mono text-[10.5px] text-text-muted">Pending</span>;
  }
  return (
    <button
      type="button"
      onClick={() => onSendRequest?.(user.username || user.id)}
      className="flex h-8 items-center gap-1 rounded-xl bg-accent/20 border border-accent/40 px-3 font-mono text-[11px] font-bold text-accent hover:bg-accent/30 transition-all active:scale-95"
    >
      <UserPlus size={12} /> Add
    </button>
  );
}

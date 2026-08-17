import { useLayoutEffect, useRef, useState, useEffect } from "react";
import { Users, Search, Pin, Phone, Video, AtSign, ArrowLeft, X, ExternalLink, Globe, Shield, Calendar } from "lucide-react";
import { ChannelGlyph, Avatar, type ChannelType } from "@/shared/components/ui";

import { EmptyState } from "@corvus/ui";
import type { Attachment, ChatMessage, MemberRef } from "./types";
import { Composer } from "./Composer";
import { MessageFeed } from "./MessageFeed";

/** Channel message view (Premium Glass / Liquid UI refinement). */
export function MessageArea({
  channelName,
  channelType,
  topic,
  messages,
  members,
  dm,
  onToggleMembers,
  onOpenThread,
  onOpenSearch,
  onOpenPins,
  onRecordClip,
  onSend,
  onReact,
  meId,
  onPin,
  onEdit,
  onDelete,
  feedId,
  loading,
  hasMore,
  onLoadOlder,
  onBack,
}: {
  channelName: string;
  channelType: ChannelType;
  topic?: string;
  messages: ChatMessage[];
  /** Space members — powers the composer's @mention menu. */
  members?: MemberRef[];
  /** DM mode — replaces the glyph with presence and adds call buttons. */
  dm?: {
    peerId?: string;
    avatar?: string | null;
    onVoiceCall?: () => void;
    onVideoCall?: () => void;
  };
  onToggleMembers?: () => void;
  onOpenThread?: (messageId: string) => void;
  onOpenSearch?: () => void;
  onOpenPins?: () => void;
  onRecordClip?: () => void;
  onSend?: (text: string, attachments?: Attachment[], replyTo?: ChatMessage["replyTo"]) => void;
  onReact?: (messageId: string, emoji: string) => void;
  meId?: string;
  onPin?: (messageId: string) => void;
  onEdit?: (messageId: string, text: string) => void;
  onDelete?: (messageId: string) => void;
  feedId?: string;
  loading?: boolean;
  hasMore?: boolean;
  onLoadOlder?: () => Promise<void>;
  onBack?: () => void;
}) {

  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const replyTo = messages.find((m) => m.id === replyToId) ?? null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const prependHeight = useRef<number | null>(null);
  const loadRequested = useRef(false);
  const [showNewMessages, setShowNewMessages] = useState(false);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
    nearBottom.current = true;
    setShowNewMessages(false);
  }, [feedId]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    if (prependHeight.current !== null) {
      element.scrollTop += element.scrollHeight - prependHeight.current;
      prependHeight.current = null;
      loadRequested.current = false;
    } else if (nearBottom.current) {
      element.scrollTop = element.scrollHeight;
    } else {
      setShowNewMessages(true);
    }
  }, [messages.length]);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
    if (nearBottom.current) setShowNewMessages(false);
    if (element.scrollTop < 80 && hasMore && onLoadOlder && !loading && !loadRequested.current) {
      loadRequested.current = true;
      prependHeight.current = element.scrollHeight;
      void onLoadOlder().finally(() =>
        window.setTimeout(() => {
          if (prependHeight.current !== null) prependHeight.current = null;
          loadRequested.current = false;
        }, 0)
      );
    }
  };

  return (
    <section className="relative flex h-full min-w-0 flex-1 flex-col bg-[#0b0e14] overflow-hidden">
      {/* Background Ambient Depth Glow */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 right-1/4 h-[380px] w-[500px] rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute bottom-10 -left-20 h-[300px] w-[400px] rounded-full bg-accent/3 blur-[100px]" />
      </div>

      {/* ─── Floating Glass Header Capsule ─── */}
      <div className="relative z-10 px-3 pt-3 sm:px-4 sm:pt-4">
        <header className="flex h-13 shrink-0 items-center justify-between rounded-[20px] border border-white/[0.08] bg-[#121722]/75 px-3.5 sm:px-4 py-2.5 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex min-w-0 items-center gap-2.5">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back to channels"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-white/[0.06] hover:text-text-primary active:scale-95 transition-all md:hidden"
              >
                <ArrowLeft size={17} />
              </button>
            )}

            {dm ? (
              <button
                type="button"
                onClick={() => dm.peerId && setShowProfileModal(true)}
                className="relative flex items-center justify-center shrink-0 rounded-full ring-2 ring-white/10 hover:ring-accent transition-all cursor-pointer group"
                title="View friend profile"
              >
                <Avatar
                  src={dm.avatar || undefined}
                  name={channelName}
                  size={32}
                  shape="circle"
                />
              </button>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.06] text-accent shrink-0">
                <ChannelGlyph type={channelType} size={15} />
              </div>
            )}

            <div className="min-w-0 flex flex-col justify-center">
              <span className="truncate text-[14px] sm:text-[15px] font-semibold text-text-primary leading-tight">
                {channelName}
              </span>
              {topic ? (
                <span className="hidden truncate text-[11px] font-mono text-text-muted sm:inline leading-tight mt-0.5">
                  {topic}
                </span>
              ) : (
                <span className="truncate text-[10px] font-mono text-text-muted/70 uppercase tracking-wider leading-tight mt-0.5">
                  AIIC · {dm ? "Direct Message" : "Channel"}
                </span>
              )}
            </div>
          </div>


          <div className="flex items-center gap-1">
            {dm && (
              <>
                <HeaderGlassIcon label="Start voice call" onClick={dm.onVoiceCall}>
                  <Phone size={15} />
                </HeaderGlassIcon>
                <HeaderGlassIcon label="Start video call" onClick={dm.onVideoCall}>
                  <Video size={16} />
                </HeaderGlassIcon>
                <span className="mx-1 h-4 w-px bg-white/[0.08]" />
              </>
            )}
            <HeaderGlassIcon label="Pinned messages" onClick={onOpenPins}>
              <Pin size={15} />
            </HeaderGlassIcon>
            {!dm && (
              <HeaderGlassIcon label="Members" onClick={onToggleMembers}>
                <Users size={16} />
              </HeaderGlassIcon>
            )}
            <HeaderGlassIcon label="Search" onClick={onOpenSearch}>
              <Search size={16} />
            </HeaderGlassIcon>
          </div>
        </header>
      </div>

      {/* ─── Scrollable Message Area ─── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative z-0 flex flex-1 flex-col overflow-y-auto px-1 sm:px-2 py-4 scrollbar-thin scrollbar-thumb-white/10"
      >
        {loading && messages.length === 0 ? (
          <div aria-label="Loading messages" className="space-y-4 px-4 py-6">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex animate-pulse gap-3.5">
                <div className="h-9 w-9 rounded-full bg-white/[0.06]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 rounded bg-white/[0.06]" />
                  <div className="h-10 w-2/3 rounded-2xl bg-white/[0.04]" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <WelcomeState channelName={channelName} channelType={channelType} dm={Boolean(dm)} />
        ) : (
          <MessageFeed
            messages={messages}
            meId={meId}
            onOpenThread={onOpenThread}
            onReply={setReplyToId}
            onReact={onReact}
            onPin={onPin}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}

        {showNewMessages && (
          <button
            type="button"
            onClick={() => {
              const element = scrollRef.current;
              if (element) element.scrollTop = element.scrollHeight;
              nearBottom.current = true;
              setShowNewMessages(false);
            }}
            className="sticky bottom-2 mx-auto rounded-full bg-accent px-4 py-1.5 font-mono text-xs font-semibold text-on-accent shadow-[0_4px_16px_rgba(var(--c-accent-rgb,138,92,246),0.4)] transition-all hover:scale-105 active:scale-95"
          >
            New messages ↓
          </button>
        )}
      </div>

      {/* ─── Floating Glass Composer Capsule ─── */}
      <Composer
        channelName={channelName}
        onSend={(text, attachments) => {
          onSend?.(
            text,
            attachments,
            replyTo
              ? { id: replyTo.id, authorName: replyTo.author.name, text: replyTo.text }
              : undefined
          );
          setReplyToId(null);
        }}
        onRecordClip={onRecordClip}
        members={members}
        replyTo={replyTo ? { authorName: replyTo.author.name, text: replyTo.text } : null}
        onCancelReply={() => setReplyToId(null)}
      />

      {showProfileModal && dm?.peerId && (
        <FriendProfileModal
          userId={dm.peerId}
          fallbackName={channelName}
          fallbackAvatar={dm.avatar}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </section>
  );
}

interface UserProfileData {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  isFriend: boolean;
  bio?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
  interests?: string[] | null;
  skills?: string[] | null;
  leadershipTitle?: string | null;
  joinedAt?: string;
}

function FriendProfileModal({
  userId,
  fallbackName,
  fallbackAvatar,
  onClose,
}: {
  userId: string;
  fallbackName: string;
  fallbackAvatar?: string | null;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/users/${userId}/profile`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.profile) {
          setProfile(data.profile);
        }
      })
      .catch((err) => console.error("[PROFILE_FETCH_ERROR]", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const displayName = profile?.displayName || fallbackName;
  const username = profile?.username || fallbackName.toLowerCase().replace(/\s+/g, "");
  const avatar = profile?.avatarUrl ?? fallbackAvatar;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/10 bg-[#121622] p-6 shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary transition-colors cursor-pointer"
          aria-label="Close profile"
        >
          <X size={16} />
        </button>

        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-16 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />

        {/* Header Avatar & Info */}
        <div className="relative flex flex-col items-center text-center mt-2">
          <div className="relative mb-3.5">
            <Avatar
              src={avatar || undefined}
              name={displayName}
              size={72}
              shape="circle"
              className="ring-4 ring-white/10 shadow-xl"
            />
          </div>

          <h3 className="text-base font-bold text-text-primary truncate max-w-full">
            {displayName}
          </h3>
          <p className="text-xs font-mono text-text-muted mt-0.5">@{username}</p>

          {profile?.leadershipTitle && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent font-mono text-[11px] font-semibold">
              <Shield size={12} />
              <span>{profile.leadershipTitle}</span>
            </div>
          )}
        </div>

        {/* Bio Section */}
        {profile?.bio && (
          <div className="mt-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3.5 text-left">
            <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1.5">
              About
            </p>
            <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Social / Professional Links */}
        {(profile?.linkedinUrl || profile?.githubUrl || profile?.websiteUrl) && (
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted px-1">
              Connections
            </p>
            <div className="flex flex-col gap-1.5">
              {profile.linkedinUrl && (
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-xs text-text-secondary hover:text-text-primary transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="h-3.5 w-3.5 fill-[#0A66C2]" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                    <span className="font-mono text-xs">LinkedIn</span>
                  </div>
                  <ExternalLink size={13} className="text-text-muted group-hover:text-text-primary transition-colors" />
                </a>
              )}
              {profile.githubUrl && (
                <a
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-xs text-text-secondary hover:text-text-primary transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="h-3.5 w-3.5 fill-white" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    <span className="font-mono text-xs">GitHub</span>
                  </div>
                  <ExternalLink size={13} className="text-text-muted group-hover:text-text-primary transition-colors" />
                </a>
              )}

              {profile.websiteUrl && (
                <a
                  href={profile.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-xs text-text-secondary hover:text-text-primary transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <Globe size={15} className="text-emerald-400" />
                    <span className="font-mono text-xs">Website</span>
                  </div>
                  <ExternalLink size={13} className="text-text-muted group-hover:text-text-primary transition-colors" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Interests & Skills chips if available */}
        {profile?.skills && profile.skills.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted px-1 mb-1.5">
              Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.04] border border-white/[0.08] text-text-secondary"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-text-muted/60">
          <span>AIIC Member</span>
          {profile?.joinedAt && (
            <span>Joined {new Date(profile.joinedAt).toLocaleDateString([], { month: "short", year: "numeric" })}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function WelcomeState({
  channelName,
  channelType,
  dm,
}: {
  channelName: string;
  channelType: ChannelType;
  dm?: boolean;
}) {
  return (
    <EmptyState
      className="mt-auto pb-6"
      icon={
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.08] shadow-inner text-accent">
          {dm ? (
            <AtSign aria-hidden size={28} className="text-accent" />
          ) : (
            <ChannelGlyph type={channelType} size={28} />
          )}
        </div>
      }
      title={dm ? channelName : `Welcome to #${channelName}`}
      description={
        dm
          ? `This is the beginning of your direct message history with ${channelName}.`
          : `This is the very start of #${channelName}. Say something to get the conversation going.`
      }
    />
  );
}

function HeaderGlassIcon({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-white/[0.08] hover:text-text-primary active:scale-95 transition-all"
    >
      {children}
    </button>
  );
}


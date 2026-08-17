"use client";

import { Fragment, useState } from "react";
import { cn } from "@corvus/ui";
import {
  SmilePlus,
  Reply,
  MessagesSquare,
  MoreHorizontal,
  CornerUpLeft,
  FileText,
  Download,
  Play,
  Pin,
  PinOff,
  Copy,
  Pencil,
  Trash2,
  Phone,
  PhoneMissed,
  Video,
  Check,
} from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import type { Attachment, ChatMessage, LinkEmbed } from "./types";
import { ClipEmbed } from "./ClipRecorder";
import { GitHubEvent } from "./GitHubView";
import { ConfirmModal } from "@/shared/components/ui/Modal";
import { useToastStore } from "@/shared/stores/toast-store";

const GROUP_WINDOW_MS = 7 * 60 * 1000;

export function timeShort(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function timeLabel(iso: string) {
  const date = new Date(iso);
  const prefix =
    date.toDateString() === new Date().toDateString()
      ? "Today"
      : date.toLocaleDateString([], {
          month: "short",
          day: "numeric",
          year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
        });
  return `${prefix} · ${timeShort(iso)}`;
}

function dayKey(iso: string) {
  return new Date(iso).toDateString();
}

function dayLabel(iso: string) {
  return new Date(iso)
    .toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase();
}

const QUICK_REACTIONS = ["👍", "🔥", "❤️", "😂", "🎉", "👀", "✅", "🚀"];

export interface MessageActions {
  onReply?: (id: string) => void;
  onOpenThread?: (id: string) => void;
  onReact?: (id: string, emoji: string) => void;
  onPin?: (id: string) => void;
  onEdit?: (id: string, text: string) => void;
  onDelete?: (id: string) => void;
}

export function MessageFeed({
  messages,
  compact,
  meId,
  onReply,
  onOpenThread,
  onReact,
  onPin,
  onEdit,
  onDelete,
}: {
  messages: ChatMessage[];
  compact?: boolean;
  meId?: string;
} & MessageActions) {
  return (
    <div className="flex flex-col space-y-1.5 px-2 sm:px-4">
      {messages.map((msg, i) => {
        const prev = messages[i - 1];
        const newDay = !prev || dayKey(prev.at) !== dayKey(msg.at);
        const grouped =
          !newDay &&
          !msg.replyTo &&
          prev &&
          !prev.githubEvent &&
          prev.author.id === msg.author.id &&
          new Date(msg.at).getTime() - new Date(prev.at).getTime() < GROUP_WINDOW_MS;

        if (msg.githubEvent) {
          return (
            <Fragment key={msg.id}>
              {newDay && !compact && <DateSeparator label={dayLabel(msg.at)} />}
              <GitHubEvent text={msg.githubEvent.text} meta={msg.githubEvent.meta} />
            </Fragment>
          );
        }

        return (
          <Fragment key={msg.id}>
            {newDay && !compact && <DateSeparator label={dayLabel(msg.at)} />}
            <MessageRow
              message={msg}
              grouped={Boolean(grouped)}
              mine={meId !== undefined && msg.author.id === meId}
              onReply={onReply}
              onOpenThread={onOpenThread}
              onReact={onReact}
              onPin={onPin}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </Fragment>
        );
      })}
    </div>
  );
}

function MessageRow({
  message,
  grouped,
  mine,
  onReply,
  onOpenThread,
  onReact,
  onPin,
  onEdit,
  onDelete,
}: {
  message: ChatMessage;
  grouped: boolean;
  mine: boolean;
} & MessageActions) {
  const [reactOpen, setReactOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState(message.text);

  return (
    <div
      id={`msg-${message.id}`}
      className={cn(
        "group relative flex flex-col py-0.5 rounded-2xl transition-all duration-200",
        mine ? "items-end" : "items-start"
      )}
    >
      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          onDelete?.(message.id);
          setConfirmDelete(false);
        }}
        title="Delete message?"
        body="This will permanently remove the message for everyone."
        confirmLabel="Delete message"
        destructive
      />

      {/* Reply reference — clickable to scroll & highlight original message */}
      {message.replyTo && (
        <button
          type="button"
          onClick={() => {
            const targetEl = document.getElementById(`msg-${message.replyTo?.id}`);
            if (targetEl) {
              targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
              targetEl.classList.add("ring-2", "ring-accent", "ring-offset-2", "ring-offset-black/50");
              setTimeout(() => {
                targetEl.classList.remove("ring-2", "ring-accent", "ring-offset-2", "ring-offset-black/50");
              }, 2000);
            }
          }}
          className={cn(
            "mb-1 flex items-center gap-1.5 px-3 font-mono text-[11px] text-text-muted/80 hover:text-text-primary transition-colors cursor-pointer text-left",
            mine ? "mr-1 justify-end" : "ml-1 justify-start"
          )}
        >
          <CornerUpLeft size={11} className="shrink-0 text-accent/70" />
          <span className="font-semibold text-accent/90">{message.replyTo.authorName || "Member"}:</span>
          <span className="max-w-[200px] sm:max-w-[320px] truncate text-text-faint">
            {message.replyTo.text || "original message unavailable"}
          </span>
        </button>
      )}

      <div
        className={cn(
          "relative flex max-w-[88%] sm:max-w-[78%] md:max-w-[70%] gap-2.5 items-end",
          mine ? "flex-row-reverse" : "flex-row"
        )}
      >
        {/* Author Avatar (when not grouped and not outgoing) */}
        {!mine && (
          <div className="w-8 shrink-0 mb-1">
            {!grouped ? (
              <div className="rounded-full ring-1 ring-white/10 ring-offset-1 ring-offset-black/40">
                <Avatar src={message.author.avatar} name={message.author.name} size={30} shape="circle" />
              </div>
            ) : (
              <div className="w-8" />
            )}
          </div>
        )}

        {/* ─── Glass Bubble ─── */}
        <div
          className={cn(
            "relative flex flex-col px-3.5 py-2.5 transition-all",
            mine
              ? "rounded-[18px] rounded-br-[4px] bg-[#1d1633]/85 text-text-primary border border-accent/30 shadow-[0_4px_20px_rgba(var(--c-accent-rgb,138,92,246),0.12),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md"
              : "rounded-[18px] rounded-bl-[4px] bg-[#141824]/85 text-text-primary border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md"
          )}
        >
          {/* Author Header (Incoming non-grouped) */}
          {!mine && !grouped && (
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[12.5px] font-semibold text-accent leading-none">
                {message.author.name}
              </span>
              <span className="font-mono text-[10px] text-text-muted/60 leading-none">
                {timeShort(message.at)}
              </span>
            </div>
          )}

          {/* Message Text & Editor */}
          {editing ? (
            <div className="min-w-[220px]">
              <textarea
                value={draft}
                autoFocus
                rows={Math.max(1, draft.split("\n").length)}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (draft.trim()) onEdit?.(message.id, draft.trim());
                    setEditing(false);
                  }
                  if (e.key === "Escape") {
                    setDraft(message.text);
                    setEditing(false);
                  }
                }}
                className="w-full resize-none rounded-xl border border-accent/40 bg-black/40 px-3 py-2 text-[14px] leading-relaxed text-text-primary outline-none focus:border-accent"
              />
              <p className="mt-1 font-mono text-[10px] text-text-faint">
                Enter to save · Esc to cancel
              </p>
            </div>
          ) : (
            (() => {
              const rawText = message.text || "";
              const attachmentRegex = /attachment:(?:%7B|{)(.*?)(?:%7D|})/g;
              const extractedAttachments: Attachment[] = [];
              let match;
              while ((match = attachmentRegex.exec(rawText)) !== null) {
                try {
                  const decoded = match[0].startsWith("attachment:%7B")
                    ? decodeURIComponent(match[0].replace("attachment:", ""))
                    : match[0].replace("attachment:", "");
                  const parsed = JSON.parse(decoded);
                  if (parsed.url) {
                    extractedAttachments.push({
                      kind: (parsed.kind || (parsed.mimeType?.startsWith("image/") ? "image" : "file")) as any,
                      url: parsed.url,
                      name: parsed.name || "Attachment",
                      size: parsed.size ? `${(parsed.size / 1024).toFixed(1)} KB` : undefined,
                    });
                  }
                } catch {}
              }

              const cleanText = rawText.replace(/attachment:(?:%7B|{).*?(?:%7D|})/g, "").trim();

              return (
                <>
                  {cleanText ? (
                    <div className="whitespace-pre-wrap break-words text-[14px] sm:text-[14.5px] leading-[1.55] text-text-primary/95">
                      <InlineMarkdown text={cleanText} />
                      {message.edited && (
                        <span className="ml-1.5 font-mono text-[10px] text-text-muted/60">
                          (edited)
                        </span>
                      )}
                    </div>
                  ) : null}

                  {extractedAttachments.map((att, i) => (
                    <AttachmentView key={`ext-${i}`} attachment={att} />
                  ))}
                </>
              );
            })()
          )}

          {/* Attachments & Media */}
          {message.attachments?.map((att, i) => (
            <AttachmentView key={i} attachment={att} />
          ))}

          {message.embed && <LinkEmbedCard embed={message.embed} />}

          {message.clip && (
            <ClipEmbed duration={message.clip.duration} size={message.clip.size} url={message.clip.url} />
          )}

          {message.call && (
            <CallEntry call={message.call} authorName={message.author.name} />
          )}

          {/* Outgoing Timestamp + Status Tick */}
          {mine && (
            <div className="mt-1 flex items-center justify-end gap-1 font-mono text-[10px] text-accent-muted">
              <span>{timeShort(message.at)}</span>
              <Check size={11} className="text-accent" />
            </div>
          )}

          {/* Reactions Pill Row */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {message.reactions.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  data-reacted={r.reacted}
                  onClick={() => onReact?.(message.id, r.emoji)}
                  className={cn(
                    "flex h-[22px] items-center gap-1.5 rounded-full border px-2 text-[12px] transition-all hover:scale-105 active:scale-95",
                    r.reacted
                      ? "border-accent/40 bg-accent/20 text-accent font-semibold"
                      : "border-white/[0.08] bg-white/[0.04] text-text-secondary hover:border-white/[0.15]"
                  )}
                >
                  <span className="text-[13px] leading-none">{r.emoji}</span>
                  <span className="font-mono text-[10px]">{r.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Floating Glass Action Toolbar on Hover ─── */}
        <div
          className={cn(
            "absolute -top-3 z-20 items-center gap-0.5 rounded-full border border-white/[0.12] bg-[#161c29]/95 px-1.5 py-0.5 backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-all group-hover:flex group-focus-within:flex",
            mine ? "left-2" : "right-2",
            menuOpen || reactOpen ? "flex" : "hidden"
          )}
        >
          <ActionIcon label="React" onClick={() => setReactOpen((v) => !v)}>
            <SmilePlus size={13} />
          </ActionIcon>
          <ActionIcon label="Reply" onClick={() => onReply?.(message.id)}>
            <Reply size={13} />
          </ActionIcon>
          {onOpenThread && (
            <ActionIcon label="Thread" onClick={() => onOpenThread(message.id)}>
              <MessagesSquare size={13} />
            </ActionIcon>
          )}
          <ActionIcon label="More" onClick={() => setMenuOpen((v) => !v)}>
            <MoreHorizontal size={13} />
          </ActionIcon>
        </div>

        {/* Floating More Menu */}
        {menuOpen && (
          <div
            role="menu"
            className={cn(
              "absolute top-6 z-30 min-w-[180px] rounded-2xl border border-white/[0.12] bg-[#161c29]/95 p-1.5 backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-150",
              mine ? "left-0" : "right-0"
            )}
          >
            <MenuItem
              icon={<Copy size={13} />}
              label="Copy text"
              onClick={() => {
                void navigator.clipboard?.writeText(message.text);
                useToastStore.getState().addToast({
                  title: "Copied to clipboard",
                  body: "Message text copied successfully.",
                  variant: "info",
                });
                setMenuOpen(false);
              }}
            />
            {onPin && (
              <MenuItem
                icon={message.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                label={message.pinned ? "Unpin message" : "Pin message"}
                onClick={() => {
                  onPin(message.id);
                  setMenuOpen(false);
                }}
              />
            )}
            {mine && onEdit && (
              <MenuItem
                icon={<Pencil size={13} />}
                label="Edit message"
                onClick={() => {
                  setDraft(message.text);
                  setEditing(true);
                  setMenuOpen(false);
                }}
              />
            )}
            {mine && onDelete && (
              <MenuItem
                icon={<Trash2 size={13} />}
                label="Delete message"
                danger
                onClick={() => {
                  setConfirmDelete(true);
                  setMenuOpen(false);
                }}
              />
            )}
          </div>
        )}

        {/* Floating Quick Reaction Bar */}
        {reactOpen && (
          <div
            role="menu"
            className={cn(
              "absolute -top-10 z-30 flex items-center gap-1 rounded-full border border-white/[0.12] bg-[#161c29]/95 p-1 backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-150",
              mine ? "left-0" : "right-0"
            )}
          >
            {QUICK_REACTIONS.map((e) => (
              <button
                key={e}
                type="button"
                role="menuitem"
                onClick={() => {
                  onReact?.(message.id, e);
                  setReactOpen(false);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[16px] leading-none transition-transform hover:scale-125 active:scale-95"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Content renderers ──────────────────────────────────────────────── */

const INLINE_TOKEN_RE = /https?:\/\/[^\s<>"]+|\*\*[^*\n]+\*\*|~~[^~\n]+~~|`[^`\n]+`|\*[^*\n]+\*/g;

export function InlineMarkdown({ text, depth = 0 }: { text: string; depth?: number }) {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  INLINE_TOKEN_RE.lastIndex = 0;

  while ((match = INLINE_TOKEN_RE.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    const token = match[0];
    const key = `${match.index}-${token}`;

    if (token.startsWith("http://") || token.startsWith("https://")) {
      nodes.push(
        <a
          key={key}
          href={token}
          target="_blank"
          rel="noreferrer noopener"
          className="text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:decoration-accent"
        >
          {token}
        </a>
      );
    } else if (token.startsWith("**")) {
      const content = token.slice(2, -2);
      nodes.push(
        <strong key={key} className="font-semibold text-text-primary">
          {depth < 2 ? <InlineMarkdown text={content} depth={depth + 1} /> : content}
        </strong>
      );
    } else if (token.startsWith("~~")) {
      nodes.push(
        <del key={key} className="text-text-muted decoration-text-muted">
          {token.slice(2, -2)}
        </del>
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded-md bg-black/40 border border-white/[0.06] px-1.5 py-0.5 font-mono text-[0.88em] text-accent"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    cursor = match.index + token.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes.length > 0 ? nodes : text}</>;
}

function AttachmentView({ attachment }: { attachment: Attachment }) {
  if (attachment.kind === "image" || attachment.kind === "gif") {
    return (
      <div className="relative mt-2 max-w-[420px] overflow-hidden rounded-[14px] border border-white/[0.08] bg-black/30 shadow-md">
        {attachment.url ? (
          <img
            src={attachment.url}
            alt={attachment.name}
            className="block max-h-[320px] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-video items-center justify-center bg-white/[0.04]">
            <span className="font-mono text-[11px] text-text-muted">{attachment.name}</span>
          </div>
        )}
        {attachment.kind === "gif" && (
          <span className="absolute left-2 top-2 rounded-md border border-white/[0.1] bg-black/70 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.08em] text-white">
            GIF
          </span>
        )}
      </div>
    );
  }

  if (attachment.kind === "video") {
    return (
      <div className="mt-2 max-w-[480px] overflow-hidden rounded-[14px] border border-white/[0.08] bg-black/30 shadow-md">
        {attachment.url ? (
          <video src={attachment.url} controls className="block max-h-[320px] w-full" />
        ) : (
          <div className="flex aspect-video items-center justify-center bg-white/[0.04]">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white">
              <Play size={18} fill="currentColor" />
            </span>
          </div>
        )}
        <div className="flex justify-between px-3 py-2 font-mono text-[11px] text-text-muted">
          <span className="truncate">{attachment.name}</span>
          {attachment.size && <span className="shrink-0 pl-3">{attachment.size}</span>}
        </div>
      </div>
    );
  }

  return (
    <a
      href={attachment.url}
      download={attachment.name}
      className="mt-2 flex max-w-[380px] items-center gap-3 rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 transition-all hover:border-white/[0.18] hover:bg-white/[0.07]"
    >
      <FileText size={16} className="shrink-0 text-accent" />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[12.5px] font-medium text-text-primary">
          {attachment.name}
        </span>
        {attachment.size && (
          <span className="font-mono text-[10px] text-text-muted">{attachment.size}</span>
        )}
      </span>
      <Download size={14} className="shrink-0 text-text-faint" />
    </a>
  );
}

function CallEntry({
  call,
  authorName,
}: {
  call: NonNullable<ChatMessage["call"]>;
  authorName: string;
}) {
  const label = call.missed
    ? `Missed ${call.kind} call`
    : `${call.kind === "video" ? "Video" : "Voice"} call`;
  return (
    <div className="mt-1.5 flex max-w-[380px] items-center gap-3 rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5">
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          call.missed
            ? "bg-danger/15 text-danger"
            : "bg-status-online/15 text-status-online"
        )}
      >
        {call.missed ? (
          <PhoneMissed size={14} />
        ) : call.kind === "video" ? (
          <Video size={14} />
        ) : (
          <Phone size={14} />
        )}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[12.5px] font-medium text-text-primary">
          {label}
        </span>
        <span className="font-mono text-[10px] text-text-muted">
          {call.missed ? `from ${authorName}` : call.duration ? `lasted ${call.duration}` : "no answer"}
        </span>
      </span>
    </div>
  );
}

function LinkEmbedCard({ embed }: { embed: LinkEmbed }) {
  return (
    <a
      href={embed.url}
      target="_blank"
      rel="noreferrer noopener"
      className="mt-2 block max-w-[440px] rounded-[14px] border border-white/[0.08] border-l-2 border-l-accent bg-white/[0.03] px-3.5 py-2.5 transition-all hover:bg-white/[0.06]"
    >
      <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-accent">
        {embed.domain}
      </span>
      <span className="mt-0.5 block text-[13.5px] font-semibold leading-[1.35] text-text-primary">
        {embed.title}
      </span>
      {embed.description && (
        <span className="mt-1 line-clamp-2 block text-[12px] leading-relaxed text-text-secondary">
          {embed.description}
        </span>
      )}
    </a>
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center my-3">
      <span className="rounded-full border border-white/[0.08] bg-[#121622]/80 px-3.5 py-0.5 font-mono text-[10px] font-medium tracking-[0.06em] text-text-muted backdrop-blur-md shadow-sm">
        {label}
      </span>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-xl px-2.5 text-left text-[12.5px] transition-all hover:scale-[1.02] active:scale-98",
        danger
          ? "text-danger hover:bg-danger/10"
          : "text-text-secondary hover:bg-white/[0.06] hover:text-text-primary"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ActionIcon({
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
      className="flex h-6 w-6 items-center justify-center rounded-full text-text-muted hover:bg-white/[0.1] hover:text-text-primary active:scale-95 transition-all"
    >
      {children}
    </button>
  );
}

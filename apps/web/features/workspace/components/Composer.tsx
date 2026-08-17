"use client";

import { useRef, useState } from "react";
import { cn } from "@corvus/ui";
import {
  Plus,
  Smile,
  ArrowUp,
  Video,
  FileUp,
  X,
  FileText,
  CornerUpLeft,
  Mic,
  Paperclip,
} from "lucide-react";
import { EmojiPicker, GifPicker, MentionMenu } from "./Pickers";
import type { Attachment, MemberRef } from "./types";
import { useToastStore } from "@/shared/stores/toast-store";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function kindOf(file: File): Attachment["kind"] {
  if (file.type.startsWith("image/")) return file.type === "image/gif" ? "gif" : "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

/**
 * Message composer (Premium Liquid Glass Capsule).
 */
export function Composer({
  channelName,
  onSend,
  onRecordClip,
  members,
  replyTo,
  onCancelReply,
}: {
  channelName: string;
  onSend?: (text: string, attachments?: Attachment[]) => void;
  /** Opens the async clip recorder (brief §Clips). */
  onRecordClip?: () => void;
  /** Space members — enables the @mention menu. */
  members?: MemberRef[];
  /** Active reply target — shown as a dismissible line above the input. */
  replyTo?: { authorName: string; text: string } | null;
  onCancelReply?: () => void;
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [picker, setPicker] = useState<null | "emoji" | "gif">(null);
  const [pending, setPending] = useState<Attachment[]>([]);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // “@token” at the caret end opens the mention menu.
  const mentionMatch = members?.length ? /(?:^|\s)@(\w*)$/.exec(value) : null;

  const grow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  };

  const canSend = value.trim().length > 0 || pending.length > 0;

  const send = () => {
    if (!canSend) return;
    const staged = pending.length ? pending : undefined;
    onSend?.(value.trim(), staged);
    staged?.forEach((attachment) => {
      if (attachment.url?.startsWith("blob:")) URL.revokeObjectURL(attachment.url);
    });
    setValue("");
    setPending([]);
    onCancelReply?.();
    if (ref.current) ref.current.style.height = "auto";
  };

  const [sending, setSending] = useState(false);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    const oversized = fileArray.filter((f) => f.size > 50 * 1024 * 1024);
    if (oversized.length > 0) {
      useToastStore.getState().addToast({
        title: "File too large",
        body: `Files must be under 50MB. (${oversized[0].name})`,
        variant: "error",
      });
      return;
    }
    const next: Attachment[] = fileArray.map((f) => ({
      kind: kindOf(f),
      name: f.name,
      size: formatSize(f.size),
      url: URL.createObjectURL(f),
      file: f,
    }));
    setPending((p) => [...p, ...next]);
  };

  return (
    <div className="relative z-10 shrink-0 px-3 pb-3 sm:px-4 sm:pb-4 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
      {/* ─── Floating Glass Capsule Container ─── */}
      <div
        className={cn(
          "relative flex flex-col rounded-[24px] border bg-[#131824]/80 backdrop-blur-xl transition-all duration-200 shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)]",
          focused
            ? "border-accent/40 shadow-[0_8px_32px_rgba(var(--c-accent-rgb,138,92,246),0.18),inset_0_1px_0_rgba(255,255,255,0.12)]"
            : "border-white/[0.08]"
        )}
      >
        {/* Reply Preview Bar */}
        {replyTo && (
          <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-4 py-2 rounded-t-[24px]">
            <div className="flex items-center gap-2 min-w-0">
              <CornerUpLeft size={13} className="shrink-0 text-accent" />
              <span className="font-mono text-xs font-semibold text-accent truncate">
                Replying to {replyTo.authorName}
              </span>
              <span className="truncate text-xs text-text-muted/70">{replyTo.text}</span>
            </div>
            <button
              type="button"
              aria-label="Cancel reply"
              onClick={onCancelReply}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-white/[0.08] hover:text-text-primary active:scale-95 transition-all"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Staged Attachments Preview */}
        {pending.length > 0 && (
          <div className="flex flex-wrap gap-2.5 border-b border-white/[0.06] px-4 py-2.5">
            {pending.map((att, i) => (
              <div
                key={i}
                className="group/att relative overflow-hidden rounded-xl border border-white/[0.08] bg-black/30 backdrop-blur-sm"
              >
                {(att.kind === "image" || att.kind === "gif") && att.url ? (
                  <img src={att.url} alt={att.name} className="block h-16 w-16 object-cover" />
                ) : (
                  <div className="flex h-16 w-[140px] flex-col justify-center gap-0.5 px-3">
                    <FileText size={15} className="text-accent" />
                    <span className="truncate text-[11px] font-medium text-text-primary">
                      {att.name}
                    </span>
                    <span className="font-mono text-[9px] text-text-muted">{att.size}</span>
                  </div>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${att.name}`}
                  onClick={() =>
                    setPending((p) => {
                      const removed = p[i];
                      if (removed?.url?.startsWith("blob:")) URL.revokeObjectURL(removed.url);
                      return p.filter((_, j) => j !== i);
                    })
                  }
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/75 text-white opacity-90 transition-opacity hover:opacity-100"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input & Action Controls */}
        <div className="flex items-center gap-2 px-3.5 py-2">
          {/* File Input */}
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {/* Plus / Attach Button */}
          <div className="relative">
            <button
              type="button"
              aria-label="Add attachment"
              onClick={() => setAttachOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-white/[0.08] hover:text-text-primary active:scale-95 transition-all"
            >
              <Plus size={18} />
            </button>

            {/* Floating Attachment Menu */}
            {attachOpen && (
              <div
                className="absolute bottom-full left-0 z-30 mb-2 min-w-[200px] rounded-2xl border border-white/[0.12] bg-[#161c29]/95 p-1.5 backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-150"
              >
                <AttachItem
                  icon={<FileUp size={15} className="text-accent" />}
                  label="Upload files"
                  onClick={() => {
                    setAttachOpen(false);
                    fileRef.current?.click();
                  }}
                />
                <AttachItem
                  icon={<Video size={15} className="text-accent" />}
                  label="Record video clip"
                  hint="Ctrl+Shift+R"
                  onClick={() => {
                    setAttachOpen(false);
                    onRecordClip?.();
                  }}
                />
              </div>
            )}
          </div>

          {/* Text Area */}
          <textarea
            ref={ref}
            rows={1}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              grow();
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && mentionMatch && members?.length) {
                e.preventDefault();
                const match = members.find((member) =>
                  member.name.toLowerCase().includes(mentionMatch[1].toLowerCase())
                );
                if (match) setValue((v) => v.replace(/@\w*$/, `@${match.name} `));
                return;
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Message ${channelName}...`}
            className="max-h-[220px] min-h-5 flex-1 resize-none bg-transparent text-[14px] leading-relaxed text-text-primary outline-none placeholder:text-text-muted/60 py-1"
          />

          {/* Paperclip Direct File Picker Trigger */}
          <button
            type="button"
            aria-label="Upload attachment"
            title="Attach file"
            onClick={() => fileRef.current?.click()}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-white/[0.08] hover:text-text-primary active:scale-95 transition-all"
          >
            <Paperclip size={17} />
          </button>

          {/* GIF Trigger */}
          <div className="relative">
            <button
              type="button"
              aria-label="Add GIF"
              title="Search Klipy GIFs"
              onClick={() => setPicker((p) => (p === "gif" ? null : "gif"))}
              className={cn(
                "flex h-8 items-center justify-center rounded-lg px-2 text-[11px] font-bold font-mono transition-all",
                picker === "gif"
                  ? "bg-accent/20 text-accent border border-accent/30"
                  : "text-text-muted hover:bg-white/[0.08] hover:text-text-primary active:scale-95"
              )}
            >
              GIF
            </button>

            {picker === "gif" && (
              <div className="absolute bottom-full right-0 z-30 mb-2">
                <GifPicker
                  onPick={(gif: { url: string; name: string }) => {
                    onSend?.("", [{ kind: "gif", name: gif.name, url: gif.url }]);
                    setPicker(null);
                  }}
                />
              </div>
            )}
          </div>

          {/* Emoji Trigger */}
          <div className="relative">
            <button
              type="button"
              aria-label="Add emoji"
              title="Add emoji"
              onClick={() => setPicker((p) => (p === "emoji" ? null : "emoji"))}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-all",
                picker === "emoji"
                  ? "bg-accent/20 text-accent"
                  : "text-text-muted hover:bg-white/[0.08] hover:text-text-primary active:scale-95"
              )}
            >
              <Smile size={18} />
            </button>

            {picker === "emoji" && (
              <div className="absolute bottom-full right-0 z-30 mb-2">
                <EmojiPicker
                  onPick={(emoji: string) => {
                    setValue((v) => v + emoji);
                    setPicker(null);
                    ref.current?.focus();
                  }}
                />
              </div>
            )}
          </div>


          {/* Send or Clip Trigger */}
          {canSend ? (
            <button
              type="button"
              aria-label="Send message"
              onClick={send}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-on-accent shadow-[0_2px_12px_rgba(var(--c-accent-rgb,138,92,246),0.5)] transition-all hover:scale-105 active:scale-95"
            >
              <ArrowUp size={16} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Record voice or video clip"
              onClick={onRecordClip}
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-white/[0.08] hover:text-text-primary active:scale-95 transition-all"
            >
              <Mic size={17} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AttachItem({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-full items-center justify-between rounded-xl px-3 text-left transition-all hover:bg-white/[0.06] active:scale-98"
    >
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-[13px] font-medium text-text-primary">{label}</span>
      </div>
      {hint && <span className="font-mono text-[10px] text-text-muted">{hint}</span>}
    </button>
  );
}

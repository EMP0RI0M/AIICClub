"use client";

import { X, MessagesSquare } from "lucide-react";
import type { Attachment, ChatMessage } from "./types";
import { Composer } from "./Composer";
import { MessageFeed } from "./MessageFeed";

/**
 * Thread panel (Premium Glass Floating Sidebar & Mobile Sheet).
 */
export function ThreadPanel({
  parent,
  replies,
  meId,
  onSend,
  onReact,
  onPin,
  onEdit,
  onDelete,
  onClose,
}: {
  parent: ChatMessage;
  replies: ChatMessage[];
  meId?: string;
  onSend?: (text: string, attachments?: Attachment[], replyTo?: ChatMessage["replyTo"]) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onPin?: (messageId: string) => void;
  onEdit?: (messageId: string, text: string) => void;
  onDelete?: (messageId: string) => void;
  onClose: () => void;
}) {
  return (
    <aside className="absolute inset-0 z-30 flex h-full w-full shrink-0 flex-col bg-[#0e121a]/95 border-l border-white/[0.08] backdrop-blur-2xl shadow-2xl lg:static lg:w-[340px] lg:bg-[#0e121a]/85 lg:backdrop-blur-xl">
      {/* Thread Header */}
      <header className="flex h-13 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent shrink-0">
            <MessagesSquare size={14} />
          </div>
          <div className="min-w-0">
            <div className="text-[13.5px] font-bold text-text-primary leading-tight">Thread</div>
            <div className="truncate font-mono text-[10px] text-text-muted mt-0.5">
              by {parent.author.name}
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label="Close thread"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-xl text-text-muted hover:bg-white/[0.06] hover:text-text-primary active:scale-95 transition-all"
        >
          <X size={15} />
        </button>
      </header>

      {/* Thread Content Area */}
      <div className="flex flex-1 flex-col overflow-y-auto py-3 px-1 scrollbar-thin scrollbar-thumb-white/10">
        {/* Parent Message Card */}
        <div className="px-2">
          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-3 backdrop-blur-sm">
            <MessageFeed
              messages={[parent]}
              compact
              meId={meId}
              onReact={onReact}
              onPin={onPin}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        </div>

        {/* Replies Divider */}
        <div className="flex items-center justify-center my-3">
          <span className="rounded-full border border-white/[0.08] bg-[#121622]/80 px-3 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent backdrop-blur-md">
            {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
          </span>
        </div>

        {/* Replies Feed */}
        {replies.length > 0 ? (
          <MessageFeed
            messages={replies}
            compact
            meId={meId}
            onReact={onReact}
            onPin={onPin}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : (
          <div className="py-8 text-center text-xs font-mono text-text-muted/60">
            No replies in this thread yet. Send a message below to start the thread discussion.
          </div>
        )}
      </div>

      {/* Thread Composer */}
      <Composer
        channelName="thread"
        onSend={(text, attachments) => {
          onSend?.(text, attachments, {
            id: parent.id,
            authorName: parent.author.name,
            text: parent.text,
          });
        }}
      />
    </aside>
  );
}

"use client";

import { X, Pin } from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import type { ChatMessage } from "./types";
import { timeShort } from "./MessageFeed";

/**
 * Pinned Messages (Premium Glass Panel).
 */
export function PinnedPanel({
  messages,
  onClose,
  onJump,
}: {
  messages: ChatMessage[];
  onClose: () => void;
  onJump?: (id: string) => void;
}) {
  const pinned = messages.filter((m) => m.pinned);

  return (
    <aside className="absolute inset-0 z-30 flex h-full w-full shrink-0 flex-col bg-[#0e121a]/95 border-l border-white/[0.08] backdrop-blur-2xl shadow-2xl lg:static lg:w-[340px] lg:bg-[#0e121a]/85 lg:backdrop-blur-xl">
      <div className="flex h-13 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-accent flex items-center gap-1.5">
          <Pin size={13} /> Pinned Messages ({pinned.length})
        </span>
        <button
          type="button"
          aria-label="Close pinned messages"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-xl text-text-muted hover:bg-white/[0.06] hover:text-text-primary active:scale-95 transition-all"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
        {pinned.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Pin size={22} className="mx-auto text-text-muted/40" />
            <p className="mt-3 text-[13px] leading-relaxed text-text-muted">
              Nothing pinned yet. Pin important messages from the conversation to bookmark them here.
            </p>
          </div>
        ) : (
          pinned.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onJump?.(m.id)}
              className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5 text-left transition-all hover:border-accent/40 hover:bg-white/[0.06] active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <Avatar src={m.author.avatar} name={m.author.name} size={22} shape="circle" />
                <span className="text-[13px] font-bold text-text-primary">{m.author.name}</span>
                <span className="ml-auto font-mono text-[10px] text-text-muted">{timeShort(m.at)}</span>
              </div>
              <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-text-secondary">
                {m.text || (m as any).content || "Message unavailable"}
              </p>

            </button>
          ))
        )}
      </div>
    </aside>
  );
}

"use client";

import { useState } from "react";
import { Sparkles, Bot } from "lucide-react";
import type { AIICArchiveRecord } from "@/shared/lib/archive-types";
import { SourceAiChatModal } from "./SourceAiChatModal";

interface SourceAiChatButtonProps {
  record: AIICArchiveRecord;
  className?: string;
  variant?: "primary" | "outline" | "compact";
}

export function SourceAiChatButton({ record, className = "", variant = "outline" }: SourceAiChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {variant === "primary" ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-4 py-2.5 font-mono text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer ${className}`}
        >
          <Sparkles size={13} className="fill-black text-black" />
          <span>Ask Source AI</span>
        </button>
      ) : variant === "compact" ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title={`Ask AI about ${record.archiveId}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-xs font-semibold active:scale-95 transition-all shadow-sm cursor-pointer ${className}`}
        >
          <Sparkles size={11} className="text-amber-400 fill-amber-400" />
          <span>Ask AI</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono text-xs font-semibold active:scale-95 transition-all shadow-sm cursor-pointer ${className}`}
        >
          <Bot size={13} className="text-amber-400" />
          <span>Chat with Source AI</span>
        </button>
      )}

      <SourceAiChatModal
        record={record}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

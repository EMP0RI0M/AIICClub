"use client";

import { useState } from "react";
import {
  Sparkles,
  Search,
  BookOpen,
  FileText,
  Video,
  GitBranch,
  X,
  ChevronRight,
  ExternalLink,
  Loader2,
  Layers,
  ArrowRight,
} from "lucide-react";
import type { RAGSourceCitation } from "@/shared/lib/knowledge/types";

export function KnowledgePopout({
  spaceId,
  spaceName,
  serverId,
  channelId,
  channelName,
  isOpen,
  onClose,
}: {
  spaceId?: string;
  spaceName?: string;
  serverId?: string;
  channelId?: string;
  channelName?: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<RAGSourceCitation[]>([]);

  if (!isOpen) return null;

  const handleSearchOrAsk = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setAnswer(null);
    setCitations([]);

    try {
      const res = await fetch("/api/knowledge/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          spaceId: spaceId || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAnswer(data.answer);
        setCitations(data.citations || []);
      } else {
        setAnswer("No verified answers found for this query in the AIIC knowledge base.");
      }
    } catch (err: any) {
      setAnswer(`Error querying knowledge base: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Container (Desktop: Right Side 460px / Mobile: Full Screen) */}
      <div className="relative z-10 flex h-full w-full max-w-full flex-col border-l border-white/[0.08] bg-[#0a0a0a] shadow-2xl backdrop-blur-2xl sm:max-w-[460px]">
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-white/[0.08] bg-[#0d0d0d]/90 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                AIIC Knowledge Engine
              </h2>
              <p className="text-[10px] text-text-muted">
                {spaceName ? `Scoped to ${spaceName}` : "Global Institutional Archive"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-text-muted hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 border-b border-white/[0.08] bg-[#0d0d0d]">
          <form onSubmit={handleSearchOrAsk} className="relative flex items-center">
            <Search size={15} className="absolute left-3 text-cyan-400/70" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask AIIC anything (e.g. RAG architecture, lectures, repos)..."
              className="w-full rounded-xl border border-white/10 bg-[#121212] py-2.5 pl-9 pr-24 font-mono text-xs text-white placeholder:text-zinc-500 outline-none focus:border-cyan-500/50"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-1.5 flex items-center gap-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 px-2.5 py-1.5 font-mono text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-40 transition-all cursor-pointer"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
              <span>Ask</span>
            </button>
          </form>
        </div>

        {/* Content & Answers Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-2 text-text-muted">
              <Loader2 size={24} className="animate-spin text-cyan-400" />
              <p className="text-xs">Searching verified vectors & synthesizing answer...</p>
            </div>
          ) : answer ? (
            <div className="space-y-4">
              {/* Synthesized Answer */}
              <div className="rounded-xl border border-cyan-500/20 bg-[#0e1217] p-4 shadow-md">
                <div className="flex items-center gap-2 text-cyan-300 font-semibold mb-2">
                  <Sparkles size={14} /> Synthesized AIIC Answer
                </div>
                <div className="text-zinc-200 text-[13px] leading-relaxed whitespace-pre-wrap font-sans">
                  {answer.replace(/<think>[\s\S]*?<\/think>\s*/gi, "").trim()}
                </div>
              </div>

              {/* Citations & Sources */}
              {citations.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                    Verified Sources & Citations ({citations.length})
                  </div>
                  <div className="grid gap-2">
                    {citations.map((c, i) => (
                      <div
                        key={c.id || i}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {c.sourceType === "youtube_lecture" ? (
                              <Video size={14} className="text-rose-400 shrink-0" />
                            ) : c.sourceType === "repository" ? (
                              <GitBranch size={14} className="text-purple-400 shrink-0" />
                            ) : (
                              <FileText size={14} className="text-cyan-400 shrink-0" />
                            )}
                            <span className="font-semibold text-white truncate max-w-[280px]">
                              {c.title}
                            </span>
                          </div>
                          <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[9.5px] text-cyan-300 font-mono">
                            {Math.round(c.similarity * 100)}% match
                          </span>
                        </div>

                        <p className="mt-2 text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                          "{c.snippet}"
                        </p>

                        {c.url && (
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-[10.5px] text-cyan-400 hover:underline"
                          >
                            <span>Open Resource</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center text-text-muted space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-cyan-400">
                <Layers size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Ask Anything from AIIC Knowledge</p>
                <p className="text-[11px] text-text-muted max-w-xs mt-1">
                  Answers are strictly grounded on official archive documents, video transcripts, and space resources.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@corvus/ui";
import { X, Search, FileText, ExternalLink, Loader2 } from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import type { BoardCard, ChatMessage, DocSummary, PullRequest } from "./types";
import { timeShort } from "./MessageFeed";
import { searchWorkspace, type SearchApiResults } from "@/shared/lib/api";

type SearchTab = "messages" | "cards" | "docs" | "files" | "prs";

const TABS: { id: SearchTab; label: string }[] = [
  { id: "messages", label: "Messages" },
  { id: "cards", label: "Cards" },
  { id: "docs", label: "Docs" },
  { id: "files", label: "Files" },
  { id: "prs", label: "PRs" },
];

export interface SearchCorpus {
  messages: (ChatMessage & { channel: string; channelId?: string })[];
  cards: (BoardCard & { column: string })[];
  docs: (DocSummary & { preview?: string })[];
  prs: PullRequest[];
}

/**
 * Full-text Search (Premium Floating Glass Capsule & Segmented Tabs).
 */
export function SearchPanel({
  corpus,
  spaceId,
  onSelectMessage,
  onClose,
}: {
  corpus: SearchCorpus;
  spaceId?: string;
  onSelectMessage?: (channelId: string, messageId: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<SearchTab>("messages");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiResults, setApiResults] = useState<SearchApiResults>({
    messages: [],
    cards: [],
    docs: [],
    files: [],
    prs: [],
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const q = query.trim().toLowerCase();

  const performSearch = async (searchTerm: string, activeTab: string) => {
    if (!searchTerm) {
      setApiResults({ messages: [], cards: [], docs: [], files: [], prs: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await searchWorkspace(searchTerm, activeTab, spaceId);
      setApiResults(data);
    } catch (err: any) {
      console.error("[SEARCH] Error:", err);
      setError(err?.message || "Could not complete search.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q) {
      setApiResults({ messages: [], cards: [], docs: [], files: [], prs: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      performSearch(query.trim(), tab);
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, tab, spaceId]);

  // Combined local + API results
  const combinedResults = useMemo(() => {
    if (!q) return { messages: [], cards: [], docs: [], files: [], prs: [] };

    // Local filter on in-memory corpus
    const localMsgs = corpus.messages.filter((m) =>
      m.text.toLowerCase().includes(q)
    );
    const localCards = corpus.cards.filter((c) =>
      c.title.toLowerCase().includes(q)
    );
    const localDocs = corpus.docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) || d.preview?.toLowerCase().includes(q)
    );
    const localPrs = corpus.prs.filter((p) =>
      p.title.toLowerCase().includes(q)
    );

    // Merge & deduplicate by ID
    const msgMap = new Map<string, any>();
    (apiResults.messages || []).forEach((m) => msgMap.set(m.id, m));
    localMsgs.forEach((m) => {
      if (!msgMap.has(m.id)) {
        msgMap.set(m.id, {
          id: m.id,
          text: m.text,
          channelId: m.channelId || "",
          channel: m.channel || "general",
          at: m.at,
          author: {
            id: m.author.id,
            name: m.author.name,
            avatar: m.author.avatar,
          },
        });
      }
    });

    const cardMap = new Map<string, any>();
    (apiResults.cards || []).forEach((c) => cardMap.set(c.id, c));
    localCards.forEach((c) => {
      if (!cardMap.has(c.id)) cardMap.set(c.id, c);
    });

    const docMap = new Map<string, any>();
    (apiResults.docs || []).forEach((d) => docMap.set(d.id, d));
    localDocs.forEach((d) => {
      if (!docMap.has(d.id)) docMap.set(d.id, d);
    });

    const prMap = new Map<string, any>();
    (apiResults.prs || []).forEach((p) => prMap.set(String(p.number || p.id), p));
    localPrs.forEach((p) => {
      if (!prMap.has(String(p.number || p.id))) prMap.set(String(p.number || p.id), p);
    });

    return {
      messages: Array.from(msgMap.values()),
      cards: Array.from(cardMap.values()),
      docs: Array.from(docMap.values()),
      files: apiResults.files || [],
      prs: Array.from(prMap.values()),
    };
  }, [q, apiResults, corpus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim()) {
      performSearch(query.trim(), tab);
    }
  };

  return (
    <aside className="absolute inset-0 z-30 flex h-full w-full shrink-0 flex-col bg-[#0e121a]/95 border-l border-white/[0.08] backdrop-blur-2xl shadow-2xl lg:static lg:w-[350px] lg:bg-[#0e121a]/85 lg:backdrop-blur-xl">
      {/* Header */}
      <div className="flex h-13 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-accent flex items-center gap-1.5">
          <Search size={13} /> Search Space
        </span>
        <button
          type="button"
          aria-label="Close search"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-xl text-text-muted hover:bg-white/[0.06] hover:text-text-primary active:scale-95 transition-all"
        >
          <X size={15} />
        </button>
      </div>

      {/* Glass Search Capsule Input */}
      <div className="p-3 pb-1">
        <form onSubmit={handleSubmit} className="relative flex h-10 items-center gap-2 rounded-2xl border border-white/[0.08] bg-black/40 px-3 backdrop-blur-md">
          <Search size={14} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSubmit(e);
              }
            }}
            placeholder="Search across all channels..."
            className="w-full bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-muted/60"
          />
          {loading ? (
            <Loader2 size={13} className="animate-spin text-accent shrink-0" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setApiResults({ messages: [], cards: [], docs: [], files: [], prs: [] });
              }}
              className="text-text-muted hover:text-text-primary shrink-0"
            >
              <X size={13} />
            </button>
          ) : null}
        </form>
      </div>

      {/* Segmented Rounded Pills */}
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto px-3 py-2 scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            data-active={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "h-7 shrink-0 rounded-xl px-3 font-mono text-[11px] font-semibold transition-all active:scale-95",
              tab === t.id
                ? "border border-accent/40 bg-accent/20 text-accent shadow-sm"
                : "border border-transparent text-text-muted hover:bg-white/[0.04] hover:text-text-primary"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search Results List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
        {!q && (
          <div className="py-12 text-center text-xs text-text-muted/70 leading-relaxed px-4">
            Search messages, task cards, technical docs, and repositories across this workspace.
          </div>
        )}

        {error && (
          <div className="py-8 text-center text-xs text-danger font-mono px-4">
            {error}
          </div>
        )}

        {q && loading && combinedResults[tab].length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-center text-xs font-mono text-text-muted">
            <Loader2 size={16} className="animate-spin text-accent" />
            Searching...
          </div>
        )}

        {q && tab === "messages" && (
          combinedResults.messages.length > 0 ? (
            combinedResults.messages.map((m: any) => (
              <div
                key={m.id}
                onClick={() => {
                  if (m.channelId) onSelectMessage?.(m.channelId, m.id);
                }}
                className="cursor-pointer rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5 backdrop-blur-sm transition-all hover:border-accent/40 hover:bg-white/[0.06]"
              >
                <div className="flex items-center gap-2">
                  <Avatar src={m.author?.avatar} name={m.author?.name || "Member"} size={22} shape="circle" />
                  <span className="text-[13px] font-bold text-text-primary">{m.author?.name || "Member"}</span>
                  <span className="ml-auto font-mono text-[10px] text-accent">#{m.channel || "general"}</span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-text-secondary line-clamp-3">
                  {m.text || m.content}
                </p>
                <div className="mt-2 font-mono text-[9.5px] text-text-muted">
                  {m.at ? timeShort(m.at) : m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </div>
              </div>
            ))
          ) : !loading ? (
            <div className="py-10 text-center text-xs font-mono text-text-muted">No messages found matching &quot;{query}&quot;</div>
          ) : null
        )}

        {q && tab === "cards" && (
          combinedResults.cards.length > 0 ? (
            combinedResults.cards.map((c: any) => (
              <div
                key={c.id}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5 backdrop-blur-sm transition-all hover:border-accent/40"
              >
                <span className="font-mono text-[10px] uppercase text-accent font-semibold">
                  {c.column || "Card"}
                </span>
                <h4 className="mt-1 text-[13.5px] font-bold text-text-primary">{c.title}</h4>
                {c.description && (
                  <p className="mt-1 text-xs text-text-muted line-clamp-2">{c.description}</p>
                )}
              </div>
            ))
          ) : !loading ? (
            <div className="py-10 text-center text-xs font-mono text-text-muted">No cards found matching &quot;{query}&quot;</div>
          ) : null
        )}

        {q && tab === "docs" && (
          combinedResults.docs.length > 0 ? (
            combinedResults.docs.map((d: any) => (
              <div
                key={d.id}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5 backdrop-blur-sm transition-all hover:border-accent/40"
              >
                <h4 className="text-[13.5px] font-bold text-text-primary">{d.title}</h4>
                {d.preview && (
                  <p className="mt-1 text-xs text-text-muted line-clamp-2">{d.preview}</p>
                )}
              </div>
            ))
          ) : !loading ? (
            <div className="py-10 text-center text-xs font-mono text-text-muted">No docs found matching &quot;{query}&quot;</div>
          ) : null
        )}

        {q && tab === "files" && (
          combinedResults.files.length > 0 ? (
            combinedResults.files.map((f: any) => (
              <div
                key={f.id}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5 backdrop-blur-sm transition-all hover:border-accent/40"
              >
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-accent shrink-0" />
                  <span className="text-[13px] font-bold text-text-primary truncate">{f.name}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-text-muted">
                  <span>#{f.channel}</span>
                  <span>{f.author}</span>
                </div>
              </div>
            ))
          ) : !loading ? (
            <div className="py-10 text-center text-xs font-mono text-text-muted">No files found matching &quot;{query}&quot;</div>
          ) : null
        )}

        {q && tab === "prs" && (
          combinedResults.prs.length > 0 ? (
            combinedResults.prs.map((p: any) => (
              <div
                key={p.id || p.number}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5 backdrop-blur-sm transition-all hover:border-accent/40"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-accent">#{p.number}</span>
                  <span className="text-[13px] font-bold text-text-primary truncate">{p.title}</span>
                </div>
              </div>
            ))
          ) : !loading ? (
            <div className="py-10 text-center text-xs font-mono text-text-muted">No PRs found matching &quot;{query}&quot;</div>
          ) : null
        )}
      </div>
    </aside>
  );
}

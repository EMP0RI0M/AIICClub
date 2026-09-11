"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Bot,
  Send,
  Loader2,
  Trash2,
  X,
  Copy,
  Check,
  User,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  CornerDownLeft,
} from "lucide-react";
import type { AIICArchiveRecord } from "@/shared/lib/archive-types";
import { RAGMarkdownRenderer } from "./ArchiveExplorer";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface SourceAiChatModalProps {
  record: AIICArchiveRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SourceAiChatModal({ record, isOpen, onClose }: SourceAiChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const archiveId = record?.archiveId || "";
  const storageKey = archiveId ? `aiic_source_chat_${archiveId}` : null;

  // Load saved conversation from localStorage on open / record change
  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
          return;
        }
      }
    } catch {
      // Ignore parse errors
    }
    setMessages([]);
  }, [storageKey]);

  // Save conversation to localStorage whenever messages change
  useEffect(() => {
    if (!storageKey || messages.length === 0) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // Ignore storage errors
    }
  }, [storageKey, messages]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isOpen]);

  if (!isOpen || !record) return null;

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || loading) return;

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: query,
      createdAt: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputQuery("");
    setLoading(true);

    try {
      const res = await fetch("/api/archive/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: record.archiveId,
          query,
          messages: newMessages.slice(-6),
          sourceTitle: record.title,
          sourceCategory: record.document?.category || record.type,
          sourceSession: record.session,
          sourceDescription: record.description,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to get AI response");
      }

      const assistantMessage: ChatMessage = {
        id: `ast_${Date.now()}`,
        role: "assistant",
        content: data.answer || "No response received.",
        createdAt: new Date().toISOString(),
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(finalMessages));
      }
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        role: "assistant",
        content: `⚠️ Error: ${err.message || "Failed to communicate with AI"}`,
        createdAt: new Date().toISOString(),
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm("Clear conversation history for this source?")) {
      setMessages([]);
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
    }
  };

  const handleCopy = (id: string, text: string) => {
    // Strip <think> tags for cleaner copying if desired
    const clean = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    navigator.clipboard.writeText(clean);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    "Summarize this source",
    "What are the key concepts covered?",
    "Explain the core technical ideas step-by-step",
    "Generate 3 review questions from this document",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl h-[90vh] max-h-[850px] flex flex-col rounded-2xl border border-amber-500/30 bg-[#050505] shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#000000] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Bot size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded font-mono text-[10.5px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {record.archiveId}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                  <ShieldCheck size={11} />
                  <span>Source-Locked AI</span>
                </span>
                {record.session && (
                  <span className="text-[10px] font-mono text-zinc-500">
                    Session {record.session}
                  </span>
                )}
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-[400px] mt-0.5">
                {record.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                title="Clear Chat History"
                className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-white/10 transition-colors cursor-pointer text-xs flex items-center gap-1"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline font-mono text-[11px]">Clear</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-sans text-xs sm:text-sm">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-md mx-auto">
              <div className="size-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Sparkles size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-white text-sm sm:text-base">
                  Ask AI About This Source
                </h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Answers are strictly grounded in <strong className="text-amber-300">{record.title}</strong>. Your conversation is automatically saved.
                </p>
              </div>

              {/* Starter Quick Prompts */}
              <div className="w-full space-y-2 pt-2 text-left">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  Suggested Prompts
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {quickPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(prompt)}
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-amber-500/40 text-left text-zinc-300 hover:text-white text-xs transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <span>{prompt}</span>
                      <ArrowRight size={12} className="text-zinc-500 group-hover:text-amber-400 transition-colors shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="size-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={14} />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 space-y-2 ${
                      isUser
                        ? "bg-amber-500 text-black font-medium shadow-md rounded-tr-sm"
                        : "bg-[#0c0c0c] border border-white/10 text-zinc-200 shadow-xl rounded-tl-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${isUser ? "text-black/70" : "text-amber-400"}`}>
                        {isUser ? "You" : `Corvus AI · ${record.archiveId}`}
                      </span>

                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          title="Copy Answer"
                          className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <Check size={12} className="text-emerald-400" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      )}
                    </div>

                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm font-sans">
                        {msg.content}
                      </p>
                    ) : (
                      <RAGMarkdownRenderer text={msg.content} />
                    )}
                  </div>

                  {isUser && (
                    <div className="size-7 rounded-lg bg-white/10 text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={14} />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="size-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} />
              </div>
              <div className="rounded-2xl rounded-tl-sm p-4 bg-[#0c0c0c] border border-white/10 text-amber-400 flex items-center gap-2.5 font-mono text-xs shadow-xl animate-pulse">
                <Loader2 size={14} className="animate-spin text-amber-400" />
                <span>Grounding answer in {record.archiveId}...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-[#000000] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 bg-[#0a0a0a] border border-white/15 rounded-xl p-1.5 focus-within:border-amber-500 transition-colors"
          >
            <input
              type="text"
              placeholder={`Ask anything about ${record.archiveId} (e.g. key takeaways, quiz concepts)...`}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={loading}
              className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none"
            />

            <button
              type="submit"
              disabled={!inputQuery.trim() || loading}
              className="h-9 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow"
            >
              {loading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <CornerDownLeft size={12} />
                </>
              )}
            </button>
          </form>
          <div className="mt-1.5 px-1 flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>Conversations are saved automatically per source</span>
            <span>Press Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  );
}

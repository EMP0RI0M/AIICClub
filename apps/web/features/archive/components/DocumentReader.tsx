"use client";

import { useState, useMemo, Fragment } from "react";
import {
  FileText,
  Download,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  ExternalLink,
  BookOpen,
  Eye,
  Sparkles,
  Type,
  Printer,
} from "lucide-react";
import katex from "katex";
import type { AIICArchiveDocument } from "@/shared/lib/archive-types";

interface DocumentReaderProps {
  document?: AIICArchiveDocument;
  title: string;
  archiveId: string;
  session?: string;
  defaultContent?: string;
  category?: string;
}

function renderLatex(latex: string, displayMode: boolean = false): React.ReactNode {
  try {
    const html = katex.renderToString(latex.trim(), {
      displayMode,
      throwOnError: false,
      output: "htmlAndMathml",
    });
    return (
      <span
        className={
          displayMode
            ? "my-3 block overflow-x-auto text-center font-serif text-amber-300 py-1.5 bg-black/40 rounded-lg border border-amber-500/20"
            : "inline font-serif text-amber-300 px-1 bg-amber-500/10 rounded"
        }
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    return <code className="font-mono text-amber-400">{latex}</code>;
  }
}

const INLINE_TOKEN_RE = /\$\$[\s\S]*?\$\$|\$(?!\$)[\s\S]*?\$|https?:\/\/[^\s<>"]+|\*\*[^*\n]+\*\*|~~[^~\n]+~~|`[^`\n]+`|\*[^*\n]+\*/g;

function InlineTokens({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  INLINE_TOKEN_RE.lastIndex = 0;

  while ((match = INLINE_TOKEN_RE.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    const token = match[0];
    const key = `${match.index}-${token}`;

    if (token.startsWith("$$") && token.endsWith("$$")) {
      const latex = token.slice(2, -2);
      nodes.push(<Fragment key={key}>{renderLatex(latex, true)}</Fragment>);
    } else if (token.startsWith("$") && token.endsWith("$") && !token.startsWith("$$")) {
      const latex = token.slice(1, -1);
      nodes.push(<Fragment key={key}>{renderLatex(latex, false)}</Fragment>);
    } else if (token.startsWith("http://") || token.startsWith("https://")) {
      nodes.push(
        <a
          key={key}
          href={token}
          target="_blank"
          rel="noreferrer noopener"
          className="text-amber-400 underline decoration-amber-400/40 underline-offset-2 transition-colors hover:decoration-amber-400"
        >
          {token}
        </a>
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-white/10 border border-white/10 px-1.5 py-0.5 font-mono text-[0.88em] text-amber-300"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else {
      nodes.push(<span key={key}>{token}</span>);
    }
    cursor = match.index + token.length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return <>{nodes}</>;
}

export function DocumentReader({
  document: doc,
  title,
  archiveId,
  session = "2026–27",
  defaultContent,
  category = "Official Study Notes",
}: DocumentReaderProps) {
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"reader" | "pdf">(() => {
    if (doc?.fileUrl && (doc.fileUrl.endsWith(".pdf") || doc.mimeType?.includes("pdf"))) {
      return "pdf";
    }
    return "reader";
  });

  const rawContent = doc?.content || defaultContent || doc?.summary || "";
  const isPdf = Boolean(
    doc?.fileUrl &&
      (doc.fileUrl.endsWith(".pdf") ||
        doc.mimeType?.includes("pdf") ||
        doc.fileName?.endsWith(".pdf"))
  );

  const wordCount = useMemo(() => {
    return rawContent.split(/\s+/).filter(Boolean).length;
  }, [rawContent]);

  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const handleCopy = () => {
    navigator.clipboard.writeText(rawContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const paragraphs = useMemo(() => {
    return rawContent.split("\n\n");
  }, [rawContent]);

  return (
    <div
      className={`rounded-2xl border border-amber-500/30 bg-[#050505] shadow-2xl transition-all duration-200 overflow-hidden ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none bg-black overflow-y-auto p-6 sm:p-10"
          : "p-5 sm:p-7 space-y-6"
      }`}
    >
      {/* Top Reader Header & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <BookOpen size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm sm:text-base text-white">{doc?.fileName || title}</h2>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-mono font-semibold">
                {doc?.category || category}
              </span>
            </div>
            <p className="font-mono text-xs text-zinc-400">
              {wordCount} words · ~{readingTimeMinutes} min read · Session {session}
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {isPdf && (
            <div className="flex p-0.5 bg-black border border-white/10 rounded-lg text-xs font-mono">
              <button
                type="button"
                onClick={() => setViewMode("reader")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  viewMode === "reader"
                    ? "bg-amber-500 text-black font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Text Notes
              </button>
              <button
                type="button"
                onClick={() => setViewMode("pdf")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  viewMode === "pdf"
                    ? "bg-amber-500 text-black font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                PDF View
              </button>
            </div>
          )}

          {/* Font Size Selector */}
          {viewMode === "reader" && (
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1 text-xs font-mono text-zinc-300">
              <button
                type="button"
                onClick={() => setFontSize("sm")}
                title="Small text"
                className={`px-2 py-0.5 rounded text-[11px] ${fontSize === "sm" ? "bg-white/20 text-white font-bold" : "hover:text-white"}`}
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setFontSize("base")}
                title="Normal text"
                className={`px-2 py-0.5 rounded text-xs ${fontSize === "base" ? "bg-white/20 text-white font-bold" : "hover:text-white"}`}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontSize("lg")}
                title="Large text"
                className={`px-2 py-0.5 rounded text-sm ${fontSize === "lg" ? "bg-white/20 text-white font-bold" : "hover:text-white"}`}
              >
                A+
              </button>
            </div>
          )}

          {/* Copy Button */}
          {rawContent && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-mono transition-all"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? "Copied" : "Copy Notes"}</span>
            </button>
          )}

          {/* Download File Button */}
          {doc?.fileUrl && (
            <a
              href={doc.fileUrl}
              target="_blank"
              rel="noreferrer"
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold shadow transition-all active:scale-95"
            >
              <Download size={12} />
              <span>Download</span>
            </a>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Reader"}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Reader Body */}
      {viewMode === "pdf" && doc?.fileUrl ? (
        <div className="rounded-xl overflow-hidden border border-white/10 bg-black aspect-[4/3] sm:h-[750px]">
          <iframe
            src={doc.fileUrl}
            title={title}
            className="w-full h-full border-none"
          />
        </div>
      ) : (
        <div
          className={`space-y-4 font-sans text-zinc-200 leading-relaxed max-w-4xl mx-auto ${
            fontSize === "sm"
              ? "text-xs sm:text-sm"
              : fontSize === "lg"
              ? "text-base sm:text-lg"
              : "text-sm sm:text-base"
          }`}
        >
          {paragraphs.length > 0 && rawContent.trim() ? (
            paragraphs.map((para, pIdx) => {
              const trimmed = para.trim();
              if (!trimmed) return null;

              // Horizontal divider
              if (trimmed === "---" || trimmed === "***") {
                return <hr key={pIdx} className="border-white/10 my-4" />;
              }

              // Heading 1
              if (trimmed.startsWith("# ")) {
                return (
                  <h2
                    key={pIdx}
                    className="text-lg sm:text-xl font-bold text-white pt-4 pb-2 border-b border-white/10"
                  >
                    <InlineTokens text={trimmed.replace(/^#\s+/, "")} />
                  </h2>
                );
              }

              // Heading 2
              if (trimmed.startsWith("## ")) {
                return (
                  <h3
                    key={pIdx}
                    className="text-base sm:text-lg font-bold text-amber-300 pt-3 pb-1 border-b border-white/5"
                  >
                    <InlineTokens text={trimmed.replace(/^##\s+/, "")} />
                  </h3>
                );
              }

              // Heading 3
              if (trimmed.startsWith("### ")) {
                return (
                  <h4 key={pIdx} className="text-sm sm:text-base font-bold text-white pt-2">
                    <InlineTokens text={trimmed.replace(/^###\s+/, "")} />
                  </h4>
                );
              }

              // Blockquotes
              if (trimmed.startsWith("> ")) {
                return (
                  <blockquote
                    key={pIdx}
                    className="border-l-2 border-amber-500 bg-white/[0.02] pl-4 py-2 text-zinc-300 italic rounded-r-lg"
                  >
                    <InlineTokens text={trimmed.replace(/^>\s+/, "")} />
                  </blockquote>
                );
              }

              // Unordered List
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                const items = trimmed.split(/\n[-*]\s+/);
                return (
                  <ul key={pIdx} className="space-y-1.5 pl-5 list-disc marker:text-amber-400">
                    {items.map((item, iIdx) => (
                      <li key={iIdx}>
                        <InlineTokens text={item.replace(/^[-*]\s+/, "")} />
                      </li>
                    ))}
                  </ul>
                );
              }

              // Ordered List
              if (/^\d+\.\s+/.test(trimmed)) {
                const items = trimmed.split(/\n\d+\.\s+/);
                return (
                  <ol key={pIdx} className="space-y-1.5 pl-5 list-decimal marker:text-amber-400">
                    {items.map((item, iIdx) => (
                      <li key={iIdx}>
                        <InlineTokens text={item.replace(/^\d+\.\s+/, "")} />
                      </li>
                    ))}
                  </ol>
                );
              }

              // Code block
              if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
                const lines = trimmed.split("\n");
                const lang = lines[0].replace(/^```/, "").trim();
                const codeBody = lines.slice(1, -1).join("\n");
                return (
                  <div
                    key={pIdx}
                    className="rounded-xl overflow-hidden border border-white/10 bg-black/90 p-4 font-mono text-xs sm:text-sm text-amber-300 overflow-x-auto my-3"
                  >
                    {lang && <div className="text-[10px] text-zinc-500 uppercase pb-2">{lang}</div>}
                    <pre>
                      <code>{codeBody}</code>
                    </pre>
                  </div>
                );
              }

              return (
                <p key={pIdx} className="leading-relaxed text-zinc-300">
                  <InlineTokens text={trimmed} />
                </p>
              );
            })
          ) : (
            <div className="p-8 text-center text-zinc-500 font-mono text-xs space-y-2">
              <FileText size={32} className="mx-auto text-zinc-600" />
              <p>No text preview available for this document.</p>
              {doc?.fileUrl && (
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:underline inline-block pt-2"
                >
                  Download raw document file
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

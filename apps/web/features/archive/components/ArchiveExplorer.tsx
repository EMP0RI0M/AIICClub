"use client";

import { useEffect, useMemo, useState, Fragment } from "react";
import {
  Search,
  Filter,
  Layers,
  Sparkles,
  RefreshCw,
  Plus,
  BookOpen,
  Video,
  FileCode,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Tag,
  Calendar,
  Lock,
  Globe,
  Loader2,
  Trash2,
  Edit,
  ArrowRight,
  Shield,
  FileText,
  Clock,
  Terminal,
  Bot,
  Zap,
  Check,
  Compass,
  ChevronDown,
  ChevronRight,
  BrainCircuit,
  Play,
  Tv,
  X,
  Radio,
  Monitor,
  Smartphone,
  Maximize2,
  Laptop,
  MousePointerClick,
  Upload,
} from "lucide-react";
import katex from "katex";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { getSupabaseClient } from "@/shared/supabase/client";
import type { AIICArchiveRecord, AIICArchiveStats } from "@/shared/lib/archive-types";
import { DocumentReader } from "./DocumentReader";
import { SourceAiChatModal } from "./SourceAiChatModal";
import { AdminQuizCreatorModal } from "@/features/quiz/components/AdminQuizCreatorModal";

function getYouTubeId(url?: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
  const match = url.trim().match(regExp);
  return match && match[1] ? match[1] : null;
}

interface ArchiveExplorerProps {
  initialRecords?: AIICArchiveRecord[];
  stats?: AIICArchiveStats;
}

/* ── LaTeX & Markdown Token Parsing ──────────────────────────────────── */

function renderLatex(latex: string, displayMode: boolean = false): React.ReactNode {
  try {
    const html = katex.renderToString(latex.trim(), {
      displayMode,
      throwOnError: false,
      output: "htmlAndMathml",
    });
    return (
      <span
        className={displayMode ? "my-2 block overflow-x-auto text-center font-serif text-amber-300 py-1" : "inline font-serif text-amber-300 px-0.5"}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    return <code className="font-mono text-amber-400">{latex}</code>;
  }
}

const INLINE_TOKEN_RE = /\$\$[\s\S]*?\$\$|\$(?!\$)[\s\S]*?\$|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s<>"]+|\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|`[^`\n]+`|\*[^*\n]+\*|_[^_\n]+_/g;

interface ParsedTableBlock {
  type: "table";
  headers: string[];
  alignments: Array<"left" | "center" | "right">;
  rows: string[][];
}

interface ParsedCodeBlock {
  type: "code";
  lang: string;
  code: string;
}

interface ParsedParagraphBlock {
  type: "paragraph";
  text: string;
}

interface ParsedListBlock {
  type: "list";
  ordered: boolean;
  items: string[];
}

interface ParsedQuoteBlock {
  type: "quote";
  text: string;
}

interface ParsedHeaderBlock {
  type: "header";
  level: number;
  text: string;
}

interface ParsedDividerBlock {
  type: "divider";
}

type ParsedBlock =
  | ParsedTableBlock
  | ParsedCodeBlock
  | ParsedParagraphBlock
  | ParsedListBlock
  | ParsedQuoteBlock
  | ParsedHeaderBlock
  | ParsedDividerBlock;

function parseMarkdownDocument(rawText: string): ParsedBlock[] {
  // Normalize pipe tables where rows are stuck together on a single line via "| |"
  let normalized = rawText.replace(/\|\s*\|\s*/g, "|\n|");

  const lines = normalized.split("\n");
  const blocks: ParsedBlock[] = [];

  let currentTable: ParsedTableBlock | null = null;
  let currentCode: { lang: string; lines: string[] } | null = null;
  let currentList: { ordered: boolean; items: string[] } | null = null;
  let currentParagraph: string[] = [];

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join("\n").trim();
      if (text) {
        blocks.push({ type: "paragraph", text });
      }
      currentParagraph = [];
    }
  }

  function flushTable() {
    if (currentTable) {
      if (currentTable.headers.length > 0 || currentTable.rows.length > 0) {
        blocks.push(currentTable);
      }
      currentTable = null;
    }
  }

  function flushCode() {
    if (currentCode) {
      blocks.push({
        type: "code",
        lang: currentCode.lang,
        code: currentCode.lines.join("\n"),
      });
      currentCode = null;
    }
  }

  function flushList() {
    if (currentList) {
      if (currentList.items.length > 0) {
        blocks.push({
          type: "list",
          ordered: currentList.ordered,
          items: currentList.items,
        });
      }
      currentList = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code Block Fence
    if (trimmed.startsWith("```")) {
      if (currentCode) {
        flushCode();
      } else {
        flushParagraph();
        flushTable();
        flushList();
        const lang = trimmed.slice(3).trim();
        currentCode = { lang, lines: [] };
      }
      continue;
    }

    if (currentCode) {
      currentCode.lines.push(line);
      continue;
    }

    // 2. Horizontal Divider
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      flushParagraph();
      flushTable();
      flushList();
      blocks.push({ type: "divider" });
      continue;
    }

    // 3. Table Rows
    if (trimmed.startsWith("|") && (trimmed.endsWith("|") || trimmed.includes("|"))) {
      flushParagraph();
      flushList();

      const rawCells = trimmed.split("|");
      // Remove empty leading/trailing elements from split
      if (rawCells[0].trim() === "") rawCells.shift();
      if (rawCells.length > 0 && rawCells[rawCells.length - 1].trim() === "") rawCells.pop();

      const cells = rawCells.map((c) => c.trim());
      const isDivider = cells.every((c) => /^:?-+:?$/.test(c));

      if (!currentTable) {
        if (!isDivider) {
          currentTable = {
            type: "table",
            headers: cells,
            alignments: [],
            rows: [],
          };
        }
      } else if (isDivider && currentTable.rows.length === 0) {
        currentTable.alignments = cells.map((c) => {
          if (c.startsWith(":") && c.endsWith(":")) return "center";
          if (c.endsWith(":")) return "right";
          return "left";
        });
      } else {
        currentTable.rows.push(cells);
      }
      continue;
    } else {
      flushTable();
    }

    // 4. Headers (#, ##, ###, ####)
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "header",
        level: headerMatch[1].length,
        text: headerMatch[2].trim(),
      });
      continue;
    }

    // 5. Blockquotes
    if (trimmed.startsWith("> ")) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "quote",
        text: trimmed.replace(/^>\s+/, ""),
      });
      continue;
    }

    // 6. Lists (unordered)
    if (/^[-*+]\s+/.test(trimmed)) {
      flushParagraph();
      const itemText = trimmed.replace(/^[-*+]\s+/, "");
      if (!currentList || currentList.ordered) {
        flushList();
        currentList = { ordered: false, items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      continue;
    }

    // 7. Lists (ordered)
    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      const itemText = orderedMatch[1];
      if (!currentList || !currentList.ordered) {
        flushList();
        currentList = { ordered: true, items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      continue;
    }

    // Blank line terminates lists
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    // Normal paragraph text
    currentParagraph.push(line);
  }

  flushParagraph();
  flushTable();
  flushCode();
  flushList();

  return blocks;
}

function CodeBlockRenderer({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl border border-white/10 bg-zinc-950 overflow-hidden shadow-lg">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-white/[0.03] border-b border-white/5 text-[11px] font-mono text-zinc-400">
        <span className="flex items-center gap-1.5 font-semibold text-amber-400">
          <Terminal size={12} />
          <span>{lang || "plaintext"}</span>
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono text-amber-200/90 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function TableBlockRenderer({ block }: { block: ParsedTableBlock }) {
  const { headers, alignments, rows } = block;

  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-amber-500/25 bg-black/60 shadow-xl">
      <table className="w-full text-left border-collapse text-xs sm:text-sm font-sans">
        {headers.length > 0 && (
          <thead>
            <tr className="border-b border-amber-500/30 bg-amber-500/10">
              {headers.map((h, hIdx) => {
                const align = alignments[hIdx] || "left";
                return (
                  <th
                    key={hIdx}
                    className={`px-3.5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-amber-300 border-r border-white/10 last:border-r-0 ${
                      align === "center"
                        ? "text-center"
                        : align === "right"
                        ? "text-right"
                        : "text-left"
                    }`}
                  >
                    <InlineTokens text={h} />
                  </th>
                );
              })}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-white/5">
          {rows.map((row, rIdx) => (
            <tr
              key={rIdx}
              className="hover:bg-white/[0.03] transition-colors odd:bg-transparent even:bg-white/[0.015]"
            >
              {row.map((cell, cIdx) => {
                const align = alignments[cIdx] || "left";
                return (
                  <td
                    key={cIdx}
                    className={`px-3.5 py-2 text-zinc-300 border-r border-white/5 last:border-r-0 leading-relaxed ${
                      align === "center"
                        ? "text-center"
                        : align === "right"
                        ? "text-right"
                        : "text-left"
                    }`}
                  >
                    <InlineTokens text={cell} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RAGMarkdownRenderer({ text }: { text: string }) {
  if (!text) return null;

  // Check for <think> blocks
  const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/i);
  const thinkContent = thinkMatch ? thinkMatch[1].trim() : null;
  const cleanBody = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  const blocks = parseMarkdownDocument(cleanBody);

  return (
    <div className="space-y-3 font-sans text-xs sm:text-sm text-zinc-200 leading-relaxed">
      {thinkContent && (
        <details open className="rounded-xl border border-white/10 bg-black/80 p-3 text-xs text-zinc-400 group">
          <summary className="cursor-pointer font-mono text-[11px] font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5 select-none">
            <BrainCircuit size={13} className="text-amber-400" />
            <span>AI Reasoning &amp; Synthesis Process</span>
          </summary>
          <div className="mt-2.5 pt-2 border-t border-white/5 font-mono text-[11px] text-zinc-400 whitespace-pre-wrap leading-relaxed">
            {thinkContent}
          </div>
        </details>
      )}

      <div className="space-y-3">
        {blocks.map((block, idx) => {
          switch (block.type) {
            case "table":
              return <TableBlockRenderer key={idx} block={block} />;

            case "code":
              return <CodeBlockRenderer key={idx} lang={block.lang} code={block.code} />;

            case "header": {
              if (block.level === 1) {
                return (
                  <h2 key={idx} className="text-base sm:text-lg font-bold text-white pt-2 border-b border-white/10 pb-1.5">
                    <InlineTokens text={block.text} />
                  </h2>
                );
              }
              if (block.level === 2) {
                return (
                  <h3 key={idx} className="text-sm sm:text-base font-bold text-amber-300 pt-2 border-b border-white/5 pb-1">
                    <InlineTokens text={block.text} />
                  </h3>
                );
              }
              if (block.level === 3) {
                return (
                  <h4 key={idx} className="text-xs sm:text-sm font-bold text-white pt-1">
                    <InlineTokens text={block.text} />
                  </h4>
                );
              }
              return (
                <h5 key={idx} className="text-xs font-semibold text-zinc-300 pt-1">
                  <InlineTokens text={block.text} />
                </h5>
              );
            }

            case "quote":
              return (
                <blockquote key={idx} className="border-l-2 border-amber-500/60 bg-white/[0.02] pl-3 py-1.5 text-xs text-zinc-300 italic rounded-r">
                  <InlineTokens text={block.text} />
                </blockquote>
              );

            case "list":
              if (block.ordered) {
                return (
                  <ol key={idx} className="space-y-1.5 pl-4 list-decimal marker:text-amber-400">
                    {block.items.map((item, iIdx) => (
                      <li key={iIdx}>
                        <InlineTokens text={item} />
                      </li>
                    ))}
                  </ol>
                );
              }
              return (
                <ul key={idx} className="space-y-1.5 pl-4 list-disc marker:text-amber-400">
                  {block.items.map((item, iIdx) => (
                    <li key={iIdx}>
                      <InlineTokens text={item} />
                    </li>
                  ))}
                </ul>
              );

            case "divider":
              return <hr key={idx} className="border-white/10 my-3" />;

            case "paragraph":
            default:
              return (
                <p key={idx} className="leading-relaxed">
                  <InlineTokens text={block.text} />
                </p>
              );
          }
        })}
      </div>
    </div>
  );
}

function InlineTokens({ text }: { text: string }) {
  if (!text) return null;
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
    } else if (match[1] && match[2]) {
      // [Link Text](https://url)
      nodes.push(
        <a
          key={key}
          href={match[2]}
          target="_blank"
          rel="noreferrer noopener"
          className="text-amber-400 underline decoration-amber-400/40 underline-offset-2 transition-colors hover:decoration-amber-400 inline-flex items-center gap-0.5"
        >
          <span>{match[1]}</span>
          <ExternalLink size={10} className="inline opacity-70" />
        </a>
      );
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
    } else if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push(
        <strong key={key} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("~~") && token.endsWith("~~")) {
      nodes.push(
        <span key={key} className="line-through text-zinc-500">
          {token.slice(2, -2)}
        </span>
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
    } else if (token.startsWith("*") || token.startsWith("_")) {
      nodes.push(
        <em key={key} className="italic text-zinc-300">
          {token.slice(1, -1)}
        </em>
      );
    } else {
      nodes.push(<span key={key}>{token}</span>);
    }
    cursor = match.index + token.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes.length > 0 ? nodes : text}</>;
}

export function ArchiveExplorer({ initialRecords = [], stats }: ArchiveExplorerProps) {
  const [records, setRecords] = useState<AIICArchiveRecord[]>(initialRecords);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedSession, setSelectedSession] = useState<string>("all");
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [activeWebsitePreviewId, setActiveWebsitePreviewId] = useState<string | null>(null);
  const [activeReadingDoc, setActiveReadingDoc] = useState<AIICArchiveRecord | null>(null);
  const [websiteViewport, setWebsiteViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isFetchingYtMeta, setIsFetchingYtMeta] = useState(false);
  const [ytMetaFeedback, setYtMetaFeedback] = useState<string | null>(null);

  // Dedicated Source-Specific AI Chat
  const [sourceChatRecord, setSourceChatRecord] = useState<AIICArchiveRecord | null>(null);

  // Admin AI Quiz Studio Modal
  const [isQuizStudioOpen, setIsQuizStudioOpen] = useState(false);
  const [quizStudioSourceIds, setQuizStudioSourceIds] = useState<string[]>([]);

  // Admin CRUD Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AIICArchiveRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<AIICArchiveRecord | null>(null);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form Fields
  const [formType, setFormType] = useState<"document" | "video" | "repository" | "build">("document");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("Official Study Notes");
  const [formSession, setFormSession] = useState("2026–27");
  const [formTags, setFormTags] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formYoutubeUrl, setFormYoutubeUrl] = useState("");
  const [formSpeaker, setFormSpeaker] = useState("Rafi Ullah Khan");
  const [formDuration, setFormDuration] = useState("");
  const [formGithubUrl, setFormGithubUrl] = useState("");
  const [formVersion, setFormVersion] = useState("v1.0.0");
  const [formBuildUrl, setFormBuildUrl] = useState("");
  const [formEnvironment, setFormEnvironment] = useState<"production" | "staging" | "preview" | "release">("production");

  // Document Upload States
  const [docInputMode, setDocInputMode] = useState<"upload" | "text" | "link">("upload");
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [formFile, setFormFile] = useState<{ name: string; size: number; type: string } | null>(null);
  const [formDocumentUrl, setFormDocumentUrl] = useState("");
  const fileInputRef = useState<{ current: HTMLInputElement | null }>({ current: null })[0];

  const handleFileProcess = (file: File) => {
    setRawFile(file);
    setFormFile({ name: file.name, size: file.size, type: file.type || "application/octet-stream" });
    if (!formTitle || formTitle === "New Study Document") {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setFormTitle(cleanName);
    }

    if (
      file.type.startsWith("text/") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".json") ||
      file.name.endsWith(".csv") ||
      file.name.endsWith(".tex") ||
      file.name.endsWith(".py") ||
      file.name.endsWith(".ts") ||
      file.name.endsWith(".js")
    ) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          setFormContent(text);
          if (!formDescription) {
            setFormDescription(text.slice(0, 150).trim() + "...");
          }
        }
      };
      reader.readAsText(file);
    } else {
      if (!formDescription) {
        setFormDescription(`Official study note asset: ${file.name} (${Math.round(file.size / 1024)} KB)`);
      }
    }
  };

  const user = useAuthStore((s) => s.user);
  const isAdmin = Boolean(
    user &&
    (
      !user.role ||
      ["president_admin", "admin", "president", "vice_president", "teacher", "staff", "owner", "faculty", "instructor", "lead"].includes(
        user.role?.toLowerCase() || ""
      ) ||
      (user as any).is_admin ||
      (user as any).roleKey === "president_admin" ||
      (user as any).roleKey === "admin"
    )
  );

  const fetchRecords = async () => {
    try {
      const res = await fetch("/api/archive/records");
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch (err) {
      console.error("Failed to load archive records:", err);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchAndAutofillYoutubeMeta = async (url: string) => {
    const ytId = getYouTubeId(url);
    if (!ytId) return;

    setIsFetchingYtMeta(true);
    setYtMetaFeedback(null);

    try {
      const res = await fetch(`/api/archive/youtube-meta?url=${encodeURIComponent(url.trim())}`);
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.title) {
          setFormTitle((prev) => (!prev || prev === "New Video Lecture" ? data.title : prev));
        }
        if (data.description) {
          setFormDescription((prev) => (!prev ? data.description : prev));
        }
        if (data.speaker) {
          setFormSpeaker((prev) => (!prev || prev === "Rafi Ullah Khan" ? data.speaker : prev));
        }
        if (data.duration) {
          setFormDuration(data.duration);
        }
        if (data.tags && data.tags.length > 0) {
          setFormTags((prev) => {
            const currentTags = prev.split(",").map((t) => t.trim()).filter(Boolean);
            const combined = Array.from(new Set([...currentTags, ...data.tags]));
            return combined.join(", ");
          });
        }
        setYtMetaFeedback(`✓ Auto-filled: "${data.title}" · ${data.speaker || "AIIC"} (${data.duration || "Video"})`);
      }
    } catch (err) {
      console.warn("YouTube meta auto-fetch error:", err);
    } finally {
      setIsFetchingYtMeta(false);
    }
  };

  const resetAddForm = () => {
    setFormType("document");
    setRawFile(null);
    setFormFile(null);
    setFormDocumentUrl("");
    setFormTitle("");
    setFormDescription("");
    setFormCategory("Official Study Notes");
    setFormSession("2026–27");
    setFormTags("lecture, web basics");
    setFormContent("");
    setFormYoutubeUrl("");
    setFormSpeaker("Rafi Ullah Khan");
    setFormDuration("");
    setFormGithubUrl("");
    setFormVersion("v1.0.0");
    setFormBuildUrl("");
    setFormEnvironment("production");
    setActionError(null);
    setActionSuccess(null);
    setYtMetaFeedback(null);
    setIsFetchingYtMeta(false);
  };

  const openEditModal = (rec: AIICArchiveRecord) => {
    setEditingRecord(rec);
    setFormType((rec.type as any) || "document");
    setRawFile(null);
    setFormTitle(rec.title || "");
    setFormDescription(rec.description || "");
    setFormCategory(rec.document?.category || "Official Study Notes");
    setFormSession(rec.session || "2026–27");
    setFormTags((rec.tags || []).join(", "));
    setFormContent("");
    setFormYoutubeUrl(rec.video?.youtubeUrl || "");
    setFormSpeaker(rec.video?.speaker || "");
    setFormDuration(rec.video?.duration || "");
    setFormGithubUrl(rec.repository?.githubUrl || "");
    setFormVersion(rec.build?.version || "");
    setFormBuildUrl(rec.build?.buildUrl || "");
    setFormEnvironment((rec.build?.environment as any) || "production");
    setActionError(null);
    setActionSuccess(null);
    setYtMetaFeedback(null);
    setIsFetchingYtMeta(false);
    setIsEditModalOpen(true);
  };

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setActionError("Title is required.");
      return;
    }

    setIsActionSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || useAuthStore.getState().token;

      // Special case: Document upload with actual raw binary file (PDF, docx, etc.)
      if (formType === "document" && rawFile) {
        const formData = new FormData();
        formData.append("file", rawFile);
        formData.append("title", formTitle.trim());
        formData.append("description", formDescription.trim());
        formData.append("category", formCategory || "Official Study Notes");
        formData.append("session", formSession || "2026–27");
        formData.append("tags", formTags || "document, official");

        const res = await fetch("/api/archive/documents", {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || "Failed to upload and vectorize document.");
        }

        const pagesMsg = data.totalPages ? ` (${data.totalPages} pages parsed & vectorized)` : "";
        setActionSuccess(`Document saved to Supabase Storage and indexed into AI Knowledge Base! ID: ${data.archiveId}${pagesMsg}`);
        fetchRecords();
        handleSyncToAI();
        setTimeout(() => {
          setIsAddModalOpen(false);
          resetAddForm();
        }, 1600);
        return;
      }

      const tagsArray = formTags.split(",").map((t) => t.trim()).filter(Boolean);

      const payload: any = {
        type: formType,
        title: formTitle.trim(),
        description: formDescription.trim(),
        session: formSession,
        tags: tagsArray,
      };

      if (formType === "document") {
        payload.category = formCategory;
        payload.content = formContent.trim();
        if (formDocumentUrl) payload.fileUrl = formDocumentUrl.trim();
        if (formFile) {
          payload.fileName = formFile.name;
          payload.fileSize = formFile.size;
          payload.mimeType = formFile.type;
        }
      } else if (formType === "video") {
        payload.youtubeUrl = formYoutubeUrl.trim();
        payload.speaker = formSpeaker.trim();
        payload.duration = formDuration.trim();
      } else if (formType === "repository") {
        payload.githubUrl = formGithubUrl.trim();
      } else if (formType === "build") {
        payload.version = formVersion.trim();
        payload.buildUrl = formBuildUrl.trim();
        payload.environment = formEnvironment;
      }

      const res = await fetch("/api/archive/records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to create archive source.");
      }

      setActionSuccess(`Source successfully registered with ID ${data.record?.archiveId}!`);
      fetchRecords();
      handleSyncToAI();
      setTimeout(() => {
        setIsAddModalOpen(false);
        resetAddForm();
      }, 1500);
    } catch (err: any) {
      setActionError(err.message || "Failed to create source.");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleUpdateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    setIsActionSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || useAuthStore.getState().token;

      const tagsArray = formTags.split(",").map((t) => t.trim()).filter(Boolean);

      const payload: any = {
        archiveId: editingRecord.archiveId,
        title: formTitle.trim(),
        description: formDescription.trim(),
        session: formSession,
        tags: tagsArray,
      };

      if (formType === "document") {
        payload.category = formCategory;
      } else if (formType === "video") {
        payload.youtubeUrl = formYoutubeUrl.trim();
        payload.speaker = formSpeaker.trim();
        payload.duration = formDuration.trim();
      } else if (formType === "repository") {
        payload.githubUrl = formGithubUrl.trim();
      } else if (formType === "build") {
        payload.version = formVersion.trim();
        payload.buildUrl = formBuildUrl.trim();
        payload.environment = formEnvironment;
      }

      const res = await fetch("/api/archive/records", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to update archive record.");
      }

      setActionSuccess(`Archive record ${editingRecord.archiveId} updated successfully.`);
      fetchRecords();
      handleSyncToAI();
      setTimeout(() => {
        setIsEditModalOpen(false);
        setEditingRecord(null);
      }, 1500);
    } catch (err: any) {
      setActionError(err.message || "Failed to update record.");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleDeleteSource = async () => {
    if (!deletingRecord) return;

    setIsActionSubmitting(true);
    try {
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || useAuthStore.getState().token;

      const res = await fetch(`/api/archive/records?archiveId=${deletingRecord.archiveId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to delete archive record.");
      }

      setRecords((prev) => prev.filter((r) => r.archiveId !== deletingRecord.archiveId));
      setDeletingRecord(null);
    } catch (err: any) {
      alert(`Error deleting record: ${err.message}`);
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return (records || []).filter((rec) => {
      if (!rec) return false;
      const titleStr = (rec.title || "").toLowerCase();
      const descStr = (rec.description || "").toLowerCase();
      const idStr = (rec.archiveId || "").toLowerCase();
      const queryStr = (searchQuery || "").trim().toLowerCase();

      const matchesSearch =
        !queryStr ||
        titleStr.includes(queryStr) ||
        descStr.includes(queryStr) ||
        idStr.includes(queryStr) ||
        (rec.tags || []).some((t) => (t || "").toLowerCase().includes(queryStr));

      const matchesType = selectedType === "all" || rec.type === selectedType;
      const matchesSession = selectedSession === "all" || rec.session === selectedSession;

      return matchesSearch && matchesType && matchesSession;
    });
  }, [records, searchQuery, selectedType, selectedSession]);

  return (
    <div className="space-y-6">
      {/* ─── Charcoal Black Action Card ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-[#000000] shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/[0.04] text-amber-400 border border-white/[0.08]">
            <Layers size={20} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>AIIC Institutional Archives</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-normal">
                Auto-Vectorized Live
              </span>
            </h2>
            <p className="text-xs text-zinc-400">Immutable repository of lectures, documentation, builds &amp; research</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Always Visible Add Source Button */}
          <button
            type="button"
            onClick={() => {
              resetAddForm();
              setIsAddModalOpen(true);
            }}
            className="flex-1 sm:flex-initial inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 font-mono text-xs font-semibold text-black hover:bg-amber-400 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            <Plus size={14} className="text-black stroke-[2.5]" />
            <span>Add Source</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search records by title, ID, tags, or contents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-xl bg-[#000000] border border-white/10 pl-10 pr-4 text-xs font-mono text-white placeholder-zinc-500 outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#000000] border border-white/10 rounded-xl p-1">
          {["all", "video", "document", "repository", "build"].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono capitalize transition-all ${
                selectedType === type ? "bg-white/10 text-amber-400 font-semibold shadow-sm" : "text-zinc-400 hover:text-white"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Video Section Spotlight Banner ─── */}
      {selectedType === "video" && (
        <div className="p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-zinc-950 to-black shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 shadow-lg">
              <Video size={24} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>AIIC Lecture Videos &amp; Workshop Theater</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  Interactive 1080p
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Official high-definition lecture recordings, coding masterclasses, and workshop sessions. Watch inline on this page or explore full notes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              resetAddForm();
              setFormType("video");
              setIsAddModalOpen(true);
            }}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-4 font-mono text-xs font-semibold shadow-md active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>Add Lecture Video</span>
          </button>
        </div>
      )}

      {/* ─── Website Builds & Releases Spotlight Banner ─── */}
      {selectedType === "build" && (
        <div className="p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-zinc-950 to-black shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 shadow-lg">
              <Globe size={24} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>AIIC Platform Builds &amp; Website Releases</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  Website Part 1 &amp; Part 2
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Explore interactive live deployments, Next.js architecture builds, sandbox viewports, and version history.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              resetAddForm();
              setFormType("build");
              setIsAddModalOpen(true);
            }}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-4 font-mono text-xs font-semibold shadow-md active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>Register Website Build</span>
          </button>
        </div>
      )}

      {/* Records Grid (Total Charcoal Black) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredRecords.length === 0 ? (
          <div className="col-span-full p-12 text-center text-zinc-500 font-mono text-xs rounded-2xl border border-white/5 bg-black">
            No archive records found matching your filters.
          </div>
        ) : (
          filteredRecords.map((rec) => {
            const isVideo = rec.type === "video" || Boolean(rec.video);
            const isBuild = rec.type === "build" || Boolean(rec.build);
            const isDoc = rec.type === "document" || Boolean(rec.document);
            const ytId = rec.video?.youtubeId || getYouTubeId(rec.video?.youtubeUrl || rec.description || "");
            const buildUrl = rec.build?.buildUrl || (isBuild ? "https://aiic-bbs.vercel.app" : null);
            const isPlaying = activePlayingId === rec.archiveId;
            const isWebsiteActive = activeWebsitePreviewId === rec.archiveId;

            return (
              <div
                key={rec.archiveId}
                className={`flex flex-col justify-between rounded-2xl border bg-[#000000] p-5 shadow-xl transition-all group relative ${
                  isPlaying || isWebsiteActive
                    ? "border-amber-500 ring-1 ring-amber-500/30"
                    : "border-white/[0.08] hover:border-amber-500/40"
                }`}
              >
                <div>
                  {/* Card Header with Badges and ALWAYS-VISIBLE Edit/Delete Action Buttons */}
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md font-mono text-[10.5px] font-semibold bg-white/[0.06] text-amber-400 border border-white/[0.06]">
                        {rec.archiveId}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 uppercase bg-white/[0.04] px-2 py-0.5 rounded flex items-center gap-1">
                        {isVideo && <Video size={10} className="text-amber-400" />}
                        {isBuild && <Globe size={10} className="text-amber-400" />}
                        <span>{rec.type}</span>
                      </span>
                      {rec.session && (
                        <span className="text-[10px] font-mono text-zinc-500 bg-white/[0.02] px-1.5 py-0.5 rounded">
                          {rec.session}
                        </span>
                      )}
                    </div>

                    {/* Edit & Delete Action Buttons (Always Available) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openEditModal(rec);
                        }}
                        title="Edit Record"
                        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-amber-500/20 text-zinc-400 hover:text-amber-300 border border-white/10 hover:border-amber-500/40 transition-all cursor-pointer"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeletingRecord(rec);
                        }}
                        title="Delete Record"
                        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-white/10 hover:border-rose-500/40 transition-all cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* ─── Video Display & Inline Playback ─── */}
                  {isVideo && (
                    <div className="mb-4">
                      {isPlaying && ytId ? (
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-amber-500/50 bg-black shadow-[0_0_30px_rgba(245,158,11,0.25)]">
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
                            title={rec.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className="w-full h-full border-none"
                          />
                          <div className="absolute top-2 right-2 z-10">
                            <button
                              type="button"
                              onClick={() => setActivePlayingId(null)}
                              className="px-2.5 py-1 rounded-lg bg-black/90 hover:bg-rose-950 text-white font-mono text-[10px] font-semibold border border-white/20 hover:border-rose-500/50 backdrop-blur-md transition-all flex items-center gap-1 shadow-lg cursor-pointer"
                            >
                              <X size={11} />
                              <span>Close Player</span>
                            </button>
                          </div>
                          <div className="absolute top-2 left-2 z-10 pointer-events-none">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/90 text-black font-mono text-[9px] font-bold uppercase tracking-wider shadow backdrop-blur-sm flex items-center gap-1">
                              <Radio size={9} className="animate-pulse" />
                              <span>Playing Live</span>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            if (ytId) setActivePlayingId(rec.archiveId);
                          }}
                          className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-zinc-950 group/thumb cursor-pointer shadow-lg hover:border-amber-500/50 transition-all"
                        >
                          <img
                            src={
                              rec.video?.thumbnailUrl ||
                              (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : "/placeholder-video.jpg")
                            }
                            alt={rec.title}
                            className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-500 opacity-85 group-hover/thumb:opacity-100"
                            loading="lazy"
                            onError={(e) => {
                              if (ytId) {
                                (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                          {/* Glowing Center Play Button */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-12 h-12 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.6)] group-hover/thumb:scale-115 group-hover/thumb:bg-amber-400 transition-all">
                              <Play size={20} className="fill-black text-black ml-0.5" />
                            </div>
                          </div>

                          {/* Top Badges: Speaker */}
                          {rec.video?.speaker && (
                            <div className="absolute top-2 left-2 pointer-events-none">
                              <span className="px-2 py-0.5 rounded-md bg-black/80 text-zinc-200 border border-white/15 text-[10px] font-mono backdrop-blur-md">
                                🎙️ {rec.video.speaker}
                              </span>
                            </div>
                          )}

                          {/* Bottom Badges: Duration */}
                          {rec.video?.duration && (
                            <div className="absolute bottom-2 right-2 pointer-events-none">
                              <span className="px-2 py-0.5 rounded-md bg-black/90 text-amber-300 font-mono text-[10px] font-semibold border border-white/20 flex items-center gap-1 backdrop-blur-md">
                                <Clock size={10} />
                                <span>{rec.video.duration}</span>
                              </span>
                            </div>
                          )}

                          {/* Hover Action Strip */}
                          <div className="absolute inset-x-0 bottom-0 py-1 bg-amber-500 text-black font-mono text-[10px] font-bold text-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                            ▶ Click to Play Inline
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── Website / Platform Build Interactive Live Preview ─── */}
                  {isBuild && (
                    <div className="mb-4">
                      {isWebsiteActive && buildUrl ? (
                        <div className="relative w-full rounded-xl overflow-hidden border border-amber-500/50 bg-black shadow-[0_0_30px_rgba(245,158,11,0.25)]">
                          {/* Browser Top Bar */}
                          <div className="flex items-center justify-between px-3 py-2 bg-zinc-950 border-b border-white/10 gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className="size-2 rounded-full bg-rose-500" />
                              <div className="size-2 rounded-full bg-amber-500" />
                              <div className="size-2 rounded-full bg-emerald-500" />
                            </div>

                            <div className="flex-1 min-w-[140px] max-w-[280px] flex items-center gap-1 px-2 py-0.5 rounded bg-black/90 border border-white/10 text-[10px] font-mono text-zinc-300">
                              <Lock size={9} className="text-emerald-400 shrink-0" />
                              <span className="truncate text-amber-300">{buildUrl.replace(/^https?:\/\//, "")}</span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                              <div className="flex items-center bg-black/60 rounded p-0.5 border border-white/10">
                                <button
                                  type="button"
                                  onClick={() => setWebsiteViewport("desktop")}
                                  title="Desktop View"
                                  className={`p-1 rounded ${websiteViewport === "desktop" ? "bg-amber-500 text-black font-bold" : "text-zinc-400 hover:text-white"}`}
                                >
                                  <Monitor size={10} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setWebsiteViewport("tablet")}
                                  title="Tablet View"
                                  className={`p-1 rounded ${websiteViewport === "tablet" ? "bg-amber-500 text-black font-bold" : "text-zinc-400 hover:text-white"}`}
                                >
                                  <Laptop size={10} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setWebsiteViewport("mobile")}
                                  title="Mobile View"
                                  className={`p-1 rounded ${websiteViewport === "mobile" ? "bg-amber-500 text-black font-bold" : "text-zinc-400 hover:text-white"}`}
                                >
                                  <Smartphone size={10} />
                                </button>
                              </div>

                              <a
                                href={buildUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="Open full page"
                                className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10"
                              >
                                <ExternalLink size={10} />
                              </a>

                              <button
                                type="button"
                                onClick={() => setActiveWebsitePreviewId(null)}
                                className="px-1.5 py-0.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-500/40 text-[9px] flex items-center gap-0.5 cursor-pointer"
                              >
                                <X size={9} />
                                <span>Close</span>
                              </button>
                            </div>
                          </div>

                          {/* Sandbox Iframe */}
                          <div className="w-full h-[320px] bg-black overflow-hidden flex justify-center items-stretch">
                            <div
                              className={`h-full bg-black transition-all duration-300 ${
                                websiteViewport === "mobile"
                                  ? "w-[280px] border-x border-white/15"
                                  : websiteViewport === "tablet"
                                  ? "w-[420px] border-x border-white/15"
                                  : "w-full"
                              }`}
                            >
                              <iframe
                                src={buildUrl}
                                title={rec.title}
                                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                                className="w-full h-full border-none bg-black"
                              />
                            </div>
                          </div>

                          {/* Status bar */}
                          <div className="px-3 py-1 bg-zinc-950 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-zinc-400">
                            <span className="flex items-center gap-1 text-emerald-400">
                              <span className="size-1 rounded-full bg-emerald-400 animate-pulse inline-block" />
                              <span>Interactive Sandbox Live</span>
                            </span>
                            <span>{rec.build?.version || "v2.0.0"}</span>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            if (buildUrl) setActiveWebsitePreviewId(rec.archiveId);
                          }}
                          className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br from-zinc-950 via-[#0a0a0a] to-black group/build cursor-pointer shadow-lg hover:border-amber-500/50 transition-all p-3.5 flex flex-col justify-between"
                        >
                          {/* Browser Top Bar Mockup */}
                          <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <div className="flex items-center gap-1.5">
                              <div className="size-2 rounded-full bg-rose-500/80" />
                              <div className="size-2 rounded-full bg-amber-500/80" />
                              <div className="size-2 rounded-full bg-emerald-500/80" />
                            </div>
                            <div className="px-2 py-0.5 rounded bg-black/60 border border-white/10 font-mono text-[9px] text-zinc-400 flex items-center gap-1">
                              <Globe size={9} className="text-amber-400" />
                              <span className="truncate max-w-[130px]">{buildUrl ? buildUrl.replace(/^https?:\/\//, "") : "aiic-bbs.vercel.app"}</span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono text-[9px] font-semibold border border-amber-500/20">
                              {rec.build?.version || "v2.0.0"}
                            </span>
                          </div>

                          {/* Center Launch CTA */}
                          <div className="my-auto text-center space-y-1 py-1">
                            <div className="inline-flex items-center justify-center size-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 group-hover/build:scale-110 group-hover/build:bg-amber-500 group-hover/build:text-black transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                              <Globe size={18} />
                            </div>
                            <div className="font-mono text-xs font-bold text-white group-hover/build:text-amber-300 transition-colors">
                              Live Website Preview
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono">
                              Click to launch interactive embedded viewport
                            </div>
                          </div>

                          {/* Bottom Bar */}
                          <div className="flex items-center justify-between pt-1.5 text-[9.5px] font-mono text-zinc-400 border-t border-white/5">
                            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                              <span className="size-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                              <span>{rec.build?.environment || "production"}</span>
                            </span>
                            <span className="text-amber-400 font-bold group-hover/build:underline flex items-center gap-0.5">
                              <span>▶ Test Live Build</span>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isVideo ? (
                    <div className="space-y-2 mt-3">
                      <h3 className="text-sm sm:text-base font-bold text-white tracking-tight line-clamp-2 group-hover:text-amber-300 transition-colors leading-snug">
                        {rec.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 flex-wrap">
                        {rec.video?.speaker && (
                          <span className="flex items-center gap-1 text-amber-400 font-medium">
                            <span>🎙️</span>
                            <span>{rec.video.speaker}</span>
                          </span>
                        )}
                        {rec.video?.duration && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span className="flex items-center gap-1 text-zinc-300">
                              <Clock size={11} className="text-amber-400/80" />
                              <span>{rec.video.duration}</span>
                            </span>
                          </>
                        )}
                        <span className="text-zinc-600">•</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                          1080p HD
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed font-sans pt-0.5">
                        {rec.description || "Official AIIC institutional lecture recording and workshop session."}
                      </p>
                    </div>
                  ) : isBuild ? (
                    <div className="space-y-2 mt-3">
                      <h3 className="text-sm sm:text-base font-bold text-white tracking-tight line-clamp-2 group-hover:text-amber-300 transition-colors leading-snug">
                        {rec.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 flex-wrap">
                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{rec.build?.environment || "Production"}</span>
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-amber-300 font-bold">{rec.build?.version || "v2.0.0"}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-zinc-300 border border-white/10 font-semibold">
                          Live Sandbox
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed font-sans pt-0.5">
                        {rec.description || "Production platform release build."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 mt-3">
                      <h3 className="text-sm sm:text-base font-bold text-white tracking-tight line-clamp-2 group-hover:text-amber-300 transition-colors leading-snug">
                        {rec.title}
                      </h3>
                      <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed font-sans">
                        {rec.description || "No detailed description provided."}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex flex-wrap gap-1.5">
                    {(rec.tags || []).slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.04]">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2.5 font-mono text-xs flex-wrap">
                    {isVideo && ytId && (
                      <button
                        type="button"
                        onClick={() => setActivePlayingId(isPlaying ? null : rec.archiveId)}
                        className={`flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                          isPlaying ? "text-amber-400 hover:text-amber-300" : "text-zinc-400 hover:text-amber-300"
                        }`}
                      >
                        <Play size={12} className={isPlaying ? "fill-amber-400" : ""} />
                        <span>{isPlaying ? "Minimize" : "Watch"}</span>
                      </button>
                    )}

                    {isBuild && buildUrl && (
                      <button
                        type="button"
                        onClick={() => setActiveWebsitePreviewId(isWebsiteActive ? null : rec.archiveId)}
                        className={`flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                          isWebsiteActive ? "text-amber-400 hover:text-amber-300" : "text-zinc-400 hover:text-amber-300"
                        }`}
                      >
                        <Globe size={12} className={isWebsiteActive ? "text-amber-400" : ""} />
                        <span>{isWebsiteActive ? "Minimize" : "Preview"}</span>
                      </button>
                    )}

                    {isDoc && (
                      <button
                        type="button"
                        onClick={() => setActiveReadingDoc(rec)}
                        className="flex items-center gap-1 font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                      >
                        <BookOpen size={12} className="text-amber-400" />
                        <span>Read Notes</span>
                      </button>
                    )}

                    {/* Dedicated Source-Specific Ask AI Button */}
                    <button
                      type="button"
                      onClick={() => setSourceChatRecord(rec)}
                      title={`Chat with AI strictly about ${rec.archiveId}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all font-semibold active:scale-95 shadow-sm font-mono text-xs cursor-pointer"
                    >
                      <Sparkles size={11} className="text-amber-400 fill-amber-400" />
                      <span>Ask AI</span>
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuizStudioSourceIds([rec.archiveId]);
                          setIsQuizStudioOpen(true);
                        }}
                        title={`Generate student quiz from ${rec.archiveId}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 transition-all font-semibold active:scale-95 shadow-sm font-mono text-xs cursor-pointer"
                      >
                        <Bot size={11} className="text-amber-400" />
                        <span>AI Quiz</span>
                      </button>
                    )}

                    {(() => {
                      const cleanId = (rec?.archiveId || "").toLowerCase();
                      const tagStr = (rec?.tags || []).join(" ").toLowerCase();
                      let quizSlug = "lecture-1-website-basics";
                      if (cleanId.includes("5") || cleanId.includes("4") || tagStr.includes("lecture-1") || tagStr.includes("website basics")) {
                        quizSlug = "lecture-1-website-basics";
                      } else if (cleanId.includes("7") || cleanId.includes("6") || tagStr.includes("lecture-2") || tagStr.includes("rag")) {
                        quizSlug = "lecture-2-rag-ai-applications";
                      } else if (cleanId.includes("8") || cleanId.includes("10") || cleanId.includes("9") || tagStr.includes("lecture-3") || tagStr.includes("setup")) {
                        quizSlug = "lecture-3-ai-assisted-coding";
                      } else {
                        quizSlug = "lecture-4-website-setup-hackathon";
                      }
                      return (
                        <a
                          href={`/quiz?quiz=${quizSlug}`}
                          title="Take Official Lecture Quiz"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-all font-semibold active:scale-95 shadow-sm"
                        >
                          <Zap size={11} className="text-amber-400" />
                          <span>Take Quiz</span>
                        </a>
                      );
                    })()}

                    <a
                      href={`/archive/${rec.archiveId}`}
                      className="flex items-center gap-1 text-zinc-300 hover:text-amber-400 hover:underline transition-colors"
                    >
                      <span className="font-semibold">Explore</span>
                      <ArrowRight size={13} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─── Add Source / Lecture Modal ─── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-amber-500/30 bg-[#080808] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-white">
                <Plus size={18} className="text-amber-400" />
                <h3 className="font-bold text-base">Add Institutional Archive Source</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-white font-mono text-xs p-1"
              >
                ✕ Close
              </button>
            </div>

            {/* Type Switcher */}
            <div className="flex gap-2 p-1 bg-black border border-white/10 rounded-xl">
              {(
                [
                  { id: "document", label: "Lecture Notes / Doc", icon: FileText },
                  { id: "video", label: "Lecture Video (YouTube)", icon: Video },
                  { id: "repository", label: "GitHub Repo", icon: FileCode },
                  { id: "build", label: "Platform Build", icon: HardDrive },
                ] as const
              ).map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFormType(t.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-mono text-xs font-medium transition-all ${
                      formType === t.id ? "bg-amber-500 text-black font-semibold shadow" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Icon size={13} />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleCreateSource} className="space-y-4 font-sans text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Source Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AIIC Club Lecture 3 Notes: Autonomous Agents & RLM"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full h-10 rounded-xl bg-black border border-white/15 px-3.5 text-white placeholder-zinc-500 outline-none focus:border-amber-500 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Academic Session</label>
                  <select
                    value={formSession}
                    onChange={(e) => setFormSession(e.target.value)}
                    className="w-full h-10 rounded-xl bg-black border border-white/15 px-3 text-white outline-none focus:border-amber-500 font-mono text-xs"
                  >
                    <option value="2026–27">2026–27</option>
                    <option value="2025–26">2025–26</option>
                    <option value="2024–25">2024–25</option>
                  </select>
                </div>

                {formType === "document" && (
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Document Category</label>
                    <input
                      type="text"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      placeholder="e.g. Official Study Notes"
                      className="w-full h-10 rounded-xl bg-black border border-white/15 px-3.5 text-white placeholder-zinc-500 outline-none focus:border-amber-500 text-xs font-mono"
                    />
                  </div>
                )}

                {formType === "video" && (
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Speaker / Instructor</label>
                    <input
                      type="text"
                      value={formSpeaker}
                      onChange={(e) => setFormSpeaker(e.target.value)}
                      placeholder="e.g. Rafi Ullah Khan"
                      className="w-full h-10 rounded-xl bg-black border border-white/15 px-3.5 text-white placeholder-zinc-500 outline-none focus:border-amber-500 text-xs font-mono"
                    />
                  </div>
                )}

                {formType === "build" && (
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Build Version *</label>
                    <input
                      type="text"
                      required
                      value={formVersion}
                      onChange={(e) => setFormVersion(e.target.value)}
                      placeholder="e.g. v2.0.0"
                      className="w-full h-10 rounded-xl bg-black border border-white/15 px-3.5 text-white placeholder-zinc-500 outline-none focus:border-amber-500 text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Type Specific URL Inputs & Presets */}
              {formType === "build" && (
                <div className="space-y-3 p-3.5 rounded-xl border border-white/10 bg-black/60">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                      <Sparkles size={11} className="text-amber-400" />
                      <span>Quick Presets:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormTitle("AIIC Bal Bhawan Institutional Platform (Part 2)");
                        setFormVersion("v2.0.0");
                        setFormBuildUrl("https://aiic-bbs.vercel.app");
                        setFormEnvironment("production");
                        setFormDescription("Official AIIC Web Platform Part 2 featuring institutional lecture archives, inline 1080p video player, LaTeX math rendering, RAG Sentinel pgvector knowledge engine, and interactive code sandboxes.");
                        setFormTags("website, part-2, production, nextjs, ai-rag, bal-bhawan");
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[10.5px] transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>⚡ Website Part 2 (Live Platform)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormTitle("AIIC Bal Bhawan Portal (Part 1 Legacy)");
                        setFormVersion("v1.0.0");
                        setFormBuildUrl("https://aiic-bbs.vercel.app");
                        setFormEnvironment("production");
                        setFormDescription("Initial foundation build for AIIC Bal Bhawan featuring student onboarding, foundational curriculum, and club registration.");
                        setFormTags("website, part-1, foundation, bal-bhawan");
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 font-mono text-[10.5px] transition-all cursor-pointer"
                    >
                      <span>Website Part 1 (Legacy)</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-zinc-300 font-semibold mb-1">Live Build / Website URL *</label>
                      <input
                        type="text"
                        placeholder="https://aiic-bbs.vercel.app"
                        value={formBuildUrl}
                        onChange={(e) => setFormBuildUrl(e.target.value)}
                        className="w-full h-10 rounded-xl bg-black border border-white/15 px-3.5 text-white placeholder-zinc-500 outline-none focus:border-amber-500 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-300 font-semibold mb-1">Target Environment</label>
                      <select
                        value={formEnvironment}
                        onChange={(e) => setFormEnvironment(e.target.value as any)}
                        className="w-full h-10 rounded-xl bg-black border border-white/15 px-3 text-white outline-none focus:border-amber-500 font-mono text-xs"
                      >
                        <option value="production">Production</option>
                        <option value="staging">Staging</option>
                        <option value="preview">Preview</option>
                        <option value="release">Release</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {formType === "video" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-zinc-300 font-semibold">YouTube URL *</label>
                        <button
                          type="button"
                          disabled={isFetchingYtMeta || !formYoutubeUrl.trim()}
                          onClick={() => fetchAndAutofillYoutubeMeta(formYoutubeUrl)}
                          className="text-[10px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer disabled:opacity-40"
                        >
                          {isFetchingYtMeta ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                          <span>Auto-Fetch Info</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={formYoutubeUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormYoutubeUrl(val);
                          if (getYouTubeId(val)) {
                            fetchAndAutofillYoutubeMeta(val);
                          }
                        }}
                        onPaste={(e) => {
                          const pasted = e.clipboardData.getData("text");
                          if (getYouTubeId(pasted)) {
                            setTimeout(() => fetchAndAutofillYoutubeMeta(pasted), 50);
                          }
                        }}
                        className="w-full h-10 rounded-xl bg-black border border-white/15 px-3.5 text-white placeholder-zinc-500 outline-none focus:border-amber-500 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-300 font-semibold mb-1">Duration</label>
                      <input
                        type="text"
                        placeholder="e.g. 45:30"
                        value={formDuration}
                        onChange={(e) => setFormDuration(e.target.value)}
                        className="w-full h-10 rounded-xl bg-black border border-white/15 px-3.5 text-white placeholder-zinc-500 outline-none focus:border-amber-500 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Real-time YouTube Link Detection, Live Thumbnail & Auto-Fetch Card */}
                  {getYouTubeId(formYoutubeUrl) && (
                    <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2.5">
                      <div className="flex items-center gap-3.5">
                        <div className="relative w-28 sm:w-32 aspect-video rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black">
                          <img
                            src={`https://img.youtube.com/vi/${getYouTubeId(formYoutubeUrl)}/hqdefault.jpg`}
                            alt="Video Preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play size={16} className="text-white fill-white" />
                          </div>
                        </div>
                        <div className="min-w-0 space-y-1 font-mono text-xs flex-1">
                          <div className="text-amber-400 font-semibold flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-emerald-400" />
                            <span>YouTube Video Detected</span>
                          </div>
                          <div className="text-zinc-400 text-[11px] truncate">
                            ID: <span className="text-white font-bold">{getYouTubeId(formYoutubeUrl)}</span>
                          </div>
                          <div className="text-zinc-500 text-[10px]">
                            1080p inline player enabled
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isFetchingYtMeta}
                          onClick={() => fetchAndAutofillYoutubeMeta(formYoutubeUrl)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-semibold text-[11px] font-mono hover:bg-amber-400 shadow-md active:scale-95 disabled:opacity-40 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          {isFetchingYtMeta ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          <span>{isFetchingYtMeta ? "Fetching..." : "Auto-Fill Info"}</span>
                        </button>
                      </div>

                      {isFetchingYtMeta && (
                        <div className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5 animate-pulse pt-1 border-t border-white/5">
                          <Loader2 size={12} className="animate-spin" />
                          <span>Fetching video title, description, speaker &amp; tags from YouTube...</span>
                        </div>
                      )}

                      {ytMetaFeedback && (
                        <div className="text-[11px] font-mono text-emerald-300 flex items-center gap-1 pt-1 border-t border-emerald-500/20">
                          <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                          <span className="truncate">{ytMetaFeedback}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {formType === "repository" && (
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">GitHub Repository URL *</label>
                  <input
                    type="text"
                    required
                    placeholder="https://github.com/AIIC-Organization/aiic-platform"
                    value={formGithubUrl}
                    onChange={(e) => setFormGithubUrl(e.target.value)}
                    className="w-full h-10 rounded-xl bg-black border border-white/15 px-3.5 text-white placeholder-zinc-500 outline-none focus:border-amber-500 text-xs font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Description / Summary</label>
                <textarea
                  rows={2}
                  placeholder="Summary of this lecture, source, or document..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-xl bg-black border border-white/15 p-3 text-white placeholder-zinc-500 outline-none focus:border-amber-500 text-xs leading-relaxed"
                />
              </div>

              {formType === "document" && (
                <div className="space-y-3 rounded-xl border border-white/10 bg-black/60 p-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 flex-wrap gap-2">
                    <label className="text-zinc-300 font-semibold text-xs flex items-center gap-1.5">
                      <FileText size={14} className="text-amber-400" />
                      <span>Document Input Method</span>
                    </label>
                    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/10 font-mono text-[10px]">
                      <button
                        type="button"
                        onClick={() => setDocInputMode("upload")}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          docInputMode === "upload"
                            ? "bg-amber-500 text-black font-bold shadow"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        📂 Upload Any File
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocInputMode("text")}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          docInputMode === "text"
                            ? "bg-amber-500 text-black font-bold shadow"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        ✍️ Plain Text / Notes
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocInputMode("link")}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          docInputMode === "link"
                            ? "bg-amber-500 text-black font-bold shadow"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        🔗 Web Link
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: File Upload (PDF, Word, TXT, Markdown, etc.) */}
                  {docInputMode === "upload" && (
                    <div className="space-y-2">
                      <input
                        type="file"
                        id="document-file-picker"
                        accept=".pdf,.doc,.docx,.txt,.md,.rtf,.tex,.csv,.json,.epub"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileProcess(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />

                      {formFile ? (
                        <div className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 font-mono text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-white font-semibold truncate">{formFile.name}</p>
                              <p className="text-[10px] text-zinc-400">{Math.round(formFile.size / 1024)} KB · {formFile.type || "Document File"}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormFile(null);
                              const input = document.getElementById("document-file-picker") as HTMLInputElement;
                              if (input) input.value = "";
                            }}
                            className="px-2.5 py-1 rounded bg-white/10 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-300 text-[10px] cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label
                          htmlFor="document-file-picker"
                          className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-white/20 hover:border-amber-400 bg-white/[0.02] hover:bg-amber-500/[0.03] transition-all cursor-pointer text-center space-y-2 group"
                        >
                          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                            <Upload size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white group-hover:text-amber-300">
                              Click to select file or drag and drop
                            </p>
                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                              Supports PDF, Word (.docx), Markdown (.md), Text (.txt), JSON, etc.
                            </p>
                          </div>
                        </label>
                      )}
                    </div>
                  )}

                  {/* Mode 2: Plain Text / Notes / Markdown */}
                  {docInputMode === "text" && (
                    <div>
                      <label className="block text-zinc-400 text-[11px] mb-1 font-mono">
                        Document Content / Notes (Plain Text or Markdown)
                      </label>
                      <textarea
                        rows={5}
                        placeholder="Type or paste your notes, syllabus, curriculum, or lecture summary here..."
                        value={formContent}
                        onChange={(e) => setFormContent(e.target.value)}
                        className="w-full rounded-xl bg-black border border-white/15 p-3 text-white placeholder-zinc-500 outline-none focus:border-amber-500 text-xs font-mono leading-relaxed"
                      />
                    </div>
                  )}

                  {/* Mode 3: Document URL Link */}
                  {docInputMode === "link" && (
                    <div>
                      <label className="block text-zinc-400 text-[11px] mb-1 font-mono">
                        Direct Document URL (Google Drive, Cloud Storage, PDF link)
                      </label>
                      <input
                        type="url"
                        placeholder="https://drive.google.com/... or https://domain.com/notes.pdf"
                        value={formDocumentUrl}
                        onChange={(e) => setFormDocumentUrl(e.target.value)}
                        className="w-full h-10 rounded-xl bg-black border border-white/15 px-3.5 text-white placeholder-zinc-500 outline-none focus:border-amber-500 text-xs font-mono"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ─── Auto-Quiz Active Banner ─── */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs font-mono text-amber-300">
                <Zap size={14} className="text-amber-400 fill-amber-400 shrink-0 animate-pulse" />
                <span>⚡ Auto-Quiz Active: A 4-question knowledge assessment will automatically be generated and linked to this uploaded source.</span>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="lecture 3, ai, multi-agent, rlm"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className="w-full h-10 rounded-xl bg-black border border-white/15 px-3.5 text-white placeholder-zinc-500 outline-none focus:border-amber-500 text-xs font-mono"
                />
              </div>

              {actionError && (
                <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs font-mono flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {actionSuccess && (
                <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 font-mono text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 text-black font-semibold font-mono text-xs hover:bg-amber-400 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  {isActionSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  <span>{isActionSubmitting ? "Indexing..." : "Publish & Vectorize"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Edit Source / Lecture Modal ─── */}
      {isEditModalOpen && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-white/20 bg-[#080808] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-white">
                <Edit size={18} className="text-amber-400" />
                <h3 className="font-bold text-base">Edit Archive Record: {editingRecord.archiveId}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-400 hover:text-white font-mono text-xs p-1"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleUpdateSource} className="space-y-4 font-sans text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full h-10 rounded-xl bg-black border border-white/15 px-3.5 text-white placeholder-zinc-500 outline-none focus:border-amber-500 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Academic Session</label>
                  <select
                    value={formSession}
                    onChange={(e) => setFormSession(e.target.value)}
                    className="w-full h-10 rounded-xl bg-black border border-white/15 px-3 text-white outline-none focus:border-amber-500 font-mono text-xs"
                  >
                    <option value="2026–27">2026–27</option>
                    <option value="2025–26">2025–26</option>
                    <option value="2024–25">2024–25</option>
                  </select>
                </div>

                {editingRecord.type === "video" && (
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Speaker</label>
                    <input
                      type="text"
                      value={formSpeaker}
                      onChange={(e) => setFormSpeaker(e.target.value)}
                      className="w-full h-10 rounded-xl bg-black border border-white/15 px-3.5 text-white outline-none focus:border-amber-500 text-xs font-mono"
                    />
                  </div>
                )}

                {editingRecord.type === "document" && (
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Category</label>
                    <input
                      type="text"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full h-10 rounded-xl bg-black border border-white/15 px-3.5 text-white outline-none focus:border-amber-500 text-xs font-mono"
                    />
                  </div>
                )}

                {editingRecord.type === "build" && (
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Version</label>
                    <input
                      type="text"
                      value={formVersion}
                      onChange={(e) => setFormVersion(e.target.value)}
                      className="w-full h-10 rounded-xl bg-black border border-white/15 px-3.5 text-white outline-none focus:border-amber-500 text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              {editingRecord.type === "video" && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-zinc-300 font-semibold">YouTube URL</label>
                      <button
                        type="button"
                        disabled={isFetchingYtMeta || !formYoutubeUrl.trim()}
                        onClick={() => fetchAndAutofillYoutubeMeta(formYoutubeUrl)}
                        className="text-[10px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer disabled:opacity-40"
                      >
                        {isFetchingYtMeta ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                        <span>Auto-Fetch Info</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={formYoutubeUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormYoutubeUrl(val);
                        if (getYouTubeId(val)) {
                          fetchAndAutofillYoutubeMeta(val);
                        }
                      }}
                      onPaste={(e) => {
                        const pasted = e.clipboardData.getData("text");
                        if (getYouTubeId(pasted)) {
                          setTimeout(() => fetchAndAutofillYoutubeMeta(pasted), 50);
                        }
                      }}
                      className="w-full h-10 rounded-xl bg-black border border-white/15 px-3.5 text-white outline-none focus:border-amber-500 text-xs font-mono"
                    />
                  </div>

                  {/* Real-time YouTube Link Detection & Thumbnail Preview */}
                  {getYouTubeId(formYoutubeUrl) && (
                    <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2.5">
                      <div className="flex items-center gap-3.5">
                        <div className="relative w-28 sm:w-32 aspect-video rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black">
                          <img
                            src={`https://img.youtube.com/vi/${getYouTubeId(formYoutubeUrl)}/hqdefault.jpg`}
                            alt="Video Preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play size={16} className="text-white fill-white" />
                          </div>
                        </div>
                        <div className="min-w-0 space-y-1 font-mono text-xs flex-1">
                          <div className="text-amber-400 font-semibold flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-emerald-400" />
                            <span>YouTube Video Active</span>
                          </div>
                          <div className="text-zinc-400 text-[11px] truncate">
                            ID: <span className="text-white font-bold">{getYouTubeId(formYoutubeUrl)}</span>
                          </div>
                          <div className="text-zinc-500 text-[10px]">
                            1080p inline playback enabled
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isFetchingYtMeta}
                          onClick={() => fetchAndAutofillYoutubeMeta(formYoutubeUrl)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-semibold text-[11px] font-mono hover:bg-amber-400 shadow-md active:scale-95 disabled:opacity-40 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          {isFetchingYtMeta ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          <span>{isFetchingYtMeta ? "Fetching..." : "Auto-Fill Info"}</span>
                        </button>
                      </div>

                      {isFetchingYtMeta && (
                        <div className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5 animate-pulse pt-1 border-t border-white/5">
                          <Loader2 size={12} className="animate-spin" />
                          <span>Fetching video title, description, speaker &amp; tags from YouTube...</span>
                        </div>
                      )}

                      {ytMetaFeedback && (
                        <div className="text-[11px] font-mono text-emerald-300 flex items-center gap-1 pt-1 border-t border-emerald-500/20">
                          <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                          <span className="truncate">{ytMetaFeedback}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {editingRecord.type === "repository" && (
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">GitHub URL</label>
                  <input
                    type="text"
                    value={formGithubUrl}
                    onChange={(e) => setFormGithubUrl(e.target.value)}
                    className="w-full h-10 rounded-xl bg-black border border-white/15 px-3.5 text-white outline-none focus:border-amber-500 text-xs font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-xl bg-black border border-white/15 p-3 text-white placeholder-zinc-500 outline-none focus:border-amber-500 text-xs leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className="w-full h-10 rounded-xl bg-black border border-white/15 px-3.5 text-white placeholder-zinc-500 outline-none focus:border-amber-500 text-xs font-mono"
                />
              </div>

              {actionError && (
                <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs font-mono flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {actionSuccess && (
                <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 font-mono text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 text-black font-semibold font-mono text-xs hover:bg-amber-400 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  {isActionSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>{isActionSubmitting ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-[#080808] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
              <Trash2 size={18} />
              <span>Delete Archive Record</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to permanently delete archive record{" "}
              <strong className="text-white font-mono">{deletingRecord.archiveId}</strong> (
              <em>{deletingRecord.title}</em>)? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 rounded-xl border border-white/10 font-mono text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isActionSubmitting}
                onClick={handleDeleteSource}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold font-mono text-xs hover:bg-rose-500 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                {isActionSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>{isActionSubmitting ? "Deleting..." : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── In-Archive Document Reader Modal ─── */}
      {activeReadingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#080808] border border-amber-500/30 p-4 sm:p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-amber-400 font-bold">{activeReadingDoc.archiveId}</span>
                <button
                  type="button"
                  onClick={() => setSourceChatRecord(activeReadingDoc)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-semibold transition-all cursor-pointer"
                >
                  <Sparkles size={11} className="text-amber-400 fill-amber-400" />
                  <span>Ask AI</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setActiveReadingDoc(null)}
                className="text-zinc-400 hover:text-white font-mono text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕ Close Reader
              </button>
            </div>
            <DocumentReader
              document={activeReadingDoc.document}
              title={activeReadingDoc.title}
              archiveId={activeReadingDoc.archiveId}
              session={activeReadingDoc.session}
              category={activeReadingDoc.document?.category || "Lecture Notes"}
              defaultContent={activeReadingDoc.description}
            />
          </div>
        </div>
      )}

      {/* ─── Dedicated Source-Specific AI Chat Modal ─── */}
      <SourceAiChatModal
        record={sourceChatRecord}
        isOpen={Boolean(sourceChatRecord)}
        onClose={() => setSourceChatRecord(null)}
      />

      {/* ─── Admin AI Quiz Studio Modal ─── */}
      <AdminQuizCreatorModal
        isOpen={isQuizStudioOpen}
        onClose={() => setIsQuizStudioOpen(false)}
        initialSourceIds={quizStudioSourceIds}
      />
    </div>
  );
}

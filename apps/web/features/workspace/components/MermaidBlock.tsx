"use client";

import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Check,
  Code2,
  AlertTriangle,
  Sparkles,
  Play,
  Maximize2,
  X,
  Loader2,
  ChevronLeft,
  Columns,
  Maximize,
  ExternalLink,
  Layers,
} from "lucide-react";
import { useToastStore } from "@/shared/stores/toast-store";

// Standard allowed Mermaid diagram declaration types
const VALID_MERMAID_TYPES = [
  "flowchart",
  "graph",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram-v2",
  "stateDiagram",
  "erDiagram",
  "journey",
  "gantt",
  "pie",
  "mindmap",
  "timeline",
  "gitGraph",
  "quadrantChart",
  "requirementDiagram",
  "c4Context",
  "sankey-beta",
  "xychart-beta",
  "block-beta",
];

export function extractAndValidateMermaid(rawText: string): { valid: boolean; code: string; type?: string; error?: string } {
  if (!rawText || typeof rawText !== "string") {
    return { valid: false, code: "", error: "No diagram content provided." };
  }

  let code = rawText.trim();

  // 1. Strip markdown fences ```mermaid ... ``` or ``` ... ```
  code = code.replace(/^```(?:mermaid)?\n?/i, "").replace(/```$/i, "").trim();

  // 2. Remove thinking blocks <think>...</think> or "Here's a thinking process:"
  code = code.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  if (/Here's a thinking process:/i.test(code)) {
    const parts = code.split(/Here's a thinking process:/i);
    if (parts.length > 1) {
      const splitBody = parts[1].split(/\n\n(?=flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap|timeline)/i);
      code = splitBody.slice(1).join("\n\n").trim() || splitBody[0].trim();
    }
  }

  // 3. Find where the actual diagram keyword starts
  const lines = code.split("\n");
  let startIndex = -1;
  let detectedType = "";

  for (let i = 0; i < lines.length; i++) {
    const lineTrimmed = lines[i].trim();
    if (!lineTrimmed || lineTrimmed.startsWith("%%") || lineTrimmed.startsWith("#")) continue;

    for (const validPrefix of VALID_MERMAID_TYPES) {
      if (lineTrimmed.startsWith(validPrefix)) {
        startIndex = i;
        detectedType = validPrefix;
        break;
      }
    }
    if (startIndex !== -1) break;
  }

  // If no standard header line found, check if it contains flowchart edges and prepend
  if (startIndex === -1) {
    if (/-->|---|==>|\.->/.test(code)) {
      code = `flowchart TD\n${code}`;
      detectedType = "flowchart";
      startIndex = 0;
    } else {
      return {
        valid: false,
        code,
        error: "No valid Mermaid diagram type detected (e.g. flowchart TD, graph LR, sequenceDiagram)",
      };
    }
  }

  // 4. Extract from the valid keyword onward
  const validLines = code.split("\n").slice(startIndex);

  // 5. Trim trailing non-mermaid conversational remarks or explanations
  const cleanLines: string[] = [];
  for (const line of validLines) {
    const l = line.trim();
    if (
      /^(?:Explanation|Note|Summary|Here is|In this|This diagram|The above)\b/i.test(l) &&
      !l.includes("-->") &&
      !l.includes("[") &&
      !l.includes("{") &&
      !l.includes("(")
    ) {
      break;
    }
    cleanLines.push(line);
  }

  const finalCode = cleanLines.join("\n").trim();

  if (!finalCode) {
    return { valid: false, code: "", error: "Extracted diagram definition is empty." };
  }

  return { valid: true, code: finalCode, type: detectedType };
}

export function MermaidBlock({ chart }: { chart: string }) {
  const [currentCode, setCurrentCode] = useState(chart);
  const [editorCode, setEditorCode] = useState(chart);
  const [svg, setSvg] = useState<string>("");
  const [previewSvg, setPreviewSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPopoutOpen, setIsPopoutOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"source" | "preview">("source");
  const [isFixingWithAi, setIsFixingWithAi] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setCurrentCode(chart);
    setEditorCode(chart);
  }, [chart]);

  // Main diagram renderer in chat
  useEffect(() => {
    let isCancelled = false;
    const validation = extractAndValidateMermaid(currentCode);

    if (!validation.valid) {
      setError(validation.error || "Invalid Mermaid syntax");
      setSvg("");
      return;
    }

    const render = async () => {
      try {
        setError(null);
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          theme: "dark",
          securityLevel: "loose",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          themeVariables: {
            darkMode: true,
            background: "transparent",
            primaryColor: "#0ea5e9",
            primaryTextColor: "#ffffff",
            primaryBorderColor: "#38bdf8",
            lineColor: "#38bdf8",
            secondaryColor: "#0f172a",
            tertiaryColor: "#020617",
          },
        });

        // Pre-validate parse before render to prevent d3 error element injection
        try {
          await mermaid.parse(validation.code);
        } catch (parseErr: any) {
          const rawErr = parseErr?.message || String(parseErr);
          const cleanErr = rawErr
            .replace(/Syntax error in text\s*\/\s*mermaid version\s*[\d.]+/gi, "Syntax error in diagram definition")
            .replace(/\n\s*at\s+[\s\S]+/g, "")
            .trim();
          setError(cleanErr);
          setSvg("");
          // Clean up any stray error SVG nodes in DOM
          if (typeof document !== "undefined") {
            document.querySelectorAll("#d3-render-error, [id^='d3-render-error']").forEach((el) => el.remove());
          }
          return;
        }

        const id = `mmd_chat_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const { svg } = await mermaid.render(id, validation.code);
        if (!isCancelled) {
          setSvg(svg);
          setError(null);
        }
      } catch (err: any) {
        if (!isCancelled) {
          const cleanErr = (err?.message || String(err))
            .replace(/Syntax error in text\s*\/\s*mermaid version\s*[\d.]+/gi, "Syntax error in diagram definition")
            .replace(/\n\s*at\s+[\s\S]+/g, "")
            .trim();
          setError(cleanErr);
          setSvg("");
          if (typeof document !== "undefined") {
            document.querySelectorAll("#d3-render-error, [id^='d3-render-error']").forEach((el) => el.remove());
          }
        }
      }
    };

    render();
    return () => {
      isCancelled = true;
    };
  }, [currentCode]);

  // Popout preview renderer
  useEffect(() => {
    if (!isPopoutOpen) return;
    let isCancelled = false;
    const validation = extractAndValidateMermaid(editorCode);

    if (!validation.valid) {
      setPreviewError(validation.error || "Invalid diagram syntax");
      setPreviewSvg("");
      return;
    }

    const renderPreview = async () => {
      try {
        setPreviewError(null);
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          themeVariables: {
            darkMode: true,
            background: "transparent",
            primaryColor: "#0ea5e9",
            primaryTextColor: "#ffffff",
            primaryBorderColor: "#38bdf8",
            lineColor: "#38bdf8",
            secondaryColor: "#0f172a",
            tertiaryColor: "#020617",
          },
        });

        const id = `mmd_prev_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const { svg } = await mermaid.render(id, validation.code);
        if (!isCancelled) {
          setPreviewSvg(svg);
          setPreviewError(null);
        }
      } catch (err: any) {
        if (!isCancelled) {
          const cleanErr = (err?.message || String(err))
            .replace(/Syntax error in text\s*\/\s*mermaid version\s*[\d.]+/gi, "Syntax error in diagram definition")
            .replace(/\n\s*at\s+[\s\S]+/g, "")
            .trim();
          setPreviewError(cleanErr);
          setPreviewSvg("");
        }
      }
    };

    renderPreview();
    return () => {
      isCancelled = true;
    };
  }, [editorCode, isPopoutOpen]);

  const handleOpenPopout = () => {
    setEditorCode(currentCode);
    setMobileTab(error ? "source" : "preview");
    setIsPopoutOpen(true);
  };

  const handleApplyChanges = () => {
    setCurrentCode(editorCode);
    setIsPopoutOpen(false);
    useToastStore.getState().addToast({
      title: "Diagram Updated",
      body: "Changes applied to chat diagram.",
      variant: "success",
    });
  };

  const copySource = () => {
    navigator.clipboard.writeText(editorCode.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFixWithAi = async () => {
    setIsFixingWithAi(true);
    try {
      const res = await fetch("/api/corvus/fix-diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chart: editorCode,
          error: error || previewError || "Syntax error or missing diagram type",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.chart) {
        setEditorCode(data.chart);
        setCurrentCode(data.chart);
        setMobileTab("preview");
        useToastStore.getState().addToast({
          title: "Diagram Fixed by AI",
          body: "Valid Mermaid syntax generated and rendered successfully.",
          variant: "success",
        });
      } else {
        useToastStore.getState().addToast({
          title: "AI Repair Notice",
          body: data.error || "Could not automatically fix this syntax. You can edit it manually.",
          variant: "error",
        });
      }
    } catch (err: any) {
      useToastStore.getState().addToast({
        title: "Connection Error",
        body: err.message || "Failed to contact AI repair service.",
        variant: "error",
      });
    } finally {
      setIsFixingWithAi(false);
    }
  };

  const editorLines = editorCode.split("\n");

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. COMPACT CHAT VIEW (NEVER SHOWS RAW SOURCE CODE DIRECTLY)
      ────────────────────────────────────────────────────────────── */}
      <div className="my-2 overflow-hidden rounded-lg border border-white/[0.08] bg-[#080b12]/95 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-all">
        {/* Sleek Minimal Header */}
        <div className="flex h-7 items-center justify-between border-b border-white/[0.06] bg-[#0b0f19]/80 px-2.5 font-mono text-[10px]">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-semibold uppercase tracking-wider text-[9.5px]">
              Diagram
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleOpenPopout}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-text-muted hover:bg-white/[0.06] hover:text-text-primary transition-colors text-[10.5px] cursor-pointer"
            >
              <Code2 size={11} />
              <span>Source</span>
            </button>

            <button
              type="button"
              onClick={copySource}
              title="Copy Source"
              className="flex h-5 w-5 items-center justify-center rounded text-text-muted hover:bg-white/[0.06] hover:text-text-primary transition-colors cursor-pointer"
            >
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            </button>
          </div>
        </div>

        {/* Diagram Card Body */}
        <div className="p-2 sm:p-3">
          {error ? (
            /* Compact Error State */
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-950/15 p-3 font-mono text-left">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                <div>
                  <div className="text-[12px] font-semibold text-amber-300">
                    Mermaid Diagram Needs Attention
                  </div>
                  <div className="text-[11px] text-text-secondary">
                    The diagram could not be rendered due to a syntax issue.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isFixingWithAi}
                  onClick={handleFixWithAi}
                  className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/20 px-2.5 py-1 text-[11px] font-medium text-cyan-300 hover:bg-cyan-500/30 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isFixingWithAi ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  <span>{isFixingWithAi ? "Fixing..." : "Fix with AI"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenPopout}
                  className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-text-secondary hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Code2 size={12} />
                  <span>Open Editor</span>
                </button>
              </div>
            </div>
          ) : svg ? (
            <div
              className="flex items-center justify-center overflow-auto max-h-[260px] sm:max-h-[400px] py-1 max-w-full [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:max-h-full cursor-pointer scrollbar-thin scrollbar-thumb-white/10"
              onClick={handleOpenPopout}
              title="Click to open Mermaid editor"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="flex h-14 items-center justify-center font-mono text-[11px] text-text-faint">
              Rendering diagram...
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SLIDE-OVER SIDE POPOUT (DESKTOP: RIGHT SIDE / MOBILE: FULL SCREEN)
      ────────────────────────────────────────────────────────────── */}
      {isPopoutOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop with subtle blur */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsPopoutOpen(false)}
          />

          {/* Slide-over panel container */}
          <div
            className={`relative z-10 flex h-full flex-col bg-[#07090e] border-l border-white/10 shadow-2xl transition-all duration-300 ease-in-out ${
              isFullscreen
                ? "w-full"
                : "w-full sm:w-[540px] md:w-[600px] lg:w-[680px]"
            }`}
          >
            {/* ── Header ── */}
            <div className="flex h-12 items-center justify-between border-b border-white/[0.08] bg-[#0b0e17] px-4 font-mono">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPopoutOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-text-muted hover:bg-white/[0.06] hover:text-white transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-2">
                  <Layers size={15} className="text-cyan-400" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                    Mermaid Diagram Editor
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsFullscreen((v) => !v)}
                  title={isFullscreen ? "Exit Fullscreen" : "Expand Fullscreen"}
                  className="hidden sm:flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-text-muted hover:bg-white/[0.06] hover:text-white transition-colors"
                >
                  <Maximize2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsPopoutOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-text-muted hover:bg-white/[0.06] hover:text-white transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* ── Mobile View Tabs ── */}
            <div className="flex sm:hidden border-b border-white/[0.08] bg-black/40 p-1 font-mono text-xs">
              <button
                type="button"
                onClick={() => setMobileTab("source")}
                className={`flex-1 py-1.5 rounded-md text-center font-medium transition-colors ${
                  mobileTab === "source"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-text-muted hover:text-white"
                }`}
              >
                Source
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("preview")}
                className={`flex-1 py-1.5 rounded-md text-center font-medium transition-colors ${
                  mobileTab === "preview"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-text-muted hover:text-white"
                }`}
              >
                Preview
              </button>
            </div>

            {/* ── Body: Split on Desktop / Tabbed on Mobile ── */}
            <div className="flex-1 overflow-hidden flex flex-col sm:grid sm:grid-rows-2">
              {/* SOURCE SECTION */}
              <div
                className={`flex flex-col flex-1 sm:flex-initial sm:row-span-1 border-b border-white/[0.08] bg-[#05070a] overflow-hidden ${
                  mobileTab === "source" ? "flex" : "hidden sm:flex"
                }`}
              >
                {/* Source Toolbar */}
                <div className="flex h-8 items-center justify-between border-b border-white/[0.06] bg-[#090c13] px-3 font-mono text-[10.5px]">
                  <div className="flex items-center gap-2 text-text-muted">
                    <span className="uppercase text-[9px] font-semibold tracking-wider text-cyan-400/80">
                      Mermaid Source Definition
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={copySource}
                      className="flex items-center gap-1 rounded px-2 py-0.5 text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {/* Editor with Line Numbers */}
                <div className="relative flex-1 overflow-auto flex font-mono text-[12px] leading-[1.6] bg-[#030508]">
                  {/* Line Numbers Column */}
                  <div className="select-none py-3 px-2.5 text-right font-mono text-[11px] text-zinc-600 border-r border-white/[0.05] bg-[#020305] shrink-0">
                    {editorLines.map((_, i) => (
                      <div key={i} className="leading-[1.6]">
                        {i + 1}
                      </div>
                    ))}
                  </div>

                  {/* Monospace Textarea (No word wrapping to preserve indentation and Mermaid edges) */}
                  <textarea
                    value={editorCode}
                    onChange={(e) => setEditorCode(e.target.value)}
                    spellCheck={false}
                    className="flex-1 w-full resize-none bg-transparent p-3 font-mono text-[12px] leading-[1.6] text-cyan-200 placeholder:text-zinc-600 outline-none focus:ring-0 selection:bg-cyan-500/30 whitespace-pre overflow-x-auto"
                    placeholder="flowchart TD&#10;  A[Start] --> B[Process]"
                  />
                </div>
              </div>

              {/* PREVIEW SECTION */}
              <div
                className={`flex flex-col flex-1 sm:flex-initial sm:row-span-1 bg-[#070a10] overflow-hidden ${
                  mobileTab === "preview" ? "flex" : "hidden sm:flex"
                }`}
              >
                {/* Preview Toolbar */}
                <div className="flex h-8 items-center justify-between border-b border-white/[0.06] bg-[#090c13] px-3 font-mono text-[10.5px]">
                  <span className="uppercase text-[9px] font-semibold tracking-wider text-text-muted">
                    Live Rendered Preview
                  </span>
                  {previewError && (
                    <span className="text-[10.5px] text-amber-400 flex items-center gap-1 font-mono">
                      <AlertTriangle size={11} /> Syntax Error
                    </span>
                  )}
                </div>

                {/* Preview Diagram Display Area */}
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-radial-gradient">
                  {previewError ? (
                    <div className="w-full max-w-md rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 font-mono text-left">
                      <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs mb-1">
                        <AlertTriangle size={14} /> Invalid Diagram Definition
                      </div>
                      <div className="text-[11px] text-text-secondary leading-relaxed mb-2">
                        {previewError}
                      </div>
                      <button
                        type="button"
                        disabled={isFixingWithAi}
                        onClick={handleFixWithAi}
                        className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/30 transition-all cursor-pointer"
                      >
                        {isFixingWithAi ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                        <span>Fix with AI</span>
                      </button>
                    </div>
                  ) : previewSvg ? (
                    <div
                      className="max-w-full overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto py-2"
                      dangerouslySetInnerHTML={{ __html: previewSvg }}
                    />
                  ) : (
                    <div className="font-mono text-xs text-text-muted">Rendering preview...</div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Bottom Action Footer ── */}
            <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#0b0e17] px-4 py-3 font-mono text-xs">
              <button
                type="button"
                disabled={isFixingWithAi}
                onClick={handleFixWithAi}
                className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-3 py-2 font-semibold text-cyan-300 hover:bg-cyan-500/25 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isFixingWithAi ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                <span>Fix with AI</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPopoutOpen(false)}
                  className="rounded-xl px-3.5 py-2 text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleApplyChanges}
                  disabled={Boolean(previewError)}
                  className="rounded-xl bg-cyan-500 px-4 py-2 font-bold text-black hover:bg-cyan-400 active:scale-95 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
                >
                  Apply to Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

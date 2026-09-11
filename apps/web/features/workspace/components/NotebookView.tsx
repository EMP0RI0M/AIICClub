"use client";

import { useState } from "react";
import { cn } from "@corvus/ui";
import {
  Play,
  Plus,
  Trash2,
  RotateCcw,
  Loader2,
  Terminal,
  FileCode2,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import { runPythonCode } from "@/shared/lib/python-runtime";
import { useToastStore } from "@/shared/stores/toast-store";

export interface NotebookCell {
  id: string;
  type: "code" | "markdown";
  content: string;
  output?: {
    stdout?: string;
    stderr?: string;
    error?: string | null;
    result?: string;
    imageBase64?: string;
    executionCount?: number;
  };
  running?: boolean;
}

const DEFAULT_CELLS: NotebookCell[] = [
  {
    id: "cell-1",
    type: "markdown",
    content: `# 🪐 Interactive Data Science & Analytics Notebook
Welcome to your space's live Jupyter-style Notebook powered by our zero-latency Vercel Python serverless runtime.
- **Pre-installed packages:** \`numpy\`, \`pandas\`, \`matplotlib\`, \`sympy\`, \`reportlab\`, \`Pillow\`
- **Shortcuts:** Click **Run** (or Shift + Enter) to execute Python in real-time.`,
  },
  {
    id: "cell-2",
    type: "code",
    content: `import numpy as np
import matplotlib.pyplot as plt

# Generate sample dataset
np.random.seed(42)
x = np.linspace(0, 10, 100)
y = np.sin(x) + np.random.normal(0, 0.1, 100)

plt.figure(figsize=(7, 3.5))
plt.plot(x, np.sin(x), color='#0ea5e9', label='Theoretical Sine Wave', lw=2)
plt.scatter(x, y, color='#38bdf8', alpha=0.6, s=18, label='Observed Data Points')
plt.title('Real-Time Data Distribution', color='white', fontsize=12)
plt.grid(True, linestyle='--', alpha=0.25)
plt.legend(loc='upper right')
print("Model initialized. Processed 100 observation points.")`,
  },
];

export function NotebookView({
  channelName,
  storageKey,
  onBack,
}: {
  channelName: string;
  storageKey?: string;
  onBack?: () => void;
}) {
  const [cells, setCells] = useState<NotebookCell[]>(() => {
    if (typeof window !== "undefined" && storageKey) {
      try {
        const saved = localStorage.getItem(`corvus_nb_${storageKey}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_CELLS;
  });

  const [execCounter, setExecCounter] = useState(1);
  const [isExecutingAll, setIsExecutingAll] = useState(false);
  const [copiedCellId, setCopiedCellId] = useState<string | null>(null);

  const saveCells = (next: NotebookCell[]) => {
    setCells(next);
    if (typeof window !== "undefined" && storageKey) {
      try {
        localStorage.setItem(`corvus_nb_${storageKey}`, JSON.stringify(next));
      } catch {}
    }
  };

  const addCell = (type: "code" | "markdown", afterIndex?: number) => {
    const newCell: NotebookCell = {
      id: `cell-${Date.now()}`,
      type,
      content: type === "code" ? `# Write Python code here\nprint("Hello World")` : `### New Markdown Note`,
    };
    const next = [...cells];
    if (typeof afterIndex === "number") {
      next.splice(afterIndex + 1, 0, newCell);
    } else {
      next.push(newCell);
    }
    saveCells(next);
  };

  const updateCellContent = (id: string, content: string) => {
    const next = cells.map((c) => (c.id === id ? { ...c, content } : c));
    saveCells(next);
  };

  const deleteCell = (id: string) => {
    if (cells.length <= 1) return;
    const next = cells.filter((c) => c.id !== id);
    saveCells(next);
  };

  const copyCellCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCellId(id);
    setTimeout(() => setCopiedCellId(null), 1800);
  };

  const runCell = async (id: string) => {
    const target = cells.find((c) => c.id === id);
    if (!target || target.type !== "code") return;

    setCells((prev) =>
      prev.map((c) => (c.id === id ? { ...c, running: true } : c))
    );

    try {
      const res = await runPythonCode(target.content);
      const currentCount = execCounter;
      setExecCounter((c) => c + 1);

      const next = cells.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            running: false,
            output: {
              stdout: res.stdout,
              stderr: res.stderr,
              error: res.error,
              result: res.data?.result,
              imageBase64: res.data?.image_base64,
              executionCount: currentCount,
            },
          };
        }
        return c;
      });
      saveCells(next);
    } catch (err: any) {
      const next = cells.map((c) =>
        c.id === id
          ? {
              ...c,
              running: false,
              output: {
                error: err.message || "Failed to execute cell",
              },
            }
          : c
      );
      saveCells(next);
    }
  };

  const runAllCells = async () => {
    setIsExecutingAll(true);
    for (const cell of cells) {
      if (cell.type === "code") {
        await runCell(cell.id);
      }
    }
    setIsExecutingAll(false);
  };

  const clearAllOutputs = () => {
    const next = cells.map((c) => ({ ...c, output: undefined }));
    saveCells(next);
    useToastStore.getState().addToast({
      title: "Outputs Cleared",
      body: "All notebook execution outputs have been reset.",
      variant: "info",
    });
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-[#07090e] text-text-primary">
      {/* ── Top Header Toolbar (Horizontally scrollable on mobile) ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0b0e17]/95 px-3 sm:px-4 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-text-muted hover:bg-white/[0.06] hover:text-text-primary md:hidden"
            >
              ←
            </button>
          )}
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/25">
              <Terminal size={13} />
            </div>
            <div className="flex min-w-0 items-center gap-1.5 truncate">
              <h1 className="truncate text-[13.5px] font-semibold text-text-primary">
                {channelName}
              </h1>
              <span className="shrink-0 rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.2 font-mono text-[9.5px] text-cyan-300">
                Py 3.12
              </span>
            </div>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto pl-2 scrollbar-none">
          <button
            type="button"
            disabled={isExecutingAll}
            onClick={runAllCells}
            className="flex items-center gap-1 rounded border border-cyan-500/35 bg-cyan-500/15 px-2.5 py-1 font-mono text-[11px] font-medium text-cyan-300 transition-all hover:bg-cyan-500/25 active:scale-95 disabled:opacity-50"
          >
            {isExecutingAll ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
            <span className="hidden xs:inline">Run All</span>
            <span className="xs:hidden">Run</span>
          </button>

          <button
            type="button"
            onClick={() => addCell("code")}
            className="flex items-center gap-1 rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-text-secondary hover:bg-white/[0.06] hover:text-text-primary transition-colors"
          >
            <Plus size={11} />
            <span>Code</span>
          </button>

          <button
            type="button"
            onClick={() => addCell("markdown")}
            className="flex items-center gap-1 rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-text-secondary hover:bg-white/[0.06] hover:text-text-primary transition-colors"
          >
            <Plus size={11} />
            <span>MD</span>
          </button>

          <button
            type="button"
            onClick={clearAllOutputs}
            title="Reset outputs"
            className="flex h-7 w-7 items-center justify-center rounded border border-white/[0.06] bg-white/[0.02] text-text-muted hover:bg-white/[0.06] hover:text-text-primary transition-colors"
          >
            <RotateCcw size={11} />
          </button>
        </div>
      </header>

      {/* ── Notebook Cell Container ── */}
      <div className="flex-1 overflow-y-auto p-2.5 sm:p-5 lg:p-6 space-y-3 max-w-4xl mx-auto w-full">
        {cells.map((cell, idx) => (
          <div
            key={cell.id}
            className="group relative flex flex-col rounded-lg border border-white/[0.07] bg-[#0c101a]/85 backdrop-blur-md transition-all hover:border-white/[0.14] shadow-[0_2px_12px_rgba(0,0,0,0.35)]"
          >
            {/* Cell Header Controls */}
            <div className="flex h-7 items-center justify-between border-b border-white/[0.05] bg-[#080b12]/90 px-2.5">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] font-medium text-cyan-400/80">
                  {cell.type === "code" ? (
                    cell.output?.executionCount ? `[${cell.output.executionCount}]` : "[ ]"
                  ) : (
                    "MD"
                  )}
                </span>
                <span className="rounded bg-white/[0.04] px-1 py-0.2 font-mono text-[9px] text-text-muted uppercase">
                  {cell.type}
                </span>
              </div>

              {/* Cell Action Bar */}
              <div className="flex items-center gap-1">
                {cell.type === "code" && (
                  <>
                    <button
                      type="button"
                      disabled={cell.running}
                      onClick={() => runCell(cell.id)}
                      title="Run Cell (Shift+Enter)"
                      className="flex h-5 w-5 items-center justify-center rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors"
                    >
                      {cell.running ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyCellCode(cell.id, cell.content)}
                      title="Copy code"
                      className="flex h-5 w-5 items-center justify-center rounded text-text-muted hover:bg-white/[0.06] hover:text-text-primary transition-colors"
                    >
                      {copiedCellId === cell.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => addCell("code", idx)}
                  title="Add code cell below"
                  className="flex h-5 w-5 items-center justify-center rounded text-text-muted hover:bg-white/[0.06] hover:text-text-primary transition-colors"
                >
                  <Plus size={10} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteCell(cell.id)}
                  title="Delete cell"
                  className="flex h-5 w-5 items-center justify-center rounded text-rose-400/70 hover:bg-rose-500/15 hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            </div>

            {/* Cell Editor Surface */}
            <div className="p-2.5 bg-[#0f1422]/60">
              <textarea
                value={cell.content}
                rows={Math.max(2, cell.content.split("\n").length)}
                onChange={(e) => updateCellContent(cell.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.shiftKey) {
                    e.preventDefault();
                    if (cell.type === "code") {
                      runCell(cell.id);
                    }
                  }
                }}
                className={cn(
                  "w-full resize-none bg-transparent font-mono text-[12.5px] leading-relaxed text-text-primary outline-none transition-colors selection:bg-cyan-500/30",
                  cell.type === "code" ? "text-cyan-200/90" : "text-text-primary"
                )}
                placeholder={cell.type === "code" ? "Write Python code..." : "Write Markdown..."}
              />
            </div>

            {/* Cell Output Display */}
            {cell.output && (
              <div className="border-t border-white/[0.06] bg-[#07090e] p-2.5 rounded-b-lg space-y-1.5">
                {/* Standard Output */}
                {cell.output.stdout && (
                  <pre className="overflow-x-auto font-mono text-[11.5px] text-text-secondary leading-relaxed whitespace-pre-wrap">
                    {cell.output.stdout}
                  </pre>
                )}

                {/* Return Result */}
                {cell.output.result && (
                  <div className="font-mono text-[11.5px] text-cyan-300">
                    <span className="text-text-faint mr-1.5">Out:</span>
                    {cell.output.result}
                  </div>
                )}

                {/* Dedicated Scaling Chart Output Container */}
                {cell.output.imageBase64 && (
                  <div className="mt-1.5 overflow-hidden rounded-lg border border-white/[0.08] bg-[#0b0e17] p-2 inline-block max-w-full">
                    <img
                      src={`data:image/png;base64,${cell.output.imageBase64}`}
                      alt="Generated Visual Plot"
                      className="max-h-[380px] w-full max-w-full rounded object-contain"
                    />
                  </div>
                )}

                {/* Error Traceback */}
                {cell.output.error && (
                  <div className="rounded-lg border border-rose-500/20 bg-rose-950/20 p-2 font-mono text-[11px] text-rose-300 whitespace-pre-wrap">
                    {cell.output.error}
                  </div>
                )}

                {/* Stderr */}
                {cell.output.stderr && (
                  <div className="font-mono text-[11px] text-amber-400/80 whitespace-pre-wrap">
                    {cell.output.stderr}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

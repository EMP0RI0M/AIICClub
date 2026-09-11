"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { cn } from "@corvus/ui";
import { Save, Check, AlertCircle, FileCode, X, RefreshCw } from "lucide-react";

interface MonacoVMEditorProps {
  projectId: string;
  activeFilePath: string | null;
  openFilePaths: string[];
  onCloseFile: (path: string) => void;
  onSelectFile: (path: string) => void;
}

function getLanguage(path: string): string {
  if (path.endsWith(".tsx") || path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".jsx") || path.endsWith(".js")) return "javascript";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".html")) return "html";
  if (path.endsWith(".md")) return "markdown";
  return "plaintext";
}

export function MonacoVMEditor({
  projectId,
  activeFilePath,
  openFilePaths,
  onCloseFile,
  onSelectFile,
}: MonacoVMEditorProps) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [currentRevision, setCurrentRevision] = useState<number>(1);
  const [saveStatus, setSaveStatus] = useState<"clean" | "saving" | "saved" | "error" | "conflict">("clean");
  const [conflictData, setConflictData] = useState<{ expected: number; current: number } | null>(null);

  const lastSavedContent = useRef<string>("");
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch file content and current revision from /api/studio/fs
  const loadFile = useCallback(() => {
    if (!activeFilePath || !projectId) {
      setContent("");
      setIsDirty(false);
      return;
    }

    setLoading(true);
    fetch(`/api/studio/fs?projectId=${encodeURIComponent(projectId)}&action=read&path=${encodeURIComponent(activeFilePath)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.content !== undefined) {
          setContent(data.content);
          lastSavedContent.current = data.content;
          setCurrentRevision(data.revision || 1);
          setIsDirty(false);
          setSaveStatus("clean");
          setConflictData(null);
        }
      })
      .catch((err) => console.error("Error reading file:", err))
      .finally(() => setLoading(false));
  }, [projectId, activeFilePath]);

  useEffect(() => {
    loadFile();
  }, [loadFile]);

  // 2. Save function with revision validation
  const saveFile = useCallback(
    async (fileContent: string, force = false) => {
      if (!activeFilePath || !projectId) return;

      setSaveStatus("saving");
      try {
        const res = await fetch("/api/studio/fs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            action: "write",
            path: activeFilePath,
            content: fileContent,
            expectedRevision: force ? undefined : currentRevision,
          }),
        });

        const data = await res.json();

        if (res.status === 409 && data.conflict) {
          setSaveStatus("conflict");
          setConflictData({
            expected: data.expectedRevision,
            current: data.currentRevision,
          });
          return;
        }

        if (res.ok) {
          lastSavedContent.current = fileContent;
          setCurrentRevision(data.revision || currentRevision + 1);
          setIsDirty(false);
          setSaveStatus("saved");
          setConflictData(null);
          setTimeout(() => setSaveStatus("clean"), 2000);
        } else {
          setSaveStatus("error");
        }
      } catch (err) {
        setSaveStatus("error");
      }
    },
    [projectId, activeFilePath, currentRevision]
  );

  // 3. Handle Editor Change with debounced save (2000ms)
  const handleEditorChange = (value: string | undefined) => {
    const val = value ?? "";
    setContent(val);

    const dirty = val !== lastSavedContent.current;
    setIsDirty(dirty);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (dirty && saveStatus !== "conflict") {
      debounceTimer.current = setTimeout(() => {
        void saveFile(val);
      }, 2000);
    }
  };

  // 4. Keyboard Shortcut Ctrl+S
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      void saveFile(content);
    }
  };

  if (!activeFilePath) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#0d1017] text-text-muted">
        <FileCode size={36} className="mb-2 opacity-30 text-accent" />
        <p className="font-mono text-xs">Select a file from the explorer to begin editing</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#0d1017]" onKeyDown={handleKeyDown}>
      {/* Tab Bar */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#090b0f] px-2">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {openFilePaths.map((filePath) => {
            const isActive = filePath === activeFilePath;
            const fileName = filePath.split("/").pop() || filePath;
            return (
              <div
                key={filePath}
                onClick={() => onSelectFile(filePath)}
                className={cn(
                  "group flex h-7 items-center gap-1.5 rounded-t px-2.5 font-mono text-[11.5px] cursor-pointer transition-colors select-none",
                  isActive
                    ? "bg-[#0d1017] text-white border-t-2 border-accent font-medium"
                    : "text-text-muted hover:bg-white/[0.03] hover:text-text-primary"
                )}
              >
                <span>{fileName}</span>
                {isActive && isDirty && (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseFile(filePath);
                  }}
                  className="ml-1 opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 rounded"
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2 pr-2">
          <span className="font-mono text-[10px] text-text-muted/60">rev {currentRevision}</span>
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-accent animate-pulse">
              <Save size={11} /> Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-400">
              <Check size={11} /> Saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-rose-400">
              <AlertCircle size={11} /> Save Error
            </span>
          )}
        </div>
      </div>

      {/* Conflict Resolution Banner */}
      {saveStatus === "conflict" && conflictData && (
        <div className="flex items-center justify-between bg-rose-500/15 border-b border-rose-500/30 px-3 py-1.5 text-xs text-rose-200">
          <div className="flex items-center gap-2 font-mono">
            <AlertCircle size={14} className="text-rose-400" />
            <span>Conflict: File modified on disk (Your rev: {conflictData.expected}, Server rev: {conflictData.current})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadFile}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-mono text-[10.5px]"
            >
              <RefreshCw size={11} /> Reload Server Version
            </button>
            <button
              type="button"
              onClick={() => saveFile(content, true)}
              className="px-2 py-0.5 rounded bg-rose-500 text-white font-mono text-[10.5px] font-semibold"
            >
              Overwrite
            </button>
          </div>
        </div>
      )}

      {/* Monaco Editor Canvas */}
      <div className="flex-1 min-h-0 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d1017]">
            <span className="font-mono text-xs text-text-muted animate-pulse">Loading file content...</span>
          </div>
        ) : (
          <Editor
            theme="vs-dark"
            path={activeFilePath}
            language={getLanguage(activeFilePath)}
            value={content}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: "on",
              padding: { top: 12 },
            }}
          />
        )}
      </div>
    </div>
  );
}

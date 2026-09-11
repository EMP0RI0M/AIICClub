"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@corvus/ui";
import {
  Folder,
  FolderOpen,
  FileCode2,
  FileText,
  FileJson,
  FilePlus,
  FolderPlus,
  Trash2,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  FolderTree,
  Plus
} from "lucide-react";

interface StudioFileTreeProps {
  projectId: string;
  activeFilePath: string | null;
  onSelectFile: (path: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: TreeNode[];
}

function getFileIcon(name: string) {
  if (name.endsWith(".json")) return <FileJson size={13} className="text-yellow-400 shrink-0" />;
  if (name.endsWith(".tsx") || name.endsWith(".ts")) return <FileCode2 size={13} className="text-sky-400 shrink-0" />;
  if (name.endsWith(".css")) return <FileCode2 size={13} className="text-indigo-400 shrink-0" />;
  if (name.endsWith(".md")) return <FileText size={13} className="text-emerald-400 shrink-0" />;
  return <FileText size={13} className="text-white/60 shrink-0" />;
}

// Fallback project template files when a VM is initializing or newly created
const DEFAULT_PROJECT_FILES = [
  "app/layout.tsx",
  "app/page.tsx",
  "app/globals.css",
  "components/Header.tsx",
  "components/Hero.tsx",
  "package.json",
  "tailwind.config.ts",
  "tsconfig.json",
];

export function StudioFileTree({
  projectId,
  activeFilePath,
  onSelectFile,
}: StudioFileTreeProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(["app", "components"]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingType, setCreatingType] = useState<"file" | "directory" | null>(null);
  const [targetParent, setTargetParent] = useState<string>("");
  const [newItemName, setNewItemName] = useState("");

  const loadTree = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/fs?projectId=${encodeURIComponent(projectId)}&action=tree`);
      if (res.ok) {
        const data = await res.json();
        const rawEntries: string[] = data.entries && data.entries.length > 0 ? data.entries : DEFAULT_PROJECT_FILES;
        setTree(buildTreeFromEntries(rawEntries));
      } else {
        // Use default scaffold template on new/unprovisioned instances
        setTree(buildTreeFromEntries(DEFAULT_PROJECT_FILES));
      }
    } catch (err: any) {
      console.warn("[STUDIO_FILE_TREE_FALLBACK]", err.message);
      setTree(buildTreeFromEntries(DEFAULT_PROJECT_FILES));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const toggleDir = (dirPath: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) {
        next.delete(dirPath);
      } else {
        next.add(dirPath);
      }
      return next;
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !creatingType) return;

    const fullPath = targetParent ? `${targetParent}/${newItemName.trim()}` : newItemName.trim();
    const action = creatingType === "file" ? "write" : "mkdir";

    try {
      const res = await fetch("/api/studio/fs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          action,
          path: fullPath,
          content: creatingType === "file" ? "" : undefined,
        }),
      });

      if (res.ok) {
        setNewItemName("");
        setCreatingType(null);
        await loadTree();
        if (creatingType === "file") onSelectFile(fullPath);
      }
    } catch (err) {
      console.error("Create failed:", err);
    }
  };

  const handleDelete = async (filePath: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      const res = await fetch("/api/studio/fs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          action: "delete",
          path: filePath,
        }),
      });

      if (res.ok) {
        await loadTree();
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const renderNodes = (nodes: TreeNode[], depth = 0) => {
    return nodes.map((node) => {
      const isDir = node.type === "directory";
      const isExpanded = expandedDirs.has(node.path);
      const isSelected = activeFilePath === node.path;

      return (
        <div key={node.path} className="flex flex-col">
          <div
            onClick={() => {
              if (isDir) {
                toggleDir(node.path);
              } else {
                onSelectFile(node.path);
              }
            }}
            style={{ paddingLeft: `${depth * 14 + 10}px` }}
            className={cn(
              "group flex h-7 items-center justify-between pr-2 font-mono text-xs cursor-pointer select-none rounded transition-colors",
              isSelected
                ? "bg-white/10 text-orange-400 font-semibold"
                : "text-white/70 hover:bg-white/[0.04] hover:text-white"
            )}
          >
            <div className="flex items-center gap-1.5 truncate">
              {isDir ? (
                <>
                  <span className="text-white/40 group-hover:text-white transition-colors">
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </span>
                  {isExpanded ? (
                    <FolderOpen size={13} className="text-orange-400 shrink-0" />
                  ) : (
                    <Folder size={13} className="text-white/50 shrink-0" />
                  )}
                </>
              ) : (
                <>
                  <span className="w-3" />
                  {getFileIcon(node.name)}
                </>
              )}
              <span className="truncate">{node.name}</span>
            </div>

            {/* Actions */}
            <div
              className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              {isDir && (
                <>
                  <button
                    type="button"
                    title="New File"
                    onClick={() => {
                      setTargetParent(node.path);
                      setCreatingType("file");
                      setExpandedDirs((prev) => new Set(prev).add(node.path));
                    }}
                    className="p-0.5 text-white/50 hover:text-white rounded"
                  >
                    <FilePlus size={11} />
                  </button>
                  <button
                    type="button"
                    title="New Folder"
                    onClick={() => {
                      setTargetParent(node.path);
                      setCreatingType("directory");
                      setExpandedDirs((prev) => new Set(prev).add(node.path));
                    }}
                    className="p-0.5 text-white/50 hover:text-white rounded"
                  >
                    <FolderPlus size={11} />
                  </button>
                </>
              )}
              <button
                type="button"
                title="Delete"
                onClick={() => handleDelete(node.path, node.name)}
                className="p-0.5 text-white/50 hover:text-rose-400 rounded"
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>

          {isDir && isExpanded && node.children && renderNodes(node.children, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="flex h-full flex-col bg-[#0b0d14] select-none">
      {/* Top Explorer Header Bar */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#0f111a] px-3">
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-white/80">
          <FolderTree size={13} className="text-orange-400" />
          <span>Files</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Refresh Files"
            onClick={loadTree}
            className="flex h-6 w-6 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw size={11} className={loading ? "animate-spin text-orange-400" : ""} />
          </button>
          <button
            type="button"
            title="New File"
            onClick={() => {
              setTargetParent("");
              setCreatingType("file");
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
          >
            <FilePlus size={12} />
          </button>
          <button
            type="button"
            title="New Folder"
            onClick={() => {
              setTargetParent("");
              setCreatingType("directory");
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
          >
            <FolderPlus size={12} />
          </button>
        </div>
      </div>

      {/* Inline Create Form */}
      {creatingType && (
        <form onSubmit={handleCreateSubmit} className="p-2 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="font-mono text-[10px] text-orange-400 mb-1 truncate">
            Add {creatingType} {targetParent ? `in /${targetParent}` : "at root"}
          </div>
          <div className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              placeholder={creatingType === "file" ? "page.tsx" : "components"}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="h-6 flex-1 rounded bg-black/60 px-2 font-mono text-[11px] text-white outline-none border border-white/10 focus:border-orange-500"
            />
            <button
              type="submit"
              className="h-6 px-2 rounded bg-orange-500 text-white font-mono text-[10.5px] font-semibold"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setCreatingType(null)}
              className="h-6 px-1.5 rounded bg-white/10 text-white/60 font-mono text-[10.5px]"
            >
              ✕
            </button>
          </div>
        </form>
      )}

      {/* Tree View Canvas */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-8 gap-2 text-white/40">
            <RefreshCw size={16} className="animate-spin text-orange-400" />
            <span className="font-mono text-xs">Connecting to project files...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-6 text-center gap-2 text-white/60">
            <AlertCircle size={18} className="text-rose-400" />
            <span className="font-mono text-xs text-rose-300">Unable to load files</span>
            <button
              onClick={loadTree}
              className="mt-1 px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 text-xs font-mono text-white"
            >
              Retry
            </button>
          </div>
        ) : tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center gap-2 text-white/40 font-mono text-xs">
            <p>This project has no files yet.</p>
            <button
              onClick={() => {
                setTargetParent("");
                setCreatingType("file");
              }}
              className="flex items-center gap-1 mt-1 text-orange-400 hover:underline"
            >
              <Plus size={12} /> Create first file
            </button>
          </div>
        ) : (
          renderNodes(tree)
        )}
      </div>
    </div>
  );
}

function buildTreeFromEntries(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const raw of paths) {
    const segments = raw.split("/").filter(Boolean);
    let currentLevel = root;
    let accumulatedPath = "";

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${seg}` : seg;
      const isFile = i === segments.length - 1 && raw.includes(".");

      let existing = currentLevel.find((n) => n.name === seg);
      if (!existing) {
        existing = {
          name: seg,
          path: accumulatedPath,
          type: isFile ? "file" : "directory",
          children: isFile ? undefined : [],
        };
        currentLevel.push(existing);
      }
      if (existing.children) {
        currentLevel = existing.children;
      }
    }
  }

  return sortTree(root);
}

function sortTree(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .map((node) => ({
      ...node,
      children: node.children ? sortTree(node.children) : undefined,
    }));
}

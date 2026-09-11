/**
 * Universal Virtual File System (VFS) Store.
 * Built with Zustand, fully transactional, immutable snapshots, and IndexedDB persistence.
 */

import { create } from "zustand";
import type {
  VFSNode,
  VFSTransaction,
  VFSTransactionOperation,
  VFSSnapshot,
  FileDiffSummary,
} from "./types";
import {
  saveVFSNodesToIndexedDB,
  loadVFSNodesFromIndexedDB,
  saveSnapshotToIndexedDB,
} from "./storage";

export interface ProposedTransactionState {
  transaction: VFSTransaction;
  diffs: FileDiffSummary[];
}

interface VFSState {
  projectId: string;
  nodes: Record<string, VFSNode>; // Map path -> VFSNode
  activeFilePath: string | null;
  openFilePaths: string[];
  dirtyFilePaths: Set<string>;

  // Transaction & Snapshot History
  undoStack: VFSSnapshot[];
  redoStack: VFSSnapshot[];
  proposedTransaction: ProposedTransactionState | null;

  // Lifecycle
  isInitialized: boolean;
  setProjectId: (projectId: string) => Promise<void>;
  initializeProject: (projectId: string, defaultFiles?: Record<string, string>) => Promise<void>;

  // Tab & Editor Management
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string) => void;
  updateEditorContent: (path: string, content: string) => void;
  saveActiveFile: () => void;

  // Single Transaction Engine
  executeTransaction: (
    description: string,
    operations: VFSTransactionOperation[],
    source?: "user" | "ai" | "system"
  ) => { success: boolean; error?: string };

  // AI Diff & Proposal System
  proposeAITransaction: (description: string, operations: VFSTransactionOperation[]) => void;
  applyProposedTransaction: (selectedPaths?: string[]) => void;
  rejectProposedTransaction: () => void;

  // Rollback / Undo / Redo
  undo: () => void;
  redo: () => void;

  // Tree & Helper queries
  getNode: (path: string) => VFSNode | undefined;
  getChildren: (dirPath: string) => VFSNode[];
  exportZip: () => Promise<Blob>;
}

function normalizePath(rawPath: string): string {
  let p = rawPath.trim().replace(/\\/g, "/");
  if (!p.startsWith("/")) p = "/" + p;
  p = p.replace(/\/+/g, "/");
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

function getParentPath(path: string): string | null {
  const norm = normalizePath(path);
  if (norm === "/" || norm === "") return null;
  const parts = norm.split("/").filter(Boolean);
  if (parts.length <= 1) return "/";
  return "/" + parts.slice(0, -1).join("/");
}

function getBaseName(path: string): string {
  const parts = normalizePath(path).split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

function getMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "html":
      return "text/html";
    case "css":
      return "text/css";
    case "js":
    case "mjs":
      return "application/javascript";
    case "ts":
      return "text/typescript";
    case "tsx":
      return "text/typescript-jsx";
    case "jsx":
      return "text/javascript-jsx";
    case "json":
      return "application/json";
    case "md":
      return "text/markdown";
    case "svg":
      return "image/svg+xml";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    default:
      return "text/plain";
  }
}

const DEFAULT_PROJECT_TEMPLATE: Record<string, string> = {
  "/package.json": JSON.stringify(
    {
      name: "corvus-next-app",
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
      },
      dependencies: {
        react: "^19.0.0",
        "react-dom": "^19.0.0",
        next: "15.1.0",
        "lucide-react": "^1.17.0",
      },
    },
    null,
    2
  ),
  "/app/layout.tsx": `export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#090a0f', color: '#f8fafc' }}>
        {children}
      </body>
    </html>
  );
}`,
  "/app/page.tsx": `export default function Page() {
  return (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.5rem', color: '#38bdf8' }}>🪐 Corvus Next.js Studio</h1>
      <p style={{ color: '#94a3b8' }}>
        Live in-browser fullstack application editing powered by Universal Virtual File System.
      </p>
    </main>
  );
}`,
  "/app/globals.css": `body {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}`,
};

export const useVFSStore = create<VFSState>((set, get) => ({
  projectId: "default",
  nodes: {},
  activeFilePath: null,
  openFilePaths: [],
  dirtyFilePaths: new Set(),
  undoStack: [],
  redoStack: [],
  proposedTransaction: null,
  isInitialized: false,

  setProjectId: async (projectId: string) => {
    await get().initializeProject(projectId);
  },

  initializeProject: async (projectId: string, defaultFiles = DEFAULT_PROJECT_TEMPLATE) => {
    // 1. Try loading from IndexedDB first
    const savedNodes = await loadVFSNodesFromIndexedDB(projectId);

    if (savedNodes && Object.keys(savedNodes).length > 0) {
      const allPaths = Object.keys(savedNodes);
      const initialActive = allPaths.find((p) => p.endsWith("page.tsx") || p.endsWith("page.js")) || allPaths[0] || null;

      set({
        projectId,
        nodes: savedNodes,
        activeFilePath: initialActive,
        openFilePaths: initialActive ? [initialActive] : [],
        dirtyFilePaths: new Set(),
        undoStack: [],
        redoStack: [],
        proposedTransaction: null,
        isInitialized: true,
      });
      return;
    }

    // 2. Otherwise create initial project template
    const newNodes: Record<string, VFSNode> = {
      "/": {
        id: "node_root",
        name: "",
        path: "/",
        type: "directory",
        metadata: {
          size: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        parentId: null,
        children: [],
      },
    };

    // Helper to add nodes during template generation
    for (const [rawPath, content] of Object.entries(defaultFiles)) {
      const path = normalizePath(rawPath);
      const parts = path.split("/").filter(Boolean);
      let currentPath = "";

      for (let i = 0; i < parts.length - 1; i++) {
        currentPath += "/" + parts[i];
        if (!newNodes[currentPath]) {
          newNodes[currentPath] = {
            id: `dir_${parts[i]}_${Date.now()}_${Math.random()}`,
            name: parts[i],
            path: currentPath,
            type: "directory",
            metadata: {
              size: 0,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            parentId: getParentPath(currentPath),
            children: [],
          };
        }
      }

      const fileName = parts[parts.length - 1];
      newNodes[path] = {
        id: `file_${fileName}_${Date.now()}_${Math.random()}`,
        name: fileName,
        path,
        type: "file",
        content,
        metadata: {
          size: new Blob([content]).size,
          mimeType: getMimeType(fileName),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isBinary: false,
        },
        parentId: getParentPath(path),
      };
    }

    // Populate children references
    for (const node of Object.values(newNodes)) {
      if (node.parentId && newNodes[node.parentId]) {
        const parent = newNodes[node.parentId];
        if (!parent.children) parent.children = [];
        if (!parent.children.includes(node.id)) {
          parent.children.push(node.id);
        }
      }
    }

    await saveVFSNodesToIndexedDB(projectId, newNodes);

    const activeInitial = "/app/page.tsx";
    set({
      projectId,
      nodes: newNodes,
      activeFilePath: activeInitial,
      openFilePaths: [activeInitial],
      dirtyFilePaths: new Set(),
      undoStack: [],
      redoStack: [],
      proposedTransaction: null,
      isInitialized: true,
    });
  },

  openFile: (rawPath: string) => {
    const path = normalizePath(rawPath);
    const { nodes, openFilePaths } = get();
    if (!nodes[path] || nodes[path].type !== "file") return;

    if (!openFilePaths.includes(path)) {
      set({
        openFilePaths: [...openFilePaths, path],
        activeFilePath: path,
      });
    } else {
      set({ activeFilePath: path });
    }
  },

  closeFile: (rawPath: string) => {
    const path = normalizePath(rawPath);
    const { openFilePaths, activeFilePath, dirtyFilePaths } = get();
    const nextOpen = openFilePaths.filter((p) => p !== path);
    let nextActive = activeFilePath;

    if (activeFilePath === path) {
      nextActive = nextOpen.length > 0 ? nextOpen[nextOpen.length - 1] : null;
    }

    const nextDirty = new Set(dirtyFilePaths);
    nextDirty.delete(path);

    set({
      openFilePaths: nextOpen,
      activeFilePath: nextActive,
      dirtyFilePaths: nextDirty,
    });
  },

  setActiveFile: (rawPath: string) => {
    const path = normalizePath(rawPath);
    const { nodes, openFilePaths } = get();
    if (!nodes[path]) return;
    if (!openFilePaths.includes(path)) {
      set({
        openFilePaths: [...openFilePaths, path],
        activeFilePath: path,
      });
    } else {
      set({ activeFilePath: path });
    }
  },

  updateEditorContent: (rawPath: string, content: string) => {
    const path = normalizePath(rawPath);
    const { nodes, dirtyFilePaths } = get();
    const existing = nodes[path];
    if (!existing || existing.type !== "file") return;

    const nextDirty = new Set(dirtyFilePaths);
    nextDirty.add(path);

    set({
      nodes: {
        ...nodes,
        [path]: {
          ...existing,
          content,
          metadata: {
            ...existing.metadata,
            updatedAt: Date.now(),
          },
        },
      },
      dirtyFilePaths: nextDirty,
    });
  },

  saveActiveFile: () => {
    const { activeFilePath, nodes, projectId, dirtyFilePaths } = get();
    if (!activeFilePath || !nodes[activeFilePath]) return;

    const nextDirty = new Set(dirtyFilePaths);
    nextDirty.delete(activeFilePath);
    set({ dirtyFilePaths: nextDirty });

    void saveVFSNodesToIndexedDB(projectId, nodes);
  },

  executeTransaction: (
    description: string,
    operations: VFSTransactionOperation[],
    source = "user"
  ) => {
    const { nodes, projectId, undoStack } = get();

    // 1. Validation phase
    for (const op of operations) {
      const normPath = normalizePath(op.path);
      if (op.type === "update_file" || op.type === "delete_file") {
        if (!nodes[normPath]) {
          return { success: false, error: `Cannot ${op.type}: Target '${normPath}' does not exist.` };
        }
      }
      if (op.type === "rename_file") {
        if (!nodes[normPath]) {
          return { success: false, error: `Cannot rename: '${normPath}' does not exist.` };
        }
        if (!op.newPath) {
          return { success: false, error: `Missing newPath for rename operation.` };
        }
      }
    }

    // 2. Snapshot current state for undo
    const snapshot: VFSSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      description,
      nodes: JSON.parse(JSON.stringify(nodes)),
    };
    void saveSnapshotToIndexedDB(snapshot);

    // 3. Apply mutations atomically
    const nextNodes: Record<string, VFSNode> = JSON.parse(JSON.stringify(nodes));

    for (const op of operations) {
      const path = normalizePath(op.path);

      if (op.type === "create_file" || op.type === "update_file") {
        const parts = path.split("/").filter(Boolean);
        let curr = "";

        // Ensure parent directories exist
        for (let i = 0; i < parts.length - 1; i++) {
          curr += "/" + parts[i];
          if (!nextNodes[curr]) {
            nextNodes[curr] = {
              id: `dir_${parts[i]}_${Date.now()}`,
              name: parts[i],
              path: curr,
              type: "directory",
              metadata: {
                size: 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
              parentId: getParentPath(curr),
              children: [],
            };
          }
        }

        const fileName = parts[parts.length - 1];
        const content = op.content ?? "";

        nextNodes[path] = {
          id: nextNodes[path]?.id || `file_${fileName}_${Date.now()}`,
          name: fileName,
          path,
          type: "file",
          content,
          metadata: {
            size: new Blob([content]).size,
            mimeType: op.mimeType || getMimeType(fileName),
            createdAt: nextNodes[path]?.metadata?.createdAt || Date.now(),
            updatedAt: Date.now(),
            isBinary: Boolean(op.isBinary),
          },
          parentId: getParentPath(path),
        };
      } else if (op.type === "create_directory") {
        const parts = path.split("/").filter(Boolean);
        let curr = "";
        for (let i = 0; i < parts.length; i++) {
          curr += "/" + parts[i];
          if (!nextNodes[curr]) {
            nextNodes[curr] = {
              id: `dir_${parts[i]}_${Date.now()}`,
              name: parts[i],
              path: curr,
              type: "directory",
              metadata: {
                size: 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
              parentId: getParentPath(curr),
              children: [],
            };
          }
        }
      } else if (op.type === "delete_file") {
        delete nextNodes[path];
        // Also delete any descendants if it was a directory
        for (const k of Object.keys(nextNodes)) {
          if (k.startsWith(path + "/")) {
            delete nextNodes[k];
          }
        }
      } else if (op.type === "rename_file" && op.newPath) {
        const newP = normalizePath(op.newPath);
        const node = nextNodes[path];
        if (node) {
          delete nextNodes[path];
          nextNodes[newP] = {
            ...node,
            name: getBaseName(newP),
            path: newP,
            parentId: getParentPath(newP),
            metadata: {
              ...node.metadata,
              updatedAt: Date.now(),
            },
          };
        }
      }
    }

    void saveVFSNodesToIndexedDB(projectId, nextNodes);

    set({
      nodes: nextNodes,
      undoStack: [snapshot, ...undoStack.slice(0, 30)],
      redoStack: [],
    });

    return { success: true };
  },

  proposeAITransaction: (description: string, operations: VFSTransactionOperation[]) => {
    const { nodes } = get();
    const diffs: FileDiffSummary[] = [];

    for (const op of operations) {
      const path = normalizePath(op.path);
      const existing = nodes[path];

      if (op.type === "create_file") {
        diffs.push({
          path,
          status: existing ? "modified" : "created",
          oldContent: existing?.content || "",
          newContent: op.content || "",
          selected: true,
        });
      } else if (op.type === "update_file") {
        diffs.push({
          path,
          status: "modified",
          oldContent: existing?.content || "",
          newContent: op.content || "",
          selected: true,
        });
      } else if (op.type === "delete_file") {
        diffs.push({
          path,
          status: "deleted",
          oldContent: existing?.content || "",
          newContent: "",
          selected: true,
        });
      } else if (op.type === "rename_file" && op.newPath) {
        diffs.push({
          path: `${path} → ${normalizePath(op.newPath)}`,
          status: "renamed",
          selected: true,
        });
      }
    }

    const transaction: VFSTransaction = {
      id: `ai_tx_${Date.now()}`,
      description,
      source: "ai",
      operations,
      createdAt: Date.now(),
    };

    set({
      proposedTransaction: {
        transaction,
        diffs,
      },
    });
  },

  applyProposedTransaction: (selectedPaths?: string[]) => {
    const { proposedTransaction, executeTransaction } = get();
    if (!proposedTransaction) return;

    let opsToApply = proposedTransaction.transaction.operations;
    if (selectedPaths && selectedPaths.length > 0) {
      opsToApply = opsToApply.filter((op) => selectedPaths.includes(normalizePath(op.path)));
    }

    executeTransaction(
      proposedTransaction.transaction.description,
      opsToApply,
      "ai"
    );

    set({ proposedTransaction: null });
  },

  rejectProposedTransaction: () => {
    set({ proposedTransaction: null });
  },

  undo: () => {
    const { undoStack, redoStack, nodes, projectId } = get();
    if (undoStack.length === 0) return;

    const [previous, ...remainingUndo] = undoStack;
    const currentSnapshot: VFSSnapshot = {
      id: `snap_redo_${Date.now()}`,
      timestamp: Date.now(),
      description: "Pre-undo state",
      nodes: JSON.parse(JSON.stringify(nodes)),
    };

    void saveVFSNodesToIndexedDB(projectId, previous.nodes);

    set({
      nodes: previous.nodes,
      undoStack: remainingUndo,
      redoStack: [currentSnapshot, ...redoStack],
    });
  },

  redo: () => {
    const { undoStack, redoStack, nodes, projectId } = get();
    if (redoStack.length === 0) return;

    const [next, ...remainingRedo] = redoStack;
    const currentSnapshot: VFSSnapshot = {
      id: `snap_undo_${Date.now()}`,
      timestamp: Date.now(),
      description: "Pre-redo state",
      nodes: JSON.parse(JSON.stringify(nodes)),
    };

    void saveVFSNodesToIndexedDB(projectId, next.nodes);

    set({
      nodes: next.nodes,
      undoStack: [currentSnapshot, ...undoStack],
      redoStack: remainingRedo,
    });
  },

  getNode: (rawPath: string) => {
    const path = normalizePath(rawPath);
    return get().nodes[path];
  },

  getChildren: (rawDirPath: string) => {
    const dirPath = normalizePath(rawDirPath);
    const { nodes } = get();
    const result: VFSNode[] = [];

    for (const [path, node] of Object.entries(nodes)) {
      if (path === dirPath) continue;
      const parent = getParentPath(path);
      if (parent === dirPath) {
        result.push(node);
      }
    }

    return result.sort((a, b) => {
      // Directories first, then alphabetical
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  },

  exportZip: async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const { nodes } = get();

    for (const [path, node] of Object.entries(nodes)) {
      if (node.type === "file" && node.content !== undefined) {
        const relative = path.startsWith("/") ? path.slice(1) : path;
        zip.file(relative, node.content);
      }
    }

    return await zip.generateAsync({ type: "blob" });
  },
}));

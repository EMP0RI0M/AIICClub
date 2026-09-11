/**
 * Universal Virtual File System (VFS) Types & Data Contracts.
 * Single source of truth for all editors, AI operations, and runtimes.
 */

export type VFSNodeType = "file" | "directory";

export interface VFSFileMetadata {
  size: number;
  mimeType?: string;
  createdAt: number;
  updatedAt: number;
  isBinary?: boolean;
  encoding?: "utf-8" | "base64";
}

export interface VFSNode {
  id: string;
  name: string;
  path: string; // Absolute normalized path e.g. "/app/page.tsx"
  type: VFSNodeType;
  content?: string; // Text string or base64 data URL for binary files
  metadata: VFSFileMetadata;
  parentId: string | null;
  children?: string[]; // Child node IDs if type === "directory"
}

export interface VFSTransactionOperation {
  type: "create_file" | "update_file" | "delete_file" | "rename_file" | "create_directory";
  path: string;
  newPath?: string; // For rename operations
  content?: string; // For create_file or update_file
  isBinary?: boolean;
  mimeType?: string;
}

export interface VFSTransaction {
  id: string;
  description: string;
  source: "user" | "ai" | "system";
  operations: VFSTransactionOperation[];
  createdAt: number;
}

export interface VFSSnapshot {
  id: string;
  timestamp: number;
  description: string;
  nodes: Record<string, VFSNode>;
}

export interface FileDiffSummary {
  path: string;
  status: "created" | "modified" | "deleted" | "renamed";
  oldContent?: string;
  newContent?: string;
  selected?: boolean;
}

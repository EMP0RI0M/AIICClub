/**
 * AI Structured Operations Protocol.
 * Parses and validates LLM generation into strict, typed VFS Transactions.
 */

import type { VFSTransactionOperation } from "./types";

export interface AIOperationProtocolResponse {
  description?: string;
  operations: VFSTransactionOperation[];
}

/**
 * Extracts structured VFS operations from standard JSON or fenced JSON codeblocks.
 */
export function parseAIOperations(rawText: string): AIOperationProtocolResponse | null {
  if (!rawText || typeof rawText !== "string") return null;

  try {
    // 1. Direct JSON parse
    const parsed = JSON.parse(rawText.trim());
    if (Array.isArray(parsed.operations)) {
      return sanitizeOperations(parsed);
    }
  } catch {}

  // 2. Fenced ```json ... ``` extraction
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
  let match;
  while ((match = jsonBlockRegex.exec(rawText)) !== null) {
    try {
      const candidate = JSON.parse(match[1].trim());
      if (Array.isArray(candidate.operations)) {
        return sanitizeOperations(candidate);
      }
    } catch {}
  }

  // 3. Search for raw {"operations": [...]} object anywhere in response
  const rawObjRegex = /\{\s*"operations"\s*:\s*\[[\s\S]*?\]\s*\}/g;
  const objMatch = rawObjRegex.exec(rawText);
  if (objMatch) {
    try {
      const candidate = JSON.parse(objMatch[0]);
      if (Array.isArray(candidate.operations)) {
        return sanitizeOperations(candidate);
      }
    } catch {}
  }

  return null;
}

function sanitizeOperations(input: any): AIOperationProtocolResponse {
  const operations: VFSTransactionOperation[] = [];
  const description = typeof input.description === "string" ? input.description : "AI Workspace Update";

  for (const item of input.operations) {
    if (!item || typeof item !== "object") continue;
    const type = item.type;
    const path = typeof item.path === "string" ? item.path.trim() : "";

    if (!path) continue;

    if (type === "create_file" || type === "update_file") {
      operations.push({
        type,
        path,
        content: typeof item.content === "string" ? item.content : "",
        isBinary: Boolean(item.isBinary),
        mimeType: item.mimeType,
      });
    } else if (type === "delete_file") {
      operations.push({
        type: "delete_file",
        path,
      });
    } else if (type === "rename_file" && typeof item.newPath === "string") {
      operations.push({
        type: "rename_file",
        path,
        newPath: item.newPath.trim(),
      });
    } else if (type === "create_directory") {
      operations.push({
        type: "create_directory",
        path,
      });
    }
  }

  return {
    description,
    operations,
  };
}

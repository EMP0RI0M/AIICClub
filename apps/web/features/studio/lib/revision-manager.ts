/**
 * Studio Revision & Concurrency Manager.
 * Guarantees optimistic concurrency control across Monaco editor saves,
 * AI agent writes, and collaborative member edits.
 */

import { getSupabaseAdmin } from "@/shared/supabase/admin";
import crypto from "crypto";

export interface RevisionCheckResult {
  allowed: boolean;
  currentRevision: number;
  expectedRevision?: number;
  conflict?: boolean;
}

export class RevisionManager {
  /**
   * Generates a fast SHA-256 hash of file content.
   */
  static hashContent(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  /**
   * Gets current file revision (or initializes to 1 if first read).
   */
  static async getFileRevision(projectId: string, path: string): Promise<number> {
    const supabase = getSupabaseAdmin();
    const cleanPath = path.trim().replace(/^\/+/, "");

    const { data } = await supabase
      .from("studio_file_revisions")
      .select("revision")
      .eq("project_id", projectId)
      .eq("path", cleanPath)
      .maybeSingle();

    return data?.revision ?? 1;
  }

  /**
   * Checks whether a write can proceed without conflicting.
   */
  static async validateWrite(
    projectId: string,
    path: string,
    expectedRevision?: number
  ): Promise<RevisionCheckResult> {
    const supabase = getSupabaseAdmin();
    const cleanPath = path.trim().replace(/^\/+/, "");

    const { data } = await supabase
      .from("studio_file_revisions")
      .select("revision")
      .eq("project_id", projectId)
      .eq("path", cleanPath)
      .maybeSingle();

    const currentRevision = data?.revision ?? 1;

    // If expectedRevision was specified, must match currentRevision exactly
    if (expectedRevision !== undefined && expectedRevision !== currentRevision) {
      return {
        allowed: false,
        currentRevision,
        expectedRevision,
        conflict: true,
      };
    }

    return {
      allowed: true,
      currentRevision,
      expectedRevision,
      conflict: false,
    };
  }

  /**
   * Records a successful write and increments the file's revision atomically.
   */
  static async commitWrite(
    projectId: string,
    path: string,
    content: string,
    userId?: string
  ): Promise<number> {
    const supabase = getSupabaseAdmin();
    const cleanPath = path.trim().replace(/^\/+/, "");
    const hash = this.hashContent(content);

    const { data: existing } = await supabase
      .from("studio_file_revisions")
      .select("revision")
      .eq("project_id", projectId)
      .eq("path", cleanPath)
      .maybeSingle();

    const nextRev = (existing?.revision ?? 0) + 1;

    await supabase
      .from("studio_file_revisions")
      .upsert(
        {
          project_id: projectId,
          path: cleanPath,
          revision: nextRev,
          last_modified_by: userId || null,
          content_hash: hash,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id,path" }
      );

    return nextRev;
  }
}

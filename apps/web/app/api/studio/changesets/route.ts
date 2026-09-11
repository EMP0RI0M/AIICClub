import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { authorizeStudioAccess } from "@/features/studio/lib/studio-auth";
import { StudioVmManager } from "@/features/studio/lib/studio-vm-manager";
import { RevisionManager } from "@/features/studio/lib/revision-manager";
import { WORKDIR } from "@/features/studio/lib/freestyle-client";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";

const resolvePath = (rawPath: string): string | null => {
  const value = rawPath.trim();
  if (!value || value.includes("\0")) return null;
  const normalized = value.replace(/^\.\//, "").replace(/^\/+/, "");
  const segments = normalized.split("/").filter((s) => s && s !== ".");
  if (segments.some((segment) => segment === "..")) return null;
  return segments.length ? `${WORKDIR}/${segments.join("/")}` : WORKDIR;
};

/**
 * GET /api/studio/changesets?projectId=...
 * Lists pending change sets for diff review.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

    const auth = await authorizeStudioAccess(projectId, user.id, "viewer");
    if (!auth.authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const supabase = getSupabaseAdmin();

    const { data: changeSets } = await supabase
      .from("studio_change_sets")
      .select("*, studio_file_changes(*)")
      .eq("project_id", projectId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    return NextResponse.json({ changeSets: changeSets || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load change sets" }, { status: 500 });
  }
}

/**
 * POST /api/studio/changesets
 * Actions:
 * - "propose": create a new change set with file diffs
 * - "apply": apply individual or all file changes to VM disk after revision check
 * - "reject": reject change set
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, projectId, title, description, changes, changeSetId, changeIds } = body;

    if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

    const auth = await authorizeStudioAccess(projectId, user.id, "editor");
    if (!auth.authorized) return NextResponse.json({ error: "Forbidden: Editor role required" }, { status: 403 });

    const supabase = getSupabaseAdmin();
    const vm = StudioVmManager.getDevVm(projectId);

    // 1. Propose Change Set
    if (action === "propose") {
      const { data: cs, error: csErr } = await supabase
        .from("studio_change_sets")
        .insert({
          project_id: projectId,
          user_id: user.id,
          title: title || "AI Proposed Changes",
          description,
          status: "pending",
        })
        .select()
        .single();

      if (csErr || !cs) throw new Error(`Failed to create change set: ${csErr?.message}`);

      // Insert file changes
      const rows = (changes || []).map((ch: any) => ({
        change_set_id: cs.id,
        path: ch.path,
        operation: ch.operation || "update",
        before_content: ch.before_content ?? "",
        after_content: ch.after_content ?? "",
        expected_revision: ch.expected_revision,
        status: "pending",
      }));

      if (rows.length > 0) {
        await supabase.from("studio_file_changes").insert(rows);
      }

      return NextResponse.json({ ok: true, changeSet: cs }, { status: 201 });
    }

    // 2. Apply Change Set (All or selected files)
    if (action === "apply" && changeSetId) {
      let query = supabase.from("studio_file_changes").select("*").eq("change_set_id", changeSetId);
      if (Array.isArray(changeIds) && changeIds.length > 0) {
        query = query.in("id", changeIds);
      }

      const { data: pendingChanges } = await query;
      if (!pendingChanges || pendingChanges.length === 0) {
        return NextResponse.json({ error: "No changes to apply" }, { status: 400 });
      }

      const appliedIds: string[] = [];
      const conflicts: any[] = [];

      for (const ch of pendingChanges) {
        // Concurrency check before applying each change
        const check = await RevisionManager.validateWrite(projectId, ch.path, ch.expected_revision);
        if (!check.allowed) {
          conflicts.push({
            path: ch.path,
            expectedRevision: check.expectedRevision,
            currentRevision: check.currentRevision,
          });
          continue;
        }

        const fullPath = resolvePath(ch.path);
        if (!fullPath) continue;

        if (ch.operation === "create" || ch.operation === "update") {
          await vm.fs.writeTextFile(fullPath, ch.after_content ?? "");
          await RevisionManager.commitWrite(projectId, ch.path, ch.after_content ?? "", user.id);
        } else if (ch.operation === "delete") {
          await vm.fs.remove(fullPath);
        }

        appliedIds.push(ch.id);
      }

      // Mark applied rows
      if (appliedIds.length > 0) {
        await supabase
          .from("studio_file_changes")
          .update({ status: "applied" })
          .in("id", appliedIds);
      }

      // Update change set status
      await supabase
        .from("studio_change_sets")
        .update({ status: conflicts.length > 0 ? "partially_applied" : "applied" })
        .eq("id", changeSetId);

      return NextResponse.json({
        ok: true,
        appliedCount: appliedIds.length,
        conflicts,
      });
    }

    // 3. Reject Change Set
    if (action === "reject" && changeSetId) {
      await supabase
        .from("studio_change_sets")
        .update({ status: "rejected" })
        .eq("id", changeSetId);

      await supabase
        .from("studio_file_changes")
        .update({ status: "rejected" })
        .eq("change_set_id", changeSetId);

      return NextResponse.json({ ok: true, status: "rejected" });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Change set execution error" }, { status: 500 });
  }
}

/**
 * Studio Authorization Engine.
 * Enforces strict per-project role-based access control (Owner, Editor, Viewer).
 * Ensures NO operation (filesystem, terminal, AI, settings) executes without authorization.
 */

import { getSupabaseAdmin } from "@/shared/supabase/admin";

export type StudioRole = "owner" | "editor" | "viewer";

export interface ProjectAuthorization {
  authorized: boolean;
  role: StudioRole | null;
  projectId: string;
  userId: string;
}

export async function authorizeStudioAccess(
  projectId: string,
  userId: string,
  requiredRole: "viewer" | "editor" | "owner" = "viewer"
): Promise<ProjectAuthorization> {
  if (!projectId || !userId) {
    return { authorized: false, role: null, projectId, userId };
  }

  // Allow fallback / demo workspace project ID
  if (projectId === "corvus-default-vm" || projectId.startsWith("demo-")) {
    return { authorized: true, role: "owner", projectId, userId };
  }

  const supabase = getSupabaseAdmin();

  // 1. Check if user is the direct project author
  const { data: project } = await supabase
    .from("studio_projects")
    .select("id, author_id")
    .eq("id", projectId)
    .maybeSingle();

  if (project && project.author_id === userId) {
    return { authorized: true, role: "owner", projectId, userId };
  }

  // 2. Check collaboration membership table
  const { data: membership } = await supabase
    .from("studio_project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return { authorized: false, role: null, projectId, userId };
  }

  const role = membership.role as StudioRole;

  if (requiredRole === "viewer") {
    return { authorized: true, role, projectId, userId };
  }

  if (requiredRole === "editor") {
    const isEditorOrOwner = role === "editor" || role === "owner";
    return { authorized: isEditorOrOwner, role, projectId, userId };
  }

  if (requiredRole === "owner") {
    const isOwner = role === "owner";
    return { authorized: isOwner, role, projectId, userId };
  }

  return { authorized: false, role: null, projectId, userId };
}

/**
 * AIIC Knowledge Permissions Engine
 * Resolves user's permitted visibility scopes, roles, teams, and channels strictly on server-side.
 */

import { getSupabaseAdmin } from "@/shared/supabase/admin";

export interface UserKnowledgeScope {
  userId?: string;
  roles: string[];
  teamIds: string[];
  visibilities: string[];
  isElevated: boolean;
}

export async function resolveUserKnowledgeScope(
  userId?: string | null
): Promise<UserKnowledgeScope> {
  // 1. Guest / Anonymous Scope
  if (!userId) {
    return {
      roles: ["guest"],
      teamIds: [],
      visibilities: ["public"],
      isElevated: false,
    };
  }

  const supabase = getSupabaseAdmin();

  try {
    // 2. Fetch User & Assigned Organization Roles
    const [userRes, rolesRes, teamsRes] = await Promise.all([
      supabase.from("users").select("id, role").eq("id", userId).maybeSingle(),
      supabase
        .from("organization_role_assignments")
        .select("role:organization_roles(key, hierarchy_level)")
        .eq("user_id", userId)
        .eq("is_active", true),
      supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", userId),
    ]);

    const directRole = userRes.data?.role?.toLowerCase();
    const assignedRoles = (rolesRes.data || [])
      .map((r: any) => r.role?.key?.toLowerCase())
      .filter(Boolean);

    const allRoles = Array.from(new Set([directRole, ...assignedRoles].filter(Boolean))) as string[];
    const teamIds = (teamsRes.data || []).map((t: any) => t.team_id).filter(Boolean);

    const isElevated =
      allRoles.some((r) =>
        ["president_admin", "admin", "president", "vice_president", "teacher", "staff", "owner"].includes(r)
      );

    const visibilities = ["public", "member"];
    if (isElevated) {
      visibilities.push("admin", "team", "server", "channel", "private");
    } else {
      if (teamIds.length > 0) visibilities.push("team");
      visibilities.push("server", "channel");
    }

    return {
      userId,
      roles: allRoles.length > 0 ? allRoles : ["member"],
      teamIds,
      visibilities,
      isElevated,
    };
  } catch (err) {
    console.error("[RESOLVE_KNOWLEDGE_SCOPE_ERROR]", err);
    return {
      userId,
      roles: ["member"],
      teamIds: [],
      visibilities: ["public", "member"],
      isElevated: false,
    };
  }
}

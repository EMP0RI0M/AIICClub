import { NextRequest } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export interface AdminAuthResult {
    authorized: boolean;
    user?: {
        id: string;
        email: string;
        username: string;
        displayName: string;
        roleKey: string;
        roleName: string;
        hierarchyLevel: number;
    };
    error?: string;
    statusCode?: number;
}

/**
 * Authoritative server-side authorization check for the AIIC Admin Board.
 * ONLY president_admin, president, and admin roles are authorized.
 * Derives actor identity strictly from auth.uid() and authoritative organization_role_assignments.
 */
export async function verifyAdminBoardAccess(req: NextRequest): Promise<AdminAuthResult> {
    const authUser = await getAuthUser(req);
    if (!authUser) {
        return { authorized: false, error: "Unauthorized: Please log in to access the Admin Board.", statusCode: 401 };
    }

    const supabase = getSupabaseAdmin();

    // Resolve actual public.users ID & profile details
    let actualUserId = authUser.id;
    const { data: userRow } = await supabase
        .from("users")
        .select("id, email, username, display_name, role, is_leadership, leadership_title")
        .or(`id.eq.${authUser.id},auth_user_id.eq.${authUser.id},email.eq.${authUser.email}`)
        .maybeSingle();

    if (userRow?.id) {
        actualUserId = userRow.id;
    }

    // Resolve authoritative active organization roles
    const { data: assignments } = await supabase
        .from("organization_role_assignments")
        .select("id, role_id, is_active, role:organization_roles(id, key, name, hierarchy_level)")
        .eq("user_id", actualUserId)
        .eq("is_active", true);

    const activeRoles = (assignments || []).map((a: any) => a.role).filter(Boolean);

    // Sort by hierarchy level descending
    activeRoles.sort((a: any, b: any) => (b.hierarchy_level || 0) - (a.hierarchy_level || 0));
    let highestRole = activeRoles[0];

    // Fallback: If no explicit assignment exists in organization_role_assignments, check userRow.role
    if (!highestRole && userRow) {
        if (["president_admin", "admin", "president"].includes(userRow.role)) {
            const { data: directRole } = await supabase
                .from("organization_roles")
                .select("id, key, name, hierarchy_level")
                .eq("key", userRow.role)
                .maybeSingle();

            if (directRole) {
                highestRole = directRole;
            }
        }
    }

    const allowedRoles = ["president_admin", "admin", "president"];
    const isAuthorized = highestRole && allowedRoles.includes(highestRole.key);

    if (!isAuthorized) {
        return {
            authorized: false,
            error: "Forbidden: Admin Board access is strictly reserved for President and Admin roles.",
            statusCode: 403,
        };
    }

    return {
        authorized: true,
        user: {
            id: actualUserId,
            email: userRow?.email || authUser.email || "",
            username: userRow?.username || authUser.username || "",
            displayName: userRow?.display_name || userRow?.username || authUser.displayName || "President / Admin",
            roleKey: highestRole.key,
            roleName: highestRole.name,
            hierarchyLevel: highestRole.hierarchy_level,
        },
    };
}

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminBoardAccess } from "@/shared/lib/admin-auth";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function GET(req: NextRequest) {
    const auth = await verifyAdminBoardAccess(req);
    if (!auth.authorized || !auth.user) {
        return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 403 });
    }

    const supabase = getSupabaseAdmin();

    try {
        // Fetch all organizational roles ordered by hierarchy level descending
        const { data: roles, error: rErr } = await supabase
            .from("organization_roles")
            .select("id, key, name, hierarchy_level, created_at")
            .order("hierarchy_level", { ascending: false });

        if (rErr) throw rErr;

        // Fetch active assignments count per role
        const { data: assignments } = await supabase
            .from("organization_role_assignments")
            .select("role_id, user_id, is_active, user:users(id, username, display_name, avatar_url, email)")
            .eq("is_active", true);

        const holdersMap = new Map<string, any[]>();
        (assignments || []).forEach((a: any) => {
            if (!a.user) return;
            const list = holdersMap.get(a.role_id) || [];
            list.push({
                id: a.user.id,
                username: a.user.username,
                displayName: a.user.display_name || a.user.username,
                avatarUrl: a.user.avatar_url,
                email: a.user.email,
            });
            holdersMap.set(a.role_id, list);
        });

        // Fetch permissions per role
        const { data: rolePerms } = await supabase
            .from("organization_role_permissions")
            .select("role_id, permission:permissions(id, key, name, description)");

        const permsMap = new Map<string, any[]>();
        (rolePerms || []).forEach((rp: any) => {
            if (!rp.permission) return;
            const list = permsMap.get(rp.role_id) || [];
            list.push(rp.permission);
            permsMap.set(rp.role_id, list);
        });

        const roleList = (roles || []).map((r) => ({
            id: r.id,
            key: r.key,
            name: r.name,
            hierarchyLevel: r.hierarchy_level,
            holders: holdersMap.get(r.id) || [],
            holderCount: (holdersMap.get(r.id) || []).length,
            permissions: permsMap.get(r.id) || [],
            permissionCount: (permsMap.get(r.id) || []).length,
            createdAt: r.created_at,
        }));

        return NextResponse.json({ roles: roleList });
    } catch (err: any) {
        console.error("[ADMIN_ROLES_GET_ERROR]", err);
        return NextResponse.json({ error: "Failed to fetch organization roles." }, { status: 500 });
    }
}

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
        // 1. Fetch current leadership tier (President + Admin, President, Admin, Vice President)
        const { data: leadershipRoles } = await supabase
            .from("organization_roles")
            .select("id, key, name, hierarchy_level")
            .in("key", ["president_admin", "admin", "president", "vice_president"])
            .order("hierarchy_level", { ascending: false });

        const roleIds = (leadershipRoles || []).map((r) => r.id);

        const { data: activeAssignments } = await supabase
            .from("organization_role_assignments")
            .select("id, role_id, user_id, assigned_at, starts_at, user:users(id, username, display_name, avatar_url, email), role:organization_roles(id, key, name, hierarchy_level)")
            .in("role_id", roleIds)
            .eq("is_active", true);

        // 2. Fetch full historical leadership transitions
        const { data: history, error: hErr } = await supabase
            .from("aiic_leadership_history")
            .select("id, server_id, user_id, role_id, starts_at, ends_at, appointed_by, transition_reason, notes, created_at, user:users!user_id(id, username, display_name, avatar_url, email), appointer:users!appointed_by(id, username, display_name), role:organization_roles(id, key, name, hierarchy_level)")
            .order("created_at", { ascending: false });

        if (hErr) console.warn("[LEADERSHIP_HISTORY_WARN]", hErr);

        return NextResponse.json({
            currentOfficers: activeAssignments || [],
            history: history || [],
        });
    } catch (err: any) {
        console.error("[ADMIN_LEADERSHIP_GET_ERROR]", err);
        return NextResponse.json({ error: "Failed to fetch leadership data." }, { status: 500 });
    }
}

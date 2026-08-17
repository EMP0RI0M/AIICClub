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
        // 1. Fetch total users
        const { count: totalUsers } = await supabase
            .from("users")
            .select("*", { count: "exact", head: true });

        // 2. Fetch role distribution from authoritative organization_role_assignments
        const { data: roleAssignments } = await supabase
            .from("organization_role_assignments")
            .select("role:organization_roles(key)")
            .eq("is_active", true);

        const roleCounts: Record<string, number> = {
            president_admin: 0,
            admin: 0,
            president: 0,
            vice_president: 0,
            teacher: 0,
            staff: 0,
            member: 0,
            visitor: 0,
        };

        (roleAssignments || []).forEach((a: any) => {
            const key = a.role?.key;
            if (key && roleCounts[key] !== undefined) {
                roleCounts[key]++;
            }
        });

        // 3. Pending approvals (count users with status === "pending" or unassigned visitors)
        const { count: pendingUsersCount } = await supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending");

        // 4. Fetch spaces count
        const { count: totalSpaces } = await supabase
            .from("servers")
            .select("*", { count: "exact", head: true });

        // Unofficial spaces
        const { count: unofficialSpaces } = await supabase
            .from("servers")
            .select("*", { count: "exact", head: true })
            .neq("owner_id", auth.user.id);

        // 5. Active teams
        const { count: activeTeams } = await supabase
            .from("aiic_teams")
            .select("*", { count: "exact", head: true });

        // 6. Recent administrative audit logs
        const { data: recentAudit } = await supabase
            .from("aiic_audit_logs")
            .select("id, action, category, entity_type, metadata, created_at, actor:users!actor_user_id(username, display_name), target:users!target_user_id(username, display_name)")
            .order("created_at", { ascending: false })
            .limit(10);

        return NextResponse.json({
            stats: {
                totalUsers: totalUsers || 0,
                pendingApprovals: pendingUsersCount || 0,
                roleCounts,
                activeSpaces: totalSpaces || 0,
                unofficialSpaces: unofficialSpaces || 0,
                activeTeams: activeTeams || 0,
            },
            adminUser: auth.user,
            recentAudit: recentAudit || [],
        });
    } catch (err: any) {
        console.error("[ADMIN_OVERVIEW_ERROR]", err);
        return NextResponse.json({ error: "Failed to fetch admin overview data." }, { status: 500 });
    }
}

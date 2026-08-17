import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const spaceId = searchParams.get("spaceId");
    if (!spaceId) return NextResponse.json({ error: "spaceId is required" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    try {
        // 1. Fetch server members
        const { data: serverMembers, error: smError } = await supabase
            .from("server_members")
            .select(`
                user_id,
                joined_at,
                nickname,
                user:users!user_id (
                    id,
                    username,
                    display_name,
                    avatar_url,
                    status
                )
            `)
            .eq("server_id", spaceId);

        if (smError) throw smError;

        // 2. Fetch active org role assignments
        const { data: roleAssignments } = await supabase
            .from("organization_role_assignments")
            .select("user_id, role:organization_roles(id, key, name, hierarchy_level)")
            .eq("server_id", spaceId)
            .eq("is_active", true);

        const roleMap = new Map((roleAssignments || []).map((ra: any) => [ra.user_id, ra.role]));

        // 3. Fetch active team assignments
        const { data: teamMemberships } = await supabase
            .from("aiic_team_members")
            .select("user_id, position, team:aiic_teams(id, name, key, pool:aiic_pools(id, name, key))")
            .eq("is_active", true);

        const teamMap = new Map((teamMemberships || []).map((tm: any) => [tm.user_id, tm]));

        // 4. Fetch staff assignments
        const { data: staffAssignments } = await supabase
            .from("aiic_staff_assignments")
            .select("user_id, position:aiic_staff_positions(id, name, key)")
            .eq("server_id", spaceId)
            .eq("is_active", true);

        const staffMap = new Map((staffAssignments || []).map((sa: any) => [sa.user_id, sa.position]));

        // Format members
        const members = (serverMembers || []).map((sm: any) => {
            const userId = sm.user?.id || sm.user_id;
            const orgRole = roleMap.get(userId) || { id: "v", key: "visitor", name: "Visitor", hierarchy_level: 10 };
            const teamInfo = teamMap.get(userId);
            const staffInfo = staffMap.get(userId);


            return {
                id: userId,
                username: sm.user?.username || "user",
                displayName: sm.nickname || sm.user?.display_name || sm.user?.username || "Member",
                avatarUrl: sm.user?.avatar_url || null,
                status: sm.user?.status || "offline",
                joinedAt: sm.joined_at,
                role: orgRole.key,
                roleName: orgRole.name,
                hierarchyLevel: orgRole.hierarchy_level,
                pool: teamInfo?.team?.pool ? { id: teamInfo.team.pool.id, name: teamInfo.team.pool.name, key: teamInfo.team.pool.key } : null,
                team: teamInfo?.team ? { id: teamInfo.team.id, name: teamInfo.team.name, key: teamInfo.team.key, position: teamInfo.position } : null,
                staffPosition: staffInfo ? { id: staffInfo.id, name: staffInfo.name, key: staffInfo.key } : null,
            };
        });

        // Sort by hierarchy rank descending
        members.sort((a: any, b: any) => (b.hierarchyLevel || 0) - (a.hierarchyLevel || 0));

        return NextResponse.json({ members });
    } catch (err: any) {
        console.error("[MEMBERS_API_ERROR]", err);
        return NextResponse.json({ error: err?.message || "Failed to fetch members" }, { status: 500 });
    }
}

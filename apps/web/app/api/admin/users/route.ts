import { NextRequest, NextResponse } from "next/server";
import { verifyAdminBoardAccess } from "@/shared/lib/admin-auth";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function GET(req: NextRequest) {
    const auth = await verifyAdminBoardAccess(req);
    if (!auth.authorized || !auth.user) {
        return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase().trim() || "";
    const roleFilter = searchParams.get("role") || "";
    const statusFilter = searchParams.get("status") || "";

    const supabase = getSupabaseAdmin();

    try {
        // Fetch all users
        const { data: users, error } = await supabase
            .from("users")
            .select("id, email, username, display_name, avatar_url, bio, status, role, is_leadership, leadership_title, created_at, skills, interests")
            .order("created_at", { ascending: false });

        if (error) throw error;

        const userIds = (users || []).map((u) => u.id);

        // Fetch active organization role assignments
        const { data: assignments } = await supabase
            .from("organization_role_assignments")
            .select("user_id, is_active, role:organization_roles(id, key, name, hierarchy_level)")
            .in("user_id", userIds)
            .eq("is_active", true);

        const assignmentMap = new Map<string, any>();
        (assignments || []).forEach((a: any) => {
            assignmentMap.set(a.user_id, a.role);
        });

        // Fetch team memberships
        const { data: teamMembers } = await supabase
            .from("aiic_team_members")
            .select("user_id, role, team:aiic_teams(id, name, key, position)")
            .in("user_id", userIds);

        const teamMap = new Map<string, any[]>();
        (teamMembers || []).forEach((tm: any) => {
            const list = teamMap.get(tm.user_id) || [];
            list.push({
                teamId: tm.team?.id,
                teamName: tm.team?.name,
                teamKey: tm.team?.key,
                position: tm.team?.position,
                memberRole: tm.role,
                pool: (tm.team?.position || 99) <= 2 ? "Upper Pool" : "Lower Pool",
            });
            teamMap.set(tm.user_id, list);
        });

        // Fetch space memberships
        const { data: serverMembers } = await supabase
            .from("server_members")
            .select("user_id, role, server:servers(id, name)")
            .in("user_id", userIds);

        const spaceMap = new Map<string, any[]>();
        (serverMembers || []).forEach((sm: any) => {
            const list = spaceMap.get(sm.user_id) || [];
            list.push({
                spaceId: sm.server?.id,
                spaceName: sm.server?.name,
                spaceRole: sm.role,
            });
            spaceMap.set(sm.user_id, list);
        });

        // Compile directory
        let directory = (users || []).map((u) => {
            const activeRole = assignmentMap.get(u.id);
            return {
                id: u.id,
                email: u.email,
                username: u.username,
                displayName: u.display_name || u.username,
                avatarUrl: u.avatar_url,
                bio: u.bio,
                status: u.status || "active",
                roleKey: activeRole?.key || u.role || "visitor",
                roleName: activeRole?.name || "Visitor",
                hierarchyLevel: activeRole?.hierarchy_level || 10,
                isLeadership: u.is_leadership,
                leadershipTitle: u.leadership_title,
                teams: teamMap.get(u.id) || [],
                spaces: spaceMap.get(u.id) || [],
                skills: u.skills || [],
                interests: u.interests || [],
                createdAt: u.created_at,
            };
        });

        // Filter search
        if (search) {
            directory = directory.filter(
                (u) =>
                    u.username.toLowerCase().includes(search) ||
                    u.displayName.toLowerCase().includes(search) ||
                    u.email.toLowerCase().includes(search)
            );
        }

        if (roleFilter) {
            directory = directory.filter((u) => u.roleKey === roleFilter);
        }

        if (statusFilter) {
            directory = directory.filter((u) => u.status === statusFilter);
        }

        return NextResponse.json({ users: directory });
    } catch (err: any) {
        console.error("[ADMIN_USERS_GET_ERROR]", err);
        return NextResponse.json({ error: "Failed to fetch user directory." }, { status: 500 });
    }
}

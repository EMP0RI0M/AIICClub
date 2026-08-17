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
        // Fetch Teams 1 to 5
        const { data: teams, error: tErr } = await supabase
            .from("aiic_teams")
            .select("id, server_id, key, name, position, is_active, leader_user_id, leader:users!leader_user_id(id, username, display_name, avatar_url, email)")
            .order("position", { ascending: true });

        if (tErr) throw tErr;

        const teamIds = (teams || []).map((t) => t.id);

        // Fetch team members
        const { data: members, error: mErr } = await supabase
            .from("aiic_team_members")
            .select("id, team_id, user_id, role, joined_at, user:users(id, username, display_name, avatar_url, email, status)")
            .in("team_id", teamIds);

        if (mErr) throw mErr;

        const membersMap = new Map<string, any[]>();
        (members || []).forEach((m: any) => {
            if (!m.user) return;
            const list = membersMap.get(m.team_id) || [];
            list.push({
                memberId: m.id,
                userId: m.user.id,
                username: m.user.username,
                displayName: m.user.display_name || m.user.username,
                avatarUrl: m.user.avatar_url,
                email: m.user.email,
                role: m.role,
                status: m.user.status,
                joinedAt: m.joined_at,
            });
            membersMap.set(m.team_id, list);
        });

        const formattedTeams = (teams || []).map((t: any) => ({
            id: t.id,
            key: t.key,
            name: t.name,
            position: t.position,
            pool: (t.position || 99) <= 2 ? "Upper Pool" : "Lower Pool",
            isActive: t.is_active,
            leader: t.leader
                ? {
                      id: t.leader.id,
                      username: t.leader.username,
                      displayName: t.leader.display_name || t.leader.username,
                      avatarUrl: t.leader.avatar_url,
                      email: t.leader.email,
                  }
                : null,
            members: membersMap.get(t.id) || [],
            memberCount: (membersMap.get(t.id) || []).length,
        }));

        return NextResponse.json({ teams: formattedTeams });
    } catch (err: any) {
        console.error("[ADMIN_TEAMS_GET_ERROR]", err);
        return NextResponse.json({ error: "Failed to fetch teams." }, { status: 500 });
    }
}

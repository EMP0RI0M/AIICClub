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
        // 1. Ensure Upper Pool & Lower Pool exist for this space
        let { data: pools } = await supabase
            .from("aiic_pools")
            .select("id, name, key, description")
            .eq("server_id", spaceId);

        if (!pools || pools.length === 0) {
            await supabase.from("aiic_pools").insert([
                { server_id: spaceId, key: "upper_pool", name: "Upper Pool", description: "Executive & Senior Project Pool (Teams 1–2)" },
                { server_id: spaceId, key: "lower_pool", name: "Lower Pool", description: "Operational & Collaborative Pool (Teams 3–5)" },
            ]);
            const { data: createdPools } = await supabase.from("aiic_pools").select("id, name, key, description").eq("server_id", spaceId);
            pools = createdPools || [];
        }

        const upperPool = pools.find((p: any) => p.key === "upper_pool");
        const lowerPool = pools.find((p: any) => p.key === "lower_pool");

        // 2. Ensure 5 standard teams exist
        let { data: teams } = await supabase
            .from("aiic_teams")
            .select(`
                id,
                name,
                key,
                description,
                position,
                pool_id,
                leader_user_id,
                leader:users!aiic_team_leader_fk (
                    id,
                    username,
                    display_name,
                    avatar_url
                )
            `)
            .eq("server_id", spaceId)
            .order("position", { ascending: true });

        if (!teams || teams.length < 5) {
            const teamSeeds = [
                { server_id: spaceId, pool_id: upperPool?.id, name: "Team 1", key: "team_1", position: 1, description: "Advanced Architecture & Systems" },
                { server_id: spaceId, pool_id: upperPool?.id, name: "Team 2", key: "team_2", position: 2, description: "Product & Strategic Engineering" },
                { server_id: spaceId, pool_id: lowerPool?.id, name: "Team 3", key: "team_3", position: 3, description: "Core Development & Infrastructure" },
                { server_id: spaceId, pool_id: lowerPool?.id, name: "Team 4", key: "team_4", position: 4, description: "Interface & Experience" },
                { server_id: spaceId, pool_id: lowerPool?.id, name: "Team 5", key: "team_5", position: 5, description: "Operations, Research & Quality" },
            ];

            for (const ts of teamSeeds) {
                const { data: existingTeam } = await supabase
                    .from("aiic_teams")
                    .select("id")
                    .eq("server_id", spaceId)
                    .eq("key", ts.key)
                    .maybeSingle();

                if (!existingTeam?.id) {
                    await supabase.from("aiic_teams").insert(ts);
                }
            }


            const { data: updatedTeams } = await supabase
                .from("aiic_teams")
                .select(`
                    id,
                    name,
                    key,
                    description,
                    position,
                    pool_id,
                    leader_user_id,
                    leader:users!aiic_team_leader_fk (
                        id,
                        username,
                        display_name,
                        avatar_url
                    )
                `)
                .eq("server_id", spaceId)
                .order("position", { ascending: true });

            teams = updatedTeams || [];
        }

        // 3. Fetch active team members
        const teamIds = (teams || []).map((t: any) => t.id);
        let membersByTeam: Record<string, any[]> = {};

        if (teamIds.length > 0) {
            const { data: membersData } = await supabase
                .from("aiic_team_members")
                .select(`
                    id,
                    team_id,
                    user_id,
                    position,
                    joined_at,
                    user:users!user_id (
                        id,
                        username,
                        display_name,
                        avatar_url
                    )
                `)
                .in("team_id", teamIds)
                .eq("is_active", true);

            (membersData || []).forEach((m: any) => {
                if (!membersByTeam[m.team_id]) membersByTeam[m.team_id] = [];
                membersByTeam[m.team_id].push({
                    id: m.user?.id || m.user_id,
                    displayName: m.user?.display_name || m.user?.username || "Member",
                    username: m.user?.username || "user",
                    avatarUrl: m.user?.avatar_url || null,
                    position: m.position,
                    joinedAt: m.joined_at,
                });
            });
        }

        const formattedTeams = (teams || []).map((t: any) => ({
            ...t,
            members: membersByTeam[t.id] || [],
            memberCount: (membersByTeam[t.id] || []).length,
        }));

        return NextResponse.json({
            pools: pools || [],
            teams: formattedTeams,
        });
    } catch (err: any) {
        console.error("[TEAMS_API_ERROR]", err);
        return NextResponse.json({ error: err?.message || "Failed to load pools and teams" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { spaceId, teamId, targetUserId, action } = body; // action: 'add' | 'remove'

        if (!spaceId || !teamId || !targetUserId) {
            return NextResponse.json({ error: "spaceId, teamId, and targetUserId are required" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // Resolve user IDs
        let actorId = user.id;
        const { data: actorRow } = await supabase.from("users").select("id").or(`id.eq.${user.id},auth_user_id.eq.${user.id}`).maybeSingle();
        if (actorRow?.id) actorId = actorRow.id;

        let targetId = targetUserId;
        const { data: targetRow } = await supabase.from("users").select("id").or(`id.eq.${targetUserId},auth_user_id.eq.${targetUserId}`).maybeSingle();
        if (targetRow?.id) targetId = targetRow.id;

        if (action === "remove") {
            await supabase
                .from("aiic_team_members")
                .update({ is_active: false, left_at: new Date().toISOString() })
                .eq("team_id", teamId)
                .eq("user_id", targetId);

            // If user was leader, remove leader_user_id
            await supabase
                .from("aiic_teams")
                .update({ leader_user_id: null })
                .eq("id", teamId)
                .eq("leader_user_id", targetId);

            await supabase.from("aiic_audit_logs").insert({
                server_id: spaceId,
                actor_user_id: actorId,
                target_user_id: targetId,
                action: "TEAM_MEMBER_REMOVED",
                category: "organization",
                entity_type: "aiic_teams",
                entity_id: teamId,
                metadata: { team_id: teamId },
            });

            return NextResponse.json({ success: true, action: "removed" });
        }

        // Add to team: first deactivate from other teams in this space
        const { data: spaceTeams } = await supabase.from("aiic_teams").select("id").eq("server_id", spaceId);
        const spaceTeamIds = (spaceTeams || []).map((t: any) => t.id);

        if (spaceTeamIds.length > 0) {
            await supabase
                .from("aiic_team_members")
                .update({ is_active: false, left_at: new Date().toISOString() })
                .in("team_id", spaceTeamIds)
                .eq("user_id", targetId);
        }

        // Insert or update active membership safely
        const { data: existingMember } = await supabase
            .from("aiic_team_members")
            .select("id")
            .eq("team_id", teamId)
            .eq("user_id", targetId)
            .maybeSingle();

        let membership: any;
        if (existingMember?.id) {
            const { data: updated, error: updErr } = await supabase
                .from("aiic_team_members")
                .update({
                    position: "member",
                    is_active: true,
                    assigned_by: actorId,
                    left_at: null,
                })
                .eq("id", existingMember.id)
                .select()
                .single();
            if (updErr) throw updErr;
            membership = updated;
        } else {
            const { data: inserted, error: insErr } = await supabase
                .from("aiic_team_members")
                .insert({
                    team_id: teamId,
                    user_id: targetId,
                    position: "member",
                    assigned_by: actorId,
                    joined_at: new Date().toISOString(),
                    is_active: true,
                })
                .select()
                .single();
            if (insErr) throw insErr;
            membership = inserted;
        }


        await supabase.from("aiic_audit_logs").insert({
            server_id: spaceId,
            actor_user_id: actorId,
            target_user_id: targetId,
            action: "TEAM_MEMBER_ASSIGNED",
            category: "organization",
            entity_type: "aiic_teams",
            entity_id: teamId,
            metadata: { team_id: teamId, position: "member" },
        });

        return NextResponse.json({ success: true, membership });
    } catch (err: any) {
        console.error("[TEAM_ASSIGN_ERROR]", err);
        return NextResponse.json({ error: err?.message || "Failed to update team membership" }, { status: 500 });
    }
}

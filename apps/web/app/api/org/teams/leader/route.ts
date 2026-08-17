import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { spaceId, teamId, leaderUserId } = body;

        if (!spaceId || !teamId) {
            return NextResponse.json({ error: "spaceId and teamId are required" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        let actorId = user.id;
        const { data: actorRow } = await supabase.from("users").select("id").or(`id.eq.${user.id},auth_user_id.eq.${user.id}`).maybeSingle();
        if (actorRow?.id) actorId = actorRow.id;

        let targetId = leaderUserId || null;
        if (targetId) {
            const { data: targetRow } = await supabase.from("users").select("id").or(`id.eq.${targetId},auth_user_id.eq.${targetId}`).maybeSingle();
            if (targetRow?.id) targetId = targetRow.id;
        }

        // Update leader on team
        const { data: updatedTeam, error: teamErr } = await supabase
            .from("aiic_teams")
            .update({ leader_user_id: targetId })
            .eq("id", teamId)
            .select()
            .single();

        if (teamErr) throw teamErr;

        // If appointing a leader, also update position in aiic_team_members
        if (targetId) {
            const { data: existingMember } = await supabase
                .from("aiic_team_members")
                .select("id")
                .eq("team_id", teamId)
                .eq("user_id", targetId)
                .maybeSingle();

            if (existingMember?.id) {
                await supabase
                    .from("aiic_team_members")
                    .update({
                        position: "leader",
                        is_active: true,
                        assigned_by: actorId,
                        left_at: null,
                    })
                    .eq("id", existingMember.id);
            } else {
                await supabase
                    .from("aiic_team_members")
                    .insert({
                        team_id: teamId,
                        user_id: targetId,
                        position: "leader",
                        assigned_by: actorId,
                        joined_at: new Date().toISOString(),
                        is_active: true,
                    });
            }

            // Demote other members in that team from 'leader' to 'member'
            await supabase
                .from("aiic_team_members")
                .update({ position: "member" })
                .eq("team_id", teamId)
                .neq("user_id", targetId)
                .eq("position", "leader");
        }


        // Audit log
        await supabase.from("aiic_audit_logs").insert({
            server_id: spaceId,
            actor_user_id: actorId,
            target_user_id: targetId,
            action: targetId ? "TEAM_LEADER_APPOINTED" : "TEAM_LEADER_REMOVED",
            category: "organization",
            entity_type: "aiic_teams",
            entity_id: teamId,
            metadata: { team_id: teamId, leader_user_id: targetId },
        });

        return NextResponse.json({ success: true, team: updatedTeam });
    } catch (err: any) {
        console.error("[APPOINT_LEADER_ERROR]", err);
        return NextResponse.json({ error: err?.message || "Failed to appoint team leader" }, { status: 500 });
    }
}

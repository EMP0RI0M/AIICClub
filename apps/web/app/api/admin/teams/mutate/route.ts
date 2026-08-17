import { NextRequest, NextResponse } from "next/server";
import { verifyAdminBoardAccess } from "@/shared/lib/admin-auth";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function POST(req: NextRequest) {
    const auth = await verifyAdminBoardAccess(req);
    if (!auth.authorized || !auth.user) {
        return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 403 });
    }

    try {
        const body = await req.json();
        const { teamId, action, userId, role, reason } = body;

        if (!teamId || !action) {
            return NextResponse.json({ error: "teamId and action are required." }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { data: team, error: tErr } = await supabase
            .from("aiic_teams")
            .select("id, name, key, position, leader_user_id")
            .eq("id", teamId)
            .single();

        if (tErr || !team) {
            return NextResponse.json({ error: "Team not found." }, { status: 404 });
        }

        if (action === "appoint_leader") {
            if (!userId) return NextResponse.json({ error: "userId is required to appoint leader." }, { status: 400 });

            await supabase
                .from("aiic_teams")
                .update({ leader_user_id: userId, updated_at: new Date().toISOString() })
                .eq("id", teamId);

            // Also ensure the leader is in aiic_team_members
            const { data: existingMember } = await supabase
                .from("aiic_team_members")
                .select("id")
                .eq("team_id", teamId)
                .eq("user_id", userId)
                .maybeSingle();

            if (existingMember) {
                await supabase
                    .from("aiic_team_members")
                    .update({ role: "leader" })
                    .eq("id", existingMember.id);
            } else {
                await supabase.from("aiic_team_members").insert({
                    team_id: teamId,
                    user_id: userId,
                    role: "leader",
                });
            }

            await supabase.from("aiic_audit_logs").insert({
                actor_user_id: auth.user.id,
                target_user_id: userId,
                action: "TEAM_LEADER_APPOINTED",
                category: "organization",
                entity_type: "aiic_teams",
                entity_id: teamId,
                metadata: {
                    team_name: team.name,
                    previous_leader_id: team.leader_user_id,
                    new_leader_id: userId,
                    reason: reason || "Administrative appointment",
                    actor_username: auth.user.username,
                },
            });

            return NextResponse.json({ success: true, action: "leader_appointed" });
        }

        if (action === "remove_leader") {
            const previousLeaderId = team.leader_user_id;
            await supabase
                .from("aiic_teams")
                .update({ leader_user_id: null, updated_at: new Date().toISOString() })
                .eq("id", teamId);

            if (previousLeaderId) {
                await supabase
                    .from("aiic_team_members")
                    .update({ role: "member" })
                    .eq("team_id", teamId)
                    .eq("user_id", previousLeaderId);
            }

            await supabase.from("aiic_audit_logs").insert({
                actor_user_id: auth.user.id,
                target_user_id: previousLeaderId || null,
                action: "TEAM_LEADER_REMOVED",
                category: "organization",
                entity_type: "aiic_teams",
                entity_id: teamId,
                metadata: {
                    team_name: team.name,
                    previous_leader_id: previousLeaderId,
                    reason: reason || "Administrative removal",
                    actor_username: auth.user.username,
                },
            });

            return NextResponse.json({ success: true, action: "leader_removed" });
        }

        if (action === "add_member") {
            if (!userId) return NextResponse.json({ error: "userId is required to add member." }, { status: 400 });

            const { data: existing } = await supabase
                .from("aiic_team_members")
                .select("id")
                .eq("team_id", teamId)
                .eq("user_id", userId)
                .maybeSingle();

            if (!existing) {
                await supabase.from("aiic_team_members").insert({
                    team_id: teamId,
                    user_id: userId,
                    role: role || "member",
                });
            }

            await supabase.from("aiic_audit_logs").insert({
                actor_user_id: auth.user.id,
                target_user_id: userId,
                action: "TEAM_MEMBER_ADDED",
                category: "organization",
                entity_type: "aiic_teams",
                entity_id: teamId,
                metadata: {
                    team_name: team.name,
                    role: role || "member",
                    reason: reason || "Administrative member addition",
                    actor_username: auth.user.username,
                },
            });

            return NextResponse.json({ success: true, action: "member_added" });
        }

        if (action === "remove_member") {
            if (!userId) return NextResponse.json({ error: "userId is required to remove member." }, { status: 400 });

            await supabase
                .from("aiic_team_members")
                .delete()
                .eq("team_id", teamId)
                .eq("user_id", userId);

            // If this user was leader, unset leader
            if (team.leader_user_id === userId) {
                await supabase
                    .from("aiic_teams")
                    .update({ leader_user_id: null, updated_at: new Date().toISOString() })
                    .eq("id", teamId);
            }

            await supabase.from("aiic_audit_logs").insert({
                actor_user_id: auth.user.id,
                target_user_id: userId,
                action: "TEAM_MEMBER_REMOVED",
                category: "organization",
                entity_type: "aiic_teams",
                entity_id: teamId,
                metadata: {
                    team_name: team.name,
                    reason: reason || "Administrative member removal",
                    actor_username: auth.user.username,
                },
            });

            return NextResponse.json({ success: true, action: "member_removed" });
        }

        return NextResponse.json({ error: "Invalid team action." }, { status: 400 });
    } catch (err: any) {
        console.error("[ADMIN_TEAM_MUTATE_ERROR]", err);
        return NextResponse.json({ error: "Failed to execute team mutation." }, { status: 500 });
    }
}

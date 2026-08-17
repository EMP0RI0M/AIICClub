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
        const { targetUserId, transitionReason, notes, confirmSuccession } = body;

        if (!targetUserId) {
            return NextResponse.json({ error: "targetUserId is required for presidential succession." }, { status: 400 });
        }

        if (!confirmSuccession) {
            return NextResponse.json(
                {
                    error: "Presidential succession requires explicit confirmation.",
                    requiresConfirmation: true,
                },
                { status: 400 }
            );
        }

        // Only president_admin or president may execute presidential succession
        if (!["president_admin", "president"].includes(auth.user.roleKey)) {
            return NextResponse.json(
                { error: "Only the President or President + Admin may execute presidential succession." },
                { status: 403 }
            );
        }

        const supabase = getSupabaseAdmin();

        // Get target user
        const { data: targetUser, error: uErr } = await supabase
            .from("users")
            .select("id, username, email, role")
            .eq("id", targetUserId)
            .single();

        if (uErr || !targetUser) {
            return NextResponse.json({ error: "Target successor user not found." }, { status: 404 });
        }

        // Resolve President role
        const { data: presRole, error: rErr } = await supabase
            .from("organization_roles")
            .select("id, key, name, hierarchy_level")
            .eq("key", "president")
            .single();

        if (rErr || !presRole) {
            return NextResponse.json({ error: "President role not found." }, { status: 500 });
        }

        // Assign President role to successor
        await supabase
            .from("organization_role_assignments")
            .update({ is_active: false })
            .eq("user_id", targetUserId);

        const { data: serverRow } = await supabase.from("servers").select("id").limit(1).maybeSingle();
        const serverId = serverRow?.id || "b588b585-78c9-4d33-8bfa-cba60ce4f156";

        await supabase.from("organization_role_assignments").insert({
            server_id: serverId,
            user_id: targetUserId,
            role_id: presRole.id,
            is_active: true,
            assigned_by: auth.user.id,
        });


        // Update target user's role field
        await supabase
            .from("users")
            .update({
                role: "president",
                is_leadership: true,
                leadership_title: "President",
                updated_at: new Date().toISOString(),
            })
            .eq("id", targetUserId);

        // Record in aiic_leadership_history
        await supabase.from("aiic_leadership_history").insert({
            user_id: targetUserId,
            role_id: presRole.id,
            appointed_by: auth.user.id,
            transition_reason: transitionReason || "Executive Presidential Succession",
            notes: notes || "",
            starts_at: new Date().toISOString(),
        });

        // Append audit log
        await supabase.from("aiic_audit_logs").insert({
            actor_user_id: auth.user.id,
            target_user_id: targetUserId,
            action: "PRESIDENCY_TRANSFERRED",
            category: "leadership",
            entity_type: "organization_roles",
            entity_id: presRole.id,
            metadata: {
                reason: transitionReason || "Executive Succession",
                prior_president_id: auth.user.id,
                successor_username: targetUser.username,
                notes: notes || "",
                actor_username: auth.user.username,
            },
        });

        return NextResponse.json({ success: true, successor: targetUser });
    } catch (err: any) {
        console.error("[ADMIN_SUCCESSION_ERROR]", err);
        return NextResponse.json({ error: "Failed to execute presidential succession." }, { status: 500 });
    }
}

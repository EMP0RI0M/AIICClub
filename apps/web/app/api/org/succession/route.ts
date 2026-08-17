import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { spaceId, newPresidentUserId, reason } = body;

        if (!spaceId || !newPresidentUserId) {
            return NextResponse.json({ error: "spaceId and newPresidentUserId are required" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // 1. Resolve actual user IDs
        let actorId = user.id;
        const { data: actorRow } = await supabase
            .from("users")
            .select("id")
            .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
            .maybeSingle();

        if (actorRow?.id) actorId = actorRow.id;

        let targetId = newPresidentUserId;
        const { data: targetRow } = await supabase
            .from("users")
            .select("id")
            .or(`id.eq.${newPresidentUserId},auth_user_id.eq.${newPresidentUserId}`)
            .maybeSingle();

        if (targetRow?.id) targetId = targetRow.id;

        const { data: presRole } = await supabase.from("organization_roles").select("id").eq("key", "president").single();
        const { data: vpRole } = await supabase.from("organization_roles").select("id").eq("key", "vice_president").single();

        if (!presRole || !vpRole) {
            return NextResponse.json({ error: "Roles not found" }, { status: 404 });
        }

        // Find current President
        const { data: currentPres } = await supabase
            .from("organization_role_assignments")
            .select("user_id, starts_at")
            .eq("server_id", spaceId)
            .eq("role_id", presRole.id)
            .eq("is_active", true)
            .maybeSingle();

        if (currentPres?.user_id) {
            // Close current President's assignment
            await supabase
                .from("organization_role_assignments")
                .update({ is_active: false, ends_at: new Date().toISOString() })
                .eq("server_id", spaceId)
                .eq("user_id", currentPres.user_id)
                .eq("is_active", true);

            // Log history
            await supabase.from("aiic_leadership_history").insert({
                server_id: spaceId,
                user_id: currentPres.user_id,
                role_id: presRole.id,
                starts_at: currentPres.starts_at || new Date().toISOString(),
                ends_at: new Date().toISOString(),
                appointed_by: actorId,
                transition_reason: reason || "Executive succession",
            });

            // Transition old President to Vice President
            await supabase.from("organization_role_assignments").insert({
                server_id: spaceId,
                user_id: currentPres.user_id,
                role_id: vpRole.id,
                assigned_by: actorId,
                starts_at: new Date().toISOString(),
                is_active: true,
            });
        }

        // Deactivate new president's prior role
        await supabase
            .from("organization_role_assignments")
            .update({ is_active: false, ends_at: new Date().toISOString() })
            .eq("server_id", spaceId)
            .eq("user_id", targetId)
            .eq("is_active", true);

        // Assign new President
        await supabase.from("organization_role_assignments").insert({
            server_id: spaceId,
            user_id: targetId,
            role_id: presRole.id,
            assigned_by: actorId,
            starts_at: new Date().toISOString(),
            is_active: true,
        });

        // Add to leadership history
        await supabase.from("aiic_leadership_history").insert({
            server_id: spaceId,
            user_id: targetId,
            role_id: presRole.id,
            starts_at: new Date().toISOString(),
            appointed_by: actorId,
            transition_reason: "Appointed as President",
        });

        // Audit log
        await supabase.from("aiic_audit_logs").insert({
            server_id: spaceId,
            actor_user_id: actorId,
            target_user_id: targetId,
            action: "PRESIDENCY_TRANSFERRED",
            category: "leadership",
            entity_type: "organization_roles",
            entity_id: presRole.id,
            metadata: {
                prior_president_id: currentPres?.user_id || null,
                reason: reason || "Executive succession",
            },
        });

        return NextResponse.json({ success: true, newPresidentId: targetId });
    } catch (err: any) {
        console.error("[SUCCESSION_ERROR]", err);
        return NextResponse.json({ error: err?.message || "Succession transfer failed" }, { status: 500 });
    }
}

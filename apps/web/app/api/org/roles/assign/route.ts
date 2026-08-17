import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { spaceId, targetUserId, roleKey } = body;

        if (!spaceId || !targetUserId || !roleKey) {
            return NextResponse.json({ error: "spaceId, targetUserId, and roleKey are required" }, { status: 400 });
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

        // Verify actor holds president_admin, president, or admin
        const { data: actorRoles } = await supabase
            .from("organization_role_assignments")
            .select("role:organization_roles(key)")
            .eq("user_id", actorId)
            .eq("is_active", true);

        const isAuthorizedToAssign = (actorRoles || []).some((r: any) =>
            ["president_admin", "president", "admin"].includes(r.role?.key)
        );

        if (!isAuthorizedToAssign) {
            return NextResponse.json({
                error: "Unauthorized: Only President and Admin can assign organizational roles.",
                reason: "forbidden"
            }, { status: 403 });
        }

        let targetId = targetUserId;
        const { data: targetRow } = await supabase
            .from("users")
            .select("id")
            .or(`id.eq.${targetUserId},auth_user_id.eq.${targetUserId}`)
            .maybeSingle();

        if (targetRow?.id) targetId = targetRow.id;

        // 2. Execute assignment
        const { data: roleRow } = await supabase
            .from("organization_roles")
            .select("id, name")
            .eq("key", roleKey)
            .single();


        if (!roleRow) {
            return NextResponse.json({ error: `Role ${roleKey} not found` }, { status: 404 });
        }

        // Deactivate active role
        await supabase
            .from("organization_role_assignments")
            .update({ is_active: false, ends_at: new Date().toISOString() })
            .eq("server_id", spaceId)
            .eq("user_id", targetId)
            .eq("is_active", true);

        // Insert new assignment
        const { data: newAssignment, error: insertError } = await supabase
            .from("organization_role_assignments")
            .insert({
                server_id: spaceId,
                user_id: targetId,
                role_id: roleRow.id,
                assigned_by: actorId,
                starts_at: new Date().toISOString(),
                is_active: true,
            })
            .select()
            .single();

        if (insertError) {
            throw insertError;
        }

        // Write to audit log
        await supabase.from("aiic_audit_logs").insert({
            server_id: spaceId,
            actor_user_id: actorId,
            target_user_id: targetId,
            action: "ROLE_ASSIGNED",
            category: "organization",
            entity_type: "organization_roles",
            entity_id: roleRow.id,
            metadata: { role_key: roleKey, role_name: roleRow.name },
        });

        return NextResponse.json({ success: true, assignment: newAssignment });
    } catch (err: any) {
        console.error("[ASSIGN_ROLE_ERROR]", err);
        return NextResponse.json({ error: err?.message || "Failed to assign role" }, { status: 500 });
    }
}

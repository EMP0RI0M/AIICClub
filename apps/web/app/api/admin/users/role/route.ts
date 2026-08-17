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
        const { targetUserId, roleKey, reason, confirmHighPrivilege } = body;

        if (!targetUserId || !roleKey) {
            return NextResponse.json({ error: "targetUserId and roleKey are required." }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // 1. Get target user
        const { data: targetUser, error: uErr } = await supabase
            .from("users")
            .select("id, username, email, role, status")
            .eq("id", targetUserId)
            .single();

        if (uErr || !targetUser) {
            return NextResponse.json({ error: "Target user not found." }, { status: 404 });
        }

        // 2. High-Privilege Safeguards
        const highPrivilegeRoles = ["president_admin", "admin", "president"];
        if (highPrivilegeRoles.includes(roleKey)) {
            if (!confirmHighPrivilege) {
                return NextResponse.json(
                    {
                        error: `Assigning high-privilege role '${roleKey}' requires explicit confirmation.`,
                        requiresConfirmation: true,
                    },
                    { status: 400 }
                );
            }

            // Only president_admin can assign president_admin or admin
            if (["president_admin", "admin"].includes(roleKey) && auth.user.roleKey !== "president_admin") {
                return NextResponse.json(
                    { error: "Only President + Admin may assign Administrative tier roles." },
                    { status: 403 }
                );
            }
        }

        // Prevent self-demotion if actor is the only active president_admin
        if (targetUserId === auth.user.id && roleKey !== auth.user.roleKey) {
            const { count: presidentAdminCount } = await supabase
                .from("organization_role_assignments")
                .select("id, role:organization_roles!inner(key)", { count: "exact", head: true })
                .eq("role.key", "president_admin")
                .eq("is_active", true);

            if ((presidentAdminCount || 0) <= 1 && auth.user.roleKey === "president_admin") {
                return NextResponse.json(
                    { error: "Cannot demote the sole active President + Admin account." },
                    { status: 400 }
                );
            }
        }

        // 3. Resolve role ID
        const { data: roleRow, error: rErr } = await supabase
            .from("organization_roles")
            .select("id, key, name, hierarchy_level")
            .eq("key", roleKey)
            .single();

        if (rErr || !roleRow) {
            return NextResponse.json({ error: `Role '${roleKey}' does not exist.` }, { status: 400 });
        }

        // 4. Update organization_role_assignments
        await supabase
            .from("organization_role_assignments")
            .update({ is_active: false })
            .eq("user_id", targetUserId);

        // Resolve default server ID
        const { data: serverRow } = await supabase.from("servers").select("id").limit(1).maybeSingle();
        const serverId = serverRow?.id || "b588b585-78c9-4d33-8bfa-cba60ce4f156";

        const { error: assignErr } = await supabase
            .from("organization_role_assignments")
            .insert({
                server_id: serverId,
                user_id: targetUserId,
                role_id: roleRow.id,
                is_active: true,
                assigned_by: auth.user.id,
            });

        if (assignErr) throw assignErr;


        // 5. Synchronize public.users
        await supabase
            .from("users")
            .update({
                role: roleRow.key,
                updated_at: new Date().toISOString(),
            })
            .eq("id", targetUserId);

        // 6. Append audit log
        await supabase.from("aiic_audit_logs").insert({
            actor_user_id: auth.user.id,
            target_user_id: targetUserId,
            action: "ROLE_CHANGED",
            category: "governance",
            entity_type: "organization_roles",
            entity_id: roleRow.id,
            metadata: {
                previous_role: targetUser.role,
                new_role: roleRow.key,
                role_name: roleRow.name,
                hierarchy_level: roleRow.hierarchy_level,
                reason: reason || "Administrative role change",
                actor_username: auth.user.username,
            },
        });

        return NextResponse.json({
            success: true,
            user: {
                id: targetUserId,
                roleKey: roleRow.key,
                roleName: roleRow.name,
                hierarchyLevel: roleRow.hierarchy_level,
            },
        });
    } catch (err: any) {
        console.error("[ADMIN_ROLE_CHANGE_ERROR]", err);
        return NextResponse.json({ error: "Failed to update user organizational role." }, { status: 500 });
    }
}

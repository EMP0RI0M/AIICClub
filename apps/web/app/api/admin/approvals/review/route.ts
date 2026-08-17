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
        const { targetUserId, action, roleKey, notes, confirmHighPrivilege } = body;

        if (!targetUserId || !action) {
            return NextResponse.json({ error: "targetUserId and action are required." }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // 1. Verify target user exists
        const { data: targetUser, error: uErr } = await supabase
            .from("users")
            .select("id, username, email, role, status")
            .eq("id", targetUserId)
            .single();

        if (uErr || !targetUser) {
            return NextResponse.json({ error: "Target user not found." }, { status: 404 });
        }

        // 2. Handle High-Privilege Safeguards
        const highPrivilegeRoles = ["president_admin", "admin", "president"];
        if (roleKey && highPrivilegeRoles.includes(roleKey)) {
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

        let newStatus = targetUser.status || "active";
        let targetRoleKey = roleKey || "member";
        let auditAction = "USER_REVIEWED";

        if (action === "approve") {
            newStatus = "active";
            auditAction = "USER_APPROVED";
        } else if (action === "reject") {
            newStatus = "rejected";
            targetRoleKey = "visitor";
            auditAction = "USER_REJECTED";
        } else if (action === "suspend") {
            newStatus = "suspended";
            auditAction = "USER_SUSPENDED";
        } else if (action === "restore") {
            newStatus = "active";
            auditAction = "USER_RESTORED";
        }

        // 3. Resolve organization role ID
        const { data: roleRow, error: rErr } = await supabase
            .from("organization_roles")
            .select("id, key, name, hierarchy_level")
            .eq("key", targetRoleKey)
            .single();

        if (rErr || !roleRow) {
            return NextResponse.json({ error: `Organization role '${targetRoleKey}' not found.` }, { status: 400 });
        }

        // 4. Update organization_role_assignments (deactivate previous active assignments)
        await supabase
            .from("organization_role_assignments")
            .update({ is_active: false })
            .eq("user_id", targetUserId);

        // Resolve default server ID
        const { data: serverRow } = await supabase.from("servers").select("id").limit(1).maybeSingle();
        const serverId = serverRow?.id || "b588b585-78c9-4d33-8bfa-cba60ce4f156";

        // Insert new active role assignment
        const { error: assignErr } = await supabase
            .from("organization_role_assignments")
            .insert({
                server_id: serverId,
                user_id: targetUserId,
                role_id: roleRow.id,
                is_active: true,
                assigned_by: auth.user.id,
            });

        if (assignErr) {
            console.error("[ROLE_ASSIGN_ERROR]", assignErr);
            return NextResponse.json({ error: "Failed to create role assignment." }, { status: 500 });
        }


        // 5. Synchronize public.users fields
        await supabase
            .from("users")
            .update({
                status: newStatus,
                role: roleRow.key,
                updated_at: new Date().toISOString(),
            })
            .eq("id", targetUserId);

        // 6. Write append-only audit record to aiic_audit_logs
        await supabase.from("aiic_audit_logs").insert({
            actor_user_id: auth.user.id,
            target_user_id: targetUserId,
            action: auditAction,
            category: "governance",
            entity_type: "users",
            entity_id: targetUserId,
            metadata: {
                previous_status: targetUser.status,
                new_status: newStatus,
                previous_role: targetUser.role,
                new_role: roleRow.key,
                role_name: roleRow.name,
                hierarchy_level: roleRow.hierarchy_level,
                notes: notes || "",
                reviewer_username: auth.user.username,
            },
        });

        return NextResponse.json({
            success: true,
            user: {
                id: targetUserId,
                status: newStatus,
                roleKey: roleRow.key,
                roleName: roleRow.name,
                hierarchyLevel: roleRow.hierarchy_level,
            },
        });
    } catch (err: any) {
        console.error("[ADMIN_APPROVAL_REVIEW_ERROR]", err);
        return NextResponse.json({ error: "Failed to execute review action." }, { status: 500 });
    }
}

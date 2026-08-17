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
        const { targetUserId, status, reason } = body;

        if (!targetUserId || !status) {
            return NextResponse.json({ error: "targetUserId and status are required." }, { status: 400 });
        }

        if (!["active", "suspended", "pending"].includes(status)) {
            return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
        }

        if (targetUserId === auth.user.id && status === "suspended") {
            return NextResponse.json({ error: "You cannot suspend your own administrative account." }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { data: targetUser, error: uErr } = await supabase
            .from("users")
            .select("id, username, email, status")
            .eq("id", targetUserId)
            .single();

        if (uErr || !targetUser) {
            return NextResponse.json({ error: "Target user not found." }, { status: 404 });
        }

        await supabase
            .from("users")
            .update({
                status,
                updated_at: new Date().toISOString(),
            })
            .eq("id", targetUserId);

        const auditAction = status === "suspended" ? "USER_SUSPENDED" : status === "active" ? "USER_RESTORED" : "USER_STATUS_CHANGED";

        await supabase.from("aiic_audit_logs").insert({
            actor_user_id: auth.user.id,
            target_user_id: targetUserId,
            action: auditAction,
            category: "governance",
            entity_type: "users",
            entity_id: targetUserId,
            metadata: {
                previous_status: targetUser.status,
                new_status: status,
                reason: reason || "",
                actor_username: auth.user.username,
            },
        });

        return NextResponse.json({ success: true, status });
    } catch (err: any) {
        console.error("[ADMIN_STATUS_CHANGE_ERROR]", err);
        return NextResponse.json({ error: "Failed to update user status." }, { status: 500 });
    }
}

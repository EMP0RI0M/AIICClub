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
        const { spaceId, action, reason } = body;

        if (!spaceId || !action) {
            return NextResponse.json({ error: "spaceId and action are required." }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { data: space, error: sErr } = await supabase
            .from("servers")
            .select("id, name, owner_id")
            .eq("id", spaceId)
            .single();

        if (sErr || !space) {
            return NextResponse.json({ error: "Space not found." }, { status: 404 });
        }

        if (action === "delete") {
            // Delete channels and space
            await supabase.from("channels").delete().eq("server_id", spaceId);
            await supabase.from("server_members").delete().eq("server_id", spaceId);
            await supabase.from("servers").delete().eq("id", spaceId);

            await supabase.from("aiic_audit_logs").insert({
                actor_user_id: auth.user.id,
                action: "SPACE_DELETED",
                category: "governance",
                entity_type: "servers",
                entity_id: spaceId,
                metadata: {
                    space_name: space.name,
                    previous_owner_id: space.owner_id,
                    reason: reason || "Administrative deletion",
                    actor_username: auth.user.username,
                },
            });

            return NextResponse.json({ success: true, action: "deleted" });
        }

        return NextResponse.json({ error: "Unsupported space action." }, { status: 400 });
    } catch (err: any) {
        console.error("[ADMIN_SPACE_MANAGE_ERROR]", err);
        return NextResponse.json({ error: "Failed to manage space." }, { status: 500 });
    }
}

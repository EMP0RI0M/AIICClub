import { NextRequest, NextResponse } from "next/server";
import { verifyAdminBoardAccess } from "@/shared/lib/admin-auth";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function GET(req: NextRequest) {
    const auth = await verifyAdminBoardAccess(req);
    if (!auth.authorized || !auth.user) {
        return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "30", 10)));
    const offset = (page - 1) * limit;
    const category = searchParams.get("category");
    const action = searchParams.get("action");
    const search = searchParams.get("search")?.toLowerCase().trim();

    const supabase = getSupabaseAdmin();

    try {
        let query = supabase
            .from("aiic_audit_logs")
            .select(
                "id, server_id, actor_user_id, target_user_id, action, category, entity_type, entity_id, metadata, created_at, actor:users!actor_user_id(id, username, display_name, avatar_url, email), target:users!target_user_id(id, username, display_name, avatar_url, email)",
                { count: "exact" }
            )
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (category) {
            query = query.eq("category", category);
        }

        if (action) {
            query = query.eq("action", action);
        }

        const { data: logs, count, error } = await query;
        if (error) throw error;

        let filteredLogs = logs || [];
        if (search) {
            filteredLogs = filteredLogs.filter((l: any) => {
                const actionMatch = l.action?.toLowerCase().includes(search);
                const actorMatch = l.actor?.username?.toLowerCase().includes(search) || l.actor?.display_name?.toLowerCase().includes(search);
                const targetMatch = l.target?.username?.toLowerCase().includes(search) || l.target?.display_name?.toLowerCase().includes(search);
                const noteMatch = JSON.stringify(l.metadata || {}).toLowerCase().includes(search);
                return actionMatch || actorMatch || targetMatch || noteMatch;
            });
        }

        return NextResponse.json({
            logs: filteredLogs,
            totalCount: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit),
        });
    } catch (err: any) {
        console.error("[ADMIN_AUDIT_GET_ERROR]", err);
        return NextResponse.json({ error: "Failed to fetch audit logs." }, { status: 500 });
    }
}

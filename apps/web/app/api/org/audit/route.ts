import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const spaceId = searchParams.get("spaceId");
    if (!spaceId) return NextResponse.json({ error: "spaceId is required" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    try {
        const { data: logs, error } = await supabase
            .from("aiic_audit_logs")
            .select(`
                id,
                action,
                category,
                metadata,
                created_at,
                actor:users!actor_user_id (
                    id,
                    username,
                    display_name,
                    avatar_url
                ),
                target:users!target_user_id (
                    id,
                    username,
                    display_name,
                    avatar_url
                )
            `)
            .eq("server_id", spaceId)
            .order("created_at", { ascending: false })
            .limit(50);

        if (error) throw error;

        const { data: leadershipHistory } = await supabase
            .from("aiic_leadership_history")
            .select(`
                id,
                starts_at,
                ends_at,
                transition_reason,
                notes,
                user:users!user_id (
                    id,
                    username,
                    display_name,
                    avatar_url
                ),
                role:organization_roles(id, key, name)
            `)
            .eq("server_id", spaceId)
            .order("starts_at", { ascending: false })
            .limit(20);

        return NextResponse.json({
            logs: logs || [],
            leadershipHistory: leadershipHistory || [],
        });
    } catch (err: any) {
        console.error("[AUDIT_API_ERROR]", err);
        return NextResponse.json({ logs: [], leadershipHistory: [] });
    }
}

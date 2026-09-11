import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: channelId } = await params;

    const supabase = getSupabaseAdmin();
    const { data: rows } = await supabase
        .from("stage_participants")
        .select("user_id, role, user:users!user_id(id, username, display_name, avatar_url)")
        .eq("channel_id", channelId);

    const speakers = (rows || []).filter((r: any) => r.role === "speaker").map((r: any) => r.user_id);
    const raisedHands = (rows || []).filter((r: any) => r.role === "raised_hand").map((r: any) => r.user_id);

    return NextResponse.json({
        channelId,
        speakers,
        raisedHands,
        participants: rows || [],
    });
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { broadcastRealtimeEvent } from "@/shared/lib/realtime-broadcast";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: channelId } = await params;

    const supabase = getSupabaseAdmin();
    const { data: userRow } = await supabase
        .from("users")
        .select("id, username, display_name")
        .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
        .maybeSingle();

    const actualUserId = userRow?.id || user.id;

    await supabase.from("voice_states").delete().eq("channel_id", channelId).eq("user_id", actualUserId);

    void broadcastRealtimeEvent(`channel:${channelId}`, "voice_state_leave", {
        channelId,
        userId: actualUserId,
        timestamp: Date.now(),
    });

    return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { broadcastRealtimeEvent } from "@/shared/lib/realtime-broadcast";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: conversationId } = await context.params;
    const supabase = getSupabaseAdmin();

    const { data: userRow } = await supabase
        .from("users")
        .select("id, username, display_name")
        .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
        .maybeSingle();

    const actualUserId = userRow?.id || user.id;

    // Broadcast call_ended to the DM channel
    void broadcastRealtimeEvent(`dm:${conversationId}`, "call_ended", {
        conversationId,
        endedById: actualUserId,
        timestamp: Date.now(),
    });

    return NextResponse.json({ message: "Call ended" });
}

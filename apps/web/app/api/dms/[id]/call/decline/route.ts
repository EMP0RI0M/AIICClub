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
    const actualUserName = userRow?.display_name || userRow?.username || user.displayName || user.username;

    // Broadcast call_declined to all participants in this DM
    void broadcastRealtimeEvent(`dm:${conversationId}`, "call_declined", {
        conversationId,
        declinedById: actualUserId,
        declinedByName: actualUserName,
        timestamp: Date.now(),
    });

    return NextResponse.json({ message: "Call declined" });
}

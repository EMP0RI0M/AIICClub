import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { generateVoiceToken, getLiveKitUrl } from "@/shared/lib/livekit";
import { broadcastRealtimeEvent } from "@/shared/lib/realtime-broadcast";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: conversationId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const video = Boolean(body.video);

    const supabase = getSupabaseAdmin();

    // 1. Resolve caller profile
    const { data: callerUser } = await supabase
        .from("users")
        .select("id, username, display_name, avatar_url")
        .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
        .maybeSingle();

    const callerId = callerUser?.id || user.id;
    const callerName = callerUser?.display_name || callerUser?.username || user.displayName || user.username;
    const callerAvatar = callerUser?.avatar_url || null;

    // 2. Fetch other participants in this conversation
    const { data: participants } = await supabase
        .from("dm_participants")
        .select("user_id, users:user_id(id, auth_user_id)")
        .eq("conversation_id", conversationId)
        .neq("user_id", callerId);

    const roomName = `dm_${conversationId}`;
    const token = await generateVoiceToken(
        roomName,
        callerId,
        callerName
    );

    const callPayload = {
        conversationId,
        callerId,
        callerName,
        callerAvatar,
        video,
        roomName,
        timestamp: Date.now(),
    };

    // 3. Broadcast incoming_call to each participant and the DM channel
    const notifyPromises: Promise<void>[] = [];
    if (participants && participants.length > 0) {
        for (const p of participants as any[]) {
            if (p.user_id) notifyPromises.push(broadcastRealtimeEvent(`user:${p.user_id}`, "incoming_call", callPayload));
            if (p.users?.auth_user_id && p.users.auth_user_id !== p.user_id) {
                notifyPromises.push(broadcastRealtimeEvent(`user:${p.users.auth_user_id}`, "incoming_call", callPayload));
            }
        }
    }
    notifyPromises.push(broadcastRealtimeEvent(`dm:${conversationId}`, "incoming_call", callPayload));

    // Fire signaling broadcasts in parallel without blocking response
    void Promise.allSettled(notifyPromises);


    return NextResponse.json({
        token,
        url: getLiveKitUrl(),
        roomName,
        video,
    });
}

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

    const { id: channelId } = await context.params;
    const supabase = getSupabaseAdmin();

    const { data: channel, error } = await supabase
        .from("channels")
        .select("id, name, type, server_id, servers(name)")
        .eq("id", channelId)
        .maybeSingle();

    if (error || !channel) {
        return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const { data: userRow } = await supabase
        .from("users")
        .select("id, username, display_name, avatar_url")
        .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
        .maybeSingle();

    const actualUserId = userRow?.id || user.id;
    const actualUserName = userRow?.display_name || userRow?.username || user.displayName || user.username;
    const avatarUrl = userRow?.avatar_url || null;

    // Record voice participant in voice_states / voice_participants
    try {
        await supabase
            .from("voice_states")
            .upsert(
                {
                    channel_id: channelId,
                    user_id: actualUserId,
                    is_muted: false,
                    is_deafened: false,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "channel_id,user_id" }
            );
    } catch {}

    const roomName = `channel_${channel.id}`;
    const token = await generateVoiceToken(
        roomName,
        actualUserId,
        actualUserName
    );

    // Broadcast voice_state_update to channel and server
    void broadcastRealtimeEvent(`channel:${channel.id}`, "voice_state_update", {
        channelId: channel.id,
        serverId: channel.server_id,
        userId: actualUserId,
        username: userRow?.username || user.username,
        displayName: actualUserName,
        avatarUrl,
        isMuted: false,
        isDeafened: false,
        timestamp: Date.now(),
    });

    // Fetch active participants in this channel
    let participants: any[] = [];
    try {
        const { data: voiceRows } = await supabase
            .from("voice_states")
            .select(`
                user_id,
                is_muted,
                is_deafened,
                users(id, username, display_name, avatar_url)
            `)
            .eq("channel_id", channelId);

        if (voiceRows && voiceRows.length > 0) {
            participants = voiceRows.map((r: any) => ({
                userId: r.user_id,
                username: r.users?.username || "member",
                displayName: r.users?.display_name || r.users?.username || "Member",
                avatarUrl: r.users?.avatar_url || null,
                isMuted: Boolean(r.is_muted),
                isDeafened: Boolean(r.is_deafened),
            }));
        }
    } catch {}

    if (!participants.some((p) => p.userId === actualUserId)) {
        participants.push({
            userId: actualUserId,
            username: userRow?.username || user.username,
            displayName: actualUserName,
            avatarUrl,
            isMuted: false,
            isDeafened: false,
        });
    }

    return NextResponse.json({
        token,
        url: getLiveKitUrl(),
        roomName,
        channelName: channel.name,
        serverName: (channel as any).servers?.name || "Space",
        serverId: channel.server_id,
        channelType: channel.type,
        participants,
    });
}

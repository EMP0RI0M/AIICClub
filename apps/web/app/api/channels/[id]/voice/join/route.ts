import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { generateVoiceToken, getLiveKitUrl } from "@/shared/lib/livekit";

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

    const roomName = `channel_${channel.id}`;
    const token = await generateVoiceToken(
        roomName,
        user.id,
        user.displayName || user.username
    );

    return NextResponse.json({
        token,
        url: getLiveKitUrl(),
        roomName,
        channelName: channel.name,
        serverName: (channel as any).servers?.name || "Space",
        serverId: channel.server_id,
        channelType: channel.type,
        participants: [],
    });
}

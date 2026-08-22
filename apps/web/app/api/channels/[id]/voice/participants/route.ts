import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: channelId } = await context.params;
    const supabase = getSupabaseAdmin();

    // Check channel existence
    const { data: channel, error: chErr } = await supabase
        .from("channels")
        .select("id, name, type, server_id")
        .eq("id", channelId)
        .maybeSingle();

    if (chErr || !channel) {
        return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Try fetching active participants from voice_participants if table exists
    try {
        const { data: voiceRows, error: vpErr } = await supabase
            .from("voice_participants")
            .select(`
                user_id,
                joined_at,
                is_muted,
                is_deafened,
                users(id, username, display_name, avatar_url)
            `)
            .eq("channel_id", channelId);

        if (!vpErr && voiceRows) {
            const participants = voiceRows.map((r: any) => ({
                userId: r.user_id,
                username: r.users?.username || "member",
                displayName: r.users?.display_name || r.users?.username || "Member",
                avatarUrl: r.users?.avatar_url || null,
                isMuted: r.is_muted ?? false,
                isDeafened: r.is_deafened ?? false,
                joinedAt: r.joined_at,
            }));
            return NextResponse.json({ participants });
        }
    } catch {
        // Fallback gracefully
    }

    return NextResponse.json({ participants: [] });
}

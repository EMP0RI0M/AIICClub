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

    const { id: messageId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const { emoji } = body;

    if (!emoji) {
        return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    try {
        // Resolve application user ID
        let actualUserId = user.id;
        const { data: userRow } = await supabase
            .from("users")
            .select("id")
            .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
            .maybeSingle();

        if (userRow?.id) {
            actualUserId = userRow.id;
        }

        // Fetch message channel
        const { data: msg } = await supabase
            .from("messages")
            .select("id, channel_id")
            .eq("id", messageId)
            .maybeSingle();

        // Upsert into reactions
        await supabase.from("reactions").upsert(
            {
                message_id: messageId,
                user_id: actualUserId,
                emoji,
                created_at: new Date().toISOString(),
            },
            { onConflict: "message_id,user_id,emoji" }
        );

        // Broadcast reaction_add to channel subscribers
        if (msg?.channel_id) {
            void broadcastRealtimeEvent(`channel:${msg.channel_id}`, "reaction_add", {
                channelId: msg.channel_id,
                messageId,
                emoji,
                userId: actualUserId,
            });
        }
    } catch (err: any) {
        console.warn("Reaction upsert:", err?.message);
    }

    return NextResponse.json({ success: true, message: "Reaction added", messageId, emoji });
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: messageId } = await context.params;
    const { searchParams } = new URL(req.url);
    const emoji = searchParams.get("emoji");

    const supabase = getSupabaseAdmin();
    try {
        // Resolve application user ID
        let actualUserId = user.id;
        const { data: userRow } = await supabase
            .from("users")
            .select("id")
            .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
            .maybeSingle();

        if (userRow?.id) {
            actualUserId = userRow.id;
        }

        // Fetch message channel
        const { data: msg } = await supabase
            .from("messages")
            .select("id, channel_id")
            .eq("id", messageId)
            .maybeSingle();

        let query = supabase
            .from("reactions")
            .delete()
            .eq("message_id", messageId)
            .eq("user_id", actualUserId);

        if (emoji) {
            query = query.eq("emoji", emoji);
        }
        await query;

        // Broadcast reaction_remove to channel subscribers
        if (msg?.channel_id) {
            void broadcastRealtimeEvent(`channel:${msg.channel_id}`, "reaction_remove", {
                channelId: msg.channel_id,
                messageId,
                emoji: emoji || "",
                userId: actualUserId,
            });
        }
    } catch (err: any) {
        console.warn("Reaction delete:", err?.message);
    }

    return NextResponse.json({ success: true, message: "Reaction removed", messageId, emoji });
}

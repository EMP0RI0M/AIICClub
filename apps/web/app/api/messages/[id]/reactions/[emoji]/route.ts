import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { broadcastRealtimeEvent } from "@/shared/lib/realtime-broadcast";

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string; emoji: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: messageId, emoji: rawEmoji } = await context.params;
    const emoji = decodeURIComponent(rawEmoji);

    const supabase = getSupabaseAdmin();
    try {
        let actualUserId = user.id;
        const { data: userRow } = await supabase
            .from("users")
            .select("id")
            .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
            .maybeSingle();

        if (userRow?.id) {
            actualUserId = userRow.id;
        }

        const { data: msg } = await supabase
            .from("messages")
            .select("id, channel_id")
            .eq("id", messageId)
            .maybeSingle();

        await supabase
            .from("reactions")
            .delete()
            .eq("message_id", messageId)
            .eq("user_id", actualUserId)
            .eq("emoji", emoji);

        if (msg?.channel_id) {
            void broadcastRealtimeEvent(`channel:${msg.channel_id}`, "reaction_remove", {
                channelId: msg.channel_id,
                messageId,
                emoji,
                userId: actualUserId,
            });
        }
    } catch (err: any) {
        console.warn("Reaction delete:", err?.message);
    }

    return NextResponse.json({ success: true, message: "Reaction removed", messageId, emoji });
}

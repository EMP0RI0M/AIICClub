import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { broadcastRealtimeEvent } from "@/shared/lib/realtime-broadcast";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string; messageId: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: conversationId, messageId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const { emoji } = body;

    if (!emoji) {
        return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
    }

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

        await supabase.from("reactions").upsert(
            {
                message_id: messageId,
                user_id: actualUserId,
                emoji,
                created_at: new Date().toISOString(),
            },
            { onConflict: "message_id,user_id,emoji" }
        );

        // Broadcast to DM subscribers
        void broadcastRealtimeEvent(`dm:${conversationId}`, "dm_reaction_add", {
            conversationId,
            messageId,
            emoji,
            userId: actualUserId,
        });
    } catch (err: any) {
        console.warn("DM Reaction upsert:", err?.message);
    }

    return NextResponse.json({ success: true, message: "Reaction added", messageId, emoji });
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string; messageId: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: conversationId, messageId } = await context.params;
    const { searchParams } = new URL(req.url);
    const emoji = searchParams.get("emoji");

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

        let query = supabase
            .from("reactions")
            .delete()
            .eq("message_id", messageId)
            .eq("user_id", actualUserId);

        if (emoji) {
            query = query.eq("emoji", emoji);
        }
        await query;

        // Broadcast to DM subscribers
        void broadcastRealtimeEvent(`dm:${conversationId}`, "dm_reaction_remove", {
            conversationId,
            messageId,
            emoji: emoji || "",
            userId: actualUserId,
        });
    } catch (err: any) {
        console.warn("DM Reaction delete:", err?.message);
    }

    return NextResponse.json({ success: true, message: "Reaction removed", messageId, emoji });
}

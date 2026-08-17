import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string; messageId: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: channelId, messageId } = await context.params;
    const supabase = getSupabaseAdmin();

    let actualUserId = user.id;
    const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
        .maybeSingle();

    if (userRow?.id) {
        actualUserId = userRow.id;
    }

    const { data, error } = await supabase
        .from("pinned_messages")
        .upsert(
            {
                channel_id: channelId,
                message_id: messageId,
                pinned_by_id: actualUserId,
                pinned_at: new Date().toISOString(),
            },
            { onConflict: "channel_id,message_id" }
        )
        .select()
        .single();

    if (error) {
        console.error("[PIN] Insert error:", error);
    }

    return NextResponse.json({ message: "Message pinned", data });
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string; messageId: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: channelId, messageId } = await context.params;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
        .from("pinned_messages")
        .delete()
        .eq("channel_id", channelId)
        .eq("message_id", messageId);

    if (error) {
        console.error("[PIN] Delete error:", error);
    }

    return NextResponse.json({ message: "Message unpinned" });
}

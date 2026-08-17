import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: channelId } = await context.params;
    const supabase = getSupabaseAdmin();

    const { data: channel, error } = await supabase
        .from("channels")
        .select("*")
        .eq("id", channelId)
        .maybeSingle();

    if (error || !channel) {
        return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    return NextResponse.json({
        channel: {
            id: channel.id,
            serverId: channel.server_id,
            name: channel.name,
            type: channel.type,
            category: channel.category,
            topic: channel.topic,
            position: channel.position,
            createdAt: channel.created_at,
        },
    });
}

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: channelId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseAdmin();

    const updates: Record<string, any> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.topic !== undefined) updates.topic = body.topic;
    if (body.category !== undefined) updates.category = body.category;
    if (body.position !== undefined) updates.position = body.position;
    if (body.type !== undefined) updates.type = body.type;

    const { data: channel, error } = await supabase
        .from("channels")
        .update(updates)
        .eq("id", channelId)
        .select()
        .single();

    if (error || !channel) {
        return NextResponse.json({ error: error?.message || "Failed to update channel" }, { status: 500 });
    }

    return NextResponse.json({
        channel: {
            id: channel.id,
            serverId: channel.server_id,
            name: channel.name,
            type: channel.type,
            category: channel.category,
            topic: channel.topic,
            position: channel.position,
            createdAt: channel.created_at,
        },
    });
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: channelId } = await context.params;
    const supabase = getSupabaseAdmin();

    // Cascading clean up messages for this channel
    await supabase.from("messages").delete().eq("channel_id", channelId);
    const { error } = await supabase.from("channels").delete().eq("id", channelId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

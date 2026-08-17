import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: serverId } = await context.params;
    const supabase = getSupabaseAdmin();

    const { data: channels, error } = await supabase
        .from("channels")
        .select("*")
        .eq("server_id", serverId)
        .order("position", { ascending: true });

    if (error) {
        return NextResponse.json({ channels: [] });
    }

    return NextResponse.json({
        channels: (channels || []).map((ch: any) => ({
            id: ch.id,
            serverId: ch.server_id,
            name: ch.name,
            type: ch.type,
            category: ch.category,
            topic: ch.topic,
            position: ch.position,
            createdAt: ch.created_at,
        })),
    });
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: serverId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const { name, type = "text", category = "General", topic } = body;

    if (!name) {
        return NextResponse.json({ error: "Channel name is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: channel, error } = await supabase
        .from("channels")
        .insert({
            server_id: serverId,
            name,
            type,
            category,
            topic: topic ?? null,
            position: 0,
        })
        .select()
        .single();

    if (error || !channel) {
        return NextResponse.json({ error: "Could not create channel" }, { status: 500 });
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
    }, { status: 201 });
}

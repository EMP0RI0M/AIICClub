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

    const { data: server, error } = await supabase
        .from("servers")
        .select("*")
        .eq("id", serverId)
        .maybeSingle();

    if (error || !server) {
        return NextResponse.json({ error: "Space not found" }, { status: 404 });
    }

    const { data: channels } = await supabase
        .from("channels")
        .select("*")
        .eq("server_id", serverId)
        .order("position", { ascending: true });

    return NextResponse.json({
        server: {
            id: server.id,
            name: server.name,
            iconUrl: server.icon_url,
            description: server.description,
            ownerId: server.owner_id,
            inviteCode: server.invite_code,
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
        },
    });
}

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: serverId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseAdmin();

    const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
    };
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.iconUrl !== undefined) updates.icon_url = body.iconUrl;
    if (body.description !== undefined) updates.description = body.description;

    const { data: updatedServer, error } = await supabase
        .from("servers")
        .update(updates)
        .eq("id", serverId)
        .select()
        .single();

    if (error || !updatedServer) {
        return NextResponse.json({ error: error?.message || "Failed to update space" }, { status: 500 });
    }

    return NextResponse.json({ server: updatedServer });
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: serverId } = await context.params;
    const supabase = getSupabaseAdmin();

    // Verify ownership
    const { data: server } = await supabase
        .from("servers")
        .select("owner_id")
        .eq("id", serverId)
        .maybeSingle();

    if (!server || server.owner_id !== user.id) {
        return NextResponse.json({ error: "Only the owner can delete this space" }, { status: 403 });
    }

    // Delete channels, members, messages, and server
    await supabase.from("messages").delete().in(
        "channel_id",
        (await supabase.from("channels").select("id").eq("server_id", serverId)).data?.map((c) => c.id) || []
    );
    await supabase.from("channels").delete().eq("server_id", serverId);
    await supabase.from("server_members").delete().eq("server_id", serverId);
    const { error: deleteErr } = await supabase.from("servers").delete().eq("id", serverId);

    if (deleteErr) {
        return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

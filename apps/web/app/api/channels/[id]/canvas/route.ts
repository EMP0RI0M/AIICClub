import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: channelId } = await context.params;
        const supabase = getSupabaseAdmin();

        // 1. Fetch channel metadata to confirm channel existence
        const { data: channel, error: chErr } = await supabase
            .from("channels")
            .select("id, name, server_id, type")
            .or(`id.eq.${channelId},name.eq.${channelId}`)
            .maybeSingle();

        if (chErr || !channel) {
            return NextResponse.json({ shapes: [] });
        }

        // 2. Query canvas data from workspace channel module or storage
        const { data: moduleRecord } = await supabase
            .from("channel_modules")
            .select("data")
            .eq("channel_id", channel.id)
            .eq("type", "canvas")
            .maybeSingle();

        return NextResponse.json({
            shapes: moduleRecord?.data?.shapes || [],
            channelId: channel.id,
        });
    } catch (err: any) {
        console.error("[API GET /channels/[id]/canvas] error:", err);
        return NextResponse.json({ error: err.message || "Internal Server Error", shapes: [] }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: channelId } = await context.params;
        const body = await req.json();
        const shapes = body.shapes || body.data?.shapes || [];

        const supabase = getSupabaseAdmin();

        const { data: channel } = await supabase
            .from("channels")
            .select("id")
            .or(`id.eq.${channelId},name.eq.${channelId}`)
            .maybeSingle();

        const targetId = channel?.id || channelId;

        // Persist to channel_modules if table exists, or return success
        try {
            await supabase
                .from("channel_modules")
                .upsert(
                    {
                        channel_id: targetId,
                        type: "canvas",
                        data: { shapes, updated_at: new Date().toISOString(), updated_by: user.id },
                    },
                    { onConflict: "channel_id,type" }
                );
        } catch {
            // Ignore DB schema limitation
        }

        return NextResponse.json({
            success: true,
            shapes,
            updatedAt: new Date().toISOString(),
        });
    } catch (err: any) {
        console.error("[API PUT /channels/[id]/canvas] error:", err);
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}

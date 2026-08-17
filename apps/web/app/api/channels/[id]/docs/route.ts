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

        const { data: channel } = await supabase
            .from("channels")
            .select("id, name, server_id, type")
            .or(`id.eq.${channelId},name.eq.${channelId}`)
            .maybeSingle();

        const targetId = channel?.id || channelId;

        const { data: moduleRecord } = await supabase
            .from("channel_modules")
            .select("data")
            .eq("channel_id", targetId)
            .eq("type", "docs")
            .maybeSingle();

        return NextResponse.json({
            docs: moduleRecord?.data?.docs || [],
            channelId: targetId,
        });
    } catch (err: any) {
        console.error("[API GET /channels/[id]/docs] error:", err);
        return NextResponse.json({ error: err.message || "Internal Server Error", docs: [] }, { status: 500 });
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
        const docs = body.docs || body.data?.docs || [];

        const supabase = getSupabaseAdmin();

        const { data: channel } = await supabase
            .from("channels")
            .select("id")
            .or(`id.eq.${channelId},name.eq.${channelId}`)
            .maybeSingle();

        const targetId = channel?.id || channelId;

        try {
            await supabase
                .from("channel_modules")
                .upsert(
                    {
                        channel_id: targetId,
                        type: "docs",
                        data: { docs, updated_at: new Date().toISOString(), updated_by: user.id },
                    },
                    { onConflict: "channel_id,type" }
                );
        } catch {}

        return NextResponse.json({
            success: true,
            docs,
            updatedAt: new Date().toISOString(),
        });
    } catch (err: any) {
        console.error("[API PUT /channels/[id]/docs] error:", err);
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}

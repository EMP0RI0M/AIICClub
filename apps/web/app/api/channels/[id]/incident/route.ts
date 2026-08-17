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
            .eq("type", "incident")
            .maybeSingle();

        const incident = moduleRecord?.data?.incident || {
            status: "active",
            severity: "P2",
            commander: { name: user.displayName || user.username, id: user.id },
            timeline: [],
            services: ["Edge Gateway", "Auth Cluster"],
        };

        return NextResponse.json({ incident, channelId: targetId });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
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
        const incident = body.incident || body;

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
                        type: "incident",
                        data: { incident, updated_at: new Date().toISOString(), updated_by: user.id },
                    },
                    { onConflict: "channel_id,type" }
                );
        } catch {}

        return NextResponse.json({ success: true, incident });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}

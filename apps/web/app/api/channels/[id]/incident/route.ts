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

        const { data: incidentRecord } = await supabase
            .from("channel_incidents")
            .select("incident, updated_at")
            .eq("channel_id", targetId)
            .maybeSingle();

        const defaultIncident = {
            status: "active",
            severity: "P2",
            commander: { name: user.displayName || user.username, id: user.id },
            timeline: [],
            services: ["Edge Gateway", "Auth Cluster"],
        };

        const incident = incidentRecord?.incident || defaultIncident;

        return NextResponse.json({
            incident,
            channelId: targetId,
            updatedAt: incidentRecord?.updated_at,
        });
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

        const { error: upsertErr } = await supabase
            .from("channel_incidents")
            .upsert(
                {
                    channel_id: targetId,
                    incident,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "channel_id" }
            );

        if (upsertErr) {
            console.error("[API PUT /channels/[id]/incident] Supabase upsert error:", upsertErr);
            return NextResponse.json({ error: upsertErr.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, incident });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}

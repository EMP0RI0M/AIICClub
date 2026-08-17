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

    const { data } = await supabase
        .from("server_settings")
        .select("settings")
        .eq("server_id", serverId)
        .maybeSingle();

    return NextResponse.json({ settings: data?.settings || {} });
}

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: serverId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const settings = body.settings || {};

    const supabase = getSupabaseAdmin();

    await supabase.from("server_settings").upsert(
        {
            server_id: serverId,
            settings,
            updated_at: new Date().toISOString(),
        },
        { onConflict: "server_id" }
    );

    return NextResponse.json({ settings });
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; roleId: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: channelId, roleId } = await params;
    const body = await req.json();

    const supabase = getSupabaseAdmin();
    const { data: override, error } = await supabase.from("channel_permission_overrides").upsert({
        channel_id: channelId,
        role_id: roleId,
        allow: body.allow || "0",
        deny: body.deny || "0",
    }, { onConflict: "channel_id,role_id" }).select().maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ override });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; roleId: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: channelId, roleId } = await params;

    const supabase = getSupabaseAdmin();
    await supabase.from("channel_permission_overrides").delete().eq("channel_id", channelId).eq("role_id", roleId);
    return NextResponse.json({ message: "Override deleted" });
}

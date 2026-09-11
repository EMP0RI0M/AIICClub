import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: channelId } = await params;

    const supabase = getSupabaseAdmin();
    const { data: overrides } = await supabase.from("channel_permission_overrides").select("*").eq("channel_id", channelId);
    return NextResponse.json({ overrides: overrides || [] });
}

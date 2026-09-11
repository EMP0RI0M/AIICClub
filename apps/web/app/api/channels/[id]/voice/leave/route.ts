import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: channelId } = await params;

    const supabase = getSupabaseAdmin();
    await supabase.from("voice_states").delete().eq("channel_id", channelId).eq("user_id", user.id);
    return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: channelId } = await params;
    const body = await req.json().catch(() => ({}));
    const targetUserId = body.userId || user.id;

    const supabase = getSupabaseAdmin();
    await supabase.from("stage_participants").upsert({
        channel_id: channelId,
        user_id: targetUserId,
        role: "speaker"
    }, { onConflict: "channel_id,user_id" });

    return NextResponse.json({ success: true, status: "speaker" });
}

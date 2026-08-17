import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: requestId } = await context.params;
    const supabase = getSupabaseAdmin();

    // 1. Fetch friend request
    const { data: request, error: fetchErr } = await supabase
        .from("friend_requests")
        .select("id, receiver_id")
        .eq("id", requestId)
        .maybeSingle();

    if (fetchErr || !request) {
        return NextResponse.json({ error: "Friend request not found" }, { status: 404 });
    }

    if (request.receiver_id !== user.id) {
        return NextResponse.json({ error: "Unauthorized to decline this request" }, { status: 403 });
    }

    // 2. Mark request as rejected/declined
    await supabase
        .from("friend_requests")
        .update({ status: "rejected", responded_at: new Date().toISOString() })
        .eq("id", requestId);

    return NextResponse.json({ message: "Friend request declined." });
}

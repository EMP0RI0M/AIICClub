import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: requestId } = await context.params;
    const supabase = getSupabaseAdmin();

    // 1. Fetch friend request details
    const { data: request, error: fetchErr } = await supabase
        .from("friend_requests")
        .select(`
            id,
            sender_id,
            receiver_id,
            status,
            sender:users!friend_requests_sender_id_fkey (
                id,
                username,
                display_name,
                avatar_url,
                status
            )
        `)
        .eq("id", requestId)
        .maybeSingle();

    if (fetchErr || !request) {
        return NextResponse.json({ error: "Friend request not found" }, { status: 404 });
    }

    if (request.receiver_id !== user.id) {
        return NextResponse.json({ error: "Unauthorized to accept this request" }, { status: 403 });
    }

    // 2. Execute accept: Update status and insert bidirectional friendship
    await supabase
        .from("friend_requests")
        .update({ status: "accepted", responded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", requestId);

    await supabase.from("friends").upsert([
        { user_id: user.id, friend_id: request.sender_id },
        { user_id: request.sender_id, friend_id: user.id },
    ], { onConflict: "user_id,friend_id" });

    const sender = (request as any).sender;
    return NextResponse.json({
        message: "Friend request accepted.",
        user: {
            id: sender?.id || request.sender_id,
            username: sender?.username || "user",
            displayName: sender?.display_name || "User",
            avatarUrl: sender?.avatar_url,
            status: sender?.status || "offline",
        },
    });
}

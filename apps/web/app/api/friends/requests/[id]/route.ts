import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: requestId } = await context.params;
    const supabase = getSupabaseAdmin();

    // Only sender or receiver can cancel/delete a friend request
    const { data: request, error: fetchErr } = await supabase
        .from("friend_requests")
        .select("id, sender_id, receiver_id")
        .eq("id", requestId)
        .maybeSingle();

    if (fetchErr || !request) {
        return NextResponse.json({ error: "Friend request not found" }, { status: 404 });
    }

    if (request.sender_id !== user.id && request.receiver_id !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await supabase.from("friend_requests").delete().eq("id", requestId);

    return NextResponse.json({ message: "Friend request cancelled." });
}

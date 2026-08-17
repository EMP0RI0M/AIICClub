import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("query") || "").trim();
    if (!query) return NextResponse.json({ users: [] });

    const supabase = getSupabaseAdmin();

    // 1. Search users by username or display_name
    const { data: users, error } = await supabase
        .from("users")
        .select("id, username, display_name, avatar_url, status")
        .neq("id", user.id)
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(20);

    if (error || !users) {
        return NextResponse.json({ users: [] });
    }

    // 2. Fetch existing relations (friends, incoming requests, outgoing requests)
    const userIds = users.map((u) => u.id);

    const [{ data: friends }, { data: outgoingReqs }, { data: incomingReqs }] = await Promise.all([
        supabase.from("friends").select("friend_id").eq("user_id", user.id).in("friend_id", userIds),
        supabase
            .from("friend_requests")
            .select("receiver_id, id")
            .eq("sender_id", user.id)
            .eq("status", "pending")
            .in("receiver_id", userIds),
        supabase
            .from("friend_requests")
            .select("sender_id, id")
            .eq("receiver_id", user.id)
            .eq("status", "pending")
            .in("sender_id", userIds),
    ]);

    const friendSet = new Set((friends || []).map((f) => f.friend_id));
    const outgoingMap = new Map((outgoingReqs || []).map((r) => [r.receiver_id, r.id]));
    const incomingMap = new Map((incomingReqs || []).map((r) => [r.sender_id, r.id]));

    const results = users.map((u) => {
        let relationStatus: "none" | "friend" | "incoming" | "outgoing" = "none";
        let requestId: string | undefined;

        if (friendSet.has(u.id)) {
            relationStatus = "friend";
        } else if (incomingMap.has(u.id)) {
            relationStatus = "incoming";
            requestId = incomingMap.get(u.id);
        } else if (outgoingMap.has(u.id)) {
            relationStatus = "outgoing";
            requestId = outgoingMap.get(u.id);
        }

        return {
            id: u.id,
            username: u.username,
            displayName: u.display_name,
            avatarUrl: u.avatar_url,
            status: u.status || "offline",
            relationStatus,
            requestId,
        };
    });

    return NextResponse.json({ users: results });
}

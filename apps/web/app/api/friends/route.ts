import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseAdmin();

    const [
        { data: friendsData },
        { data: incomingReqs },
        { data: outgoingReqs },
        { data: blockedData },
    ] = await Promise.all([
        supabase
            .from("friends")
            .select(`
                friend_id,
                created_at,
                friend:users!friends_friend_id_fkey (
                    id,
                    username,
                    display_name,
                    avatar_url,
                    status,
                    bio
                )
            `)
            .eq("user_id", user.id),

        supabase
            .from("friend_requests")
            .select(`
                id,
                created_at,
                sender:users!friend_requests_sender_id_fkey (
                    id,
                    username,
                    display_name,
                    avatar_url,
                    status,
                    bio
                )
            `)
            .eq("receiver_id", user.id)
            .eq("status", "pending"),

        supabase
            .from("friend_requests")
            .select(`
                id,
                created_at,
                receiver:users!friend_requests_receiver_id_fkey (
                    id,
                    username,
                    display_name,
                    avatar_url,
                    status,
                    bio
                )
            `)
            .eq("sender_id", user.id)
            .eq("status", "pending"),

        supabase
            .from("user_blocks")
            .select(`
                blocked_id,
                created_at,
                blocked:users!user_blocks_blocked_id_fkey (
                    id,
                    username,
                    display_name,
                    avatar_url,
                    status,
                    bio
                )
            `)
            .eq("blocker_id", user.id),
    ]);

    const friends = (friendsData || []).map((f: any) => ({
        createdAt: f.created_at,
        user: {
            id: f.friend?.id || f.friend_id,
            username: f.friend?.username || "user",
            displayName: f.friend?.display_name || "User",
            avatarUrl: f.friend?.avatar_url || null,
            status: f.friend?.status || "offline",
            bio: f.friend?.bio || null,
        },
    }));

    const pendingIncoming = (incomingReqs || []).map((r: any) => ({
        id: r.id,
        createdAt: r.created_at,
        user: {
            id: r.sender?.id || "unknown",
            username: r.sender?.username || "user",
            displayName: r.sender?.display_name || "User",
            avatarUrl: r.sender?.avatar_url || null,
            status: r.sender?.status || "offline",
            bio: r.sender?.bio || null,
        },
    }));

    const pendingOutgoing = (outgoingReqs || []).map((r: any) => ({
        id: r.id,
        createdAt: r.created_at,
        user: {
            id: r.receiver?.id || "unknown",
            username: r.receiver?.username || "user",
            displayName: r.receiver?.display_name || "User",
            avatarUrl: r.receiver?.avatar_url || null,
            status: r.receiver?.status || "offline",
            bio: r.receiver?.bio || null,
        },
    }));

    const blocked = (blockedData || []).map((b: any) => ({
        createdAt: b.created_at,
        user: {
            id: b.blocked?.id || b.blocked_id,
            username: b.blocked?.username || "user",
            displayName: b.blocked?.display_name || "User",
            avatarUrl: b.blocked?.avatar_url || null,
            status: b.blocked?.status || "offline",
            bio: b.blocked?.bio || null,
        },
    }));

    return NextResponse.json({
        friends,
        pendingIncoming,
        pendingOutgoing,
        blocked,
    });
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const userId = body.userId;
        if (!userId) return NextResponse.json({ error: "User ID is required" }, { status: 400 });

        const supabase = getSupabaseAdmin();

        // 1. Fetch blocked user info
        const { data: targetUser } = await supabase
            .from("users")
            .select("id, username, display_name, avatar_url, status")
            .eq("id", userId)
            .maybeSingle();

        // 2. Remove friendship if exists
        await supabase
            .from("friends")
            .delete()
            .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`);

        // 3. Remove friend requests if exists
        await supabase
            .from("friend_requests")
            .delete()
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`);

        // 4. Add block record
        await supabase.from("user_blocks").upsert(
            {
                blocker_id: user.id,
                blocked_id: userId,
            },
            { onConflict: "blocker_id,blocked_id" }
        );

        return NextResponse.json({
            message: "User blocked.",
            user: {
                id: targetUser?.id || userId,
                username: targetUser?.username || "user",
                displayName: targetUser?.display_name || "User",
                avatarUrl: targetUser?.avatar_url,
                status: targetUser?.status || "offline",
            },
        });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
    }
}

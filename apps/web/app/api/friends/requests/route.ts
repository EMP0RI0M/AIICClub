import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const target = (body.target || "").trim();
        if (!target) {
            return NextResponse.json({ error: "Target username or ID is required" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // 1. Find the target user by ID or Username (case-insensitive)
        let query = supabase.from("users").select("id, username, display_name, avatar_url, status");
        if (target.includes("-") || target.length > 20) {
            query = query.or(`id.eq.${target},username.ilike.${target}`);
        } else {
            query = query.ilike("username", target);
        }

        const { data: targetUsers, error: findError } = await query.limit(1);
        const targetUser = targetUsers?.[0];

        if (findError || !targetUser) {
            return NextResponse.json({ error: `User "${target}" could not be found.` }, { status: 404 });
        }

        if (targetUser.id === user.id) {
            return NextResponse.json({ error: "You cannot add yourself as a friend." }, { status: 400 });
        }

        // 2. Check if already friends
        const { data: existingFriend } = await supabase
            .from("friends")
            .select("id")
            .eq("user_id", user.id)
            .eq("friend_id", targetUser.id)
            .maybeSingle();

        if (existingFriend) {
            return NextResponse.json({
                message: "You are already friends.",
                status: "accepted",
                user: {
                    id: targetUser.id,
                    username: targetUser.username,
                    displayName: targetUser.display_name,
                    avatarUrl: targetUser.avatar_url,
                    status: targetUser.status || "offline",
                },
            });
        }

        // 3. Check if target user has sent YOU a pending request -> auto accept!
        const { data: incomingRequest } = await supabase
            .from("friend_requests")
            .select("id")
            .eq("sender_id", targetUser.id)
            .eq("receiver_id", user.id)
            .eq("status", "pending")
            .maybeSingle();

        if (incomingRequest) {
            // Update request status to accepted
            await supabase
                .from("friend_requests")
                .update({ status: "accepted", responded_at: new Date().toISOString() })
                .eq("id", incomingRequest.id);

            // Insert bidirectional friendship
            await supabase.from("friends").upsert([
                { user_id: user.id, friend_id: targetUser.id },
                { user_id: targetUser.id, friend_id: user.id },
            ]);

            return NextResponse.json({
                message: `Friend request accepted! You and @${targetUser.username} are now friends.`,
                status: "accepted",
                user: {
                    id: targetUser.id,
                    username: targetUser.username,
                    displayName: targetUser.display_name,
                    avatarUrl: targetUser.avatar_url,
                    status: targetUser.status || "offline",
                },
            });
        }

        // 4. Upsert pending friend request from user -> targetUser
        const { data: newRequest, error: reqError } = await supabase
            .from("friend_requests")
            .upsert(
                {
                    sender_id: user.id,
                    receiver_id: targetUser.id,
                    status: "pending",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "sender_id,receiver_id" }
            )
            .select("id, created_at")
            .single();

        if (reqError) {
            return NextResponse.json({ error: reqError.message || "Failed to send request" }, { status: 500 });
        }

        return NextResponse.json({
            message: `Friend request sent to @${targetUser.username}!`,
            status: "pending",
            user: {
                id: targetUser.id,
                username: targetUser.username,
                displayName: targetUser.display_name,
                avatarUrl: targetUser.avatar_url,
                status: targetUser.status || "offline",
            },
            request: newRequest,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
    }
}

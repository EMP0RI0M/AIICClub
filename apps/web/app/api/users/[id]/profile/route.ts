import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const targetUserId = params.id;
    if (!targetUserId) {
        return NextResponse.json({ error: "Target user ID required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Resolve viewer user ID
    let viewerId = user.id;
    const { data: viewerRow } = await supabase
        .from("users")
        .select("id")
        .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
        .maybeSingle();
    if (viewerRow?.id) viewerId = viewerRow.id;

    // 2. Resolve target user row
    const { data: targetUser, error: userErr } = await supabase
        .from("users")
        .select(`
            id,
            username,
            display_name,
            avatar_url,
            bio,
            linkedin_url,
            github_url,
            website_url,
            interests,
            skills,
            leadership_title,
            created_at
        `)
        .or(`id.eq.${targetUserId},auth_user_id.eq.${targetUserId}`)
        .maybeSingle();

    if (userErr || !targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3. Check friendship relationship
    const isSelf = viewerId === targetUser.id;
    let isFriend = isSelf;

    if (!isSelf) {
        const { data: friendRow } = await supabase
            .from("friends")
            .select("id")
            .or(`and(user_id.eq.${viewerId},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${viewerId})`)
            .limit(1)
            .maybeSingle();

        if (friendRow?.id) {
            isFriend = true;
        } else {
            const { data: reqRow } = await supabase
                .from("friend_requests")
                .select("id, status")
                .or(`and(sender_id.eq.${viewerId},receiver_id.eq.${targetUser.id}),and(sender_id.eq.${targetUser.id},receiver_id.eq.${viewerId})`)
                .eq("status", "accepted")
                .limit(1)
                .maybeSingle();

            if (reqRow?.id) isFriend = true;
        }
    }

    // 4. Return privacy-gated profile
    return NextResponse.json({
        profile: {
            id: targetUser.id,
            username: targetUser.username,
            displayName: targetUser.display_name || targetUser.username,
            avatarUrl: targetUser.avatar_url,
            isFriend,
            bio: isFriend ? targetUser.bio : null,
            linkedinUrl: isFriend ? targetUser.linkedin_url : null,
            githubUrl: isFriend ? targetUser.github_url : null,
            websiteUrl: isFriend ? targetUser.website_url : null,
            interests: isFriend ? targetUser.interests : null,
            skills: isFriend ? targetUser.skills : null,
            leadershipTitle: targetUser.leadership_title,
            joinedAt: targetUser.created_at,
        }
    });
}

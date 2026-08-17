import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: serverId } = await context.params;
    const supabase = getSupabaseAdmin();

    const { data: members, error } = await supabase
        .from("server_members")
        .select(`
            id,
            user_id,
            role,
            nickname,
            joined_at,
            user:users!server_members_user_id_fkey (
                id,
                username,
                display_name,
                avatar_url,
                status,
                bio,
                class_year,
                section,
                github_url,
                linkedin_url,
                website_url,
                skills,
                interests
            )
        `)
        .eq("server_id", serverId);

    if (error) {
        return NextResponse.json({ members: [] });
    }

    const formatted = (members || []).map((m: any) => ({
        id: m.id,
        userId: m.user_id,
        role: m.role || "member",
        nickname: m.nickname,
        joinedAt: m.joined_at,
        user: {
            id: m.user?.id || m.user_id,
            username: m.user?.username || "user",
            displayName: m.user?.display_name || "Member",
            avatarUrl: m.user?.avatar_url || null,
            status: m.user?.status || "offline",
            bio: m.user?.bio || null,
            classYear: m.user?.class_year || null,
            section: m.user?.section || null,
            githubUrl: m.user?.github_url || null,
            linkedinUrl: m.user?.linkedin_url || null,
            websiteUrl: m.user?.website_url || null,
            skills: m.user?.skills || [],
            interests: m.user?.interests || [],
        },
    }));

    return NextResponse.json({ members: formatted });
}

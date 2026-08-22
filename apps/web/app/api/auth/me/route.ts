import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    let { data: userRecord, error } = await supabase
        .from("users")
        .select("*")
        .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
        .maybeSingle();

    if (!userRecord && user.authUserId) {
        const { data: byAuthId } = await supabase
            .from("users")
            .select("*")
            .or(`id.eq.${user.authUserId},auth_user_id.eq.${user.authUserId}`)
            .maybeSingle();
        userRecord = byAuthId;
    }

    if (!userRecord && user.email) {
        const { data: byEmail } = await supabase
            .from("users")
            .select("*")
            .ilike("email", user.email)
            .maybeSingle();
        userRecord = byEmail;
    }

    if (error || !userRecord) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Resolve authoritative role from organization_role_assignments or users.role
    const { data: assignments } = await supabase
        .from("organization_role_assignments")
        .select("role:organization_roles(key, name, hierarchy_level)")
        .eq("user_id", userRecord.id)
        .eq("is_active", true)
        .order("starts_at", { ascending: false });

    let effectiveRole = userRecord.role || "member";
    let effectiveRoleName = userRecord.role ? userRecord.role.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : "Member";

    if (assignments && assignments.length > 0) {
        const topRole = (assignments as any[])[0]?.role;
        if (topRole) {
            effectiveRole = topRole.key || effectiveRole;
            effectiveRoleName = topRole.name || effectiveRoleName;
        }
    }

    return NextResponse.json({
        user: {
            id: userRecord.id,
            email: userRecord.email,
            username: userRecord.username,
            displayName: userRecord.display_name,
            avatar: userRecord.avatar_url,
            bio: userRecord.bio,
            classYear: userRecord.class_year,
            section: userRecord.section,
            githubUrl: userRecord.github_url,
            websiteUrl: userRecord.website_url,
            linkedinUrl: userRecord.linkedin_url,
            interests: userRecord.interests || [],
            skills: userRecord.skills || [],
            status: userRecord.status || "online",
            role: effectiveRole,
            roleName: effectiveRoleName,
            onboardingCompleted: userRecord.onboarding_completed ?? true,
            createdAt: userRecord.created_at,
        },
    });
}

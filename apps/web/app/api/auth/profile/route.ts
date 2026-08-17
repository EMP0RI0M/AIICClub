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
    const { data: userRecord, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    if (error || !userRecord) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Resolve authoritative role from organization_role_assignments
    const { data: assignments } = await supabase
        .from("organization_role_assignments")
        .select("role:organization_roles(key, name, hierarchy_level)")
        .eq("user_id", userRecord.id)
        .eq("is_active", true)
        .order("starts_at", { ascending: false });

    let effectiveRole = "member";
    let effectiveRoleName = "Member";

    if (assignments && assignments.length > 0) {
        const topRole = (assignments as any[])[0]?.role;
        if (topRole) {
            effectiveRole = topRole.key || "member";
            effectiveRoleName = topRole.name || "Member";
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

export async function PATCH(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
        displayName,
        bio,
        avatar,
        avatarUrl,
        status,
        username,
        classYear,
        section,
        githubUrl,
        websiteUrl,
        linkedinUrl,
        skills,
        interests,
        onboardingCompleted,
    } = body;

    const supabase = getSupabaseAdmin();
    const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
    };

    if (displayName !== undefined) updateData.display_name = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined || avatarUrl !== undefined)
        updateData.avatar_url = avatarUrl ?? avatar;
    if (status !== undefined) updateData.status = status;
    if (username !== undefined) updateData.username = username;
    if (classYear !== undefined) updateData.class_year = classYear;
    if (section !== undefined) updateData.section = section;
    if (githubUrl !== undefined) updateData.github_url = githubUrl;
    if (websiteUrl !== undefined) updateData.website_url = websiteUrl;
    if (linkedinUrl !== undefined) updateData.linkedin_url = linkedinUrl;
    if (skills !== undefined) updateData.skills = Array.isArray(skills) ? skills : [];
    if (interests !== undefined) updateData.interests = Array.isArray(interests) ? interests : [];
    if (onboardingCompleted !== undefined)
        updateData.onboarding_completed = Boolean(onboardingCompleted);

    const { data: updated, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", user.id)
        .select("*")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Resolve authoritative role
    const { data: assignments } = await supabase
        .from("organization_role_assignments")
        .select("role:organization_roles(key, name)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("starts_at", { ascending: false });

    const topRole = (assignments as any[])?.[0]?.role;

    return NextResponse.json({
        user: {
            id: updated.id,
            email: updated.email,
            username: updated.username,
            displayName: updated.display_name,
            avatar: updated.avatar_url,
            bio: updated.bio,
            classYear: updated.class_year,
            section: updated.section,
            githubUrl: updated.github_url,
            websiteUrl: updated.website_url,
            linkedinUrl: updated.linkedin_url,
            interests: updated.interests || [],
            skills: updated.skills || [],
            status: updated.status || "online",
            role: topRole?.key || "member",
            roleName: topRole?.name || "Member",
            onboardingCompleted: updated.onboarding_completed ?? true,
            createdAt: updated.created_at,
        },
    });
}

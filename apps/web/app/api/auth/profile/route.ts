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
        interests,
        skills,
        onboardingCompleted,
    } = body;

    const supabase = getSupabaseAdmin();
    const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
    };

    if (displayName !== undefined) {
        updates.display_name = displayName ? displayName.trim() : user.displayName;
    }
    if (bio !== undefined) {
        updates.bio = bio ? bio.trim() : null;
    }
    if (avatar !== undefined || avatarUrl !== undefined) {
        const val = avatar !== undefined ? avatar : avatarUrl;
        updates.avatar_url = val ? val.trim() : null;
    }
    if (status !== undefined) {
        updates.status = status;
    }
    if (onboardingCompleted !== undefined) {
        updates.onboarding_completed = onboardingCompleted;
    }
    if (classYear !== undefined) {
        updates.class_year = classYear ? String(classYear).trim() : null;
    }
    if (section !== undefined) {
        updates.section = section ? String(section).trim() : null;
    }
    if (githubUrl !== undefined) {
        updates.github_url = githubUrl ? String(githubUrl).trim() : null;
    }
    if (websiteUrl !== undefined) {
        updates.website_url = websiteUrl ? String(websiteUrl).trim() : null;
    }
    if (linkedinUrl !== undefined) {
        updates.linkedin_url = linkedinUrl ? String(linkedinUrl).trim() : null;
    }
    if (interests !== undefined) {
        updates.interests = Array.isArray(interests)
            ? interests.map((s: string) => String(s).trim()).filter(Boolean)
            : typeof interests === "string"
            ? interests.split(",").map((s) => s.trim()).filter(Boolean)
            : [];
    }
    if (skills !== undefined) {
        updates.skills = Array.isArray(skills)
            ? skills.map((s: string) => String(s).trim()).filter(Boolean)
            : typeof skills === "string"
            ? skills.split(",").map((s) => s.trim()).filter(Boolean)
            : [];
    }

    if (username !== undefined) {
        const normalized = username.trim().toLowerCase();
        if (!/^[a-zA-Z0-9_]{3,30}$/.test(normalized)) {
            return NextResponse.json(
                { error: "Username must be 3-30 letters, numbers, or underscores." },
                { status: 400 }
            );
        }

        // Check availability
        const { data: existing } = await supabase
            .from("users")
            .select("id")
            .ilike("username", normalized)
            .neq("id", user.id)
            .maybeSingle();

        if (existing) {
            return NextResponse.json(
                { error: `Username "${normalized}" is already taken by another user.` },
                { status: 409 }
            );
        }

        updates.username = normalized;
    }

    const { data: updatedRecord, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

    if (error || !updatedRecord) {
        console.error("PATCH /api/auth/profile error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to update profile in database." },
            { status: 500 }
        );
    }

    return NextResponse.json({
        user: {
            id: updatedRecord.id,
            email: updatedRecord.email,
            username: updatedRecord.username,
            displayName: updatedRecord.display_name,
            avatar: updatedRecord.avatar_url,
            bio: updatedRecord.bio,
            classYear: updatedRecord.class_year,
            section: updatedRecord.section,
            githubUrl: updatedRecord.github_url,
            websiteUrl: updatedRecord.website_url,
            linkedinUrl: updatedRecord.linkedin_url,
            interests: updatedRecord.interests || [],
            skills: updatedRecord.skills || [],
            status: updatedRecord.status || "online",
            onboardingCompleted: updatedRecord.onboarding_completed ?? true,
            createdAt: updatedRecord.created_at,
        },
    });
}

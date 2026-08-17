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

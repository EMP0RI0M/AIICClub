import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { getSupabaseClient } from "@/shared/supabase/client";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-corvus-jwt-key-for-local-development-12345";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
        }
        const supabaseToken = authHeader.slice(7);

        // Verify Supabase Auth user
        const supabase = getSupabaseAdmin();
        const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(supabaseToken);

        if (authErr || !authUser) {
            return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const { preferredDisplayName, preferredUsername } = body;

        // Check if user exists in public.users
        let { data: userRecord } = await supabase
            .from("users")
            .select("*")
            .or(`auth_user_id.eq.${authUser.id},id.eq.${authUser.id}`)
            .maybeSingle();

        if (!userRecord && authUser.email) {
            const email = authUser.email.toLowerCase();
            const { data: byEmail } = await supabase
                .from("users")
                .select("*")
                .ilike("email", email)
                .maybeSingle();

            if (byEmail) {
                userRecord = byEmail;
            }
        }

        if (userRecord && !userRecord.auth_user_id) {
            await supabase
                .from("users")
                .update({ auth_user_id: authUser.id })
                .eq("id", userRecord.id);
            userRecord.auth_user_id = authUser.id;
        }

        if (!userRecord) {
            // Create user row in public.users
            const email = authUser.email?.toLowerCase() || `${authUser.id}@corvus.internal`;
            const baseUsername = preferredUsername || email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 20) || "user";
            const displayName = preferredDisplayName || authUser.user_metadata?.display_name || authUser.user_metadata?.full_name || baseUsername;

            const { data: createdUser, error: createErr } = await supabase
                .from("users")
                .insert({
                    id: authUser.id,
                    auth_user_id: authUser.id,
                    email,
                    username: baseUsername,
                    display_name: displayName,
                    avatar_url: authUser.user_metadata?.avatar_url || null,
                    status: "online",
                    onboarding_completed: true,
                    email_verified: true,
                })
                .select()
                .single();

            if (createErr || !createdUser) {
                // If username was taken, append random suffix
                const uniqueUsername = `${baseUsername.slice(0, 15)}_${Math.floor(Math.random() * 8999 + 1000)}`;
                const { data: retryUser } = await supabase
                    .from("users")
                    .insert({
                        id: authUser.id,
                        auth_user_id: authUser.id,
                        email,
                        username: uniqueUsername,
                        display_name: displayName,
                        avatar_url: authUser.user_metadata?.avatar_url || null,
                        status: "online",
                        onboarding_completed: true,
                        email_verified: true,
                    })
                    .select()
                    .single();
                userRecord = retryUser;
            } else {
                userRecord = createdUser;
            }
        }

        // Ensure userRecord is found or constructed
        if (!userRecord) {
            userRecord = {
                id: authUser.id,
                email: authUser.email || `${authUser.id}@corvus.internal`,
                username: (authUser.email?.split("@")[0] || "user").replace(/[^a-zA-Z0-9_]/g, "_"),
                display_name: authUser.user_metadata?.display_name || authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
                avatar_url: authUser.user_metadata?.avatar_url || null,
                bio: null,
                status: "online",
                onboarding_completed: true,
                created_at: new Date().toISOString(),
            };
        }

        // Generate app session JWT
        const sessionToken = jwt.sign(
            {
                userId: userRecord.id,
                email: userRecord.email,
                username: userRecord.username,
                displayName: userRecord.display_name,
            },
            JWT_SECRET,
            { expiresIn: "30d" }
        );

        // Resolve authoritative role from organization_role_assignments or userRecord.role
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
            token: sessionToken,
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
    } catch (err: any) {
        console.error("[POST /api/auth/session/exchange] Error:", err);
        return NextResponse.json({ error: err?.message || "Session exchange failed" }, { status: 500 });
    }
}

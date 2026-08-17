import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { getSupabaseClient } from "@/shared/supabase/client";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-change-in-production-12345";

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
            .eq("id", authUser.id)
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

        if (!userRecord) {
            // Create user row in public.users
            const email = authUser.email?.toLowerCase() || `${authUser.id}@aiic.internal`;
            const baseUsername = preferredUsername || email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 20) || "user";
            const displayName = preferredDisplayName || authUser.user_metadata?.display_name || baseUsername;

            const { data: createdUser, error: createErr } = await supabase
                .from("users")
                .insert({
                    id: authUser.id,
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
                email: authUser.email || `${authUser.id}@aiic.internal`,
                username: (authUser.email?.split("@")[0] || "user").replace(/[^a-zA-Z0-9_]/g, "_"),
                display_name: authUser.user_metadata?.display_name || authUser.email?.split("@")[0] || "User",
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

        return NextResponse.json({
            token: sessionToken,
            user: {
                id: userRecord.id,
                email: userRecord.email,
                username: userRecord.username,
                displayName: userRecord.display_name,
                avatar: userRecord.avatar_url,
                bio: userRecord.bio,
                status: userRecord.status || "online",
                onboardingCompleted: userRecord.onboarding_completed ?? true,
                createdAt: userRecord.created_at,
            },
        });
    } catch (err: any) {
        console.error("[POST /api/auth/session/exchange] Error:", err);
        return NextResponse.json({ error: err?.message || "Session exchange failed" }, { status: 500 });
    }
}

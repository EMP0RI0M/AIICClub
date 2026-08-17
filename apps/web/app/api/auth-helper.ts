import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-change-in-production-12345";

export interface AuthenticatedUser {
    id: string;
    email: string;
    username: string;
    displayName: string;
    authUserId?: string;
}

export async function getAuthUser(req: NextRequest): Promise<AuthenticatedUser | null> {
    try {
        let token: string | null = null;
        const authHeader = req.headers.get("authorization");

        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.slice(7).trim();
        } else {
            // Check cookies as fallback
            const cookieToken = req.cookies.get("sb-access-token")?.value ||
                req.cookies.get("corvus-token")?.value;
            if (cookieToken) {
                token = cookieToken;
            }
        }

        if (!token) {
            return null;
        }

        const supabase = getSupabaseAdmin();

        // 1. Try verifying as application session JWT
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as {
                userId?: string;
                email?: string;
                username?: string;
                displayName?: string;
            };

            if (decoded?.userId) {
                if (decoded.username && decoded.displayName) {
                    return {
                        id: decoded.userId,
                        email: decoded.email || `${decoded.userId}@aiic.internal`,
                        username: decoded.username,
                        displayName: decoded.displayName,
                    };
                }

                const { data: user } = await supabase
                    .from("users")
                    .select("id, auth_user_id, email, username, display_name")
                    .eq("id", decoded.userId)
                    .maybeSingle();

                if (user) {
                    return {
                        id: user.id,
                        email: user.email,
                        username: user.username,
                        displayName: user.display_name,
                        authUserId: user.auth_user_id,
                    };
                }
            }
        } catch {
            // Not a custom session token, proceed to Supabase token verification
        }

        // 2. Try validating as Supabase Auth access token
        try {
            const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(token);

            if (!authErr && authUser) {
                // Find matching user in public.users by auth_user_id, id, or email
                let { data: user } = await supabase
                    .from("users")
                    .select("id, auth_user_id, email, username, display_name")
                    .or(`auth_user_id.eq.${authUser.id},id.eq.${authUser.id}`)
                    .maybeSingle();

                if (!user && authUser.email) {
                    const { data: byEmail } = await supabase
                        .from("users")
                        .select("id, auth_user_id, email, username, display_name")
                        .ilike("email", authUser.email.toLowerCase())
                        .maybeSingle();
                    user = byEmail;
                }

                if (user) {
                    return {
                        id: user.id,
                        email: user.email,
                        username: user.username,
                        displayName: user.display_name,
                        authUserId: user.auth_user_id || authUser.id,
                    };
                }

                // If auth user exists in auth.users but not public.users yet, construct fallback profile
                const fallbackUsername = (authUser.email?.split("@")[0] || "user").replace(/[^a-zA-Z0-9_]/g, "_");
                const fallbackDisplayName = authUser.user_metadata?.display_name || authUser.user_metadata?.full_name || fallbackUsername;

                // Ensure row exists in public.users
                await supabase.from("users").upsert({
                    id: authUser.id,
                    auth_user_id: authUser.id,
                    email: authUser.email || `${authUser.id}@aiic.internal`,
                    username: fallbackUsername,
                    display_name: fallbackDisplayName,
                    avatar_url: authUser.user_metadata?.avatar_url || null,
                    status: "online",
                    onboarding_completed: true,
                    email_verified: true,
                }, { onConflict: "id" });

                return {
                    id: authUser.id,
                    email: authUser.email || `${authUser.id}@aiic.internal`,
                    username: fallbackUsername,
                    displayName: fallbackDisplayName,
                    authUserId: authUser.id,
                };
            }
        } catch {
            // Supabase auth.getUser failed, proceed to decode fallback
        }

        // 3. Fallback: Decode token without signature check if valid Supabase structure
        try {
            const decodedAny = jwt.decode(token) as any;
            const sub = decodedAny?.sub || decodedAny?.userId;

            if (sub && typeof sub === "string") {
                const { data: user } = await supabase
                    .from("users")
                    .select("id, auth_user_id, email, username, display_name")
                    .or(`auth_user_id.eq.${sub},id.eq.${sub}`)
                    .maybeSingle();

                if (user) {
                    return {
                        id: user.id,
                        email: user.email,
                        username: user.username,
                        displayName: user.display_name,
                        authUserId: user.auth_user_id || sub,
                    };
                }
            }
        } catch {
            // Ignore
        }

        return null;
    } catch (err: any) {
        console.error("[getAuthUser] Unexpected error:", err);
        return null;
    }
}

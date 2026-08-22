import { createMiddleware } from "hono/factory";
import { verifyToken } from "../lib/jwt.js";
import { verifySupabaseToken } from "../lib/supabase.js";
import { userRepository } from "../repositories/userRepository.js";

export type AuthEnv = {
    Variables: {
        userId: string;
        userEmail: string;
        username: string;
    };
};

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return c.json({ error: "Unauthorized." }, 401);
    }

    try {
        let payload;
        try {
            payload = await verifyToken(authHeader.slice(7));
        } catch {
            // Mobile Supabase sessions are access tokens, not Corvus JWTs.
            // Resolve them to the canonical public.users record before
            // entering any protected route.
            const supabaseUser = await verifySupabaseToken(authHeader.slice(7));
            let user = await userRepository.findByEmailInsensitive(supabaseUser.email);
            if (!user) {
                const supabaseAdmin = (await import("../lib/supabase.js")).getSupabaseAdmin();
                const baseUsername = (supabaseUser.displayName || supabaseUser.email.split("@")[0]).replace(/[^a-zA-Z0-9_]/g, "").toLowerCase().slice(0, 20) || "user";
                const { data: existing } = await supabaseAdmin.from("users").select("username").eq("username", baseUsername).maybeSingle();
                const username = existing ? `${baseUsername.slice(0, 15)}_${Math.floor(1000 + Math.random() * 9000)}` : baseUsername;

                user = await userRepository.create({
                    email: supabaseUser.email,
                    username,
                    displayName: supabaseUser.displayName,
                    passwordHash: null,
                    avatarUrl: supabaseUser.avatarUrl,
                    status: "online",
                    emailVerified: supabaseUser.emailVerified,
                    onboardingCompleted: true,
                });
            }
            payload = { userId: user.id, email: user.email, username: user.username };
        }
        c.set("userId", payload.userId);
        c.set("userEmail", payload.email);
        c.set("username", payload.username);
        await next();
    } catch {
        return c.json({ error: "Invalid or expired token." }, 401);
    }
});

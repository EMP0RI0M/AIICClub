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
            const user = await userRepository.findByEmailInsensitive(supabaseUser.email);
            if (!user) return c.json({ error: "User profile not found." }, 404);
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

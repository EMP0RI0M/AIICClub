import { Hono, type Context } from "hono";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/index.js";
import { prisma } from "../lib/prisma.js";
import { userRepository } from "../repositories/userRepository.js";
import { signToken, verifyToken } from "../lib/jwt.js";
import { getSupabaseAdmin, reauthenticateSupabaseUser, verifySupabaseToken } from "../lib/supabase.js";
import { broadcastToUsers } from "../services/realtime.js";

const auth = new Hono();

// ─── Rate Limiting ──────────────────────────────────────────────

interface RateLimitEntry {
    timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes (only in non-serverless environments)
if (!process.env.VERCEL) {
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of rateLimitStore) {
            entry.timestamps = entry.timestamps.filter((t) => now - t < 15 * 60 * 1000);
            if (entry.timestamps.length === 0) rateLimitStore.delete(key);
        }
    }, 5 * 60 * 1000);

    if (typeof cleanupInterval.unref === "function") {
        cleanupInterval.unref();
    }
}

function checkRateLimit(key: string, maxAttempts: number, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry) {
        rateLimitStore.set(key, { timestamps: [now] });
        return true;
    }

    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
    if (entry.timestamps.length >= maxAttempts) return false;

    entry.timestamps.push(now);
    return true;
}

function getClientIp(c: Context): string {
    return c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
        || c.req.header("x-real-ip")
        || "unknown";
}

// ─── Validation Schemas ─────────────────────────────────────────

const usernameRegex = /^[a-zA-Z0-9_]+$/;

const sessionExchangeSchema = z.object({
    preferredDisplayName: z.string().trim().min(1).max(50).optional(),
    preferredUsername: z
        .string()
        .trim()
        .min(3, "Username must be at least 3 characters")
        .max(30)
        .regex(
            usernameRegex,
            "Username can only contain letters, numbers, and underscores"
        )
        .transform((value) => value.toLowerCase())
        .optional(),
});

const profileUpdateSchema = z.object({
    displayName: z.string().min(1).max(50).optional(),
    username: z
        .string()
        .min(3, "Username must be at least 3 characters.")
        .max(30, "Username must be 30 characters or fewer.")
        .regex(usernameRegex, "Username can only contain letters, numbers, and underscores.")
        .optional(),
    bio: z.string().max(500).nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
    status: z.enum(["online", "idle", "dnd", "invisible", "offline"]).optional(),
    onboardingCompleted: z.boolean().optional(),
    classYear: z.string().max(30).nullable().optional(),
    section: z.string().max(100).nullable().optional(),
    githubUrl: z.string().url().nullable().optional(),
    linkedinUrl: z.string().url().nullable().optional(),
    websiteUrl: z.string().url().nullable().optional(),
    interests: z.array(z.string().max(80)).max(30).optional(),
    skills: z.array(z.string().max(80)).max(30).optional(),
}).strict();

function serializeUser(user: {
    id: string;
    email: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    bio?: string | null;
    status: string;
    onboardingCompleted: boolean;
    role?: string | null;
    classYear?: string | null;
    section?: string | null;
    githubUrl?: string | null;
    linkedinUrl?: string | null;
    websiteUrl?: string | null;
    interests?: string[];
    skills?: string[];
}) {
    return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        username: user.username,
        avatar: user.avatarUrl,
        bio: user.bio,
        status: user.status,
        onboardingCompleted: user.onboardingCompleted,
        role: user.role ?? null,
        classYear: user.classYear ?? null,
        section: user.section ?? null,
        githubUrl: user.githubUrl ?? null,
        linkedinUrl: user.linkedinUrl ?? null,
        websiteUrl: user.websiteUrl ?? null,
        interests: user.interests ?? [],
        skills: user.skills ?? [],
    };
}

function normalizeUsernameCandidate(value: string): string {
    return value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase().slice(0, 30);
}

async function resolveOrganizationRole(userId: string, legacyRole?: string | null) {
    const supabase = getSupabaseAdmin();
    const { data: assignments } = await supabase
        .from("organization_role_assignments")
        .select("role:organization_roles(key, name, hierarchy_level)")
        .eq("user_id", userId)
        .eq("is_active", true);
    const roles = ((assignments || []) as any[]).map((a) => a.role).filter(Boolean);
    roles.sort((a, b) => (b.hierarchy_level || 0) - (a.hierarchy_level || 0));
    const top = roles[0];
    if (top) return { role: top.key, roleName: top.name };
    return {
        role: legacyRole || "member",
        roleName: (legacyRole || "member").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
    };
}

async function resolveAuthenticatedUser(authHeader: string | undefined) {
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized.");
    const token = authHeader.slice(7);
    try {
        const payload = await verifyToken(token);
        const user = await userRepository.findById(payload.userId);
        if (!user) throw new Error("User not found.");
        return { user, payload };
    } catch {
        const supabaseUser = await verifySupabaseToken(token);
        let user = await userRepository.findByEmailInsensitive(supabaseUser.email);
        if (!user) {
            const username = await findAvailableUsername(
                undefined,
                supabaseUser.email,
                supabaseUser.displayName
            );
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
        return { user, payload: { userId: user.id, email: user.email, username: user.username } };
    }
}

async function findUserByEmail(email: string) {
    return userRepository.findByEmailInsensitive(email);
}

async function findAvailableUsername(
    preferredUsername: string | undefined,
    email: string,
    displayName: string
): Promise<string> {
    const supabase = (await import("../lib/supabase.js")).getSupabaseAdmin();
    const candidate = normalizeUsernameCandidate(preferredUsername || displayName || email.split("@")[0]) || "user";
    
    // Quick check for primary candidate
    const { data: existing } = await supabase.from("users").select("username").eq("username", candidate).maybeSingle();
    if (!existing) return candidate;

    // Fast random suffix
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${candidate.slice(0, 20)}_${randomSuffix}`;
}

// ─── POST /auth/session/exchange ───────────────────────────────

auth.post("/session/exchange", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return c.json({ error: "Supabase session token is required." }, 401);
    }

    const ip = getClientIp(c);
    if (!checkRateLimit(`session-exchange:${ip}`, 20, 10 * 60 * 1000)) {
        return c.json({ error: "Too many sign-in attempts. Please try again later." }, 429);
    }

    const body = await c.req.json().catch(() => ({}));
    const result = sessionExchangeSchema.safeParse(body);
    if (!result.success) {
        return c.json({ error: result.error.issues[0].message }, 400);
    }

    let authUser;
    try {
        authUser = await verifySupabaseToken(authHeader.slice(7));
    } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid Supabase session.";
        return c.json({ error: message }, 401);
    }

    const preferredDisplayName = result.data.preferredDisplayName?.trim();
    const existingUser = await findUserByEmail(authUser.email);

    let user;
    let isNewUser = false;

    if (existingUser) {
        const nextStatus = existingUser.status === "offline" ? "online" : existingUser.status;
        user = await userRepository.update(existingUser.id, {
                status: nextStatus,
                emailVerified: existingUser.emailVerified || authUser.emailVerified,
                ...(authUser.avatarUrl && !existingUser.avatarUrl
                    ? { avatarUrl: authUser.avatarUrl }
                    : {}),
                ...(preferredDisplayName && existingUser.displayName === existingUser.username
                    ? { displayName: preferredDisplayName }
                    : {}),
        });
    } else {
        const username = await findAvailableUsername(
            result.data.preferredUsername,
            authUser.email,
            preferredDisplayName ?? authUser.displayName
        );

        user = await userRepository.create({
            email: authUser.email,
            username,
            displayName: preferredDisplayName ?? authUser.displayName,
            passwordHash: null,
            avatarUrl: authUser.avatarUrl,
            status: "online",
            emailVerified: authUser.emailVerified,
            onboardingCompleted: false,
        });
        isNewUser = true;
    }

    const token = await signToken({
        userId: user.id,
        email: user.email,
        username: user.username,
    });

    return c.json({
        token,
        user: serializeUser(user),
        isNewUser,
    });
});

// ─── Deprecated custom auth routes ─────────────────────────────

auth.post("/register", async (c) => {
    return c.json({
        error: "Email/password sign-up is handled by Supabase Auth on the client.",
    }, 410);
});

auth.post("/login", async (c) => {
    return c.json({
        error: "Email/password sign-in is handled by Supabase Auth on the client.",
    }, 410);
});

auth.get("/verify-email", async (c) => {
    return c.json({
        error: "Email verification is handled by Supabase Auth on the client.",
    }, 410);
});

auth.post("/resend-verification", async (c) => {
    return c.json({
        error: "Verification emails are handled by Supabase Auth on the client.",
    }, 410);
});

auth.post("/forgot-password", async (c) => {
    return c.json({
        error: "Password reset emails are handled by Supabase Auth on the client.",
    }, 410);
});

auth.post("/reset-password", async (c) => {
    return c.json({
        error: "Password resets are handled by Supabase Auth on the client.",
    }, 410);
});

auth.post("/change-password", async (c) => {
    return c.json({
        error: "Password changes are handled by Supabase Auth on the client.",
    }, 410);
});

// ─── DELETE /auth/account (requires token) ──────────────────────

auth.delete("/account", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return c.json({ error: "Unauthorized." }, 401);
    }

    try {
        const payload = await verifyToken(authHeader.slice(7));
        const body = await c.req.json().catch(() => ({}));

        const password = typeof body.password === "string" ? body.password : "";
        if (!password) {
            return c.json({ error: "Password is required to delete your account." }, 400);
        }

        const user = await userRepository.findById(payload.userId);
        if (!user) {
            return c.json({ error: "User not found." }, 404);
        }

        try {
            await reauthenticateSupabaseUser(user.email, password);
        } catch {
            return c.json({ error: "Incorrect password." }, 401);
        }

        // Cascade delete handles most relations. Transfer server ownership or delete owned servers.
        await prisma.$transaction(async (tx: any) => {
            await tx.server.deleteMany({
                where: { ownerId: user.id },
            });
            await tx.user.delete({ where: { id: user.id } });
        });

        return c.json({ message: "Account deleted successfully." });
    } catch {
        return c.json({ error: "Invalid or expired token." }, 401);
    }
});

// ─── GET /auth/check-username?username=xxx ──────────────────────

auth.get("/check-username", async (c) => {
    const username = c.req.query("username")?.toLowerCase();
    if (!username || username.length < 3) {
        return c.json({ available: false, error: "Username must be at least 3 characters." });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return c.json({ available: false, error: "Invalid characters in username." });
    }

    const existing = await userRepository.findByUsername(username);
    return c.json({ available: !existing });
});

// ─── GET /auth/me (requires token) ─────────────────────────────

auth.get("/me", async (c) => {
    try {
        const { user } = await resolveAuthenticatedUser(c.req.header("Authorization"));
        return c.json({
            user: { ...serializeUser(user), ...(await resolveOrganizationRole(user.id, user.role)) },
        });
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Invalid or expired token." }, 401);
    }
});

// Mobile and web clients use /auth/profile as the canonical current-user read.
auth.get("/profile", async (c) => {
    try {
        const { user } = await resolveAuthenticatedUser(c.req.header("Authorization"));
        const authority = await resolveOrganizationRole(user.id, user.role);
        return c.json({ user: { ...serializeUser(user), ...authority } });
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Invalid or expired token." }, 401);
    }
});

// ─── PATCH /auth/profile (requires token) ───────────────────────

auth.patch("/profile", async (c) => {
    try {
        const { payload } = await resolveAuthenticatedUser(c.req.header("Authorization"));
        const body = await c.req.json();

        const result = profileUpdateSchema.safeParse(body);
        if (!result.success) {
            return c.json({ error: result.error.issues[0].message }, 400);
        }

        const updateData: Prisma.UserUpdateInput = {};
        if (result.data.displayName !== undefined) updateData.displayName = result.data.displayName;
        if (result.data.bio !== undefined) updateData.bio = result.data.bio;
        if (result.data.avatarUrl !== undefined) updateData.avatarUrl = result.data.avatarUrl;
        if (result.data.status !== undefined) updateData.status = result.data.status;
        if (result.data.onboardingCompleted !== undefined)
            updateData.onboardingCompleted = result.data.onboardingCompleted;
        for (const key of ["classYear", "section", "githubUrl", "linkedinUrl", "websiteUrl", "interests", "skills"] as const) {
            const value = result.data[key];
            if (value !== undefined) (updateData as any)[key] = value;
        }

        if (result.data.username !== undefined) {
            const nextUsername = result.data.username.toLowerCase();
            const taken = await prisma.user.findFirst({
                where: { username: nextUsername, NOT: { id: payload.userId } },
                select: { id: true },
            });
            if (taken) {
                return c.json({ error: "That username is already taken." }, 409);
            }
            updateData.username = nextUsername;
        }

        const user = await userRepository.update(payload.userId, updateData as any);

        if (result.data.status !== undefined) {
            const friendships: Array<{ userId: string; friendId: string }> = await prisma.friend.findMany({
                where: { OR: [{ userId: payload.userId }, { friendId: payload.userId }] },
                select: { userId: true, friendId: true },
            });
            const friendIds = new Set<string>(
                friendships.map((friendship): string =>
                    friendship.userId === payload.userId
                        ? friendship.friendId
                        : friendship.userId
                )
            );
            await broadcastToUsers(friendIds, {
                type: "presence_update",
                data: { userId: payload.userId, status: user.status },
            });
        }

        return c.json({
            user: serializeUser(user),
        });
    } catch {
        return c.json({ error: "Invalid or expired token." }, 401);
    }
});

// ─── POST /auth/logout (requires token) ──────────────────────────

auth.post("/logout", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return c.json({ error: "Unauthorized." }, 401);
    }

    try {
        const payload = await verifyToken(authHeader.slice(7));

        // Persist offline on explicit logout. The client also leaves the
        // Supabase Presence channel, which notifies other users in realtime.
        await userRepository.update(payload.userId, { status: "offline" });

        return c.json({ message: "Logged out." });
    } catch {
        return c.json({ error: "Invalid or expired token." }, 401);
    }
});

export default auth;

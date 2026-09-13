import { Hono } from "hono";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";

const app = new Hono<AuthEnv>();

// In-memory fast prekey bundle cache
const preKeyBundleStore = new Map<
    string,
    {
        userId: string;
        identityPublicKey: string;
        ephemeralPublicKey: string;
        createdAt: string;
    }
>();

// Register or update public prekey bundle
app.post("/register-key", async (c) => {
    try {
        const body = await c.req.json().catch(() => ({}));
        const { userId, identityPublicKey, ephemeralPublicKey } = body;

        if (!userId || !identityPublicKey) {
            return c.json({ error: "userId and identityPublicKey are required" }, 400);
        }

        const bundle = {
            userId,
            identityPublicKey,
            ephemeralPublicKey: ephemeralPublicKey || identityPublicKey,
            createdAt: new Date().toISOString(),
        };

        preKeyBundleStore.set(userId, bundle);

        // Also persist to Supabase if available
        try {
            const supabase = getSupabaseAdmin();
            await supabase.from("user_settings").upsert(
                {
                    user_id: userId,
                    custom_status: JSON.stringify({ e2ee_bundle: bundle }),
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id" }
            );
        } catch {
            // DB fallback
        }

        return c.json({ success: true, bundle });
    } catch (err: any) {
        return c.json({ error: err.message || "Failed to register E2EE key" }, 500);
    }
});

// Fetch prekey bundle for peer
app.get("/keys/:userId", async (c) => {
    const userId = c.req.param("userId");
    if (!userId) {
        return c.json({ error: "userId is required" }, 400);
    }

    let bundle = preKeyBundleStore.get(userId);

    if (!bundle) {
        try {
            const supabase = getSupabaseAdmin();
            const { data } = await supabase
                .from("user_settings")
                .select("custom_status")
                .eq("user_id", userId)
                .maybeSingle();

            if (data?.custom_status) {
                const parsed = JSON.parse(data.custom_status);
                if (parsed.e2ee_bundle) {
                    bundle = parsed.e2ee_bundle;
                    preKeyBundleStore.set(userId, bundle!);
                }
            }
        } catch {}
    }

    if (!bundle) {
        return c.json({ error: "No E2EE key found for user" }, 404);
    }

    return c.json({ bundle });
});

export default app;

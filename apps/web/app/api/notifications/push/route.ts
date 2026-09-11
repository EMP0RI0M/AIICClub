import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

/**
 * GET /api/notifications/push
 * Returns VAPID public key and current user subscription status.
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BC6OjNUcOFARwt5wftxht4E4TbHWm5FrF-_5HEhIcuW2lC6EEuPDJ68xQwNRfMrMkTs9ilROLDDFe3XL6Oafd98";

    if (!user) {
        return NextResponse.json({ publicKey, subscribed: false, subscriptions: [] });
    }

    const supabase = getSupabaseAdmin();
    const { data } = await supabase
        .from("user_settings")
        .select("settings")
        .eq("user_id", user.id)
        .maybeSingle();

    const subs = data?.settings?.push_subscriptions || [];

    return NextResponse.json({
        publicKey,
        subscribed: subs.length > 0,
        subscriptions: subs,
    });
}

/**
 * POST /api/notifications/push
 * Registers or updates a client PushSubscription for the authenticated user in user_settings.
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { subscription, deviceType, browser } = body;

        if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
            return NextResponse.json({ error: "Invalid push subscription object" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const userAgent = req.headers.get("user-agent") || "unknown";

        const { data: existingRow } = await supabase
            .from("user_settings")
            .select("id, settings")
            .eq("user_id", user.id)
            .maybeSingle();

        const currentSettings = existingRow?.settings || {};
        const existingSubs: any[] = currentSettings.push_subscriptions || [];

        // Deduplicate or update matching endpoint
        const updatedSubs = existingSubs.filter((s) => s.endpoint !== subscription.endpoint);
        updatedSubs.push({
            id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            device_type: deviceType || "desktop",
            browser: browser || "browser",
            user_agent: userAgent,
            updated_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            enabled: true,
        });

        const newSettings = {
            ...currentSettings,
            push_subscriptions: updatedSubs,
        };

        const { error } = await supabase
            .from("user_settings")
            .upsert(
                {
                    user_id: user.id,
                    settings: newSettings,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id" }
            );

        if (error) {
            console.error("[PUSH_SUB_UPSERT_ERROR]", error);
            return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
        }

        return NextResponse.json({ success: true, subscriptions: updatedSubs });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Invalid request" }, { status: 400 });
    }
}

/**
 * DELETE /api/notifications/push
 * Unregisters a push subscription endpoint.
 */
export async function DELETE(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { endpoint } = body;

        if (!endpoint) {
            return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", user.id)
            .eq("endpoint", endpoint);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to unregister" }, { status: 400 });
    }
}

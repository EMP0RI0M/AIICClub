import webpush from "web-push";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BC6OjNUcOFARwt5wftxht4E4TbHWm5FrF-_5HEhIcuW2lC6EEuPDJ68xQwNRfMrMkTs9ilROLDDFe3XL6Oafd98";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "42MqK6sJMC49V20QA3CfMyYK6Smj0hTcJk3kOZ1bFeQ";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@aiic.club";

// Initialize VAPID
try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
    console.warn("[VAPID_INIT_WARN]", err);
}

export interface PushNotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data: {
        url: string;
        messageId?: string;
        conversationId?: string;
        channelId?: string;
        senderId?: string;
        type?: "dm" | "channel" | "mention" | "reply" | "system";
    };
}

// In-memory idempotency deduplication cache
const sentNotificationKeys = new Set<string>();

/**
 * Dispatch web push notification to a recipient across all their registered active devices.
 */
export async function sendWebPushToUser(
    recipientUserId: string,
    payload: PushNotificationPayload,
    options?: { messageId?: string }
) {
    // 1. Idempotency Check (1 message + 1 recipient = 1 notification max)
    if (options?.messageId) {
        const idempotencyKey = `${options.messageId}:${recipientUserId}`;
        if (sentNotificationKeys.has(idempotencyKey)) return;
        sentNotificationKeys.add(idempotencyKey);
        setTimeout(() => sentNotificationKeys.delete(idempotencyKey), 120000); // 2 min TTL
    }

    const supabase = getSupabaseAdmin();

    try {
        // 2. Fetch all active push subscriptions for user from user_settings
        const { data: userSettingsRow } = await supabase
            .from("user_settings")
            .select("settings")
            .eq("user_id", recipientUserId)
            .maybeSingle();

        const subscriptions: any[] = userSettingsRow?.settings?.push_subscriptions || [];
        const activeSubs = subscriptions.filter((s) => s && s.endpoint && s.enabled !== false);

        if (activeSubs.length === 0) return;

        const stringifiedPayload = JSON.stringify(payload);

        // 3. Send to all devices in parallel
        await Promise.allSettled(
            activeSubs.map(async (sub) => {
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth,
                    },
                };

                try {
                    await webpush.sendNotification(pushSubscription, stringifiedPayload, {
                        TTL: 3600, // 1 hour delivery window
                    });
                } catch (pushErr: any) {
                    console.warn("[PUSH_SEND_WARN]", sub.endpoint, pushErr.message);
                }
            })
        );
    } catch (err) {
        console.warn("[SEND_WEB_PUSH_ERROR]", recipientUserId, err);
    }
}

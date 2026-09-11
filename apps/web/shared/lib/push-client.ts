/**
 * Client helper to manage Service Worker & Web Push Subscriptions
 */

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
        return null;
    }
    try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        return reg;
    } catch (err) {
        console.warn("[SW_REGISTER_WARN]", err);
        return null;
    }
}

export async function subscribeToWebPush(): Promise<{ success: boolean; error?: string }> {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        return { success: false, error: "Web Push is not supported in this browser." };
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            return { success: false, error: "Notification permission was denied." };
        }

        const registration = await navigator.serviceWorker.ready;

        // Fetch VAPID public key
        const res = await fetch("/api/notifications/push");
        const { publicKey } = await res.json();

        if (!publicKey) {
            return { success: false, error: "VAPID key unavailable." };
        }

        const convertedVapidKey = urlBase64ToUint8Array(publicKey);

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey,
            });
        }

        // Detect device / browser
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const deviceType = isMobile ? "mobile" : "desktop";
        const browser = navigator.userAgent.includes("Chrome")
            ? "Chrome"
            : navigator.userAgent.includes("Firefox")
            ? "Firefox"
            : navigator.userAgent.includes("Safari")
            ? "Safari"
            : "Browser";

        // Helper to retrieve auth token
        let token: string | null = null;
        try {
            const stored = localStorage.getItem("corvus-auth");
            if (stored) {
                const parsed = JSON.parse(stored);
                token = parsed?.state?.token || null;
            }
            if (!token) {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith("sb-") || key.includes("supabase") || key.includes("auth"))) {
                        const raw = localStorage.getItem(key);
                        if (raw) {
                            try {
                                const parsed = JSON.parse(raw);
                                if (parsed?.access_token) {
                                    token = parsed.access_token;
                                    break;
                                }
                            } catch {}
                        }
                    }
                }
            }
        } catch {}

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const saveRes = await fetch("/api/notifications/push", {
            method: "POST",
            headers,
            credentials: "include",
            body: JSON.stringify({
                subscription: subscription.toJSON(),
                deviceType,
                browser,
            }),
        });

        if (!saveRes.ok) {
            const errData = await saveRes.json().catch(() => ({}));
            throw new Error(errData?.error || "Failed to register subscription on server");
        }

        return { success: true };
    } catch (err: any) {
        console.error("[SUBSCRIBE_PUSH_ERROR]", err);
        return { success: false, error: err.message || "Failed to enable notifications" };
    }
}

export async function checkPushSubscriptionStatus(): Promise<boolean> {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        return false;
    }

    if (Notification.permission !== "granted") {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return !!subscription;
    } catch {
        return false;
    }
}

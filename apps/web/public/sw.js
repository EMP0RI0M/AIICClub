self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
    if (!event.data) return;

    try {
        const payload = event.data.json();
        const {
            title = "AIIC Notification",
            body = "You have a new update in AIIC",
            icon = "/corvus-logo.png",
            badge = "/corvus-logo.png",
            tag = "aiic-message",
            data = {},
        } = payload;

        const options = {
            body,
            icon,
            badge,
            tag, // Groups/replaces duplicate notifications for same event
            data,
            renotify: true,
            vibrate: [100, 50, 100],
            actions: [
                { action: "open", title: "Open Message" },
                { action: "dismiss", title: "Dismiss" },
            ],
        };

        event.waitUntil(self.registration.showNotification(title, options));
    } catch (err) {
        console.error("[SW_PUSH_ERROR]", err);
    }
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    if (event.action === "dismiss") return;

    const data = event.notification.data || {};
    let targetUrl = data.url || "/";

    // Ensure URL is internal and safe
    if (!targetUrl.startsWith("/")) {
        targetUrl = "/";
    }

    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => {
                // Focus existing client if available
                for (const client of clientList) {
                    if (client.url && "focus" in client) {
                        client.navigate(targetUrl);
                        return client.focus();
                    }
                }
                // Otherwise open a new window
                if (self.clients.openWindow) {
                    return self.clients.openWindow(targetUrl);
                }
            })
    );
});

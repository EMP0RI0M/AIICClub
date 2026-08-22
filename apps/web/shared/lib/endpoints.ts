function trimTrailingSlash(url: string) {
    return url.replace(/\/+$/, "");
}

function apiBase(url: string) {
    const normalized = trimTrailingSlash(url);
    return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
}

const envApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "";

// In production the browser must use the dedicated API deployment. The old
// browser-only "/api" fallback silently routed requests to aiic-bbs (the web
// deployment), which returned HTML 404s for Hono endpoints.
export const API_URL = apiBase(envApiUrl || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"));

export function ensureApiUrl() {
    return API_URL;
}

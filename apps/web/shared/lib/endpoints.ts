function trimTrailingSlash(url: string) {
    return url.replace(/\/+$/, "");
}

function apiBase(url: string) {
    const normalized = trimTrailingSlash(url);
    return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
}

// On the web client (browser), always use local Next.js "/api" routes.
// External API URLs are only used for desktop/mobile clients if explicitly configured.
export const API_URL = typeof window !== "undefined"
    ? "/api"
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}/api`
        : process.env.NEXT_PUBLIC_VERCEL_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/api`
          : "http://localhost:3000/api";

export function ensureApiUrl() {
    return API_URL;
}

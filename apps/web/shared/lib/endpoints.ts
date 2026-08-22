function trimTrailingSlash(url: string) {
    return url.replace(/\/+$/, "");
}

function apiBase(url: string) {
    const normalized = trimTrailingSlash(url);
    return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
}

const envApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "";

export const API_URL = envApiUrl
    ? apiBase(envApiUrl)
    : typeof window !== "undefined"
      ? "/api"
      : "http://localhost:3000/api";

export function ensureApiUrl() {
    return API_URL;
}

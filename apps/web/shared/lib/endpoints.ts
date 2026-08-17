function trimTrailingSlash(url: string) {
    return url.replace(/\/+$/, "");
}

const envApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "";

export const API_URL = typeof window !== "undefined"
    ? "/api"
    : trimTrailingSlash(envApiUrl || "http://localhost:3000/api");

export function ensureApiUrl() {
    return API_URL;
}

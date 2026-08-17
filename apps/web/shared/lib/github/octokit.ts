import { generateAppJWT } from "./app";

const GITHUB_API_BASE = "https://api.github.com";

interface TokenCacheEntry {
    token: string;
    expiresAt: number;
}

const tokenCache = new Map<number | string, TokenCacheEntry>();

/**
 * Exchanges the GitHub App JWT for a scoped Installation Access Token.
 * Caches the token in memory until 5 minutes before its expiration.
 */
export async function getInstallationAccessToken(installationId: number | bigint | string): Promise<string | null> {
    const instIdKey = String(installationId);
    const cached = tokenCache.get(instIdKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
        return cached.token;
    }

    const appJwt = generateAppJWT();
    if (!appJwt) {
        // Fallback to static GITHUB_TOKEN if App credentials not configured
        const fallback = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
        return fallback || null;
    }

    try {
        const res = await fetch(`${GITHUB_API_BASE}/app/installations/${installationId}/access_tokens`, {
            method: "POST",
            headers: {
                Accept: "application/vnd.github.v3+json",
                Authorization: `Bearer ${appJwt}`,
                "User-Agent": "AIIC-Platform-Automation/1.0",
            },
        });

        if (!res.ok) {
            const errBody = await res.text();
            console.error(`[GITHUB_TOKEN_EXCHANGE_ERROR] ${res.status}: ${errBody}`);
            return null;
        }

        const data = await res.json();
        const expiresAt = new Date(data.expires_at).getTime();

        tokenCache.set(instIdKey, {
            token: data.token,
            expiresAt,
        });

        return data.token;
    } catch (err) {
        console.error("[GITHUB_TOKEN_FETCH_FAILED]", err);
        return null;
    }
}

/**
 * Makes an authenticated request to the GitHub REST API on behalf of an installation.
 */
export async function githubRequest<T = any>(
    endpoint: string,
    options: RequestInit = {},
    installationId?: number | bigint | string
): Promise<{ data: T | null; error: string | null; status: number }> {
    let token: string | null = null;

    if (installationId) {
        token = await getInstallationAccessToken(installationId);
    } else {
        token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || null;
    }

    const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "AIIC-Platform-Automation/1.0",
        ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const url = endpoint.startsWith("http") ? endpoint : `${GITHUB_API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    try {
        const res = await fetch(url, {
            ...options,
            headers,
        });

        const status = res.status;
        if (!res.ok) {
            const errText = await res.text();
            return { data: null, error: errText || res.statusText, status };
        }

        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            const data = await res.json();
            return { data, error: null, status };
        }

        const text = await res.text();
        return { data: text as any, error: null, status };
    } catch (err: any) {
        return { data: null, error: err.message || "Network error", status: 500 };
    }
}

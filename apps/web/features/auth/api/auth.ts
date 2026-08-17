import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/shared/supabase/client";
import { ensureApiUrl } from "@/shared/lib/endpoints";

const pendingSignupStorageKey = "corvus-pending-signups";

export interface PendingSignupProfile {
    email: string;
    displayName: string;
    username: string;
}

export interface SessionExchangeResponse {
    token: string;
    user: {
        id: string;
        email: string;
        displayName: string;
        username: string;
        avatar: string | null;
        bio: string | null;
        status: "online" | "idle" | "dnd" | "invisible" | "offline";
        onboardingCompleted: boolean;
    };
    isNewUser: boolean;
}

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function getResponseError(data: unknown, fallback: string): string {
    if (!data || typeof data !== "object") {
        return fallback;
    }

    const maybeError = data as { error?: string; message?: string; details?: string };
    const baseMessage = maybeError.error || maybeError.message || fallback;
    return maybeError.details ? `${baseMessage}: ${maybeError.details}` : baseMessage;
}

// ─── Pending signup profile (display name / username chosen before the
//     Supabase confirmation email is clicked) ───────────────────────────

function readPendingSignups(): Record<string, PendingSignupProfile> {
    if (typeof window === "undefined") return {};

    try {
        const raw = window.localStorage.getItem(pendingSignupStorageKey);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object"
            ? (parsed as Record<string, PendingSignupProfile>)
            : {};
    } catch {
        return {};
    }
}

function writePendingSignups(value: Record<string, PendingSignupProfile>): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(pendingSignupStorageKey, JSON.stringify(value));
}

export function savePendingSignupProfile(profile: PendingSignupProfile): void {
    const pendingSignups = readPendingSignups();
    pendingSignups[normalizeEmail(profile.email)] = {
        email: normalizeEmail(profile.email),
        username: profile.username.trim().toLowerCase(),
        displayName: profile.displayName.trim(),
    };
    writePendingSignups(pendingSignups);
}

export function getPendingSignupProfile(email: string): PendingSignupProfile | null {
    return readPendingSignups()[normalizeEmail(email)] ?? null;
}

export function clearPendingSignupProfile(email: string): void {
    const pendingSignups = readPendingSignups();
    delete pendingSignups[normalizeEmail(email)];
    writePendingSignups(pendingSignups);
}

// ─── Redirect URLs ───────────────────────────────────────────────

function buildAbsoluteUrl(path: string): string {
    if (typeof window === "undefined") return path;
    return new URL(path, window.location.origin).toString();
}

export function getAuthCallbackUrl(): string {
    return buildAbsoluteUrl("/auth/callback");
}

export function getPasswordResetUrl(): string {
    return buildAbsoluteUrl("/reset-password");
}

// ─── Supabase Auth operations ────────────────────────────────────

export async function signInWithEmail(email: string, password: string): Promise<Session> {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
    });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error("No session returned from auth.");
    return data.session;
}

export async function signUpWithEmail(params: {
    email: string;
    password: string;
    displayName: string;
    username?: string;
}): Promise<{ needsConfirmation: boolean }> {
    const { data, error } = await getSupabaseClient().auth.signUp({
        email: normalizeEmail(params.email),
        password: params.password,
        options: {
            data: {
                display_name: params.displayName.trim(),
                username: params.username?.trim().toLowerCase(),
            },
            emailRedirectTo: getAuthCallbackUrl(),
        },
    });
    if (error) throw new Error(error.message);

    // When email confirmation is enabled, Supabase returns a user but no session.
    const needsConfirmation = !data.session;
    return { needsConfirmation };
}


export async function signInWithGoogle(): Promise<void> {
    const { error } = await getSupabaseClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getAuthCallbackUrl() },
    });
    if (error) throw new Error(error.message);
}

export async function signInWithGithub(): Promise<void> {
    const { error } = await getSupabaseClient().auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo: getAuthCallbackUrl() },
    });
    if (error) throw new Error(error.message);
}

export async function signOutSupabase(): Promise<void> {
    await getSupabaseClient().auth.signOut();
}

export async function requestPasswordReset(email: string): Promise<void> {
    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(
        normalizeEmail(email),
        { redirectTo: getPasswordResetUrl() }
    );
    if (error) throw new Error(error.message);
}

export async function updatePassword(newPassword: string): Promise<void> {
    const { error } = await getSupabaseClient().auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
}

/**
 * Change the account email. Supabase sends a confirmation link to the new
 * address; the change only takes effect once that link is clicked.
 */
export async function updateEmail(newEmail: string): Promise<void> {
    const { error } = await getSupabaseClient().auth.updateUser(
        { email: normalizeEmail(newEmail) },
        { emailRedirectTo: getAuthCallbackUrl() }
    );
    if (error) throw new Error(error.message);
}

export async function resendVerificationEmail(email: string): Promise<void> {
    const { error } = await getSupabaseClient().auth.resend({
        type: "signup",
        email: normalizeEmail(email),
        options: { emailRedirectTo: getAuthCallbackUrl() },
    });
    if (error) throw new Error(error.message);
}

/**
 * Return the current Supabase session, waiting briefly for `detectSessionInUrl`
 * to finish parsing OAuth / email-link redirects on first load.
 */
export async function getActiveSupabaseSession(timeoutMs = 4000): Promise<Session | null> {
    const supabase = getSupabaseClient();

    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;

    // If we're in the browser, check if the URL has any hash or query params indicating
    // an active OAuth / email link exchange. If not, don't wait for onAuthStateChange.
    if (typeof window !== "undefined") {
        const hash = window.location.hash || "";
        const search = window.location.search || "";
        const hasAuthParams =
            hash.includes("access_token=") ||
            hash.includes("id_token=") ||
            hash.includes("refresh_token=") ||
            hash.includes("error=") ||
            search.includes("code=") ||
            search.includes("token=") ||
            search.includes("type=");

        if (!hasAuthParams) {
            return null;
        }
    }

    return new Promise<Session | null>((resolve) => {
        const timer = setTimeout(() => {
            subscription.unsubscribe();
            resolve(null);
        }, timeoutMs);

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                clearTimeout(timer);
                subscription.unsubscribe();
                resolve(session);
            }
        });
    });
}

export async function getSupabaseAccessToken(): Promise<string | null> {
    const session = await getActiveSupabaseSession();
    return session?.access_token ?? null;
}

/**
 * Exchange a verified Supabase access token for an app session token + profile
 * by calling the API's /auth/session/exchange endpoint.
 */
export async function exchangeSupabaseSession(
    profile?: Partial<Pick<PendingSignupProfile, "displayName" | "username">>,
    explicitToken?: string
): Promise<SessionExchangeResponse | null> {
    const supabase = getSupabaseClient();
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    const token = explicitToken || session?.access_token;
    const authUser = session?.user;

    if (!authUser || !token) return null;

    // Try calling the App Router endpoint first
    try {
        const response = await fetch("/api/auth/session/exchange", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                preferredDisplayName: profile?.displayName?.trim() || undefined,
                preferredUsername: profile?.username?.trim().toLowerCase() || undefined,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            if (data?.user && data?.token) {
                return data as SessionExchangeResponse;
            }
        }
    } catch {
        // Fallback to direct Supabase profile resolution below
    }

    // Direct browser-side Supabase client resolution (zero network API failure)
    try {
        const email = authUser.email?.toLowerCase() || `${authUser.id}@corvus.internal`;
        const { data: existingUser } = await supabase
            .from("users")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle();

        const baseUsername = profile?.username?.trim().toLowerCase() ||
            existingUser?.username ||
            email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 20);

        const displayName = profile?.displayName?.trim() ||
            existingUser?.display_name ||
            authUser.user_metadata?.display_name ||
            baseUsername;

        if (!existingUser) {
            await supabase.from("users").upsert({
                id: authUser.id,
                email,
                username: baseUsername,
                display_name: displayName,
                avatar_url: authUser.user_metadata?.avatar_url || null,
                status: "online",
                onboarding_completed: true,
                email_verified: true,
                updated_at: new Date().toISOString(),
            }, { onConflict: "id" });
        }

        return {
            token: token,
            user: {
                id: authUser.id,
                email,
                displayName: existingUser?.display_name || displayName,
                username: existingUser?.username || baseUsername,
                avatar: existingUser?.avatar_url || authUser.user_metadata?.avatar_url || null,
                bio: existingUser?.bio || null,
                status: (existingUser?.status as any) || "online",
                onboardingCompleted: existingUser?.onboarding_completed ?? true,
            },
            isNewUser: !existingUser,
        };
    } catch (err: any) {
        console.error("Direct Supabase profile resolution fallback failed:", err);
        return {
            token: token,
            user: {
                id: authUser.id,
                email: authUser.email || `${authUser.id}@corvus.internal`,
                displayName: authUser.user_metadata?.display_name || "User",
                username: (authUser.email?.split("@")[0] || "user").replace(/[^a-zA-Z0-9_]/g, "_"),
                avatar: authUser.user_metadata?.avatar_url || null,
                bio: null,
                status: "online",
                onboardingCompleted: true,
            },
            isNewUser: false,
        };
    }
}

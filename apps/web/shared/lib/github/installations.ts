import { getSupabaseAdmin } from "@/shared/supabase/admin";

export interface GitHubInstallationRecord {
    id: string;
    server_id?: string | null;
    installation_id: number;
    account_id: number;
    account_login: string;
    account_type: string;
    target_type: string;
    repository_selection: string;
    permissions_snapshot: Record<string, any>;
    is_active: boolean;
    suspended_at?: string | null;
    installed_by_user_id?: string | null;
    created_at: string;
    updated_at: string;
}

export interface SyncInstallationResult {
    record: GitHubInstallationRecord | null;
    error: any | null;
    sanitizedPayload: Record<string, any>;
}

/**
 * Resolves an installation record from public.github_installations by GitHub numeric installation_id.
 */
export async function resolveInstallationRecord(
    installationId: number | bigint | string
): Promise<GitHubInstallationRecord | null> {
    const supabase = getSupabaseAdmin();
    const instIdNum = typeof installationId === "string" ? parseInt(installationId, 10) : Number(installationId);

    if (!instIdNum || isNaN(instIdNum)) return null;

    const { data, error } = await supabase
        .from("github_installations")
        .select("*")
        .eq("installation_id", instIdNum)
        .maybeSingle();

    if (error || !data) {
        return null;
    }

    return data as GitHubInstallationRecord;
}

/**
 * Provisions or updates a GitHub installation as a GLOBAL governance object from a webhook event or manual sync.
 * server_id is explicitly NULL (installations are not tenant-owned by any individual Space).
 */
export async function syncInstallationFromWebhook(
    payload: any
): Promise<SyncInstallationResult> {
    const supabase = getSupabaseAdmin();
    const inst = payload.installation || payload;
    const instId = inst.id || payload.installation_id;

    if (!instId) {
        return {
            record: null,
            error: { message: "No installation.id found in payload." },
            sanitizedPayload: {},
        };
    }

    const accountObj = inst.account || payload.organization || payload.sender || {};
    const accountId = accountObj.id || 0;
    const accountLogin = accountObj.login || "AIIC-bbs";
    const accountType = accountObj.type || (payload.organization ? "Organization" : "User");
    const action = payload.action || "created";

    // Normalize target_type to lowercase ('organization' | 'repository') per CHECK constraint chk_github_installation_target_type
    const rawTargetType = (inst.target_type || "organization").toLowerCase();
    const normalizedTargetType = rawTargetType === "repository" ? "repository" : "organization";

    // Normalize repository_selection ('all' | 'selected')
    const rawRepoSelection = (inst.repository_selection || "all").toLowerCase();
    const normalizedRepoSelection = rawRepoSelection === "selected" ? "selected" : "all";

    const record = {
        server_id: null,
        installation_id: Number(instId),
        account_id: Number(accountId),
        account_login: accountLogin,
        account_type: accountType,
        target_type: normalizedTargetType,
        repository_selection: normalizedRepoSelection,
        permissions_snapshot: inst.permissions || payload.permissions || {},
        is_active: action !== "deleted" && !inst.suspended_at,
        suspended_at: inst.suspended_at || null,
        updated_at: new Date().toISOString(),
    };

    const sanitizedPayload = {
        server_id: null,
        installation_id: Number(instId),
        account_id: Number(accountId),
        account_login: accountLogin,
        account_type: accountType,
        target_type: record.target_type,
        repository_selection: record.repository_selection,
        is_active: record.is_active,
    };

    const { data, error } = await supabase
        .from("github_installations")
        .upsert(record, { onConflict: "installation_id" })
        .select()
        .single();

    if (error) {
        console.error("[SYNC_INSTALLATION_ERROR]", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            sanitizedPayload,
        });
        return {
            record: null,
            error,
            sanitizedPayload,
        };
    }

    return {
        record: data as GitHubInstallationRecord,
        error: null,
        sanitizedPayload,
    };
}

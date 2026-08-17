import { getSupabaseAdmin } from "@/shared/supabase/admin";

export interface GitHubRepositoryRecord {
    id: string;
    github_repo_id: number;
    owner_login: string;
    repo_name: string;
    full_name: string;
    is_private: boolean;
    default_branch: string;
    is_active: boolean;
    last_synced_at?: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Upserts a repository into public.github_repositories and links it to the installation junction.
 */
export async function syncRepositoryFromWebhook(
    repoPayload: any,
    installationRecordId: string
): Promise<GitHubRepositoryRecord | null> {
    if (!repoPayload || !repoPayload.id || !repoPayload.full_name) return null;
    const supabase = getSupabaseAdmin();

    const [ownerLogin, repoName] = repoPayload.full_name.split("/");

    const repoData = {
        github_repo_id: repoPayload.id,
        owner_login: ownerLogin || repoPayload.owner?.login || "AIIC",
        repo_name: repoName || repoPayload.name || "repo",
        full_name: repoPayload.full_name,
        is_private: !!repoPayload.private,
        default_branch: repoPayload.default_branch || "main",
        is_active: true,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const { data: repo, error: repoErr } = await supabase
        .from("github_repositories")
        .upsert(repoData, { onConflict: "github_repo_id" })
        .select()
        .single();

    if (repoErr || !repo) {
        console.error("[SYNC_REPO_ERROR]", repoErr);
        return null;
    }

    // Link to public.github_installation_repositories junction
    if (installationRecordId) {
        await supabase
            .from("github_installation_repositories")
            .upsert(
                {
                    installation_record_id: installationRecordId,
                    repository_id: repo.id,
                },
                { onConflict: "installation_record_id,repository_id" }
            );
    }

    return repo as GitHubRepositoryRecord;
}

/**
 * Finds a repository by full name or ID.
 */
export async function resolveRepositoryRecord(
    fullNameOrId: string | number
): Promise<GitHubRepositoryRecord | null> {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("github_repositories").select("*");

    if (typeof fullNameOrId === "number" || !isNaN(Number(fullNameOrId))) {
        query = query.eq("github_repo_id", Number(fullNameOrId));
    } else {
        query = query.ilike("full_name", String(fullNameOrId).trim());
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;
    return data as GitHubRepositoryRecord;
}

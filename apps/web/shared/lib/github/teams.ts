import { getSupabaseAdmin } from "@/shared/supabase/admin";

export interface AIICMappedTeam {
    teamId: string;
    teamName: string;
    githubTeamSlug: string;
    githubTeamId: number;
    syncDirection: string;
}

/**
 * Resolves AIIC teams mapped to a specific GitHub team slug or ID.
 */
export async function getTeamsMappedToGitHubTeam(
    githubTeamSlugOrId: string | number,
    installationRecordId?: string
): Promise<AIICMappedTeam[]> {
    const supabase = getSupabaseAdmin();
    let query = supabase
        .from("aiic_team_gh_teams")
        .select(`
            team_id,
            github_team_id,
            github_team_slug,
            sync_direction,
            team:aiic_teams(id, name, pool_id)
        `);

    if (installationRecordId) {
        query = query.eq("installation_record_id", installationRecordId);
    }

    if (typeof githubTeamSlugOrId === "number" || !isNaN(Number(githubTeamSlugOrId))) {
        query = query.eq("github_team_id", Number(githubTeamSlugOrId));
    } else {
        query = query.ilike("github_team_slug", String(githubTeamSlugOrId).trim());
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((item: any) => ({
        teamId: item.team_id,
        teamName: item.team?.name || "Team",
        githubTeamSlug: item.github_team_slug,
        githubTeamId: item.github_team_id,
        syncDirection: item.sync_direction,
    }));
}

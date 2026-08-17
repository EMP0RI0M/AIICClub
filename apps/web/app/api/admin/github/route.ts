import { NextRequest, NextResponse } from "next/server";
import { verifyAdminBoardAccess } from "@/shared/lib/admin-auth";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
    const auth = await verifyAdminBoardAccess(req);
    if (!auth.authorized || !auth.user) {
        return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 403 });
    }

    try {
        const supabase = getSupabaseAdmin();

        // 1. Fetch GitHub installations
        const { data: installations, error: instErr } = await supabase
            .from("github_installations")
            .select(`
                id,
                server_id,
                installation_id,
                account_id,
                account_login,
                account_type,
                target_type,
                repository_selection,
                permissions_snapshot,
                is_active,
                suspended_at,
                installed_by_user_id,
                created_at,
                updated_at
            `)
            .order("created_at", { ascending: false });

        if (instErr) {
            console.error("[GITHUB_INST_FETCH_ERROR]", instErr);
        }

        // 2. Fetch standalone repositories
        const { data: repositories, error: repoErr } = await supabase
            .from("github_repositories")
            .select(`
                id,
                github_repo_id,
                owner_login,
                repo_name,
                full_name,
                is_private,
                default_branch,
                is_active,
                last_synced_at,
                created_at
            `)
            .order("full_name", { ascending: true });

        if (repoErr) {
            console.error("[GITHUB_REPO_FETCH_ERROR]", repoErr);
        }

        // 3. Fetch installation-repository junctions
        const { data: installationRepos, error: instRepoErr } = await supabase
            .from("github_installation_repositories")
            .select("id, installation_record_id, repository_id");

        if (instRepoErr) {
            console.error("[GITHUB_INST_REPO_FETCH_ERROR]", instRepoErr);
        }

        // 4. Fetch team repository mappings
        const { data: teamRepos, error: trErr } = await supabase
            .from("aiic_team_repositories")
            .select(`
                id,
                team_id,
                repository_id,
                github_permission,
                is_primary,
                created_at,
                team:aiic_teams(id, name, key, position),
                repository:github_repositories(id, full_name, is_private, default_branch)
            `);

        if (trErr) {
            console.error("[TEAM_REPOS_FETCH_ERROR]", trErr);
        }

        // 5. Fetch team GitHub team mappings
        const { data: teamGhTeams, error: tgtErr } = await supabase
            .from("aiic_team_gh_teams")
            .select(`
                id,
                team_id,
                installation_record_id,
                github_team_id,
                github_team_slug,
                sync_direction,
                created_at,
                team:aiic_teams(id, name, key, position),
                installation:github_installations(id, account_login)
            `);

        if (tgtErr) {
            console.error("[TEAM_GH_TEAMS_FETCH_ERROR]", tgtErr);
        }

        // 6. Fetch recent webhook deliveries
        const { data: deliveries, error: delErr } = await supabase
            .from("github_webhook_deliveries")
            .select(`
                delivery_id,
                installation_record_id,
                external_installation_id,
                event_type,
                action,
                payload_hash,
                status,
                attempt_count,
                error_code,
                error_message,
                received_at,
                processed_at,
                installation:github_installations(id, account_login)
            `)
            .order("received_at", { ascending: false })
            .limit(50);

        if (delErr) {
            console.error("[DELIVERIES_FETCH_ERROR]", delErr);
        }

        return NextResponse.json({
            installations: installations || [],
            repositories: repositories || [],
            installationRepositories: installationRepos || [],
            teamRepositories: teamRepos || [],
            teamGhTeams: teamGhTeams || [],
            deliveries: deliveries || [],
        }, {
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            }
        });
    } catch (err: any) {
        console.error("[ADMIN_GITHUB_API_ERROR]", err);
        return NextResponse.json({ error: err.message || "Failed to load GitHub data." }, { status: 500 });
    }
}

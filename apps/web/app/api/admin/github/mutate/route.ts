import { NextRequest, NextResponse } from "next/server";
import { verifyAdminBoardAccess } from "@/shared/lib/admin-auth";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { githubRequest } from "@/shared/lib/github/octokit";

export async function POST(req: NextRequest) {
    const auth = await verifyAdminBoardAccess(req);
    if (!auth.authorized || !auth.user) {
        return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 403 });
    }

    try {
        const body = await req.json();
        const { action, payload } = body;
        const supabase = getSupabaseAdmin();

        if (action === "create_repository") {
            const { name, description, isPrivate, autoInit, installationRecordId } = payload || {};
            if (!name || typeof name !== "string" || !name.trim()) {
                return NextResponse.json({ error: "Repository name is required." }, { status: 400 });
            }

            const cleanName = name.trim();
            if (!/^[a-zA-Z0-9._-]+$/.test(cleanName)) {
                return NextResponse.json(
                    { error: "Repository name can only contain alphanumeric characters, hyphens, underscores, and periods." },
                    { status: 400 }
                );
            }

            // 1. Resolve active GitHub App installation
            let instQuery = supabase
                .from("github_installations")
                .select("id, installation_id, account_id, account_login, account_type, is_active")
                .eq("is_active", true);

            if (installationRecordId) {
                instQuery = instQuery.eq("id", installationRecordId);
            }

            const { data: inst, error: instErr } = await instQuery
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (instErr || !inst || !inst.installation_id) {
                return NextResponse.json(
                    { error: "No active GitHub App installation found to provision repository. Ensure the AIIC GitHub App is installed." },
                    { status: 400 }
                );
            }

            // 2. Call GitHub REST API with App installation token
            const endpoint = inst.account_type?.toLowerCase() === "organization"
                ? `/orgs/${inst.account_login}/repos`
                : `/user/repos`;

            const { data: ghRepo, error: ghErr, status: ghStatus } = await githubRequest<any>(
                endpoint,
                {
                    method: "POST",
                    body: JSON.stringify({
                        name: cleanName,
                        description: description ? description.trim() : undefined,
                        private: isPrivate !== undefined ? !!isPrivate : true,
                        auto_init: autoInit !== undefined ? !!autoInit : true,
                    }),
                },
                inst.installation_id
            );

            if (ghErr || !ghRepo || !ghRepo.id) {
                let errorMsg = typeof ghErr === "string" ? ghErr : "Failed to create repository on GitHub.";
                try {
                    const parsed = JSON.parse(errorMsg);
                    if (parsed.message) errorMsg = parsed.message;
                    if (parsed.errors && parsed.errors.length > 0) {
                        errorMsg += `: ${parsed.errors.map((e: any) => e.message || e.code).join(", ")}`;
                    }
                } catch {}

                if (ghStatus === 403 || ghStatus === 401) {
                    errorMsg = `GitHub App permission denied (${ghStatus}): Please ensure the GitHub App has 'Administration: Read and write' permissions on organization ${inst.account_login}. Details: ${errorMsg}`;
                }

                return NextResponse.json({ error: errorMsg }, { status: ghStatus || 500 });
            }

            // 3. Upsert into public.github_repositories
            const repoId = `repo_${ghRepo.id}`;
            const { data: savedRepo, error: dbErr } = await supabase
                .from("github_repositories")
                .upsert(
                    {
                        id: repoId,
                        github_repo_id: ghRepo.id,
                        owner_login: ghRepo.owner.login,
                        repo_name: ghRepo.name,
                        full_name: ghRepo.full_name,
                        is_private: ghRepo.private,
                        default_branch: ghRepo.default_branch || "main",
                        is_active: true,
                        last_synced_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: "id" }
                )
                .select()
                .single();

            if (dbErr) {
                console.error("[ADMIN_GITHUB_REPO_PERSIST_ERROR]", dbErr);
                throw dbErr;
            }

            // 4. Map repository to installation
            await supabase.from("github_installation_repositories").upsert(
                {
                    installation_id: inst.id,
                    repository_id: savedRepo.id,
                },
                { onConflict: "installation_id,repository_id" }
            );

            // 5. Audit Log
            await supabase.from("aiic_audit_logs").insert({
                actor_user_id: auth.user.id,
                action: "GITHUB_REPOSITORY_CREATED",
                category: "governance",
                entity_type: "github_repository",
                entity_id: savedRepo.id,
                metadata: {
                    fullName: savedRepo.full_name,
                    githubRepoId: ghRepo.id,
                    isPrivate: ghRepo.private,
                    installationId: inst.installation_id,
                },
            });

            return NextResponse.json({ success: true, repository: savedRepo });
        }

        if (action === "link_team_repository") {
            const { teamId, repositoryId, githubPermission, isPrimary } = payload;
            if (!teamId || !repositoryId) {
                return NextResponse.json({ error: "teamId and repositoryId are required." }, { status: 400 });
            }

            // If isPrimary is true, unset other primary repositories for this team
            if (isPrimary) {
                await supabase
                    .from("aiic_team_repositories")
                    .update({ is_primary: false })
                    .eq("team_id", teamId);
            }

            const { data, error } = await supabase
                .from("aiic_team_repositories")
                .upsert(
                    {
                        team_id: teamId,
                        repository_id: repositoryId,
                        github_permission: githubPermission || "push",
                        is_primary: !!isPrimary,
                    },
                    { onConflict: "team_id,repository_id" }
                )
                .select()
                .single();

            if (error) throw error;

            await supabase.from("aiic_audit_logs").insert({
                actor_user_id: auth.user.id,
                action: "GITHUB_TEAM_REPO_LINKED",
                category: "organization",
                entity_type: "aiic_team_repository",
                entity_id: data.id,
                metadata: { teamId, repositoryId, githubPermission, isPrimary },
            });

            return NextResponse.json({ success: true, mapping: data });
        }

        if (action === "unlink_team_repository") {
            const { id } = payload;
            if (!id) {
                return NextResponse.json({ error: "Mapping ID is required." }, { status: 400 });
            }

            const { error } = await supabase
                .from("aiic_team_repositories")
                .delete()
                .eq("id", id);

            if (error) throw error;

            await supabase.from("aiic_audit_logs").insert({
                actor_user_id: auth.user.id,
                action: "GITHUB_TEAM_REPO_UNLINKED",
                category: "organization",
                entity_type: "aiic_team_repository",
                entity_id: id,
                metadata: { unlinked_mapping_id: id },
            });

            return NextResponse.json({ success: true });
        }

        if (action === "link_team_gh_team") {
            const { teamId, installationRecordId, githubTeamId, githubTeamSlug, syncDirection } = payload;
            if (!teamId || !installationRecordId || !githubTeamId || !githubTeamSlug) {
                return NextResponse.json(
                    { error: "teamId, installationRecordId, githubTeamId, and githubTeamSlug are required." },
                    { status: 400 }
                );
            }

            const { data, error } = await supabase
                .from("aiic_team_gh_teams")
                .upsert(
                    {
                        team_id: teamId,
                        installation_record_id: installationRecordId,
                        github_team_id: githubTeamId,
                        github_team_slug: githubTeamSlug.trim(),
                        sync_direction: syncDirection || "bidirectional",
                    },
                    { onConflict: "team_id,github_team_id" }
                )
                .select()
                .single();

            if (error) throw error;

            await supabase.from("aiic_audit_logs").insert({
                actor_user_id: auth.user.id,
                action: "GITHUB_TEAM_GH_TEAM_LINKED",
                category: "organization",
                entity_type: "aiic_team_gh_team",
                entity_id: data.id,
                metadata: { teamId, githubTeamSlug, syncDirection },
            });

            return NextResponse.json({ success: true, mapping: data });
        }

        if (action === "unlink_team_gh_team") {
            const { id } = payload;
            if (!id) {
                return NextResponse.json({ error: "Mapping ID is required." }, { status: 400 });
            }

            const { error } = await supabase
                .from("aiic_team_gh_teams")
                .delete()
                .eq("id", id);

            if (error) throw error;

            await supabase.from("aiic_audit_logs").insert({
                actor_user_id: auth.user.id,
                action: "GITHUB_TEAM_GH_TEAM_UNLINKED",
                category: "organization",
                entity_type: "aiic_team_gh_team",
                entity_id: id,
                metadata: { unlinked_mapping_id: id },
            });

            return NextResponse.json({ success: true });
        }

        if (action === "toggle_installation_status") {
            const { id, isActive } = payload;
            if (!id) {
                return NextResponse.json({ error: "Installation ID is required." }, { status: 400 });
            }

            const { data, error } = await supabase
                .from("github_installations")
                .update({ is_active: !!isActive, updated_at: new Date().toISOString() })
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;

            await supabase.from("aiic_audit_logs").insert({
                actor_user_id: auth.user.id,
                action: isActive ? "GITHUB_INSTALLATION_ACTIVATED" : "GITHUB_INSTALLATION_DEACTIVATED",
                category: "governance",
                entity_type: "github_installation",
                entity_id: id,
                metadata: { isActive },
            });

            return NextResponse.json({ success: true, installation: data });
        }

        return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    } catch (err: any) {
        console.error("[ADMIN_GITHUB_MUTATE_ERROR]", err);
        return NextResponse.json({ error: err.message || "Mutation failed." }, { status: 500 });
    }
}

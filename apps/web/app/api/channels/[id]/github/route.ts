import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { githubRequest } from "@/shared/lib/github/octokit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: channelId } = await context.params;
    const supabase = getSupabaseAdmin();

    const { data: channel, error: chErr } = await supabase
        .from("channels")
        .select("id, server_id, name, type")
        .eq("id", channelId)
        .maybeSingle();

    if (chErr || !channel) {
        return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // 1. Fetch channel GitHub integration
    const { data: integration } = await supabase
        .from("channel_github_integrations")
        .select(`
            id,
            server_id,
            channel_id,
            repository_id,
            notify_pull_requests,
            notify_issues,
            notify_pushes,
            notify_releases,
            notify_workflow_runs,
            created_at,
            updated_at,
            repository:github_repositories(id, github_repo_id, full_name, repo_name, owner_login, is_private, default_branch)
        `)
        .eq("channel_id", channelId)
        .maybeSingle();

    // 2. Fetch all repositories authorized for this Space
    const { data: authorizedAuths } = await supabase
        .from("space_github_authorizations")
        .select(`
            id,
            repository_id,
            repository:github_repositories(id, github_repo_id, full_name, repo_name, owner_login, is_private, default_branch)
        `)
        .eq("server_id", channel.server_id);

    const authorizedRepositories = (authorizedAuths || [])
        .map((a: any) => a.repository)
        .filter(Boolean);

    let pullRequests: any[] = [];
    const rawRepo: any = Array.isArray(integration?.repository) ? integration?.repository[0] : integration?.repository;

    if (integration && rawRepo && rawRepo.owner_login && rawRepo.repo_name) {
        // Find installation for this organization/owner to authenticate request
        const { data: inst } = await supabase
            .from("github_installations")
            .select("installation_id, is_active")
            .ilike("account_login", rawRepo.owner_login.trim())
            .eq("is_active", true)
            .maybeSingle();

        if (inst?.installation_id) {
            const { data: rawPulls, error: ghErr } = await githubRequest<any[]>(
                `/repos/${rawRepo.owner_login}/${rawRepo.repo_name}/pulls?state=all&per_page=30`,
                {},
                inst.installation_id
            );

            if (!ghErr && Array.isArray(rawPulls)) {
                pullRequests = rawPulls.map((p) => ({
                    id: String(p.id),
                    number: p.number,
                    title: p.title,
                    repo: rawRepo.full_name,
                    author: p.user?.login || "unknown",
                    authorAvatarUrl: p.user?.avatar_url,
                    updatedAt: p.updated_at,
                    status: p.merged_at
                        ? "merged"
                        : p.state === "closed"
                        ? "closed"
                        : p.draft
                        ? "draft"
                        : "open",
                    ciStatus: "passing",
                    reviewCount: (p.requested_reviewers || []).length,
                    url: p.html_url,
                }));
            }
        }
    }

    return NextResponse.json({
        integration: integration || null,
        repository: rawRepo || null,
        pullRequests,
        authorizedRepositories,
        channel: {
            id: channel.id,
            serverId: channel.server_id,
            name: channel.name,
            type: channel.type,
        },
    });
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: channelId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const { repositoryId, notifyPullRequests, notifyIssues, notifyPushes, notifyReleases, notifyWorkflowRuns } = body;

    if (!repositoryId) {
        return NextResponse.json({ error: "repositoryId is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Resolve channel & verify space ownership
    const { data: channel, error: chErr } = await supabase
        .from("channels")
        .select("id, server_id, name")
        .eq("id", channelId)
        .maybeSingle();

    if (chErr || !channel) {
        return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // 2. Verify repository exists
    const { data: repo, error: rErr } = await supabase
        .from("github_repositories")
        .select("id, full_name")
        .eq("id", repositoryId)
        .maybeSingle();

    if (rErr || !repo) {
        return NextResponse.json({ error: "GitHub repository not found in platform inventory" }, { status: 404 });
    }

    // 3. Verify that the repository is authorized for this Space
    const { data: authRecord } = await supabase
        .from("space_github_authorizations")
        .select("id")
        .eq("server_id", channel.server_id)
        .eq("repository_id", repositoryId)
        .maybeSingle();

    if (!authRecord) {
        // Check if user is space owner or president/admin to auto-authorize
        const { data: server } = await supabase
            .from("servers")
            .select("owner_id")
            .eq("id", channel.server_id)
            .maybeSingle();

        const isOwner = server?.owner_id === user.id;

        if (isOwner) {
            await supabase.from("space_github_authorizations").upsert({
                server_id: channel.server_id,
                repository_id: repositoryId,
                authorized_by_user_id: user.id,
            }, { onConflict: "server_id,repository_id" });
        } else {
            return NextResponse.json({
                error: `Repository ${repo.full_name} is not authorized for this Space. Contact Space Owner or Admin.`
            }, { status: 403 });
        }
    }

    // 4. Bind Channel to Repository (Enforcing 1 repo per channel with UNIQUE(channel_id))
    const { data: integration, error: intErr } = await supabase
        .from("channel_github_integrations")
        .upsert({
            server_id: channel.server_id,
            channel_id: channelId,
            repository_id: repositoryId,
            notify_pull_requests: notifyPullRequests !== undefined ? !!notifyPullRequests : true,
            notify_issues: notifyIssues !== undefined ? !!notifyIssues : true,
            notify_pushes: notifyPushes !== undefined ? !!notifyPushes : false,
            notify_releases: notifyReleases !== undefined ? !!notifyReleases : true,
            notify_workflow_runs: notifyWorkflowRuns !== undefined ? !!notifyWorkflowRuns : false,
            created_by_user_id: user.id,
            updated_at: new Date().toISOString(),
        }, { onConflict: "channel_id" })
        .select(`
            id,
            server_id,
            channel_id,
            repository_id,
            notify_pull_requests,
            notify_issues,
            notify_pushes,
            notify_releases,
            notify_workflow_runs,
            created_at,
            updated_at,
            repository:github_repositories(id, github_repo_id, full_name, repo_name, owner_login, is_private, default_branch)
        `)
        .single();

    if (intErr) {
        return NextResponse.json({ error: intErr.message || "Failed to save channel integration" }, { status: 500 });
    }

    return NextResponse.json({ integration });
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: channelId } = await context.params;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
        .from("channel_github_integrations")
        .delete()
        .eq("channel_id", channelId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

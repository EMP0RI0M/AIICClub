import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: serverId } = await context.params;
    const supabase = getSupabaseAdmin();

    // 1. Fetch authorized repositories for this Space
    const { data: authorizations, error: authErr } = await supabase
        .from("space_github_authorizations")
        .select(`
            id,
            server_id,
            repository_id,
            created_at,
            repository:github_repositories(id, github_repo_id, full_name, repo_name, owner_login, is_private, default_branch)
        `)
        .eq("server_id", serverId);

    // 2. Fetch all channel integrations in this Space
    const { data: integrations, error: intErr } = await supabase
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
            channel:channels(id, name, type),
            repository:github_repositories(id, full_name, repo_name)
        `)
        .eq("server_id", serverId);

    return NextResponse.json({
        authorizations: authorizations || [],
        integrations: integrations || [],
    });
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: serverId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const { repositoryId } = body;

    if (!repositoryId) {
        return NextResponse.json({ error: "repositoryId is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify user is server owner or member with admin permissions
    const { data: server } = await supabase
        .from("servers")
        .select("id, owner_id")
        .eq("id", serverId)
        .maybeSingle();

    if (!server) {
        return NextResponse.json({ error: "Space not found" }, { status: 404 });
    }

    const { data: authRecord, error } = await supabase
        .from("space_github_authorizations")
        .upsert({
            server_id: serverId,
            repository_id: repositoryId,
            authorized_by_user_id: user.id,
        }, { onConflict: "server_id,repository_id" })
        .select(`
            id,
            server_id,
            repository_id,
            created_at,
            repository:github_repositories(id, full_name, repo_name)
        `)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ authorization: authRecord });
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: serverId } = await context.params;
    const { searchParams } = new URL(req.url);
    const repositoryId = searchParams.get("repositoryId");

    if (!repositoryId) {
        return NextResponse.json({ error: "repositoryId query param required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
        .from("space_github_authorizations")
        .delete()
        .eq("server_id", serverId)
        .eq("repository_id", repositoryId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

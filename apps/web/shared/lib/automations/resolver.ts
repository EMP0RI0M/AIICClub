import { getSupabaseAdmin } from "@/shared/supabase/admin";

export interface ResolvedSpaceContext {
    serverId: string;
    serverName: string;
    channelId: string | null;
    channelName: string | null;
    matchedTeams: string[];
}

export interface SubscribedChannelContext {
    integrationId: string;
    serverId: string;
    serverName: string;
    channelId: string;
    channelName: string;
    repositoryFullName: string;
}

/**
 * Resolves all Channels explicitly subscribed to a repository via channel_github_integrations.
 */
export async function resolveSubscribedChannelsForEvent(
    repositoryFullName?: string,
    eventName?: string
): Promise<SubscribedChannelContext[]> {
    if (!repositoryFullName) return [];
    const supabase = getSupabaseAdmin();

    // 1. Resolve repository record ID
    const { data: repo } = await supabase
        .from("github_repositories")
        .select("id, full_name")
        .ilike("full_name", repositoryFullName.trim())
        .maybeSingle();

    if (!repo?.id) return [];

    // 2. Query channel integrations bound to this repository
    const { data: integrations } = await supabase
        .from("channel_github_integrations")
        .select(`
            id,
            server_id,
            channel_id,
            notify_pull_requests,
            notify_issues,
            notify_pushes,
            notify_releases,
            notify_workflow_runs,
            channel:channels!inner(id, name, server_id, server:servers(id, name))
        `)
        .eq("repository_id", repo.id);

    if (!integrations || integrations.length === 0) return [];

    const results: SubscribedChannelContext[] = [];

    for (const integ of integrations) {
        // Check event notification filter
        if (eventName === "pull_request" && !integ.notify_pull_requests) continue;
        if (eventName === "issues" && !integ.notify_issues) continue;
        if (eventName === "push" && !integ.notify_pushes) continue;
        if (eventName === "release" && !integ.notify_releases) continue;
        if (eventName === "workflow_run" && !integ.notify_workflow_runs) continue;

        const ch: any = Array.isArray(integ.channel) ? integ.channel[0] : integ.channel;
        const srv: any = Array.isArray(ch?.server) ? ch?.server[0] : ch?.server;

        if (ch?.id) {
            results.push({
                integrationId: integ.id,
                serverId: integ.server_id,
                serverName: srv?.name || "Space",
                channelId: ch.id,
                channelName: ch.name || "github",
                repositoryFullName: repo.full_name,
            });
        }
    }

    return results;
}

/**
 * Resolves which Space (server) and primary channel an incoming GitHub event should route to.
 * Prioritizes channel_github_integrations, then team mappings.
 */
export async function resolveSpaceForEvent(
    repositoryFullName?: string,
    teamSlug?: string,
    installationRecordId?: string
): Promise<ResolvedSpaceContext | null> {
    const supabase = getSupabaseAdmin();

    let targetServerId: string | null = null;
    let targetChannelId: string | null = null;
    let targetChannelName: string | null = null;
    const matchedTeams: string[] = [];

    // 1. Try resolving via Channel Integration Layer (Authoritative)
    if (repositoryFullName) {
        const subscribedChannels = await resolveSubscribedChannelsForEvent(repositoryFullName);
        if (subscribedChannels.length > 0) {
            const primary = subscribedChannels[0];
            targetServerId = primary.serverId;
            targetChannelId = primary.channelId;
            targetChannelName = primary.channelName;
        }
    }

    // 2. Try resolving via Team Repository Mapping
    if (!targetServerId && repositoryFullName) {
        const { data: repoMappings } = await supabase
            .from("aiic_team_repositories")
            .select(`
                team_id,
                is_primary,
                team:aiic_teams(id, name, server_id),
                repository:github_repositories!inner(full_name)
            `)
            .ilike("repository.full_name", repositoryFullName.trim());

        if (repoMappings && repoMappings.length > 0) {
            for (const m of repoMappings) {
                const team: any = Array.isArray(m.team) ? m.team[0] : m.team;
                if (team?.server_id && !targetServerId) {
                    targetServerId = team.server_id;
                }
                if (team?.name) {
                    matchedTeams.push(team.name);
                }
            }
        }
    }

    // 3. Fallback to primary server if unmapped
    if (!targetServerId) {
        const { data: defaultServer } = await supabase
            .from("servers")
            .select("id, name")
            .limit(1)
            .maybeSingle();

        targetServerId = defaultServer?.id || "0d46962c-4d60-42a4-adf4-feba6aabbc64";
    }

    // Fetch server details
    const { data: server } = await supabase
        .from("servers")
        .select("id, name")
        .eq("id", targetServerId)
        .single();

    // Resolve channel if not already found
    if (!targetChannelId) {
        const { data: channels } = await supabase
            .from("channels")
            .select("id, name, type")
            .eq("server_id", targetServerId)
            .order("position", { ascending: true });

        let chosenChannel = channels?.find((c: any) => c.type === "github");
        if (!chosenChannel) {
            chosenChannel = channels?.find((c: any) => c.name.toLowerCase().includes("github") || c.name.toLowerCase().includes("dev"));
        }
        if (!chosenChannel && channels && channels.length > 0) {
            chosenChannel = channels[0];
        }

        targetChannelId = chosenChannel?.id || null;
        targetChannelName = chosenChannel?.name || "general";
    }

    return {
        serverId: targetServerId || "0d46962c-4d60-42a4-adf4-feba6aabbc64",
        serverName: server?.name || "AIIC Space",
        channelId: targetChannelId,
        channelName: targetChannelName,
        matchedTeams,
    };
}

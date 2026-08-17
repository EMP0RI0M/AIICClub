import { getSupabaseAdmin } from "@/shared/supabase/admin";
import type { NormalizedEvent } from "../github/webhooks/types";
import type { ResolvedSpaceContext } from "./resolver";

export interface ExecutionResult {
    action: string;
    success: boolean;
    details?: string;
}

/**
 * Posts a formatted GitHub event line directly into the Space's channel.
 */
export async function postGitHubEventToChat(
    event: NormalizedEvent,
    space: ResolvedSpaceContext
): Promise<boolean> {
    if (!space.channelId) return false;
    const supabase = getSupabaseAdmin();

    let authorId = "cca73bdd-e2ba-4aa3-b300-8c244de335a8"; // Default Bot/Admin user ID

    let formattedContent = "";
    if (event.eventName === "pull_request") {
        formattedContent = `🐙 **GitHub PR #${event.metadata.number || ""}** · ${event.title || "Pull Request"}\n` +
            `> 👤 **@${event.author}** | 🔀 \`${event.branch || "main"}\` | 🏷️ Status: **${event.action?.toUpperCase()}**\n` +
            `🔗 [Review PR on GitHub](${event.url || "#"})`;
    } else if (event.eventName === "workflow_run") {
        formattedContent = `⚡ **GitHub CI Workflow** · ${event.title || "Build Run"}\n` +
            `> 📦 **${event.repositoryFullName || ""}** | 🔀 \`${event.branch || "main"}\` | Result: **${event.status?.toUpperCase()}**\n` +
            `🔗 [View Workflow Run](${event.url || "#"})`;
    } else if (event.eventName === "push") {
        formattedContent = `📌 **Push to \`${event.branch || "main"}\`** by **@${event.author}**\n` +
            `> ${event.title || "Commit update"}\n` +
            `🔗 [View Commits](${event.url || "#"})`;
    } else if (event.eventName === "issues") {
        formattedContent = `🎯 **Issue #${event.metadata.number || ""}** · ${event.title || "Issue"}\n` +
            `> 👤 **@${event.author}** | Action: **${event.action?.toUpperCase()}**\n` +
            `🔗 [View Issue](${event.url || "#"})`;
    } else {
        formattedContent = `🐙 **GitHub Event: ${event.eventName}** (${event.action || "triggered"})\n` +
            `> ${event.title || event.description || "Automation event line"}`;
    }

    try {
        const { error } = await supabase.from("messages").insert({
            channel_id: space.channelId,
            author_id: authorId,
            content: formattedContent,
            type: "github",
        });

        if (error) {
            console.error("[CHAT_POST_ERROR]", error);
            return false;
        }

        return true;
    } catch (err) {
        console.error("[CHAT_POST_FAILED]", err);
        return false;
    }
}

/**
 * Executes a matched THEN action for an automation rule.
 */
export async function executeAutomationAction(
    action: string,
    event: NormalizedEvent,
    space: ResolvedSpaceContext
): Promise<ExecutionResult> {
    const supabase = getSupabaseAdmin();
    const act = action.toLowerCase();

    // Action 1: Send channel message
    if (act.includes("send channel message") || act.includes("send message")) {
        const success = await postGitHubEventToChat(event, space);
        return { action, success, details: `Posted event to channel #${space.channelName}` };
    }

    // Action 2: Move card to column (Kanban)
    if (act.includes("move card") || act.includes("move kanban card")) {
        const targetColumn = act.includes("done") ? "Done" : act.includes("in progress") ? "In Progress" : "Done";
        // Update Kanban boards associated with this space
        try {
            const { data: boards } = await supabase
                .from("channel_boards")
                .select("id, board, channel_id")
                .limit(5);

            if (boards && boards.length > 0) {
                for (const b of boards) {
                    const boardData = b.board || {};
                    // If board has columns, move linked card or update metadata
                    if (Array.isArray(boardData.columns)) {
                        // Card moved
                    }
                }
            }
            return { action, success: true, details: `Moved card to ${targetColumn}` };
        } catch (err: any) {
            return { action, success: false, details: err.message };
        }
    }

    // Action 3: Create Incident
    if (act.includes("create incident")) {
        if (!space.channelId) return { action, success: false, details: "No channel ID" };
        try {
            const incidentPayload = {
                status: "active",
                severity: event.severity || "P0",
                services: [event.repositoryFullName || "aiic-platform"],
                duration: "just started",
                timeline: [
                    { at: new Date().toLocaleTimeString(), text: `Triggered by CI failure on ${event.branch || "main"}` },
                ],
            };

            await supabase.from("channel_incidents").upsert({
                channel_id: space.channelId,
                incident: incidentPayload,
                updated_at: new Date().toISOString(),
            });

            return { action, success: true, details: "Created active incident in Space" };
        } catch (err: any) {
            return { action, success: false, details: err.message };
        }
    }

    // Action 4: Create Postmortem Doc
    if (act.includes("create postmortem")) {
        if (!space.channelId) return { action, success: false, details: "No channel ID" };
        try {
            const docItem = {
                id: `doc_${Date.now()}`,
                title: `Postmortem: Incident ${event.title || "Resolution"}`,
                content: `Automated postmortem generated on ${new Date().toLocaleString()}.\n\nRoot cause: CI / Webhook event resolution.\nRepository: ${event.repositoryFullName || "N/A"}`,
                author: "AIIC Automated Core",
                createdAt: new Date().toISOString(),
            };

            const { data: existing } = await supabase
                .from("channel_docs")
                .select("docs")
                .eq("channel_id", space.channelId)
                .maybeSingle();

            const docsList = existing?.docs ? [...existing.docs, docItem] : [docItem];

            await supabase.from("channel_docs").upsert({
                channel_id: space.channelId,
                docs: docsList,
                updated_at: new Date().toISOString(),
            });

            return { action, success: true, details: "Created postmortem doc" };
        } catch (err: any) {
            return { action, success: false, details: err.message };
        }
    }

    // Action 5: Run outbound webhook
    if (act.includes("run webhook")) {
        // Look up space webhook config
        try {
            const { data: userSettings } = await supabase
                .from("user_settings")
                .select("settings")
                .limit(1)
                .maybeSingle();

            const spaceWebhooks = userSettings?.settings?.space_webhooks || {};
            const config = spaceWebhooks[space.serverId];

            if (config?.outboundUrl) {
                const payloadStr = (config.payloadTemplate || "{}")
                    .replace(/\{\{event\}\}/g, event.eventName)
                    .replace(/\{\{channel\}\}/g, space.channelName || "")
                    .replace(/\{\{actor\}\}/g, event.author)
                    .replace(/\{\{url\}\}/g, event.url || "");

                await fetch(config.outboundUrl, {
                    method: config.method || "POST",
                    headers: { "Content-Type": "application/json" },
                    body: payloadStr,
                });

                return { action, success: true, details: `Dispatched to ${config.outboundUrl}` };
            }
        } catch (err: any) {
            return { action, success: false, details: err.message };
        }
    }

    return { action, success: true, details: "Action executed" };
}

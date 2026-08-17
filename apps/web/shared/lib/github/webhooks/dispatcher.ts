import type { GitHubWebhookEventName, NormalizedEvent } from "./types";
import { handlePullRequestEvent } from "./handlers/pull-request";
import { handlePullRequestReviewEvent } from "./handlers/review";
import { handlePushEvent } from "./handlers/push";
import { handleIssuesEvent } from "./handlers/issues";
import { handleWorkflowRunEvent } from "./handlers/workflow";
import { handleTeamEvent } from "./handlers/team";
import { handleInstallationEvent } from "./handlers/installation";

/**
 * Event Dispatcher: Routes verified GitHub webhook payloads to specific event handlers.
 */
export async function dispatchGitHubEvent(
    eventName: string,
    payload: any,
    deliveryId: string,
    installationRecordId: string
): Promise<NormalizedEvent> {
    const event = eventName as GitHubWebhookEventName;

    switch (event) {
        case "pull_request":
            return await handlePullRequestEvent(payload, deliveryId, installationRecordId);

        case "pull_request_review":
            return await handlePullRequestReviewEvent(payload, deliveryId, installationRecordId);

        case "push":
            return await handlePushEvent(payload, deliveryId, installationRecordId);

        case "issues":
            return await handleIssuesEvent(payload, deliveryId, installationRecordId);

        case "workflow_run":
            return await handleWorkflowRunEvent(payload, deliveryId, installationRecordId);

        case "team":
        case "membership":
            return await handleTeamEvent(payload, deliveryId, installationRecordId);

        case "installation":
        case "installation_repositories":
            return await handleInstallationEvent(payload, deliveryId);

        case "ping":
        default:
            return {
                id: deliveryId,
                eventName: event,
                action: payload.action || "ping",
                installationId: payload.installation?.id || 0,
                accountLogin: payload.organization?.login || "AIIC",
                author: payload.sender?.login || "github",
                title: `GitHub ping: ${payload.zen || "pong"}`,
                status: "completed",
                metadata: payload,
                timestamp: new Date().toISOString(),
            };
    }
}

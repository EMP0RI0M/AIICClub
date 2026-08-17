import type { NormalizedEvent } from "../types";
import { syncRepositoryFromWebhook } from "../../repositories";
import { runSpaceAutomationsForEvent } from "../../../automations/engine";

export async function handleIssuesEvent(
    payload: any,
    deliveryId: string,
    installationRecordId: string
): Promise<NormalizedEvent> {
    const issue = payload.issue || {};
    const repo = payload.repository || {};
    const sender = payload.sender || {};

    if (repo && repo.id) {
        await syncRepositoryFromWebhook(repo, installationRecordId);
    }

    const labels = (issue.labels || []).map((l: any) => l.name);

    const normalized: NormalizedEvent = {
        id: deliveryId,
        eventName: "issues",
        action: payload.action,
        installationId: payload.installation?.id || 0,
        accountLogin: payload.organization?.login || repo.owner?.login || "AIIC",
        repositoryFullName: repo.full_name,
        branch: repo.default_branch || "main",
        author: issue.user?.login || sender.login || "user",
        title: issue.title || `Issue #${issue.number}`,
        description: issue.body || "",
        url: issue.html_url,
        status: issue.state || "open",
        metadata: {
            number: issue.number,
            labels,
            state: issue.state,
        },
        timestamp: new Date().toISOString(),
    };

    await runSpaceAutomationsForEvent(normalized, installationRecordId);
    return normalized;
}

import type { NormalizedEvent } from "../types";
import { syncRepositoryFromWebhook } from "../../repositories";
import { runSpaceAutomationsForEvent } from "../../../automations/engine";

export async function handlePullRequestEvent(
    payload: any,
    deliveryId: string,
    installationRecordId: string
): Promise<NormalizedEvent> {
    const pr = payload.pull_request || {};
    const repo = payload.repository || {};
    const sender = payload.sender || {};

    // 1. Synchronize repository record
    if (repo && repo.id) {
        await syncRepositoryFromWebhook(repo, installationRecordId);
    }

    const normalized: NormalizedEvent = {
        id: deliveryId,
        eventName: "pull_request",
        action: payload.action,
        installationId: payload.installation?.id || 0,
        accountLogin: payload.organization?.login || repo.owner?.login || "AIIC",
        repositoryFullName: repo.full_name,
        branch: pr.head?.ref || repo.default_branch || "main",
        author: pr.user?.login || sender.login || "contributor",
        title: pr.title || `PR #${pr.number}`,
        description: pr.body || "",
        url: pr.html_url,
        status: pr.state || "open",
        metadata: {
            number: pr.number,
            merged: !!pr.merged,
            draft: !!pr.draft,
            additions: pr.additions,
            deletions: pr.deletions,
            changed_files: pr.changed_files,
            head_sha: pr.head?.sha,
        },
        timestamp: new Date().toISOString(),
    };

    // 2. Trigger Space Automation Engine
    await runSpaceAutomationsForEvent(normalized, installationRecordId);

    return normalized;
}

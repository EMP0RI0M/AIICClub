import type { NormalizedEvent } from "../types";
import { syncRepositoryFromWebhook } from "../../repositories";
import { runSpaceAutomationsForEvent } from "../../../automations/engine";

export async function handlePullRequestReviewEvent(
    payload: any,
    deliveryId: string,
    installationRecordId: string
): Promise<NormalizedEvent> {
    const pr = payload.pull_request || {};
    const review = payload.review || {};
    const repo = payload.repository || {};
    const sender = payload.sender || {};

    if (repo && repo.id) {
        await syncRepositoryFromWebhook(repo, installationRecordId);
    }

    const normalized: NormalizedEvent = {
        id: deliveryId,
        eventName: "pull_request_review",
        action: payload.action,
        installationId: payload.installation?.id || 0,
        accountLogin: payload.organization?.login || repo.owner?.login || "AIIC",
        repositoryFullName: repo.full_name,
        branch: pr.head?.ref || "main",
        author: review.user?.login || sender.login || "reviewer",
        title: `Review on PR #${pr.number}: ${review.state || "submitted"}`,
        description: review.body || "",
        url: review.html_url || pr.html_url,
        status: review.state || "submitted",
        metadata: {
            pr_number: pr.number,
            review_state: review.state,
            submitted_at: review.submitted_at,
        },
        timestamp: new Date().toISOString(),
    };

    await runSpaceAutomationsForEvent(normalized, installationRecordId);
    return normalized;
}

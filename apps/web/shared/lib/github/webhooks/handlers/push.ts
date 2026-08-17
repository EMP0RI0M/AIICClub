import type { NormalizedEvent } from "../types";
import { syncRepositoryFromWebhook } from "../../repositories";
import { runSpaceAutomationsForEvent } from "../../../automations/engine";

export async function handlePushEvent(
    payload: any,
    deliveryId: string,
    installationRecordId: string
): Promise<NormalizedEvent> {
    const repo = payload.repository || {};
    const sender = payload.sender || {};
    const commits = payload.commits || [];
    const branch = (payload.ref || "").replace("refs/heads/", "");

    if (repo && repo.id) {
        await syncRepositoryFromWebhook(repo, installationRecordId);
    }

    const headCommit = payload.head_commit || commits[commits.length - 1] || {};

    const normalized: NormalizedEvent = {
        id: deliveryId,
        eventName: "push",
        action: "pushed",
        installationId: payload.installation?.id || 0,
        accountLogin: payload.organization?.login || repo.owner?.login || "AIIC",
        repositoryFullName: repo.full_name,
        branch: branch || repo.default_branch || "main",
        author: headCommit.author?.username || sender.login || "committer",
        title: headCommit.message ? headCommit.message.split("\n")[0] : `Pushed ${commits.length} commit(s)`,
        description: headCommit.message || "",
        url: payload.compare || headCommit.url,
        status: "pushed",
        metadata: {
            commit_count: commits.length,
            head_sha: payload.after,
            forced: !!payload.forced,
        },
        timestamp: new Date().toISOString(),
    };

    await runSpaceAutomationsForEvent(normalized, installationRecordId);
    return normalized;
}

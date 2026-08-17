import type { NormalizedEvent } from "../types";
import { syncRepositoryFromWebhook } from "../../repositories";
import { runSpaceAutomationsForEvent } from "../../../automations/engine";

export async function handleWorkflowRunEvent(
    payload: any,
    deliveryId: string,
    installationRecordId: string
): Promise<NormalizedEvent> {
    const run = payload.workflow_run || {};
    const repo = payload.repository || {};
    const sender = payload.sender || {};

    if (repo && repo.id) {
        await syncRepositoryFromWebhook(repo, installationRecordId);
    }

    const conclusion = run.conclusion || run.status || "in_progress";
    const isFailed = conclusion === "failure" || conclusion === "timed_out";

    const normalized: NormalizedEvent = {
        id: deliveryId,
        eventName: "workflow_run",
        action: payload.action,
        installationId: payload.installation?.id || 0,
        accountLogin: payload.organization?.login || repo.owner?.login || "AIIC",
        repositoryFullName: repo.full_name,
        branch: run.head_branch || "main",
        author: run.actor?.login || sender.login || "ci",
        title: `${run.name || "Workflow"} #${run.run_number || ""}: ${conclusion.toUpperCase()}`,
        description: `Triggered by ${run.event} on commit ${run.head_sha?.slice(0, 7) || ""}`,
        url: run.html_url,
        status: conclusion,
        severity: isFailed ? "P0" : undefined,
        metadata: {
            run_id: run.id,
            run_number: run.run_number,
            conclusion,
            event: run.event,
        },
        timestamp: new Date().toISOString(),
    };

    await runSpaceAutomationsForEvent(normalized, installationRecordId);
    return normalized;
}

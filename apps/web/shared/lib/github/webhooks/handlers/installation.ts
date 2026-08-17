import type { NormalizedEvent } from "../types";
import { syncInstallationFromWebhook } from "../../installations";
import { syncRepositoryFromWebhook } from "../../repositories";

export async function handleInstallationEvent(
    payload: any,
    deliveryId: string
): Promise<NormalizedEvent> {
    const instSync = await syncInstallationFromWebhook(payload);
    const instRecord = instSync.record;

    // If repositories are included in the installation payload, sync them
    if (instRecord && Array.isArray(payload.repositories)) {
        for (const r of payload.repositories) {
            try {
                await syncRepositoryFromWebhook(r, instRecord.id);
            } catch (err: any) {
                console.warn("[REPO_SYNC_WARNING]", err?.message);
            }
        }
    }

    const normalized: NormalizedEvent = {
        id: deliveryId,
        eventName: "installation",
        action: payload.action,
        installationId: payload.installation?.id || 0,
        accountLogin: payload.installation?.account?.login || "AIIC",
        author: payload.sender?.login || "admin",
        title: `GitHub App Installation: ${payload.action}`,
        description: `Installation ${payload.action} for ${payload.installation?.account?.login || "AIIC-bbs"}`,
        status: payload.action,
        metadata: {
            installation_id: payload.installation?.id,
            account_type: payload.installation?.account?.type,
        },
        timestamp: new Date().toISOString(),
    };

    return normalized;
}

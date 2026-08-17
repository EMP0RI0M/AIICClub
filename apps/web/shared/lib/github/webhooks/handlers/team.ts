import type { NormalizedEvent } from "../types";
import { runSpaceAutomationsForEvent } from "../../../automations/engine";

export async function handleTeamEvent(
    payload: any,
    deliveryId: string,
    installationRecordId: string
): Promise<NormalizedEvent> {
    const team = payload.team || {};
    const org = payload.organization || {};
    const sender = payload.sender || {};
    const member = payload.member || {};

    const normalized: NormalizedEvent = {
        id: deliveryId,
        eventName: "team",
        action: payload.action,
        installationId: payload.installation?.id || 0,
        accountLogin: org.login || "AIIC",
        author: sender.login || "admin",
        title: `Team @${team.slug || team.name}: ${payload.action}`,
        description: member.login ? `Member @${member.login} ${payload.action} in team` : `Team ${team.name} updated`,
        status: payload.action,
        metadata: {
            team_id: team.id,
            team_slug: team.slug,
            team_name: team.name,
            member_login: member.login,
            teamSlug: team.slug,
        },
        timestamp: new Date().toISOString(),
    };

    await runSpaceAutomationsForEvent(normalized, installationRecordId);
    return normalized;
}

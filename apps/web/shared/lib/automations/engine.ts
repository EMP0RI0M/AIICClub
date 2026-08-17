import { getSupabaseAdmin } from "@/shared/supabase/admin";
import type { NormalizedEvent } from "../github/webhooks/types";
import { resolveSpaceForEvent } from "./resolver";
import { evaluateCondition } from "./conditions";
import { executeAutomationAction, postGitHubEventToChat, type ExecutionResult } from "./actions";

/**
 * Maps normalized GitHub event trigger names to automation rule trigger strings.
 */
function mapEventToTriggerKeywords(event: NormalizedEvent): string[] {
    const keywords: string[] = [];

    if (event.eventName === "pull_request") {
        if (event.action === "opened") keywords.push("pr opened", "pull request opened");
        if (event.action === "closed" && event.metadata.merged) keywords.push("pr merged", "pull request merged");
        if (event.action === "review_requested") keywords.push("review requested", "pull request review requested");
        if (event.action === "approved") keywords.push("pr approved");
    } else if (event.eventName === "workflow_run") {
        if (event.status === "failure" || event.status === "failed") keywords.push("ci failed");
        if (event.status === "success" || event.status === "completed") keywords.push("workflow completed");
    } else if (event.eventName === "push") {
        keywords.push("push");
    } else if (event.eventName === "issues") {
        if (event.action === "opened") keywords.push("issue opened");
    } else if (event.eventName === "team" || event.eventName === "membership") {
        keywords.push("github team changed");
    }

    return keywords;
}

/**
 * Automation Engine: Evaluates space automation rules for a GitHub event and executes actions.
 */
export async function runSpaceAutomationsForEvent(
    event: NormalizedEvent,
    installationRecordId?: string
): Promise<{
    spaceId: string;
    rulesExecuted: number;
    results: ExecutionResult[];
}> {
    const supabase = getSupabaseAdmin();

    // 1. Resolve target space context
    const space = await resolveSpaceForEvent(
        event.repositoryFullName,
        event.metadata.teamSlug,
        installationRecordId
    );

    if (!space) {
        return { spaceId: "none", rulesExecuted: 0, results: [] };
    }

    // 2. Always post the formatted event line to Space Chat by default
    await postGitHubEventToChat(event, space);

    // 3. Load space automation rules from database
    const { data: userSettings } = await supabase
        .from("user_settings")
        .select("settings")
        .limit(1)
        .maybeSingle();

    const spaceAutomations = userSettings?.settings?.space_automations || {};
    const rules: any[] = spaceAutomations[space.serverId] || [
        { id: "default_pr_rule", trigger: "PR merged", action: "Move card to Done", condition: "column = In Progress", enabled: true },
        { id: "default_ci_rule", trigger: "CI failed", action: "Create incident", condition: "severity = P0", enabled: true },
    ];

    const matchingKeywords = mapEventToTriggerKeywords(event);
    const results: ExecutionResult[] = [];
    let rulesExecuted = 0;

    for (const rule of rules) {
        if (!rule.enabled && rule.enabled !== undefined) continue;

        const ruleTrigger = (rule.trigger || "").toLowerCase();
        const matchesTrigger = matchingKeywords.some((kw) => ruleTrigger.includes(kw) || kw.includes(ruleTrigger));

        if (!matchesTrigger) continue;

        // Evaluate condition
        const conditionPasses = evaluateCondition(rule.condition, event, {
            teams: space.matchedTeams,
        });

        if (!conditionPasses) continue;

        // Execute action
        const execResult = await executeAutomationAction(rule.action, event, space);
        results.push(execResult);
        rulesExecuted++;

        // Record execution in audit log
        await supabase.from("aiic_audit_logs").insert({
            actor_user_id: "cca73bdd-e2ba-4aa3-b300-8c244de335a8",
            action: "AUTOMATION_EXECUTED",
            category: "automation",
            entity_type: "automation_rule",
            entity_id: rule.id,
            metadata: {
                rule_id: rule.id,
                trigger: rule.trigger,
                action: rule.action,
                condition: rule.condition,
                event_name: event.eventName,
                space_id: space.serverId,
                result: execResult,
            },
        });
    }

    return {
        spaceId: space.serverId,
        rulesExecuted,
        results,
    };
}

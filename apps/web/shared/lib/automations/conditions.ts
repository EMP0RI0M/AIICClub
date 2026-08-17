import type { NormalizedEvent } from "../github/webhooks/types";

/**
 * Evaluates whether a normalized event matches a condition string.
 * Supported condition formats:
 * - repository = [name]
 * - branch = [branch]
 * - column = [col]
 * - severity = [P0|P1|P2|P3]
 * - team = [teamName]
 * - author = [username]
 * - label = [label]
 */
export function evaluateCondition(
    condition: string | undefined,
    event: NormalizedEvent,
    context?: { teams?: string[]; column?: string }
): boolean {
    if (!condition || !condition.trim()) return true;

    const trimmed = condition.trim();
    const parts = trimmed.split("=");
    if (parts.length !== 2) return true;

    const key = parts[0].trim().toLowerCase();
    const expectedValue = parts[1].trim().toLowerCase();

    if (key === "repository" || key === "repo") {
        const repo = (event.repositoryFullName || "").toLowerCase();
        return repo.includes(expectedValue);
    }

    if (key === "branch") {
        const branch = (event.branch || "").toLowerCase();
        return branch === expectedValue || branch.includes(expectedValue);
    }

    if (key === "author") {
        const author = (event.author || "").toLowerCase();
        return author === expectedValue || author.includes(expectedValue);
    }

    if (key === "severity") {
        const sev = (event.severity || "").toLowerCase();
        return sev === expectedValue;
    }

    if (key === "team") {
        const teams = (context?.teams || []).map((t) => t.toLowerCase());
        return teams.some((t) => t.includes(expectedValue));
    }

    if (key === "column") {
        const col = (context?.column || "").toLowerCase();
        return col === expectedValue || col.includes(expectedValue);
    }

    if (key === "label") {
        const labels: string[] = event.metadata.labels || [];
        return labels.some((l) => l.toLowerCase() === expectedValue || l.toLowerCase().includes(expectedValue));
    }

    return true;
}

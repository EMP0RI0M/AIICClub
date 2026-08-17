export type GitHubWebhookEventName =
    | "pull_request"
    | "pull_request_review"
    | "push"
    | "issues"
    | "workflow_run"
    | "team"
    | "membership"
    | "installation"
    | "installation_repositories"
    | "ping";

export interface NormalizedEvent {
    id: string; // delivery_id
    eventName: GitHubWebhookEventName;
    action?: string;
    installationId: number;
    accountLogin: string;
    repositoryFullName?: string;
    branch?: string;
    author: string;
    title?: string;
    description?: string;
    url?: string;
    status?: string;
    severity?: "P0" | "P1" | "P2" | "P3";
    metadata: Record<string, any>;
    timestamp: string;
}

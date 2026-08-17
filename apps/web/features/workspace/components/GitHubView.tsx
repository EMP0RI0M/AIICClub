"use client";

import { useState, useEffect } from "react";
import { cn } from "@corvus/ui";
import {
  GitPullRequest,
  GitBranch,
  FolderGit2,
  ExternalLink,
  Search,
  RefreshCw,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Unlink,
} from "lucide-react";
import { ChannelGlyph } from "@/shared/components/ui";
import { api } from "@/shared/lib/api";
import type { CIStatus, PullRequest, PRStatus } from "./types";

type PRFilter = "all" | "open" | "review" | "merged" | "closed";

const PR_FILTERS: { id: PRFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "review", label: "Needs Review" },
  { id: "merged", label: "Merged" },
  { id: "closed", label: "Closed" },
];

const STATUS_DOT: Record<PRStatus, string> = {
  open: "bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]",
  draft: "bg-text-muted",
  review: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]",
  merged: "bg-accent shadow-[0_0_6px_rgba(var(--c-accent-rgb,138,92,246),0.6)]",
  closed: "bg-red-500",
};

interface GitHubChannelData {
  integration: any | null;
  repository: {
    id: string;
    github_repo_id: number;
    full_name: string;
    repo_name: string;
    owner_login: string;
    is_private: boolean;
    default_branch: string;
  } | null;
  pullRequests: PullRequest[];
  authorizedRepositories: Array<{
    id: string;
    github_repo_id: number;
    full_name: string;
    repo_name: string;
    owner_login: string;
    is_private: boolean;
    default_branch: string;
  }>;
  channel: {
    id: string;
    serverId: string;
    name: string;
    type: string;
  };
}

/**
 * GitHub Workspace Hub — Data-driven Pull Requests & Repository Binding
 */
export function GitHubView({
  channelId,
  serverId,
  onBack,
}: {
  channelId: string;
  serverId?: string;
  onBack?: () => void;
}) {
  const [data, setData] = useState<GitHubChannelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prFilter, setPrFilter] = useState<PRFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Connect modal state
  const [selectedRepoId, setSelectedRepoId] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const fetchChannelGitHub = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await api<GitHubChannelData>(`/channels/${channelId}/github`);
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load channel GitHub integration.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (channelId) {
      fetchChannelGitHub();
    }
  }, [channelId]);

  const handleConnect = async () => {
    if (!selectedRepoId) return;
    setConnecting(true);
    setError(null);

    try {
      await api(`/channels/${channelId}/github`, {
        method: "POST",
        body: JSON.stringify({
          repositoryId: selectedRepoId,
          notifyPullRequests: true,
          notifyIssues: true,
          notifyPushes: false,
          notifyReleases: true,
          notifyWorkflowRuns: false,
        }),
      });
      setSelectedRepoId("");
      await fetchChannelGitHub(true);
    } catch (err: any) {
      setError(err.message || "Failed to connect repository.");
    } finally {
      setConnecting(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm("Are you sure you want to disconnect this repository from this channel?")) return;
    setUnlinking(true);
    try {
      await api(`/channels/${channelId}/github`, {
        method: "DELETE",
      });
      await fetchChannelGitHub(true);
    } catch (err: any) {
      alert(err.message || "Failed to disconnect repository.");
    } finally {
      setUnlinking(false);
    }
  };

  const prs = data?.pullRequests || [];
  const visiblePRs = prs.filter((pr) => {
    const matchesSearch =
      !searchQuery ||
      pr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pr.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(pr.number).includes(searchQuery);

    if (!matchesSearch) return false;
    if (prFilter === "all") return true;
    if (prFilter === "open") return pr.status === "open" || pr.status === "draft";
    if (prFilter === "review") return pr.status === "review" || (pr.status === "open" && pr.reviewCount && pr.reviewCount > 0);
    if (prFilter === "merged") return pr.status === "merged";
    if (prFilter === "closed") return pr.status === "closed";
    return true;
  });

  return (
    <section className="relative flex h-full min-w-0 flex-1 flex-col bg-[#0b0e14] overflow-hidden">
      {/* ─── Floating Glass Header ─── */}
      <div className="relative z-10 px-3 pt-3 sm:px-4 sm:pt-4">
        <header className="flex flex-col gap-3 rounded-[20px] border border-white/[0.08] bg-[#121722]/75 p-3 sm:px-4 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="Back to channels"
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-white/[0.06] hover:text-text-primary active:scale-95 transition-all md:hidden"
                >
                  <ArrowLeft size={17} />
                </button>
              )}
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 border border-accent/25 text-accent shrink-0">
                <ChannelGlyph type="github" size={15} />
              </div>
              <div>
                <h1 className="text-[14.5px] font-bold text-text-primary flex items-center gap-2">
                  <span>AIIC GitHub Hub</span>
                  {data?.repository && (
                    <span className="font-mono text-xs text-accent font-normal">
                      · {data.repository.full_name}
                    </span>
                  )}
                </h1>
                <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider block">
                  {data?.repository
                    ? `${data.repository.default_branch || "main"} branch · ${prs.length} pull requests`
                    : "No repository bound"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchChannelGitHub(true)}
                disabled={loading || refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-xs font-mono text-text-secondary hover:text-text-primary transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Sync</span>
              </button>

              {data?.integration && (
                <button
                  type="button"
                  onClick={handleUnlink}
                  disabled={unlinking}
                  title="Disconnect repository"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-danger/25 bg-danger/10 hover:bg-danger/20 text-xs font-mono text-danger transition-all active:scale-95"
                >
                  <Unlink size={12} />
                  <span className="hidden sm:inline">Unlink</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub-Filters / Search */}
          {data?.integration && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                {PR_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPrFilter(f.id)}
                    className={cn(
                      "h-6 rounded-lg px-2 font-mono text-[10px] font-semibold transition-all",
                      prFilter === f.id
                        ? "bg-accent/20 text-accent border border-accent/30"
                        : "text-text-muted hover:text-text-primary"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] px-2 py-1 rounded-lg">
                <Search size={11} className="text-text-muted" />
                <input
                  type="text"
                  placeholder="Filter PRs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-[11px] text-text-primary placeholder:text-text-muted/60 outline-none w-28 sm:w-36 font-mono"
                />
              </div>
            </div>
          )}
        </header>
      </div>

      {/* ─── Body Surface ─── */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="animate-spin text-accent" size={24} />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-danger/30 bg-danger/10 p-6 text-center text-xs text-danger font-mono">
            {error}
          </div>
        ) : !data?.integration || !data.repository ? (
          /* ─── Clean Unconnected State ─── */
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 border border-accent/20 text-accent mb-4">
              <FolderGit2 size={26} />
            </div>
            <h3 className="text-sm font-bold text-text-primary mb-1">GitHub repository not connected</h3>
            <p className="text-xs text-text-secondary mb-6 leading-relaxed">
              This channel has not been bound to a GitHub repository yet. Choose an authorized repository from your Space to route pull requests and webhook feeds here.
            </p>

            {(data?.authorizedRepositories || []).length > 0 ? (
              <div className="w-full space-y-3 bg-[#121622] p-4 rounded-2xl border border-white/[0.08] shadow-xl text-left">
                <label className="block text-[11px] font-mono font-semibold text-text-secondary">
                  Authorized Space Repositories:
                </label>
                <select
                  value={selectedRepoId}
                  onChange={(e) => setSelectedRepoId(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-text-primary outline-none focus:border-accent"
                >
                  <option value="">Select a repository...</option>
                  {data?.authorizedRepositories.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.full_name} ({r.is_private ? "Private" : "Public"})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={!selectedRepoId || connecting}
                  className="w-full py-2 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {connecting && <Loader2 size={13} className="animate-spin" />}
                  <span>{connecting ? "Connecting Repository..." : "Bind Channel to Repository"}</span>
                </button>
              </div>
            ) : (
              <div className="text-[11px] font-mono text-text-muted bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl">
                No repositories have been authorized for this Space yet. An Admin can authorize repositories globally in the Admin Board.
              </div>
            )}
          </div>
        ) : (
          /* ─── Live Pull Requests Feed ─── */
          <>
            {visiblePRs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <GitPullRequest size={32} className="text-text-muted mb-2 opacity-50" />
                <p className="text-xs font-mono text-text-muted">
                  {prs.length === 0 ? "No pull requests found for this repository." : "No pull requests match this filter."}
                </p>
              </div>
            ) : (
              visiblePRs.map((pr) => (
                <article
                  key={pr.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-white/[0.06] bg-[#121622]/80 hover:bg-[#121622] hover:border-white/[0.12] transition-all shadow-md group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={cn(
                        "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                        STATUS_DOT[pr.status] || "bg-text-muted"
                      )}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-text-primary group-hover:text-accent transition-colors">
                          #{pr.number} {pr.title}
                        </span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider border",
                            pr.status === "merged"
                              ? "bg-purple-500/10 border-purple-500/25 text-purple-400"
                              : pr.status === "closed"
                              ? "bg-red-500/10 border-red-500/25 text-red-400"
                              : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                          )}
                        >
                          {pr.status}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] text-text-muted">
                        <span>by @{pr.author}</span>
                        <span>·</span>
                        <span className="text-text-secondary">{pr.repo}</span>
                        <span>·</span>
                        <span>{new Date(pr.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {pr.url && (
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.06] text-xs font-mono font-semibold text-text-primary transition-all active:scale-95"
                      >
                        <span>Review PR</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </article>
              ))
            )}
          </>
        )}
      </div>
    </section>
  );
}

export function CIBadge({ status }: { status?: CIStatus }) {
  if (!status) return null;
  const config = {
    passing: { label: "CI passing", className: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" },
    failing: { label: "CI failing", className: "bg-danger/10 border-danger/25 text-danger" },
    pending: { label: "CI running", className: "bg-amber-500/10 border-amber-500/25 text-amber-400" },
  }[status] || { label: "CI unknown", className: "bg-white/10 text-text-muted" };

  return (
    <span className={cn("px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider border", config.className)}>
      {config.label}
    </span>
  );
}

export function GitHubEvent({ text, meta }: { text: string; meta?: string }) {
  return (
    <div className="flex items-center gap-2 font-mono text-xs text-text-secondary bg-white/[0.02] border border-white/[0.04] px-3 py-1.5 rounded-xl my-1">
      <GitPullRequest size={13} className="text-accent shrink-0" />
      <span className="text-text-primary">{text}</span>
      {meta && <span className="text-[10px] text-text-muted ml-auto">{meta}</span>}
    </div>
  );
}

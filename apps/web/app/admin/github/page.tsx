"use client";

import { useState, useEffect } from "react";
import {
  FolderGit2,
  GitBranch,
  GitPullRequest,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Layers,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Shield,
  Loader2,
  RefreshCw,
  Sliders,
  Code,
  Lock,
  Star,
  Users,
} from "lucide-react";
import { api } from "@/shared/lib/api";

type TabId = "installations" | "repositories" | "teams" | "deliveries";

export default function AdminGitHubPage() {
  const [activeTab, setActiveTab] = useState<TabId>("installations");
  const [data, setData] = useState<{
    installations: any[];
    repositories: any[];
    installationRepositories: any[];
    teamRepositories: any[];
    teamGhTeams: any[];
    deliveries: any[];
  } | null>(null);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);

  // Link Team Repository Modal
  const [showRepoModal, setShowRepoModal] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedRepoId, setSelectedRepoId] = useState("");
  const [selectedPerm, setSelectedPerm] = useState("push");
  const [isPrimaryRepo, setIsPrimaryRepo] = useState(false);

  // Link Team GitHub Team Modal
  const [showGhTeamModal, setShowGhTeamModal] = useState(false);
  const [selectedGhTeamId, setSelectedGhTeamId] = useState("");
  const [selectedGhTeamSlug, setSelectedGhTeamSlug] = useState("");
  const [selectedInstId, setSelectedInstId] = useState("");
  const [syncDir, setSyncDir] = useState("bidirectional");

  // Create Repository Modal
  const [showCreateRepoModal, setShowCreateRepoModal] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDescription, setNewRepoDescription] = useState("");
  const [newRepoIsPrivate, setNewRepoIsPrivate] = useState(true);
  const [newRepoAutoInit, setNewRepoAutoInit] = useState(true);
  const [newRepoInstId, setNewRepoInstId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ghResult, teamResult] = await Promise.allSettled([
        api<any>("/admin/github"),
        api<any>("/admin/teams"),
      ]);

      if (ghResult.status === "fulfilled" && ghResult.value) {
        const ghData = ghResult.value;
        console.log("[ADMIN_GITHUB_SUCCESS]", {
          installationsCount: ghData.installations?.length ?? 0,
          repositoriesCount: ghData.repositories?.length ?? 0,
          deliveriesCount: ghData.deliveries?.length ?? 0,
          raw: ghData,
        });
        setData(ghData);
      } else if (ghResult.status === "rejected") {
        console.error("[ADMIN_GITHUB_FETCH_ERROR]", ghResult.reason);
        setError(ghResult.reason?.message || "Failed to load GitHub infrastructure data.");
      }

      if (teamResult.status === "fulfilled" && teamResult.value) {
        setAllTeams(teamResult.value.teams || []);
      }
    } catch (err: any) {
      console.error("[ADMIN_FETCH_UNEXPECTED_ERROR]", err);
      setError(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLinkRepo = async () => {
    if (!selectedTeamId || !selectedRepoId) return;
    setSubmitting(true);
    setError(null);

    try {
      await api("/admin/github/mutate", {
        method: "POST",
        body: JSON.stringify({
          action: "link_team_repository",
          payload: {
            teamId: selectedTeamId,
            repositoryId: selectedRepoId,
            githubPermission: selectedPerm,
            isPrimary: isPrimaryRepo,
          },
        }),
      });

      setShowRepoModal(false);
      setSelectedTeamId("");
      setSelectedRepoId("");
      setIsPrimaryRepo(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to link repository.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlinkRepo = async (mappingId: string) => {
    if (!confirm("Are you sure you want to remove this repository assignment?")) return;
    try {
      await api("/admin/github/mutate", {
        method: "POST",
        body: JSON.stringify({
          action: "unlink_team_repository",
          payload: { id: mappingId },
        }),
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to unlink repository.");
    }
  };

  const handleLinkGhTeam = async () => {
    if (!selectedTeamId || !selectedInstId || !selectedGhTeamSlug) return;
    setSubmitting(true);
    setError(null);

    try {
      await api("/admin/github/mutate", {
        method: "POST",
        body: JSON.stringify({
          action: "link_team_gh_team",
          payload: {
            teamId: selectedTeamId,
            installationRecordId: selectedInstId,
            githubTeamId: parseInt(selectedGhTeamId, 10) || Math.floor(Date.now() / 1000),
            githubTeamSlug: selectedGhTeamSlug,
            syncDirection: syncDir,
          },
        }),
      });

      setShowGhTeamModal(false);
      setSelectedTeamId("");
      setSelectedInstId("");
      setSelectedGhTeamId("");
      setSelectedGhTeamSlug("");
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to link GitHub team.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRepo = async () => {
    if (!newRepoName.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      await api("/admin/github/mutate", {
        method: "POST",
        body: JSON.stringify({
          action: "create_repository",
          payload: {
            name: newRepoName.trim(),
            description: newRepoDescription.trim() || undefined,
            isPrivate: newRepoIsPrivate,
            autoInit: newRepoAutoInit,
            installationRecordId: newRepoInstId || undefined,
          },
        }),
      });

      setShowCreateRepoModal(false);
      setNewRepoName("");
      setNewRepoDescription("");
      setNewRepoIsPrivate(true);
      setNewRepoAutoInit(true);
      setNewRepoInstId("");
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to create GitHub repository.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlinkGhTeam = async (mappingId: string) => {
    if (!confirm("Are you sure you want to remove this GitHub team mapping?")) return;
    try {
      await api("/admin/github/mutate", {
        method: "POST",
        body: JSON.stringify({
          action: "unlink_team_gh_team",
          payload: { id: mappingId },
        }),
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to unlink GitHub team.");
    }
  };

  const handleToggleInstallation = async (instId: string, currentActive: boolean) => {
    try {
      await api("/admin/github/mutate", {
        method: "POST",
        body: JSON.stringify({
          action: "toggle_installation_status",
          payload: { id: instId, isActive: !currentActive },
        }),
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to toggle installation status.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <FolderGit2 className="text-accent" size={24} />
            GitHub Automation &amp; Integration Plane
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Manage multi-tenant GitHub App installations, repository inventories, team mapping matrices, and signature-verified webhook deliveries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] px-3 py-2 text-xs font-semibold text-text-primary transition-all active:scale-95"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* ─── Navigation Sub-Tabs ─── */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2 overflow-x-auto">
        {[
          { id: "installations", label: "App Installations", count: data?.installations.length },
          { id: "repositories", label: "Repositories", count: data?.repositories.length },
          { id: "teams", label: "Team Mapping Matrix", count: data?.teamRepositories.length },
          { id: "deliveries", label: "Webhook Deliveries", count: data?.deliveries.length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as TabId)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-accent/15 border border-accent/30 text-accent shadow-sm"
                : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="px-1.5 py-0.2 rounded-md font-mono text-[10px] bg-white/10 text-text-primary">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Main Content View ─── */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={24} />
        </div>
      ) : (
        <>
          {/* TAB 1: INSTALLATIONS */}
          {activeTab === "installations" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
                  Connected GitHub Organizations ({data?.installations.length || 0})
                </span>
              </div>

              {(!data?.installations || data.installations.length === 0) ? (
                <div className="rounded-2xl border border-white/[0.08] bg-[#121622] p-12 text-center text-xs text-text-muted font-mono">
                  No GitHub App installations registered yet. Once the AIIC Automation App is installed on an organization, it will appear here.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.installations.map((inst) => (
                    <div
                      key={inst.id}
                      className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#121622] p-5 shadow-xl hover:border-white/[0.14] transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 border border-accent/25 text-accent font-bold">
                              <FolderGit2 size={20} />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                                <span>{inst.account_login}</span>
                                <span className="font-mono text-[10px] text-text-muted font-normal">
                                  ({inst.account_type})
                                </span>
                              </h3>
                              <span className="font-mono text-[11px] text-accent">
                                Installation ID: {inst.installation_id}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider border ${
                              inst.is_active
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                : "bg-danger/15 border-danger/30 text-danger"
                            }`}
                          >
                            {inst.is_active ? "Active" : "Suspended"}
                          </span>
                        </div>

                        <div className="mt-4 space-y-1.5 font-mono text-xs text-text-secondary">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-text-muted">Target Scope:</span>
                            <span className="text-text-primary">{inst.target_type} ({inst.repository_selection} repos)</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-text-muted">Authorized By:</span>
                            <span className="text-text-primary font-semibold">
                              {inst.installer?.displayName || inst.installer?.username || "Admin"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-text-muted">Installed At:</span>
                            <span>{new Date(inst.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                          </div>
                        </div>

                        {inst.permissions_snapshot && Object.keys(inst.permissions_snapshot).length > 0 && (
                          <div className="mt-3.5 pt-3 border-t border-white/[0.06]">
                            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mb-1.5">
                              Granted Permissions Snapshot:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(inst.permissions_snapshot).map(([key, val]) => (
                                <span
                                  key={key}
                                  className="px-2 py-0.5 rounded-md text-[9px] font-mono bg-white/[0.03] border border-white/[0.06] text-text-secondary"
                                >
                                  {key}: <strong className="text-accent">{String(val)}</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between gap-2">
                        <a
                          href={`https://github.com/organizations/${inst.account_login}/settings/installations`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-text-primary text-center transition-all inline-flex items-center justify-center gap-1.5"
                        >
                          <span>Manage on GitHub</span>
                          <ExternalLink size={12} />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleToggleInstallation(inst.id, inst.is_active)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            inst.is_active
                              ? "bg-danger/10 border-danger/25 text-danger hover:bg-danger/20"
                              : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20"
                          }`}
                        >
                          {inst.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REPOSITORIES */}
          {activeTab === "repositories" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
                  Global Repositories Registry ({data?.repositories.length || 0})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setShowCreateRepoModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-accent text-black hover:bg-accent/90 transition-all font-mono text-xs font-bold flex items-center gap-1.5 active:scale-95 shadow-md"
                >
                  <Plus size={13} />
                  <span>Create Repository</span>
                </button>
              </div>

              {(!data?.repositories || data.repositories.length === 0) ? (
                <div className="rounded-2xl border border-white/[0.08] bg-[#121622] p-12 text-center text-xs text-text-muted font-mono">
                  No repositories synced into the inventory yet.
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121622] shadow-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/[0.08] bg-white/[0.02] font-mono text-[11px] uppercase tracking-wider text-text-muted">
                      <tr>
                        <th className="py-3.5 px-4 font-semibold">Repository</th>
                        <th className="py-3.5 px-4 font-semibold">Default Branch</th>
                        <th className="py-3.5 px-4 font-semibold">Visibility</th>
                        <th className="py-3.5 px-4 font-semibold">Assigned Teams</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Links</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {data.repositories.map((repo) => {
                        const linkedTeams = data.teamRepositories.filter((tr) => tr.repository_id === repo.id);
                        return (
                          <tr key={repo.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-text-primary">{repo.full_name}</div>
                              <span className="font-mono text-[10px] text-text-muted">
                                ID: {repo.github_repo_id}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-mono text-[11px] text-text-secondary">
                              <span className="inline-flex items-center gap-1">
                                <GitBranch size={12} className="text-accent" />
                                {repo.default_branch}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-wider border ${
                                  repo.is_private
                                    ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                                    : "bg-blue-500/10 border-blue-500/25 text-blue-400"
                                }`}
                              >
                                {repo.is_private ? "Private" : "Public"}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              {linkedTeams.length === 0 ? (
                                <span className="font-mono text-text-muted/60 text-[11px]">Unassigned</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {linkedTeams.map((lt) => (
                                    <span
                                      key={lt.id}
                                      className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.04] border border-white/[0.08] text-accent flex items-center gap-1"
                                    >
                                      {lt.is_primary && <Star size={9} className="fill-amber-400 text-amber-400" />}
                                      <span>{lt.team?.name}</span>
                                      <span className="text-text-muted">({lt.github_permission})</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <a
                                href={`https://github.com/${repo.full_name}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/[0.08] hover:bg-white/[0.05] text-[11px] font-semibold text-text-secondary hover:text-text-primary transition-all"
                              >
                                <span>GitHub</span>
                                <ExternalLink size={11} />
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TEAM MAPPING MATRIX */}
          {activeTab === "teams" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
                    Team Mapping Matrix (Upper &amp; Lower Pool)
                  </span>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Assign multi-repository access permissions and bidirectional GitHub team synchronization rules.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRepoModal(true);
                      setError(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-xs font-bold text-black hover:bg-accent/90 transition-all shadow-sm active:scale-95"
                  >
                    <Plus size={14} />
                    <span>Assign Repository</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowGhTeamModal(true);
                      setError(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] px-3.5 py-2 text-xs font-bold text-text-primary transition-all active:scale-95"
                  >
                    <Users size={14} />
                    <span>Map GitHub Team</span>
                  </button>
                </div>
              </div>

              {allTeams.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.08] bg-[#121622] p-8 text-center text-xs text-text-muted font-mono">
                  No AIIC teams configured.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allTeams.map((team) => {
                    const repos = (data?.teamRepositories || []).filter((tr) => tr.team_id === team.id);
                    const ghTeams = (data?.teamGhTeams || []).filter((gt) => gt.team_id === team.id);

                    return (
                      <div
                        key={team.id}
                        className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#121622] p-5 shadow-xl"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                                <span>{team.name}</span>
                                <span className="font-mono text-[10px] text-text-muted">#{team.position}</span>
                              </h3>
                              <span className="font-mono text-[11px] text-accent mt-0.5 block">{team.pool}</span>
                            </div>
                          </div>

                          {/* GitHub Team Mapping */}
                          <div className="mt-4 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block mb-2">
                              Mapped GitHub Teams ({ghTeams.length})
                            </span>
                            {ghTeams.length === 0 ? (
                              <span className="text-xs font-mono text-text-muted/60 italic">
                                No GitHub team mapped.
                              </span>
                            ) : (
                              <div className="space-y-1.5">
                                {ghTeams.map((gt) => (
                                  <div
                                    key={gt.id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                                  >
                                    <div className="min-w-0">
                                      <span className="text-xs font-semibold text-text-primary truncate block">
                                        @{gt.github_team_slug}
                                      </span>
                                      <span className="text-[10px] font-mono text-text-muted truncate block">
                                        Org: {gt.installation?.account_login} · Sync: {gt.sync_direction}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleUnlinkGhTeam(gt.id)}
                                      className="text-text-muted hover:text-danger p-1 rounded transition-colors"
                                      title="Unlink GitHub Team"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Assigned Repositories */}
                          <div className="mt-4 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block mb-2">
                              Assigned Repositories ({repos.length})
                            </span>
                            {repos.length === 0 ? (
                              <span className="text-xs font-mono text-text-muted/60 italic">
                                No repositories assigned.
                              </span>
                            ) : (
                              <div className="space-y-1.5">
                                {repos.map((r) => (
                                  <div
                                    key={r.id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {r.is_primary && (
                                        <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />
                                      )}
                                      <div className="min-w-0">
                                        <span className="text-xs font-semibold text-text-primary truncate block">
                                          {r.repository?.full_name}
                                        </span>
                                        <span className="text-[10px] font-mono text-accent truncate block">
                                          Permission: {r.github_permission.toUpperCase()}
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleUnlinkRepo(r.id)}
                                      className="text-text-muted hover:text-danger p-1 rounded transition-colors"
                                      title="Unlink Repository"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: WEBHOOK DELIVERIES */}
          {activeTab === "deliveries" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
                    Signature-Verified Webhook Delivery Ledger
                  </span>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Click any record to inspect sanitized processing metadata and cryptographic diagnostic digests.
                  </p>
                </div>
              </div>

              {(!data?.deliveries || data.deliveries.length === 0) ? (
                <div className="rounded-2xl border border-white/[0.08] bg-[#121622] p-12 text-center text-xs text-text-muted font-mono">
                  No webhook deliveries recorded yet. Once GitHub pushes events to `/api/webhooks/github`, verified deliveries will stream into this ledger.
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121622] shadow-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/[0.08] bg-white/[0.02] font-mono text-[11px] uppercase tracking-wider text-text-muted">
                      <tr>
                        <th className="py-3.5 px-4 font-semibold">Event / Action</th>
                        <th className="py-3.5 px-4 font-semibold">Installation</th>
                        <th className="py-3.5 px-4 font-semibold">Status</th>
                        <th className="py-3.5 px-4 font-semibold">Attempts</th>
                        <th className="py-3.5 px-4 font-semibold">Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {data.deliveries.map((del) => (
                        <tr
                          key={del.delivery_id}
                          onClick={() => setSelectedDelivery(del)}
                          className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-text-primary flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-wider bg-accent/10 border border-accent/25 text-accent">
                                {del.event_type}
                              </span>
                              {del.action && (
                                <span className="font-mono text-xs text-text-secondary">
                                  .{del.action}
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-text-muted">
                              ID: {del.delivery_id.slice(0, 18)}...
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[11px] text-text-secondary">
                            {del.installation?.account_login || `Inst #${del.external_installation_id}`}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-wider border ${
                                del.status === "completed"
                                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                                  : del.status === "failed"
                                  ? "bg-danger/10 border-danger/25 text-danger"
                                  : "bg-amber-500/10 border-amber-500/25 text-amber-400"
                              }`}
                            >
                              {del.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-xs text-text-secondary">
                            {del.attempt_count}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[11px] text-text-muted">
                            {new Date(del.received_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── Webhook Delivery Detail Modal ─── */}
      {selectedDelivery && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedDelivery(null)}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-[#121622] p-6 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Code size={18} className="text-accent" />
              Webhook Delivery Diagnostics
            </h3>

            <p className="text-xs text-text-secondary mt-1 font-mono">
              Delivery ID: {selectedDelivery.delivery_id}
            </p>

            <div className="mt-4 space-y-2.5 font-mono text-xs text-text-secondary bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Event Type:</span>
                <span className="text-accent font-bold">{selectedDelivery.event_type}</span>
              </div>
              {selectedDelivery.action && (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Action:</span>
                  <span className="text-text-primary font-semibold">{selectedDelivery.action}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Installation:</span>
                <span className="text-text-primary">
                  {selectedDelivery.installation?.account_login} (#{selectedDelivery.external_installation_id})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Status:</span>
                <span className="text-emerald-400 font-bold uppercase">{selectedDelivery.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Attempts:</span>
                <span className="text-text-primary">{selectedDelivery.attempt_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Received At:</span>
                <span>{new Date(selectedDelivery.received_at).toLocaleString()}</span>
              </div>
              {selectedDelivery.processed_at && (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Processed At:</span>
                  <span>{new Date(selectedDelivery.processed_at).toLocaleString()}</span>
                </div>
              )}
              <div className="pt-2 border-t border-white/[0.04]">
                <span className="text-text-muted block text-[10px] mb-1">Payload SHA-256 Digest:</span>
                <code className="text-[10px] text-text-primary break-all">
                  {selectedDelivery.payload_hash}
                </code>
              </div>
              {selectedDelivery.error_message && (
                <div className="pt-2 border-t border-danger/20 text-danger">
                  <span className="block text-[10px] uppercase font-bold">Error Message ({selectedDelivery.error_code}):</span>
                  <p className="text-[11px] mt-0.5">{selectedDelivery.error_message}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDelivery(null)}
                className="px-5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-text-primary transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Link Repository Modal ─── */}
      {showRepoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowRepoModal(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-[#121622] p-6 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Plus size={18} className="text-accent" />
              Assign Repository to AIIC Team
            </h3>

            {error && (
              <div className="mt-4 p-3 rounded-xl border border-danger/30 bg-danger/10 text-danger text-xs">
                {error}
              </div>
            )}

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                  Select AIIC Team
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent/40 font-mono"
                >
                  <option value="">-- Choose Team --</option>
                  {allTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.pool})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                  Select GitHub Repository
                </label>
                <select
                  value={selectedRepoId}
                  onChange={(e) => setSelectedRepoId(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent/40 font-mono"
                >
                  <option value="">-- Choose Repository --</option>
                  {(data?.repositories || []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.full_name} {r.is_private ? "(Private)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                  GitHub Permission Level
                </label>
                <select
                  value={selectedPerm}
                  onChange={(e) => setSelectedPerm(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent/40 font-mono"
                >
                  <option value="pull">Pull (Read)</option>
                  <option value="triage">Triage</option>
                  <option value="push">Push (Write / Default)</option>
                  <option value="maintain">Maintain</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <label className="flex items-center gap-2 pt-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrimaryRepo}
                  onChange={(e) => setIsPrimaryRepo(e.target.checked)}
                  className="rounded border-white/20 text-accent focus:ring-0"
                />
                <span className="font-semibold text-text-primary">
                  Set as Team's Primary Repository
                </span>
              </label>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowRepoModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-white/[0.06] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || !selectedTeamId || !selectedRepoId}
                onClick={handleLinkRepo}
                className="px-5 py-2 rounded-xl bg-accent text-black text-xs font-bold hover:bg-accent/90 transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <span>Save Assignment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Link GitHub Team Modal ─── */}
      {showGhTeamModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowGhTeamModal(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-[#121622] p-6 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Users size={18} className="text-accent" />
              Map GitHub Organization Team
            </h3>

            {error && (
              <div className="mt-4 p-3 rounded-xl border border-danger/30 bg-danger/10 text-danger text-xs">
                {error}
              </div>
            )}

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                  Select AIIC Team
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent/40 font-mono"
                >
                  <option value="">-- Choose Team --</option>
                  {allTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.pool})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                  Select Installation (Organization)
                </label>
                <select
                  value={selectedInstId}
                  onChange={(e) => setSelectedInstId(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent/40 font-mono"
                >
                  <option value="">-- Choose Organization --</option>
                  {(data?.installations || []).map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.account_login} (#{inst.installation_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                  GitHub Team Slug
                </label>
                <input
                  type="text"
                  placeholder="e.g. upper-pool-core"
                  value={selectedGhTeamSlug}
                  onChange={(e) => setSelectedGhTeamSlug(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                  Roster Sync Direction
                </label>
                <select
                  value={syncDir}
                  onChange={(e) => setSyncDir(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent/40 font-mono"
                >
                  <option value="bidirectional">Bidirectional Sync</option>
                  <option value="aiic_to_github">AIIC Team → GitHub Team Only</option>
                  <option value="github_to_aiic">GitHub Team → AIIC Team Only</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowGhTeamModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-white/[0.06] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || !selectedTeamId || !selectedInstId || !selectedGhTeamSlug}
                onClick={handleLinkGhTeam}
                className="px-5 py-2 rounded-xl bg-accent text-black text-xs font-bold hover:bg-accent/90 transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <span>Save Team Mapping</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create Repository Modal ─── */}
      {showCreateRepoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !submitting && setShowCreateRepoModal(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-[#121622] p-6 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <FolderGit2 size={18} className="text-accent" />
              Create GitHub Organization Repository
            </h3>

            {error && (
              <div className="mt-4 p-3 rounded-xl border border-danger/30 bg-danger/10 text-danger text-xs font-mono">
                {error}
              </div>
            )}

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                  Target Organization
                </label>
                <select
                  value={newRepoInstId}
                  onChange={(e) => setNewRepoInstId(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent/40 font-mono"
                >
                  {(data?.installations || []).map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.account_login} ({inst.account_type}) · Installation #{inst.installation_id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                  Repository Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. backend-service or ml-agents"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Brief description of the repository..."
                  value={newRepoDescription}
                  onChange={(e) => setNewRepoDescription(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                  Visibility
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRepoIsPrivate(true)}
                    className={`py-2 rounded-xl text-xs font-mono font-semibold border transition-all ${
                      newRepoIsPrivate
                        ? "bg-accent/20 border-accent/40 text-accent"
                        : "bg-white/[0.03] border-white/[0.08] text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Private
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRepoIsPrivate(false)}
                    className={`py-2 rounded-xl text-xs font-mono font-semibold border transition-all ${
                      !newRepoIsPrivate
                        ? "bg-accent/20 border-accent/40 text-accent"
                        : "bg-white/[0.03] border-white/[0.08] text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Public
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoInit"
                  checked={newRepoAutoInit}
                  onChange={(e) => setNewRepoAutoInit(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-accent focus:ring-accent"
                />
                <label htmlFor="autoInit" className="text-xs font-mono text-text-secondary cursor-pointer">
                  Initialize with a README file (main branch)
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowCreateRepoModal(false)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-white/[0.06] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || !newRepoName.trim()}
                onClick={handleCreateRepo}
                className="px-5 py-2 rounded-xl bg-accent text-black text-xs font-bold hover:bg-accent/90 transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <span>{submitting ? "Creating on GitHub..." : "Create Repository"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Shield,
  Users,
  UserPlus,
  UserMinus,
  Crown,
  Loader2,
  AlertTriangle,
  CheckCircle,
  FolderGit2,
  GitBranch,
  Star,
  ExternalLink,
  Plus,
} from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import { api } from "@/shared/lib/api";

interface TeamData {
  id: string;
  key: string;
  name: string;
  position: number;
  pool: "Upper Pool" | "Lower Pool";
  isActive: boolean;
  leader: { id: string; username: string; displayName: string; avatarUrl?: string | null; email: string } | null;
  members: Array<{ memberId: string; userId: string; username: string; displayName: string; avatarUrl?: string | null; role: string }>;
  memberCount: number;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [githubData, setGithubData] = useState<{
    teamRepositories: any[];
    teamGhTeams: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Appoint / Add Member Modal State
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null);
  const [actionType, setActionType] = useState<"appoint_leader" | "add_member" | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamsAndUsers = () => {
    setLoading(true);
    Promise.all([
      api<{ teams: TeamData[] }>("/admin/teams"),
      api<{ users: any[] }>("/admin/users"),
      api<any>("/admin/github").catch(() => ({ teamRepositories: [], teamGhTeams: [] })),
    ])
      .then(([teamsData, usersData, ghData]) => {
        setTeams(teamsData.teams || []);
        setAllUsers(usersData.users || []);
        setGithubData(ghData);
      })
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTeamsAndUsers();
  }, []);

  const handleMutation = async () => {
    if (!selectedTeam || !actionType || !selectedUserId) return;
    setSubmitting(true);
    setError(null);

    try {
      await api("/admin/teams/mutate", {
        method: "POST",
        body: JSON.stringify({
          teamId: selectedTeam.id,
          action: actionType,
          userId: selectedUserId,
          reason,
        }),
      });

      setSelectedTeam(null);
      setActionType(null);
      setSelectedUserId("");
      setReason("");
      fetchTeamsAndUsers();
    } catch (err: any) {
      setError(err.message || "Team mutation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    if (!confirm("Are you sure you want to remove this member from the team?")) return;
    try {
      await api("/admin/teams/mutate", {
        method: "POST",
        body: JSON.stringify({
          teamId,
          action: "remove_member",
          userId,
          reason: "Administrative removal",
        }),
      });
      fetchTeamsAndUsers();
    } catch (err: any) {
      alert(err.message || "Failed to remove member.");
    }
  };

  const upperPool = teams.filter((t) => t.pool === "Upper Pool");
  const lowerPool = teams.filter((t) => t.pool === "Lower Pool");

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Layers className="text-accent" size={24} />
            Teams &amp; Pools Governance
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            AIIC Organizational Pool Structure: Upper Pool (Teams 1–2) and Lower Pool (Teams 3–5). Appoint leaders, assign GitHub team/repository mappings, and manage team rosters.
          </p>
        </div>

        <Link
          href="/admin/github"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-text-primary transition-all active:scale-95"
        >
          <FolderGit2 size={14} className="text-accent" />
          <span>Configure GitHub Matrix</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={24} />
        </div>
      ) : (
        <div className="space-y-8">
          {/* ─── Upper Pool (Teams 1–2) ─── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
              <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/30">
                Upper Pool
              </span>
              <h2 className="text-sm font-bold text-text-primary">Executive &amp; Core Strategy (Teams 1 &amp; 2)</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {upperPool.map((team) => renderTeamCard(team))}
            </div>
          </div>

          {/* ─── Lower Pool (Teams 3–5) ─── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
              <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30">
                Lower Pool
              </span>
              <h2 className="text-sm font-bold text-text-primary">Engineering, Design &amp; Operations (Teams 3, 4 &amp; 5)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowerPool.map((team) => renderTeamCard(team))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Add Member / Appoint Leader Modal ─── */}
      {selectedTeam && actionType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedTeam(null)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-[#121622] p-6 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Shield size={18} className="text-accent" />
              {actionType === "appoint_leader"
                ? `Appoint Leader for ${selectedTeam.name}`
                : `Add Member to ${selectedTeam.name}`}
            </h3>

            <p className="text-xs text-text-secondary mt-1">
              Pool: {selectedTeam.pool}
            </p>

            {error && (
              <div className="mt-4 p-3 rounded-xl border border-danger/30 bg-danger/10 text-danger text-xs flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                  Select User
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent/40 font-mono"
                >
                  <option value="">-- Select a User --</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} (@{u.username}) — {u.roleName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                  Administrative Notes / Reason
                </label>
                <textarea
                  rows={2}
                  placeholder="Reason for appointment/addition..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedTeam(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-white/[0.06] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || !selectedUserId}
                onClick={handleMutation}
                className="px-5 py-2 rounded-xl bg-accent text-black text-xs font-bold hover:bg-accent/90 transition-all shadow-lg active:scale-95 flex items-center gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <span>
                  {actionType === "appoint_leader" ? "Appoint Leader" : "Add Member"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderTeamCard(team: TeamData) {
    const repos = (githubData?.teamRepositories || []).filter((tr) => tr.team_id === team.id);
    const ghTeams = (githubData?.teamGhTeams || []).filter((gt) => gt.team_id === team.id);

    return (
      <div
        key={team.id}
        className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#121622] p-5 shadow-xl hover:border-white/[0.14] transition-all"
      >
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-text-primary">{team.name}</h3>
                <span className="font-mono text-[10px] text-text-muted">#{team.position}</span>
              </div>
              <span className="font-mono text-[11px] text-accent mt-0.5 block">{team.pool}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedTeam(team);
                  setActionType("appoint_leader");
                  setSelectedUserId(team.leader?.id || "");
                  setError(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] font-semibold text-text-primary transition-all"
              >
                {team.leader ? "Change Lead" : "Appoint Lead"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTeam(team);
                  setActionType("add_member");
                  setSelectedUserId("");
                  setError(null);
                }}
                className="p-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-text-muted hover:text-text-primary transition-all"
                title="Add Member"
              >
                <UserPlus size={14} />
              </button>
            </div>
          </div>

          {/* Leader Section */}
          <div className="mt-4 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block mb-2">
              Team Leader
            </span>
            {team.leader ? (
              <div className="flex items-center gap-2.5">
                <Avatar
                  src={team.leader.avatarUrl || undefined}
                  name={team.leader.displayName}
                  size={32}
                  shape="circle"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-text-primary truncate">
                    {team.leader.displayName}
                  </div>
                  <div className="text-[10px] font-mono text-text-muted truncate">
                    @{team.leader.username}
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-xs font-mono text-text-muted/60 italic">
                No leader appointed.
              </span>
            )}
          </div>

          {/* GitHub Integration Info */}
          <div className="mt-4 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <FolderGit2 size={12} className="text-accent" />
                GitHub Assignments
              </span>
              <Link
                href="/admin/github"
                className="text-[10px] font-mono text-accent hover:underline flex items-center gap-1"
              >
                <span>Edit Matrix</span>
                <ExternalLink size={9} />
              </Link>
            </div>

            {/* Mapped GitHub Teams */}
            <div className="space-y-1">
              {ghTeams.length === 0 ? (
                <span className="text-[11px] font-mono text-text-muted/60 block">
                  GitHub Team: Unmapped
                </span>
              ) : (
                ghTeams.map((gt) => (
                  <div key={gt.id} className="text-[11px] font-mono text-text-primary flex items-center gap-1.5">
                    <span className="text-text-muted">Team:</span>
                    <strong className="text-accent">@{gt.github_team_slug}</strong>
                    <span className="text-[9px] text-text-muted">({gt.sync_direction})</span>
                  </div>
                ))
              )}

              {/* Repositories */}
              {repos.length === 0 ? (
                <span className="text-[11px] font-mono text-text-muted/60 block mt-1">
                  Repositories: None assigned
                </span>
              ) : (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {repos.map((r) => (
                    <span
                      key={r.id}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.04] border border-white/[0.08] text-text-primary flex items-center gap-1"
                    >
                      {r.is_primary && <Star size={10} className="fill-amber-400 text-amber-400" />}
                      <span>{r.repository?.full_name?.split("/")[1] || r.repository?.full_name}</span>
                      <span className="text-accent font-bold uppercase text-[9px]">
                        ({r.github_permission})
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Members List */}
          <div className="mt-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block mb-2">
              Members ({team.members.length})
            </span>
            {team.members.length === 0 ? (
              <span className="text-xs font-mono text-text-muted/60 italic">
                No additional members in team.
              </span>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {team.members.map((m) => (
                  <div
                    key={m.memberId}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar
                        src={m.avatarUrl || undefined}
                        name={m.displayName}
                        size={24}
                        shape="circle"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-text-primary truncate block">
                          {m.displayName}
                        </span>
                        <span className="text-[10px] font-mono text-text-muted truncate block">
                          @{m.username}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveMember(team.id, m.userId)}
                      className="text-text-muted hover:text-danger p-1 rounded transition-colors"
                      title="Remove from team"
                    >
                      <UserMinus size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

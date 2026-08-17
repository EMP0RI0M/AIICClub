"use client";

import { useEffect, useState } from "react";
import { cn } from "@corvus/ui";
import { Shield, Award, Users, RefreshCw, ChevronRight, Check, History, AlertCircle, ArrowUpRight, Crown, Layers, UserCheck, Briefcase, Plus, Trash2, X } from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import { api } from "@/shared/lib/api";
import { usePermissions } from "@/shared/lib/permissions";
import { useToastStore } from "@/shared/stores/toast-store";

export interface OrgMember {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    status: string;
    role: string;
    roleName: string;
    hierarchyLevel: number;
    pool?: { id: string; name: string; key: string } | null;
    team?: { id: string; name: string; key: string; position: string } | null;
    staffPosition?: { id: string; name: string; key: string } | null;
}

export interface TeamData {
    id: string;
    name: string;
    key: string;
    description?: string;
    position: number;
    pool_id?: string;
    leader_user_id?: string | null;
    leader?: { id: string; username: string; displayName?: string; display_name?: string; avatarUrl?: string; avatar_url?: string } | null;
    members: Array<{ id: string; displayName: string; username: string; avatarUrl?: string | null; position: string }>;
    memberCount: number;
}

export interface PoolData {
    id: string;
    name: string;
    key: string;
    description?: string;
}

export interface StaffPositionData {
    id: string;
    name: string;
    key: string;
    description?: string;
    staff: Array<{ id: string; displayName: string; username: string; avatarUrl?: string | null; startsAt: string }>;
    staffCount: number;
}

const ROLES_LIST = [
    { key: "president_admin", name: "President + Admin", level: 1100, color: "text-amber-300 bg-amber-400/20 border-amber-400/50" },
    { key: "president", name: "President", level: 100, color: "text-amber-400 bg-amber-400/10 border-amber-400/30" },
    { key: "vice_president", name: "Vice President", level: 90, color: "text-purple-400 bg-purple-400/10 border-purple-400/30" },
    { key: "teacher", name: "Teacher", level: 80, color: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
    { key: "staff", name: "Staff", level: 60, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" },
    { key: "member", name: "Member", level: 40, color: "text-text-secondary bg-white/[0.04] border-white/[0.08]" },
    { key: "visitor", name: "Visitor", level: 10, color: "text-text-muted bg-white/[0.02] border-white/[0.04]" },
    { key: "admin", name: "Admin", level: 1000, color: "text-rose-400 bg-rose-400/10 border-rose-400/30" },
];



/**
 * Master Roles & Governance Management Panel
 */
export function RolesGovernanceSettings({ spaceId }: { spaceId: string }) {
    const [subTab, setSubTab] = useState<"members" | "pools_teams" | "staff" | "executive">("members");
    const [members, setMembers] = useState<OrgMember[]>([]);
    const [pools, setPools] = useState<PoolData[]>([]);
    const [teams, setTeams] = useState<TeamData[]>([]);
    const [staffPositions, setStaffPositions] = useState<StaffPositionData[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterRole, setFilterRole] = useState<string>("all");
    const [search, setSearch] = useState("");

    // Modals
    const [successionOpen, setSuccessionOpen] = useState(false);
    const [selectedNewPres, setSelectedNewPres] = useState<string>("");
    const [successionReason, setSuccessionReason] = useState("");
    const [successionLoading, setSuccessionLoading] = useState(false);

    const [teamModalOpen, setTeamModalOpen] = useState<TeamData | null>(null);
    const [selectedTeamMember, setSelectedTeamMember] = useState("");
    const [staffModalOpen, setStaffModalOpen] = useState<StaffPositionData | null>(null);
    const [selectedStaffMember, setSelectedStaffMember] = useState("");

    const { can, role: myRole, refetch: refetchPerms } = usePermissions(spaceId);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [mRes, tRes, sRes] = await Promise.all([
                api<{ members: OrgMember[] }>(`/org/members?spaceId=${encodeURIComponent(spaceId)}`),
                api<{ pools: PoolData[]; teams: TeamData[] }>(`/org/teams?spaceId=${encodeURIComponent(spaceId)}`),
                api<{ positions: StaffPositionData[] }>(`/org/staff?spaceId=${encodeURIComponent(spaceId)}`),
            ]);
            setMembers(mRes.members || []);
            setPools(tRes.pools || []);
            setTeams(tRes.teams || []);
            setStaffPositions(sRes.positions || []);
        } catch (err) {
            console.error("[GOVERNANCE] Load error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
    }, [spaceId]);

    const handleAssignRole = async (targetUserId: string, roleKey: string) => {
        try {
            await api("/org/roles/assign", {
                method: "POST",
                body: JSON.stringify({ spaceId, targetUserId, roleKey }),
            });
            useToastStore.getState().addToast({
                title: "Role Updated",
                body: `Organizational role successfully updated.`,
                variant: "success",
            });
            loadAll();
            refetchPerms();
        } catch (err: any) {
            useToastStore.getState().addToast({
                title: "Failed to update role",
                body: err?.message || "Permission denied.",
                variant: "error",
            });
        }
    };

    const handleSuccession = async () => {
        if (!selectedNewPres) return;
        setSuccessionLoading(true);
        try {
            await api("/org/succession", {
                method: "POST",
                body: JSON.stringify({
                    spaceId,
                    newPresidentUserId: selectedNewPres,
                    reason: successionReason.trim() || "Executive Succession",
                }),
            });
            useToastStore.getState().addToast({
                title: "Presidency Transferred",
                body: `Succession successfully executed and recorded in leadership history.`,
                variant: "success",
            });
            setSuccessionOpen(false);
            loadAll();
            refetchPerms();
        } catch (err: any) {
            useToastStore.getState().addToast({
                title: "Succession failed",
                body: err?.message || "Failed to transfer presidency.",
                variant: "error",
            });
        } finally {
            setSuccessionLoading(false);
        }
    };

    const handleAssignTeamMember = async (teamId: string, userId: string, action: "add" | "remove") => {
        try {
            await api("/org/teams", {
                method: "POST",
                body: JSON.stringify({ spaceId, teamId, targetUserId: userId, action }),
            });
            useToastStore.getState().addToast({
                title: action === "add" ? "Member Assigned" : "Member Removed",
                body: action === "add" ? "User assigned to team." : "User removed from team.",
                variant: "success",
            });
            setSelectedTeamMember("");
            loadAll();
        } catch (err: any) {
            useToastStore.getState().addToast({
                title: "Team update failed",
                body: err?.message || "Failed to update team membership.",
                variant: "error",
            });
        }
    };

    const handleAppointTeamLeader = async (teamId: string, leaderUserId: string | null) => {
        try {
            await api("/org/teams/leader", {
                method: "POST",
                body: JSON.stringify({ spaceId, teamId, leaderUserId }),
            });
            useToastStore.getState().addToast({
                title: leaderUserId ? "Team Leader Appointed" : "Team Leader Removed",
                body: leaderUserId ? "Leader appointed with contextual team permissions." : "Team leader cleared.",
                variant: "success",
            });
            loadAll();
            refetchPerms();
        } catch (err: any) {
            useToastStore.getState().addToast({
                title: "Leader appointment failed",
                body: err?.message || "Failed to update team leader.",
                variant: "error",
            });
        }
    };

    const handleAssignStaff = async (positionId: string, userId: string, action: "assign" | "remove") => {
        try {
            await api("/org/staff", {
                method: "POST",
                body: JSON.stringify({ spaceId, positionId, targetUserId: userId, action }),
            });
            useToastStore.getState().addToast({
                title: action === "assign" ? "Staff Assigned" : "Staff Removed",
                body: action === "assign" ? "User assigned to staff position." : "Staff assignment removed.",
                variant: "success",
            });
            setSelectedStaffMember("");
            loadAll();
        } catch (err: any) {
            useToastStore.getState().addToast({
                title: "Staff assignment failed",
                body: err?.message || "Failed to update staff position.",
                variant: "error",
            });
        }
    };

    const filtered = members.filter((m) => {
        const matchesRole = filterRole === "all" || m.role === filterRole;
        const matchesSearch =
            !search.trim() ||
            m.displayName.toLowerCase().includes(search.toLowerCase()) ||
            m.username.toLowerCase().includes(search.toLowerCase());
        return matchesRole && matchesSearch;
    });

    const currentPresident = members.find((m) => m.role === "president" || m.role === "president_admin");
    const currentVP = members.find((m) => m.role === "vice_president");


    const upperPool = pools.find((p) => p.key === "upper_pool");
    const lowerPool = pools.find((p) => p.key === "lower_pool");

    const upperTeams = teams.filter((t) => t.key === "team_1" || t.key === "team_2" || t.pool_id === upperPool?.id);
    const lowerTeams = teams.filter((t) => t.key === "team_3" || t.key === "team_4" || t.key === "team_5" || t.pool_id === lowerPool?.id);

    return (
        <div className="space-y-6">
            {/* Top Navigation Subtabs */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-white/[0.03] p-1.5 border border-white/[0.08] backdrop-blur-md">
                <button
                    type="button"
                    onClick={() => setSubTab("members")}
                    className={cn(
                        "flex items-center gap-2 rounded-xl px-3.5 py-2 font-mono text-xs font-bold transition-all",
                        subTab === "members" ? "bg-accent text-on-accent shadow-sm" : "text-text-muted hover:text-text-primary"
                    )}
                >
                    <Users size={14} /> Member Directory ({members.length})
                </button>
                <button
                    type="button"
                    onClick={() => setSubTab("pools_teams")}
                    className={cn(
                        "flex items-center gap-2 rounded-xl px-3.5 py-2 font-mono text-xs font-bold transition-all",
                        subTab === "pools_teams" ? "bg-accent text-on-accent shadow-sm" : "text-text-muted hover:text-text-primary"
                    )}
                >
                    <Layers size={14} /> Pools &amp; Teams (5)
                </button>
                <button
                    type="button"
                    onClick={() => setSubTab("staff")}
                    className={cn(
                        "flex items-center gap-2 rounded-xl px-3.5 py-2 font-mono text-xs font-bold transition-all",
                        subTab === "staff" ? "bg-accent text-on-accent shadow-sm" : "text-text-muted hover:text-text-primary"
                    )}
                >
                    <Briefcase size={14} /> Staff Departments ({staffPositions.length})
                </button>
                <button
                    type="button"
                    onClick={() => setSubTab("executive")}
                    className={cn(
                        "flex items-center gap-2 rounded-xl px-3.5 py-2 font-mono text-xs font-bold transition-all",
                        subTab === "executive" ? "bg-accent text-on-accent shadow-sm" : "text-text-muted hover:text-text-primary"
                    )}
                >
                    <Crown size={14} /> Executive Leadership
                </button>
            </div>

            {/* 1. MEMBERS DIRECTORY SUBTAB */}
            {subTab === "members" && (
                <div className="space-y-5">
                    {/* Role Badges Summary Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                        {ROLES_LIST.map((r) => {
                            const count = members.filter((m) => m.role === r.key).length;
                            return (
                                <button
                                    key={r.key}
                                    type="button"
                                    onClick={() => setFilterRole(filterRole === r.key ? "all" : r.key)}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center",
                                        r.color,
                                        filterRole === r.key ? "ring-2 ring-accent" : "hover:opacity-90"
                                    )}
                                >
                                    <span className="font-mono text-[10px] uppercase font-bold">{r.name}</span>
                                    <span className="text-base font-extrabold mt-0.5">{count}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Filter members by name or username..."
                            className="w-full sm:w-72 rounded-xl border border-white/[0.08] bg-black/40 px-3.5 py-2 text-xs text-text-primary outline-none placeholder:text-text-muted/60 focus:border-accent/50"
                        />
                        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
                            <button
                                type="button"
                                onClick={() => setFilterRole("all")}
                                className={cn(
                                    "rounded-lg px-2.5 py-1 font-mono text-[11px] font-semibold transition-all",
                                    filterRole === "all" ? "bg-accent/20 text-accent border border-accent/40" : "text-text-muted hover:text-text-primary"
                                )}
                            >
                                All ({members.length})
                            </button>
                            {ROLES_LIST.map((r) => (
                                <button
                                    key={r.key}
                                    type="button"
                                    onClick={() => setFilterRole(r.key)}
                                    className={cn(
                                        "rounded-lg px-2.5 py-1 font-mono text-[11px] font-semibold transition-all shrink-0",
                                        filterRole === r.key ? "bg-accent/20 text-accent border border-accent/40" : "text-text-muted hover:text-text-primary"
                                    )}
                                >
                                    {r.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Members Table */}
                    <div className="rounded-2xl border border-white/[0.08] bg-black/30 overflow-hidden backdrop-blur-md">
                        <div className="divide-y divide-white/[0.06]">
                            {loading ? (
                                <div className="py-12 text-center text-xs font-mono text-text-muted">Loading organization members...</div>
                            ) : filtered.length === 0 ? (
                                <div className="py-12 text-center text-xs font-mono text-text-muted">No members found matching filter.</div>
                            ) : (
                                filtered.map((m) => {
                                    const roleCfg = ROLES_LIST.find((r) => r.key === m.role) || ROLES_LIST.find((r) => r.key === "visitor") || ROLES_LIST[6];
                                    const canChange = myRole === "president" || myRole === "president_admin" || myRole === "admin";



                                    return (
                                        <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-white/[0.02] transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Avatar src={m.avatarUrl || undefined} name={m.displayName} size={36} shape="circle" />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-text-primary truncate">{m.displayName}</span>
                                                        <span className="text-xs text-text-muted/70 truncate font-mono">@{m.username}</span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                        <span className={cn("px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border", roleCfg.color)}>
                                                            {roleCfg.name}
                                                        </span>
                                                        {m.team && (
                                                            <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-white/[0.04] border border-white/[0.08] text-text-secondary flex items-center gap-1">
                                                                {m.team.position === "leader" && <Crown size={10} className="text-amber-400" />}
                                                                {m.team.name} ({m.team.position})
                                                            </span>
                                                        )}
                                                        {m.staffPosition && (
                                                            <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                                                Staff: {m.staffPosition.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Role Selector Dropdown */}
                                            {canChange && (
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <select
                                                        value={m.role}
                                                        onChange={(e) => handleAssignRole(m.id, e.target.value)}
                                                        className="rounded-xl border border-white/[0.1] bg-[#121622] px-3 py-1.5 text-xs font-mono text-text-primary outline-none focus:border-accent"
                                                    >
                                                        {ROLES_LIST.map((r) => (
                                                            <option key={r.key} value={r.key}>
                                                                {r.name} (Rank {r.level})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 2. POOLS & 5 TEAMS SUBTAB */}
            {subTab === "pools_teams" && (
                <div className="space-y-6">
                    {/* Upper Pool Section */}
                    <div className="rounded-2xl border border-purple-500/30 bg-purple-500/[0.03] p-5 backdrop-blur-md">
                        <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
                            <div>
                                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-purple-400">
                                    Upper Pool
                                </span>
                                <h3 className="text-base font-bold text-text-primary">Executive &amp; Strategic Teams</h3>
                                <p className="text-xs text-text-muted mt-0.5">High-tier operational engineering (Team 1 &amp; Team 2)</p>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {upperTeams.map((team) => (
                                <TeamCard
                                    key={team.id}
                                    team={team}
                                    canManage={can("ORG_MANAGE_TEAMS") || myRole === "president" || myRole === "admin"}
                                    onOpenManage={() => setTeamModalOpen(team)}
                                    onAppointLeader={(userId) => handleAppointTeamLeader(team.id, userId)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Lower Pool Section */}
                    <div className="rounded-2xl border border-blue-500/30 bg-blue-500/[0.03] p-5 backdrop-blur-md">
                        <div className="flex items-center justify-between pb-3 border-b border-blue-500/20">
                            <div>
                                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-blue-400">
                                    Lower Pool
                                </span>
                                <h3 className="text-base font-bold text-text-primary">Collaborative &amp; Infrastructure Teams</h3>
                                <p className="text-xs text-text-muted mt-0.5">Core systems, frontend, and research operations (Teams 3–5)</p>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {lowerTeams.map((team) => (
                                <TeamCard
                                    key={team.id}
                                    team={team}
                                    canManage={can("ORG_MANAGE_TEAMS") || myRole === "president" || myRole === "admin"}
                                    onOpenManage={() => setTeamModalOpen(team)}
                                    onAppointLeader={(userId) => handleAppointTeamLeader(team.id, userId)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 3. STAFF DEPARTMENTS SUBTAB */}
            {subTab === "staff" && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {staffPositions.map((pos) => (
                            <div key={pos.id} className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.03] p-5 backdrop-blur-md flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-[10px] uppercase font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                                            {pos.name}
                                        </span>
                                        <span className="font-mono text-xs text-text-muted">{pos.staffCount} Officers</span>
                                    </div>
                                    <p className="mt-2 text-xs text-text-muted leading-relaxed">{pos.description}</p>

                                    {/* Assigned Staff List */}
                                    <div className="mt-4 space-y-2">
                                        {pos.staff.length === 0 ? (
                                            <p className="text-[11px] font-mono text-text-muted/60 italic">No staff officers assigned yet.</p>
                                        ) : (
                                            pos.staff.map((s) => (
                                                <div key={s.id} className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/[0.06]">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Avatar src={s.avatarUrl || undefined} name={s.displayName} size={24} shape="circle" />
                                                        <span className="text-xs font-bold text-text-primary truncate">{s.displayName}</span>
                                                    </div>
                                                    {(can("ORG_MANAGE_STAFF") || myRole === "president" || myRole === "admin") && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAssignStaff(pos.id, s.id, "remove")}
                                                            className="text-text-muted hover:text-danger p-1"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {(can("ORG_MANAGE_STAFF") || myRole === "president" || myRole === "admin") && (
                                    <button
                                        type="button"
                                        onClick={() => setStaffModalOpen(pos)}
                                        className="mt-5 w-full rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-2 font-mono text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <Plus size={13} /> Assign Staff Officer
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 4. EXECUTIVE LEADERSHIP SUBTAB */}
            {subTab === "executive" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* President Card */}
                        <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-400/10 to-transparent p-5 backdrop-blur-md">
                            <div className="flex items-center gap-2 text-amber-400">
                                <Crown size={18} />
                                <span className="font-mono text-xs font-bold uppercase tracking-wider">Office of the President</span>
                            </div>
                            {currentPresident ? (
                                <div className="mt-4 flex items-center gap-3">
                                    <Avatar src={currentPresident.avatarUrl || undefined} name={currentPresident.displayName} size={48} shape="circle" />
                                    <div>
                                        <h4 className="text-base font-extrabold text-text-primary">{currentPresident.displayName}</h4>
                                        <span className="font-mono text-xs text-text-muted">@{currentPresident.username}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-4 text-xs font-mono text-text-muted">No President currently assigned.</p>
                            )}

                            {(can("ORG_MANAGE_SUCCESSION") || myRole === "president" || myRole === "admin") && (
                                <button
                                    type="button"
                                    onClick={() => setSuccessionOpen(true)}
                                    className="mt-6 w-full rounded-xl bg-amber-400 px-4 py-2 font-mono text-xs font-bold text-black hover:bg-amber-300 transition-all shadow-md flex items-center justify-center gap-1.5"
                                >
                                    <Crown size={14} /> Execute Presidential Succession
                                </button>
                            )}
                        </div>

                        {/* Vice President Card */}
                        <div className="rounded-2xl border border-purple-400/40 bg-gradient-to-br from-purple-400/10 to-transparent p-5 backdrop-blur-md">
                            <div className="flex items-center gap-2 text-purple-400">
                                <Award size={18} />
                                <span className="font-mono text-xs font-bold uppercase tracking-wider">Office of the Vice President</span>
                            </div>
                            {currentVP ? (
                                <div className="mt-4 flex items-center gap-3">
                                    <Avatar src={currentVP.avatarUrl || undefined} name={currentVP.displayName} size={48} shape="circle" />
                                    <div>
                                        <h4 className="text-base font-extrabold text-text-primary">{currentVP.displayName}</h4>
                                        <span className="font-mono text-xs text-text-muted">@{currentVP.username}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-4 text-xs font-mono text-text-muted">No Vice President currently assigned.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Team Member Assignment Modal */}
            {teamModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="relative w-full max-w-[480px] rounded-[28px] border border-white/[0.12] bg-[#121722]/98 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
                        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                            <div>
                                <h3 className="text-base font-bold text-text-primary">Manage {teamModalOpen.name}</h3>
                                <p className="text-xs text-text-muted">{teamModalOpen.description}</p>
                            </div>
                            <button type="button" onClick={() => setTeamModalOpen(null)} className="text-text-muted hover:text-text-primary">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Add Member Dropdown */}
                        <div className="mt-4 flex items-center gap-2">
                            <select
                                value={selectedTeamMember}
                                onChange={(e) => setSelectedTeamMember(e.target.value)}
                                className="flex-1 rounded-xl border border-white/[0.1] bg-black/50 p-2.5 text-xs text-text-primary outline-none focus:border-accent"
                            >
                                <option value="">Select a member to add...</option>
                                {members
                                    .filter((m) => !teamModalOpen.members.some((tm) => tm.id === m.id))
                                    .map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.displayName} (@{m.username})
                                        </option>
                                    ))}
                            </select>
                            <button
                                type="button"
                                disabled={!selectedTeamMember}
                                onClick={() => handleAssignTeamMember(teamModalOpen.id, selectedTeamMember, "add")}
                                className="rounded-xl bg-accent px-4 py-2.5 font-mono text-xs font-bold text-on-accent disabled:opacity-50 transition-all"
                            >
                                Add
                            </button>
                        </div>

                        {/* Current Team Members List */}
                        <div className="mt-5 space-y-2 max-h-60 overflow-y-auto">
                            <h4 className="font-mono text-[11px] uppercase font-bold text-text-muted">Current Members ({teamModalOpen.members.length})</h4>
                            {teamModalOpen.members.map((tm) => (
                                <div key={tm.id} className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/[0.06]">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Avatar src={tm.avatarUrl || undefined} name={tm.displayName} size={28} shape="circle" />
                                        <div className="min-w-0">
                                            <span className="text-xs font-bold text-text-primary truncate block">{tm.displayName}</span>
                                            <span className="font-mono text-[10px] text-text-muted">@{tm.username} · {tm.position}</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleAssignTeamMember(teamModalOpen.id, tm.id, "remove")}
                                        className="text-text-muted hover:text-danger p-1"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Staff Officer Assignment Modal */}
            {staffModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="relative w-full max-w-[480px] rounded-[28px] border border-emerald-500/30 bg-[#121722]/98 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
                        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                            <div>
                                <h3 className="text-base font-bold text-text-primary">Assign to {staffModalOpen.name}</h3>
                                <p className="text-xs text-text-muted">{staffModalOpen.description}</p>
                            </div>
                            <button type="button" onClick={() => setStaffModalOpen(null)} className="text-text-muted hover:text-text-primary">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                            <select
                                value={selectedStaffMember}
                                onChange={(e) => setSelectedStaffMember(e.target.value)}
                                className="flex-1 rounded-xl border border-white/[0.1] bg-black/50 p-2.5 text-xs text-text-primary outline-none focus:border-emerald-400"
                            >
                                <option value="">Select a member...</option>
                                {members
                                    .filter((m) => !staffModalOpen.staff.some((s) => s.id === m.id))
                                    .map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.displayName} (@{m.username})
                                        </option>
                                    ))}
                            </select>
                            <button
                                type="button"
                                disabled={!selectedStaffMember}
                                onClick={() => {
                                    handleAssignStaff(staffModalOpen.id, selectedStaffMember, "assign");
                                    setStaffModalOpen(null);
                                }}
                                className="rounded-xl bg-emerald-500 px-4 py-2.5 font-mono text-xs font-bold text-black disabled:opacity-50 transition-all shadow-md"
                            >
                                Assign
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Succession Modal */}
            {successionOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="relative w-full max-w-[480px] rounded-[28px] border border-amber-400/30 bg-[#121722]/98 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
                        <div className="flex items-center gap-2 text-amber-400">
                            <Crown size={20} />
                            <h3 className="text-base font-bold text-text-primary">Executive Succession</h3>
                        </div>
                        <p className="mt-2 text-xs text-text-muted leading-relaxed">
                            Appointing a new President will transition the current President (
                            <strong className="text-text-primary">{currentPresident?.displayName || "Current President"}</strong>) to Vice President and record leadership history permanently.
                        </p>

                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="block text-[11px] font-mono font-bold uppercase text-text-muted mb-1">
                                    Select Incoming President
                                </label>
                                <select
                                    value={selectedNewPres}
                                    onChange={(e) => setSelectedNewPres(e.target.value)}
                                    className="w-full rounded-xl border border-white/[0.1] bg-black/50 p-2.5 text-xs text-text-primary outline-none focus:border-accent"
                                >
                                    <option value="">Select a member...</option>
                                    {members
                                        .filter((m) => m.role !== "president" && m.role !== "president_admin")
                                        .map((m) => (

                                            <option key={m.id} value={m.id}>
                                                {m.displayName} (@{m.username}) — Current: {m.roleName}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-mono font-bold uppercase text-text-muted mb-1">
                                    Transition Reason / Notes
                                </label>
                                <input
                                    value={successionReason}
                                    onChange={(e) => setSuccessionReason(e.target.value)}
                                    placeholder="e.g. Scheduled annual executive term succession"
                                    className="w-full rounded-xl border border-white/[0.1] bg-black/50 p-2.5 text-xs text-text-primary outline-none focus:border-accent"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setSuccessionOpen(false)}
                                className="rounded-xl px-4 py-2 text-xs font-mono text-text-muted hover:text-text-primary"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!selectedNewPres || successionLoading}
                                onClick={handleSuccession}
                                className="rounded-xl bg-amber-400 px-4 py-2 font-mono text-xs font-bold text-black hover:bg-amber-300 disabled:opacity-50 transition-all shadow-md"
                            >
                                {successionLoading ? "Executing..." : "Confirm Succession"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/** Individual Team Card Component */
function TeamCard({
    team,
    canManage,
    onOpenManage,
    onAppointLeader,
}: {
    team: TeamData;
    canManage: boolean;
    onOpenManage: () => void;
    onAppointLeader: (userId: string | null) => void;
}) {
    const leader = team.leader || (team.members.find((m) => m.position === "leader") as any);

    return (
        <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-4 backdrop-blur-md flex flex-col justify-between hover:border-white/[0.15] transition-all">
            <div>
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-text-primary">{team.name}</h4>
                    <span className="font-mono text-xs text-text-muted">{team.memberCount} Members</span>
                </div>
                {team.description && <p className="mt-1 text-[11px] text-text-muted leading-relaxed line-clamp-2">{team.description}</p>}

                {/* Team Leader Section */}
                <div className="mt-3.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                            <Crown size={11} /> Team Leader
                        </span>
                    </div>
                    {leader ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                                <Avatar src={leader.avatarUrl || leader.avatar_url || undefined} name={leader.displayName || leader.display_name || leader.username} size={22} shape="circle" />
                                <span className="text-xs font-bold text-text-primary truncate">{leader.displayName || leader.display_name || leader.username}</span>
                            </div>
                            {canManage && (
                                <button
                                    type="button"
                                    onClick={() => onAppointLeader(null)}
                                    className="text-[10px] font-mono text-text-muted hover:text-danger"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-text-muted italic">No leader appointed</span>
                            {canManage && team.members.length > 0 && (
                                <select
                                    onChange={(e) => onAppointLeader(e.target.value)}
                                    defaultValue=""
                                    className="rounded-lg bg-black/60 border border-white/[0.1] px-2 py-0.5 text-[10px] font-mono text-accent outline-none"
                                >
                                    <option value="" disabled>Appoint...</option>
                                    {team.members.map((m) => (
                                        <option key={m.id} value={m.id}>{m.displayName}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}
                </div>

                {/* Members Avatars List */}
                <div className="mt-3 flex items-center gap-1 flex-wrap">
                    {team.members.slice(0, 8).map((m) => (
                        <div key={m.id} title={m.displayName}>
                            <Avatar src={m.avatarUrl || undefined} name={m.displayName} size={22} shape="circle" />
                        </div>
                    ))}
                    {team.members.length > 8 && (
                        <span className="font-mono text-[10px] text-text-muted ml-1">+{team.members.length - 8}</span>
                    )}
                </div>
            </div>

            {canManage && (
                <button
                    type="button"
                    onClick={onOpenManage}
                    className="mt-4 w-full rounded-xl bg-white/[0.04] border border-white/[0.08] py-1.5 font-mono text-xs font-semibold text-text-secondary hover:bg-white/[0.08] hover:text-text-primary transition-all"
                >
                    Manage Members
                </button>
            )}
        </div>
    );
}

/**
 * Organizational Audit Logs & Leadership History Panel
 */
export function AuditHistorySettings({ spaceId }: { spaceId: string }) {
    const [logs, setLogs] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [tab, setTab] = useState<"logs" | "leadership">("logs");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api<{ logs: any[]; leadershipHistory: any[] }>(`/org/audit?spaceId=${encodeURIComponent(spaceId)}`)
            .then((data) => {
                setLogs(data.logs || []);
                setHistory(data.leadershipHistory || []);
            })
            .catch((err) => console.error("Audit load error:", err))
            .finally(() => setLoading(false));
    }, [spaceId]);

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-text-primary">Audit &amp; Leadership History</h3>
                    <p className="text-xs text-text-muted mt-0.5">Chronological record of organizational role changes, team updates, and leadership transitions.</p>
                </div>

                <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1 border border-white/[0.08]">
                    <button
                        type="button"
                        onClick={() => setTab("logs")}
                        className={cn("px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all", tab === "logs" ? "bg-accent text-on-accent" : "text-text-muted")}
                    >
                        Audit Logs ({logs.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("leadership")}
                        className={cn("px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all", tab === "leadership" ? "bg-accent text-on-accent" : "text-text-muted")}
                    >
                        Presidency History ({history.length})
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-black/30 overflow-hidden backdrop-blur-md">
                {loading ? (
                    <div className="py-12 text-center text-xs font-mono text-text-muted">Loading audit records...</div>
                ) : tab === "logs" ? (
                    <div className="divide-y divide-white/[0.06]">
                        {logs.length === 0 ? (
                            <div className="py-10 text-center text-xs font-mono text-text-muted">No audit logs recorded yet.</div>
                        ) : (
                            logs.map((l) => (
                                <div key={l.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                                    <div>
                                        <span className="font-mono text-[10px] uppercase font-bold text-accent px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30 mr-2">
                                            {l.action}
                                        </span>
                                        <span className="font-semibold text-text-primary">{l.actor?.display_name || "System"}</span>
                                        <span className="text-text-muted"> performed action on </span>
                                        <span className="font-semibold text-text-primary">{l.target?.display_name || "Workspace"}</span>
                                        {l.metadata?.role_name && (
                                            <span className="text-text-secondary"> $\to$ {l.metadata.role_name}</span>
                                        )}
                                    </div>
                                    <span className="font-mono text-[10px] text-text-muted shrink-0">
                                        {new Date(l.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-white/[0.06]">
                        {history.length === 0 ? (
                            <div className="py-10 text-center text-xs font-mono text-text-muted">No leadership transitions recorded yet.</div>
                        ) : (
                            history.map((h) => (
                                <div key={h.id} className="p-4 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <Crown size={16} className="text-amber-400 shrink-0" />
                                        <div>
                                            <h4 className="text-xs font-bold text-text-primary">{h.user?.display_name || "President"}</h4>
                                            <p className="text-[11px] text-text-muted">{h.transition_reason || "Executive term"}</p>
                                        </div>
                                    </div>
                                    <div className="font-mono text-[10px] text-text-muted text-right">
                                        <div>From: {new Date(h.starts_at).toLocaleDateString()}</div>
                                        {h.ends_at && <div>To: {new Date(h.ends_at).toLocaleDateString()}</div>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

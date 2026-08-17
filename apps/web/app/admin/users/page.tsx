"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Shield,
  Filter,
  MoreVertical,
  UserCheck,
  UserX,
  Layers,
  FolderKanban,
  Loader2,
  AlertTriangle,
  AlertOctagon,
  Check,
} from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import { api } from "@/shared/lib/api";

interface DirectoryUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  status: string;
  roleKey: string;
  roleName: string;
  hierarchyLevel: number;
  isLeadership?: boolean;
  leadershipTitle?: string | null;
  teams: Array<{ teamId: string; teamName: string; position: number; memberRole: string; pool: string }>;
  spaces: Array<{ spaceId: string; spaceName: string; spaceRole: string }>;
  skills: string[];
  interests: string[];
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Role Edit Modal State
  const [editingUser, setEditingUser] = useState<DirectoryUser | null>(null);
  const [selectedRole, setSelectedRole] = useState("member");
  const [reason, setReason] = useState("");
  const [confirmHighPrivilege, setConfirmHighPrivilege] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    if (statusFilter) params.set("status", statusFilter);

    api<{ users: DirectoryUser[] }>(`/admin/users?${params.toString()}`)
      .then((d) => setUsers(d.users || []))
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleRoleChange = async () => {
    if (!editingUser) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      await api("/admin/users/role", {
        method: "POST",
        body: JSON.stringify({
          targetUserId: editingUser.id,
          roleKey: selectedRole,
          reason,
          confirmHighPrivilege,
        }),
      });

      setEditingUser(null);
      setReason("");
      setConfirmHighPrivilege(false);
      fetchUsers();
    } catch (err: any) {
      if (err?.message?.includes("requires explicit confirmation")) {
        setConfirmHighPrivilege(true);
      }
      setErrorMessage(err.message || "Role update failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusToggle = async (user: DirectoryUser) => {
    const nextStatus = user.status === "suspended" ? "active" : "suspended";
    try {
      await api("/admin/users/status", {
        method: "POST",
        body: JSON.stringify({
          targetUserId: user.id,
          status: nextStatus,
          reason: `Admin toggle status to ${nextStatus}`,
        }),
      });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || "Failed to update status.");
    }
  };


  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Users className="text-accent" size={24} />
            Organization User Directory
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Searchable member registry with authoritative organization roles, hierarchy levels, teams, and space associations.
          </p>
        </div>
      </div>

      {/* ─── Filters & Search ─── */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#121622] p-3"
      >
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by username, display name, or email (Press Enter)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-white/[0.04] border border-white/[0.06] pl-9 pr-4 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={14} className="text-text-muted shrink-0" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent/40 font-mono"
          >
            <option value="">All Roles</option>
            <option value="president_admin">President + Admin (1100)</option>
            <option value="admin">Admin (1000)</option>
            <option value="president">President (100)</option>
            <option value="vice_president">Vice President (90)</option>
            <option value="teacher">Teacher (80)</option>
            <option value="staff">Staff (60)</option>
            <option value="member">Member (40)</option>
            <option value="visitor">Visitor (10)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent/40 font-mono"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </form>

      {/* ─── Users Table ─── */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={24} />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#121622] p-12 text-center text-xs text-text-muted font-mono">
          No users found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121622] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] bg-white/[0.02] font-mono text-[11px] uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">User</th>
                  <th className="py-3.5 px-4 font-semibold">Authoritative Role</th>
                  <th className="py-3.5 px-4 font-semibold">Teams & Pools</th>
                  <th className="py-3.5 px-4 font-semibold">Spaces</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Profile */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={u.avatarUrl || undefined}
                          name={u.displayName}
                          size={36}
                          shape="circle"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-text-primary truncate">
                            {u.displayName}
                          </div>
                          <div className="font-mono text-[11px] text-text-muted truncate">
                            @{u.username} · {u.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/25 text-accent font-mono text-[11px] font-semibold">
                        <Shield size={12} />
                        <span>{u.roleName}</span>
                        <span className="text-text-muted text-[10px] ml-1">Rank {u.hierarchyLevel}</span>
                      </div>
                    </td>

                    {/* Teams */}
                    <td className="py-3.5 px-4">
                      {u.teams.length === 0 ? (
                        <span className="font-mono text-[11px] text-text-muted/60">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.teams.map((t, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-white/[0.04] border border-white/[0.08] text-text-secondary"
                            >
                              {t.teamName} ({t.pool})
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Spaces */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs text-text-secondary">
                        {u.spaces.length} space{u.spaces.length === 1 ? "" : "s"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-wider border ${
                          u.status === "suspended"
                            ? "bg-danger/10 border-danger/30 text-danger"
                            : u.status === "pending"
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(u);
                            setSelectedRole(u.roleKey);
                            setReason("");
                            setConfirmHighPrivilege(false);
                            setErrorMessage(null);
                          }}
                          className="px-3 py-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-text-primary transition-all"
                        >
                          Edit Role
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusToggle(u)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                            u.status === "suspended"
                              ? "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                              : "bg-danger/10 border-danger/30 text-danger hover:bg-danger/20"
                          }`}
                        >
                          {u.status === "suspended" ? "Restore" : "Suspend"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Role Edit Modal ─── */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setEditingUser(null)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-[#121622] p-6 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Shield size={18} className="text-accent" />
              Change Organizational Role
            </h3>

            <p className="text-xs text-text-secondary mt-1">
              User: <strong>{editingUser.displayName}</strong> (@{editingUser.username})
            </p>

            {errorMessage && (
              <div className="mt-4 p-3 rounded-xl border border-danger/30 bg-danger/10 text-danger text-xs flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                  Select New Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value);
                    setConfirmHighPrivilege(false);
                  }}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent/40 font-mono"
                >
                  <option value="visitor">Visitor (Rank 10)</option>
                  <option value="member">Member (Rank 40)</option>
                  <option value="staff">Staff (Rank 60)</option>
                  <option value="teacher">Teacher (Rank 80)</option>
                  <option value="vice_president">Vice President (Rank 90)</option>
                  <option value="president">President (Rank 100) — High Privilege</option>
                  <option value="admin">Admin (Rank 1000) — High Privilege</option>
                  <option value="president_admin">President + Admin (Rank 1100) — High Privilege</option>
                </select>
              </div>

              {["president_admin", "admin", "president"].includes(selectedRole) && (
                <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <AlertOctagon size={16} />
                    <span>High-Privilege Safeguard</span>
                  </div>
                  <p className="text-[11px] text-amber-400/90 leading-relaxed">
                    Granting administrative role assignment will be logged permanently in the append-only audit trail.
                  </p>
                  <label className="flex items-center gap-2 pt-1 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmHighPrivilege}
                      onChange={(e) => setConfirmHighPrivilege(e.target.checked)}
                      className="rounded border-amber-500/40 text-amber-500 focus:ring-0"
                    />
                    <span className="font-semibold text-text-primary">
                      I confirm this high-privilege assignment
                    </span>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                  Reason for Role Change
                </label>
                <textarea
                  rows={2}
                  placeholder="Administrative justification..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-white/[0.06] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleRoleChange}
                className="px-5 py-2 rounded-xl bg-accent text-black text-xs font-bold hover:bg-accent/90 transition-all shadow-lg active:scale-95 flex items-center gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <span>Save Role Assignment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

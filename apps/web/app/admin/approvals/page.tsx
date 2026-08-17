"use client";

import { useState, useEffect } from "react";
import {
  UserCheck,
  Shield,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserX,
  Clock,
  Loader2,
  Filter,
  AlertOctagon,
} from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import { api } from "@/shared/lib/api";

interface ApprovalItem {
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
  createdAt: string;
  interests?: string[];
  skills?: string[];
  leadershipTitle?: string | null;
  history: any[];
}

export default function AdminApprovalsPage() {
  const [queue, setQueue] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<ApprovalItem | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "suspend" | "restore" | null>(null);
  const [targetRole, setTargetRole] = useState("member");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmHighPrivilege, setConfirmHighPrivilege] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchQueue = () => {
    setLoading(true);
    api<{ queue: ApprovalItem[] }>("/admin/approvals")
      .then((d) => setQueue(d.queue || []))
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleReview = async () => {
    if (!selectedUser || !actionType) return;
    setSubmitting(true);
    setActionError(null);

    try {
      await api("/admin/approvals/review", {
        method: "POST",
        body: JSON.stringify({
          targetUserId: selectedUser.id,
          action: actionType,
          roleKey: targetRole,
          notes,
          confirmHighPrivilege,
        }),
      });

      // Reset modal state and refresh queue
      setSelectedUser(null);
      setActionType(null);
      setNotes("");
      setConfirmHighPrivilege(false);
      fetchQueue();
    } catch (err: any) {
      if (err?.message?.includes("requires explicit confirmation")) {
        setConfirmHighPrivilege(true);
      }
      setActionError(err.message || "Review action failed.");
    } finally {
      setSubmitting(false);
    }
  };


  const filtered = queue.filter((item) => {
    const matchesSearch =
      item.username.toLowerCase().includes(search.toLowerCase()) ||
      item.displayName.toLowerCase().includes(search.toLowerCase()) ||
      item.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && item.status === "pending") ||
      (statusFilter === "active" && item.status === "active") ||
      (statusFilter === "suspended" && item.status === "suspended") ||
      (statusFilter === "visitors" && item.roleKey === "visitor");

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <UserCheck className="text-accent" size={24} />
            Approval & Review Queue
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Review newly registered users, assign appropriate organizational roles, or manage account standing.
          </p>
        </div>
      </div>

      {/* ─── Search & Filters Bar ─── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#121622] p-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name, username, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-white/[0.04] border border-white/[0.06] pl-9 pr-4 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={14} className="text-text-muted shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent/40 font-mono"
          >
            <option value="all">All Registrations</option>
            <option value="pending">Pending Status</option>
            <option value="visitors">Unassigned Visitors</option>
            <option value="active">Active Members</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* ─── Queue List ─── */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={24} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#121622] p-12 text-center text-xs text-text-muted font-mono">
          No users match the selected criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#121622] p-5 shadow-lg hover:border-white/[0.14] transition-all"
            >
              <div>
                {/* Header Profile Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={item.avatarUrl || undefined}
                      name={item.displayName}
                      size={44}
                      shape="circle"
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-text-primary truncate">
                        {item.displayName}
                      </h4>
                      <p className="text-xs font-mono text-text-muted truncate">@{item.username}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md font-mono text-[9px] font-bold uppercase tracking-wider border ${
                      item.status === "suspended"
                        ? "bg-danger/10 border-danger/30 text-danger"
                        : item.status === "pending"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Email & Details */}
                <div className="mt-3.5 space-y-1.5 text-xs text-text-secondary">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-text-muted">Email:</span>
                    <span className="truncate max-w-[160px] text-text-primary">{item.email}</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-text-muted">Current Role:</span>
                    <span className="text-accent font-semibold">{item.roleName} (Rank {item.hierarchyLevel})</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-text-muted">Joined:</span>
                    <span>{new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>

                {/* Bio / Notes */}
                {item.bio && (
                  <p className="mt-3 text-[11px] text-text-secondary/80 bg-white/[0.02] border border-white/[0.04] p-2 rounded-xl line-clamp-2">
                    {item.bio}
                  </p>
                )}

                {/* Skills Chips */}
                {item.skills && item.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {item.skills.slice(0, 3).map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-white/[0.04] border border-white/[0.06] text-text-muted"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(item);
                    setActionType("approve");
                    setTargetRole(item.roleKey === "visitor" ? "member" : item.roleKey);
                    setConfirmHighPrivilege(false);
                    setActionError(null);
                  }}
                  className="flex-1 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 active:scale-95 transition-all"
                >
                  Approve / Role
                </button>

                {item.status === "suspended" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(item);
                      setActionType("restore");
                      setActionError(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold hover:bg-blue-500/25 active:scale-95 transition-all"
                  >
                    Restore
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(item);
                      setActionType("suspend");
                      setActionError(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-danger/15 border border-danger/30 text-danger text-xs font-semibold hover:bg-danger/25 active:scale-95 transition-all"
                  >
                    Suspend
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Review / Role Assignment Modal ─── */}
      {selectedUser && actionType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-[#121622] p-6 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Shield size={18} className="text-accent" />
              {actionType === "approve"
                ? `Assign Role & Approve ${selectedUser.displayName}`
                : actionType === "suspend"
                ? `Suspend Account for ${selectedUser.displayName}`
                : `Restore Account for ${selectedUser.displayName}`}
            </h3>

            <p className="text-xs text-text-secondary mt-1">
              User: @{selectedUser.username} ({selectedUser.email})
            </p>

            {actionError && (
              <div className="mt-4 p-3 rounded-xl border border-danger/30 bg-danger/10 text-danger text-xs flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {actionType === "approve" && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                    Assign Organizational Role
                  </label>
                  <select
                    value={targetRole}
                    onChange={(e) => {
                      setTargetRole(e.target.value);
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

                {["president_admin", "admin", "president"].includes(targetRole) && (
                  <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <AlertOctagon size={16} />
                      <span>High-Privilege Safeguard</span>
                    </div>
                    <p className="text-[11px] text-amber-400/90 leading-relaxed">
                      You are granting full administrative governance authority. This action is logged permanently to the append-only audit trail.
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
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                Administrative Notes / Reason
              </label>
              <textarea
                rows={2}
                placeholder="Optional notes recorded to audit log..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 resize-none"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-white/[0.06] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleReview}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2 ${
                  actionType === "suspend"
                    ? "bg-danger text-white hover:bg-danger/90"
                    : "bg-accent text-black hover:bg-accent/90"
                }`}
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <span>
                  {actionType === "approve"
                    ? "Confirm Role & Approve"
                    : actionType === "suspend"
                    ? "Confirm Suspension"
                    : "Confirm Restore"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

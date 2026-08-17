"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Shield,
  FolderKanban,
  Layers,
  FileText,
  Crown,
  TrendingUp,
  AlertCircle,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { api } from "@/shared/lib/api";

interface OverviewData {
  stats: {
    totalUsers: number;
    pendingApprovals: number;
    roleCounts: Record<string, number>;
    activeSpaces: number;
    unofficialSpaces: number;
    activeTeams: number;
  };
  adminUser: {
    id: string;
    username: string;
    displayName: string;
    roleKey: string;
    roleName: string;
    hierarchyLevel: number;
  };
  recentAudit: any[];
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    api<OverviewData>("/admin/overview")
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  };


  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={24} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-danger/20 bg-danger/10 p-6 text-danger text-xs">
        {error || "Failed to load dashboard overview."}
      </div>
    );
  }

  const { stats, adminUser, recentAudit } = data;

  const roleList = [
    { key: "president_admin", label: "President + Admin", rank: 1100, color: "text-purple-400 border-purple-500/30 bg-purple-500/10" },
    { key: "admin", label: "Admin", rank: 1000, color: "text-red-400 border-red-500/30 bg-red-500/10" },
    { key: "president", label: "President", rank: 100, color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
    { key: "vice_president", label: "Vice President", rank: 90, color: "text-orange-400 border-orange-500/30 bg-orange-500/10" },
    { key: "teacher", label: "Teacher", rank: 80, color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
    { key: "staff", label: "Staff", rank: 60, color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" },
    { key: "member", label: "Member", rank: 40, color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
    { key: "visitor", label: "Visitor", rank: 10, color: "text-zinc-400 border-zinc-500/30 bg-zinc-500/10" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ─── Top Welcome & Banner ─── */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-r from-[#141926] via-[#10141f] to-[#0c0f17] p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -top-24 right-10 h-48 w-48 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent font-mono text-[11px] font-semibold mb-3">
              <Shield size={13} />
              <span>AIIC Executive Control Plane</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Welcome, {adminUser.displayName}
            </h1>
            <p className="text-xs text-text-secondary mt-1">
              Organization-wide oversight, user approvals, role assignments, and governance audit trail.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/approvals"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-black hover:bg-accent/90 transition-all shadow-lg active:scale-95"
            >
              <UserCheck size={15} />
              <span>Review Approvals ({stats.pendingApprovals})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Metric KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/[0.08] bg-[#121622] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">Total Users</span>
            <Users size={16} className="text-accent" />
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-bold font-mono text-text-primary">
            {stats.totalUsers}
          </p>
          <span className="text-[11px] text-text-muted/80 mt-1 block">Registered in database</span>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#121622] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">Pending Review</span>
            <UserCheck size={16} className="text-amber-400" />
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-bold font-mono text-amber-400">
            {stats.pendingApprovals}
          </p>
          <span className="text-[11px] text-text-muted/80 mt-1 block">Awaiting role approval</span>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#121622] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">Active Spaces</span>
            <FolderKanban size={16} className="text-blue-400" />
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-bold font-mono text-text-primary">
            {stats.activeSpaces}
          </p>
          <span className="text-[11px] text-text-muted/80 mt-1 block">
            {stats.unofficialSpaces} unofficial team spaces
          </span>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#121622] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">Teams</span>
            <Layers size={16} className="text-emerald-400" />
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-bold font-mono text-text-primary">
            {stats.activeTeams}
          </p>
          <span className="text-[11px] text-text-muted/80 mt-1 block">Upper & Lower Pool teams</span>
        </div>
      </div>

      {/* ─── Role Distribution & Hierarchy ─── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#121622] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Shield size={16} className="text-accent" />
              Organizational Role Distribution
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Live hierarchy and active assigned headcounts across the 8 organizational ranks.
            </p>
          </div>
          <Link
            href="/admin/roles"
            className="inline-flex items-center gap-1 text-xs font-mono text-accent hover:underline"
          >
            <span>Manage Roles</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {roleList.map((r) => {
            const count = stats.roleCounts[r.key] || 0;
            return (
              <div
                key={r.key}
                className="flex flex-col justify-between p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-md font-mono text-[9px] font-bold uppercase tracking-wider border ${r.color}`}>
                    Rank {r.rank}
                  </span>
                  <span className="font-mono text-sm font-bold text-text-primary">
                    {count}
                  </span>
                </div>
                <span className="text-xs font-semibold text-text-primary mt-2 truncate">
                  {r.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Recent Governance Activity ─── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#121622] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Clock size={16} className="text-accent" />
              Recent Administrative Activity
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Immutable audit records of recent role mutations, approvals, and team appointments.
            </p>
          </div>
          <Link
            href="/admin/audit"
            className="inline-flex items-center gap-1 text-xs font-mono text-accent hover:underline"
          >
            <span>Full Audit Log</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {recentAudit.length === 0 ? (
          <div className="py-8 text-center text-xs text-text-muted font-mono">
            No recent audit events recorded.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.06] bg-white/[0.01] overflow-hidden">
            {recentAudit.map((log: any) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-2 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-accent shrink-0">
                    {log.action}
                  </span>
                  <span className="text-xs text-text-secondary truncate">
                    <strong className="text-text-primary">
                      {log.actor?.displayName || log.actor?.username || "System"}
                    </strong>
                    {log.target && (
                      <>
                        {" → "}
                        <span className="text-text-primary font-medium">
                          {log.target?.displayName || log.target?.username}
                        </span>
                      </>
                    )}
                    {log.metadata?.reason && (
                      <span className="text-text-muted ml-1.5 font-mono text-[11px]">
                        ({log.metadata.reason})
                      </span>
                    )}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-text-muted shrink-0">
                  {new Date(log.created_at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

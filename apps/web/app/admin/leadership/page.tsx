"use client";

import { useState, useEffect } from "react";
import {
  Crown,
  Shield,
  Clock,
  UserCheck,
  AlertOctagon,
  Loader2,
  AlertTriangle,
  ArrowRight,
  History,
} from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import { api } from "@/shared/lib/api";

interface Officer {
  id: string;
  role_id: string;
  user_id: string;
  user: { id: string; username: string; displayName: string; avatarUrl?: string | null; email: string };
  role: { id: string; key: string; name: string; hierarchyLevel: number };
  starts_at?: string;
  assigned_at?: string;
}

interface SuccessionRecord {
  id: string;
  user_id: string;
  role_id: string;
  starts_at: string;
  ends_at?: string | null;
  transition_reason: string;
  notes?: string | null;
  created_at: string;
  user?: { id: string; username: string; displayName: string; avatarUrl?: string | null; email: string };
  appointer?: { id: string; username: string; displayName: string };
  role?: { id: string; key: string; name: string; hierarchyLevel: number };
}

export default function AdminLeadershipPage() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [history, setHistory] = useState<SuccessionRecord[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Presidential Succession Modal
  const [showSuccessionModal, setShowSuccessionModal] = useState(false);
  const [successorUserId, setSuccessorUserId] = useState("");
  const [transitionReason, setTransitionReason] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmSuccession, setConfirmSuccession] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeadershipData = () => {
    setLoading(true);
    Promise.all([
      api<{ currentOfficers: Officer[]; history: SuccessionRecord[] }>("/admin/leadership"),
      api<{ users: any[] }>("/admin/users"),
    ])
      .then(([leadData, usersData]) => {
        setOfficers(leadData.currentOfficers || []);
        setHistory(leadData.history || []);
        setAllUsers(usersData.users || []);
      })
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLeadershipData();
  }, []);

  const handleSuccession = async () => {
    if (!successorUserId || !confirmSuccession) return;
    setSubmitting(true);
    setError(null);

    try {
      await api("/admin/leadership/succession", {
        method: "POST",
        body: JSON.stringify({
          targetUserId: successorUserId,
          transitionReason,
          notes,
          confirmSuccession,
        }),
      });

      setShowSuccessionModal(false);
      setSuccessorUserId("");
      setTransitionReason("");
      setNotes("");
      setConfirmSuccession(false);
      fetchLeadershipData();
    } catch (err: any) {
      setError(err.message || "Succession failed.");
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Crown className="text-accent" size={24} />
            Executive Leadership & Succession
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Current executive officer roster and official historical presidential succession archive.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowSuccessionModal(true);
            setError(null);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-500/30 px-4 py-2.5 text-xs font-bold text-amber-400 hover:bg-amber-500/25 transition-all shadow-lg active:scale-95"
        >
          <Crown size={15} />
          <span>Execute Presidential Succession</span>
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={24} />
        </div>
      ) : (
        <div className="space-y-8">
          {/* ─── Current Executive Officers ─── */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Shield size={16} className="text-accent" />
              Active Executive Tier
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {officers.map((off) => (
                <div
                  key={off.id}
                  className="flex flex-col justify-between p-5 rounded-2xl border border-white/[0.08] bg-[#121622] shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md font-mono text-[9px] font-bold uppercase tracking-wider bg-accent/10 border border-accent/25 text-accent">
                        {off.role?.name} (Rank {off.role?.hierarchyLevel})
                      </span>
                      <Crown size={14} className="text-amber-400" />
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <Avatar
                        src={off.user?.avatarUrl || undefined}
                        name={off.user?.displayName || "Officer"}
                        size={40}
                        shape="circle"
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-text-primary truncate">
                          {off.user?.displayName}
                        </h4>
                        <span className="font-mono text-xs text-text-muted truncate block">
                          @{off.user?.username}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.06] font-mono text-[10px] text-text-muted">
                    <span>Assigned: {new Date(off.starts_at || off.assigned_at || "").toLocaleDateString([], { month: "short", year: "numeric" })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Succession History ─── */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <History size={16} className="text-accent" />
              Presidential Succession & Leadership History
            </h2>

            {history.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#121622] p-8 text-center text-xs text-text-muted font-mono">
                No leadership transition events recorded yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121622] shadow-xl divide-y divide-white/[0.04]">
                {history.map((record) => (
                  <div
                    key={record.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                        <Crown size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-text-primary flex items-center gap-2">
                          <span>{record.user?.displayName || "President"}</span>
                          <span className="text-text-muted font-mono font-normal">
                            (@{record.user?.username})
                          </span>
                        </div>
                        <p className="text-[11px] text-text-secondary mt-0.5">
                          {record.transition_reason || "Executive appointment"}
                          {record.appointer && (
                            <span className="text-text-muted ml-1">
                              · Appointed by {record.appointer.displayName}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right font-mono text-[11px] text-text-muted shrink-0">
                      <div>
                        {new Date(record.starts_at || record.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <span className="text-[10px] text-accent">
                        {record.ends_at ? `Ended ${new Date(record.ends_at).toLocaleDateString()}` : "Current Term"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Presidential Succession Modal ─── */}
      {showSuccessionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowSuccessionModal(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-amber-500/30 bg-[#121622] p-6 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
              <Crown size={18} />
              Executive Presidential Succession
            </h3>

            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              Formally appoint and transition the President organizational role to an elected successor.
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
                  Select Successor
                </label>
                <select
                  value={successorUserId}
                  onChange={(e) => setSuccessorUserId(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-amber-500/40 font-mono"
                >
                  <option value="">-- Select Successor Member --</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} (@{u.username}) — {u.roleName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                  Transition Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Annual Executive Transition"
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-amber-500/40"
                />
              </div>

              <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <AlertOctagon size={16} />
                  <span>Succession Confirmation</span>
                </div>
                <p className="text-[11px] text-amber-400/90 leading-relaxed">
                  This transfers presidential organizational authority and records a permanent entry into the leadership succession history.
                </p>
                <label className="flex items-center gap-2 pt-1 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmSuccession}
                    onChange={(e) => setConfirmSuccession(e.target.checked)}
                    className="rounded border-amber-500/40 text-amber-500 focus:ring-0"
                  />
                  <span className="font-semibold text-text-primary">
                    I confirm this presidential succession
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowSuccessionModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-white/[0.06] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || !successorUserId || !confirmSuccession}
                onClick={handleSuccession}
                className="px-5 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <span>Execute Succession</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

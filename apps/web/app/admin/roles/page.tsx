"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Shield,
  Users,
  KeyRound,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import { api } from "@/shared/lib/api";

interface RoleItem {
  id: string;
  key: string;
  name: string;
  hierarchyLevel: number;
  holders: Array<{ id: string; username: string; displayName: string; avatarUrl?: string | null; email: string }>;
  holderCount: number;
  permissions: Array<{ id: string; key: string; name: string; description: string }>;
  permissionCount: number;
  createdAt: string;
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const fetchRoles = () => {
    setLoading(true);
    api<{ roles: RoleItem[] }>("/admin/roles")
      .then((d) => setRoles(d.roles || []))
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));
  };


  useEffect(() => {
    fetchRoles();
  }, []);

  const getRoleColor = (key: string) => {
    switch (key) {
      case "president_admin":
        return "text-purple-400 border-purple-500/30 bg-purple-500/10";
      case "admin":
        return "text-red-400 border-red-500/30 bg-red-500/10";
      case "president":
        return "text-amber-400 border-amber-500/30 bg-amber-500/10";
      case "vice_president":
        return "text-orange-400 border-orange-500/30 bg-orange-500/10";
      case "teacher":
        return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
      case "staff":
        return "text-cyan-400 border-cyan-500/30 bg-cyan-500/10";
      case "member":
        return "text-blue-400 border-blue-500/30 bg-blue-500/10";
      default:
        return "text-zinc-400 border-zinc-500/30 bg-zinc-500/10";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <ShieldAlert className="text-accent" size={24} />
            Roles & Governance Architecture
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Authoritative organizational role tiers, hierarchy levels, active role holders, and associated permissions.
          </p>
        </div>
      </div>

      {/* ─── Role Cards List ─── */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={24} />
        </div>
      ) : (
        <div className="space-y-4">
          {roles.map((role) => {
            const isExpanded = expandedRole === role.id;
            const badgeClass = getRoleColor(role.key);

            return (
              <div
                key={role.id}
                className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121622] shadow-xl transition-all"
              >
                {/* Header Summary Row */}
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${badgeClass} shadow-inner`}>
                      <Shield size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-text-primary">
                          {role.name}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-md font-mono text-[9px] font-bold uppercase tracking-wider border ${badgeClass}`}>
                          Rank {role.hierarchyLevel}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-text-muted mt-0.5">
                        Key: <code className="text-text-secondary">{role.key}</code>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-left sm:text-right">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-text-primary">
                        <Users size={13} className="text-text-muted" />
                        <span>{role.holderCount} active holder{role.holderCount === 1 ? "" : "s"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-text-muted mt-0.5">
                        <KeyRound size={11} />
                        <span>{role.permissionCount} permissions</span>
                      </div>
                    </div>

                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-text-muted hover:text-text-primary">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] bg-black/20 p-5 space-y-5 animate-in fade-in duration-200">
                    {/* Current Holders Section */}
                    <div>
                      <h4 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2.5 flex items-center gap-2">
                        <Users size={13} />
                        Active Role Holders ({role.holders.length})
                      </h4>

                      {role.holders.length === 0 ? (
                        <p className="text-xs font-mono text-text-muted/60 italic">
                          No users are currently assigned to this role.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {role.holders.map((holder) => (
                            <div
                              key={holder.id}
                              className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02]"
                            >
                              <Avatar
                                src={holder.avatarUrl || undefined}
                                name={holder.displayName}
                                size={28}
                                shape="circle"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-text-primary truncate">
                                  {holder.displayName}
                                </div>
                                <div className="text-[10px] font-mono text-text-muted truncate">
                                  @{holder.username}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Permissions Section */}
                    <div>
                      <h4 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2.5 flex items-center gap-2">
                        <KeyRound size={13} />
                        Assigned Permissions ({role.permissions.length})
                      </h4>

                      {role.permissions.length === 0 ? (
                        <p className="text-xs font-mono text-text-muted/60 italic">
                          No explicit permissions assigned.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {role.permissions.map((perm) => (
                            <span
                              key={perm.id}
                              title={perm.description || perm.name}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono bg-white/[0.04] border border-white/[0.08] text-text-secondary hover:text-text-primary hover:border-white/20 transition-all"
                            >
                              <CheckCircle size={10} className="text-accent" />
                              <span>{perm.key}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

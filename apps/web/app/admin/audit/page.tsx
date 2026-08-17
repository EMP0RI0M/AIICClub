"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Filter,
  Shield,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Code,
} from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import { api } from "@/shared/lib/api";

interface AuditLogItem {
  id: string;
  server_id?: string | null;
  actor_user_id?: string | null;
  target_user_id?: string | null;
  action: string;
  category: string;
  entity_type: string;
  entity_id: string;
  metadata: any;
  created_at: string;
  actor?: { id: string; username: string; displayName: string; avatarUrl?: string | null; email: string } | null;
  target?: { id: string; username: string; displayName: string; avatarUrl?: string | null; email: string } | null;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", "25");
    if (categoryFilter) params.set("category", categoryFilter);
    if (actionFilter) params.set("action", actionFilter);
    if (search) params.set("search", search);

    api<{ logs: AuditLogItem[]; totalPages: number; totalCount: number }>(`/admin/audit?${params.toString()}`)
      .then((d) => {
        setLogs(d.logs || []);
        setTotalPages(d.totalPages || 1);
        setTotalCount(d.totalCount || 0);
      })
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));
  };


  useEffect(() => {
    fetchLogs();
  }, [page, categoryFilter, actionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <FileText className="text-accent" size={24} />
            Governance Audit Log
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Immutable, append-only records of all governance actions, role mutations, approvals, and administrative events.
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
            placeholder="Search by action, actor, target, or metadata (Press Enter)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-white/[0.04] border border-white/[0.06] pl-9 pr-4 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={14} className="text-text-muted shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent/40 font-mono"
          >
            <option value="">All Categories</option>
            <option value="governance">Governance</option>
            <option value="organization">Organization</option>
            <option value="leadership">Leadership</option>
          </select>
        </div>
      </form>

      {/* ─── Audit Log Table ─── */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={24} />
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#121622] p-12 text-center text-xs text-text-muted font-mono">
          No audit records found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121622] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] bg-white/[0.02] font-mono text-[11px] uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                  <th className="py-3.5 px-4 font-semibold">Action</th>
                  <th className="py-3.5 px-4 font-semibold">Actor</th>
                  <th className="py-3.5 px-4 font-semibold">Target / Resource</th>
                  <th className="py-3.5 px-4 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 font-mono text-[11px] text-text-muted whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-wider bg-accent/10 border border-accent/25 text-accent">
                          {log.action}
                        </span>
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {log.actor ? (
                            <>
                              <Avatar
                                src={log.actor.avatarUrl || undefined}
                                name={log.actor.displayName}
                                size={22}
                                shape="circle"
                              />
                              <span className="font-semibold text-text-primary truncate">
                                {log.actor.displayName}
                              </span>
                            </>
                          ) : (
                            <span className="font-mono text-text-muted">System</span>
                          )}
                        </div>
                      </td>

                      {/* Target */}
                      <td className="py-3 px-4">
                        {log.target ? (
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={log.target.avatarUrl || undefined}
                              name={log.target.displayName}
                              size={22}
                              shape="circle"
                            />
                            <span className="font-medium text-text-primary truncate">
                              {log.target.displayName}
                            </span>
                          </div>
                        ) : (
                          <span className="font-mono text-text-muted text-[11px]">
                            {log.entity_type} ({log.entity_id?.slice(0, 8)}...)
                          </span>
                        )}
                      </td>

                      {/* Details / JSON payload */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-mono text-[11px] text-text-secondary truncate max-w-xs">
                            {log.metadata?.reason ||
                              log.metadata?.notes ||
                              (log.metadata?.new_role ? `Role: ${log.metadata.new_role}` : JSON.stringify(log.metadata || {}))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
                            title="Inspect JSON metadata"
                          >
                            <Code size={13} />
                          </button>
                        </div>

                        {isExpanded && (
                          <pre className="mt-2 p-2.5 rounded-xl bg-black/40 border border-white/[0.06] text-[10px] font-mono text-emerald-400 overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between p-3.5 border-t border-white/[0.06] font-mono text-xs text-text-muted">
            <span>
              Showing page {page} of {totalPages} ({totalCount} total entries)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

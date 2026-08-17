"use client";

import { useState, useEffect } from "react";
import {
  FolderKanban,
  Hash,
  Users,
  Shield,
  Search,
  Trash2,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/shared/lib/api";

interface SpaceItem {
  id: string;
  name: string;
  iconUrl?: string | null;
  description?: string | null;
  ownerId: string;
  owner: { id: string; username: string; displayName: string; email: string } | null;
  isOfficial: boolean;
  channelCount: number;
  channelTypes: string[];
  memberCount: number;
  createdAt: string;
}

export default function AdminSpacesPage() {
  const [spaces, setSpaces] = useState<SpaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingSpace, setDeletingSpace] = useState<SpaceItem | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSpaces = () => {
    setLoading(true);
    api<{ spaces: SpaceItem[] }>("/admin/spaces")
      .then((d) => setSpaces(d.spaces || []))
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  const handleDeleteSpace = async () => {
    if (!deletingSpace) return;
    setSubmitting(true);
    setError(null);

    try {
      await api("/admin/spaces/manage", {
        method: "POST",
        body: JSON.stringify({
          spaceId: deletingSpace.id,
          action: "delete",
          reason: deleteReason,
        }),
      });

      setDeletingSpace(null);
      setDeleteReason("");
      fetchSpaces();
    } catch (err: any) {
      setError(err.message || "Failed to delete space.");
    } finally {
      setSubmitting(false);
    }
  };


  const filtered = spaces.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.owner?.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    s.owner?.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <FolderKanban className="text-accent" size={24} />
            Organization Spaces Oversight
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Global governance of official club spaces and unofficial team spaces. President and Admin maintain oversight of all spaces.
          </p>
        </div>
      </div>

      {/* ─── Search Bar ─── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#121622] p-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search spaces by name or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-white/[0.04] border border-white/[0.06] pl-9 pr-4 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40"
          />
        </div>
      </div>

      {/* ─── Spaces Grid ─── */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={24} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#121622] p-12 text-center text-xs text-text-muted font-mono">
          No spaces found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#121622] p-5 shadow-lg hover:border-white/[0.14] transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.08] text-accent font-bold font-mono">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-text-primary truncate">
                        {s.name}
                      </h3>
                      <span className="font-mono text-[10px] text-text-muted">
                        ID: {s.id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md font-mono text-[9px] font-bold uppercase tracking-wider border ${
                      s.isOfficial
                        ? "bg-accent/10 border-accent/30 text-accent"
                        : "bg-white/[0.04] border-white/[0.08] text-text-muted"
                    }`}
                  >
                    {s.isOfficial ? "Official" : "Unofficial"}
                  </span>
                </div>

                {s.description && (
                  <p className="mt-3 text-xs text-text-secondary leading-relaxed line-clamp-2">
                    {s.description}
                  </p>
                )}

                <div className="mt-4 space-y-1.5 font-mono text-xs text-text-secondary">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-muted">Creator / Owner:</span>
                    <span className="text-text-primary font-semibold truncate max-w-[150px]">
                      {s.owner?.displayName || s.owner?.username || "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-muted">Channels:</span>
                    <span className="text-text-primary">{s.channelCount} channels</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-muted">Members:</span>
                    <span className="text-text-primary">{s.memberCount} members</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-muted">Created:</span>
                    <span>{new Date(s.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>

                {s.channelTypes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {s.channelTypes.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-[9px] font-mono bg-white/[0.03] border border-white/[0.06] text-text-muted"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between gap-2">
                <Link
                  href={`/app?space=${s.id}`}
                  className="flex-1 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-text-primary text-center transition-all inline-flex items-center justify-center gap-1.5"
                >
                  <span>Enter Space</span>
                  <ExternalLink size={12} />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setDeletingSpace(s);
                    setDeleteReason("");
                    setError(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-danger/10 hover:bg-danger/20 border border-danger/25 text-danger text-xs font-semibold transition-all"
                  title="Delete Space"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Delete Space Confirmation Modal ─── */}
      {deletingSpace && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setDeletingSpace(null)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-danger/30 bg-[#121622] p-6 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-danger flex items-center gap-2">
              <AlertTriangle size={18} />
              Delete Space: {deletingSpace.name}
            </h3>

            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              This will permanently remove the space, all its channels, messages, and memberships. This action cannot be undone and will be recorded in the audit log.
            </p>

            {error && (
              <div className="mt-4 p-3 rounded-xl border border-danger/30 bg-danger/10 text-danger text-xs">
                {error}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                Reason for Deletion
              </label>
              <textarea
                rows={2}
                placeholder="Administrative reason..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-danger/40 resize-none"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingSpace(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-white/[0.06] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteSpace}
                className="px-5 py-2 rounded-xl bg-danger text-white text-xs font-bold hover:bg-danger/90 transition-all shadow-lg active:scale-95 flex items-center gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <span>Confirm Deletion</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

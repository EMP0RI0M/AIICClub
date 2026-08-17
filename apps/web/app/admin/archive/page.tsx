"use client";

import { useState, useEffect } from "react";
import {
  FolderGit2,
  FileText,
  Upload,
  Plus,
  RefreshCw,
  ExternalLink,
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock,
  Tag,
  Search,
} from "lucide-react";
import type { AIICArchiveRecord, AIICArchiveStats } from "@/shared/lib/archive-types";

export default function AdminArchivePage() {
  const [records, setRecords] = useState<AIICArchiveRecord[]>([]);
  const [stats, setStats] = useState<AIICArchiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddRepo, setShowAddRepo] = useState(false);
  const [showUploadDoc, setShowUploadDoc] = useState(false);

  // Form states
  const [repoUrl, setRepoUrl] = useState("");
  const [repoSession, setRepoSession] = useState("2026–27");
  const [submittingRepo, setSubmittingRepo] = useState(false);
  const [repoError, setRepoError] = useState("");
  const [repoSuccess, setRepoSuccess] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/archive/records");
      const data = await res.json();
      if (data.records) setRecords(data.records);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error("Error loading archive admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddRepository = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRepo(true);
    setRepoError("");
    setRepoSuccess("");

    try {
      const res = await fetch("/api/archive/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubUrl: repoUrl,
          session: repoSession,
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setRepoError(data.error || "Failed to register repository.");
      } else {
        setRepoSuccess(`Repository successfully registered as ${data.record?.archiveId}!`);
        setRepoUrl("");
        loadData();
        setTimeout(() => setShowAddRepo(false), 2000);
      }
    } catch (err: any) {
      setRepoError(err.message || "Failed to submit repository.");
    } finally {
      setSubmittingRepo(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Institutional Archive Management</h1>
          <p className="mt-1 text-xs text-text-secondary">
            Register GitHub repositories, upload institutional documents, and manage archive IDs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowAddRepo(!showAddRepo);
              setShowUploadDoc(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 font-mono text-xs font-semibold text-on-accent hover:bg-accent-violet-bright transition-colors"
          >
            <Plus size={13} /> Add Repository
          </button>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text-muted hover:text-text-primary"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 font-mono">
          <div className="rounded-lg border border-border bg-surface-raised p-4">
            <span className="text-[11px] text-text-muted">Total Records</span>
            <p className="mt-1 text-2xl font-bold text-accent">{stats.totalRecords}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-raised p-4">
            <span className="text-[11px] text-text-muted">Indexed Repos</span>
            <p className="mt-1 text-2xl font-bold text-text-primary">{stats.totalRepositories}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-raised p-4">
            <span className="text-[11px] text-text-muted">Documents</span>
            <p className="mt-1 text-2xl font-bold text-info">{stats.totalDocuments}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-raised p-4">
            <span className="text-[11px] text-text-muted">Current Session</span>
            <p className="mt-1 text-2xl font-bold text-live">2026–27</p>
          </div>
        </div>
      )}

      {/* Add Repository Modal/Form */}
      {showAddRepo && (
        <div className="rounded-xl border border-accent/40 bg-surface-raised p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-mono text-sm font-bold text-text-primary">
              <FolderGit2 size={16} className="text-accent" /> Register GitHub Repository
            </h2>
            <button
              onClick={() => setShowAddRepo(false)}
              className="font-mono text-xs text-text-muted hover:text-text-primary"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleAddRepository} className="space-y-4">
            <div>
              <label className="block font-mono text-xs text-text-secondary">GitHub Repository URL</label>
              <input
                type="text"
                required
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/AIIC-Organization/aiic-platform"
                className="mt-1 h-9 w-full rounded-md border border-border bg-bg-deep px-3 font-mono text-xs text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-xs text-text-secondary">Academic Session</label>
                <select
                  value={repoSession}
                  onChange={(e) => setRepoSession(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-border bg-bg-deep px-2 font-mono text-xs text-text-primary focus:border-accent focus:outline-none"
                >
                  <option value="2026–27">2026–27</option>
                  <option value="2025–26">2025–26</option>
                </select>
              </div>
            </div>

            {repoError && (
              <p className="flex items-center gap-1.5 font-mono text-xs text-danger">
                <AlertCircle size={13} /> {repoError}
              </p>
            )}

            {repoSuccess && (
              <p className="flex items-center gap-1.5 font-mono text-xs text-live">
                <CheckCircle2 size={13} /> {repoSuccess}
              </p>
            )}

            <button
              type="submit"
              disabled={submittingRepo}
              className="rounded-md bg-accent px-4 py-2 font-mono text-xs font-semibold text-on-accent hover:bg-accent-violet-bright disabled:opacity-50"
            >
              {submittingRepo ? "Validating & Indexing..." : "Index Repository"}
            </button>
          </form>
        </div>
      )}

      {/* Record Index Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
        <div className="border-b border-border bg-surface px-4 py-3 font-mono text-xs font-bold text-text-primary">
          Indexed Archive Records
        </div>

        {loading ? (
          <div className="p-8 text-center font-mono text-xs text-text-muted">Loading records...</div>
        ) : records.length > 0 ? (
          <div className="divide-y divide-border/50">
            {records.map((r) => (
              <div key={r.archiveId} className="flex items-center justify-between p-4 hover:bg-hover-row">
                <div className="space-y-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="font-bold text-accent">{r.archiveId}</span>
                    <span className="rounded bg-bg-deep px-1.5 py-0.2 text-[10px] text-text-muted uppercase border border-border">
                      {r.type}
                    </span>
                    <span className="text-text-faint">{r.session}</span>
                  </div>
                  <h3 className="truncate text-sm font-semibold text-text-primary">{r.title}</h3>
                  <p className="truncate text-xs text-text-muted">{r.description}</p>
                </div>

                <div className="flex shrink-0 items-center gap-3 font-mono text-xs">
                  {r.repository && (
                    <a
                      href={`/archive/repositories/${r.repository.githubOwner}/${r.repository.githubName}`}
                      className="rounded border border-border bg-bg-deep px-2.5 py-1 text-text-primary hover:border-accent hover:text-accent"
                    >
                      View Live
                    </a>
                  )}
                  {r.document && (
                    <a
                      href={`/archive/${r.archiveId}`}
                      className="rounded border border-border bg-bg-deep px-2.5 py-1 text-text-primary hover:border-accent hover:text-accent"
                    >
                      View Record
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center font-mono text-xs text-text-muted">No records found.</div>
        )}
      </div>
    </div>
  );
}

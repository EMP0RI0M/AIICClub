"use client";

import { useState, useEffect } from "react";
import {
  FolderGit2,
  FileText,
  Video,
  HardDrive,
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
  Edit,
  Trash2,
  Check,
  Loader2,
} from "lucide-react";
import type { AIICArchiveRecord, AIICArchiveStats } from "@/shared/lib/archive-types";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { getSupabaseClient } from "@/shared/supabase/client";

export default function AdminArchivePage() {
  const [records, setRecords] = useState<AIICArchiveRecord[]>([]);
  const [stats, setStats] = useState<AIICArchiveStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AIICArchiveRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<AIICArchiveRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Form states
  const [formType, setFormType] = useState<"document" | "video" | "repository" | "build">("document");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("Official Study Notes");
  const [formSession, setFormSession] = useState("2026–27");
  const [formTags, setFormTags] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formYoutubeUrl, setFormYoutubeUrl] = useState("");
  const [formSpeaker, setFormSpeaker] = useState("Rafi Ullah Khan");
  const [formDuration, setFormDuration] = useState("");
  const [formGithubUrl, setFormGithubUrl] = useState("");
  const [formVersion, setFormVersion] = useState("v1.0.0");
  const [formBuildUrl, setFormBuildUrl] = useState("");
  const [formEnvironment, setFormEnvironment] = useState<"production" | "staging" | "preview" | "release">("production");

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

  const resetForm = () => {
    setFormType("document");
    setFormTitle("");
    setFormDescription("");
    setFormCategory("Official Study Notes");
    setFormSession("2026–27");
    setFormTags("lecture, web basics");
    setFormContent("");
    setFormYoutubeUrl("");
    setFormSpeaker("Rafi Ullah Khan");
    setFormDuration("");
    setFormGithubUrl("");
    setFormVersion("v1.0.0");
    setFormBuildUrl("");
    setFormEnvironment("production");
    setActionError("");
    setActionSuccess("");
  };

  const openEditModal = (rec: AIICArchiveRecord) => {
    setEditingRecord(rec);
    setFormType((rec.type as any) || "document");
    setFormTitle(rec.title || "");
    setFormDescription(rec.description || "");
    setFormCategory(rec.document?.category || "Official Study Notes");
    setFormSession(rec.session || "2026–27");
    setFormTags((rec.tags || []).join(", "));
    setFormContent("");
    setFormYoutubeUrl(rec.video?.youtubeUrl || "");
    setFormSpeaker(rec.video?.speaker || "");
    setFormDuration(rec.video?.duration || "");
    setFormGithubUrl(rec.repository?.githubUrl || "");
    setFormVersion(rec.build?.version || "");
    setFormBuildUrl(rec.build?.buildUrl || "");
    setFormEnvironment((rec.build?.environment as any) || "production");
    setActionError("");
    setActionSuccess("");
    setIsEditModalOpen(true);
  };

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setActionError("Title is required.");
      return;
    }

    setIsSubmitting(true);
    setActionError("");
    setActionSuccess("");

    try {
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || useAuthStore.getState().token;

      const tagsArray = formTags.split(",").map((t) => t.trim()).filter(Boolean);

      const payload: any = {
        type: formType,
        title: formTitle.trim(),
        description: formDescription.trim(),
        session: formSession,
        tags: tagsArray,
      };

      if (formType === "document") {
        payload.category = formCategory;
        payload.content = formContent.trim();
      } else if (formType === "video") {
        payload.youtubeUrl = formYoutubeUrl.trim();
        payload.speaker = formSpeaker.trim();
        payload.duration = formDuration.trim();
      } else if (formType === "repository") {
        payload.githubUrl = formGithubUrl.trim();
      } else if (formType === "build") {
        payload.version = formVersion.trim();
        payload.buildUrl = formBuildUrl.trim();
        payload.environment = formEnvironment;
      }

      const res = await fetch("/api/archive/records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to create archive source.");
      }

      setActionSuccess(`Source successfully registered with ID ${data.record?.archiveId}!`);
      loadData();
      setTimeout(() => {
        setShowAddModal(false);
        resetForm();
      }, 1500);
    } catch (err: any) {
      setActionError(err.message || "Failed to create source.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    setIsSubmitting(true);
    setActionError("");
    setActionSuccess("");

    try {
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || useAuthStore.getState().token;

      const tagsArray = formTags.split(",").map((t) => t.trim()).filter(Boolean);

      const payload: any = {
        archiveId: editingRecord.archiveId,
        title: formTitle.trim(),
        description: formDescription.trim(),
        session: formSession,
        tags: tagsArray,
      };

      if (formType === "document") {
        payload.category = formCategory;
      } else if (formType === "video") {
        payload.youtubeUrl = formYoutubeUrl.trim();
        payload.speaker = formSpeaker.trim();
        payload.duration = formDuration.trim();
      } else if (formType === "repository") {
        payload.githubUrl = formGithubUrl.trim();
      } else if (formType === "build") {
        payload.version = formVersion.trim();
        payload.buildUrl = formBuildUrl.trim();
        payload.environment = formEnvironment;
      }

      const res = await fetch("/api/archive/records", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to update archive record.");
      }

      setActionSuccess(`Archive record ${editingRecord.archiveId} updated successfully.`);
      loadData();
      setTimeout(() => {
        setIsEditModalOpen(false);
        setEditingRecord(null);
      }, 1500);
    } catch (err: any) {
      setActionError(err.message || "Failed to update record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSource = async () => {
    if (!deletingRecord) return;

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || useAuthStore.getState().token;

      const res = await fetch(`/api/archive/records?archiveId=${deletingRecord.archiveId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to delete archive record.");
      }

      setRecords((prev) => prev.filter((r) => r.archiveId !== deletingRecord.archiveId));
      setDeletingRecord(null);
    } catch (err: any) {
      alert(`Error deleting record: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Institutional Archive Management</h1>
          <p className="mt-1 text-xs text-text-secondary">
            Register new lectures, YouTube recordings, GitHub repositories, documents, and manage archive records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 font-mono text-xs font-semibold text-on-accent hover:bg-accent-violet-bright transition-colors shadow-sm"
          >
            <Plus size={14} /> Add Archive Source
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

      {/* Record Index Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
        <div className="border-b border-border bg-surface px-4 py-3 font-mono text-xs font-bold text-text-primary flex items-center justify-between">
          <span>Indexed Archive Records ({records.length})</span>
          <span className="text-[10px] text-text-muted font-normal">Actions: View, Edit, Delete</span>
        </div>

        {loading ? (
          <div className="p-8 text-center font-mono text-xs text-text-muted">Loading records...</div>
        ) : records.length > 0 ? (
          <div className="divide-y divide-border/50">
            {records.map((r) => (
              <div key={r.archiveId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-hover-row gap-3">
                <div className="space-y-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="font-bold text-accent">{r.archiveId}</span>
                    <span className="rounded bg-bg-deep px-1.5 py-0.5 text-[10px] text-text-muted uppercase border border-border">
                      {r.type}
                    </span>
                    <span className="text-text-faint">{r.session}</span>
                  </div>
                  <h3 className="truncate text-sm font-semibold text-text-primary">{r.title}</h3>
                  <p className="truncate text-xs text-text-muted">{r.description}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2 font-mono text-xs">
                  {r.repository && (
                    <a
                      href={`/archive/repositories/${r.repository.githubOwner}/${r.repository.githubName}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-border bg-bg-deep px-2.5 py-1 text-text-primary hover:border-accent hover:text-accent"
                    >
                      View Live
                    </a>
                  )}
                  {r.document && (
                    <a
                      href={`/archive/${r.archiveId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-border bg-bg-deep px-2.5 py-1 text-text-primary hover:border-accent hover:text-accent"
                    >
                      View Record
                    </a>
                  )}
                  {r.video && (
                    <a
                      href={r.video.youtubeUrl || `/archive/${r.archiveId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-border bg-bg-deep px-2.5 py-1 text-text-primary hover:border-accent hover:text-accent"
                    >
                      View Video
                    </a>
                  )}

                  {/* Edit button */}
                  <button
                    onClick={() => openEditModal(r)}
                    title="Edit Record"
                    className="p-1.5 rounded bg-surface hover:bg-accent/20 text-text-muted hover:text-accent border border-border transition-colors cursor-pointer"
                  >
                    <Edit size={13} />
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => setDeletingRecord(r)}
                    title="Delete Record"
                    className="p-1.5 rounded bg-surface hover:bg-danger/20 text-text-muted hover:text-danger border border-border transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center font-mono text-xs text-text-muted">No records found.</div>
        )}
      </div>

      {/* ─── Add Source Modal ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-accent/40 bg-surface-raised p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2 text-text-primary">
                <Plus size={18} className="text-accent" />
                <h3 className="font-bold text-base font-mono">Register New Archive Record</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-text-muted hover:text-text-primary font-mono text-xs p-1"
              >
                ✕ Close
              </button>
            </div>

            {/* Type Switcher */}
            <div className="flex gap-2 p-1 bg-bg-deep border border-border rounded-xl">
              {(
                [
                  { id: "document", label: "Lecture Notes / Doc", icon: FileText },
                  { id: "video", label: "Lecture Video (YouTube)", icon: Video },
                  { id: "repository", label: "GitHub Repo", icon: FolderGit2 },
                  { id: "build", label: "Platform Build", icon: HardDrive },
                ] as const
              ).map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFormType(t.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-mono text-xs font-medium transition-all ${
                      formType === t.id ? "bg-accent text-on-accent font-semibold shadow" : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <Icon size={13} />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleCreateSource} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-text-secondary font-semibold mb-1">Source Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AIIC Club Lecture 3 Notes: Autonomous Agents & RLM"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full h-10 rounded-lg bg-bg-deep border border-border px-3.5 text-text-primary placeholder:text-text-faint outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-secondary font-semibold mb-1">Academic Session</label>
                  <select
                    value={formSession}
                    onChange={(e) => setFormSession(e.target.value)}
                    className="w-full h-10 rounded-lg bg-bg-deep border border-border px-3 text-text-primary outline-none focus:border-accent"
                  >
                    <option value="2026–27">2026–27</option>
                    <option value="2025–26">2025–26</option>
                    <option value="2024–25">2024–25</option>
                  </select>
                </div>

                {formType === "document" && (
                  <div>
                    <label className="block text-text-secondary font-semibold mb-1">Category</label>
                    <input
                      type="text"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      placeholder="e.g. Official Study Notes"
                      className="w-full h-10 rounded-lg bg-bg-deep border border-border px-3.5 text-text-primary placeholder:text-text-faint outline-none focus:border-accent"
                    />
                  </div>
                )}

                {formType === "video" && (
                  <div>
                    <label className="block text-text-secondary font-semibold mb-1">Speaker / Instructor</label>
                    <input
                      type="text"
                      value={formSpeaker}
                      onChange={(e) => setFormSpeaker(e.target.value)}
                      placeholder="e.g. Rafi Ullah Khan"
                      className="w-full h-10 rounded-lg bg-bg-deep border border-border px-3.5 text-text-primary placeholder:text-text-faint outline-none focus:border-accent"
                    />
                  </div>
                )}

                {formType === "build" && (
                  <div>
                    <label className="block text-text-secondary font-semibold mb-1">Build Version *</label>
                    <input
                      type="text"
                      required
                      value={formVersion}
                      onChange={(e) => setFormVersion(e.target.value)}
                      placeholder="e.g. v1.1.0"
                      className="w-full h-10 rounded-lg bg-bg-deep border border-border px-3.5 text-text-primary placeholder:text-text-faint outline-none focus:border-accent"
                    />
                  </div>
                )}
              </div>

              {/* Type Specific URL Inputs */}
              {formType === "video" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-text-secondary font-semibold mb-1">YouTube URL *</label>
                    <input
                      type="text"
                      required
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={formYoutubeUrl}
                      onChange={(e) => setFormYoutubeUrl(e.target.value)}
                      className="w-full h-10 rounded-lg bg-bg-deep border border-border px-3.5 text-text-primary placeholder:text-text-faint outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-text-secondary font-semibold mb-1">Duration</label>
                    <input
                      type="text"
                      placeholder="e.g. 45:30"
                      value={formDuration}
                      onChange={(e) => setFormDuration(e.target.value)}
                      className="w-full h-10 rounded-lg bg-bg-deep border border-border px-3.5 text-text-primary placeholder:text-text-faint outline-none focus:border-accent"
                    />
                  </div>
                </div>
              )}

              {formType === "repository" && (
                <div>
                  <label className="block text-text-secondary font-semibold mb-1">GitHub Repository URL *</label>
                  <input
                    type="text"
                    required
                    placeholder="https://github.com/AIIC-Organization/aiic-platform"
                    value={formGithubUrl}
                    onChange={(e) => setFormGithubUrl(e.target.value)}
                    className="w-full h-10 rounded-lg bg-bg-deep border border-border px-3.5 text-text-primary placeholder:text-text-faint outline-none focus:border-accent"
                  />
                </div>
              )}

              {formType === "build" && (
                <div>
                  <label className="block text-text-secondary font-semibold mb-1">Build / Artifact URL</label>
                  <input
                    type="text"
                    placeholder="https://aiic-bbs.vercel.app"
                    value={formBuildUrl}
                    onChange={(e) => setFormBuildUrl(e.target.value)}
                    className="w-full h-10 rounded-lg bg-bg-deep border border-border px-3.5 text-text-primary placeholder:text-text-faint outline-none focus:border-accent"
                  />
                </div>
              )}

              <div>
                <label className="block text-text-secondary font-semibold mb-1">Description / Summary</label>
                <textarea
                  rows={2}
                  placeholder="Summary of this lecture or archive source..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-lg bg-bg-deep border border-border p-3 text-text-primary placeholder:text-text-faint outline-none focus:border-accent"
                />
              </div>

              {formType === "document" && (
                <div>
                  <label className="block text-text-secondary font-semibold mb-1">Full Lecture Notes / Content</label>
                  <textarea
                    rows={6}
                    placeholder="Enter complete Markdown lecture notes..."
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    className="w-full rounded-lg bg-bg-deep border border-border p-3 text-text-primary placeholder:text-text-faint outline-none focus:border-accent"
                  />
                </div>
              )}

              <div>
                <label className="block text-text-secondary font-semibold mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="lecture 3, ai, multi-agent"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className="w-full h-10 rounded-lg bg-bg-deep border border-border px-3.5 text-text-primary placeholder:text-text-faint outline-none focus:border-accent"
                />
              </div>

              {actionError && (
                <p className="flex items-center gap-1.5 font-mono text-xs text-danger">
                  <AlertCircle size={13} /> {actionError}
                </p>
              )}

              {actionSuccess && (
                <p className="flex items-center gap-1.5 font-mono text-xs text-live">
                  <CheckCircle2 size={13} /> {actionSuccess}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-md border border-border font-mono text-xs text-text-muted hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-accent px-4 py-2 font-mono text-xs font-semibold text-on-accent hover:bg-accent-violet-bright disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  <span>{isSubmitting ? "Indexing..." : "Index Source"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Edit Source Modal ─── */}
      {isEditModalOpen && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface-raised p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2 text-text-primary">
                <Edit size={18} className="text-accent" />
                <h3 className="font-bold text-base font-mono">Edit Record: {editingRecord.archiveId}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-text-muted hover:text-text-primary font-mono text-xs p-1"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleUpdateSource} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-text-secondary font-semibold mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full h-10 rounded-lg bg-bg-deep border border-border px-3.5 text-text-primary outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-secondary font-semibold mb-1">Academic Session</label>
                  <select
                    value={formSession}
                    onChange={(e) => setFormSession(e.target.value)}
                    className="w-full h-10 rounded-lg bg-bg-deep border border-border px-3 text-text-primary outline-none focus:border-accent"
                  >
                    <option value="2026–27">2026–27</option>
                    <option value="2025–26">2025–26</option>
                    <option value="2024–25">2024–25</option>
                  </select>
                </div>

                {editingRecord.type === "video" && (
                  <div>
                    <label className="block text-text-secondary font-semibold mb-1">Speaker</label>
                    <input
                      type="text"
                      value={formSpeaker}
                      onChange={(e) => setFormSpeaker(e.target.value)}
                      className="w-full h-10 rounded-lg bg-bg-deep border border-border px-3.5 text-text-primary outline-none focus:border-accent"
                    />
                  </div>
                )}

                {editingRecord.type === "document" && (
                  <div>
                    <label className="block text-text-secondary font-semibold mb-1">Category</label>
                    <input
                      type="text"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full h-10 rounded-lg bg-bg-deep border border-border px-3.5 text-text-primary outline-none focus:border-accent"
                    />
                  </div>
                )}
              </div>

              {editingRecord.type === "video" && (
                <div>
                  <label className="block text-text-secondary font-semibold mb-1">YouTube URL</label>
                  <input
                    type="text"
                    value={formYoutubeUrl}
                    onChange={(e) => setFormYoutubeUrl(e.target.value)}
                    className="w-full h-10 rounded-lg bg-bg-deep border border-border px-3.5 text-text-primary outline-none focus:border-accent"
                  />
                </div>
              )}

              {editingRecord.type === "repository" && (
                <div>
                  <label className="block text-text-secondary font-semibold mb-1">GitHub URL</label>
                  <input
                    type="text"
                    value={formGithubUrl}
                    onChange={(e) => setFormGithubUrl(e.target.value)}
                    className="w-full h-10 rounded-lg bg-bg-deep border border-border px-3.5 text-text-primary outline-none focus:border-accent"
                  />
                </div>
              )}

              <div>
                <label className="block text-text-secondary font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-lg bg-bg-deep border border-border p-3 text-text-primary outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-text-secondary font-semibold mb-1">Tags</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className="w-full h-10 rounded-lg bg-bg-deep border border-border px-3.5 text-text-primary outline-none focus:border-accent"
                />
              </div>

              {actionError && (
                <p className="flex items-center gap-1.5 font-mono text-xs text-danger">
                  <AlertCircle size={13} /> {actionError}
                </p>
              )}

              {actionSuccess && (
                <p className="flex items-center gap-1.5 font-mono text-xs text-live">
                  <CheckCircle2 size={13} /> {actionSuccess}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-border font-mono text-xs text-text-muted hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-accent px-4 py-2 font-mono text-xs font-semibold text-on-accent hover:bg-accent-violet-bright disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-danger/40 bg-surface-raised p-6 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center gap-2 text-danger font-bold text-base">
              <Trash2 size={18} />
              <span>Delete Archive Record</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Are you sure you want to permanently delete archive record{" "}
              <strong className="text-text-primary">{deletingRecord.archiveId}</strong> (
              <em>{deletingRecord.title}</em>)? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 rounded-md border border-border text-xs text-text-muted hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteSource}
                className="px-4 py-2 rounded-md bg-danger text-white font-semibold text-xs hover:bg-danger/80 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>{isSubmitting ? "Deleting..." : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

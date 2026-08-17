"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  FolderGit2,
  FileText,
  Search,
  ExternalLink,
  Shield,
  Layers,
  History,
  Tag,
  Calendar,
  CheckCircle2,
  ArrowRight,
  GitBranch,
  BookOpen,
  Filter,
  Sparkles,
  Play,
  Video as VideoIcon,
  Cpu,
  Plus,
  X,
  Loader2,
  Tv,
  UploadCloud,
  FileUp,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth-store";
import type { AIICArchiveRecord, AIICArchiveStats, AIICArchiveVideo } from "@/shared/lib/archive-types";

interface ArchiveExplorerProps {
  initialRecords: AIICArchiveRecord[];
  stats: AIICArchiveStats;
}

export function ArchiveExplorer({ initialRecords, stats }: ArchiveExplorerProps) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const restoreSession = useAuthStore((s) => s.restoreSession);

  // Restore session on mount if on public page
  useEffect(() => {
    restoreSession().catch(() => {});
  }, [restoreSession]);

  const [records, setRecords] = useState<AIICArchiveRecord[]>(initialRecords);
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedSession, setSelectedSession] = useState<string>("all");

  // Video Player Modal State
  const [activeVideo, setActiveVideo] = useState<AIICArchiveVideo | null>(null);

  // Submit Modal State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitTab, setSubmitTab] = useState<"video" | "document" | "build" | "repository">("video");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form fields
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSession, setFormSession] = useState("2026–27");
  const [formTags, setFormTags] = useState("");
  // Video specific
  const [formYoutubeUrl, setFormYoutubeUrl] = useState("");
  const [formSpeaker, setFormSpeaker] = useState("");
  const [formDuration, setFormDuration] = useState("");
  // File / Document specific
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formCategory, setFormCategory] = useState("Official Record");
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Build specific
  const [formVersion, setFormVersion] = useState("v1.0.0");
  const [formBuildUrl, setFormBuildUrl] = useState("");
  const [formArtifactUrl, setFormArtifactUrl] = useState("");
  const [formEnvironment, setFormEnvironment] = useState<"production" | "staging" | "preview" | "release">("production");
  // Repo specific
  const [formGithubUrl, setFormGithubUrl] = useState("");

  // Allow submission if user is logged in
  const isElevatedUser = isAuthenticated || Boolean(
    user && (
      ["president_admin", "admin", "president", "vice_president", "teacher", "staff", "owner", "member"].includes(
        (user as any).role?.toLowerCase() || ""
      ) ||
      ["president_admin", "admin", "president"].includes(user.username?.toLowerCase() || "")
    )
  );

  const filteredRecords = records.filter((record) => {
    if (selectedType !== "all") {
      if (selectedType === "video" && record.type !== "video" && !record.video) return false;
      if (selectedType === "build" && record.type !== "build" && !record.build) return false;
      if (selectedType === "repository" && record.type !== "repository" && !record.repository) return false;
      if (selectedType === "document" && record.type !== "document" && record.type !== "policy" && record.type !== "report" && !record.document) return false;
    }
    if (selectedSession !== "all" && record.session !== selectedSession) {
      return false;
    }
    if (!query) return true;

    const q = query.toLowerCase();
    return (
      record.archiveId.toLowerCase().includes(q) ||
      record.title.toLowerCase().includes(q) ||
      record.description.toLowerCase().includes(q) ||
      record.tags.some((t) => t.toLowerCase().includes(q)) ||
      record.repository?.githubName.toLowerCase().includes(q) ||
      record.video?.speaker?.toLowerCase().includes(q) ||
      record.build?.version.toLowerCase().includes(q) ||
      record.document?.fileName.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    const token = useAuthStore.getState().token;
    const tagArray = formTags.split(",").map((t) => t.trim()).filter(Boolean);

    try {
      if (submitTab === "document") {
        if (!selectedFile) {
          throw new Error("Please select a file to upload to Supabase storage.");
        }
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("title", formTitle.trim() || selectedFile.name);
        formData.append("description", formDescription.trim());
        formData.append("category", formCategory);
        formData.append("session", formSession);
        formData.append("tags", formTags);

        const res = await fetch("/api/archive/documents", {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to upload document to Supabase.");

        if (json.record) {
          setRecords((prev) => [json.record, ...prev]);
        }
      } else {
        const payload: any = {
          type: submitTab,
          title: formTitle.trim(),
          description: formDescription.trim(),
          session: formSession,
          tags: tagArray,
        };

        if (submitTab === "video") {
          payload.youtubeUrl = formYoutubeUrl.trim();
          payload.speaker = formSpeaker.trim() || undefined;
          payload.duration = formDuration.trim() || undefined;
        } else if (submitTab === "build") {
          payload.version = formVersion.trim();
          payload.buildUrl = formBuildUrl.trim() || undefined;
          payload.artifactUrl = formArtifactUrl.trim() || undefined;
          payload.environment = formEnvironment;
        } else if (submitTab === "repository") {
          payload.githubUrl = formGithubUrl.trim();
        }

        const res = await fetch("/api/archive/records", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to submit archive record.");
        }

        if (json.record) {
          setRecords((prev) => [json.record, ...prev]);
        }
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowSubmitModal(false);
        setFormTitle("");
        setFormDescription("");
        setFormYoutubeUrl("");
        setFormSpeaker("");
        setFormDuration("");
        setSelectedFile(null);
        setFormGithubUrl("");
        setFormBuildUrl("");
        setFormArtifactUrl("");
      }, 1500);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to create archive record.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* ─── Top Control Bar: Search & Submissions ─── */}
      <div className="rounded-2xl border border-border/80 bg-surface-raised/80 p-5 backdrop-blur-md space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={17} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search archive: workshops, YouTube videos, builds, repos, documents, tags..."
              className="h-11 w-full rounded-xl border border-border bg-bg-deep pl-10 pr-4 font-mono text-sm text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by Session */}
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-bg-deep px-3 py-2">
              <Calendar size={14} className="text-text-muted" />
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="bg-transparent font-mono text-xs text-text-primary focus:outline-none"
              >
                <option value="all">All Sessions</option>
                {stats.sessions.map((s) => (
                  <option key={s} value={s}>
                    Session {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Role-gated Submit Action */}
            {isElevatedUser ? (
              <button
                type="button"
                onClick={() => {
                  setSubmitError(null);
                  setShowSubmitModal(true);
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-accent px-4 font-mono text-xs font-bold text-on-accent hover:bg-accent-hover transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Plus size={14} />
                <span>Submit to Archive</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-surface px-4 font-mono text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-accent transition-all"
              >
                <span>Sign in to Submit</span>
              </Link>
            )}
          </div>
        </div>

        {/* ─── Type Filter Buttons (Pills) ─── */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
          {[
            { id: "all", label: "All Index", icon: Layers },
            { id: "video", label: "Video Sessions", icon: VideoIcon },
            { id: "repository", label: "Repositories", icon: FolderGit2 },
            { id: "build", label: "Builds & Releases", icon: Cpu },
            { id: "document", label: "Documents", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = selectedType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedType(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-mono text-xs font-semibold transition-all border ${
                  active
                    ? "bg-accent/15 border-accent text-accent shadow-sm"
                    : "bg-surface-raised border-border text-text-secondary hover:text-text-primary hover:border-border-active"
                }`}
              >
                <Icon size={13} className={active ? "text-accent" : "text-text-muted"} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          {query && (
            <button
              onClick={() => setQuery("")}
              className="ml-auto font-mono text-[11px] text-accent hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      {/* ─── Archive Grid ─── */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Shield size={18} className="text-accent" />
            Institutional Records
          </h2>
          <span className="font-mono text-xs text-text-muted">
            Showing {filteredRecords.length} records
          </span>
        </div>

        {filteredRecords.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {filteredRecords.map((record) => (
              <ArchiveCard
                key={record.archiveId}
                record={record}
                onPlayVideo={(v) => setActiveVideo(v)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface-raised/50 p-12 text-center text-text-muted">
            <History className="mx-auto h-12 w-12 text-text-faint" />
            <h3 className="mt-4 text-base font-semibold text-text-primary">
              No Archive Records Found
            </h3>
            <p className="mx-auto mt-2 max-w-[48ch] text-xs text-text-secondary">
              {query || selectedType !== "all"
                ? "No archive records match your search or filter settings. Try broadening your terms."
                : "The institutional archive is online. Authenticated members can register YouTube video sessions, upload files to Supabase, and index GitHub repositories."}
            </p>
          </div>
        )}
      </div>

      {/* ─── Video Player Modal ─── */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div className="min-w-0 pr-4">
                <h3 className="truncate font-bold text-text-primary text-sm sm:text-base">
                  {activeVideo.title}
                </h3>
                {activeVideo.speaker && (
                  <p className="text-xs font-mono text-accent">Presented by: {activeVideo.speaker}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="h-8 w-8 rounded-lg flex items-center justify-center border border-white/10 text-text-muted hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="aspect-video w-full bg-black">
              <iframe
                src={`${activeVideo.embedUrl}?autoplay=1&rel=0`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>

            <div className="p-3 bg-surface-raised flex items-center justify-between text-xs font-mono">
              <span className="text-text-muted">YouTube Streaming Session</span>
              <a
                href={activeVideo.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline flex items-center gap-1"
              >
                <span>Open in YouTube</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ─── Submit Archive Record Modal ─── */}
      {showSubmitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !submitting && setShowSubmitModal(false)}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-[24px] border border-white/10 bg-[#121622] p-6 shadow-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Shield size={18} className="text-accent" />
                Submit to Institutional Archive
              </h3>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowSubmitModal(false)}
                className="text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {submitError && (
              <div className="mt-4 p-3 rounded-xl border border-danger/30 bg-danger/10 text-danger text-xs font-mono">
                {submitError}
              </div>
            )}

            {submitSuccess && (
              <div className="mt-4 p-3 rounded-xl border border-success/30 bg-success/10 text-success text-xs font-mono flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>Archive record registered successfully!</span>
              </div>
            )}

            {/* Modal Tabs */}
            <div className="mt-4 grid grid-cols-4 rounded-xl border border-white/10 bg-white/[0.03] p-1 gap-1">
              {[
                { id: "video", label: "YouTube Video", icon: VideoIcon },
                { id: "document", label: "Upload File", icon: UploadCloud },
                { id: "build", label: "Build Release", icon: Cpu },
                { id: "repository", label: "GitHub Repo", icon: FolderGit2 },
              ].map((t) => {
                const Icon = t.icon;
                const active = submitTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSubmitTab(t.id as any)}
                    className={`py-1.5 rounded-lg font-mono text-[11px] font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      active
                        ? "bg-accent text-on-accent shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <Icon size={14} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    submitTab === "video"
                      ? "e.g. Agentic Workflows & Multi-Agent Systems Workshop"
                      : submitTab === "document"
                      ? "e.g. AIIC Constitution & Technical Blueprint"
                      : submitTab === "build"
                      ? "e.g. AIIC BBS Core Platform v2.4"
                      : "e.g. AIIC BBS Web Repository"
                  }
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 font-mono"
                />
              </div>

              {/* 1. Video Form */}
              {submitTab === "video" && (
                <>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">
                      YouTube Video URL *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                      value={formYoutubeUrl}
                      onChange={(e) => setFormYoutubeUrl(e.target.value)}
                      className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">
                        Speaker / Host
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Lead Researcher"
                        value={formSpeaker}
                        onChange={(e) => setFormSpeaker(e.target.value)}
                        className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">
                        Duration
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 45:00"
                        value={formDuration}
                        onChange={(e) => setFormDuration(e.target.value)}
                        className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* 2. File Upload / Document Form (Supabase Storage) */}
              {submitTab === "document" && (
                <>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">
                      Upload File to Supabase Storage *
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-4 text-center hover:bg-white/[0.05] transition-all"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setSelectedFile(e.target.files[0]);
                            if (!formTitle) setFormTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
                          }
                        }}
                      />
                      <FileUp size={24} className="mx-auto text-accent mb-2" />
                      <p className="text-xs font-mono text-text-primary">
                        {selectedFile ? selectedFile.name : "Click to choose PDF, Paper, or ZIP file"}
                      </p>
                      <p className="text-[10px] text-text-muted mt-1">
                        {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : "Direct upload to Supabase cloud storage"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">
                      Category
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent/40 font-mono"
                    >
                      <option value="Official Record">Official Record</option>
                      <option value="Research Paper">Research Paper</option>
                      <option value="Prospectus">Prospectus</option>
                      <option value="Policy">Policy</option>
                      <option value="Specification">Specification</option>
                      <option value="Guide">Guide</option>
                    </select>
                  </div>
                </>
              )}

              {/* 3. Build Form */}
              {submitTab === "build" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">
                        Version *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. v2.4.0"
                        value={formVersion}
                        onChange={(e) => setFormVersion(e.target.value)}
                        className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">
                        Environment
                      </label>
                      <select
                        value={formEnvironment}
                        onChange={(e) => setFormEnvironment(e.target.value as any)}
                        className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent/40 font-mono"
                      >
                        <option value="production">Production</option>
                        <option value="staging">Staging</option>
                        <option value="release">Release</option>
                        <option value="preview">Preview</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">
                      Deployment / Build URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://aiic-bbs.vercel.app"
                      value={formBuildUrl}
                      onChange={(e) => setFormBuildUrl(e.target.value)}
                      className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 font-mono"
                    />
                  </div>
                </>
              )}

              {/* 4. GitHub Repository Form */}
              {submitTab === "repository" && (
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">
                    GitHub URL *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://github.com/AIIC-bbs/repo-name"
                    value={formGithubUrl}
                    onChange={(e) => setFormGithubUrl(e.target.value)}
                    className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Summary of this archive entry..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full resize-none rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">
                    Session
                  </label>
                  <input
                    type="text"
                    value={formSession}
                    onChange={(e) => setFormSession(e.target.value)}
                    className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2 text-xs text-text-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">
                    Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="workshop, ai, model"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2 text-xs text-text-primary font-mono"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-white/[0.06] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (submitTab !== "document" && !formTitle.trim()) || (submitTab === "document" && !selectedFile)}
                  className="px-5 py-2 rounded-xl bg-accent text-on-accent text-xs font-bold hover:bg-accent-hover transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  <span>{submitting ? "Uploading to Supabase..." : "Submit Entry"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ArchiveCard({
  record,
  onPlayVideo,
}: {
  record: AIICArchiveRecord;
  onPlayVideo: (v: AIICArchiveVideo) => void;
}) {
  const isVideo = record.type === "video" || !!record.video;
  const isBuild = record.type === "build" || !!record.build;
  const isRepo = record.type === "repository" || !!record.repository;
  const isDoc = record.type === "document" || record.type === "policy" || record.type === "report" || !!record.document;

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-surface-raised p-5 sm:p-6 transition-all duration-200 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5 backdrop-blur-md">
      <div>
        {/* Header Row: Archive ID & Type Badge */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-bold tracking-wider text-accent">
            {record.archiveId}
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase rounded-full border border-border px-2.5 py-0.5 text-text-muted bg-bg-deep">
            {isVideo ? (
              <VideoIcon size={11} className="text-danger" />
            ) : isBuild ? (
              <Cpu size={11} className="text-emerald-400" />
            ) : isRepo ? (
              <FolderGit2 size={11} className="text-accent" />
            ) : (
              <FileText size={11} className="text-info" />
            )}
            {isVideo ? "YouTube Session" : isBuild ? "Platform Build" : isRepo ? "Repository" : record.type}
          </span>
        </div>

        {/* Video Thumbnail Box if Video */}
        {isVideo && record.video && (
          <div
            onClick={() => onPlayVideo(record.video!)}
            className="mt-3 relative aspect-video w-full rounded-xl overflow-hidden cursor-pointer border border-border/60 bg-black group/thumb"
          >
            {record.video.thumbnailUrl ? (
              <img
                src={record.video.thumbnailUrl}
                alt={record.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover/thumb:scale-105 opacity-80 group-hover/thumb:opacity-100"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-zinc-900">
                <Tv size={32} className="text-text-muted" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover/thumb:bg-black/20 transition-all">
              <div className="h-12 w-12 rounded-full bg-danger/90 text-white flex items-center justify-center shadow-lg transition-transform group-hover/thumb:scale-110">
                <Play size={20} className="fill-white ml-0.5" />
              </div>
            </div>
            {record.video.duration && (
              <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] text-white">
                {record.video.duration}
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <h3 className="mt-3 text-[16px] sm:text-[17px] font-bold text-text-primary group-hover:text-accent transition-colors">
          {record.title}
        </h3>

        {/* Description */}
        <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-text-secondary line-clamp-2">
          {record.description}
        </p>

        {/* Video Metadata */}
        {isVideo && record.video?.speaker && (
          <div className="mt-2.5 flex items-center gap-2 font-mono text-[11px] text-accent">
            <span>Speaker: {record.video.speaker}</span>
          </div>
        )}

        {/* Document Metadata */}
        {isDoc && record.document && (
          <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-text-muted bg-bg-deep/60 rounded-xl px-3 py-2 border border-border/40">
            <span className="flex items-center gap-1.5 truncate text-info font-medium">
              <FileText size={13} />
              {record.document.fileName}
            </span>
            <span className="text-[10px] text-text-muted">
              {(record.document.fileSize / 1024).toFixed(0)} KB
            </span>
          </div>
        )}

        {/* Build Metadata */}
        {isBuild && record.build && (
          <div className="mt-3 flex items-center gap-3 font-mono text-[11px] text-text-muted bg-bg-deep/60 rounded-xl px-3 py-2 border border-border/40">
            <span className="flex items-center gap-1.5 truncate text-emerald-400 font-bold">
              <Cpu size={13} />
              {record.build.version}
            </span>
            <span className="ml-auto text-[10px] uppercase font-bold text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
              {record.build.environment}
            </span>
          </div>
        )}

        {/* Repository Metadata */}
        {isRepo && record.repository && (
          <div className="mt-3 flex items-center gap-3 font-mono text-[11px] text-text-muted bg-bg-deep/60 rounded-xl px-3 py-2 border border-border/40">
            <span className="flex items-center gap-1.5 truncate text-text-primary">
              <FolderGit2 size={13} className="text-accent" />
              {record.repository.githubOwner}/{record.repository.githubName}
            </span>
            {record.repository.language && (
              <span className="ml-auto text-[10px] text-accent font-semibold">{record.repository.language}</span>
            )}
          </div>
        )}
      </div>

      {/* Footer Controls & Tags */}
      <div className="mt-5 pt-3.5 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] text-text-muted">{record.session}</span>
          {record.tags.slice(0, 3).map((t) => (
            <span key={t} className="font-mono text-[10px] text-text-secondary bg-surface px-2 py-0.5 rounded-md border border-border/40">
              #{t}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {isVideo && record.video ? (
            <button
              type="button"
              onClick={() => onPlayVideo(record.video!)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-danger/10 text-danger border border-danger/25 px-3 py-1.5 font-mono text-xs font-bold hover:bg-danger/20 transition-colors cursor-pointer"
            >
              <Play size={12} className="fill-danger" />
              <span>Watch Video</span>
            </button>
          ) : isDoc && record.document?.fileUrl ? (
            <a
              href={record.document.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-info/10 text-info border border-info/25 px-3 py-1.5 font-mono text-xs font-bold hover:bg-info/20 transition-colors"
            >
              <span>Download File</span>
              <ExternalLink size={11} />
            </a>
          ) : isBuild && record.build?.buildUrl ? (
            <a
              href={record.build.buildUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-3 py-1.5 font-mono text-xs font-bold hover:bg-emerald-500/20 transition-colors"
            >
              <span>Live Build</span>
              <ExternalLink size={11} />
            </a>
          ) : isRepo && record.repository ? (
            <a
              href={record.repository.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent/10 text-accent border border-accent/25 px-3 py-1.5 font-mono text-xs font-bold hover:bg-accent/20 transition-colors"
            >
              <span>GitHub</span>
              <ExternalLink size={11} />
            </a>
          ) : (
            <Link
              href={`/archive/${record.archiveId}`}
              className="inline-flex items-center gap-1 rounded-xl bg-surface px-3 py-1.5 font-mono text-xs font-semibold text-text-primary border border-border hover:border-accent hover:text-accent transition-colors"
            >
              <span>View Record</span>
              <ArrowRight size={11} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

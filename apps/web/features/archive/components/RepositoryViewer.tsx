"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FolderGit2,
  GitCommit,
  GitBranch,
  Tag,
  Users,
  FileCode,
  Folder,
  File,
  ExternalLink,
  ChevronRight,
  Copy,
  Check,
  Download,
  Terminal,
  Clock,
  Shield,
  Layers,
  ArrowLeft,
} from "lucide-react";
import type {
  AIICArchiveRepository,
  AIICGitHubCommit,
  AIICGitHubRelease,
  AIICGitHubContributor,
  AIICGitHubFileItem,
} from "@/shared/lib/archive-types";

interface RepositoryViewerProps {
  archiveId: string;
  repository: AIICArchiveRepository;
  initialReadme: string | null;
  initialBranches: string[];
  initialCommits: AIICGitHubCommit[];
  initialReleases: AIICGitHubRelease[];
  initialContributors: AIICGitHubContributor[];
  initialFiles: AIICGitHubFileItem[];
}

type TabType = "code" | "commits" | "releases" | "contributors" | "about";

export function RepositoryViewer({
  archiveId,
  repository,
  initialReadme,
  initialBranches,
  initialCommits,
  initialReleases,
  initialContributors,
  initialFiles,
}: RepositoryViewerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("code");
  const [selectedBranch, setSelectedBranch] = useState(repository.defaultBranch || "main");
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState<AIICGitHubFileItem[]>(initialFiles || []);
  const [activeFile, setActiveFile] = useState<AIICGitHubFileItem | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [copied, setCopied] = useState(false);

  // Navigate directories or open file
  const handleItemClick = async (item: AIICGitHubFileItem) => {
    if (item.type === "dir") {
      setLoadingFiles(true);
      setActiveFile(null);
      try {
        const res = await fetch(
          `/api/archive/github/${repository.githubOwner}/${repository.githubName}?view=contents&path=${encodeURIComponent(
            item.path
          )}&ref=${encodeURIComponent(selectedBranch)}`
        );
        const data = await res.json();
        if (data.contents && Array.isArray(data.contents)) {
          setFiles(data.contents);
          setCurrentPath(item.path);
        }
      } catch (err) {
        console.error("Error fetching path:", err);
      } finally {
        setLoadingFiles(false);
      }
    } else {
      // Single file click: fetch full file content
      setLoadingFiles(true);
      try {
        const res = await fetch(
          `/api/archive/github/${repository.githubOwner}/${repository.githubName}?view=contents&path=${encodeURIComponent(
            item.path
          )}&ref=${encodeURIComponent(selectedBranch)}`
        );
        const data = await res.json();
        if (data.contents && !Array.isArray(data.contents)) {
          setActiveFile(data.contents);
        }
      } catch (err) {
        console.error("Error fetching file:", err);
      } finally {
        setLoadingFiles(false);
      }
    }
  };

  // Navigate breadcrumb path
  const handleNavigatePath = async (targetPath: string) => {
    setLoadingFiles(true);
    setActiveFile(null);
    try {
      const res = await fetch(
        `/api/archive/github/${repository.githubOwner}/${repository.githubName}?view=contents&path=${encodeURIComponent(
          targetPath
        )}&ref=${encodeURIComponent(selectedBranch)}`
      );
      const data = await res.json();
      if (data.contents && Array.isArray(data.contents)) {
        setFiles(data.contents);
        setCurrentPath(targetPath);
      }
    } catch (err) {
      console.error("Error navigating path:", err);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleCopyCode = () => {
    if (activeFile?.content) {
      navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const pathParts = currentPath.split("/").filter(Boolean);

  return (
    <div className="space-y-8">
      {/* ─── Archive ID & Top Nav ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/archive"
              className="inline-flex items-center gap-1 font-mono text-xs text-text-muted hover:text-accent transition-colors"
            >
              <ArrowLeft size={13} /> Back to Archive
            </Link>
            <span className="text-border">/</span>
            <span className="font-mono text-xs font-bold text-accent">{archiveId}</span>
          </div>

          <h1 className="mt-2 flex items-center gap-3 text-2xl font-bold tracking-tight text-text-primary">
            <FolderGit2 className="text-accent shrink-0" size={24} />
            <span>
              {repository.githubOwner} / <span className="text-accent">{repository.githubName}</span>
            </span>
          </h1>

          <p className="mt-1 text-sm text-text-secondary">{repository.description}</p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={repository.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-2 font-mono text-xs font-semibold text-text-primary hover:border-accent hover:text-accent transition-colors"
          >
            <ExternalLink size={13} /> View on GitHub
          </a>
        </div>
      </div>

      {/* ─── Navigation Tabs ─── */}
      <div className="flex items-center gap-2 border-b border-border">
        {[
          { id: "code", label: "Code", icon: FileCode },
          { id: "commits", label: `Commits (${initialCommits.length})`, icon: GitCommit },
          { id: "releases", label: `Releases (${initialReleases.length})`, icon: Tag },
          { id: "contributors", label: `Contributors (${initialContributors.length})`, icon: Users },
          { id: "about", label: "Institutional Record", icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-mono text-xs font-medium transition-colors ${
                isActive
                  ? "border-accent text-accent"
                  : "border-transparent text-text-muted hover:border-border hover:text-text-primary"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── TAB: CODE & FILE BROWSER ─── */}
      {activeTab === "code" && (
        <div className="space-y-6">
          {/* Branch & Path Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-surface-raised px-4 py-2.5">
            <div className="flex items-center gap-2 font-mono text-xs">
              <GitBranch size={13} className="text-text-muted" />
              <span className="font-semibold text-text-primary">{selectedBranch}</span>
              <span className="text-border">/</span>
              <button
                onClick={() => handleNavigatePath("")}
                className="text-text-muted hover:text-accent transition-colors"
              >
                {repository.githubName}
              </button>

              {pathParts.map((part, idx) => {
                const subPath = pathParts.slice(0, idx + 1).join("/");
                const isLast = idx === pathParts.length - 1 && !activeFile;
                return (
                  <span key={subPath} className="flex items-center gap-2">
                    <span className="text-border">/</span>
                    <button
                      onClick={() => handleNavigatePath(subPath)}
                      disabled={isLast}
                      className={isLast ? "text-text-primary font-bold" : "text-text-muted hover:text-accent"}
                    >
                      {part}
                    </button>
                  </span>
                );
              })}

              {activeFile && (
                <span className="flex items-center gap-2">
                  <span className="text-border">/</span>
                  <span className="font-bold text-accent">{activeFile.name}</span>
                </span>
              )}
            </div>

            {activeFile && (
              <button
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 rounded border border-border bg-bg-deep px-2.5 py-1 font-mono text-[11px] text-text-muted hover:text-text-primary"
              >
                {copied ? <Check size={12} className="text-live" /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy Raw"}
              </button>
            )}
          </div>

          {/* Directory Listing / File Viewer */}
          {activeFile ? (
            <div className="overflow-hidden rounded-xl border border-border/80 bg-bg-deep">
              <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5 font-mono text-xs text-text-muted">
                <span>
                  {activeFile.name} ({(activeFile.size / 1024).toFixed(1)} KB)
                </span>
                <a
                  href={activeFile.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-accent"
                >
                  GitHub Source <ExternalLink size={11} />
                </a>
              </div>
              <pre className="max-h-[600px] overflow-auto p-4 font-mono text-xs leading-relaxed text-text-primary whitespace-pre">
                <code>{activeFile.content || "// Empty or binary file"}</code>
              </pre>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/80 bg-surface-raised">
              <div className="border-b border-border bg-surface px-4 py-2.5 font-mono text-xs text-text-muted">
                {currentPath || "Root Directory"}
              </div>

              {loadingFiles ? (
                <div className="p-8 text-center font-mono text-xs text-text-muted">
                  Loading files from GitHub API...
                </div>
              ) : files.length > 0 ? (
                <div className="divide-y divide-border/40">
                  {currentPath && (
                    <button
                      onClick={() => {
                        const parent = pathParts.slice(0, -1).join("/");
                        handleNavigatePath(parent);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left font-mono text-xs text-text-muted hover:bg-hover-row hover:text-text-primary"
                    >
                      <Folder size={14} className="text-accent" /> .. (parent directory)
                    </button>
                  )}
                  {files.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => handleItemClick(file)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left font-mono text-xs hover:bg-hover-row"
                    >
                      <div className="flex items-center gap-3">
                        {file.type === "dir" ? (
                          <Folder size={14} className="text-accent shrink-0" />
                        ) : (
                          <File size={14} className="text-text-muted shrink-0" />
                        )}
                        <span className="text-text-primary">{file.name}</span>
                      </div>
                      <span className="text-[11px] text-text-faint">
                        {file.type === "dir" ? "folder" : `${(file.size / 1024).toFixed(1)} KB`}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center font-mono text-xs text-text-muted">
                  No files found at this path.
                </div>
              )}
            </div>
          )}

          {/* Render README if at root */}
          {!currentPath && initialReadme && !activeFile && (
            <div className="rounded-xl border border-border/80 bg-surface-raised p-6 sm:p-8">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3 font-mono text-xs font-bold uppercase tracking-wider text-text-muted">
                <FileCode size={14} className="text-accent" />
                <span>README.md</span>
              </div>
              <div className="mt-6 whitespace-pre-wrap font-sans text-sm leading-relaxed text-text-secondary prose prose-invert max-w-none">
                {initialReadme}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: COMMITS ─── */}
      {activeTab === "commits" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/80 bg-surface-raised divide-y divide-border/60">
            {initialCommits.map((commit) => (
              <div key={commit.sha} className="flex items-center justify-between p-4 hover:bg-hover-row">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-text-primary">{commit.message}</p>
                  <div className="flex items-center gap-2 font-mono text-xs text-text-muted">
                    <span>{commit.authorName}</span>
                    <span>·</span>
                    <span>{new Date(commit.date).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="rounded bg-bg-deep px-2 py-1 text-accent border border-border">
                    {commit.shortSha}
                  </span>
                  <a
                    href={commit.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-text-muted hover:text-text-primary"
                    title="View commit on GitHub"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB: RELEASES ─── */}
      {activeTab === "releases" && (
        <div className="space-y-6">
          {initialReleases.length > 0 ? (
            initialReleases.map((rel) => (
              <div key={rel.id} className="rounded-xl border border-border/80 bg-surface-raised p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-accent/10 px-3 py-1 font-mono text-xs font-bold text-accent border border-accent/20">
                      {rel.tagName}
                    </span>
                    <h3 className="text-base font-bold text-text-primary">{rel.name}</h3>
                  </div>
                  <span className="font-mono text-xs text-text-muted">
                    {new Date(rel.publishedAt).toLocaleDateString()}
                  </span>
                </div>

                {rel.description && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-text-secondary">
                    {rel.description}
                  </p>
                )}

                <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-3">
                  {rel.tarballUrl && (
                    <a
                      href={rel.tarballUrl}
                      className="inline-flex items-center gap-1.5 rounded border border-border bg-bg-deep px-3 py-1.5 font-mono text-xs text-text-primary hover:border-accent hover:text-accent"
                    >
                      <Download size={12} /> Source (tar.gz)
                    </a>
                  )}
                  <a
                    href={rel.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-text-muted hover:text-text-primary"
                  >
                    View on GitHub <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-border bg-surface-raised p-8 text-center text-text-muted font-mono text-xs">
              No releases tagged in this repository yet.
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: CONTRIBUTORS ─── */}
      {activeTab === "contributors" && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {initialContributors.map((c) => (
            <div key={c.login} className="flex items-center gap-3 rounded-xl border border-border/80 bg-surface-raised p-4">
              <img
                src={c.avatarUrl || "/corvus-logo-small.png"}
                alt={c.login}
                className="h-10 w-10 rounded-full border border-border bg-bg-deep"
              />
              <div className="min-w-0 flex-1">
                <a
                  href={c.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-mono text-sm font-semibold text-text-primary hover:text-accent flex items-center gap-1"
                >
                  {c.login} <ExternalLink size={10} />
                </a>
                <p className="font-mono text-xs text-text-muted">
                  {c.contributions} commit{c.contributions !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── TAB: ABOUT / INSTITUTIONAL RECORD ─── */}
      {activeTab === "about" && (
        <div className="space-y-6 rounded-xl border border-border/80 bg-surface-raised p-6 sm:p-8">
          <h2 className="text-lg font-bold text-text-primary">Institutional Archival Record</h2>
          <div className="grid gap-4 sm:grid-cols-2 font-mono text-xs">
            <div className="rounded border border-border bg-bg-deep p-3">
              <span className="text-text-muted">Archive Identifier:</span>
              <p className="mt-1 font-bold text-accent">{archiveId}</p>
            </div>
            <div className="rounded border border-border bg-bg-deep p-3">
              <span className="text-text-muted">Institution:</span>
              <p className="mt-1 font-bold text-text-primary">Bal Bhawan School (AIIC)</p>
            </div>
            <div className="rounded border border-border bg-bg-deep p-3">
              <span className="text-text-muted">Source of Truth:</span>
              <p className="mt-1 font-bold text-text-primary">GitHub Organization</p>
            </div>
            <div className="rounded border border-border bg-bg-deep p-3">
              <span className="text-text-muted">Sync Status:</span>
              <p className="mt-1 font-bold text-live">✓ Live Synchronized</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

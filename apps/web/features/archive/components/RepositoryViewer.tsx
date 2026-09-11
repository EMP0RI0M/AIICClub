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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/archive"
              className="inline-flex items-center gap-1 font-mono text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={13} /> Back to Archive
            </Link>
            <span className="text-zinc-600 font-mono text-xs">/</span>
            <span className="font-mono text-xs font-bold text-accent">{archiveId}</span>
          </div>

          <h1 className="mt-3 flex items-center gap-3 text-2xl sm:text-3xl font-bold tracking-tight text-white">
            <FolderGit2 className="text-accent shrink-0" size={26} />
            <span>
              {repository.githubOwner} / <span className="text-accent">{repository.githubName}</span>
            </span>
          </h1>

          <p className="mt-2 text-sm text-zinc-300 max-w-2xl">{repository.description}</p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={repository.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 font-mono text-xs font-semibold text-zinc-200 hover:border-accent hover:text-accent transition-all shadow-sm"
          >
            <ExternalLink size={13} /> View on GitHub
          </a>
        </div>
      </div>

      {/* ─── Navigation Tabs (Horizontal swipe-friendly) ─── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-white/[0.08]">
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
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-mono text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-accent/15 border border-accent/40 text-accent shadow-sm"
                  : "bg-white/[0.02] border border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <Icon size={14} className={isActive ? "text-accent" : "text-zinc-500"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB: CODE & FILE BROWSER ─── */}
      {activeTab === "code" && (
        <div className="space-y-6">
          {/* Branch & Path Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl aiic-glass-soft px-4 py-2.5 border border-white/[0.08]">
            <div className="flex items-center gap-2 font-mono text-xs">
              <GitBranch size={13} className="text-accent" />
              <span className="font-semibold text-white">{selectedBranch}</span>
              <span className="text-zinc-600">/</span>
              <button
                onClick={() => handleNavigatePath("")}
                className="text-zinc-400 hover:text-accent transition-colors cursor-pointer"
              >
                {repository.githubName}
              </button>

              {pathParts.map((part, idx) => {
                const subPath = pathParts.slice(0, idx + 1).join("/");
                const isLast = idx === pathParts.length - 1 && !activeFile;
                return (
                  <span key={subPath} className="flex items-center gap-2">
                    <span className="text-zinc-600">/</span>
                    <button
                      onClick={() => handleNavigatePath(subPath)}
                      disabled={isLast}
                      className={isLast ? "text-white font-bold" : "text-zinc-400 hover:text-accent cursor-pointer"}
                    >
                      {part}
                    </button>
                  </span>
                );
              })}

              {activeFile && (
                <span className="flex items-center gap-2">
                  <span className="text-zinc-600">/</span>
                  <span className="font-bold text-accent">{activeFile.name}</span>
                </span>
              )}
            </div>

            {activeFile && (
              <button
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-zinc-300 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
              >
                {copied ? <Check size={12} className="text-live" /> : <Copy size={12} />}
                <span>{copied ? "Copied" : "Copy Raw"}</span>
              </button>
            )}
          </div>

          {/* Directory Listing / File Viewer */}
          {activeFile ? (
            <div className="overflow-hidden rounded-2xl aiic-glass-default border border-white/[0.08] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-4 py-2.5 font-mono text-xs text-zinc-400">
                <span className="text-white font-medium">
                  {activeFile.name} ({(activeFile.size / 1024).toFixed(1)} KB)
                </span>
                <a
                  href={activeFile.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-accent hover:underline"
                >
                  <span>GitHub Source</span> <ExternalLink size={11} />
                </a>
              </div>
              <pre className="max-h-[600px] overflow-auto p-4 sm:p-5 font-mono text-xs leading-relaxed text-zinc-200 whitespace-pre bg-[#040404]">
                <code>{activeFile.content || "// Empty or binary file"}</code>
              </pre>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl aiic-glass-default shadow-xl border border-white/[0.08]">
              <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-2.5 font-mono text-xs text-zinc-400">
                {currentPath || "Root Directory"}
              </div>

              {loadingFiles ? (
                <div className="p-8 text-center font-mono text-xs text-zinc-400">
                  Loading files from GitHub API...
                </div>
              ) : files.length > 0 ? (
                <div className="divide-y divide-white/[0.04]">
                  {currentPath && (
                    <button
                      onClick={() => {
                        const parent = pathParts.slice(0, -1).join("/");
                        handleNavigatePath(parent);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left font-mono text-xs text-zinc-400 hover:bg-white/[0.04] hover:text-white transition-colors cursor-pointer"
                    >
                      <Folder size={14} className="text-accent" /> .. (parent directory)
                    </button>
                  )}
                  {files.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => handleItemClick(file)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left font-mono text-xs hover:bg-white/[0.04] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        {file.type === "dir" ? (
                          <Folder size={14} className="text-accent shrink-0" />
                        ) : (
                          <File size={14} className="text-zinc-500 shrink-0" />
                        )}
                        <span className="text-zinc-200">{file.name}</span>
                      </div>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {file.type === "dir" ? "folder" : `${(file.size / 1024).toFixed(1)} KB`}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center font-mono text-xs text-zinc-400">
                  No files found at this path.
                </div>
              )}
            </div>
          )}

          {/* Render README if at root */}
          {!currentPath && initialReadme && !activeFile && (
            <div className="aiic-glass-default rounded-2xl p-6 sm:p-8 shadow-xl border border-white/[0.08] space-y-4">
              <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 font-mono text-xs font-bold uppercase tracking-wider text-accent">
                <FileCode size={14} />
                <span>README.md</span>
              </div>
              <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-300 prose prose-invert max-w-none">
                {initialReadme}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: COMMITS ─── */}
      {activeTab === "commits" && (
        <div className="space-y-4">
          <div className="aiic-glass-default rounded-2xl divide-y divide-white/[0.06] shadow-xl overflow-hidden">
            {initialCommits.map((commit) => (
              <div key={commit.sha} className="flex items-center justify-between p-4 sm:p-5 hover:bg-white/[0.03] transition-colors">
                <div className="space-y-1 min-w-0 pr-4">
                  <p className="text-sm font-semibold text-white truncate">{commit.message}</p>
                  <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
                    <span>{commit.authorName}</span>
                    <span>·</span>
                    <span>{new Date(commit.date).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs shrink-0">
                  <span className="rounded-md bg-white/[0.04] px-2.5 py-1 text-accent border border-white/[0.08] font-bold">
                    {commit.shortSha}
                  </span>
                  <a
                    href={commit.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
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
              <div key={rel.id} className="aiic-glass-default rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-accent/10 px-3 py-1 font-mono text-xs font-bold text-accent border border-accent/25">
                      {rel.tagName}
                    </span>
                    <h3 className="text-base font-bold text-white">{rel.name}</h3>
                  </div>
                  <span className="font-mono text-xs text-zinc-400">
                    {new Date(rel.publishedAt).toLocaleDateString()}
                  </span>
                </div>

                {rel.description && (
                  <p className="whitespace-pre-wrap text-sm text-zinc-300 leading-relaxed">
                    {rel.description}
                  </p>
                )}

                <div className="pt-3 border-t border-white/[0.08] flex items-center gap-3">
                  {rel.tarballUrl && (
                    <a
                      href={rel.tarballUrl}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 font-mono text-xs font-medium text-zinc-200 hover:border-accent hover:text-accent transition-colors"
                    >
                      <Download size={12} /> Source (tar.gz)
                    </a>
                  )}
                  <a
                    href={rel.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    <span>View on GitHub</span> <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className="aiic-glass-soft rounded-2xl p-10 text-center text-zinc-400 font-mono text-xs">
              No releases tagged in this repository yet.
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: CONTRIBUTORS ─── */}
      {activeTab === "contributors" && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {initialContributors.map((c) => (
            <div key={c.login} className="aiic-glass-default flex items-center gap-3.5 rounded-2xl p-4 shadow-lg">
              <img
                src={c.avatarUrl || "/corvus-logo-small.png"}
                alt={c.login}
                className="h-10 w-10 rounded-xl border border-white/[0.08] bg-black"
              />
              <div className="min-w-0 flex-1">
                <a
                  href={c.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-mono text-sm font-semibold text-white hover:text-accent flex items-center gap-1 transition-colors"
                >
                  <span className="truncate">{c.login}</span> <ExternalLink size={11} className="shrink-0" />
                </a>
                <p className="font-mono text-xs text-zinc-400 mt-0.5">
                  {c.contributions} commit{c.contributions !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── TAB: ABOUT / INSTITUTIONAL RECORD ─── */}
      {activeTab === "about" && (
        <div className="aiic-glass-premium space-y-6 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield size={18} className="text-accent" /> Institutional Archival Record
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 font-mono text-xs">
            <div className="rounded-xl aiic-glass-soft p-4 border border-white/[0.08]">
              <span className="text-zinc-400">Archive Identifier:</span>
              <p className="mt-1 font-bold text-accent text-sm">{archiveId}</p>
            </div>
            <div className="rounded-xl aiic-glass-soft p-4 border border-white/[0.08]">
              <span className="text-zinc-400">Institution:</span>
              <p className="mt-1 font-bold text-white text-sm">Bal Bhawan School (AIIC)</p>
            </div>
            <div className="rounded-xl aiic-glass-soft p-4 border border-white/[0.08]">
              <span className="text-zinc-400">Source of Truth:</span>
              <p className="mt-1 font-bold text-white text-sm">GitHub Organization</p>
            </div>
            <div className="rounded-xl aiic-glass-soft p-4 border border-white/[0.08]">
              <span className="text-zinc-400">Sync Status:</span>
              <p className="mt-1 font-bold text-live text-sm">✓ Live Synchronized</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * AIIC Institutional Archive - Core Types
 * 
 * Defines all archive entities, including GitHub repositories, Papra-style documents,
 * project links, metadata, versioning, and unified archive indexing.
 */

export type ArchiveRecordType =
  | "repository"
  | "document"
  | "video"
  | "build"
  | "project"
  | "event"
  | "publication"
  | "announcement"
  | "milestone"
  | "leadership"
  | "website_release"
  | "chat_release"
  | "media"
  | "policy"
  | "report"
  | "other";

export type ArchiveSyncStatus = "synced" | "syncing" | "failed" | "never_synced";

export interface AIICArchiveVideo {
  archiveId: string;
  youtubeUrl: string;
  youtubeId: string;
  title?: string;
  speaker?: string;
  duration?: string;
  channelTitle?: string;
  thumbnailUrl: string;
  embedUrl: string;
}

export interface AIICArchiveBuild {
  archiveId: string;
  version: string;
  buildUrl?: string;
  artifactUrl?: string;
  environment: "production" | "staging" | "preview" | "release";
  commitSha?: string;
  releaseNotes?: string;
}

export interface AIICArchiveRecord {
  archiveId: string; // e.g. "AIIC-2026-000001"
  title: string;
  description: string;
  type: ArchiveRecordType;
  session: string; // e.g. "2026–27"
  year: number; // e.g. 2026
  status: "Active" | "Archived" | "Draft" | "Deprecated";
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  featured?: boolean;
  
  // Specific payload fields attached to unified record
  repository?: AIICArchiveRepository;
  document?: AIICArchiveDocument;
  video?: AIICArchiveVideo;
  build?: AIICArchiveBuild;
  relatedProjects?: string[]; // IDs or titles
  relatedRepositories?: string[]; // Archive IDs
  relatedDocuments?: string[]; // Archive IDs
  historyNotes?: string;
}

export interface AIICArchiveRepository {
  archiveId: string;
  githubRepositoryId?: number;
  githubOwner: string;
  githubName: string;
  githubUrl: string;
  defaultBranch: string;
  description: string;
  language?: string;
  topics: string[];
  starsCount?: number;
  forksCount?: number;
  openIssuesCount?: number;
  lastSyncedAt?: string;
  syncStatus: ArchiveSyncStatus;
  syncError?: string;
  
  // Cached GitHub data
  readme?: string;
  branches?: string[];
  releases?: AIICGitHubRelease[];
  recentCommits?: AIICGitHubCommit[];
  contributors?: AIICGitHubContributor[];
}

export interface AIICGitHubCommit {
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  authorAvatar?: string;
  authorLogin?: string;
  date: string;
  url: string;
  additions?: number;
  deletions?: number;
  changedFiles?: number;
}

export interface AIICGitHubRelease {
  id: number;
  tagName: string;
  name: string;
  description?: string;
  publishedAt: string;
  authorLogin: string;
  authorAvatar?: string;
  htmlUrl: string;
  tarballUrl?: string;
  zipballUrl?: string;
  assets?: {
    name: string;
    size: number;
    downloadUrl: string;
  }[];
}

export interface AIICGitHubContributor {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  contributions: number;
  name?: string;
}

export interface AIICGitHubFileItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  htmlUrl: string;
  type: "file" | "dir" | "symlink" | "submodule";
  content?: string;
  encoding?: string;
}

export interface AIICArchiveDocumentVersion {
  version: string; // e.g. "v1.0", "v1.1"
  uploadedAt: string;
  uploaderName: string;
  fileName: string;
  fileSize: number; // in bytes
  mimeType: string;
  fileUrl: string;
  sha256?: string;
  changeNote?: string;
}

export interface AIICArchiveDocument {
  archiveId: string;
  category: "Prospectus" | "Policy" | "Specification" | "Research Paper" | "Report" | "Guide" | "Official Record" | "Other";
  author: string;
  currentVersion: string;
  versions: AIICArchiveDocumentVersion[];
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sha256?: string;
  summary?: string;
  downloadCount?: number;
}

export interface AIICArchiveStats {
  totalRecords: number;
  totalRepositories: number;
  totalDocuments: number;
  totalProjects: number;
  totalReleases: number;
  sessions: string[];
}

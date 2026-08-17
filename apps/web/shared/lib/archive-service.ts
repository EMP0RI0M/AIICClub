import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { fetchGitHubRepo } from "./github";
import type {
  AIICArchiveRecord,
  AIICArchiveStats,
  AIICArchiveRepository,
  AIICArchiveDocument,
  AIICArchiveVideo,
  AIICArchiveBuild,
} from "./archive-types";

// ─────────────────────────────────────────────────────────────
// PERMANENT ARCHIVE NUMBER GENERATOR
// Format: AIIC-YEAR-SEQUENCE (e.g. AIIC-2026-000001)
// ─────────────────────────────────────────────────────────────

export async function generateNextArchiveId(year: number = new Date().getFullYear()): Promise<string> {
  const supabase = getSupabaseAdmin();
  try {
    const prefix = `AIIC-${year}-`;
    const { data, error } = await supabase
      .from("archive_records")
      .select("archive_id")
      .ilike("archive_id", `${prefix}%`)
      .order("archive_id", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return `${prefix}000001`;
    }

    const lastId = data[0].archive_id as string;
    const numPart = lastId.replace(prefix, "");
    const parsed = parseInt(numPart, 10);
    const nextNum = isNaN(parsed) ? 1 : parsed + 1;
    return `${prefix}${String(nextNum).padStart(6, "0")}`;
  } catch {
    const timestampSeq = String(Date.now()).slice(-6);
    return `AIIC-${year}-${timestampSeq}`;
  }
}

// ─────────────────────────────────────────────────────────────
// YOUTUBE VIDEO ID EXTRACTOR
// ─────────────────────────────────────────────────────────────

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
  const match = url.trim().match(regExp);
  return match && match[1] ? match[1] : null;
}

// ─────────────────────────────────────────────────────────────
// DEFAULT SEED ARCHIVE ENTRIES
// ─────────────────────────────────────────────────────────────

export const DEFAULT_ARCHIVE_RECORDS: AIICArchiveRecord[] = [];

// ─────────────────────────────────────────────────────────────
// ARCHIVE QUERY FUNCTIONS
// ─────────────────────────────────────────────────────────────

export async function getArchiveRecords(): Promise<AIICArchiveRecord[]> {
  const supabase = getSupabaseAdmin();
  try {
    const { data, error } = await supabase
      .from("archive_records")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return DEFAULT_ARCHIVE_RECORDS;
    }

    return data.map((r: any) => {
      let parsedNotes: any = {};
      try {
        if (r.history_notes && typeof r.history_notes === "string" && r.history_notes.startsWith("{")) {
          parsedNotes = JSON.parse(r.history_notes);
        }
      } catch {}

      // Video deserialization
      let videoData: AIICArchiveVideo | undefined = undefined;
      const isVideoType = r.type === "video" || parsedNotes.type === "video" || Boolean(parsedNotes.youtubeId || parsedNotes.youtubeUrl);
      if (isVideoType) {
        const ytId = parsedNotes.youtubeId || extractYouTubeId(parsedNotes.youtubeUrl || r.description || "") || "";
        videoData = {
          archiveId: r.archive_id,
          youtubeUrl: parsedNotes.youtubeUrl || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : ""),
          youtubeId: ytId,
          title: parsedNotes.title || r.title,
          speaker: parsedNotes.speaker || undefined,
          duration: parsedNotes.duration || undefined,
          channelTitle: parsedNotes.channelTitle || "AIIC Bal Bhawan",
          thumbnailUrl: parsedNotes.thumbnailUrl || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : ""),
          embedUrl: ytId ? `https://www.youtube-nocookie.com/embed/${ytId}` : "",
        };
      }

      // Build deserialization
      let buildData: AIICArchiveBuild | undefined = undefined;
      const isBuildType = r.type === "build" || parsedNotes.type === "build" || Boolean(parsedNotes.buildUrl || parsedNotes.artifactUrl);
      if (isBuildType) {
        buildData = {
          archiveId: r.archive_id,
          version: parsedNotes.version || "v1.0.0",
          buildUrl: parsedNotes.buildUrl || undefined,
          artifactUrl: parsedNotes.artifactUrl || undefined,
          environment: parsedNotes.environment || "production",
          commitSha: parsedNotes.commitSha || undefined,
          releaseNotes: parsedNotes.releaseNotes || r.description,
        };
      }

      return {
        archiveId: r.archive_id,
        title: r.title,
        description: r.description || "",
        type: r.type || (isVideoType ? "video" : isBuildType ? "build" : "document"),
        session: r.session || "2026–27",
        year: r.year || 2026,
        status: r.status || "Active",
        tags: r.tags || [],
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        createdBy: r.created_by,
        featured: r.featured || false,
        repository: parsedNotes.repository || r.repository_data || undefined,
        document: parsedNotes.document || r.document_data || undefined,
        video: videoData,
        build: buildData,
        relatedProjects: r.related_projects || [],
        relatedRepositories: r.related_repositories || [],
        relatedDocuments: r.related_documents || [],
        historyNotes: r.history_notes,
      };
    });
  } catch {
    return DEFAULT_ARCHIVE_RECORDS;
  }
}

export async function getArchiveRecordById(archiveId: string): Promise<AIICArchiveRecord | null> {
  const records = await getArchiveRecords();
  const found = records.find((r) => r.archiveId.toLowerCase() === archiveId.toLowerCase());
  return found || null;
}

export async function getArchiveStats(): Promise<AIICArchiveStats> {
  const records = await getArchiveRecords();
  const repositories = records.filter((r) => r.type === "repository" || !!r.repository);
  const documents = records.filter((r) => r.type === "document" || r.type === "policy" || r.type === "report" || !!r.document);
  const videos = records.filter((r) => r.type === "video" || !!r.video);
  const builds = records.filter((r) => r.type === "build" || !!r.build);
  const projects = records.filter((r) => r.type === "project");
  const releases = records.filter((r) => r.type === "website_release" || r.type === "chat_release" || !!r.build);
  const sessions = Array.from(new Set(records.map((r) => r.session))).filter(Boolean);

  return {
    totalRecords: records.length,
    totalRepositories: repositories.length,
    totalDocuments: documents.length,
    totalProjects: projects.length,
    totalReleases: releases.length,
    sessions,
  };
}

// ─────────────────────────────────────────────────────────────
// REGISTRATION FUNCTIONS
// ─────────────────────────────────────────────────────────────

export async function registerVideoArchive(
  youtubeUrl: string,
  title: string,
  description: string,
  session: string = "2026–27",
  speaker?: string,
  duration?: string,
  tags: string[] = ["video", "youtube", "workshop"],
  actorUserId?: string
): Promise<{ success: boolean; record?: AIICArchiveRecord; error?: string }> {
  try {
    const ytId = extractYouTubeId(youtubeUrl);
    if (!ytId) {
      return { success: false, error: "Invalid YouTube URL. Please provide a valid YouTube watch, embed, or short link." };
    }

    if (!title || !title.trim()) {
      return { success: false, error: "Video title is required." };
    }

    const archiveId = await generateNextArchiveId();
    const cleanTags = Array.from(new Set(["video", "youtube", ...(tags || []).map((t) => t.trim()).filter(Boolean)]));
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const videoPayload: AIICArchiveVideo = {
      archiveId,
      youtubeUrl: `https://www.youtube.com/watch?v=${ytId}`,
      youtubeId: ytId,
      title: title.trim(),
      speaker: speaker?.trim() || undefined,
      duration: duration?.trim() || undefined,
      channelTitle: "AIIC Bal Bhawan",
      thumbnailUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}`,
    };

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("archive_records").insert({
      archive_id: archiveId,
      title: title.trim(),
      slug: slug || archiveId.toLowerCase(),
      description: description?.trim() || `YouTube Workshop Recording: ${title}`,
      type: "video",
      session,
      year: new Date().getFullYear(),
      status: "Active",
      visibility: "public",
      tags: cleanTags,
      history_notes: JSON.stringify({ type: "video", ...videoPayload }),
      created_by: actorUserId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;

    return {
      success: true,
      record: {
        archiveId,
        title: title.trim(),
        description: description?.trim() || "",
        type: "video",
        session,
        year: new Date().getFullYear(),
        status: "Active",
        tags: cleanTags,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        video: videoPayload,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to register video archive record." };
  }
}

export async function registerBuildArchive(
  version: string,
  title: string,
  description: string,
  buildUrl?: string,
  artifactUrl?: string,
  environment: "production" | "staging" | "preview" | "release" = "production",
  session: string = "2026–27",
  tags: string[] = ["build", "release"],
  actorUserId?: string
): Promise<{ success: boolean; record?: AIICArchiveRecord; error?: string }> {
  try {
    if (!version || !version.trim()) {
      return { success: false, error: "Build version is required (e.g. v1.0.0)." };
    }

    const archiveId = await generateNextArchiveId();
    const cleanTags = Array.from(new Set(["build", "release", ...(tags || []).map((t) => t.trim()).filter(Boolean)]));
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${version.toLowerCase()}`.replace(/^-|-$/g, "");

    const buildPayload: AIICArchiveBuild = {
      archiveId,
      version: version.trim(),
      buildUrl: buildUrl?.trim() || undefined,
      artifactUrl: artifactUrl?.trim() || undefined,
      environment,
      releaseNotes: description?.trim() || undefined,
    };

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("archive_records").insert({
      archive_id: archiveId,
      title: title.trim() || `AIIC Platform Build ${version}`,
      slug: slug || archiveId.toLowerCase(),
      description: description?.trim() || `Production build ${version}`,
      type: "build",
      session,
      year: new Date().getFullYear(),
      status: "Active",
      visibility: "public",
      tags: cleanTags,
      history_notes: JSON.stringify({ type: "build", ...buildPayload }),
      created_by: actorUserId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;

    return {
      success: true,
      record: {
        archiveId,
        title: title.trim(),
        description: description?.trim() || "",
        type: "build",
        session,
        year: new Date().getFullYear(),
        status: "Active",
        tags: cleanTags,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        build: buildPayload,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to register build archive record." };
  }
}

export async function registerGitHubRepository(
  githubUrl: string,
  session: string = "2026–27",
  title?: string,
  description?: string,
  tags: string[] = ["open-source", "github", "repository"],
  actorUserId?: string
): Promise<{ success: boolean; record?: AIICArchiveRecord; error?: string }> {
  try {
    const parsed = githubUrl.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)/);
    if (!parsed) {
      return { success: false, error: "Invalid GitHub repository URL. Must be in format https://github.com/owner/repo" };
    }

    const owner = parsed[1];
    const repo = parsed[2].replace(/\.git$/, "");

    // Fetch repository data from GitHub
    const ghData = await fetchGitHubRepo(owner, repo);
    if (!ghData) {
      return { success: false, error: "Could not locate GitHub repository. Please verify visibility or URL." };
    }

    const archiveId = await generateNextArchiveId();
    const repoPayload: AIICArchiveRepository = {
      archiveId,
      githubRepositoryId: ghData.githubRepositoryId,
      githubOwner: owner,
      githubName: repo,
      githubUrl: `https://github.com/${owner}/${repo}`,
      defaultBranch: ghData.defaultBranch || "main",
      description: ghData.description || "",
      language: ghData.language || "TypeScript",
      topics: ghData.topics || [],
      starsCount: ghData.starsCount,
      forksCount: ghData.forksCount,
      syncStatus: "synced",
      lastSyncedAt: new Date().toISOString(),
    };

    const cleanTags = Array.from(new Set([...tags, ...(ghData.topics || [])]));
    const slug = `${owner}-${repo}`.toLowerCase();

    // Store in Supabase archive_records & repositories tables
    const supabase = getSupabaseAdmin();
    await supabase.from("archive_records").insert({
      archive_id: archiveId,
      title: title || ghData.githubName || repo,
      slug,
      description: description || ghData.description || `AIIC Indexed GitHub Repository: ${owner}/${repo}`,
      type: "repository",
      session,
      year: new Date().getFullYear(),
      status: "Active",
      visibility: "public",
      tags: cleanTags,
      history_notes: JSON.stringify({ type: "repository", repository: repoPayload }),
      created_by: actorUserId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    try {
      await supabase.from("repositories").upsert({
        archive_id: archiveId,
        github_repository_id: ghData.githubRepositoryId,
        github_owner: owner,
        github_name: repo,
        github_url: `https://github.com/${owner}/${repo}`,
        default_branch: ghData.defaultBranch || "main",
        description: ghData.description || "",
        language: ghData.language || "TypeScript",
        topics: ghData.topics || [],
        stars_count: ghData.starsCount || 0,
        forks_count: ghData.forksCount || 0,
        open_issues_count: ghData.openIssuesCount || 0,
        sync_status: "synced",
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "github_owner,github_name" });
    } catch {}

    return {
      success: true,
      record: {
        archiveId,
        title: title || repo,
        description: description || ghData.description || "",
        type: "repository",
        session,
        year: new Date().getFullYear(),
        status: "Active",
        tags: cleanTags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        repository: repoPayload,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to register repository." };
  }
}

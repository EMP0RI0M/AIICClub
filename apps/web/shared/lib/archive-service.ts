import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { fetchGitHubRepo, parseGitHubUrl } from "./github";
import type {
  AIICArchiveRecord,
  AIICArchiveStats,
  AIICArchiveRepository,
  AIICArchiveDocument,
  AIICArchiveVideo,
  AIICArchiveBuild,
} from "./archive-types";
import { ingestKnowledgeDocument } from "@/shared/lib/knowledge/engine";
import { fetchYouTubeTranscript } from "./knowledge/youtube-transcript";

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

/**
 * Parses ISO 8601 duration (e.g. PT1H15M33S) into standard human-readable format (1:15:33 or 15:33)
 */
function parseISO8601Duration(durationStr: string): string {
  if (!durationStr) return "";
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Fetches rich YouTube video metadata using YouTube Data API v3 with automatic oEmbed and HTML scraper fallback
 */
export async function fetchYouTubeMetadata(videoId: string): Promise<{
  title?: string;
  description?: string;
  channelTitle?: string;
  duration?: string;
  thumbnailUrl?: string;
  tags?: string[];
} | null> {
  if (!videoId) return null;
  const apiKey = process.env.YOUTUBE_API_KEY;

  let title: string | undefined = undefined;
  let description: string | undefined = undefined;
  let channelTitle: string | undefined = undefined;
  let duration: string | undefined = undefined;
  let thumbnailUrl: string | undefined = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  let tags: string[] = [];

  // Strategy 1: YouTube Data API v3
  if (apiKey) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`
      );
      if (res.ok) {
        const data = await res.json();
        const item = data?.items?.[0];
        if (item) {
          const snippet = item.snippet || {};
          const contentDetails = item.contentDetails || {};
          const thumbnails = snippet.thumbnails || {};
          thumbnailUrl =
            thumbnails.maxres?.url ||
            thumbnails.standard?.url ||
            thumbnails.high?.url ||
            thumbnails.medium?.url ||
            `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

          title = snippet.title;
          description = snippet.description;
          channelTitle = snippet.channelTitle || "AIIC Bal Bhawan";
          duration = parseISO8601Duration(contentDetails.duration);
          tags = snippet.tags || [];

          return { title, description, channelTitle, duration, thumbnailUrl, tags };
        }
      }
    } catch (err) {
      console.warn("[YOUTUBE_DATA_API_FETCH_WARN]", err);
    }
  }

  // Strategy 2: Official YouTube oEmbed API
  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { headers: { "User-Agent": "AIIC-Archive/1.0" } }
    );
    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      if (oembed.title) title = oembed.title;
      if (oembed.author_name) channelTitle = oembed.author_name;
      if (oembed.thumbnail_url) thumbnailUrl = oembed.thumbnail_url;
    }
  } catch (err) {
    console.warn("[YOUTUBE_OEMBED_FETCH_WARN]", err);
  }

  // Strategy 3: HTML Scraper Fallback
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (pageRes.ok) {
      const html = await pageRes.text();
      if (!title) {
        const titleMatch =
          html.match(/<meta name="title" content="([^"]*)"/i) ||
          html.match(/<title>([^<]*)<\/title>/i);
        if (titleMatch && titleMatch[1]) title = titleMatch[1].replace(/ - YouTube$/i, "").trim();
      }
      if (!description) {
        const descMatch =
          html.match(/<meta name="description" content="([^"]*)"/i) ||
          html.match(/"shortDescription":"([^"]*)"/i);
        if (descMatch && descMatch[1]) {
          description = descMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
        }
      }
      if (!duration) {
        const durSecMatch = html.match(/"lengthSeconds":"(\d+)"/i);
        if (durSecMatch && durSecMatch[1]) {
          const totalSec = parseInt(durSecMatch[1], 10);
          const hrs = Math.floor(totalSec / 3600);
          const mins = Math.floor((totalSec % 3600) / 60);
          const secs = totalSec % 60;
          duration = hrs > 0 ? `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${mins}:${String(secs).padStart(2, "0")}`;
        }
      }
      const kwMatch = html.match(/<meta name="keywords" content="([^"]*)"/i);
      if (kwMatch && kwMatch[1]) {
        tags = kwMatch[1].split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
      }
    }
  } catch (err) {
    console.warn("[YOUTUBE_SCRAPER_WARN]", err);
  }

  if (title || description) {
    return {
      title,
      description,
      channelTitle: channelTitle || "AIIC Bal Bhawan",
      duration,
      thumbnailUrl: thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      tags,
    };
  }

  return null;
}

export const DEFAULT_ARCHIVE_RECORDS: AIICArchiveRecord[] = [
  {
    archiveId: "AIIC-2026-000001",
    title: "AIIC Bal Bhawan Institutional Platform (Part 2)",
    description: "Official AIIC Web Platform Part 2 featuring institutional lecture archives, inline 1080p video player, LaTeX math rendering, RAG Sentinel pgvector knowledge engine, and interactive code sandboxes.",
    type: "build",
    session: "2026–27",
    year: 2026,
    status: "Active",
    tags: ["website", "part-2", "production", "nextjs", "ai-rag", "bal-bhawan"],
    createdAt: "2026-09-08T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
    featured: true,
    build: {
      archiveId: "AIIC-2026-000001",
      version: "v2.0.0",
      buildUrl: "https://aiic-bbs.vercel.app",
      environment: "production",
      releaseNotes: "Production release of Website Part 2 with live institutional archive, YouTube auto-fetch, interactive preview viewport, and AI RAG knowledge synthesis.",
    },
  },
  {
    archiveId: "AIIC-2026-000002",
    title: "AIIC Bal Bhawan Portal (Part 1 Foundation)",
    description: "Foundational build for AIIC Bal Bhawan featuring student onboarding, club registration, curriculum overview, and core club identity.",
    type: "build",
    session: "2025–26",
    year: 2025,
    status: "Active",
    tags: ["website", "part-1", "foundation", "bal-bhawan"],
    createdAt: "2025-09-01T00:00:00.000Z",
    updatedAt: "2025-09-01T00:00:00.000Z",
    featured: false,
    build: {
      archiveId: "AIIC-2026-000002",
      version: "v1.0.0",
      buildUrl: "https://aiic-bbs.vercel.app",
      environment: "production",
      releaseNotes: "Foundational platform build v1.0.0.",
    },
  },
  {
    archiveId: "AIIC-2026-000003",
    title: "Lecture 1: Web Architecture & Next.js Fullstack Engineering",
    description: "Official deep dive into Next.js App Router, SSR vs CSR, hydration boundaries, Tailwind CSS tokens, and scalable fullstack club platforms.",
    type: "video",
    session: "2026–27",
    year: 2026,
    status: "Active",
    tags: ["lecture", "web-architecture", "nextjs", "frontend", "video"],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    featured: true,
    video: {
      archiveId: "AIIC-2026-000003",
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      youtubeId: "dQw4w9WgXcQ",
      title: "Lecture 1: Web Architecture & Next.js Fullstack Engineering",
      speaker: "Rafi Ullah Khan",
      duration: "45:20",
      channelTitle: "AIIC Bal Bhawan",
      thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    },
  },
];

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

      // Document deserialization
      let docData: AIICArchiveDocument | undefined = undefined;
      const isDocType = r.type === "document" || parsedNotes.type === "document" || Boolean(parsedNotes.document || r.document_data);
      if (isDocType || parsedNotes.document) {
        const rawDoc = parsedNotes.document || r.document_data || {};
        docData = {
          ...rawDoc,
          archiveId: r.archive_id,
          fileName: rawDoc.fileName || `${r.title}.md`,
          fileSize: rawDoc.fileSize || (parsedNotes.content || r.description || "").length,
          mimeType: rawDoc.mimeType || "text/markdown",
          fileUrl: rawDoc.fileUrl || `/archive/${r.archive_id}`,
          content: parsedNotes.content || rawDoc.content || r.description || undefined,
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
        document: docData,
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

    // Automatically enrich with YouTube Data API v3 if available
    const ytMeta = await fetchYouTubeMetadata(ytId);

    const resolvedTitle = title.trim() || ytMeta?.title || `YouTube Video ${ytId}`;
    const resolvedDesc = description?.trim() || ytMeta?.description || `YouTube Workshop Recording: ${resolvedTitle}`;
    const resolvedDuration = duration?.trim() || ytMeta?.duration || undefined;
    const resolvedChannel = ytMeta?.channelTitle || "AIIC Bal Bhawan";
    const resolvedThumbnail = ytMeta?.thumbnailUrl || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;

    const archiveId = await generateNextArchiveId();
    const cleanTags = Array.from(new Set(["video", "youtube", ...(tags || []).map((t) => t.trim()), ...(ytMeta?.tags || [])].filter(Boolean)));
    const slug = resolvedTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const videoPayload: AIICArchiveVideo = {
      archiveId,
      youtubeUrl: `https://www.youtube.com/watch?v=${ytId}`,
      youtubeId: ytId,
      title: resolvedTitle,
      speaker: speaker?.trim() || undefined,
      duration: resolvedDuration,
      channelTitle: resolvedChannel,
      thumbnailUrl: resolvedThumbnail,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}`,
    };

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("archive_records").insert({
      archive_id: archiveId,
      title: resolvedTitle,
      slug: slug || archiveId.toLowerCase(),
      description: resolvedDesc,
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

    // Trigger asynchronous YouTube Transcript Extraction & Knowledge Vector Ingestion
    void (async () => {
      try {
        const transcriptResult = await fetchYouTubeTranscript(ytId, resolvedDesc);
        const transcriptText = transcriptResult?.fullTranscript || resolvedDesc;
        await ingestKnowledgeDocument({
          sourceId: archiveId,
          sourceType: "youtube_lecture",
          archiveId,
          title: resolvedTitle,
          description: resolvedDesc,
          content: `${resolvedTitle}\nSpeaker: ${speaker || "AIIC Faculty"}\nSession: ${session}\nDescription: ${resolvedDesc}\n\nTRANSCRIPT & TIMESTAMPED LECTURE PASSAGES:\n${transcriptText}`,
          url: `https://www.youtube.com/watch?v=${ytId}`,
          metadata: {
            speaker: speaker || "AIIC Faculty",
            session,
            tags: cleanTags,
            hasSubtitles: transcriptResult?.hasSubtitles || false,
            totalWords: transcriptResult?.totalWords || 0,
          },
        });
      } catch (kErr) {
        console.warn("[VIDEO_TRANSCRIPT_VECTOR_INGEST_WARN]", kErr);
      }
    })();

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

export async function registerDocumentArchive(
  title: string,
  description: string,
  category: string = "Official Study Notes",
  session: string = "2026–27",
  content?: string,
  fileUrl?: string,
  tags: string[] = ["document", "official"],
  actorUserId?: string
): Promise<{ success: boolean; record?: AIICArchiveRecord; error?: string }> {
  try {
    if (!title || !title.trim()) {
      return { success: false, error: "Document title is required." };
    }

    const archiveId = await generateNextArchiveId();
    const cleanTags = Array.from(new Set(["document", ...(tags || []).map((t) => t.trim()).filter(Boolean)]));
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString().slice(-4)}`.replace(/^-|-$/g, "");

    const documentPayload: AIICArchiveDocument = {
      archiveId,
      category,
      author: "AIIC Faculty / Executive Board",
      currentVersion: "v1.0",
      fileName: `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.md`,
      fileSize: (content || description || "").length,
      mimeType: "text/markdown",
      fileUrl: fileUrl || `/archive/${archiveId}`,
      summary: description,
      versions: [
        {
          version: "v1.0",
          uploadedAt: new Date().toISOString(),
          uploaderName: "AIIC Faculty",
          fileName: `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.md`,
          fileSize: (content || description || "").length,
          mimeType: "text/markdown",
          fileUrl: fileUrl || `/archive/${archiveId}`,
          changeNote: "Initial archive deposit.",
        },
      ],
    };

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("archive_records").insert({
      archive_id: archiveId,
      title: title.trim(),
      slug: slug || archiveId.toLowerCase(),
      description: description?.trim() || `Archived institutional document: ${title}`,
      type: "document",
      session,
      year: new Date().getFullYear(),
      status: "Active",
      visibility: "public",
      tags: cleanTags,
      history_notes: JSON.stringify({ type: "document", document: documentPayload, content: content || description }),
      created_by: actorUserId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;

    // Trigger asynchronous Knowledge Engine Ingestion
    void ingestKnowledgeDocument({
      sourceId: archiveId,
      sourceType: "archive_document",
      archiveId,
      title: title.trim(),
      description: description?.trim() || "",
      content: content ? `${title.trim()}\n\nCategory: ${category}\nSession: ${session}\n\n${content}` : `${title.trim()}\n\n${description}`,
      url: `/archive/${archiveId}`,
      visibility: "public",
      metadata: {
        category,
        session,
        tags: cleanTags,
      },
    }).catch((kErr) => console.warn("[KNOWLEDGE_AUTO_INDEX_WARN]", kErr));

    return {
      success: true,
      record: {
        archiveId,
        title: title.trim(),
        description: description?.trim() || "",
        type: "document",
        session,
        year: new Date().getFullYear(),
        status: "Active",
        tags: cleanTags,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        document: documentPayload,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to register document archive record." };
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

// ─────────────────────────────────────────────────────────────
// EDIT & DELETE ARCHIVE RECORD (CREATOR / ADMIN AUTHORIZED)
// ─────────────────────────────────────────────────────────────

export async function updateArchiveRecord(
  archiveId: string,
  updates: {
    title?: string;
    description?: string;
    session?: string;
    tags?: string[];
    youtubeUrl?: string;
    speaker?: string;
    duration?: string;
    version?: string;
    buildUrl?: string;
    artifactUrl?: string;
    environment?: "production" | "staging" | "preview" | "release";
    githubUrl?: string;
    category?: string;
  },
  actorUserId?: string,
  isElevated: boolean = true
): Promise<{ success: boolean; record?: AIICArchiveRecord; error?: string; status?: number }> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: fetchErr } = await supabase
      .from("archive_records")
      .select("*")
      .eq("archive_id", archiveId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return { success: false, error: "Archive record not found.", status: 404 };
    }

    // Resolve actor's identifiers (both public.users.id and auth_user_id)
    let isCreator = Boolean(existing.created_by && existing.created_by === actorUserId);
    if (!isCreator && existing.created_by) {
      const { data: actorUser } = await supabase
        .from("users")
        .select("id, auth_user_id")
        .or(`id.eq.${actorUserId},auth_user_id.eq.${actorUserId}`)
        .maybeSingle();

      if (actorUser) {
        isCreator =
          existing.created_by === actorUser.id ||
          existing.created_by === actorUser.auth_user_id;
      }
    }

    if (!isCreator && !isElevated) {
      return { success: false, error: "Forbidden: You are not authorized to edit this archive record.", status: 403 };
    }

    let parsedNotes: any = {};
    try {
      if (existing.history_notes && typeof existing.history_notes === "string" && existing.history_notes.startsWith("{")) {
        parsedNotes = JSON.parse(existing.history_notes);
      }
    } catch {}

    const cleanTitle = updates.title !== undefined ? updates.title.trim() : existing.title;
    const cleanDesc = updates.description !== undefined ? updates.description.trim() : existing.description;
    const cleanSession = updates.session || existing.session || "2026–27";
    const cleanTags = updates.tags !== undefined ? updates.tags : existing.tags;

    // Handle video metadata updates
    if (existing.type === "video" || updates.youtubeUrl) {
      if (updates.youtubeUrl) {
        const ytId = extractYouTubeId(updates.youtubeUrl);
        if (ytId) {
          parsedNotes.youtubeUrl = `https://www.youtube.com/watch?v=${ytId}`;
          parsedNotes.youtubeId = ytId;
          parsedNotes.thumbnailUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
          parsedNotes.embedUrl = `https://www.youtube-nocookie.com/embed/${ytId}`;
        }
      }
      if (updates.speaker !== undefined) parsedNotes.speaker = updates.speaker.trim() || undefined;
      if (updates.duration !== undefined) parsedNotes.duration = updates.duration.trim() || undefined;
      parsedNotes.title = cleanTitle;
    }

    // Handle build metadata updates
    if (existing.type === "build" || updates.version) {
      if (updates.version) parsedNotes.version = updates.version.trim();
      if (updates.buildUrl !== undefined) parsedNotes.buildUrl = updates.buildUrl.trim() || undefined;
      if (updates.artifactUrl !== undefined) parsedNotes.artifactUrl = updates.artifactUrl.trim() || undefined;
      if (updates.environment) parsedNotes.environment = updates.environment;
      parsedNotes.releaseNotes = cleanDesc;
    }

    // Handle repository metadata updates
    if (existing.type === "repository" || updates.githubUrl) {
      if (updates.githubUrl) {
        const parsed = parseGitHubUrl(updates.githubUrl);
        if (parsed) {
          if (!parsedNotes.repository) parsedNotes.repository = {};
          parsedNotes.repository.githubOwner = parsed.owner;
          parsedNotes.repository.githubName = parsed.repo;
          parsedNotes.repository.githubUrl = `https://github.com/${parsed.owner}/${parsed.repo}`;
        }
      }
      if (parsedNotes.repository) {
        parsedNotes.repository.description = cleanDesc;
      }
    }

    // Handle document metadata updates
    if (updates.category) {
      parsedNotes.category = updates.category;
    }

    const { data: updated, error: updateErr } = await supabase
      .from("archive_records")
      .update({
        title: cleanTitle,
        description: cleanDesc,
        session: cleanSession,
        tags: cleanTags,
        history_notes: JSON.stringify(parsedNotes),
        updated_at: new Date().toISOString(),
      })
      .eq("archive_id", archiveId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Also update repositories table if linked
    if (updates.githubUrl || cleanTitle || cleanDesc) {
      try {
        const repoUpdate: any = {};
        if (cleanTitle) repoUpdate.github_name = cleanTitle;
        if (cleanDesc) repoUpdate.description = cleanDesc;
        if (updates.githubUrl) {
          const parsed = parseGitHubUrl(updates.githubUrl);
          if (parsed) {
            repoUpdate.github_owner = parsed.owner;
            repoUpdate.github_name = parsed.repo;
            repoUpdate.github_url = `https://github.com/${parsed.owner}/${parsed.repo}`;
          }
        }
        if (Object.keys(repoUpdate).length > 0) {
          await supabase.from("repositories").update(repoUpdate).eq("archive_id", archiveId);
        }
      } catch {}
    }

    const fullRecord = await getArchiveRecordById(archiveId);
    return { success: true, record: fullRecord || undefined };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update archive record.", status: 500 };
  }
}

export async function deleteArchiveRecord(
  archiveId: string,
  actorUserId?: string,
  isElevated: boolean = true
): Promise<{ success: boolean; archiveId?: string; error?: string; status?: number }> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: fetchErr } = await supabase
      .from("archive_records")
      .select("*")
      .eq("archive_id", archiveId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return { success: false, error: "Archive record not found.", status: 404 };
    }

    // Resolve actor's identifiers (both public.users.id and auth_user_id)
    let isCreator = Boolean(existing.created_by && existing.created_by === actorUserId);
    if (!isCreator && existing.created_by) {
      const { data: actorUser } = await supabase
        .from("users")
        .select("id, auth_user_id")
        .or(`id.eq.${actorUserId},auth_user_id.eq.${actorUserId}`)
        .maybeSingle();

      if (actorUser) {
        isCreator =
          existing.created_by === actorUser.id ||
          existing.created_by === actorUser.auth_user_id;
      }
    }

    if (!isCreator && !isElevated) {
      return { success: false, error: "Forbidden: You are not authorized to delete this archive record.", status: 403 };
    }

    // Delete associated repository record if exists
    try {
      await supabase.from("repositories").delete().eq("archive_id", archiveId);
    } catch {}

    const { error: deleteErr } = await supabase
      .from("archive_records")
      .delete()
      .eq("archive_id", archiveId);

    if (deleteErr) throw deleteErr;

    return { success: true, archiveId };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete archive record.", status: 500 };
  }
}

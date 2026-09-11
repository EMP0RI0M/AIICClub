import { NextRequest, NextResponse } from "next/server";
import {
  getArchiveRecords,
  registerGitHubRepository,
  registerVideoArchive,
  registerBuildArchive,
  registerDocumentArchive,
  getArchiveStats,
  updateArchiveRecord,
  deleteArchiveRecord,
} from "@/shared/lib/archive-service";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { ingestKnowledgeDocument } from "@/shared/lib/knowledge/engine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const session = searchParams.get("session");
    const q = searchParams.get("q")?.toLowerCase();

    const records = await getArchiveRecords();
    let filtered = records;

    if (type && type !== "all") {
      filtered = filtered.filter((r) => r.type === type);
    }
    if (session && session !== "all") {
      filtered = filtered.filter((r) => r.session === session);
    }
    if (q) {
      filtered = filtered.filter((r) =>
        (r.archiveId || "").toLowerCase().includes(q) ||
        (r.title || "").toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q) ||
        (r.tags || []).some((t) => (t || "").toLowerCase().includes(q)) ||
        (r.repository?.githubName || "").toLowerCase().includes(q) ||
        (r.video?.speaker || "").toLowerCase().includes(q) ||
        (r.build?.version || "").toLowerCase().includes(q) ||
        (r.document?.fileName || "").toLowerCase().includes(q)
      );
    }

    const stats = await getArchiveStats();
    return NextResponse.json({ records: filtered, stats });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch archive records" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req).catch(() => null);
    const userId = user?.id || null;

    const body = await req.json();
    const {
      type,
      title,
      description,
      category,
      content,
      fileUrl,
      session,
      tags,
      youtubeUrl,
      speaker,
      duration,
      version,
      buildUrl,
      artifactUrl,
      environment,
      githubUrl,
    } = body;

    // 1. Document / Lecture Notes Submission
    if (type === "document" || type === "notes" || type === "lecture") {
      if (!title) {
        return NextResponse.json({ error: "Title is required for document/lecture submissions." }, { status: 400 });
      }
      const result = await registerDocumentArchive(
        title,
        description || "",
        category || "Official Study Notes",
        session || "2026–27",
        content,
        fileUrl,
        tags || ["document", "official"],
        userId || undefined
      );
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ record: result.record }, { status: 201 });
    }

    // 2. YouTube Video Submission
    if (type === "video" || youtubeUrl) {
      if (!youtubeUrl) {
        return NextResponse.json({ error: "YouTube URL is required for video submissions." }, { status: 400 });
      }
      const result = await registerVideoArchive(
        youtubeUrl,
        title || "AIIC Lecture Video",
        description || "",
        session || "2026–27",
        speaker,
        duration,
        tags || ["video", "youtube"],
        userId || undefined
      );
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ record: result.record }, { status: 201 });
    }

    // 3. Build Submission
    if (type === "build" || version) {
      if (!version) {
        return NextResponse.json({ error: "Build version is required (e.g. v1.0.0)." }, { status: 400 });
      }
      const result = await registerBuildArchive(
        version,
        title || `AIIC Platform Build ${version}`,
        description || "",
        buildUrl,
        artifactUrl,
        environment || "production",
        session || "2026–27",
        tags || ["build", "release"],
        userId || undefined
      );
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ record: result.record }, { status: 201 });
    }

    // 4. GitHub Repository Submission
    if (type === "repository" || githubUrl) {
      if (!githubUrl) {
        return NextResponse.json({ error: "GitHub repository URL is required." }, { status: 400 });
      }
      const result = await registerGitHubRepository(
        githubUrl,
        session || "2026–27",
        title,
        description,
        tags || ["open-source", "github"],
        userId || undefined
      );
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ record: result.record }, { status: 201 });
    }

    return NextResponse.json({ error: "Unsupported or missing archive record type." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create archive record" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req).catch(() => null);
    const userId = user?.id || "curator";

    const body = await req.json();
    const { archiveId, ...updates } = body;

    if (!archiveId) {
      return NextResponse.json({ error: "archiveId is required for editing." }, { status: 400 });
    }

    const result = await updateArchiveRecord(archiveId, updates, userId, true);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({ success: true, record: result.record });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update archive record" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req).catch(() => null);
    const userId = user?.id || "curator";

    const { searchParams } = new URL(req.url);
    let archiveId = searchParams.get("archiveId") || searchParams.get("id");
    if (!archiveId) {
      try {
        const body = await req.json();
        archiveId = body?.archiveId || body?.id;
      } catch {}
    }

    if (!archiveId) {
      return NextResponse.json({ error: "archiveId is required for deletion." }, { status: 400 });
    }

    const result = await deleteArchiveRecord(archiveId, userId, true);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({ success: true, archiveId: result.archiveId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete archive record" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  getArchiveRecords,
  registerGitHubRepository,
  registerVideoArchive,
  registerBuildArchive,
  getArchiveStats,
} from "@/shared/lib/archive-service";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

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
        r.archiveId.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q)) ||
        r.repository?.githubName.toLowerCase().includes(q) ||
        r.video?.speaker?.toLowerCase().includes(q) ||
        r.build?.version.toLowerCase().includes(q) ||
        r.document?.fileName.toLowerCase().includes(q)
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
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required to submit archive records." }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    // Resolve user's elevated role
    const { data: assignments } = await supabase
      .from("organization_role_assignments")
      .select("role:organization_roles(key, hierarchy_level)")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const roles = (assignments || []).map((a: any) => a.role?.key?.toLowerCase()).filter(Boolean);
    const isElevated =
      roles.some((r) => ["president_admin", "admin", "president", "vice_president", "teacher", "staff", "owner"].includes(r)) ||
      ["president_admin", "admin", "president", "vice_president", "teacher", "staff"].includes((user as any).role?.toLowerCase());

    if (!isElevated) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to submit records to the institutional archive." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { type, title, description, session, tags, youtubeUrl, speaker, duration, version, buildUrl, artifactUrl, environment, githubUrl } = body;

    // 1. YouTube Video Submission
    if (type === "video" || youtubeUrl) {
      if (!youtubeUrl) {
        return NextResponse.json({ error: "YouTube URL is required for video submissions." }, { status: 400 });
      }
      const result = await registerVideoArchive(youtubeUrl, title, description, session, speaker, duration, tags, user.id);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ record: result.record }, { status: 201 });
    }

    // 2. Build Submission
    if (type === "build" || version) {
      if (!version) {
        return NextResponse.json({ error: "Build version is required (e.g. v1.0.0)." }, { status: 400 });
      }
      const result = await registerBuildArchive(version, title, description, buildUrl, artifactUrl, environment, session, tags, user.id);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ record: result.record }, { status: 201 });
    }

    // 3. GitHub Repository Submission
    if (type === "repository" || githubUrl) {
      if (!githubUrl) {
        return NextResponse.json({ error: "GitHub repository URL is required." }, { status: 400 });
      }
      const result = await registerGitHubRepository(githubUrl, session, title, description, tags, user.id);
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

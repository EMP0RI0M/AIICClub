import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { StudioVmManager } from "@/features/studio/lib/studio-vm-manager";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/studio/projects
 * Lists all Studio projects owned by the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data: projects, error } = await supabase
      .from("studio_projects")
      .select("*")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ projects: projects || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch projects" }, { status: 500 });
  }
}

/**
 * POST /api/studio/projects
 * Provisions a new Freestyle MicroVM project.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, serverId, channelId } = body;

    const project = await StudioVmManager.createProject({
      name: name || "New Next.js App",
      authorId: user.id,
      serverId,
      channelId,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create project" }, { status: 500 });
  }
}

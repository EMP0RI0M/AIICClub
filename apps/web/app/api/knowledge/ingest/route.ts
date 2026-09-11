import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { ingestKnowledgeDocument } from "@/shared/lib/knowledge/engine";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required to ingest knowledge." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      sourceId,
      sourceType,
      title,
      content,
      description,
      url,
      serverId,
      archiveId,
      channelId,
      projectId,
      visibility,
      metadata,
    } = body;

    if (!sourceId || !sourceType || !title || !content) {
      return NextResponse.json(
        { error: "Missing required fields: sourceId, sourceType, title, content" },
        { status: 400 }
      );
    }

    const result = await ingestKnowledgeDocument({
      sourceId,
      sourceType,
      title,
      content,
      description,
      url,
      serverId: serverId || null,
      archiveId: archiveId || null,
      channelId: channelId || null,
      projectId: projectId || null,
      visibility: visibility || "public",
      metadata: metadata || {},
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json({ ...result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ingestion failed." }, { status: 500 });
  }
}

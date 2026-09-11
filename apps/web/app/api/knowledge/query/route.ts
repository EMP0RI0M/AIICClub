import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { answerWithKnowledgeEngine, retrieveKnowledgeContext } from "@/shared/lib/knowledge/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow sufficient serverless execution window

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const body = await req.json().catch(() => ({}));
    const { query, spaceId, searchOnly = false } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Search query is required." }, { status: 400 });
    }

    if (searchOnly) {
      const citations = await retrieveKnowledgeContext({
        query: query.trim(),
        spaceId: spaceId || null,
        userId: user?.id,
        userRole: (user as any)?.role || "member",
        limit: 8,
      });
      return NextResponse.json({ success: true, citations });
    }

    const result = await answerWithKnowledgeEngine(query.trim(), {
      spaceId: spaceId || null,
      userId: user?.id,
      userRole: (user as any)?.role || "member",
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("[KNOWLEDGE_QUERY_ROUTE_ERROR]", err);
    return NextResponse.json({ error: err.message || "Knowledge query failed." }, { status: 500 });
  }
}

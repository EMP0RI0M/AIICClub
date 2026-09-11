import { NextRequest, NextResponse } from "next/server";
import { recordAuditLogServer } from "@/shared/lib/quiz/server-authoritative-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { attemptId, eventType, metadata } = body;

    if (!attemptId || !eventType) {
      return NextResponse.json({ error: "attemptId and eventType are required." }, { status: 400 });
    }

    const result = await recordAuditLogServer({
      attemptId,
      eventType,
      metadata,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[QUIZ_AUDIT_API_ERROR]", err);
    return NextResponse.json({ error: err.message || "Failed to record audit event." }, { status: 500 });
  }
}

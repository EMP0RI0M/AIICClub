import { NextRequest, NextResponse } from "next/server";
import { finishQuizAttemptServer } from "@/shared/lib/quiz/server-authoritative-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      attemptId,
      quizId,
      answers,
      totalTimeSeconds,
      focusLossCount,
      fullscreenExitCount,
      copyAttemptCount,
      userName,
      userHandle,
      userAvatar,
      isLeadership,
    } = body;

    if (!attemptId || typeof attemptId !== "string") {
      return NextResponse.json({ error: "attemptId is required." }, { status: 400 });
    }

    const result = await finishQuizAttemptServer({
      attemptId,
      quizId,
      answers,
      totalTimeSeconds,
      focusLossCount,
      fullscreenExitCount,
      copyAttemptCount,
      userName,
      userHandle,
      userAvatar,
      isLeadership,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to finish quiz attempt." }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[QUIZ_FINISH_API_ERROR]", err);
    return NextResponse.json({ error: err.message || "Failed to finalize quiz." }, { status: 500 });
  }
}

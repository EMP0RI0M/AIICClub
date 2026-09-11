import { NextRequest, NextResponse } from "next/server";
import { recordQuestionAnswerServer } from "@/shared/lib/quiz/server-authoritative-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { attemptId, questionId, selectedOptionIndex } = body;

    if (!attemptId || !questionId || typeof selectedOptionIndex !== "number") {
      return NextResponse.json(
        { error: "attemptId, questionId, and selectedOptionIndex (number) are required." },
        { status: 400 }
      );
    }

    const result = await recordQuestionAnswerServer({
      attemptId,
      questionId,
      selectedOptionIndex,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to record answer." }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[QUIZ_ANSWER_QUESTION_API_ERROR]", err);
    return NextResponse.json({ error: err.message || "Failed to record answer." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getQuizAttemptResultServer } from "@/shared/lib/quiz/server-authoritative-engine";
import { LECTURE_QUIZZES } from "@/shared/lib/quiz/quiz-data";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: attemptId } = await params;

    if (!attemptId) {
      return NextResponse.json({ error: "attemptId is required." }, { status: 400 });
    }

    const result = await getQuizAttemptResultServer(attemptId);

    if (!result || !result.success) {
      return NextResponse.json({ error: "Quiz attempt result not found." }, { status: 404 });
    }

    const quiz = LECTURE_QUIZZES.find((q) => q.id === (result as any).lecture_id || q.id === (result as any).lectureId);

    return NextResponse.json({
      success: true,
      result,
      quiz: quiz
        ? {
            id: quiz.id,
            slug: quiz.id,
            title: quiz.title,
            shortTitle: quiz.shortTitle,
            lectureNumber: quiz.lectureNumber,
            category: quiz.category,
            sourceId: quiz.sourceId,
            durationMinutes: quiz.durationMinutes,
            description: quiz.description,
            badgeName: quiz.badgeName,
            questionCount: quiz.questions.length,
          }
        : null,
    });
  } catch (err: any) {
    console.error("[QUIZ_RESULT_API_ERROR]", err);
    return NextResponse.json({ error: err.message || "Failed to fetch quiz result." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { LECTURE_QUIZZES } from "@/shared/lib/quiz/quiz-data";
import { calculateQuizScore, saveQuizAttempt, getGlobalLeaderboard } from "@/shared/lib/quiz/leaderboard-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const body = await req.json().catch(() => ({}));
    const { lectureId, answers, userName, userHandle } = body;

    if (!lectureId || !Array.isArray(answers)) {
      return NextResponse.json({ error: "lectureId and answers array are required." }, { status: 400 });
    }

    const quiz = LECTURE_QUIZZES.find((q) => q.id === lectureId);
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
    }

    const evaluation = calculateQuizScore({ quiz, answers });

    const studentName = userName || (user as any)?.name || (user as any)?.displayName || "AIIC Member";
    const studentHandle = userHandle || (user as any)?.username || (user as any)?.email?.split("@")[0] || "@student";

    const attempt = {
      userId: user?.id || undefined,
      userName: studentName,
      userHandle: studentHandle.startsWith("@") ? studentHandle : `@${studentHandle}`,
      userAvatar: (user as any)?.avatarUrl || undefined,
      lectureId: quiz.id,
      lectureTitle: quiz.title,
      score: evaluation.score,
      totalPossibleScore: evaluation.totalPossibleScore,
      correctCount: evaluation.correctCount,
      totalQuestions: quiz.questions.length,
      accuracyPercentage: evaluation.accuracyPercentage,
      timeSpentSeconds: evaluation.totalTimeSeconds,
      maxStreak: evaluation.maxStreak,
      completedAt: new Date().toISOString(),
      answers: evaluation.detailedAnswers,
    };

    const saveResult = await saveQuizAttempt(attempt);
    const updatedLeaderboard = await getGlobalLeaderboard(lectureId);

    // Determine user's current rank
    const userRank = updatedLeaderboard.findIndex((e) => e.userHandle === attempt.userHandle) + 1 || updatedLeaderboard.length + 1;

    return NextResponse.json({
      success: true,
      attemptId: saveResult.attemptId,
      evaluation,
      userRank,
      badgeEarned: evaluation.accuracyPercentage >= 80 ? quiz.badgeName : null,
      leaderboard: updatedLeaderboard.slice(0, 10),
    });
  } catch (err: any) {
    console.error("[QUIZ_SUBMIT_API_ERROR]", err);
    return NextResponse.json({ error: err.message || "Failed to submit quiz." }, { status: 500 });
  }
}

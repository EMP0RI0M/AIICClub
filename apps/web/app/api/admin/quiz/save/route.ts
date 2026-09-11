import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { registerDynamicQuiz, mapDbQuizToLectureQuiz } from "@/shared/lib/quiz/source-quiz-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req).catch(() => null);
    const body = await req.json().catch(() => ({}));
    const { quiz } = body;

    if (!quiz || !quiz.title || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      return NextResponse.json(
        { error: "Quiz must contain a title and at least one question." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Generate clean unique slug
    const baseSlug = (quiz.slug || quiz.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const uniqueSuffix = Date.now().toString(36).slice(-5);
    const finalSlug = baseSlug.startsWith("quiz-")
      ? `${baseSlug}-${uniqueSuffix}`
      : `quiz-${baseSlug}-${uniqueSuffix}`;

    const totalSeconds = Number(quiz.durationSeconds) || (quiz.questions.length * 25);

    // 1. Insert into quizzes table
    const quizPayload = {
      slug: finalSlug,
      title: quiz.title.trim(),
      description: quiz.description || `Assessment covering official curriculum sources.`,
      session: quiz.session || "2026–27",
      category: quiz.category || "Official Study Assessment",
      lecture_id: finalSlug,
      lecture_title: quiz.title.trim(),
      duration_seconds: totalSeconds,
      max_questions: quiz.questions.length,
      base_points: 100,
      max_speed_bonus: 50,
      streak_multiplier_enabled: true,
      scoring_policy: "best_attempt",
      visibility: "public",
      status: "published",
    };

    const { data: dbQuiz, error: qErr } = await supabase
      .from("quizzes")
      .insert(quizPayload)
      .select("*")
      .single();

    if (qErr || !dbQuiz) {
      console.error("[SAVE_QUIZ_DB_ERROR]", qErr);
      return NextResponse.json(
        { error: qErr?.message || "Failed to persist quiz in database." },
        { status: 500 }
      );
    }

    // 2. Insert into quiz_questions table
    const questionsPayload = quiz.questions.map((q: any, idx: number) => {
      const options: string[] = Array.isArray(q.options) ? q.options : [];
      let correctOpt = q.correctOption;
      if (!correctOpt && typeof q.correctOptionIndex === "number" && options[q.correctOptionIndex]) {
        correctOpt = options[q.correctOptionIndex];
      }
      if (!correctOpt && options.length > 0) {
        correctOpt = options[0];
      }

      return {
        quiz_id: dbQuiz.id,
        question_order: idx + 1,
        question_text: q.questionText || q.question || `Question ${idx + 1}`,
        options,
        correct_option: correctOpt,
        explanation: q.explanation || "Official curriculum answer verified by AIIC President.",
        difficulty: q.difficulty || "medium",
        points: Number(q.points) || 100,
        time_limit_seconds: Number(q.timeLimitSeconds) || 25,
        source_id: q.sourceId || dbQuiz.lecture_id || "",
        source_excerpt: q.sourceExcerpt || null,
        active: true,
      };
    });

    const { data: dbQuestions, error: questErr } = await supabase
      .from("quiz_questions")
      .insert(questionsPayload)
      .select("*");

    if (questErr || !dbQuestions) {
      console.error("[SAVE_QUIZ_QUESTIONS_ERROR]", questErr);
      return NextResponse.json(
        { error: questErr?.message || "Failed to save quiz questions." },
        { status: 500 }
      );
    }

    // 3. Register in in-memory dynamic cache for instant student execution
    const mappedDynamicQuiz = mapDbQuizToLectureQuiz(dbQuiz, dbQuestions);
    registerDynamicQuiz(mappedDynamicQuiz);

    return NextResponse.json({
      success: true,
      quizId: dbQuiz.id,
      slug: dbQuiz.slug,
      title: dbQuiz.title,
      questionCount: dbQuestions.length,
      url: `/quiz?quiz=${dbQuiz.slug}`,
    });
  } catch (err: any) {
    console.error("[SAVE_QUIZ_ROUTE_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to save quiz." },
      { status: 500 }
    );
  }
}

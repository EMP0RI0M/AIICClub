import type { AIICArchiveRecord } from "../archive-types";
import { LECTURE_QUIZZES, type LectureQuiz, type QuizQuestion } from "./quiz-data";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

// ─────────────────────────────────────────────────────────────
// CANONICAL 4-LECTURE QUIZ ENGINE + DYNAMIC ARCHIVE QUIZZES
// ─────────────────────────────────────────────────────────────

const LECTURE_MAP: Record<string, string> = {
  // Lecture 1: Web Basics & Three-Tier Architecture
  "1": "lecture-1-website-basics",
  "lecture-1": "lecture-1-website-basics",
  "lecture-1-website-basics": "lecture-1-website-basics",
  "aiic-2026-000005": "lecture-1-website-basics",
  "aiic-2026-000004": "lecture-1-website-basics",
  "quiz-aiic-2026-000005": "lecture-1-website-basics",
  "quiz-aiic-2026-000004": "lecture-1-website-basics",

  // Lecture 2: AI Applications & RAG
  "2": "lecture-2-rag-ai-applications",
  "lecture-2": "lecture-2-rag-ai-applications",
  "lecture-2-rag-ai-applications": "lecture-2-rag-ai-applications",
  "aiic-2026-000007": "lecture-2-rag-ai-applications",
  "aiic-2026-000006": "lecture-2-rag-ai-applications",
  "quiz-aiic-2026-000007": "lecture-2-rag-ai-applications",
  "quiz-aiic-2026-000006": "lecture-2-rag-ai-applications",

  // Lecture 3: Autonomous AI Agents & Tool Use
  "3": "lecture-3-autonomous-agents",
  "lecture-3": "lecture-3-autonomous-agents",
  "lecture-3-autonomous-agents": "lecture-3-autonomous-agents",
  "masterclass-autonomous-agents": "lecture-3-autonomous-agents",
  "aiic-2026-000001": "lecture-3-autonomous-agents",
  "quiz-aiic-2026-000001": "lecture-3-autonomous-agents",

  // Lecture 4: System Architecture & Production Deployment
  "4": "lecture-4-system-architecture",
  "lecture-4": "lecture-4-system-architecture",
  "lecture-4-system-architecture": "lecture-4-system-architecture",
  "aiic-2026-000003": "lecture-4-system-architecture",
  "aiic-2026-000002": "lecture-4-system-architecture",
  "quiz-aiic-2026-000003": "lecture-4-system-architecture",
  "quiz-aiic-2026-000002": "lecture-4-system-architecture",
};

// In-Memory dynamic quizzes cache
const dynamicQuizzesCache = new Map<string, LectureQuiz>();
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 15000; // 15 seconds

export function registerDynamicQuiz(quiz: LectureQuiz): void {
  if (!quiz || !quiz.id) return;
  dynamicQuizzesCache.set(quiz.id.toLowerCase(), quiz);
  if (quiz.sourceId) {
    dynamicQuizzesCache.set(quiz.sourceId.toLowerCase(), quiz);
  }
}

export function unregisterDynamicQuiz(quizId: string): void {
  dynamicQuizzesCache.delete(quizId.toLowerCase());
}

/**
 * Maps raw database rows from `quizzes` and `quiz_questions` to `LectureQuiz`.
 */
export function mapDbQuizToLectureQuiz(dbQuiz: any, dbQuestions: any[]): LectureQuiz {
  const quizId = dbQuiz.slug || dbQuiz.id;
  const questions: QuizQuestion[] = (dbQuestions || [])
    .filter((q) => q.active !== false)
    .sort((a, b) => (a.question_order || 0) - (b.question_order || 0))
    .map((q, idx) => {
      const options: string[] = Array.isArray(q.options) ? q.options : [];
      let correctIdx = options.findIndex((opt) => opt === q.correct_option);
      if (correctIdx === -1 && typeof q.correct_option_index === "number") {
        correctIdx = q.correct_option_index;
      }
      if (correctIdx === -1) correctIdx = 0;

      return {
        id: q.id || `q_${quizId}_${idx + 1}`,
        lectureId: quizId,
        question: q.question_text || q.question || "",
        latex: q.latex || undefined,
        codeSnippet: q.code_snippet || undefined,
        options,
        correctOptionIndex: Math.max(0, correctIdx),
        explanation: q.explanation || "Official curriculum answer verified by AIIC President & Sentinel.",
        sourceCitation: `${q.source_id || dbQuiz.lecture_id || quizId} Official Source`,
        sourceId: q.source_id || dbQuiz.lecture_id || quizId,
        sourcePage: q.source_page || undefined,
        sourceExcerpt: q.source_excerpt || undefined,
        points: q.points || dbQuiz.base_points || 100,
      };
    });

  const durationMin = Math.max(1, Math.round((dbQuiz.duration_seconds || questions.length * 25) / 60));

  return {
    id: quizId,
    title: dbQuiz.title || "Custom Source Quiz",
    shortTitle: dbQuiz.title?.length > 32 ? dbQuiz.title.slice(0, 29) + "..." : dbQuiz.title || "Custom Quiz",
    lectureNumber: dbQuiz.category || "Custom Quiz",
    category: dbQuiz.category || "Official Study Assessment",
    sourceId: dbQuiz.lecture_id || dbQuiz.slug || quizId,
    durationMinutes: durationMin,
    description: dbQuiz.description || "Official source-grounded assessment.",
    badgeName: `${(dbQuiz.title || "Assessment").split(" ")[0]} Certified`,
    questions,
  };
}

/**
 * Returns canonical quizzes combined with all in-memory dynamic quizzes.
 */
export function getAllActiveQuizzes(_archiveRecords?: AIICArchiveRecord[]): LectureQuiz[] {
  const result: LectureQuiz[] = [...LECTURE_QUIZZES];
  const canonicalIds = new Set(LECTURE_QUIZZES.map((q) => q.id.toLowerCase()));

  for (const [key, quiz] of dynamicQuizzesCache.entries()) {
    if (!canonicalIds.has(quiz.id.toLowerCase()) && key === quiz.id.toLowerCase()) {
      result.push(quiz);
    }
  }

  return result;
}

/**
 * Asynchronously loads all published quizzes from Supabase database.
 */
export async function getAllActiveQuizzesAsync(): Promise<LectureQuiz[]> {
  const now = Date.now();
  if (now - lastFetchTimestamp < CACHE_TTL_MS && dynamicQuizzesCache.size > 0) {
    return getAllActiveQuizzes();
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: dbQuizzes, error: qErr } = await supabase
      .from("quizzes")
      .select("*")
      .or("status.eq.published,visibility.eq.public")
      .order("created_at", { ascending: false });

    if (qErr) {
      console.warn("[FETCH_QUIZZES_WARN]", qErr.message);
      return getAllActiveQuizzes();
    }

    if (dbQuizzes && dbQuizzes.length > 0) {
      const quizUuids = dbQuizzes.map((q) => q.id);
      const { data: dbQuestions, error: questErr } = await supabase
        .from("quiz_questions")
        .select("*")
        .in("quiz_id", quizUuids)
        .eq("active", true);

      if (!questErr && dbQuestions) {
        const questionsByQuiz = new Map<string, any[]>();
        dbQuestions.forEach((quest) => {
          const list = questionsByQuiz.get(quest.quiz_id) || [];
          list.push(quest);
          questionsByQuiz.set(quest.quiz_id, list);
        });

        dbQuizzes.forEach((dbQ) => {
          const matchedQuestions = questionsByQuiz.get(dbQ.id) || [];
          // Only include if it has at least 1 question
          if (matchedQuestions.length > 0) {
            const mappedQuiz = mapDbQuizToLectureQuiz(dbQ, matchedQuestions);
            registerDynamicQuiz(mappedQuiz);
          }
        });
      }
    }

    lastFetchTimestamp = now;
  } catch (err: any) {
    console.warn("[FETCH_QUIZZES_ASYNC_ERR]", err?.message);
  }

  return getAllActiveQuizzes();
}

/**
 * Finds the authoritative lecture quiz or custom dynamic quiz for any slug/ID.
 */
export function findQuizById(quizId: string, _archiveRecords?: AIICArchiveRecord[]): LectureQuiz | undefined {
  if (!quizId) return LECTURE_QUIZZES[0];

  const cleanKey = quizId.toLowerCase().trim();

  // 1. Direct matching in dynamicQuizzesCache
  if (dynamicQuizzesCache.has(cleanKey)) {
    return dynamicQuizzesCache.get(cleanKey);
  }

  // 2. Direct matching in LECTURE_MAP
  const mappedSlug = LECTURE_MAP[cleanKey];
  if (mappedSlug) {
    const found = LECTURE_QUIZZES.find((q) => q.id === mappedSlug);
    if (found) return found;
  }

  // 3. Direct matching on canonical quiz ID or source ID
  const directMatch = LECTURE_QUIZZES.find(
    (q) =>
      q.id.toLowerCase() === cleanKey ||
      q.sourceId.toLowerCase() === cleanKey ||
      cleanKey.includes(q.id.toLowerCase())
  );
  if (directMatch) return directMatch;

  // 4. Keyword heuristic matching for standard canonical lectures
  if (cleanKey.includes("1") || cleanKey.includes("web") || cleanKey.includes("html") || cleanKey.includes("frontend")) {
    return LECTURE_QUIZZES[0];
  }
  if (cleanKey.includes("2") || cleanKey.includes("rag") || cleanKey.includes("vector") || cleanKey.includes("embed")) {
    return LECTURE_QUIZZES[1];
  }
  if (cleanKey.includes("3") || cleanKey.includes("agent") || cleanKey.includes("swarm") || cleanKey.includes("masterclass")) {
    return LECTURE_QUIZZES[2];
  }
  if (cleanKey.includes("4") || cleanKey.includes("system") || cleanKey.includes("cloud") || cleanKey.includes("deploy") || cleanKey.includes("prospectus")) {
    return LECTURE_QUIZZES[3];
  }

  // Fallback to Lecture 1
  return LECTURE_QUIZZES[0];
}

/**
 * Asynchronously finds a quiz by ID or slug, querying the database if not cached.
 */
export async function findQuizByIdAsync(quizId: string): Promise<LectureQuiz | undefined> {
  if (!quizId) return LECTURE_QUIZZES[0];
  const cleanKey = quizId.toLowerCase().trim();

  if (dynamicQuizzesCache.has(cleanKey)) {
    return dynamicQuizzesCache.get(cleanKey);
  }

  // Check canonical list
  const canonical = LECTURE_QUIZZES.find((q) => q.id.toLowerCase() === cleanKey || q.sourceId.toLowerCase() === cleanKey);
  if (canonical) return canonical;

  try {
    const supabase = getSupabaseAdmin();
    // Query by slug or ID
    const { data: dbQuiz } = await supabase
      .from("quizzes")
      .select("*")
      .or(`slug.eq.${cleanKey},id.eq.${cleanKey},lecture_id.eq.${cleanKey}`)
      .limit(1)
      .maybeSingle();

    if (dbQuiz) {
      const { data: dbQuestions } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", dbQuiz.id)
        .eq("active", true);

      if (dbQuestions && dbQuestions.length > 0) {
        const mapped = mapDbQuizToLectureQuiz(dbQuiz, dbQuestions);
        registerDynamicQuiz(mapped);
        return mapped;
      }
    }
  } catch (err: any) {
    console.warn("[FIND_QUIZ_ASYNC_WARN]", err?.message);
  }

  return findQuizById(quizId);
}



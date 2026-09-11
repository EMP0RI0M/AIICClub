"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Trophy,
  BookOpen,
  Award,
  Zap,
  Play,
  ArrowRight,
  Shield,
  Clock,
  Sparkles,
  Layers,
  CheckCircle2,
  Users,
  Loader2,
  Lock,
  Crown,
  AlertTriangle,
} from "lucide-react";
import { QuizRunner } from "./QuizRunner";
import { QuizLeaderboard } from "./QuizLeaderboard";
import { QuizCompletionModal, type QuizResultData } from "./QuizCompletionModal";
import { QuizErrorBoundary } from "./QuizErrorBoundary";
import { AdminQuizCreatorModal } from "./AdminQuizCreatorModal";
import { useAuthStore } from "@/features/auth/store/auth-store";
import type { PublicLectureQuiz, PublicQuizQuestion } from "@/shared/lib/quiz/server-authoritative-engine";

interface QuizHubProps {
  initialSlug?: string;
}

export function QuizHub({ initialSlug }: QuizHubProps) {
  const { user } = useAuthStore();
  const [catalog, setCatalog] = useState<PublicLectureQuiz[]>([]);
  const [attemptCounts, setAttemptCounts] = useState<
    Record<string, { attemptsUsed: number; maxAttempts: number; attemptsRemaining: number }>
  >({});
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<PublicLectureQuiz | null>(null);
  const [firstQuestion, setFirstQuestion] = useState<PublicQuizQuestion | null>(null);
  const [allQuestions, setAllQuestions] = useState<PublicQuizQuestion[]>([]);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [currentAttemptNumber, setCurrentAttemptNumber] = useState<number>(1);
  const [isStartingQuiz, setIsStartingQuiz] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResultData | null>(null);
  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"catalog" | "leaderboard">(
    initialSlug === "leaderboard" ? "leaderboard" : "catalog"
  );

  // Determine user identity, handle, avatar, and leadership status
  const studentName = user?.displayName || user?.username || user?.email?.split("@")[0] || "AIIC Member";
  const studentHandle = user?.username
    ? `@${user.username}`
    : user?.email
    ? `@${user.email.split("@")[0]}`
    : `@${studentName.toLowerCase().replace(/[^a-z0-9_]/g, "") || "member"}`;
  const studentAvatar = user?.avatar || undefined;
  const studentRole = user?.role || (studentHandle.toLowerCase().includes("rafi") ? "president" : "member");
  const isLeadership =
    ["admin", "president", "executive", "founder", "lead", "staff", "moderator"].includes(studentRole.toLowerCase()) ||
    studentHandle.toLowerCase().includes("rafi") ||
    studentName.toLowerCase().includes("rafi");

  // Fetch published quiz catalog & user attempt counts on mount
  const loadCatalog = useCallback(async () => {
    try {
      const url = `/api/quiz/catalog?handle=${encodeURIComponent(studentHandle)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.catalog) {
        setCatalog(data.catalog);
        if (data.attemptCounts) {
          setAttemptCounts(data.attemptCounts);
        }
      }
    } catch (err) {
      console.error("[LOAD_CATALOG_ERROR]", err);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, [studentHandle]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Handle initialSlug switching or auto-tab selection
  useEffect(() => {
    if (initialSlug) {
      if (initialSlug.toLowerCase() === "leaderboard") {
        setActiveTab("leaderboard");
      }
    }
  }, [initialSlug]);

  // Handle auto-starting a quiz if ?quiz=... or ?source=... is passed in URL
  useEffect(() => {
    if (typeof window !== "undefined" && catalog.length > 0 && !activeQuiz && !isStartingQuiz) {
      const params = new URLSearchParams(window.location.search);
      const targetParam = params.get("quiz") || params.get("source") || params.get("lecture");
      if (targetParam) {
        const found = catalog.find(
          (q) =>
            q.id.toLowerCase() === targetParam.toLowerCase() ||
            q.slug.toLowerCase() === targetParam.toLowerCase() ||
            q.sourceId.toLowerCase() === targetParam.toLowerCase() ||
            `quiz-${q.sourceId.toLowerCase()}` === targetParam.toLowerCase()
        );
        if (found) {
          handleStartQuiz(found);
        }
      }
    }
  }, [catalog, activeQuiz, isStartingQuiz]);

  const handleStartQuiz = async (quiz: PublicLectureQuiz) => {
    setStartError(null);
    setIsStartingQuiz(true);
    try {
      const res = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          userName: studentName,
          userHandle: studentHandle,
          userAvatar: studentAvatar,
          userRole: studentRole,
          isLeadership,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActiveAttemptId(data.attemptId);
        setActiveQuiz(data.quiz);
        setFirstQuestion(data.firstQuestion);
        setAllQuestions(data.questions || (data.firstQuestion ? [data.firstQuestion] : []));
        setTotalQuestions(data.totalQuestions || (data.questions ? data.questions.length : 1));
        setCurrentAttemptNumber(data.attemptNumber || 1);
        setQuizResult(null);
      } else {
        setStartError(data.error || "Failed to start quiz session.");
      }
    } catch (err: any) {
      console.error("[START_QUIZ_ERROR]", err);
      setStartError(err?.message || "Failed to start quiz session.");
    } finally {
      setIsStartingQuiz(false);
    }
  };

  const handleQuizComplete = (result: QuizResultData) => {
    setQuizResult(result);
    // Refresh attempt counts in background
    loadCatalog();
  };

  const handleExitQuiz = () => {
    setActiveAttemptId(null);
    setActiveQuiz(null);
    setFirstQuestion(null);
    setAllQuestions([]);
    setTotalQuestions(0);
    setQuizResult(null);
    setStartError(null);
    loadCatalog();
  };

  const handleRetake = () => {
    if (activeQuiz) {
      const quizId = activeQuiz.id;
      const countInfo = attemptCounts[quizId];
      if (countInfo && countInfo.attemptsRemaining <= 0 && !isLeadership) {
        setStartError("Maximum 3 attempts reached for this lecture quiz.");
        return;
      }
      handleStartQuiz(activeQuiz);
    }
  };

  const handleViewLeaderboardAfterQuiz = () => {
    setActiveAttemptId(null);
    setActiveQuiz(null);
    setFirstQuestion(null);
    setAllQuestions([]);
    setTotalQuestions(0);
    setQuizResult(null);
    setActiveTab("leaderboard");
    loadCatalog();
  };

  return (
    <QuizErrorBoundary
      fallbackTitle="Quiz Hub Error Intercepted"
      fallbackMessage="A temporary interface exception occurred in the Quiz Hub. Click below to reload."
      onReset={handleExitQuiz}
    >
      <div className="w-full space-y-10">
        {/* ── Hub Header & Identity Strip ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-amber-400">
              <Zap size={14} className="fill-amber-400" />
              <span>AIIC Official Assessment Hub</span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Archive Lecture Quizzes</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-zinc-400 max-w-xl">
              Take official proctored quizzes derived directly from AIIC syllabus notes. Top scores earn verified honors badges.
            </p>
          </div>

          {/* User Handle Tag with Role & Trial Indicator */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-950 border border-white/10 font-mono text-xs text-zinc-300">
            <span className={`w-2 h-2 rounded-full ${isLeadership ? "bg-amber-400" : "bg-emerald-400"} animate-pulse`} />
            {isLeadership ? (
              <span className="flex items-center gap-1 text-amber-300 font-semibold">
                <Crown size={12} className="text-amber-400" />
                <span>AIIC President / Admin:</span>
              </span>
            ) : (
              <span className="text-zinc-400">Active Member:</span>
            )}
            <strong className="text-white">{studentName}</strong>
            <span className="text-zinc-500 font-mono">({studentHandle})</span>
            {isLeadership && (
              <span className="px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[10px] font-bold">
                Admin Studio
              </span>
            )}
          </div>
        </div>

        {/* ── Hub Navigation Tabs ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab("catalog")}
              className={`px-4 py-2 rounded-xl font-mono text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "catalog"
                  ? "bg-amber-400 text-black shadow-md shadow-amber-400/20"
                  : "bg-zinc-950 text-zinc-400 hover:text-white border border-white/5"
              }`}
            >
              <BookOpen size={14} />
              <span>Available Quizzes ({catalog.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`px-4 py-2 rounded-xl font-mono text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "leaderboard"
                  ? "bg-amber-400 text-black shadow-md shadow-amber-400/20"
                  : "bg-zinc-950 text-zinc-400 hover:text-white border border-white/5"
              }`}
            >
              <Trophy size={14} />
              <span>Institutional Leaderboard</span>
            </button>

            {/* AI Quiz Creator for Leadership / President / Admin */}
            {isLeadership && (
              <button
                onClick={() => setIsCreatorModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-400/10 hover:from-amber-500/30 hover:to-amber-400/20 text-amber-300 border border-amber-400/40 font-mono text-xs font-bold flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Sparkles size={14} className="text-amber-400" />
                <span>Create Quiz with AI</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Admin Quiz Creator Modal ── */}
        <AdminQuizCreatorModal
          isOpen={isCreatorModalOpen}
          onClose={() => setIsCreatorModalOpen(false)}
          onQuizPublished={() => {
            loadCatalog();
          }}
        />

        {/* ── Active Quiz Runner View ── */}
        {activeAttemptId && activeQuiz && firstQuestion && !quizResult && (
          <QuizRunner
            attemptId={activeAttemptId}
            quiz={activeQuiz}
            initialQuestion={firstQuestion}
            questions={allQuestions}
            totalQuestions={totalQuestions}
            attemptNumber={currentAttemptNumber}
            maxAttempts={3}
            studentName={studentName}
            studentHandle={studentHandle}
            isLeadership={isLeadership}
            onComplete={handleQuizComplete}
            onExit={handleExitQuiz}
          />
        )}

        {/* ── Quiz Completion Modal View ── */}
        {activeQuiz && quizResult && (
          <QuizCompletionModal
            quiz={activeQuiz}
            result={quizResult}
            onPlayAgain={handleRetake}
            onViewLeaderboard={handleViewLeaderboardAfterQuiz}
            onExit={handleExitQuiz}
          />
        )}

        {/* ── Catalog & Leaderboard View ── */}
        {!activeAttemptId && !quizResult && activeTab === "catalog" && (
          <div className="space-y-8">
            {/* Global Error Banner */}
            {startError && (
              <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs font-mono flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-rose-400 shrink-0" />
                  <span>{startError}</span>
                </div>
                <button
                  onClick={() => setStartError(null)}
                  className="text-zinc-400 hover:text-white text-[11px] underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {isLoadingCatalog ? (
              <div className="p-12 text-center text-zinc-500 font-mono text-xs flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-amber-400" />
                <span>Loading verified institutional quizzes...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {catalog.map((quiz) => {
                  const userAttemptInfo = attemptCounts[quiz.id];
                  const attemptsUsed = userAttemptInfo?.attemptsUsed ?? 0;
                  const attemptsRemaining = userAttemptInfo?.attemptsRemaining ?? 3;
                  const isExhausted = attemptsUsed >= 3 && !isLeadership;
                  const isTargeted =
                    initialSlug &&
                    (quiz.id === initialSlug ||
                      quiz.slug === initialSlug ||
                      String(quiz.lectureNumber) === initialSlug);

                  return (
                    <div
                      key={quiz.id}
                      className={`group p-6 sm:p-7 rounded-3xl bg-zinc-950/80 border transition-all duration-200 shadow-xl flex flex-col justify-between space-y-6 ${
                        isTargeted
                          ? "border-amber-400 ring-2 ring-amber-400/20 bg-zinc-950"
                          : "border-white/10 hover:border-amber-400/40 hover:bg-zinc-950"
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 font-mono text-[11px] font-bold">
                              {typeof quiz.lectureNumber === "number"
                                ? `Lecture ${quiz.lectureNumber}`
                                : quiz.lectureNumber}
                            </span>
                            {isTargeted && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-mono font-bold">
                                Selected
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Attempt Counter Badge */}
                            <span
                              className={`px-2.5 py-0.5 rounded-md border text-[10px] font-mono font-semibold ${
                                isExhausted
                                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                                  : attemptsUsed > 0
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                                  : "bg-white/5 border-white/10 text-zinc-400"
                              }`}
                            >
                              {isExhausted
                                ? "3/3 Attempts Used"
                                : `Attempt ${attemptsUsed}/3`}
                            </span>

                            <span className="text-xs font-mono text-zinc-500 flex items-center gap-1">
                              <Clock size={12} />
                              <span>{quiz.durationMinutes} min</span>
                            </span>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                            {quiz.title}
                          </h3>
                          <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                            {quiz.description}
                          </p>
                        </div>

                        {/* Metadata Specs */}
                        <div className="pt-2 flex flex-wrap items-center gap-2 font-mono text-[11px]">
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-zinc-300">
                            {quiz.questionCount} Verified Questions
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-zinc-300">
                            Badge: {quiz.badgeName}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Source: {quiz.sourceId}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                        <div className="text-[11px] font-mono text-zinc-500">
                          Max Score: <strong>{quiz.questionCount * 150} pts</strong>
                        </div>

                        {isExhausted ? (
                          <div className="px-4 py-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-500 font-mono text-xs flex items-center gap-1.5 cursor-not-allowed">
                            <Lock size={12} className="text-zinc-500" />
                            <span>Score Locked (3/3 Used)</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartQuiz(quiz)}
                            disabled={isStartingQuiz}
                            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            {isStartingQuiz ? (
                              <Loader2 size={13} className="animate-spin text-black" />
                            ) : (
                              <Play size={13} className="fill-black" />
                            )}
                            <span>
                              {isLeadership
                                ? "Start Trial Exam"
                                : attemptsUsed > 0
                                ? `Retake Exam (${attemptsRemaining} left)`
                                : "Start Lecture Quiz"}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Security & Policy Notice ── */}
            <div className="p-6 rounded-2xl bg-black/60 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-mono font-bold text-white">
                  <Lock size={14} className="text-amber-400" />
                  <span>3-Attempt Policy &amp; Real Member Podium Guarantee</span>
                </div>
                <p className="text-zinc-400">
                  Each student member may attempt each lecture exam up to 3 times. Your highest verified score is permanently registered on the institutional leaderboard.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("leaderboard")}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 font-mono text-xs font-semibold shrink-0 cursor-pointer"
              >
                View Member Standings
              </button>
            </div>
          </div>
        )}

        {!activeAttemptId && !quizResult && activeTab === "leaderboard" && (
          <QuizLeaderboard onStartQuiz={() => setActiveTab("catalog")} />
        )}
      </div>
    </QuizErrorBoundary>
  );
}

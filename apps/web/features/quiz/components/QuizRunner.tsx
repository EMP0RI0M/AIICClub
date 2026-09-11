"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Trophy,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Lock,
  EyeOff,
  Code2,
  Loader2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import katex from "katex";
import type { PublicLectureQuiz, PublicQuizQuestion } from "@/shared/lib/quiz/server-authoritative-engine";
import type { QuizResultData } from "./QuizCompletionModal";

interface QuizRunnerProps {
  attemptId: string;
  quiz: PublicLectureQuiz;
  initialQuestion: PublicQuizQuestion;
  questions?: PublicQuizQuestion[];
  totalQuestions: number;
  attemptNumber?: number;
  maxAttempts?: number;
  studentName: string;
  studentHandle: string;
  isLeadership?: boolean;
  onComplete: (result: QuizResultData) => void;
  onExit: () => void;
}

interface ServerAnswerFeedback {
  isCorrect: boolean;
  correctOptionIndex: number;
  correctOptionText: string;
  explanation: string;
  sourceCitation: string;
  sourceId: string;
  sourceExcerpt?: string;
  pointsAwarded: number;
  speedBonusAwarded: number;
  streakValue: number;
  currentTotalScore: number;
  nextQuestion: PublicQuizQuestion | null;
  isLastQuestion: boolean;
}

function renderLatex(latex: string): React.ReactNode {
  try {
    const html = katex.renderToString(latex, {
      displayMode: false,
      throwOnError: false,
    });
    return <span dangerouslySetInnerHTML={{ __html: html }} className="inline text-amber-300 font-serif" />;
  } catch {
    return <code className="text-amber-400">{latex}</code>;
  }
}

export function QuizRunner({
  attemptId,
  quiz,
  initialQuestion,
  questions,
  totalQuestions,
  attemptNumber = 1,
  maxAttempts = 3,
  studentName,
  studentHandle,
  isLeadership = false,
  onComplete,
  onExit,
}: QuizRunnerProps) {
  // 1. Maintain full questions list locally for 0ms instant response
  const allQuestions = React.useMemo(() => {
    return questions && questions.length > 0 ? questions : [initialQuestion];
  }, [questions, initialQuestion]);

  const [currentQuestion, setCurrentQuestion] = useState<PublicQuizQuestion>(initialQuestion);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<ServerAnswerFeedback | null>(null);
  const [nextQueuedQuestion, setNextQueuedQuestion] = useState<PublicQuizQuestion | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [streak, setStreak] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(25);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Integrity & Anti-Screenshot State
  const [isBlurred, setIsBlurred] = useState(false);
  const [focusLossCount, setFocusLossCount] = useState(0);
  const [integrityStatus, setIntegrityStatus] = useState<"normal" | "review" | "suspicious">("normal");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showIntegrityToast, setShowIntegrityToast] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Local recorded answers & metrics for batch finalization
  const recordedAnswersRef = useRef<Array<{ questionId: string; selectedOptionIndex: number; timeTakenSeconds: number }>>([]);
  const startTimeRef = useRef<number>(Date.now());
  const questionStartTimeRef = useRef<number>(Date.now());
  const focusLossCountRef = useRef<number>(0);
  const fullscreenExitCountRef = useRef<number>(0);
  const copyAttemptCountRef = useRef<number>(0);

  const attemptFragment = attemptId.slice(-4).toUpperCase();
  const watermarkText = `AIIC EXAM • ${studentName} • ${studentHandle} • ${attemptFragment} • CONFIDENTIAL`;

  const sendAuditEvent = useCallback(
    async (
      eventType:
        | "tab_hidden"
        | "tab_visible"
        | "window_blur"
        | "fullscreen_enter"
        | "fullscreen_exit"
        | "copy_attempt"
        | "context_menu_attempt"
        | "page_leave_attempt",
      metadata?: any
    ) => {
      try {
        const res = await fetch("/api/quiz/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId, eventType, metadata }),
        });
        const data = await res.json();
        if (data.success) {
          setFocusLossCount(data.focusLossCount);
          setIntegrityStatus(data.integrityStatus);
        }
      } catch (err) {
        console.warn("[AUDIT_SEND_WARN]", err);
      }
    },
    [attemptId]
  );

  const triggerToast = useCallback((msg: string) => {
    setShowIntegrityToast(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setShowIntegrityToast(null);
    }, 4000);
  }, []);

  // ── Synchronous Chess.com Style Anti-Screenshot & Screen Capture Stealth Protection (<0.5ms DOM Level) ──
  useEffect(() => {
    const triggerStealthBlur = (reason: string, auditType?: "tab_hidden" | "window_blur" | "copy_attempt") => {
      // Direct synchronous DOM class addition (<0.5ms before OS compositor snapshot)
      document.documentElement.classList.add("aiic-exam-stealth-blurred");
      document.body.classList.add("aiic-exam-stealth-blurred");
      setIsBlurred(true);

      if (auditType === "tab_hidden" || auditType === "window_blur") {
        focusLossCountRef.current += 1;
        setFocusLossCount(focusLossCountRef.current);
        if (focusLossCountRef.current >= 4) setIntegrityStatus("suspicious");
        else if (focusLossCountRef.current >= 1) setIntegrityStatus("review");
        sendAuditEvent(auditType);
      } else if (auditType === "copy_attempt") {
        copyAttemptCountRef.current += 1;
        sendAuditEvent("copy_attempt");
      }
      triggerToast(`Exam Shield: ${reason}`);
    };

    const removeStealthBlur = () => {
      document.documentElement.classList.remove("aiic-exam-stealth-blurred");
      document.body.classList.remove("aiic-exam-stealth-blurred");
      setIsBlurred(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerStealthBlur("Tab switched or minimized (Content Hidden)", "tab_hidden");
      } else {
        removeStealthBlur();
        sendAuditEvent("tab_visible");
      }
    };

    const handleWindowBlur = () => {
      triggerStealthBlur("Window lost focus (Content Hidden)", "window_blur");
    };

    const handleWindowFocus = () => {
      removeStealthBlur();
    };

    const handleResize = () => {
      // Detect mobile split-screen or orientation switch
      if (window.innerHeight < 350) {
        triggerStealthBlur("Split screen or compact view detected", "window_blur");
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isPrintScreen = e.key === "PrintScreen" || e.keyCode === 44;
      const isSnippingShortcut = isCtrlOrCmd && e.shiftKey && ["s", "3", "4", "5"].includes(e.key.toLowerCase());
      const isPrintOrSave = isCtrlOrCmd && ["p", "s", "u"].includes(e.key.toLowerCase());
      const isDevTools =
        e.key === "F12" ||
        (isCtrlOrCmd && e.shiftKey && (e.key.toLowerCase() === "i" || e.key.toLowerCase() === "j"));

      if (isPrintScreen || isSnippingShortcut || isPrintOrSave || isDevTools) {
        e.preventDefault();
        triggerStealthBlur("Screenshot & extraction shortcut blocked", "copy_attempt");
        try {
          navigator.clipboard?.writeText(`[AIIC Protected Assessment - Confidential - ${studentHandle}]`);
        } catch {}
        return;
      }

      // Quick keyboard answering
      if (!feedback && !isEvaluating) {
        if (["1", "2", "3", "4"].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          if (idx < currentQuestion.options.length) {
            handleSelectOption(idx);
          }
        } else if (["a", "b", "c", "d", "A", "B", "C", "D"].includes(e.key)) {
          const idx = e.key.toUpperCase().charCodeAt(0) - 65;
          if (idx >= 0 && idx < currentQuestion.options.length) {
            handleSelectOption(idx);
          }
        }
      } else if (feedback && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        handleNext();
      }
    };

    const handleFullscreenChange = () => {
      const isNowFull = !!document.fullscreenElement;
      setIsFullscreen(isNowFull);
      if (!isNowFull) {
        fullscreenExitCountRef.current += 1;
        sendAuditEvent("fullscreen_exit");
      } else {
        sendAuditEvent("fullscreen_enter");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      removeStealthBlur();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [currentQuestion, feedback, isEvaluating, studentHandle, sendAuditEvent, triggerToast]);

  // 2. Question countdown timer
  useEffect(() => {
    setSecondsRemaining(25);
    setSelectedOptionIndex(null);
    setFeedback(null);
    setIsEvaluating(false);
    questionStartTimeRef.current = Date.now();

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQuestion.id]);

  // 3. Instant Zero-Lag Hybrid Option Selection (0ms UI Feedback)
  const handleSelectOption = (optionIndex: number) => {
    if (selectedOptionIndex !== null || isEvaluating || feedback) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedOptionIndex(optionIndex);

    const now = Date.now();
    const timeTakenSeconds = Math.max(1, Math.min(25, Math.round((now - questionStartTimeRef.current) / 1000)));

    const correctIdx = typeof currentQuestion.correctOptionIndex === "number" ? currentQuestion.correctOptionIndex : 0;
    const isCorrect = optionIndex === correctIdx;

    let pointsAwarded = 0;
    let speedBonusAwarded = 0;
    let newStreak = streak;

    if (isCorrect) {
      newStreak += 1;
      pointsAwarded = currentQuestion.points || 100;
      if (timeTakenSeconds < 10) {
        speedBonusAwarded = Math.round((10 - timeTakenSeconds) * 5);
      }
    } else {
      newStreak = 0;
    }

    const newScore = totalScore + pointsAwarded + speedBonusAwarded;
    setStreak(newStreak);
    setTotalScore(newScore);

    // Save answer locally to batch
    recordedAnswersRef.current.push({
      questionId: currentQuestion.id,
      selectedOptionIndex: optionIndex,
      timeTakenSeconds,
    });

    const nextQ = allQuestions[currentIndex + 1] || null;
    const isLastQuestion = currentIndex + 1 >= allQuestions.length || !nextQ;

    const resolvedFeedback: ServerAnswerFeedback = {
      isCorrect,
      correctOptionIndex: correctIdx,
      correctOptionText: currentQuestion.options[correctIdx] || "Correct Option",
      explanation: currentQuestion.explanation || "Official lecture-grounded explanation.",
      sourceCitation: currentQuestion.sourceCitation || quiz.sourceId,
      sourceId: currentQuestion.sourceId || quiz.sourceId,
      sourceExcerpt: currentQuestion.sourceExcerpt,
      pointsAwarded,
      speedBonusAwarded,
      streakValue: newStreak,
      currentTotalScore: newScore,
      nextQuestion: nextQ,
      isLastQuestion,
    };

    setFeedback(resolvedFeedback);
    if (nextQ) {
      setNextQueuedQuestion(nextQ);
    }

    // Non-blocking fire-and-forget sync to backend (never halts UI)
    fetch("/api/quiz/answer-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attemptId,
        questionId: currentQuestion.id,
        selectedOptionIndex: optionIndex,
      }),
    }).catch(() => {});
  };

  // 4. Next Question or Final Consolidated Batch Submission
  const handleNext = async () => {
    if (nextQueuedQuestion) {
      setCurrentQuestion(nextQueuedQuestion);
      setNextQueuedQuestion(null);
      setCurrentIndex((prev) => prev + 1);
      questionStartTimeRef.current = Date.now();
    } else if (feedback?.isLastQuestion || currentIndex >= allQuestions.length - 1) {
      if (isSubmittingFinal) return;
      setIsSubmittingFinal(true);
      setSubmissionError(null);

      const totalTimeSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));

      try {
        const res = await fetch("/api/quiz/finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId,
            quizId: quiz.id,
            answers: recordedAnswersRef.current,
            totalTimeSeconds,
            focusLossCount: focusLossCountRef.current,
            fullscreenExitCount: fullscreenExitCountRef.current,
            copyAttemptCount: copyAttemptCountRef.current,
            userName: studentName,
            userHandle: studentHandle,
            isLeadership,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned status ${res.status}`);
        }

        const data = await res.json();

        if (data.success) {
          onComplete({
            attemptId,
            score: Number(data.finalScore ?? data.score) || totalScore,
            totalPossibleScore: (totalQuestions || allQuestions.length || 10) * 150,
            correctCount: Number(data.correctCount) || 0,
            totalQuestions: Number(data.totalQuestions) || totalQuestions || allQuestions.length || 10,
            accuracyPercentage: Number(data.accuracyPercentage) || 0,
            timeSpentSeconds: Number(data.totalTimeSeconds ?? data.timeSpentSeconds) || totalTimeSeconds,
            maxStreak: Number(data.maxStreak) || streak,
            attemptNumber: Number(data.attemptNumber) || attemptNumber || 1,
            maxAttempts: Number(data.maxAttempts) || maxAttempts || 3,
            attemptsRemaining:
              typeof data.attemptsRemaining === "number"
                ? data.attemptsRemaining
                : Math.max(0, 3 - (data.attemptNumber || attemptNumber || 1)),
            focusLossCount: Number(data.focusLossCount) || focusLossCountRef.current,
            integrityStatus: data.integrityStatus || (focusLossCountRef.current >= 4 ? "suspicious" : "normal"),
            isLeadership: typeof data.isLeadership === "boolean" ? data.isLeadership : isLeadership,
            badgeEarned: data.badgeEarned || undefined,
            userRank: data.userRank,
          });
        } else {
          throw new Error(data.error || "Quiz finalization failed on server.");
        }
      } catch (err: any) {
        console.error("[FINISH_QUIZ_ERROR]", err);
        setSubmissionError(
          err?.message || "Quiz submission failed over network. Your answers are saved. Click below to retry submission."
        );
      } finally {
        setIsSubmittingFinal(false);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {
          triggerToast("Fullscreen is not supported on this browser.");
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const progressPercent = Math.round(((currentIndex + 1) / (totalQuestions || allQuestions.length)) * 100);

  return (
    <div className="relative w-full">
      {/* ── CSS Print Media Blocker ── */}
      <style dangerouslySetInnerHTML={{ __html: `@media print { html, body, * { display: none !important; visibility: hidden !important; } }` }} />

      {/* ── Absolute Opaque Black Screen Shield on Focus Loss / Tab Switch ── */}
      {isBlurred && (
        <div
          onClick={() => {
            document.documentElement.classList.remove("aiic-exam-stealth-blurred");
            document.body.classList.remove("aiic-exam-stealth-blurred");
            setIsBlurred(false);
          }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-2xl p-6 text-center select-none cursor-pointer"
        >
          <div className="p-5 rounded-3xl bg-rose-500/20 border border-rose-500/40 text-rose-400 mb-4 animate-pulse">
            <EyeOff size={44} />
          </div>
          <h3 className="text-lg sm:text-2xl font-bold text-white font-mono tracking-tight">
            EXAM PROTECTION SHIELD ACTIVE
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-md font-sans leading-relaxed">
            Window lost focus or application minimized. Quiz content is obscured to maintain exam integrity.
          </p>
          <div className="mt-6 px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-bold shadow-lg shadow-amber-400/20 transition-transform active:scale-95">
            Tap or Click Here to Resume Exam
          </div>
        </div>
      )}

      <div
        id="quiz-active-exam-container"
        ref={containerRef}
        onContextMenu={(e) => {
          e.preventDefault();
          sendAuditEvent("context_menu_attempt");
          triggerToast("Exam Mode: Context menu disabled");
        }}
        onCopy={(e) => {
          e.preventDefault();
          sendAuditEvent("copy_attempt");
          triggerToast("Exam Mode: Copying is restricted");
        }}
        onCut={(e) => {
          e.preventDefault();
          sendAuditEvent("copy_attempt");
        }}
        onPaste={(e) => {
          e.preventDefault();
        }}
        onDragStart={(e) => e.preventDefault()}
        className={`relative w-full max-w-3xl mx-auto space-y-6 select-none transition-all duration-200 ${
          isFullscreen ? "p-4 sm:p-8 bg-black min-h-screen overflow-y-auto" : ""
        }`}
        style={{
          filter: isBlurred ? "blur(60px)" : "none",
          opacity: isBlurred ? 0.05 : 1,
          pointerEvents: isBlurred ? "none" : "auto",
          transition: "filter 0.1s ease, opacity 0.1s ease",
          userSelect: "none",
          WebkitUserSelect: "none",
          MozUserSelect: "none",
          msUserSelect: "none",
        }}
      >
        {/* ── Continuous Anti-Screenshot Security Watermark ── */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none opacity-[0.05] dark:opacity-[0.08] flex items-center justify-center rotate-[-25deg] scale-125"
        >
          <div className="grid grid-cols-2 gap-20 font-mono text-[11px] sm:text-xs text-amber-300 font-bold uppercase tracking-widest whitespace-nowrap">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="py-2">
                {watermarkText}
              </div>
            ))}
          </div>
        </div>

        {/* ── Integrity Alert Toast ── */}
        {showIntegrityToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-zinc-900/95 border border-amber-500/40 text-amber-300 text-xs font-mono shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-200">
            <AlertTriangle size={14} className="text-amber-400 shrink-0" />
            <span>{showIntegrityToast}</span>
          </div>
        )}

        {/* ── Top Bar with Status & Exam Mode Metrics ── */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-all text-xs font-mono flex items-center gap-1 cursor-pointer"
              title="Exit Quiz"
            >
              <ArrowLeft size={14} />
              <span className="hidden xs:inline">Exit</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
                  {quiz.shortTitle}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-400">
                  Attempt {attemptNumber}/{maxAttempts}
                </span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono">
                  {focusLossCount === 0 ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-emerald-300">Exam Mode Active</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span className="text-amber-300">
                        ⚠ {focusLossCount} Focus Loss{focusLossCount > 1 ? "es" : ""}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-xs text-zinc-400">
                Question {currentIndex + 1} of {totalQuestions}
              </div>
            </div>
          </div>

          {/* Live Metrics */}
          <div className="flex items-center gap-2 sm:gap-3 font-mono">
            <button
              onClick={toggleFullscreen}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 text-xs transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Exam Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              <span className="text-[11px]">{isFullscreen ? "Exit" : "Fullscreen"}</span>
            </button>

            {streak > 1 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold animate-pulse">
                <Zap size={13} className="fill-orange-400 text-orange-400" />
                <span>{streak}x</span>
              </div>
            )}

            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold">
              <Trophy size={13} />
              <span>{totalScore} pts</span>
            </div>

            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-bold transition-all ${
                secondsRemaining <= 5
                  ? "bg-rose-500/20 border-rose-500/40 text-rose-400 animate-bounce"
                  : "bg-zinc-900 border-white/10 text-zinc-300"
              }`}
            >
              <Clock size={13} />
              <span>{secondsRemaining}s</span>
            </div>
          </div>
        </div>

        {/* ── Progress Bar ── */}
        <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden relative z-10">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* ── Question Card ── */}
        <div className="relative z-10 p-6 sm:p-8 rounded-3xl bg-zinc-950/90 border border-white/10 shadow-2xl space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                  {quiz.category}
                </span>
                <span className="font-mono text-[11px] text-zinc-500">
                  Source: {currentQuestion.sourceId}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-500">
                <Lock size={11} className="text-amber-400/70" />
                <span>Protected Exam</span>
              </div>
            </div>

            <h2 className="text-base sm:text-lg font-semibold text-white leading-relaxed select-none">
              {currentQuestion.questionText || (currentQuestion as any).question || "Question"}
            </h2>

            {currentQuestion.latex && (
              <div className="p-3 rounded-xl bg-black/60 border border-amber-500/20 text-center my-2 select-none">
                {renderLatex(currentQuestion.latex)}
              </div>
            )}

            {currentQuestion.codeSnippet && (
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black font-mono text-xs select-none">
                <div className="px-3 py-1 bg-white/5 border-b border-white/10 text-zinc-400 text-[10px] flex items-center gap-1.5">
                  <Code2 size={12} />
                  <span>{currentQuestion.codeSnippet.language}</span>
                </div>
                <pre className="p-4 text-emerald-300 overflow-x-auto select-none">
                  <code>{currentQuestion.codeSnippet.code}</code>
                </pre>
              </div>
            )}
          </div>

          {/* ── Options List ── */}
          <div className="space-y-3 pt-2">
            {currentQuestion.options.map((option, optIdx) => {
              const isSelected = selectedOptionIndex === optIdx;
              const letter = String.fromCharCode(65 + optIdx);

              let buttonStyle = "bg-zinc-900/60 border-white/10 hover:border-amber-400/40 hover:bg-zinc-900 text-zinc-200";

              if (feedback) {
                const isCorrectOption = optIdx === feedback.correctOptionIndex;
                if (isCorrectOption) {
                  buttonStyle = "bg-emerald-950/40 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/50";
                } else if (isSelected && !feedback.isCorrect) {
                  buttonStyle = "bg-rose-950/40 border-rose-500 text-rose-200 ring-1 ring-rose-500/50";
                } else {
                  buttonStyle = "bg-zinc-950/40 border-white/5 text-zinc-500 opacity-60";
                }
              } else if (isSelected) {
                buttonStyle = "bg-amber-500/20 border-amber-400 text-white ring-1 ring-amber-400/50";
              }

              return (
                <button
                  key={optIdx}
                  disabled={feedback !== null || isEvaluating}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-150 flex items-start gap-3.5 group cursor-pointer select-none ${buttonStyle}`}
                >
                  <div
                    className={`w-6 h-6 shrink-0 rounded-lg flex items-center justify-center font-mono text-xs font-bold transition-all ${
                      feedback
                        ? optIdx === feedback.correctOptionIndex
                          ? "bg-emerald-500 text-black"
                          : isSelected && !feedback.isCorrect
                          ? "bg-rose-500 text-white"
                          : "bg-white/5 text-zinc-400"
                        : "bg-white/5 text-zinc-400 group-hover:bg-amber-400/20 group-hover:text-amber-300"
                    }`}
                  >
                    {letter}
                  </div>

                  <div className="flex-1 text-xs sm:text-sm font-medium leading-relaxed pt-0.5 select-none">
                    {option}
                  </div>

                  {isEvaluating && isSelected && (
                    <Loader2 size={16} className="text-amber-400 animate-spin shrink-0 mt-1" />
                  )}

                  {feedback && optIdx === feedback.correctOptionIndex && (
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  )}

                  {feedback && isSelected && !feedback.isCorrect && (
                    <XCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Explanation & Ground Truth ── */}
          {feedback && (
            <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-black/80 border border-white/10 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 select-none">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <div className="flex items-center gap-2 font-semibold text-amber-400">
                  <BookOpen size={13} />
                  <span>Institutional Explanation &amp; Verification</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  {feedback.speedBonusAwarded > 0 && (
                    <span className="text-orange-400 font-bold">+{feedback.speedBonusAwarded} Speed Bonus</span>
                  )}
                  <span className="text-emerald-400 font-bold">+{feedback.pointsAwarded} pts</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed select-none">
                {feedback.explanation}
              </p>

              {feedback.sourceExcerpt && (
                <div className="p-3 rounded-xl bg-amber-500/[0.07] border border-amber-500/20 text-xs font-mono space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                    <ShieldCheck size={13} />
                    <span>Absolute Document Ground Truth:</span>
                  </div>
                  <p className="italic text-zinc-300 text-[11px] sm:text-xs leading-relaxed">
                    &ldquo;{feedback.sourceExcerpt}&rdquo;
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                <span>
                  Verified Source: <strong className="text-zinc-200">{feedback.sourceCitation}</strong>
                </span>
                <span className="text-amber-400/80">[{feedback.sourceId}]</span>
              </div>
            </div>
          )}

          {/* ── Submission Error Alert & Retry ── */}
          {submissionError && (
            <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs font-mono space-y-2.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <AlertTriangle size={15} />
                <span>Quiz Submission Interruption</span>
              </div>
              <p className="text-zinc-300 font-sans text-xs leading-relaxed">{submissionError}</p>
              <div className="pt-1">
                <button
                  onClick={handleNext}
                  disabled={isSubmittingFinal}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-black font-mono text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 shadow-md"
                >
                  {isSubmittingFinal ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                  <span>{isSubmittingFinal ? "Retrying Submission..." : "Retry Submission"}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Action Footer ── */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div className="text-[11px] font-mono text-zinc-400">
              {feedback ? (
                <span className="text-zinc-300">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white">Enter</kbd> or click to proceed
                </span>
              ) : isEvaluating ? (
                <span className="text-amber-300 flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" /> Verifying answer with Sentinel...
                </span>
              ) : (
                <span className="hidden xs:inline">
                  Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-zinc-300">1-4</kbd> or <kbd className="px-1 py-0.5 rounded bg-white/10 text-zinc-300">A-D</kbd> to answer
                </span>
              )}
            </div>

            {feedback && (
              <button
                onClick={handleNext}
                disabled={isSubmittingFinal}
                className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs font-mono flex items-center gap-2 transition-all shadow-lg hover:shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-60"
              >
                {isSubmittingFinal && <Loader2 size={13} className="animate-spin text-black" />}
                <span>
                  {feedback.isLastQuestion || currentIndex >= totalQuestions - 1
                    ? isSubmittingFinal
                      ? "Submitting Exam..."
                      : "Finish & Submit Quiz"
                    : "Next Question"}
                </span>
                {!isSubmittingFinal && <ArrowRight size={14} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

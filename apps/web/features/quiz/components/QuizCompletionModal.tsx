"use client";

import React from "react";
import {
  Trophy,
  Award,
  Sparkles,
  CheckCircle2,
  Clock,
  Zap,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Crown,
  Lock,
  AlertCircle,
} from "lucide-react";
import type { PublicLectureQuiz } from "@/shared/lib/quiz/server-authoritative-engine";

export interface QuizResultData {
  attemptId?: string;
  score: number;
  totalPossibleScore?: number;
  correctCount: number;
  totalQuestions?: number;
  accuracyPercentage: number;
  timeSpentSeconds: number;
  maxStreak: number;
  attemptNumber?: number;
  maxAttempts?: number;
  attemptsRemaining?: number;
  isLeadership?: boolean;
  badgeEarned?: string;
  focusLossCount?: number;
  integrityStatus?: string;
  userRank?: number;
}

interface QuizCompletionModalProps {
  quiz: PublicLectureQuiz | any;
  result: QuizResultData;
  onPlayAgain: () => void;
  onViewLeaderboard: () => void;
  onExit: () => void;
}

export function QuizCompletionModal({
  quiz,
  result,
  onPlayAgain,
  onViewLeaderboard,
  onExit,
}: QuizCompletionModalProps) {
  const score = Number(result?.score) || 0;
  const accuracy = Number(result?.accuracyPercentage) || 0;
  const correctCount = Number(result?.correctCount) || 0;
  const totalQuestions =
    Number(result?.totalQuestions) ||
    Number(quiz?.questionCount) ||
    (Array.isArray(quiz?.questions) ? quiz.questions.length : 10);
  const timeSpent = Number(result?.timeSpentSeconds) || 0;
  const maxStreak = Number(result?.maxStreak) || 0;
  const attemptNumber = Number(result?.attemptNumber) || 1;
  const maxAttempts = Number(result?.maxAttempts) || 3;
  const attemptsRemaining =
    typeof result?.attemptsRemaining === "number"
      ? result.attemptsRemaining
      : Math.max(0, maxAttempts - attemptNumber);

  const isPassed = accuracy >= 70;
  const isPerfect = accuracy === 100;
  const isLeadership = !!result?.isLeadership;
  const shortTitle = quiz?.shortTitle || quiz?.title || "Quiz";
  const badgeEarned = result?.badgeEarned || (accuracy >= 80 ? quiz?.badgeName || "AIIC Scholar" : undefined);
  const canRetake = attemptsRemaining > 0 && !isLeadership;

  return (
    <div className="w-full max-w-xl mx-auto p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
      {/* ── Celebration Icon ── */}
      <div className="relative inline-block mx-auto">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500/20 to-yellow-300/20 border border-amber-400/40 flex items-center justify-center shadow-xl shadow-amber-500/20">
          {isPerfect ? (
            <Sparkles size={36} className="text-amber-400 animate-spin-slow" />
          ) : isPassed ? (
            <Trophy size={36} className="text-amber-400" />
          ) : (
            <Award size={36} className="text-zinc-400" />
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-amber-400 font-semibold">
            {shortTitle} · Quiz Completed
          </span>
          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 font-mono text-[10px] text-zinc-400">
            Attempt {attemptNumber} of {maxAttempts}
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {isPerfect
            ? "Flawless Technical Mastery! 🌟"
            : isPassed
            ? "Institutional Benchmark Passed! 🎯"
            : "Review & Try Again! 📚"}
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          {isLeadership
            ? `Your exam was evaluated with ${score} pts. As AIIC President / Staff Admin, your trial result is verified without altering student rankings.`
            : isPassed
            ? `Outstanding performance! Your score of ${score} pts has been verified and registered on the AIIC institutional member leaderboard.`
            : "You answered several key questions correctly, but didn't meet the 70% mastery threshold. Review the lecture notes and try again!"}
        </p>
      </div>

      {/* ── Attempt Limit Status Indicator ── */}
      <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs font-mono text-zinc-300">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${canRetake ? "bg-amber-400" : "bg-rose-400"}`} />
          <span className="text-zinc-400">Policy: 3 Attempts Max</span>
        </div>
        <div className="text-right">
          {canRetake ? (
            <span className="text-amber-300 font-semibold">
              {attemptsRemaining} retake{attemptsRemaining > 1 ? "s" : ""} remaining
            </span>
          ) : (
            <span className="text-rose-400 font-semibold flex items-center gap-1">
              <Lock size={12} /> Limit Reached (3/3 Used)
            </span>
          )}
        </div>
      </div>

      {/* ── Leadership Notice ── */}
      {isLeadership && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-xs font-mono text-amber-200 text-left space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-300">
            <Crown size={14} className="text-amber-400" />
            <span>AIIC President / Admin Trial Mode Active</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Your exam attempt was fully evaluated server-side. Per club policy, leadership scores are kept private so only active student members compete for podium rankings.
          </p>
        </div>
      )}

      {/* ── Result Metrics Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-black/60 border border-white/10 font-mono">
        <div className="p-2">
          <span className="text-[10px] text-zinc-500 uppercase">Score</span>
          <div className="text-lg sm:text-xl font-bold text-amber-300">{score}</div>
          <span className="text-[10px] text-zinc-500">pts</span>
        </div>

        <div className="p-2">
          <span className="text-[10px] text-zinc-500 uppercase">Accuracy</span>
          <div className="text-lg sm:text-xl font-bold text-emerald-400">{accuracy}%</div>
          <span className="text-[10px] text-zinc-500">{correctCount}/{totalQuestions} Correct</span>
        </div>

        <div className="p-2">
          <span className="text-[10px] text-zinc-500 uppercase">Time</span>
          <div className="text-lg sm:text-xl font-bold text-zinc-200">{timeSpent}s</div>
          <span className="text-[10px] text-zinc-500">Duration</span>
        </div>

        <div className="p-2">
          <span className="text-[10px] text-zinc-500 uppercase">Max Streak</span>
          <div className="text-lg sm:text-xl font-bold text-orange-400">{maxStreak}x</div>
          <span className="text-[10px] text-zinc-500">Combo</span>
        </div>
      </div>

      {/* ── Earned Badge Card ── */}
      {badgeEarned && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} className="text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-amber-300">
                Institutional Achievement Unlocked
              </div>
              <div className="text-sm font-bold text-white">
                {badgeEarned}
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-400 text-black text-[10px] font-mono font-bold shrink-0">
            VERIFIED
          </span>
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        {canRetake ? (
          <button
            onClick={onPlayAgain}
            className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <RotateCcw size={14} />
            <span>Retake Quiz ({attemptsRemaining} left)</span>
          </button>
        ) : (
          <div
            className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-zinc-900/60 border border-white/5 text-zinc-500 font-mono text-xs font-medium flex items-center justify-center gap-2 cursor-not-allowed select-none"
            title="Maximum 3 attempts reached for this lecture quiz."
          >
            <Lock size={13} className="text-zinc-500" />
            <span>Top Score Locked (3/3 Used)</span>
          </div>
        )}

        <button
          onClick={onViewLeaderboard}
          className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-amber-500/20 active:scale-95 cursor-pointer"
        >
          <Trophy size={14} />
          <span>View Member Leaderboard</span>
        </button>
      </div>

      <div>
        <button
          onClick={onExit}
          className="text-xs font-mono text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
        >
          Return to Lecture Catalog
        </button>
      </div>
    </div>
  );
}

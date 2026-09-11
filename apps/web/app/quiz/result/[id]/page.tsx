"use client";

import React, { useEffect, useState, use } from "react";
import { Nav, Footer } from "@/features/landing";
import { QuizCompletionModal, type QuizResultData } from "@/features/quiz/components/QuizCompletionModal";
import { QuizErrorBoundary } from "@/features/quiz/components/QuizErrorBoundary";
import { Loader2, AlertCircle, ArrowLeft, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PublicLectureQuiz } from "@/shared/lib/quiz/server-authoritative-engine";

export default function QuizResultDirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const attemptId = resolvedParams.id;
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResultData | null>(null);
  const [quiz, setQuiz] = useState<PublicLectureQuiz | null>(null);

  useEffect(() => {
    async function loadResult() {
      try {
        const res = await fetch(`/api/quiz/result/${attemptId}`);
        const data = await res.json();

        if (data.success && data.result) {
          setResult(data.result);
          setQuiz(data.quiz);
        } else {
          setError(data.error || "Attempt record not found.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load attempt result.");
      } finally {
        setIsLoading(false);
      }
    }

    if (attemptId) {
      loadResult();
    }
  }, [attemptId]);

  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <Nav />
      <main className="mx-auto max-w-[1140px] px-4 sm:px-8 py-8 sm:py-16 pb-36 sm:pb-24 space-y-8">
        <QuizErrorBoundary
          fallbackTitle="Quiz Result Display Issue"
          fallbackMessage="Unable to render attempt score card. You can view all results on the Institutional Leaderboard."
          onReset={() => router.push("/quiz")}
        >
          {isLoading ? (
            <div className="p-16 text-center text-zinc-400 font-mono text-xs flex flex-col items-center justify-center gap-3">
              <Loader2 size={24} className="animate-spin text-amber-400" />
              <span>Retrieving server-verified attempt evaluation...</span>
            </div>
          ) : error ? (
            <div className="max-w-md mx-auto p-8 rounded-3xl bg-zinc-950 border border-white/10 text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-base font-bold text-white font-mono">Attempt Not Found</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{error}</p>
              <div className="pt-2">
                <button
                  onClick={() => router.push("/quiz")}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-all"
                >
                  <ArrowLeft size={14} />
                  <span>Return to Quizzes</span>
                </button>
              </div>
            </div>
          ) : result && quiz ? (
            <QuizCompletionModal
              quiz={quiz}
              result={result}
              onPlayAgain={() => router.push("/quiz")}
              onViewLeaderboard={() => router.push("/quiz")}
              onExit={() => router.push("/quiz")}
            />
          ) : null}
        </QuizErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

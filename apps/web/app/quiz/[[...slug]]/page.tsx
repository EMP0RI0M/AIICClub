import { Nav, Footer } from "@/features/landing";
import { QuizHub } from "@/features/quiz/components/QuizHub";
import { Trophy } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AIIC Lecture Quizzes & Institutional Leaderboard — Bal Bhawan School",
  description:
    "Test your engineering knowledge across AIIC Lecture 1 (Website Basics), Lecture 2 (RAG & AI Applications), and Autonomous Agent Masterclasses. Compete on the live institutional leaderboard.",
};

export default async function QuizCatchAllPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const resolvedParams = await params;
  const slugParts = resolvedParams.slug || [];
  const primarySlug = slugParts.length > 0 ? slugParts[0] : undefined;

  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <Nav />
      <main className="mx-auto max-w-[1140px] px-4 sm:px-8 py-8 sm:py-16 pb-36 sm:pb-24 space-y-8 sm:space-y-12">
        {/* ─── Hero Section ─── */}
        <div className="aiic-glass-premium rounded-3xl p-8 sm:p-12 shadow-2xl border border-white/10 overflow-hidden relative">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 font-mono text-xs font-semibold text-amber-300">
              <Trophy size={13} />
              <span>AIIC Academic Sentinel · Session 2026–27</span>
            </div>

            <h1 className="text-[clamp(32px,5vw,52px)] font-black tracking-tight text-white leading-tight">
              LECTURE QUIZZES &amp; LEADERBOARD
            </h1>

            <p className="text-base sm:text-lg font-medium text-amber-300">
              Master the engineering logic. Earn institutional badges. Climb the cohort ranks.
            </p>

            <p className="text-xs sm:text-sm leading-relaxed text-zinc-300 max-w-2xl">
              Official knowledge assessments grounded in AIIC Lecture 1 Notes (Web Architecture),
              Lecture 2 Notes (RAG &amp; Vector Embeddings), the Autonomous Multi-Agent Masterclass,
              and the AIIC Prospectus.
            </p>
          </div>
        </div>

        {/* ─── Master Quiz Hub with optional targeted route slug ─── */}
        <QuizHub initialSlug={primarySlug} />
      </main>
      <Footer />
    </div>
  );
}

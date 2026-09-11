import { Nav, Footer } from "@/features/landing";
import { ArchiveExplorer } from "@/features/archive/components/ArchiveExplorer";
import { getArchiveRecords, getArchiveStats } from "@/shared/lib/archive-service";
import Link from "next/link";
import {
  FolderGit2,
  FileText,
  Layers,
  History,
  Shield,
  Sparkles,
  BookOpen,
  ArrowRight,
  Database,
  Trophy,
} from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AIIC Institutional Archive — AI & Innovation Club",
  description:
    "Official institutional memory of AIIC at Bal Bhawan School: GitHub repositories, research documents, curriculum capstones, and historical records.",
};

export default async function ArchiveIndexPage() {
  const [records, stats] = await Promise.all([
    getArchiveRecords(),
    getArchiveStats(),
  ]);

  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <Nav />
      <main className="mx-auto max-w-[1140px] px-5 py-12 sm:px-8 sm:py-20 space-y-14">
        {/* ─── Hero Section ─── */}
        <div className="aiic-glass-premium rounded-2xl p-8 sm:p-12 shadow-2xl overflow-hidden">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs font-semibold text-accent">
              <Shield size={13} />
              <span>AIIC Institutional Archive · Bal Bhawan School</span>
            </div>

            <h1 className="mt-4 text-[clamp(32px,5vw,56px)] font-bold tracking-tight text-white">
              AIIC ARCHIVE
            </h1>

            <p className="mt-2 text-lg sm:text-xl font-medium text-accent">
              Preserving what we build. Remembering how we built it.
            </p>

            <p className="mt-4 text-sm sm:text-base leading-relaxed text-zinc-300">
              The unified institutional memory of the AI &amp; Innovation Club. Indexing open-source
              GitHub repositories, research papers, curriculum deliverables, policy guidelines, and
              historical milestones.
            </p>

            {/* Quick Stats Grid */}
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 pt-6 border-t border-white/[0.08]">
              <div className="aiic-glass-soft rounded-xl p-3.5 font-mono">
                <span className="text-[11px] text-zinc-400">Total Records</span>
                <p className="text-2xl font-bold text-accent">{stats.totalRecords}</p>
              </div>
              <div className="aiic-glass-soft rounded-xl p-3.5 font-mono">
                <span className="text-[11px] text-zinc-400">Repositories</span>
                <p className="text-2xl font-bold text-white">{stats.totalRepositories}</p>
              </div>
              <div className="aiic-glass-soft rounded-xl p-3.5 font-mono">
                <span className="text-[11px] text-zinc-400">Documents</span>
                <p className="text-2xl font-bold text-info">{stats.totalDocuments}</p>
              </div>
              <div className="aiic-glass-soft rounded-xl p-3.5 font-mono">
                <span className="text-[11px] text-zinc-400">Active Session</span>
                <p className="text-2xl font-bold text-live">2026–27</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Quiz & Leaderboard Sentinel Banner ─── */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-zinc-950 to-zinc-950 border border-amber-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0 mt-0.5">
              <Trophy size={20} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Lecture Knowledge Quizzes &amp; Live Leaderboard</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold">
                  NEW
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Test your mastery on Lecture 1 (Website Architecture), Lecture 2 (RAG &amp; Vector Embeddings), and the Multi-Agent Masterclass. Earn verified institutional badges.
              </p>
            </div>
          </div>
          <Link
            href="/quiz"
            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-amber-500/20 shrink-0"
          >
            <span>Take Lecture Quizzes</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* ─── Archive Explorer Client System ─── */}
        <ArchiveExplorer initialRecords={records} stats={stats} />
      </main>
      <Footer />
    </div>
  );
}

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
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-surface-raised/60 p-8 sm:p-12 backdrop-blur-md">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs font-semibold text-accent">
              <Shield size={13} />
              <span>AIIC Institutional Archive · Bal Bhawan School</span>
            </div>

            <h1 className="mt-4 text-[clamp(32px,5vw,56px)] font-bold tracking-tight text-text-primary">
              AIIC ARCHIVE
            </h1>

            <p className="mt-2 text-lg sm:text-xl font-medium text-accent">
              Preserving what we build. Remembering how we built it.
            </p>

            <p className="mt-4 text-sm sm:text-base leading-relaxed text-text-secondary">
              The unified institutional memory of the AI &amp; Innovation Club. Indexing open-source
              GitHub repositories, research papers, curriculum deliverables, policy guidelines, and
              historical milestones.
            </p>

            {/* Quick Stats Grid */}
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 pt-6 border-t border-border/60">
              <div className="rounded-lg border border-border/60 bg-bg-deep p-3 font-mono">
                <span className="text-[11px] text-text-muted">Total Records</span>
                <p className="text-2xl font-bold text-accent">{stats.totalRecords}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-bg-deep p-3 font-mono">
                <span className="text-[11px] text-text-muted">Repositories</span>
                <p className="text-2xl font-bold text-text-primary">{stats.totalRepositories}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-bg-deep p-3 font-mono">
                <span className="text-[11px] text-text-muted">Documents</span>
                <p className="text-2xl font-bold text-info">{stats.totalDocuments}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-bg-deep p-3 font-mono">
                <span className="text-[11px] text-text-muted">Active Session</span>
                <p className="text-2xl font-bold text-live">2026–27</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Archive Explorer Client System ─── */}
        <ArchiveExplorer initialRecords={records} stats={stats} />
      </main>
      <Footer />
    </div>
  );
}

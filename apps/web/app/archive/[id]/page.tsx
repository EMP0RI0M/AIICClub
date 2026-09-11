import { Nav, Footer } from "@/features/landing";
import { getArchiveRecordById, getArchiveRecords, extractYouTubeId } from "@/shared/lib/archive-service";
import { DocumentReader } from "@/features/archive/components/DocumentReader";
import { SourceAiChatButton } from "@/features/archive/components/SourceAiChatButton";
import { findQuizById } from "@/shared/lib/quiz/source-quiz-engine";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FileText,
  FolderGit2,
  Calendar,
  Tag,
  ArrowLeft,
  Download,
  Shield,
  Clock,
  Layers,
  ExternalLink,
  History,
  CheckCircle2,
  Sparkles,
  Play,
  Globe,
  Code2,
  Video,
  Lock,
  Monitor,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const record = await getArchiveRecordById(id);
  return {
    title: `${record?.title || id} — AIIC Institutional Archive`,
    description: record?.description || "AIIC Permanent Institutional Archival Record",
  };
}

function FormattedDescription({ text }: { text: string }) {
  if (!text) return <p className="text-zinc-500 italic text-xs font-mono">No synopsis provided for this institutional record.</p>;

  const paragraphs = text.split("\n\n");

  return (
    <div className="space-y-3 font-sans text-sm sm:text-base text-zinc-300 leading-relaxed">
      {paragraphs.map((para, idx) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const items = trimmed.split(/\n[-*]\s+/);
          return (
            <ul key={idx} className="space-y-1.5 pl-4 list-disc marker:text-amber-400">
              {items.map((item, iIdx) => (
                <li key={iIdx} className="text-xs sm:text-sm text-zinc-300">
                  {item.replace(/^[-*]\s+/, "")}
                </li>
              ))}
            </ul>
          );
        }

        // Detect timestamps (e.g. 00:00 or 12:30)
        const hasTimestamps = /^\d{1,2}:\d{2}/m.test(trimmed);
        if (hasTimestamps) {
          const lines = trimmed.split("\n");
          return (
            <div key={idx} className="space-y-1 rounded-xl bg-white/[0.02] border border-white/5 p-3 font-mono text-xs text-zinc-300">
              {lines.map((line, lIdx) => (
                <div key={lIdx} className="flex items-start gap-2">
                  <span className="text-amber-400 shrink-0 font-semibold">•</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          );
        }

        return (
          <p key={idx} className="whitespace-pre-line text-zinc-300 text-xs sm:text-sm leading-relaxed">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export default async function ArchiveRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getArchiveRecordById(id);

  if (!record) {
    notFound();
  }

  const doc = record.document;
  const video = record.video;
  const repo = record.repository;
  const build = record.build;
  const isVideo = record.type === "video" || Boolean(video);
  const ytId = video?.youtubeId || (video?.youtubeUrl ? extractYouTubeId(video.youtubeUrl) : null) || extractYouTubeId(record.description || "");

  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-[#000000] text-white">
      <Nav />
      <main className="mx-auto max-w-[1140px] px-5 py-12 sm:px-8 sm:py-16 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 border-b border-white/[0.08] pb-5">
          <Link
            href="/archive"
            className="inline-flex items-center gap-1 font-mono text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={13} /> Back to Archive
          </Link>
          <span className="text-zinc-600 font-mono text-xs">/</span>
          <span className="font-mono text-xs font-bold text-amber-400">{record.archiveId}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Main Record Body */}
          <div className="space-y-8 min-w-0">
            <div className="rounded-2xl border border-white/[0.08] bg-[#050505] p-6 sm:p-8 shadow-2xl space-y-6">
              {/* Header Badge Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-bold text-amber-300">
                    {record.archiveId}
                  </span>
                  <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1 text-zinc-300 uppercase font-semibold">
                    {record.type}
                  </span>
                  {record.session && (
                    <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1 text-zinc-400">
                      Session {record.session}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <SourceAiChatButton record={record} variant="compact" />
                  {isVideo && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-mono text-xs text-amber-300">
                      <Sparkles size={12} />
                      <span>Official Lecture Record</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Record Title */}
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-snug">
                {record.title}
              </h1>

              {/* Cinematic Video Player Embed */}
              {isVideo && ytId && (
                <div className="rounded-2xl overflow-hidden border border-amber-500/40 bg-black shadow-[0_4px_35px_rgba(245,158,11,0.12)] space-y-3 p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs font-mono">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold">
                      <Video size={14} />
                      <span>{video?.channelTitle || "AIIC Bal Bhawan Lecture Recording"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {video?.duration && (
                        <span className="text-zinc-300 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                          <Clock size={11} className="text-amber-400" />
                          <span>{video.duration}</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                        1080p HD
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl overflow-hidden aspect-video bg-black border border-white/10">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1`}
                      title={record.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full border-none"
                    />
                  </div>

                  <div className="px-1 pt-1 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-zinc-400">
                    {video?.speaker && (
                      <span className="flex items-center gap-1.5">
                        <span className="text-zinc-500">Instructor:</span>
                        <strong className="text-amber-300 font-semibold">{video.speaker}</strong>
                      </span>
                    )}
                    <a
                      href={video?.youtubeUrl || `https://www.youtube.com/watch?v=${ytId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 transition-colors"
                    >
                      <span>Watch on YouTube</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              )}

              {/* Record Description & Synopsis */}
              <div className="space-y-2 rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
                <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-amber-400 block mb-2">
                  Institutional Record Synopsis &amp; Overview
                </span>
                <FormattedDescription text={record.description || ""} />
              </div>

              {/* Rich Document Reader & Study Notes Viewer */}
              {(doc || record.type === "document") && (
                <DocumentReader
                  document={doc}
                  title={record.title}
                  archiveId={record.archiveId}
                  session={record.session}
                  category={doc?.category || (record.type === "document" ? "Lecture Notes" : undefined)}
                  defaultContent={record.description}
                />
              )}

              {/* Repository Details Box */}
              {repo && (
                <div className="rounded-xl p-5 border border-white/[0.08] bg-[#050505] space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">GitHub Repository</span>
                    <a
                      href={repo.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <span>{repo.githubOwner || "aiic"}/{repo.githubName || "repository"}</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                  {repo.language && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Primary Language</span>
                      <span className="text-white">{repo.language}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Interactive Live Website & Build Browser Mockup */}
              {(build || record.type === "build") && (
                <div className="rounded-2xl overflow-hidden border border-amber-500/40 bg-[#050505] shadow-2xl space-y-3 p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs font-mono">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold">
                      <Globe size={15} />
                      <span>AIIC Live Deployment &amp; Interactive Sandbox</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10.5px] font-bold">
                        {build?.environment || "production"}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10.5px] font-bold">
                        {build?.version || "v2.0.0"}
                      </span>
                    </div>
                  </div>

                  {/* Browser Chrome Window Mockup */}
                  <div className="rounded-xl overflow-hidden border border-white/10 bg-black shadow-inner">
                    {/* Top Bar with Dots and URL */}
                    <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-950 border-b border-white/10 gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="size-2.5 rounded-full bg-rose-500/90" />
                        <div className="size-2.5 rounded-full bg-amber-500/90" />
                        <div className="size-2.5 rounded-full bg-emerald-500/90" />
                      </div>

                      <div className="flex-1 min-w-[180px] max-w-[500px] flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/80 border border-white/10 text-[11px] font-mono text-zinc-300">
                        <Lock size={11} className="text-emerald-400 shrink-0" />
                        <span className="truncate text-amber-300">{build?.buildUrl || "https://aiic-bbs.vercel.app"}</span>
                      </div>

                      <a
                        href={build?.buildUrl || "https://aiic-bbs.vercel.app"}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10.5px] font-mono flex items-center gap-1 transition-all"
                      >
                        <span>Open Live</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>

                    {/* Interactive Sandbox Iframe */}
                    <div className="w-full h-[520px] bg-black">
                      <iframe
                        src={build?.buildUrl || "https://aiic-bbs.vercel.app"}
                        title={record.title}
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                        className="w-full h-full border-none bg-black"
                      />
                    </div>

                    <div className="px-3.5 py-1.5 bg-zinc-950 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                        <span>Interactive Sandbox Iframe Ready</span>
                      </span>
                      <span className="text-zinc-500">Secured with sandbox permissions</span>
                    </div>
                  </div>

                  {build?.releaseNotes && (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 font-mono text-xs text-zinc-400">
                      <span className="text-zinc-500 block text-[10px] uppercase mb-1">Release Notes</span>
                      <p className="text-zinc-300">{build.releaseNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar Metadata */}
          <div className="space-y-6">
            {/* Dedicated Source AI Chat Card */}
            <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-b from-[#181203] via-[#0b0802] to-black p-5 shadow-[0_4px_25px_rgba(245,158,11,0.1)] space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                <Sparkles size={14} className="fill-amber-400 text-amber-400 animate-pulse" />
                <span>Source-Locked AI Assistant</span>
              </div>
              <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                Chat with our AI study assistant strictly grounded in this record. Conversations are saved automatically.
              </p>
              <SourceAiChatButton record={record} variant="primary" className="w-full" />
            </div>

            {/* Interactive Knowledge Check CTA */}
            {(() => {
              const matchedQuiz = findQuizById(record.archiveId);
              const quizSlug = matchedQuiz?.id || "lecture-1-website-basics";
              return (
                <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-b from-[#181203] via-[#0b0802] to-black p-5 shadow-[0_4px_25px_rgba(245,158,11,0.1)] space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                    <Zap size={14} className="fill-amber-400 animate-pulse" />
                    <span>Official Lecture Quiz</span>
                  </div>
                  <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                    Test your mastery of {matchedQuiz?.shortTitle || "this lecture"} with our server-authoritative institutional quiz engine.
                  </p>
                  <Link
                    href={`/quiz?quiz=${quizSlug}`}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black py-2.5 font-mono text-xs font-bold shadow-md active:scale-95 transition-all"
                  >
                    <Zap size={13} className="fill-black" />
                    <span>Take {matchedQuiz?.shortTitle || "Lecture Quiz"}</span>
                  </Link>
                </div>
              );
            })()}

            <div className="rounded-2xl border border-white/[0.08] bg-[#000000] p-5 shadow-xl space-y-4">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-500">
                Institutional Metadata
              </h3>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <span className="text-zinc-500 block text-[10px]">STATUS</span>
                  <span className="text-emerald-400 font-semibold">{record.status || "Active"}</span>
                </div>

                <div>
                  <span className="text-zinc-500 block text-[10px]">YEAR & SESSION</span>
                  <span className="text-white">{record.year} · {record.session}</span>
                </div>

                <div>
                  <span className="text-zinc-500 block text-[10px]">VISIBILITY</span>
                  <span className="text-white capitalize">{(record as any).visibility || "Public"}</span>
                </div>

                <div>
                  <span className="text-zinc-500 block text-[10px]">RECORDED AT</span>
                  <span className="text-white">{new Date(record.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Tags Box */}
            {record.tags && record.tags.length > 0 && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#000000] p-5 shadow-xl space-y-3">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Topic Tags
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {record.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 font-mono text-[11px] text-zinc-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

import { Nav, Footer } from "@/features/landing";
import { getProjects } from "@/shared/lib/aiic-data";
import Link from "next/link";
import { FolderGit2, ArrowUpRight, GitBranch, ExternalLink, Archive, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Projects & Prototypes — AIIC",
  description: "Explore student-built software, artificial intelligence agents, and hardware prototypes from AIIC.",
};

export default async function ProjectsPage() {
  const projects = await getProjects().catch(() => []);

  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background text-text-primary">
      <Nav />
      <main className="mx-auto max-w-[1280px] px-5 py-14 sm:px-8 sm:py-20 space-y-12">
        {/* Header Hero */}
        <div className="aiic-glass-premium rounded-3xl p-7 sm:p-10 shadow-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs font-semibold text-accent">
            <FolderGit2 size={14} />
            <span>AIIC Open Repositories &amp; Capstones</span>
          </div>

          <h1 className="text-[clamp(32px,5vw,52px)] font-bold tracking-tight text-white leading-tight">
            Projects &amp; Prototypes
          </h1>

          <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-zinc-300">
            Every project developed under AIIC is built by student teams, peer-reviewed,
            and archived permanently as open-source technology.
          </p>
        </div>

        {/* Project Grid / Empty State */}
        <div>
          {projects.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="aiic-glass-default aiic-glass-interactive flex flex-col justify-between rounded-2xl p-6 sm:p-7 shadow-xl border border-white/[0.08]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider rounded-md border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-accent">
                        {p.category}
                      </span>
                      <span className="font-mono text-[11px] text-zinc-400">
                        {p.status}
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-bold text-white leading-snug">
                      <Link href={`/projects/${p.slug}`} className="hover:text-accent transition-colors">
                        {p.title}
                      </Link>
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                      {p.summary || p.description}
                    </p>

                    {p.technologies?.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {p.technologies.map((t) => (
                          <span
                            key={t}
                            className="font-mono text-[10px] rounded-md bg-white/[0.04] px-2 py-0.5 text-zinc-300 border border-white/[0.08]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-white/[0.08] pt-4 text-xs font-mono">
                    <Link
                      href={`/projects/${p.slug}`}
                      className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
                    >
                      <span>Project details</span> <ArrowUpRight size={13} />
                    </Link>

                    <div className="flex items-center gap-3">
                      {p.repositoryUrl && (
                        <a
                          href={p.repositoryUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-400 hover:text-white transition-colors"
                          aria-label="GitHub repository"
                        >
                          <GitBranch size={15} />
                        </a>
                      )}
                      {p.demoUrl && (
                        <a
                          href={p.demoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-400 hover:text-white transition-colors"
                          aria-label="Live Demo"
                        >
                          <ExternalLink size={15} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="aiic-glass-soft rounded-3xl p-12 text-center border border-white/[0.08]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.08] mx-auto text-zinc-500">
                <FolderGit2 size={26} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">No public projects published yet</h3>
              <p className="mx-auto mt-2 max-w-[45ch] text-xs sm:text-sm text-zinc-400">
                Student teams are actively building new software, AI models, and robotics projects.
                Verified releases will appear here automatically.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/archive"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-5 font-mono text-xs font-bold text-on-accent hover:bg-accent-hover transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Archive size={14} /> Explore Archive
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

import { Nav, Footer } from "@/features/landing";
import { getProjects } from "@/shared/lib/aiic-data";
import Link from "next/link";
import { FolderGit2, ArrowUpRight, GitBranch, ExternalLink, Archive } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Projects & Prototypes — AIIC",
  description: "Explore student-built software, artificial intelligence agents, and hardware prototypes from AIIC.",
};

export default async function ProjectsPage() {
  const projects = await getProjects().catch(() => []);

  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <Nav />
      <main className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8 sm:py-24">
        {/* Header */}
        <div className="max-w-2xl">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">
            AIIC Showcase
          </span>
          <h1 className="mt-3 text-[clamp(32px,5vw,52px)] font-bold tracking-tight text-text-primary">
            Projects &amp; Prototypes
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
            Every project developed under AIIC is built by student teams, documented,
            and archived as open-source technology.
          </p>
        </div>

        {/* Project Grid / Empty State */}
        <div className="mt-14">
          {projects.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col justify-between rounded-xl border border-border/80 bg-surface-raised p-6 transition-all hover:border-border-active hover:bg-surface-overlay"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider rounded border border-border px-2 py-0.5 text-accent">
                        {p.category}
                      </span>
                      <span className="font-mono text-[11px] text-text-muted">
                        {p.status}
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-text-primary">
                      <Link href={`/projects/${p.slug}`} className="hover:underline">
                        {p.title}
                      </Link>
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-text-muted">
                      {p.summary || p.description}
                    </p>

                    {p.technologies?.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {p.technologies.map((t) => (
                          <span
                            key={t}
                            className="font-mono text-[10px] rounded bg-surface px-2 py-0.5 text-text-secondary border border-border/60"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4 text-xs">
                    <Link
                      href={`/projects/${p.slug}`}
                      className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                    >
                      Project details <ArrowUpRight size={13} />
                    </Link>

                    <div className="flex items-center gap-3">
                      {p.repositoryUrl && (
                        <a
                          href={p.repositoryUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-text-muted hover:text-text-primary"
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
                          className="text-text-muted hover:text-text-primary"
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
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <FolderGit2 className="mx-auto h-10 w-10 text-text-faint" />
              <h3 className="mt-4 text-base font-semibold text-text-primary">No public projects published yet</h3>
              <p className="mx-auto mt-2 max-w-[45ch] text-sm text-text-muted">
                Student teams are actively building new software, AI models, and robotics projects.
                Verified releases will appear here automatically.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/archive"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-4 font-mono text-xs font-semibold text-on-accent hover:bg-accent-violet-bright transition-colors"
                >
                  <Archive size={13} /> Explore Archive
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

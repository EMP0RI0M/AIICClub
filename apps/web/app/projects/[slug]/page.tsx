import { Nav, Footer } from "@/features/landing";
import { getProjectBySlug, getProjects } from "@/shared/lib/aiic-data";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GitBranch, ExternalLink, Users, Calendar, Layers, FolderGit2, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const projects = await getProjects().catch(() => []);
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    return (
      <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background text-text-primary">
        <Nav />
        <main className="mx-auto max-w-[800px] px-5 py-24 text-center">
          <div className="aiic-glass-soft rounded-2xl p-12 text-center">
            <h1 className="text-2xl font-bold text-white">Project Not Found</h1>
            <p className="mt-2 text-sm text-zinc-400">The requested project could not be located in the AIIC archive.</p>
            <div className="mt-6">
              <Link href="/projects" className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-5 font-mono text-xs font-bold text-on-accent hover:bg-accent-hover transition-all">
                <ArrowLeft size={13} /> Back to Projects
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background text-text-primary">
      <Nav />
      <main className="mx-auto max-w-[920px] px-5 py-12 sm:px-8 sm:py-20">
        {/* Breadcrumb */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={13} /> Back to Projects
        </Link>

        {/* Title & Metadata Hero Card */}
        <div className="mt-6 space-y-8">
          <div className="aiic-glass-premium rounded-3xl p-7 sm:p-10 shadow-2xl space-y-6">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1 text-accent font-semibold uppercase tracking-wider">
                {project.category}
              </span>
              <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-zinc-300">
                Status: {project.status}
              </span>
            </div>

            <h1 className="text-[clamp(28px,4.5vw,48px)] font-bold tracking-tight text-white leading-[1.15]">
              {project.title}
            </h1>

            <p className="text-base sm:text-lg leading-relaxed text-zinc-300">
              {project.summary || project.description}
            </p>

            {/* Action Links */}
            <div className="flex flex-wrap gap-3 pt-2">
              {project.repositoryUrl && (
                <a
                  href={project.repositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4.5 font-mono text-xs font-medium text-zinc-200 hover:text-white hover:border-white/20 transition-all shadow-sm"
                >
                  <GitBranch size={14} className="text-accent" /> Repository
                </a>
              )}
              {project.demoUrl && (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-5 font-mono text-xs font-bold text-on-accent hover:bg-accent-hover transition-all shadow-md active:scale-95"
                >
                  <ExternalLink size={14} /> Live Demo
                </a>
              )}
            </div>
          </div>

          {/* Technologies */}
          {project.technologies?.length > 0 && (
            <div className="aiic-glass-default rounded-2xl p-6 sm:p-7 shadow-xl space-y-3">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Technologies &amp; Architecture
              </h3>
              <div className="flex flex-wrap gap-2 pt-1">
                {project.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="font-mono text-xs rounded-lg bg-white/[0.04] px-3 py-1 text-zinc-200 border border-white/[0.08] shadow-sm"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Full Details */}
          <div className="aiic-glass-default rounded-2xl p-6 sm:p-7 shadow-xl space-y-3">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Overview &amp; Documentation
            </h3>
            <div className="prose prose-invert max-w-none text-sm sm:text-base leading-relaxed text-zinc-300">
              <p>{project.description}</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

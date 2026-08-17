import { Nav, Footer } from "@/features/landing";
import { getProjectBySlug, getProjects } from "@/shared/lib/aiic-data";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GitBranch, ExternalLink, Users, Calendar, Layers } from "lucide-react";

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
      <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background">
        <Nav />
        <main className="mx-auto max-w-[800px] px-5 py-24 text-center">
          <h1 className="text-2xl font-bold text-text-primary">Project Not Found</h1>
          <p className="mt-2 text-sm text-text-muted">The requested project could not be located in the AIIC archive.</p>
          <div className="mt-6">
            <Link href="/projects" className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-xs font-semibold text-on-accent">
              <ArrowLeft size={13} /> Back to Projects
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <Nav />
      <main className="mx-auto max-w-[900px] px-5 py-16 sm:px-8 sm:py-24">
        {/* Breadcrumb */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary"
        >
          <ArrowLeft size={12} /> Back to Projects
        </Link>

        {/* Title & Metadata */}
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider rounded border border-border px-2 py-0.5 text-accent">
              {project.category}
            </span>
            <span className="font-mono text-xs text-text-muted">
              Status: {project.status}
            </span>
          </div>

          <h1 className="mt-4 text-[clamp(28px,4.5vw,48px)] font-bold tracking-tight text-text-primary">
            {project.title}
          </h1>

          <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
            {project.summary || project.description}
          </p>
        </div>

        {/* Action Links */}
        <div className="mt-8 flex flex-wrap gap-3">
          {project.repositoryUrl && (
            <a
              href={project.repositoryUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface-raised px-4 text-xs font-medium text-text-primary hover:bg-surface-overlay"
            >
              <GitBranch size={14} /> Repository
            </a>
          )}
          {project.demoUrl && (
            <a
              href={project.demoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-xs font-semibold text-on-accent hover:bg-accent-hover"
            >
              <ExternalLink size={14} /> Live Demo
            </a>
          )}
        </div>

        {/* Technologies */}
        {project.technologies?.length > 0 && (
          <div className="mt-12 rounded-xl border border-border/80 bg-surface-raised p-6">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
              Technologies &amp; Architecture
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.technologies.map((tech) => (
                <span
                  key={tech}
                  className="font-mono text-xs rounded-md bg-surface px-2.5 py-1 text-text-secondary border border-border"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Full Details */}
        <div className="mt-10 rounded-xl border border-border/80 bg-surface-raised p-6">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
            Overview &amp; Documentation
          </h3>
          <div className="mt-4 prose prose-invert text-sm leading-relaxed text-text-secondary">
            <p>{project.description}</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

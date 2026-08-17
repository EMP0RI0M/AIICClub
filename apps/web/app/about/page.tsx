import { Nav, Footer } from "@/features/landing";
import Link from "next/link";
import { ArrowRight, Code2, Users, Cpu, ShieldCheck, Trophy, Sparkles, Archive, Calendar } from "lucide-react";

export const metadata = {
  title: "About AIIC — AI & Innovation Club",
  description: "Learn about the mission, governance, history, and technical domains of AIIC.",
};

export default function AboutPage() {
  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <Nav />
      <main className="mx-auto max-w-[1080px] px-5 py-16 sm:px-8 sm:py-24">
        {/* Header */}
        <div className="max-w-3xl">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">
            Organization Profile
          </span>
          <h1 className="mt-3 text-[clamp(32px,5vw,56px)] font-bold tracking-tight text-text-primary">
            AI &amp; Innovation Club
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-text-secondary">
            AIIC is a student-led organization established to foster hands-on engineering,
            artificial intelligence research, hardware innovation, and collaborative software development.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="mt-16 grid gap-8 md:grid-cols-2">
          <div className="rounded-xl border border-border/80 bg-surface-raised p-8">
            <h2 className="text-xl font-bold text-text-primary">Our Mission</h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              To empower student builders with the computing resources, peer network, mentorship,
              and collaborative tooling needed to create impactful real-world technology.
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-surface-raised p-8">
            <h2 className="text-xl font-bold text-text-primary">Our Vision</h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              To build a permanent, enduring center of technological excellence, maintaining an immutable
              archive of student achievements, research publications, and open-source contributions.
            </p>
          </div>
        </div>

        {/* Core Principles */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Core Principles</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-surface/50 p-5">
              <h3 className="font-semibold text-text-primary">1. Build in Public</h3>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                All software and research projects are open-source and documented in the public archive.
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-surface/50 p-5">
              <h3 className="font-semibold text-text-primary">2. Real Responsibility</h3>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                Student members lead teams, manage compute infrastructure, and make architectural decisions.
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-surface/50 p-5">
              <h3 className="font-semibold text-text-primary">3. Peer Mentorship</h3>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                Senior members and project leads run technical workshops and code reviews for newcomers.
              </p>
            </div>
          </div>
        </div>

        {/* Institutional Resource Showcase */}
        <div className="mt-20 rounded-2xl border border-border bg-surface-raised p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold text-text-primary">Explore AIIC Initiatives</h2>
          <p className="mx-auto mt-2 max-w-[45ch] text-sm text-text-secondary">
            Explore our open-source software repositories, research documents, and permanent club archive.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/archive"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-5 font-mono text-xs font-semibold text-on-accent hover:bg-accent-violet-bright transition-colors"
            >
              <Archive size={14} /> Club Archive
            </Link>
            <Link
              href="/events"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-5 font-mono text-xs font-medium text-text-primary hover:bg-surface transition-colors"
            >
              <Calendar size={14} /> Events &amp; Sessions
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

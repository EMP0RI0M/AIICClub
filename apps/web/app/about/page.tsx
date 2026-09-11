import { Nav, Footer } from "@/features/landing";
import Link from "next/link";
import { ArrowRight, Code2, Users, Cpu, ShieldCheck, Trophy, Sparkles, Archive, Calendar, Eye, Terminal, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "About AIIC — AI & Innovation Club",
  description: "Learn about the mission, governance, history, and technical domains of AIIC.",
};

export default function AboutPage() {
  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background text-text-primary">
      <Nav />
      <main className="mx-auto max-w-[1140px] px-5 py-14 sm:px-8 sm:py-20 space-y-16">
        {/* Header Hero with subtle atmospheric gradient */}
        <div className="relative aiic-glass-premium rounded-3xl p-7 sm:p-12 md:p-14 shadow-2xl overflow-hidden">
          <div className="max-w-3xl relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs font-semibold text-accent">
              <ShieldCheck size={14} />
              <span>AIIC Institutional Profile · Bal Bhawan School</span>
            </div>

            <h1 className="mt-5 text-[clamp(32px,5vw,56px)] font-bold tracking-tight text-white leading-[1.1]">
              AI &amp; Innovation Club
            </h1>

            <p className="mt-3 text-lg sm:text-xl font-medium text-accent font-mono">
              Engineering the frontier of student intelligence.
            </p>

            <p className="mt-5 text-sm sm:text-base leading-relaxed text-zinc-300">
              AIIC is an elite student-led laboratory established to foster hands-on artificial intelligence
              research, high-performance distributed systems, hardware innovation, and production software development.
            </p>
          </div>
        </div>

        {/* Mission & Vision */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="aiic-glass-default aiic-glass-interactive rounded-2xl p-7 sm:p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 border border-accent/30 text-accent">
                <Cpu size={20} />
              </div>
              <h2 className="text-xl font-bold text-white">Our Mission</h2>
            </div>
            <p className="text-sm leading-relaxed text-zinc-300">
              To empower student builders with the computing resources, peer network, mentorship,
              and collaborative tooling needed to create impactful real-world technology that advances
              the open-source ecosystem.
            </p>
          </div>

          <div className="aiic-glass-default aiic-glass-interactive rounded-2xl p-7 sm:p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info/15 border border-info/30 text-info">
                <Eye size={20} />
              </div>
              <h2 className="text-xl font-bold text-white">Our Vision</h2>
            </div>
            <p className="text-sm leading-relaxed text-zinc-300">
              To build a permanent, enduring center of technological excellence, maintaining an immutable
              archive of student achievements, research publications, curriculum capstones, and open-source contributions.
            </p>
          </div>
        </div>

        {/* Core Principles */}
        <div className="space-y-8">
          <div>
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">
              Engineering Standards
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Core Principles
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "1. Build in Public",
                desc: "All software and research projects are open-source and documented in the public archive.",
                icon: Terminal,
                tag: "Open Source",
              },
              {
                title: "2. Real Responsibility",
                desc: "Student members lead teams, manage compute infrastructure, and make architectural decisions.",
                icon: ShieldCheck,
                tag: "Governance",
              },
              {
                title: "3. Peer Mentorship",
                desc: "Senior members and project leads run technical workshops and code reviews for newcomers.",
                icon: Users,
                tag: "Collaboration",
              },
            ].map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="aiic-glass-default aiic-glass-interactive flex flex-col justify-between rounded-2xl p-6 shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-accent">
                        <Icon size={18} />
                      </div>
                      <span className="font-mono text-[10px] uppercase font-semibold text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.08]">
                        {p.tag}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">{p.title}</h3>
                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-zinc-300">
                      {p.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Institutional Resource Showcase */}
        <div className="aiic-glass-premium rounded-3xl p-8 sm:p-12 text-center shadow-2xl space-y-6">
          <div className="max-w-xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Explore AIIC Initiatives
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Explore our open-source software repositories, research documents, and permanent institutional archive.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href="/archive"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-5 font-mono text-xs font-bold text-on-accent hover:bg-accent-hover transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Archive size={14} /> Club Archive
            </Link>
            <Link
              href="/events"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 font-mono text-xs font-medium text-zinc-200 hover:text-white hover:border-white/20 transition-all cursor-pointer"
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

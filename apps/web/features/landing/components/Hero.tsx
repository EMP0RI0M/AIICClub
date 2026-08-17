"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Code2, Users, Cpu, Trophy, Calendar } from "lucide-react";
import { useAuthStore } from "@/features/auth";

export function Hero() {
  const { isAuthenticated } = useAuthStore();

  return (
    <section className="relative overflow-hidden px-5 pt-16 pb-20 sm:px-8 sm:pt-24 sm:pb-28">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-accent-soft/30 blur-[120px]" />

      <div className="mx-auto max-w-[1280px]">
        <div className="flex flex-col items-start lg:max-w-[840px]">
          {/* Badge */}
          <div className="landing-reveal inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface/80 px-3.5 py-1 text-[12px] font-medium text-text-secondary backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-accent" />
            <span>AI &amp; Innovation Club · Official Digital Platform</span>
          </div>

          {/* Headline */}
          <h1
            className="landing-reveal mt-6 max-w-full text-[clamp(42px,6.5vw,80px)] font-bold leading-[1.02] tracking-[-0.05em] text-text-primary"
            style={{ animationDelay: "60ms" }}
          >
            BUILD. <br />
            RESEARCH. <br />
            <span className="text-text-secondary">INNOVATE.</span>
          </h1>

          {/* Supporting Statement */}
          <p
            className="landing-reveal mt-7 max-w-[58ch] text-[16px] leading-relaxed text-text-secondary sm:text-[18px]"
            style={{ animationDelay: "120ms" }}
          >
            AIIC is a student-led organization dedicated to artificial intelligence,
            hardware experimentation, competitive problem solving, software engineering,
            and technological research.
          </p>

          {/* CTAs */}
          <div
            className="landing-reveal mt-9 flex flex-col items-stretch gap-3.5 sm:flex-row sm:items-center"
            style={{ animationDelay: "180ms" }}
          >
            <Link
              href="/about"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-6 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover shadow-sm"
            >
              Explore AIIC <ArrowRight size={15} />
            </Link>

            <Link
              href="/join"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface-raised px-6 text-sm font-medium text-text-primary transition-colors hover:bg-surface-overlay"
            >
              Apply to Join
            </Link>

            {isAuthenticated && (
              <Link
                href="/spaces"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-5 text-sm font-medium text-accent hover:bg-accent/20"
              >
                Enter Platform
              </Link>
            )}
          </div>
        </div>

        {/* Focus Areas Grid */}
        <div
          className="landing-reveal mt-20 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4"
          style={{ animationDelay: "240ms" }}
        >
          <div className="flex flex-col rounded-xl border border-border/80 bg-surface/50 p-5 backdrop-blur-sm">
            <Cpu className="h-5 w-5 text-accent" />
            <h3 className="mt-3 text-[14px] font-semibold text-text-primary">AI &amp; Robotics</h3>
            <p className="mt-1 text-[12px] text-text-muted">Machine learning architectures, hardware prototyping &amp; autonomous systems.</p>
          </div>

          <div className="flex flex-col rounded-xl border border-border/80 bg-surface/50 p-5 backdrop-blur-sm">
            <Code2 className="h-5 w-5 text-accent" />
            <h3 className="mt-3 text-[14px] font-semibold text-text-primary">Software Engineering</h3>
            <p className="mt-1 text-[12px] text-text-muted">Distributed systems, fullstack platforms, web technologies &amp; dev tooling.</p>
          </div>

          <div className="flex flex-col rounded-xl border border-border/80 bg-surface/50 p-5 backdrop-blur-sm">
            <Trophy className="h-5 w-5 text-accent" />
            <h3 className="mt-3 text-[14px] font-semibold text-text-primary">Competitions</h3>
            <p className="mt-1 text-[12px] text-text-muted">Hackathons, Olympiads, algorithmic contests &amp; technical challenges.</p>
          </div>

          <div className="flex flex-col rounded-xl border border-border/80 bg-surface/50 p-5 backdrop-blur-sm">
            <Users className="h-5 w-5 text-accent" />
            <h3 className="mt-3 text-[14px] font-semibold text-text-primary">Institutional Archive</h3>
            <p className="mt-1 text-[12px] text-text-muted">Permanent historical records of club projects, members, events &amp; papers.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

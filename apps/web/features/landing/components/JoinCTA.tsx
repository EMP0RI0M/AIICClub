"use client";

import Link from "next/link";
import { ArrowRight, Code2, Database, Sparkles } from "lucide-react";

export function JoinCTA() {
  return (
    <section className="border-t border-border-subtle px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-[1080px] rounded-2xl border border-border/80 bg-gradient-to-b from-surface-raised to-surface p-8 sm:p-12 text-center shadow-lg">
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
          Student Engineering &amp; Research
        </span>
        <h2 className="mt-4 text-[clamp(28px,4.5vw,48px)] font-bold tracking-tight text-text-primary">
          Open Technical Platform
        </h2>
        <p className="mx-auto mt-4 max-w-[55ch] text-[15px] leading-relaxed text-text-secondary">
          AIIC is the institutional student technical collective at Bal Bhawan School.
          Explore our open-source repositories, historical achievements, and student engineering prototypes.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <Code2 size={14} className="text-accent" /> Open-source engineering
          </span>
          <span className="flex items-center gap-1.5">
            <Database size={14} className="text-accent" /> Permanent institutional archive
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-accent" /> Autonomous research &amp; prototypes
          </span>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/archive"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-7 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover shadow-sm"
          >
            Explore Archive <ArrowRight size={15} />
          </Link>
          <Link
            href="/projects"
            className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-surface px-6 text-sm font-medium text-text-primary hover:bg-surface-overlay"
          >
            View Projects
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-surface px-6 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-overlay"
          >
            Member Login
          </Link>
        </div>
      </div>
    </section>
  );
}

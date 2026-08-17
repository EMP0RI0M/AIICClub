"use client";

import Link from "next/link";
import { ArrowRight, History, Layers, CalendarDays, Milestone } from "lucide-react";

export function ArchivePreview() {
  return (
    <section className="border-t border-border-subtle bg-surface/20 px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
              <History size={13} className="text-accent" />
              <span>Institutional Memory</span>
            </div>
            <h2 className="mt-4 text-[clamp(28px,4vw,44px)] font-bold tracking-tight text-text-primary">
              A permanent archive of every generation.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
              AIIC maintains an immutable record of past initiatives, founding teams,
              technical papers, contest placements, and club governance across every academic year.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/archive"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-5 text-xs font-semibold text-on-accent transition-colors hover:bg-accent-hover"
              >
                Explore Archive <ArrowRight size={13} />
              </Link>
              <Link
                href="/people"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-5 text-xs font-medium text-text-primary hover:bg-surface-raised"
              >
                Member Directory
              </Link>
            </div>
          </div>

          {/* Visual Timeline Sample */}
          <div className="rounded-xl border border-border/80 bg-surface-raised p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-text-muted">
                Timeline Preview · Current Session
              </span>
              <span className="font-mono text-[11px] text-accent">Active Term</span>
            </div>

            <div className="mt-6 flex flex-col gap-6">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-on-accent text-xs font-bold">
                    1
                  </span>
                  <span className="h-full w-px bg-border my-1" />
                </div>
                <div className="pb-4">
                  <span className="font-mono text-[11px] text-text-muted">Term Kickoff</span>
                  <h4 className="text-sm font-semibold text-text-primary">AIIC Digital Platform Launched</h4>
                  <p className="mt-1 text-xs text-text-muted">
                    Full deployment of collaborative spaces, voice channels, and permanent club archive.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-text-muted text-xs font-bold">
                    2
                  </span>
                  <span className="h-full w-px bg-border my-1" />
                </div>
                <div className="pb-4">
                  <span className="font-mono text-[11px] text-text-muted">Team Formation</span>
                  <h4 className="text-sm font-semibold text-text-primary">Core Teams &amp; Labs Active</h4>
                  <p className="mt-1 text-xs text-text-muted">
                    Student cohorts actively collaborating across AI engineering, systems, and hardware labs.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-text-muted text-xs font-bold">
                    3
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[11px] text-text-muted">Upcoming</span>
                  <h4 className="text-sm font-semibold text-text-primary">Project Showcase &amp; Hackathon</h4>
                  <p className="mt-1 text-xs text-text-muted">
                    First multi-team sprint presentation and open hardware demo sessions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

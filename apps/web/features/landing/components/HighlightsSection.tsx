"use client";

import Link from "next/link";
import { ArrowRight, FolderGit2, Calendar, Trophy, Sparkles } from "lucide-react";
import type { AIICProject, AIICEvent, AIICAchievement } from "@/shared/lib/aiic-types";

export function HighlightsSection({
  projects = [],
  events = [],
  achievements = [],
}: {
  projects?: AIICProject[];
  events?: AIICEvent[];
  achievements?: AIICAchievement[];
}) {
  return (
    <section className="border-t border-border-subtle px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-[1280px]">
        {/* Section Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">
              Active Showcase
            </p>
            <h2 className="mt-2 text-[clamp(26px,3.5vw,40px)] font-bold tracking-tight text-text-primary">
              Projects, Events &amp; Honors
            </h2>
          </div>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
          >
            View all projects &amp; events <ArrowRight size={13} />
          </Link>
        </div>

        {/* 3-Column Highlights Grid */}
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {/* Projects Column */}
          <div className="flex flex-col rounded-xl border border-border/80 bg-surface-raised p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <FolderGit2 size={16} className="text-accent" />
                <h3 className="text-[14px] font-semibold text-text-primary">Featured Projects</h3>
              </div>
              <Link href="/projects" className="text-xs text-text-muted hover:text-text-primary">
                Browse →
              </Link>
            </div>

            <div className="mt-4 flex flex-1 flex-col gap-3">
              {projects.length > 0 ? (
                projects.slice(0, 3).map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.slug}`}
                    className="group rounded-lg border border-border/40 bg-surface/50 p-3.5 transition-colors hover:border-border-active hover:bg-surface-overlay"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-text-primary group-hover:text-accent">
                        {p.title}
                      </span>
                      <span className="font-mono text-[10px] uppercase rounded px-1.5 py-0.5 border border-border text-text-muted">
                        {p.category}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] text-text-muted line-clamp-2">{p.summary}</p>
                  </Link>
                ))
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-text-muted">
                  <p className="text-xs">No public projects published yet.</p>
                  <p className="mt-1 text-[11px] text-text-faint">Check back soon as student teams publish releases.</p>
                </div>
              )}
            </div>
          </div>

          {/* Events Column */}
          <div className="flex flex-col rounded-xl border border-border/80 bg-surface-raised p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-accent" />
                <h3 className="text-[14px] font-semibold text-text-primary">Upcoming Events</h3>
              </div>
              <Link href="/events" className="text-xs text-text-muted hover:text-text-primary">
                Schedule →
              </Link>
            </div>

            <div className="mt-4 flex flex-1 flex-col gap-3">
              {events.length > 0 ? (
                events.slice(0, 3).map((e) => (
                  <Link
                    key={e.id}
                    href={`/events/${e.slug}`}
                    className="group rounded-lg border border-border/40 bg-surface/50 p-3.5 transition-colors hover:border-border-active hover:bg-surface-overlay"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-text-primary group-hover:text-accent">
                        {e.title}
                      </span>
                      <span className="font-mono text-[10px] rounded px-1.5 py-0.5 bg-live/10 text-live border border-live/30">
                        {e.type}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-text-secondary">{e.location}</p>
                  </Link>
                ))
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-text-muted">
                  <p className="text-xs">Upcoming events will appear here.</p>
                  <p className="mt-1 text-[11px] text-text-faint">Workshops, talks, and hackathons are scheduled each term.</p>
                </div>
              )}
            </div>
          </div>

          {/* Achievements Column */}
          <div className="flex flex-col rounded-xl border border-border/80 bg-surface-raised p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-accent" />
                <h3 className="text-[14px] font-semibold text-text-primary">Achievements</h3>
              </div>
              <Link href="/achievements" className="text-xs text-text-muted hover:text-text-primary">
                View all →
              </Link>
            </div>

            <div className="mt-4 flex flex-1 flex-col gap-3">
              {achievements.length > 0 ? (
                achievements.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className="rounded-lg border border-border/40 bg-surface/50 p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-text-primary">{a.title}</span>
                      {a.rankResult && (
                        <span className="font-mono text-[10px] uppercase rounded px-1.5 py-0.5 bg-accent-soft text-accent">
                          {a.rankResult}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-text-muted">Awarded to {a.recipient} · {a.organization}</p>
                  </div>
                ))
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-text-muted">
                  <p className="text-xs">Achievements &amp; awards will be logged here.</p>
                  <p className="mt-1 text-[11px] text-text-faint">Verified contest results, research honors, and club recognitions.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

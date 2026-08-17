"use client";

import Link from "next/link";
import { ArrowRight, Code2, Users, Calendar, Trophy, Archive, Sparkles, BookOpen, Layers } from "lucide-react";

export function WhatWeDo() {
  const areas = [
    {
      icon: Code2,
      title: "Projects & Engineering",
      desc: "Student teams build functional software, hardware devices, and robotics prototypes from concept to deployment.",
      link: "/projects",
    },
    {
      icon: Sparkles,
      title: "Applied AI Research",
      desc: "Experimenting with neural network models, computer vision, natural language agents, and data analysis.",
      link: "/projects",
    },
    {
      icon: Calendar,
      title: "Workshops & Tech Talks",
      desc: "Hands-on masterclasses, guest lectures from engineers, and skill-building bootcamps for club members.",
      link: "/events",
    },
    {
      icon: Trophy,
      title: "Hackathons & Contests",
      desc: "Representing the organization in national hackathons, coding contests, and innovation exhibitions.",
      link: "/achievements",
    },
    {
      icon: Archive,
      title: "Permanent Institutional Memory",
      desc: "Every milestone, election, project, and document is preserved in the official AIIC archive for posterity.",
      link: "/archive",
    },
    {
      icon: Users,
      title: "Peer Collaboration Platform",
      desc: "Our private digital hub for team channels, voice syncs, technical documentation, and sprint boards.",
      link: "/join",
    },
  ];

  return (
    <section className="border-t border-border-subtle bg-surface/30 px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-[1280px]">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">
            Core Pillars
          </p>
          <h2 className="mt-3 text-[clamp(28px,4vw,44px)] font-bold tracking-tight text-text-primary">
            What we do at AIIC.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
            AIIC provides the structure, mentorship, and tooling for passionate builders
            to collaborate and ship ambitious technology.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map(({ icon: Icon, title, desc, link }) => (
            <Link
              key={title}
              href={link}
              className="group flex flex-col justify-between rounded-xl border border-border/80 bg-surface-raised p-6 transition-all hover:border-border-active hover:bg-surface-overlay"
            >
              <div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Icon size={18} />
                </span>
                <h3 className="mt-4 text-[16px] font-semibold text-text-primary group-hover:text-accent transition-colors">
                  {title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-text-muted">
                  {desc}
                </p>
              </div>
              <span className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-text-faint group-hover:text-text-primary">
                Learn more <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

export function ServicesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const cards = [
    {
      tag: "Strategy & Engineering",
      title: "Research & Insight",
      description:
        "We dig deep into data pipelines, computational logic, and applied artificial intelligence to surface insights that drive tangible software builds.",
      videoUrl:
        "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4",
      href: "/projects",
    },
    {
      tag: "Craft & Code",
      title: "Design & Execution",
      description:
        "From algorithm conception to GitHub pull request review, our cohorts obsess over architectural details to deliver reliable open-source systems.",
      videoUrl:
        "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4",
      href: "/archive",
    },
  ];

  return (
    <section ref={ref} className="relative overflow-hidden bg-black px-4 py-16 sm:px-6 sm:py-24 md:py-36">
      {/* Subtle radial gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.02)_0%,_transparent_60%)]" />

      <div className="mx-auto max-w-6xl">
        {/* Header Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="mb-8 sm:mb-12 flex items-end justify-between"
        >
          <h2 className="font-serif-instrument text-[clamp(2.2rem,6vw,4rem)] tracking-tight text-white">
            What we do
          </h2>
          <span className="hidden font-mono text-xs uppercase tracking-widest text-white/50 md:inline-block">
            Disciplines · AI &amp; Innovation Club
          </span>
        </motion.div>

        {/* Two-Card Grid (Stacked single column on mobile) */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {cards.map((card, idx) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.7, delay: idx * 0.12 }}
              className="group liquid-glass overflow-hidden rounded-2xl sm:rounded-3xl flex flex-col"
            >
              {/* Card Video Area */}
              <div className="relative aspect-video sm:aspect-[16/10] w-full overflow-hidden shrink-0">
                <video
                  muted
                  autoPlay
                  loop
                  playsInline
                  preload="auto"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  src={card.videoUrl}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>

              {/* Card Body */}
              <div className="p-5 sm:p-6 md:p-8 flex flex-col flex-1 justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-white/50">
                      {card.tag}
                    </span>
                    <Link
                      href={card.href}
                      aria-label={card.title}
                      className="liquid-glass flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-white/80 transition-all hover:bg-white/10 hover:text-white"
                    >
                      <ArrowUpRight size={16} />
                    </Link>
                  </div>

                  <h3 className="mt-3 text-lg font-bold tracking-tight text-white sm:text-xl md:text-2xl">
                    {card.title}
                  </h3>

                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-white/70">
                    {card.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

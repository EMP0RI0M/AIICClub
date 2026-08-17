"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";

export function FeaturedVideoSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section ref={ref} className="overflow-hidden bg-black px-4 pt-4 pb-16 sm:px-6 sm:pt-8 sm:pb-24 md:pb-32">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          className="relative aspect-[4/5] sm:aspect-[16/10] md:aspect-video w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10"
        >
          {/* Featured Video */}
          <video
            muted
            autoPlay
            loop
            playsInline
            preload="auto"
            className="h-full w-full object-cover object-center"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260402_054547_9875cfc5-155a-4229-8ec8-b7ba7125cbf8.mp4"
          />

          {/* Gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

          {/* Bottom overlay content */}
          <div className="absolute bottom-0 left-0 right-0 flex flex-col justify-end gap-4 p-4 sm:p-6 md:flex-row md:items-end md:justify-between md:p-10">
            {/* Left Glass Card */}
            <div className="liquid-glass w-full max-w-full md:max-w-md rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8">
              <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-white/60 sm:text-xs">
                Our Approach · Capability Pipeline
              </span>
              <p className="text-xs leading-relaxed text-white sm:text-sm md:text-base">
                We believe in the power of curiosity-driven engineering. Every project starts with
                a computational question, and every solution delivers an open-source tool, dataset, or model.
              </p>
            </div>

            {/* Right Action Button */}
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full md:w-auto">
              <Link
                href="/projects"
                className="liquid-glass flex min-h-[44px] w-full items-center justify-center rounded-full px-6 py-2.5 text-xs font-medium text-white transition-colors hover:bg-white/10 sm:text-sm md:inline-block md:w-auto md:px-8 md:py-3.5"
              >
                Explore Projects
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export function PhilosophySection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section ref={ref} className="overflow-hidden bg-black px-4 py-16 sm:px-6 sm:py-24 md:py-36">
      <div className="mx-auto max-w-6xl">
        {/* Responsive Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 25 }}
          transition={{ duration: 0.7 }}
          className="mb-8 sm:mb-12 md:mb-20 font-serif-instrument text-[clamp(2.5rem,8vw,5.5rem)] leading-tight tracking-tight text-white whitespace-normal"
        >
          Innovation <em className="italic text-white/40 font-normal">x</em> Vision
        </motion.h2>

        {/* Two-Column Grid -> Stacked on Mobile */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 items-center">
          {/* Left Video */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.7 }}
            className="aspect-[4/3] w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10"
          >
            <video
              muted
              autoPlay
              loop
              playsInline
              preload="auto"
              className="h-full w-full object-cover object-center"
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4"
            />
          </motion.div>

          {/* Right Text Blocks */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            transition={{ duration: 0.7 }}
            className="flex flex-col justify-between space-y-6 sm:space-y-8"
          >
            {/* Block 1 */}
            <div>
              <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-white/50 sm:text-xs">
                Choose your space · Accountability
              </span>
              <p className="text-xs sm:text-sm md:text-base leading-relaxed text-white/70">
                Every meaningful breakthrough begins at the intersection of disciplined strategy and
                remarkable technical curiosity. AIIC operates at that crossroads, turning raw ideas
                into tangible software that solves problems and educates minds.
              </p>
            </div>

            <div className="h-px w-full bg-white/10" />

            {/* Block 2 */}
            <div>
              <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-white/50 sm:text-xs">
                Shape the future · Learn → Build → Ship
              </span>
              <p className="text-xs sm:text-sm md:text-base leading-relaxed text-white/70">
                We believe that the best engineering emerges when curiosity meets commitment.
                Through our 4-Stage Capability Pipeline, students master Python, data extraction,
                computer vision, and neural network foundations before high school graduation.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

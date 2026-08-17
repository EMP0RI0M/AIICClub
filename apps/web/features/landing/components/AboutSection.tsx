"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export function AboutSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-black px-4 py-16 sm:px-6 sm:py-24 md:py-36"
    >
      {/* Subtle radial gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.03)_0%,_transparent_70%)]" />

      <div className="relative mx-auto max-w-5xl text-center">
        {/* Label */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
          transition={{ duration: 0.5 }}
          className="text-xs font-mono uppercase tracking-widest text-white/50 sm:text-sm"
        >
          About AIIC · Bal Bhawan School
        </motion.p>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 25 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-4 font-serif-instrument text-[clamp(2.2rem,7vw,4.5rem)] leading-[1.15] tracking-tight text-white px-2 whitespace-normal sm:mt-6"
        >
          Pioneering then <em className="italic text-white/60 font-normal">ideas</em> for{" "}
          <em className="italic text-white/60 font-normal block sm:inline">
            minds that then create, build, and inspire.
          </em>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-xs sm:text-sm md:text-base leading-relaxed text-white/70 px-2"
        >
          AIIC exists to transition students from passive technology consumers into disciplined
          software creators, data engineers, and AI system architects through rigorous open-source
          capstones and peer review.
        </motion.p>
      </div>
    </section>
  );
}

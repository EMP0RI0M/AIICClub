"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@corvus/ui";

const DEFAULT_ITEMS = [
  "ARTIFICIAL INTELLIGENCE",
  "APPLIED RESEARCH",
  "AGENTIC SYSTEMS",
  "SOFTWARE ARCHITECTURE",
  "DISTRIBUTED COMPUTING",
  "OPEN SOURCE",
  "DATA PIPELINES",
  "INNOVATION LAB",
];

interface TechMarqueeProps {
  items?: string[];
  speed?: number;
  className?: string;
}

export function TechMarquee({
  items = DEFAULT_ITEMS,
  speed = 35,
  className,
}: TechMarqueeProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div className={cn("overflow-hidden py-3 border-y border-white/[0.06] bg-black/40", className)}>
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-zinc-400">
          {items.map((item, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className="text-accent">◈</span>
              <span>{item}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  const repeated = [...items, ...items, ...items];

  return (
    <div className={cn("group relative flex overflow-hidden py-3.5 border-y border-white/[0.06] bg-[#050505]/60 backdrop-blur-md", className)}>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-black to-transparent" />

      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: speed,
            ease: "linear",
          },
        }}
        className="flex shrink-0 items-center gap-8 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-400"
      >
        {repeated.map((item, index) => (
          <span key={index} className="flex items-center gap-3">
            <span className="text-accent text-[8px]">◈</span>
            <span className="hover:text-white transition-colors">{item}</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@corvus/ui";

const DEFAULT_CONCEPTS = ["THINK", "BUILD", "RESEARCH", "INVENT", "DEPLOY"];

export function MorphingText({
  texts = DEFAULT_CONCEPTS,
  interval = 3200,
  className,
}: {
  texts?: string[];
  interval?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion || texts.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % texts.length);
    }, interval);
    return () => clearInterval(timer);
  }, [texts.length, interval, shouldReduceMotion]);

  if (shouldReduceMotion) {
    return <span className={cn("text-accent font-bold", className)}>{texts[0]}</span>;
  }

  return (
    <span className={cn("relative inline-flex items-center justify-center min-w-[4ch] font-mono font-bold tracking-tight text-accent", className)}>
      <AnimatePresence mode="wait">
        <motion.span
          key={texts[index]}
          initial={{ opacity: 0, y: 14, filter: "blur(8px)", scale: 0.95 }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
          exit={{ opacity: 0, y: -14, filter: "blur(8px)", scale: 1.05 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="inline-block drop-shadow-[0_0_16px_rgba(232,163,61,0.35)]"
        >
          {texts[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

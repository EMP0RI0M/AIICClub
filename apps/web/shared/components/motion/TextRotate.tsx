"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@corvus/ui";

interface TextRotateProps {
  words: string[];
  interval?: number;
  className?: string;
  wordClassName?: string;
}

export function TextRotate({
  words,
  interval = 3600,
  className,
  wordClassName,
}: TextRotateProps) {
  const [index, setIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion || words.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, interval);
    return () => clearInterval(timer);
  }, [words.length, interval, shouldReduceMotion]);

  if (shouldReduceMotion) {
    return <span className={cn("text-accent font-semibold", className)}>{words[0]}</span>;
  }

  return (
    <span className={cn("relative inline-flex items-center overflow-hidden py-0.5", className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={words[index]}
          initial={{ y: 22, opacity: 0, filter: "blur(6px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: -22, opacity: 0, filter: "blur(6px)" }}
          transition={{
            duration: 0.45,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
          }}
          className={cn("inline-block text-accent font-semibold tracking-tight", wordClassName)}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

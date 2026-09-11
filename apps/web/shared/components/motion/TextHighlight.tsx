"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@corvus/ui";

interface TextHighlightProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function TextHighlight({
  children,
  className,
  delay = 0.2,
}: TextHighlightProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <span className={cn("text-accent font-semibold", className)}>{children}</span>;
  }

  return (
    <span className={cn("relative inline-block px-1", className)}>
      <motion.span
        initial={{ width: 0 }}
        whileInView={{ width: "100%" }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="absolute inset-y-0 left-0 -z-10 rounded-sm bg-accent/15 border-b border-accent/40"
      />
      <span className="relative z-10 text-white font-medium">{children}</span>
    </span>
  );
}

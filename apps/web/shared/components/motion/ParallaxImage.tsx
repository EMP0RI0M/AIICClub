"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { cn } from "@corvus/ui";

interface ParallaxImageProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
  alt: string;
  offset?: number;
  className?: string;
  imgClassName?: string;
}

export function ParallaxImage({
  src,
  alt,
  offset = 20,
  className,
  imgClassName,
  ...props
}: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [-offset, offset]);

  if (shouldReduceMotion) {
    return (
      <div ref={ref} className={cn("overflow-hidden", className)} {...props}>
        <img src={src} alt={alt} className={cn("h-full w-full object-cover", imgClassName)} />
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
      <motion.img
        src={src}
        alt={alt}
        style={{ y, scale: 1.08 }}
        transition={{ ease: "linear" }}
        className={cn("h-full w-full object-cover will-change-transform", imgClassName)}
      />
    </div>
  );
}

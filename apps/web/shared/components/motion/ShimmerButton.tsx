"use client";

import React from "react";
import { cn } from "@corvus/ui";

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  shimmerColor?: string;
}

export function ShimmerButton({
  children,
  className,
  shimmerColor = "rgba(232, 163, 61, 0.4)",
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      className={cn(
        "group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-black px-6 py-3 font-mono text-xs font-semibold text-white transition-all duration-300 border border-white/15 hover:border-accent/50 hover:shadow-[0_0_24px_rgba(232,163,61,0.25)] active:scale-[0.98]",
        className
      )}
      {...props}
    >
      {/* Moving Shimmer Sweep */}
      <span
        className="pointer-events-none absolute -inset-full top-0 block -rotate-45 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
        style={{
          backgroundImage: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 40%, ${shimmerColor} 50%, rgba(255,255,255,0.08) 60%, transparent 100%)`,
        }}
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}

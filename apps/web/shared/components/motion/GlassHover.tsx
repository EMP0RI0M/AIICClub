"use client";

import React, { useRef, useState } from "react";
import { cn } from "@corvus/ui";

interface GlassHoverCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  spotlightSize?: number;
}

export function GlassHoverCard({
  children,
  className,
  glowColor = "rgba(232, 163, 61, 0.09)",
  spotlightSize = 350,
  ...props
}: GlassHoverCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) return;

    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("aiic-dark-glass relative overflow-hidden transition-all duration-300", className)}
      {...props}
    >
      {/* Radial Pointer Spotlight */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: position
            ? `radial-gradient(${spotlightSize}px circle at ${position.x}px ${position.y}px, ${glowColor}, transparent 80%)`
            : "none",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

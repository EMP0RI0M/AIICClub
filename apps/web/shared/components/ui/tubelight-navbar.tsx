"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@corvus/ui";
import Image from "next/image";
import { usePathname } from "next/navigation";

export interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
  onClick?: () => void;
}

export interface NavBarProps {
  items: NavItem[];
  className?: string;
}

export function NavBar({ items, className }: NavBarProps) {
  const pathname = usePathname();

  const isActive = (url: string) => {
    if (url === "/") {
      return pathname === "/" || pathname === "";
    }

    return pathname === url || pathname.startsWith(`${url}/`);
  };

  const midIndex = Math.ceil(items.length / 2);
  const leftItems = items.slice(0, midIndex);
  const rightItems = items.slice(midIndex);

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.url);

    return (
      <Link
        key={item.name + item.url}
        href={item.url}
        onClick={(event) => {
          if (item.onClick) {
            event.preventDefault();
            item.onClick();
          }
        }}
        aria-label={item.name}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex shrink-0 items-center justify-center",
          "rounded-full px-2.5 sm:px-3 md:px-4",
          "py-2.5 md:py-2",
          "text-sm font-medium",
          "transition-all duration-300",
          "min-h-[44px] min-w-[44px]",
          "text-white/60 hover:text-white",
          active && "text-white"
        )}
      >
        {/* Desktop label */}
        <span className="hidden md:inline">{item.name}</span>

        {/* Mobile icon */}
        <span className="flex md:hidden">
          <Icon size={19} strokeWidth={2} aria-hidden="true" />
        </span>

        {active && (
          <motion.div
            layoutId="aiic-navbar-active"
            className="absolute inset-0 -z-10 rounded-full bg-white/[0.08]"
            initial={false}
            transition={{
              type: "spring",
              stiffness: 320,
              damping: 28,
            }}
          >
            {/* Desktop top indicator */}
            <div className="absolute -top-[3px] left-1/2 hidden h-[2px] w-7 -translate-x-1/2 rounded-full bg-white md:block" />

            {/* Subtle glow */}
            <div className="absolute inset-0 rounded-full bg-white/[0.03] blur-md" />
          </motion.div>
        )}
      </Link>
    );
  };

  return (
    <nav
      aria-label="AIIC primary navigation"
      className={cn(
        // Global positioning
        "fixed left-1/2 z-50 -translate-x-1/2",

        // Mobile = bottom
        "bottom-[calc(1rem+env(safe-area-inset-bottom))]",

        // Desktop = top
        "md:top-5 md:bottom-auto",

        // Container
        "pointer-events-none w-full px-3 md:w-auto md:px-0",

        className
      )}
    >
      <div
        className={cn(
          "pointer-events-auto mx-auto flex items-center",

          // Mobile sizing
          "w-fit max-w-[calc(100vw-24px)]",

          // Desktop sizing
          "md:max-w-[1200px]",

          // Glass
          "rounded-full",
          "border border-white/[0.10]",
          "bg-black/45",
          "backdrop-blur-2xl",
          "shadow-2xl shadow-black/30",

          // Spacing
          "gap-0.5 p-1 md:gap-1.5 md:p-1.5",

          // Prevent mobile overflow
          "overflow-x-auto",
          "[scrollbar-width:none]",
          "[&::-webkit-scrollbar]:hidden"
        )}
      >
        {/* Desktop left navigation */}
        <div className="flex items-center">{leftItems.map(renderItem)}</div>

        {/* AIIC Brand — desktop only */}
        <div className="hidden shrink-0 items-center px-3 md:flex">
          <Link
            href="/"
            aria-label="AIIC Home"
            className="group flex items-center gap-2"
          >
            <div className="relative flex h-8 w-8 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-white/[0.04] blur-md transition-all duration-500 group-hover:bg-white/[0.10]" />

              <Image
                src="/aiic-logo-small.png"
                alt="AIIC"
                width={28}
                height={28}
                className="relative h-7 w-7 object-contain rounded-full border border-white/20"
              />
            </div>

            <div className="flex flex-col leading-none text-left">
              <span className="text-[11px] font-bold tracking-[0.18em] text-white">
                AIIC
              </span>

              <span className="mt-1 text-[7px] tracking-[0.12em] text-white/40">
                AI &amp; INNOVATION CLUB
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop right navigation */}
        <div className="flex items-center">{rightItems.map(renderItem)}</div>
      </div>
    </nav>
  );
}

export default NavBar;

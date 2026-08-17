"use client";

import { cn } from "@corvus/ui";
import { MessageSquare, Plus, Settings, Home, Shield } from "lucide-react";
import { ItemLink } from "./ItemLink";
import type { SpaceSummary } from "./types";

/**
 * 56px Nav Rail (Premium Glass & Ambient Depth).
 */
export function NavRail({
  spaces,
  activeSpaceId,
  homeActive,
  dmsActive,
  dmsUnread,
  canAccessAdminBoard,
  onOpenHome,
  onSelectSpace,
  onOpenDMs,
  onAddSpace,
  onOpenSettings,
  homeHref,
  dmsHref,
  spaceHref,
}: {
  spaces: SpaceSummary[];
  activeSpaceId?: string;
  homeActive?: boolean;
  dmsActive?: boolean;
  dmsUnread?: boolean;
  canAccessAdminBoard?: boolean;
  onOpenHome?: () => void;
  onSelectSpace?: (id: string) => void;
  onOpenDMs?: () => void;
  onAddSpace?: () => void;
  onOpenSettings?: () => void;
  /** Real hrefs (routed shell) — items render as anchors when provided. */
  homeHref?: string;
  dmsHref?: string;
  spaceHref?: (id: string) => string;
}) {

  return (
    <nav
      aria-label="Spaces"
      className="flex h-full w-[64px] sm:w-[68px] md:w-[60px] shrink-0 flex-col items-center bg-[#0d1017]/90 border-r border-white/[0.06] py-3.5 backdrop-blur-xl z-30 shadow-[inset_-1px_0_rgba(255,255,255,0.04)]"
    >
      <ItemLink
        href={homeHref}
        onPress={onOpenHome}
        label="Home"
        active={homeActive}
        className={cn(
          "relative mb-1 flex h-10 w-10 sm:h-11 sm:w-11 md:h-10 md:w-10 items-center justify-center rounded-[14px] transition-all duration-200 active:scale-95",
          homeActive
            ? "border border-accent/40 bg-accent/20 text-accent shadow-[0_0_16px_rgba(var(--c-accent-rgb,138,92,246),0.25)] after:absolute after:left-[-8px] after:h-5 after:w-1 after:rounded-full after:bg-accent"
            : "border border-transparent text-text-muted hover:border-white/[0.06] hover:bg-white/[0.05] hover:text-text-primary"
        )}
      >
        <Home size={18} />
      </ItemLink>

      <div className="my-2 h-px w-6 bg-white/[0.08]" />

      <div className="flex flex-1 flex-col items-center gap-2.5 overflow-x-hidden overflow-y-auto scrollbar-none py-1">
        {spaces.map((space) => {
          const active = space.id === activeSpaceId && !dmsActive && !homeActive;
          return (
            <ItemLink
              key={space.id}
              href={spaceHref?.(space.id)}
              onPress={() => onSelectSpace?.(space.id)}
              label={space.name}
              current={active}
              active={active}
              className={cn(
                "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-[13.5px] font-bold transition-all duration-200 active:scale-95",
                active
                  ? "border border-accent/40 bg-accent/25 text-accent shadow-[0_0_16px_rgba(var(--c-accent-rgb,138,92,246),0.25)] after:absolute after:left-[-8px] after:h-5 after:w-1 after:rounded-full after:bg-accent"
                  : "border border-white/[0.06] bg-white/[0.03] text-text-secondary hover:border-white/[0.12] hover:bg-white/[0.08] hover:text-text-primary"
              )}
            >
              {space.icon ? (
                <img src={space.icon} alt="" className="h-full w-full rounded-[inherit] object-cover" />
              ) : (
                <span aria-hidden>{space.name[0]?.toUpperCase()}</span>
              )}
              {space.unread && !active && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent ring-2 ring-[#0d1017]" />
              )}
            </ItemLink>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col items-center gap-2 pt-2 border-t border-white/[0.06]">
        {canAccessAdminBoard && (
          <RailIcon label="Organization Admin Board" href="/admin">
            <Shield size={18} className="text-accent" />
          </RailIcon>
        )}
        {onAddSpace && (
          <RailIcon label="Add a space" onClick={onAddSpace}>
            <Plus size={18} />
          </RailIcon>
        )}
        <RailIcon label="Settings" onClick={onOpenSettings}>
          <Settings size={18} />
        </RailIcon>
      </div>

    </nav>
  );
}

function RailIcon({
  label,
  active,
  unread,
  href,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  unread?: boolean;
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <ItemLink
      href={href}
      onPress={onClick}
      label={label}
      active={active}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-[12px] transition-all active:scale-95",
        active
          ? "border border-accent/40 bg-accent/20 text-accent"
          : "text-text-muted hover:bg-white/[0.06] hover:text-text-primary"
      )}
    >
      {children}
      {unread && (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent ring-2 ring-[#0d1017]" />
      )}
    </ItemLink>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth";
import { cn } from "@corvus/ui";
import { User, Settings, LogOut, MessageSquare } from "lucide-react";

export function ProfileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const handleSignOut = () => {
    logout();
    router.push("/");
    router.refresh();
  };

  const navLinks = [
    { label: "Profile", href: "/profile", icon: User },
    { label: "Settings", href: "/profile/settings", icon: Settings },
  ];

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-lg px-3.5 font-mono text-xs font-semibold transition-all",
                isActive
                  ? "bg-surface-raised border border-accent/40 text-accent shadow-sm"
                  : "text-text-secondary hover:bg-surface-raised hover:text-text-primary border border-transparent"
              )}
            >
              <Icon size={14} className={isActive ? "text-accent" : "text-text-muted"} />
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <Link
          href="/spaces"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 font-mono text-xs text-text-secondary hover:border-border-active hover:text-text-primary transition-colors"
        >
          <MessageSquare size={13} className="text-text-muted" />
          <span className="hidden sm:inline">Member</span> Hub
        </Link>

        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 font-mono text-xs text-text-muted hover:border-danger/40 hover:text-danger transition-colors"
        >
          <LogOut size={13} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

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
    <div className="mb-6 sm:mb-8 border-b border-white/[0.08] pb-4">
      {/* ─── Mobile 2-Row Grid Navigation (< sm) ─── */}
      <div className="grid grid-cols-2 gap-2.5 sm:hidden">
        {/* Row 1: Profile | Settings */}
        <Link
          href="/profile"
          className={cn(
            "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 font-mono text-xs font-semibold transition-all shadow-sm",
            pathname === "/profile"
              ? "bg-accent/15 border border-accent/40 text-accent"
              : "bg-[#0a0a0a]/80 border border-white/[0.08] text-zinc-300 hover:text-white"
          )}
        >
          <User size={14} className={pathname === "/profile" ? "text-accent" : "text-zinc-500"} />
          <span>Profile</span>
        </Link>
        <Link
          href="/profile/settings"
          className={cn(
            "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 font-mono text-xs font-semibold transition-all shadow-sm",
            pathname === "/profile/settings"
              ? "bg-accent/15 border border-accent/40 text-accent"
              : "bg-[#0a0a0a]/80 border border-white/[0.08] text-zinc-300 hover:text-white"
          )}
        >
          <Settings size={14} className={pathname === "/profile/settings" ? "text-accent" : "text-zinc-500"} />
          <span>Settings</span>
        </Link>

        {/* Row 2: Hub | Sign Out */}
        <Link
          href="/spaces"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#0a0a0a]/80 px-3 font-mono text-xs font-semibold text-zinc-300 hover:border-white/20 hover:text-white transition-colors"
        >
          <MessageSquare size={13} className="text-zinc-400" />
          <span>Hub</span>
        </Link>

        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#0a0a0a]/80 px-3 font-mono text-xs font-semibold text-zinc-400 hover:border-danger/40 hover:text-danger transition-colors cursor-pointer"
        >
          <LogOut size={13} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* ─── Desktop Horizontal Navigation (sm+) ─── */}
      <div className="hidden sm:flex items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex h-9.5 items-center gap-2 rounded-xl px-4 font-mono text-xs font-semibold transition-all",
                  isActive
                    ? "bg-accent/15 border border-accent/40 text-accent shadow-sm"
                    : "bg-[#0a0a0a]/60 border border-white/[0.06] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                )}
              >
                <Icon size={14} className={isActive ? "text-accent" : "text-zinc-500"} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/spaces"
            className="inline-flex h-9.5 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3.5 font-mono text-xs font-medium text-zinc-300 hover:border-white/20 hover:text-white transition-colors"
          >
            <MessageSquare size={13} className="text-zinc-400" />
            <span>Member Hub</span>
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex h-9.5 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3.5 font-mono text-xs font-medium text-zinc-400 hover:border-danger/40 hover:text-danger transition-colors cursor-pointer"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

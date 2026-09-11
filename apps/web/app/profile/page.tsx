"use client";

import Link from "next/link";
import { useAuthStore } from "@/features/auth";
import { Avatar } from "@/shared/components/ui";
import { Shield, Mail, User as UserIcon, Globe, ExternalLink } from "lucide-react";
import { cn } from "@corvus/ui";
import { FullUserSettings } from "@/features/profile/components/FullUserSettings";

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  online: { label: "Online", dot: "bg-status-online shadow-[0_0_8px_rgba(61,220,132,0.4)]" },
  idle: { label: "Idle", dot: "bg-status-idle shadow-[0_0_8px_rgba(245,166,35,0.4)]" },
  dnd: { label: "Do not disturb", dot: "bg-status-dnd shadow-[0_0_8px_rgba(224,82,82,0.4)]" },
  invisible: { label: "Invisible", dot: "bg-zinc-500" },
};

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#080808] p-8 sm:p-12 text-center backdrop-blur-xl">
        <UserIcon className="mx-auto h-12 w-12 text-zinc-500" />
        <h1 className="mt-4 text-xl font-bold text-white tracking-tight">Member Profile &amp; Settings</h1>
        <p className="mx-auto mt-2 max-w-[45ch] text-xs sm:text-sm text-zinc-400">
          Please sign in with your authorized AIIC credentials to view your profile and manage all user settings.
        </p>
        <div className="mt-6">
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-6 font-mono text-xs font-semibold text-on-accent hover:bg-accent-violet-bright transition-colors"
          >
            Sign In to AIIC
          </Link>
        </div>
      </div>
    );
  }

  const currentStatus = STATUS_CONFIG[user.status] || STATUS_CONFIG.online;
  const roleDisplay = (user as any).roleName || ((user as any).role ? (user as any).role.replace(/_/g, " ") : "Member");

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* ─── Profile Identity Card ─── */}
      <div className="aiic-glass-default relative rounded-2xl p-5 sm:p-7 md:p-8 shadow-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
          <Avatar
            src={user.avatar}
            name={user.displayName || user.username}
            size={76}
            radius={18}
            className="ring-1 ring-white/15 shrink-0"
          />

          <div className="min-w-0 flex-1 w-full">
            {/* Display Name & Role Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {user.displayName || user.username}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 font-mono text-[10.5px] text-accent font-semibold uppercase tracking-wider w-fit">
                <Shield size={11} className="text-accent" />
                <span>{roleDisplay}</span>
              </span>
            </div>

            {/* Username */}
            <p className="font-mono text-xs sm:text-[13px] text-zinc-400 mt-1">
              @{user.username}
            </p>

            {/* Status, Email, and Class metadata */}
            <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full shrink-0", currentStatus.dot)} />
                <span className="text-zinc-300">{currentStatus.label}</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Mail size={12} className="text-zinc-500 shrink-0" />
                <span className="truncate max-w-[210px] sm:max-w-none">{user.email}</span>
              </div>
              {(user.classYear || user.section) && (
                <div className="flex items-center gap-1.5 text-accent font-medium">
                  <span>Class {[user.classYear, user.section].filter(Boolean).join(" · ")}</span>
                </div>
              )}
            </div>

            {/* Social Links */}
            {(user.githubUrl || user.linkedinUrl || user.websiteUrl) && (
              <div className="mt-3.5 flex flex-wrap items-center gap-2 font-mono text-xs">
                {user.githubUrl && (
                  <a
                    href={user.githubUrl.startsWith("http") ? user.githubUrl : `https://${user.githubUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-accent hover:border-accent/40 transition-colors shadow-sm"
                  >
                    <ExternalLink size={12} className="text-zinc-400" />
                    <span>GitHub</span>
                  </a>
                )}
                {user.linkedinUrl && (
                  <a
                    href={user.linkedinUrl.startsWith("http") ? user.linkedinUrl : `https://${user.linkedinUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-accent hover:border-accent/40 transition-colors shadow-sm"
                  >
                    <ExternalLink size={12} className="text-zinc-400" />
                    <span>LinkedIn</span>
                  </a>
                )}
                {user.websiteUrl && (
                  <a
                    href={user.websiteUrl.startsWith("http") ? user.websiteUrl : `https://${user.websiteUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-accent hover:border-accent/40 transition-colors shadow-sm"
                  >
                    <Globe size={12} className="text-zinc-400" />
                    <span>Website</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <div className="mt-5 border-t border-white/[0.08] pt-4 text-xs sm:text-[13.5px] text-zinc-300 leading-relaxed font-sans">
            {user.bio}
          </div>
        )}

        {/* Skills & Interests */}
        {((user.skills && user.skills.length > 0) || (user.interests && user.interests.length > 0)) && (
          <div className="mt-5 border-t border-white/[0.08] pt-4 flex flex-col gap-4 font-mono">
            {user.skills && user.skills.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-zinc-500 font-semibold text-[10.5px] uppercase tracking-wider">
                  Skills:
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {user.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-200 text-xs font-mono shadow-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {user.interests && user.interests.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-zinc-500 font-semibold text-[10.5px] uppercase tracking-wider">
                  Interests:
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {user.interests.map((interest) => (
                    <span
                      key={interest}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/25 text-accent text-xs font-mono font-medium shadow-sm"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Full User Settings Section ─── */}
      <section aria-label="User Settings">
        <FullUserSettings initialSection="account" />
      </section>
    </div>
  );
}

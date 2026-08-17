"use client";

import Link from "next/link";
import { useAuthStore } from "@/features/auth";
import { Avatar } from "@/shared/components/ui";
import { Shield, Mail, User as UserIcon } from "lucide-react";
import { cn } from "@corvus/ui";
import { FullUserSettings } from "@/features/profile/components/FullUserSettings";

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  online: { label: "Online", dot: "bg-status-online" },
  idle: { label: "Idle", dot: "bg-status-idle" },
  dnd: { label: "Do not disturb", dot: "bg-status-dnd" },
  invisible: { label: "Invisible", dot: "bg-text-faint" },
};

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-surface-raised/60 p-8 sm:p-12 text-center">
        <UserIcon className="mx-auto h-12 w-12 text-text-faint" />
        <h1 className="mt-4 text-xl font-bold text-text-primary">Member Profile &amp; Settings</h1>
        <p className="mx-auto mt-2 max-w-[45ch] text-xs sm:text-sm text-text-secondary">
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

  return (
    <div className="space-y-8">
      {/* ─── Profile Header Card ─── */}
      <div className="rounded-2xl border border-border/80 bg-surface-raised/60 p-6 sm:p-7 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <Avatar
            src={user.avatar}
            name={user.displayName || user.username}
            size={68}
            radius={16}
            className="ring-2 ring-border shrink-0"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
                {user.displayName || user.username}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/15 px-2.5 py-0.5 font-mono text-[10px] text-accent font-semibold uppercase">
                <Shield size={10} /> {(user as any).roleName || ((user as any).role ? (user as any).role.replace(/_/g, " ") : "Member")}
              </span>
            </div>

            <p className="font-mono text-xs text-text-muted mt-0.5">
              @{user.username}
            </p>

            <div className="mt-2.5 flex flex-wrap items-center gap-4 font-mono text-xs text-text-secondary">
              <div className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", currentStatus.dot)} />
                <span>{currentStatus.label}</span>
              </div>
              <div className="flex items-center gap-1.5 text-text-muted">
                <Mail size={12} />
                <span>{user.email}</span>
              </div>
              {(user.classYear || user.section) && (
                <div className="flex items-center gap-1.5 text-accent">
                  <span>{[user.classYear, user.section].filter(Boolean).join(" · ")}</span>
                </div>
              )}
            </div>

            {(user.githubUrl || user.linkedinUrl || user.websiteUrl) && (
              <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-xs text-accent">
                {user.githubUrl && (
                  <a
                    href={user.githubUrl.startsWith("http") ? user.githubUrl : `https://${user.githubUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline flex items-center gap-1"
                  >
                    <span>GitHub</span>
                  </a>
                )}
                {user.linkedinUrl && (
                  <a
                    href={user.linkedinUrl.startsWith("http") ? user.linkedinUrl : `https://${user.linkedinUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline flex items-center gap-1"
                  >
                    <span>LinkedIn</span>
                  </a>
                )}
                {user.websiteUrl && (
                  <a
                    href={user.websiteUrl.startsWith("http") ? user.websiteUrl : `https://${user.websiteUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline flex items-center gap-1"
                  >
                    <span>Website</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {user.bio && (
          <div className="mt-4 border-t border-border/60 pt-3 text-xs sm:text-sm text-text-secondary leading-relaxed">
            {user.bio}
          </div>
        )}

        {((user.skills && user.skills.length > 0) || (user.interests && user.interests.length > 0)) && (
          <div className="mt-4 border-t border-border/60 pt-3 flex flex-wrap gap-4 text-xs font-mono">
            {user.skills && user.skills.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-text-muted">Skills:</span>
                {user.skills.map((skill) => (
                  <span key={skill} className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-text-primary text-[11px]">
                    {skill}
                  </span>
                ))}
              </div>
            )}
            {user.interests && user.interests.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-text-muted">Interests:</span>
                {user.interests.map((interest) => (
                  <span key={interest} className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-accent text-[11px]">
                    {interest}
                  </span>
                ))}
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

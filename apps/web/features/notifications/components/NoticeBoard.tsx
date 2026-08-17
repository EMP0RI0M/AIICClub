"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  Pin,
  Shield,
  Search,
  Sparkles,
  AlertTriangle,
  Calendar,
  Layers,
  MessageSquare,
  CheckCircle2,
  Tag,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@corvus/ui";
import { useAuthStore } from "@/features/auth/store/auth-store";
import type { AIICAnnouncement } from "@/shared/lib/aiic-types";

interface NoticeBoardProps {
  initialAnnouncements: AIICAnnouncement[];
}

const CATEGORIES = ["All", "Pinned", "Alert", "Workshop", "Club", "Academic", "Release", "General"];

export function NoticeBoard({ initialAnnouncements }: NoticeBoardProps) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const restoreSession = useAuthStore((s) => s.restoreSession);

  // Restore session on mount if on public notice page
  useEffect(() => {
    restoreSession().catch(() => {});
  }, [restoreSession]);

  const [announcements, setAnnouncements] = useState<AIICAnnouncement[]>(initialAnnouncements);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Post Notice Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formPriority, setFormPriority] = useState<"normal" | "urgent" | "pinned">("normal");
  const [formAuthor, setFormAuthor] = useState("");

  const isElevatedUser = isAuthenticated || Boolean(
    user && (
      ["president_admin", "admin", "president", "vice_president", "teacher", "staff", "owner", "member"].includes((user as any).role?.toLowerCase() || "") ||
      ["president_admin", "admin", "president"].includes(user.username?.toLowerCase() || "")
    )
  );

  const filteredNotices = announcements.filter((notice) => {
    const matchesCategory =
      selectedCategory === "All"
        ? true
        : selectedCategory === "Pinned"
        ? notice.isPinned || notice.priority === "pinned"
        : notice.category.toLowerCase() === selectedCategory.toLowerCase();

    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    return (
      notice.title.toLowerCase().includes(q) ||
      notice.content.toLowerCase().includes(q) ||
      notice.author.toLowerCase().includes(q) ||
      notice.category.toLowerCase().includes(q)
    );
  });

  const pinnedCount = announcements.filter(
    (n) => n.isPinned || n.priority === "pinned"
  ).length;

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    const token = useAuthStore.getState().token;

    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: formTitle.trim(),
          content: formContent.trim(),
          category: formCategory,
          priority: formPriority,
          isPinned: formPriority === "pinned",
          author: formAuthor.trim() || user?.displayName || user?.username || "AIIC Executive Board",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to publish notice.");
      }

      if (json.notice) {
        const newNotice: AIICAnnouncement = {
          id: json.notice.id,
          title: json.notice.title,
          slug: json.notice.slug,
          content: json.notice.content,
          author: json.notice.author,
          category: json.notice.category,
          priority: json.notice.priority,
          isPinned: json.notice.is_pinned,
          publishedAt: json.notice.published_at,
          coverImage: json.notice.cover_image,
        };
        setAnnouncements((prev) => [newNotice, ...prev]);
      }

      setCreateSuccess(true);
      setTimeout(() => {
        setCreateSuccess(false);
        setShowCreateModal(false);
        setFormTitle("");
        setFormContent("");
        setFormCategory("General");
        setFormPriority("normal");
      }, 1200);
    } catch (err: any) {
      setCreateError(err.message || "Failed to publish announcement.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ─── Search & Category Pill Bar ─── */}
      <div className="rounded-2xl border border-border/80 bg-surface-raised/70 p-4 sm:p-5 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
              size={16}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bulletins by title, topic, or author..."
              className="h-11 w-full rounded-xl border border-border bg-bg-deep pl-10 pr-4 font-mono text-xs sm:text-sm text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none"
            />
          </div>

          {/* Role-gated Post Notice Button */}
          {isElevatedUser && (
            <button
              type="button"
              onClick={() => {
                setCreateError(null);
                setFormAuthor(user?.displayName || user?.username || "AIIC Executive Board");
                setShowCreateModal(true);
              }}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-accent px-4 font-mono text-xs font-bold text-on-accent hover:bg-accent-hover transition-all shadow-md active:scale-95"
            >
              <Plus size={15} />
              <span>Post Notice</span>
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-none pt-2 border-t border-border/50">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl px-3 font-mono text-xs font-semibold transition-all",
                  isActive
                    ? "bg-surface-raised border border-accent/60 text-accent shadow-sm"
                    : "text-text-secondary hover:bg-surface-raised hover:text-text-primary border border-border/60"
                )}
              >
                {cat === "Pinned" && <Pin size={12} className="text-accent" />}
                {cat === "Alert" && <AlertTriangle size={12} className="text-danger" />}
                {cat}
                {cat === "Pinned" && pinnedCount > 0 && (
                  <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.2 text-[9px] text-accent">
                    {pinnedCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Notices List ─── */}
      <div className="space-y-4">
        {filteredNotices.length > 0 ? (
          filteredNotices.map((notice) => {
            const isPinned = notice.isPinned || notice.priority === "pinned";
            const isUrgent = notice.priority === "urgent" || notice.category === "Alert";

            return (
              <article
                key={notice.id}
                className={cn(
                  "relative rounded-2xl border p-6 sm:p-7 backdrop-blur-md transition-all hover:bg-surface-raised",
                  isPinned
                    ? "border-accent/40 bg-surface-raised/90 shadow-md shadow-accent/5"
                    : isUrgent
                    ? "border-danger/40 bg-surface-raised/80"
                    : "border-border/80 bg-surface-raised/60 hover:border-border-active"
                )}
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {isPinned && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-accent">
                        <Pin size={10} className="fill-accent" /> Pinned Notice
                      </span>
                    )}

                    {isUrgent && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-danger/40 bg-danger/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-danger">
                        <AlertTriangle size={10} /> Urgent
                      </span>
                    )}

                    <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 font-mono text-[10px] text-text-secondary uppercase">
                      {notice.category}
                    </span>
                  </div>

                  <time className="font-mono text-xs text-text-muted">
                    {new Date(notice.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                </div>

                {/* Title */}
                <h2 className="mt-4 text-lg sm:text-xl font-bold tracking-tight text-text-primary">
                  {notice.title}
                </h2>

                {/* Content */}
                <div className="mt-3 text-sm leading-relaxed text-text-secondary whitespace-pre-line">
                  {notice.content}
                </div>

                {/* Footer Metadata */}
                <div className="mt-5 flex items-center justify-between pt-3 border-t border-border/40 text-xs font-mono text-text-muted">
                  <div className="flex items-center gap-1.5">
                    <Shield size={12} className="text-accent" />
                    <span>{notice.author}</span>
                  </div>

                  <span className="text-[11px] text-text-faint">
                    AIIC Official Bulletin
                  </span>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-surface-raised/30">
            <Bell className="mx-auto h-10 w-10 text-text-faint" />
            <h2 className="mt-4 text-base font-semibold text-text-primary">
              {searchQuery ? "No Matching Notices Found" : "Notice Board Is Clear"}
            </h2>
            <p className="mx-auto mt-2 max-w-[45ch] text-xs sm:text-sm text-text-muted">
              {searchQuery
                ? "No announcements matched your search query. Try broadening your terms."
                : "Official notices, term bulletins, and session schedules posted by club administrators will appear here."}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/spaces"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-4 font-mono text-xs font-semibold text-on-accent hover:bg-accent-hover transition-colors"
              >
                <MessageSquare size={13} /> Member Hub
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ─── Post Notice Modal ─── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !creating && setShowCreateModal(false)}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-[24px] border border-white/10 bg-[#121622] p-6 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Bell size={18} className="text-accent" />
                Publish Institutional Notice
              </h3>
              <button
                type="button"
                disabled={creating}
                onClick={() => setShowCreateModal(false)}
                className="text-text-muted hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="mt-4 p-3 rounded-xl border border-danger/30 bg-danger/10 text-danger text-xs font-mono">
                {createError}
              </div>
            )}

            {createSuccess && (
              <div className="mt-4 p-3 rounded-xl border border-success/30 bg-success/10 text-success text-xs font-mono flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>Notice published successfully!</span>
              </div>
            )}

            <form onSubmit={handleCreateNotice} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Term 2 AI Research Workshop Schedule"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent/40 font-mono"
                  >
                    <option value="General">General</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Academic">Academic</option>
                    <option value="Club">Club</option>
                    <option value="Alert">Alert</option>
                    <option value="Release">Release</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent/40 font-mono"
                  >
                    <option value="normal">Normal</option>
                    <option value="pinned">Pinned</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">
                  Author / Authority
                </label>
                <input
                  type="text"
                  placeholder="AIIC Executive Board"
                  value={formAuthor}
                  onChange={(e) => setFormAuthor(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">
                  Notice Content *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Details of the announcement, timings, venue, or requirements..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full resize-none rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 font-mono"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-white/[0.06] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !formTitle.trim() || !formContent.trim()}
                  className="px-5 py-2 rounded-xl bg-accent text-on-accent text-xs font-bold hover:bg-accent-hover transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50"
                >
                  {creating && <Loader2 size={14} className="animate-spin" />}
                  <span>{creating ? "Publishing..." : "Publish Notice"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default NoticeBoard;

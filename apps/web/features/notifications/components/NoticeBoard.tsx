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
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { cn } from "@corvus/ui";
import { useAuthStore } from "@/features/auth/store/auth-store";
import type { AIICAnnouncement } from "@/shared/lib/aiic-types";

interface NoticeBoardProps {
  initialAnnouncements: AIICAnnouncement[];
}

const CATEGORIES = ["All", "Pinned", "Alert", "Workshop", "Academic", "Release", "Club", "General"];

function getAuthorInitials(author?: string): string {
  if (!author) return "AI";
  const parts = author.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getCategoryBadge(cat: string) {
  switch (cat?.toLowerCase()) {
    case "alert":
      return {
        label: "Alert",
        color: "bg-rose-500/10 text-rose-400 border-rose-500/30",
        dot: "bg-rose-400",
      };
    case "workshop":
      return {
        label: "Workshop",
        color: "bg-amber-500/10 text-amber-300 border-amber-500/30",
        dot: "bg-amber-400",
      };
    case "release":
      return {
        label: "Release",
        color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
        dot: "bg-emerald-400",
      };
    case "academic":
      return {
        label: "Academic",
        color: "bg-sky-500/10 text-sky-300 border-sky-500/30",
        dot: "bg-sky-400",
      };
    case "club":
      return {
        label: "Club",
        color: "bg-purple-500/10 text-purple-300 border-purple-500/30",
        dot: "bg-purple-400",
      };
    default:
      return {
        label: cat || "General",
        color: "bg-white/5 text-zinc-300 border-white/10",
        dot: "bg-zinc-400",
      };
  }
}

function NoticeContentRenderer({ content }: { content: string }) {
  if (!content) return null;

  const paragraphs = content.split("\n\n");

  return (
    <div className="space-y-2.5 font-sans text-xs sm:text-sm text-zinc-300 leading-relaxed">
      {paragraphs.map((para, idx) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const items = trimmed.split(/\n[-*]\s+/);
          return (
            <ul key={idx} className="space-y-1 pl-4 list-disc marker:text-amber-400">
              {items.map((item, iIdx) => (
                <li key={iIdx}>{item.replace(/^[-*]\s+/, "")}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={idx} className="whitespace-pre-line">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

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

  // Post / Edit Notice Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState<AIICAnnouncement | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Delete Notice State
  const [deletingNotice, setDeletingNotice] = useState<AIICAnnouncement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Dropdown menu tracking
  const [openMenuNoticeId, setOpenMenuNoticeId] = useState<string | null>(null);
  const [copiedNoticeId, setCopiedNoticeId] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formPriority, setFormPriority] = useState<"normal" | "urgent" | "pinned">("normal");
  const [formAuthor, setFormAuthor] = useState("");

  const handleCopyNotice = (notice: AIICAnnouncement) => {
    try {
      const url = typeof window !== "undefined" ? `${window.location.origin}/notifications#${notice.id}` : "";
      if (url && navigator.clipboard) {
        navigator.clipboard.writeText(url);
        setCopiedNoticeId(notice.id);
        setTimeout(() => setCopiedNoticeId(null), 2500);
      }
    } catch {
      // ignore
    }
  };

  const isElevatedUser = isAuthenticated || Boolean(
    user && (
      ["president_admin", "admin", "president", "vice_president", "teacher", "staff", "owner", "member"].includes((user as any).role?.toLowerCase() || "") ||
      ["president_admin", "admin", "president"].includes(user.username?.toLowerCase() || "")
    )
  );

  const canManageNotice = (notice: AIICAnnouncement) => {
    if (!user) return false;
    const userRole = (user as any).role?.toLowerCase() || "";
    const isAdmin = ["president_admin", "admin", "president", "vice_president", "teacher", "staff", "owner"].includes(userRole);
    if (isAdmin) return true;
    if (notice.authorId && notice.authorId === user.id) return true;
    if (notice.author && (
      notice.author.toLowerCase() === user.displayName?.toLowerCase() ||
      notice.author.toLowerCase() === user.username?.toLowerCase()
    )) return true;
    return false;
  };

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

  const handleOpenCreate = () => {
    setEditingNotice(null);
    setFormTitle("");
    setFormContent("");
    setFormCategory("General");
    setFormPriority("normal");
    setFormAuthor(user?.displayName || user?.username || "AIIC Executive Board");
    setCreateError(null);
    setCreateSuccess(false);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (notice: AIICAnnouncement) => {
    setEditingNotice(notice);
    setFormTitle(notice.title);
    setFormContent(notice.content);
    setFormCategory(notice.category || "General");
    setFormPriority(
      notice.isPinned
        ? "pinned"
        : notice.priority === "urgent" || notice.priority === "important"
        ? "urgent"
        : "normal"
    );
    setFormAuthor(notice.author || user?.displayName || user?.username || "AIIC Executive Board");
    setCreateError(null);
    setCreateSuccess(false);
    setShowCreateModal(true);
  };

  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    const token = useAuthStore.getState().token;

    try {
      if (editingNotice) {
        // EDIT existing notice
        const res = await fetch("/api/announcements", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            id: editingNotice.id,
            title: formTitle.trim(),
            content: formContent.trim(),
            category: formCategory,
            priority: formPriority,
            isPinned: formPriority === "pinned",
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to update notice.");
        }

        if (json.notice) {
          setAnnouncements((prev) =>
            prev.map((n) => (n.id === editingNotice.id ? { ...n, ...json.notice } : n))
          );
        }

        setCreateSuccess(true);
        setTimeout(() => {
          setCreateSuccess(false);
          setShowCreateModal(false);
          setEditingNotice(null);
        }, 1000);
      } else {
        // CREATE new notice
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
            authorId: json.notice.author_id,
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
        }, 1000);
      }
    } catch (err: any) {
      setCreateError(err.message || "Failed to save announcement.");
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmDeleteNotice = async () => {
    if (!deletingNotice) return;
    setIsDeleting(true);
    setDeleteError(null);

    const token = useAuthStore.getState().token;

    try {
      const res = await fetch(`/api/announcements?id=${deletingNotice.id}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete notice.");
      }

      setAnnouncements((prev) => prev.filter((n) => n.id !== deletingNotice.id));
      setDeletingNotice(null);
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete notice.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6" onClick={() => setOpenMenuNoticeId(null)}>
      {/* ─── Search & Category Pill Bar ─── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#050505] p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
              size={16}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search official bulletins, topics, directives, or authors..."
              className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#000000] pl-10 pr-4 font-mono text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none transition-colors"
            />
          </div>

          {/* Role-gated Post Notice Button */}
          {isElevatedUser && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 font-mono text-xs font-bold text-black transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus size={15} />
              <span>Publish Notice</span>
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex overflow-x-auto pb-1 gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pt-2 border-t border-white/[0.06]">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            const badge = getCategoryBadge(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl px-3 font-mono text-xs font-semibold transition-all cursor-pointer",
                  isActive
                    ? "bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-sm"
                    : "text-zinc-400 bg-white/[0.02] hover:bg-white/[0.06] hover:text-white border border-white/[0.06]"
                )}
              >
                {cat === "Pinned" && <Pin size={12} className="text-amber-400" />}
                {cat === "Alert" && <AlertTriangle size={12} className="text-rose-400" />}
                {cat !== "Pinned" && cat !== "Alert" && cat !== "All" && (
                  <span className={cn("size-1.5 rounded-full", badge.dot)} />
                )}
                <span>{cat}</span>
                {cat === "Pinned" && pinnedCount > 0 && (
                  <span className="ml-0.5 rounded-full bg-amber-500/30 px-1.5 py-0.2 text-[9px] text-amber-300 font-bold">
                    {pinnedCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Notices Feed ─── */}
      <div className="space-y-4">
        {filteredNotices.length > 0 ? (
          filteredNotices.map((notice) => {
            const isPinned = notice.isPinned || notice.priority === "pinned";
            const isUrgent = notice.priority === "urgent" || notice.category === "Alert";
            const canManage = canManageNotice(notice);
            const badge = getCategoryBadge(notice.category);
            const isCopied = copiedNoticeId === notice.id;

            return (
              <article
                key={notice.id}
                id={notice.id}
                className={cn(
                  "group relative rounded-2xl p-6 sm:p-7 transition-all duration-200 shadow-xl",
                  isPinned
                    ? "border border-amber-500/40 bg-gradient-to-b from-[#141004] via-[#090805] to-[#030303] shadow-[0_4px_30px_rgba(245,158,11,0.08)]"
                    : isUrgent
                    ? "border border-rose-500/40 bg-gradient-to-b from-[#170508] via-[#0b0304] to-[#030303] shadow-[0_4px_30px_rgba(244,63,94,0.08)]"
                    : "border border-white/[0.08] bg-[#070707] hover:border-white/20 hover:bg-[#0b0b0b]"
                )}
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                  {/* Left: Author Avatar & Metadata */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex size-10 items-center justify-center rounded-xl font-mono text-xs font-bold shrink-0 border",
                      isPinned
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : isUrgent
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        : "bg-white/[0.06] text-white border-white/10"
                    )}>
                      {getAuthorInitials(notice.author)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs sm:text-sm font-semibold text-white">
                          {notice.author || "AIIC Executive Board"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[9.5px] font-mono text-amber-400">
                          <Shield size={10} /> Verified
                        </span>
                      </div>
                      <time className="font-mono text-[11px] text-zinc-400 block mt-0.5">
                        {new Date(notice.publishedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </time>
                    </div>
                  </div>

                  {/* Right: Badges & Actions */}
                  <div className="flex items-center gap-2">
                    {isPinned && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-amber-300">
                        <Pin size={10} className="fill-amber-300" /> Pinned
                      </span>
                    )}

                    {isUrgent && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-rose-400 animate-pulse">
                        <AlertTriangle size={10} /> Urgent
                      </span>
                    )}

                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10.5px] uppercase font-medium",
                      badge.color
                    )}>
                      <span className={cn("size-1.5 rounded-full", badge.dot)} />
                      {notice.category}
                    </span>

                    {/* Copy Link Button */}
                    <button
                      type="button"
                      onClick={() => handleCopyNotice(notice)}
                      title="Copy Direct Link to Notice"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>

                    {/* Creator / Admin Action Menu */}
                    {canManage && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuNoticeId(openMenuNoticeId === notice.id ? null : notice.id);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                          aria-label="Notice Options"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {openMenuNoticeId === notice.id && (
                          <div
                            className="absolute right-0 top-full mt-1.5 z-30 min-w-[140px] rounded-xl p-1 bg-[#121212] border border-white/10 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuNoticeId(null);
                                handleOpenEdit(notice);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-mono text-zinc-300 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
                            >
                              <Pencil size={12} className="text-amber-400" />
                              <span>Edit Notice</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuNoticeId(null);
                                setDeletingNotice(notice);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-mono text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h2 className="mt-4 text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-amber-300 transition-colors">
                  {notice.title}
                </h2>

                {/* Structured Notice Content */}
                <div className="mt-3.5">
                  <NoticeContentRenderer content={notice.content} />
                </div>

                {/* Footer Metadata & Seal */}
                <div className="mt-6 flex items-center justify-between pt-3.5 border-t border-white/[0.08] text-xs font-mono text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[11px] text-zinc-400 font-semibold">
                      AIIC Official Bulletin · Ref #{notice.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyNotice(notice)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                  >
                    {isCopied ? "Link Copied!" : "Share Bulletin"}
                    <ExternalLink size={11} />
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-2xl border border-white/[0.08] bg-[#050505] p-12 text-center shadow-xl space-y-4">
            <Bell className="mx-auto h-10 w-10 text-zinc-500" />
            <h2 className="text-base font-semibold text-white">
              {searchQuery ? "No Matching Bulletins Found" : "Notice Board Is Clear"}
            </h2>
            <p className="mx-auto max-w-[45ch] text-xs sm:text-sm text-zinc-400">
              {searchQuery
                ? "No announcements matched your search query. Try broadening your terms or reset the filter."
                : "Official notices, term bulletins, and session schedules posted by club administrators will appear here."}
            </p>
            {searchQuery && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 font-mono text-xs font-semibold text-white hover:bg-white/[0.08] transition-colors"
                >
                  Clear Search Filter
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Post / Edit Notice Modal ─── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => !creating && setShowCreateModal(false)}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-[24px] border border-white/15 bg-[#0a0a0a] p-6 sm:p-7 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                {editingNotice ? <Pencil size={18} className="text-amber-400" /> : <Bell size={18} className="text-amber-400" />}
                <span>{editingNotice ? "Edit Institutional Notice" : "Publish Institutional Notice"}</span>
              </h3>
              <button
                type="button"
                disabled={creating}
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-mono">
                {createError}
              </div>
            )}

            {createSuccess && (
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{editingNotice ? "Notice updated successfully!" : "Notice published successfully!"}</span>
              </div>
            )}

            <form onSubmit={handleSaveNotice} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                  Notice Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Session 2026–27 AI Research Workshop Directives"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-xl bg-[#141414] border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 font-mono transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-xl bg-[#141414] border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono transition-colors"
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
                  <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full rounded-xl bg-[#141414] border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono transition-colors"
                  >
                    <option value="normal">Normal</option>
                    <option value="pinned">Pinned</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {!editingNotice && (
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                    Authority / Issuer
                  </label>
                  <input
                    type="text"
                    placeholder="AIIC Executive Board"
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    className="w-full rounded-xl bg-[#141414] border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 font-mono transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                  Notice Details / Directives *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Details of the announcement, venue, dates, prerequisites, or actionable bullet points..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full resize-none rounded-xl bg-[#141414] border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 font-mono transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-zinc-400 hover:bg-white/[0.06] hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !formTitle.trim() || !formContent.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {creating && <Loader2 size={14} className="animate-spin" />}
                  <span>{creating ? (editingNotice ? "Saving..." : "Publishing...") : (editingNotice ? "Save Changes" : "Publish Notice")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {deletingNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => !isDeleting && setDeletingNotice(null)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-[24px] border border-white/15 bg-[#0a0a0a] p-6 sm:p-7 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-mono">Delete Notice?</h3>
                <p className="text-xs text-zinc-400 font-mono">This bulletin will be permanently removed.</p>
              </div>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed font-sans">
              Are you sure you want to permanently delete <span className="font-semibold text-white">"{deletingNotice.title}"</span>?
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-mono">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeletingNotice(null);
                  setDeleteError(null);
                }}
                className="h-10 px-4 rounded-xl border border-white/10 text-xs font-mono font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteNotice}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-5 font-mono text-xs font-bold text-white transition-colors shadow-lg active:scale-95 cursor-pointer"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>Delete Notice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NoticeBoard;

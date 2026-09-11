import { Nav, Footer } from "@/features/landing";
import { getAnnouncements } from "@/shared/lib/aiic-data";
import { NoticeBoard } from "@/features/notifications/components/NoticeBoard";
import { Bell, Shield, Pin, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Notice Board & Institutional Bulletins — AIIC",
  description: "Official institutional notice board, bulletins, directives, term schedules, and announcements for AIIC Bal Bhawan School members.",
};

export default async function NotificationsPage() {
  const announcements = await getAnnouncements().catch(() => []);

  const pinnedCount = announcements.filter((a) => a.isPinned || a.priority === "pinned").length;
  const urgentCount = announcements.filter((a) => a.priority === "urgent" || a.category === "Alert").length;

  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-[#000000] text-white">
      <Nav />
      <main className="mx-auto max-w-[1140px] px-5 py-12 sm:px-8 sm:py-16 space-y-10">
        {/* ─── Hero Section (Charcoal Black) ─── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#050505] p-6 sm:p-10 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 font-mono text-xs font-semibold text-amber-400">
              <Shield size={13} className="text-amber-400" />
              <span>AIIC Bal Bhawan Official Notice Board</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active Bulletin Board · Session 2026–27</span>
            </div>
          </div>

          <div className="max-w-3xl space-y-3">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
              Institutional Notices &amp; Bulletins
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-zinc-400">
              Official institutional directives, curriculum updates, workshop schedules, and competition briefs verified by the AIIC Executive Board.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/[0.08] font-mono">
            <div className="rounded-xl border border-white/[0.06] bg-black/50 p-3">
              <span className="text-[10.5px] text-zinc-500 block uppercase">Total Bulletins</span>
              <span className="text-xl font-bold text-amber-400">{announcements.length}</span>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/50 p-3">
              <span className="text-[10.5px] text-zinc-500 block uppercase">Pinned Directives</span>
              <span className="text-xl font-bold text-white">{pinnedCount}</span>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/50 p-3">
              <span className="text-[10.5px] text-zinc-500 block uppercase">Urgent Alerts</span>
              <span className="text-xl font-bold text-rose-400">{urgentCount}</span>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/50 p-3">
              <span className="text-[10.5px] text-zinc-500 block uppercase">Authorized Issuer</span>
              <span className="text-xs font-bold text-emerald-400 truncate block mt-1">AIIC Board</span>
            </div>
          </div>
        </div>

        {/* ─── Interactive Notice Board ─── */}
        <NoticeBoard initialAnnouncements={announcements} />
      </main>
      <Footer />
    </div>
  );
}

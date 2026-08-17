import { Nav, Footer } from "@/features/landing";
import { getAnnouncements } from "@/shared/lib/aiic-data";
import { NoticeBoard } from "@/features/notifications/components/NoticeBoard";
import { Bell } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Notice Board & Bulletins — AIIC",
  description: "Official institutional notice board, bulletins, announcements, and term schedules for AIIC members.",
};

export default async function NotificationsPage() {
  const announcements = await getAnnouncements().catch(() => []);

  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background text-text-primary">
      <Nav />
      <main className="mx-auto max-w-[1080px] px-4 py-16 sm:px-8 sm:py-24">
        {/* Header */}
        <div className="max-w-2xl mb-10">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent flex items-center gap-1.5">
            <Bell size={14} className="text-accent" /> Institutional Notice Board
          </span>
          <h1 className="mt-3 text-[clamp(32px,5vw,52px)] font-bold tracking-tight text-text-primary">
            Official Notices &amp; Bulletins
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
            Official announcements, term schedules, competition notices, and system alerts published by the AIIC Core.
          </p>
        </div>

        {/* Interactive Notice Board */}
        <NoticeBoard initialAnnouncements={announcements} />
      </main>
      <Footer />
    </div>
  );
}

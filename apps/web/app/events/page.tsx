import { Nav, Footer } from "@/features/landing";
import { getEvents } from "@/shared/lib/aiic-data";
import Link from "next/link";
import { Calendar, MapPin, Clock, ArrowRight, ExternalLink, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Events & Workshops — AIIC",
  description: "Upcoming talks, hackathons, and technical workshops organized by AIIC.",
};

export default async function EventsPage() {
  const events = await getEvents().catch(() => []);

  const upcoming = events.filter((e) => e.status !== "Past");
  const past = events.filter((e) => e.status === "Past");

  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background text-text-primary">
      <Nav />
      <main className="mx-auto max-w-[1280px] px-5 py-14 sm:px-8 sm:py-20 space-y-12">
        {/* Header Hero */}
        <div className="aiic-glass-premium rounded-3xl p-7 sm:p-10 shadow-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs font-semibold text-accent">
            <Calendar size={14} />
            <span>AIIC Calendar &amp; Masterclasses</span>
          </div>

          <h1 className="text-[clamp(32px,5vw,52px)] font-bold tracking-tight text-white leading-tight">
            Events &amp; Sessions
          </h1>

          <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-zinc-300">
            AIIC organizes regular engineering masterclasses, speaker sessions,
            hackathons, and collaborative building meetings throughout the academic year.
          </p>
        </div>

        {/* Upcoming Events Section */}
        <div className="space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Upcoming Schedule</h2>

          <div>
            {upcoming.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((e) => (
                  <div
                    key={e.id}
                    className="aiic-glass-default aiic-glass-interactive flex flex-col justify-between rounded-2xl p-6 sm:p-7 shadow-xl border border-white/[0.08]"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider rounded-md border border-live/30 bg-live/10 px-2.5 py-0.5 text-live">
                          {e.type}
                        </span>
                        <span className="font-mono text-[11px] text-zinc-400">
                          {new Date(e.startAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>

                      <h3 className="mt-4 text-lg font-bold text-white leading-snug">
                        <Link href={`/events/${e.slug}`} className="hover:text-accent transition-colors">
                          {e.title}
                        </Link>
                      </h3>
                      <p className="mt-2 text-sm text-zinc-300 line-clamp-3 leading-relaxed">
                        {e.description}
                      </p>
                    </div>

                    <div className="mt-6 space-y-2.5 border-t border-white/[0.08] pt-4 text-xs text-zinc-400 font-mono">
                      <div className="flex items-center gap-2">
                        <MapPin size={13} className="text-accent" />
                        <span className="truncate">{e.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="text-accent" />
                        <span>{new Date(e.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>

                      {e.registrationUrl && (
                        <div className="pt-3">
                          <a
                            href={e.registrationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-bold text-on-accent hover:bg-accent-hover transition-all shadow-md active:scale-95"
                          >
                            Register <ExternalLink size={11} />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="aiic-glass-soft rounded-3xl p-12 text-center border border-white/[0.08]">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.08] mx-auto text-zinc-500">
                  <Calendar size={26} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">No upcoming events scheduled</h3>
                <p className="mx-auto mt-2 max-w-[45ch] text-xs sm:text-sm text-zinc-400">
                  New workshops, seminars, and hackathons are published throughout each academic term.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Past Events Archive Link */}
        <div className="aiic-glass-soft rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/[0.08]">
          <div>
            <h3 className="text-sm font-bold text-white">Looking for previous sessions &amp; records?</h3>
            <p className="mt-1 text-xs text-zinc-400">Explore past events, slides, and recorded masterclasses in the institutional archive.</p>
          </div>
          <Link
            href="/archive"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 font-mono text-xs font-medium text-zinc-200 hover:text-white hover:border-white/20 transition-all shrink-0 cursor-pointer"
          >
            Visit Archive <ArrowRight size={13} />
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

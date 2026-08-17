import { Nav, Footer } from "@/features/landing";
import { getEvents } from "@/shared/lib/aiic-data";
import Link from "next/link";
import { Calendar, MapPin, Clock, ArrowRight, ExternalLink } from "lucide-react";

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
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <Nav />
      <main className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8 sm:py-24">
        {/* Header */}
        <div className="max-w-2xl">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">
            Calendar &amp; Workshops
          </span>
          <h1 className="mt-3 text-[clamp(32px,5vw,52px)] font-bold tracking-tight text-text-primary">
            Events &amp; Sessions
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
            AIIC organizes regular engineering masterclasses, speaker sessions,
            hackathons, and collaborative building meetings.
          </p>
        </div>

        {/* Upcoming Events Section */}
        <div className="mt-14">
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Upcoming Schedule</h2>

          <div className="mt-6">
            {upcoming.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((e) => (
                  <div
                    key={e.id}
                    className="flex flex-col justify-between rounded-xl border border-border/80 bg-surface-raised p-6 hover:border-border-active transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider rounded border border-live/30 bg-live/10 px-2 py-0.5 text-live">
                          {e.type}
                        </span>
                        <span className="font-mono text-[11px] text-text-muted">
                          {new Date(e.startAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="mt-4 text-lg font-semibold text-text-primary">
                        <Link href={`/events/${e.slug}`} className="hover:underline">
                          {e.title}
                        </Link>
                      </h3>
                      <p className="mt-2 text-sm text-text-muted line-clamp-3">
                        {e.description}
                      </p>
                    </div>

                    <div className="mt-6 space-y-2 border-t border-border/60 pt-4 text-xs text-text-secondary">
                      <div className="flex items-center gap-2">
                        <MapPin size={13} className="text-text-faint" />
                        <span>{e.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="text-text-faint" />
                        <span>{new Date(e.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>

                      {e.registrationUrl && (
                        <div className="pt-3">
                          <a
                            href={e.registrationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-semibold text-on-accent hover:bg-accent-hover"
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
              <div className="rounded-xl border border-dashed border-border p-12 text-center">
                <Calendar className="mx-auto h-10 w-10 text-text-faint" />
                <h3 className="mt-4 text-base font-semibold text-text-primary">No upcoming events scheduled</h3>
                <p className="mx-auto mt-2 max-w-[45ch] text-sm text-text-muted">
                  New workshops, seminars, and hackathons are published throughout each academic term.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Past Events Archive Link */}
        <div className="mt-16 rounded-xl border border-border/60 bg-surface/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Looking for previous sessions &amp; records?</h3>
            <p className="mt-1 text-xs text-text-muted">Explore past events, slides, and recorded talks in the AIIC archive.</p>
          </div>
          <Link
            href="/archive"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-surface-raised border border-border px-4 text-xs font-medium text-text-primary hover:bg-surface-overlay"
          >
            Visit Archive <ArrowRight size={13} />
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

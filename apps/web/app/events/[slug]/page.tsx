import { Nav, Footer } from "@/features/landing";
import { getEventBySlug, getEvents } from "@/shared/lib/aiic-data";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Clock, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const events = await getEvents().catch(() => []);
  return events.map((e) => ({ slug: e.slug }));
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    return (
      <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background">
        <Nav />
        <main className="mx-auto max-w-[800px] px-5 py-24 text-center">
          <h1 className="text-2xl font-bold text-text-primary">Event Not Found</h1>
          <p className="mt-2 text-sm text-text-muted">The requested event could not be found.</p>
          <div className="mt-6">
            <Link href="/events" className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-xs font-semibold text-on-accent">
              <ArrowLeft size={13} /> Back to Events
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <Nav />
      <main className="mx-auto max-w-[800px] px-5 py-16 sm:px-8 sm:py-24">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary"
        >
          <ArrowLeft size={12} /> Back to Events
        </Link>

        <div className="mt-6">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider rounded border border-live/30 bg-live/10 px-2 py-0.5 text-live">
            {event.type}
          </span>
          <h1 className="mt-4 text-[clamp(28px,4.5vw,44px)] font-bold tracking-tight text-text-primary">
            {event.title}
          </h1>

          <div className="mt-6 flex flex-wrap gap-4 border-y border-border py-4 text-xs text-text-secondary">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-accent" />
              <span>{new Date(event.startAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-accent" />
              <span>{new Date(event.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin size={14} className="text-accent" />
              <span>{event.location}</span>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-border/80 bg-surface-raised p-6">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
              About this event
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {event.description}
            </p>

            {event.registrationUrl && (
              <div className="mt-8">
                <a
                  href={event.registrationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-5 text-xs font-semibold text-on-accent hover:bg-accent-hover"
                >
                  Register Now <ExternalLink size={13} />
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

import { Nav, Footer } from "@/features/landing";
import { getEventBySlug, getEvents } from "@/shared/lib/aiic-data";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Clock, ExternalLink, Sparkles, Shield } from "lucide-react";

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
      <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background text-text-primary">
        <Nav />
        <main className="mx-auto max-w-[800px] px-5 py-24 text-center">
          <div className="aiic-glass-soft rounded-2xl p-12 text-center">
            <h1 className="text-2xl font-bold text-white">Event Not Found</h1>
            <p className="mt-2 text-sm text-zinc-400">The requested event could not be found in the AIIC calendar.</p>
            <div className="mt-6">
              <Link href="/events" className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-5 font-mono text-xs font-bold text-on-accent hover:bg-accent-hover transition-all">
                <ArrowLeft size={13} /> Back to Events
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background text-text-primary">
      <Nav />
      <main className="mx-auto max-w-[880px] px-5 py-12 sm:px-8 sm:py-20">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={13} /> Back to Events
        </Link>

        <div className="mt-6 space-y-8">
          <div className="aiic-glass-premium rounded-3xl p-7 sm:p-10 shadow-2xl space-y-6">
            <div>
              <span className="font-mono text-xs font-semibold uppercase tracking-wider rounded-md border border-live/30 bg-live/10 px-2.5 py-1 text-live">
                {event.type}
              </span>
              <h1 className="mt-4 text-[clamp(28px,4.5vw,44px)] font-bold tracking-tight text-white leading-[1.15]">
                {event.title}
              </h1>
            </div>

            <div className="flex flex-wrap gap-4 sm:gap-6 border-y border-white/[0.08] py-4 text-xs font-mono text-zinc-300">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-accent" />
                <span>{new Date(event.startAt).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</span>
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

            <div className="space-y-3">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
                About this session
              </h3>
              <p className="text-sm sm:text-base leading-relaxed text-zinc-200">
                {event.description}
              </p>
            </div>

            {event.registrationUrl && (
              <div className="pt-4 border-t border-white/[0.08]">
                <a
                  href={event.registrationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-6 font-mono text-xs font-bold text-on-accent hover:bg-accent-hover transition-all shadow-lg active:scale-95 cursor-pointer"
                >
                  Register Now <ExternalLink size={14} />
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

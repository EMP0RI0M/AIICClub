import { Nav, Footer } from "@/features/landing";
import { getPeople } from "@/shared/lib/aiic-data";
import { Avatar } from "@/shared/components/ui";
import { Users, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "People & Contributors — AIIC",
  description: "Directory of members, leads, and student researchers at AIIC.",
};

export default async function PeoplePage() {
  const people = await getPeople().catch(() => []);

  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <Nav />
      <main className="mx-auto max-w-[1080px] px-5 py-16 sm:px-8 sm:py-24">
        {/* Header */}
        <div className="max-w-2xl">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">
            Member Directory
          </span>
          <h1 className="mt-3 text-[clamp(32px,5vw,52px)] font-bold tracking-tight text-text-primary">
            People &amp; Leadership
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
            The students, engineers, and researchers driving AIIC projects,
            competitions, and technical initiatives.
          </p>
        </div>

        {/* Directory Grid */}
        <div className="mt-14">
          {people.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {people.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center gap-4 rounded-xl border border-border/80 bg-surface-raised p-4 transition-colors hover:border-border-active hover:bg-surface-overlay"
                >
                  <Avatar
                    src={person.avatarUrl}
                    name={person.displayName}
                    size={48}
                    radius={10}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-text-primary">
                      {person.displayName}
                    </h3>
                    <p className="truncate font-mono text-xs text-text-muted">
                      @{person.username}
                    </p>
                    <span className="mt-1 inline-block rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-accent border border-border/60">
                      {person.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <Users className="mx-auto h-10 w-10 text-text-faint" />
              <h3 className="mt-4 text-sm font-semibold text-text-primary">Public Member Directory</h3>
              <p className="mx-auto mt-2 max-w-[45ch] text-xs text-text-muted">
                Public profile records are populated as authenticated club members configure their public profiles.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

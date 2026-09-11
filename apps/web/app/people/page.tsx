import { Nav, Footer } from "@/features/landing";
import { getPeople } from "@/shared/lib/aiic-data";
import { Avatar } from "@/shared/components/ui";
import { Users, Shield, Sparkles, UserCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "People & Contributors — AIIC",
  description: "Directory of members, leads, and student researchers at AIIC.",
};

export default async function PeoplePage() {
  const people = await getPeople().catch(() => []);

  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background text-text-primary">
      <Nav />
      <main className="mx-auto max-w-[1140px] px-5 py-14 sm:px-8 sm:py-20 space-y-12">
        {/* Header Hero */}
        <div className="aiic-glass-premium rounded-3xl p-7 sm:p-10 shadow-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs font-semibold text-accent">
            <Users size={14} />
            <span>AIIC Community &amp; Leadership Directory</span>
          </div>

          <h1 className="text-[clamp(32px,5vw,52px)] font-bold tracking-tight text-white leading-tight">
            People &amp; Leadership
          </h1>

          <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-zinc-300">
            The student engineers, researchers, and project leads driving AIIC initiatives,
            hackathons, algorithmic contests, and production open-source systems.
          </p>
        </div>

        {/* Directory Grid */}
        <div>
          {people.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {people.map((person) => (
                <div
                  key={person.id}
                  className="aiic-glass-default aiic-glass-interactive flex items-center gap-4 rounded-2xl p-4.5 shadow-lg border border-white/[0.08]"
                >
                  <Avatar
                    src={person.avatarUrl}
                    name={person.displayName}
                    size={48}
                    radius={14}
                    className="ring-1 ring-white/10 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-white">
                      {person.displayName}
                    </h3>
                    <p className="truncate font-mono text-xs text-zinc-400">
                      @{person.username}
                    </p>
                    <span className="mt-1.5 inline-block rounded-md bg-accent/10 px-2 py-0.5 font-mono text-[10px] text-accent font-semibold border border-accent/25">
                      {person.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="aiic-glass-soft rounded-3xl p-12 text-center border border-white/[0.08]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.08] mx-auto text-zinc-500">
                <Users size={26} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">Official Member Directory</h3>
              <p className="mx-auto mt-2 max-w-[45ch] text-xs sm:text-sm text-zinc-400">
                Public profile records are automatically populated as registered members configure their club accounts.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

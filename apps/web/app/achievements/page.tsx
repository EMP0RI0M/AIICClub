import { Nav, Footer } from "@/features/landing";
import { getAchievements } from "@/shared/lib/aiic-data";
import { Trophy, Award, ExternalLink, Calendar, Medal } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Achievements & Honors — AIIC",
  description: "Recognitions, competition placements, and research milestones achieved by AIIC members.",
};

export default async function AchievementsPage() {
  const achievements = await getAchievements().catch(() => []);

  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background text-text-primary">
      <Nav />
      <main className="mx-auto max-w-[1140px] px-5 py-14 sm:px-8 sm:py-20 space-y-12">
        {/* Header Hero */}
        <div className="aiic-glass-premium rounded-3xl p-7 sm:p-10 shadow-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs font-semibold text-accent">
            <Trophy size={14} />
            <span>AIIC Honors &amp; Competitive Milestones</span>
          </div>

          <h1 className="text-[clamp(32px,5vw,52px)] font-bold tracking-tight text-white leading-tight">
            Achievements &amp; Awards
          </h1>

          <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-zinc-300">
            Recognitions, competition placements, algorithmic milestones, and technical honors
            earned by AIIC student members representing Bal Bhawan School.
          </p>
        </div>

        {/* Achievements Grid */}
        <div>
          {achievements.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {achievements.map((item) => (
                <div
                  key={item.id}
                  className="aiic-glass-default aiic-glass-interactive flex flex-col justify-between rounded-2xl p-6 sm:p-7 shadow-xl border border-white/[0.08]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-zinc-400">
                        {new Date(item.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                      {item.rankResult && (
                        <span className="font-mono text-xs font-semibold uppercase rounded-md bg-accent/15 px-2.5 py-0.5 text-accent border border-accent/30 shadow-sm">
                          {item.rankResult}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white leading-snug">{item.title}</h3>
                    <p className="text-sm text-zinc-300 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-white/[0.08] pt-4 text-xs text-zinc-400 font-mono">
                    <span className="truncate mr-2">Recipient: <strong className="text-zinc-200">{item.recipient}</strong></span>
                    <span className="text-accent font-semibold shrink-0">{item.organization}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="aiic-glass-soft rounded-3xl p-12 text-center border border-white/[0.08]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.08] mx-auto text-zinc-500">
                <Trophy size={26} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">Official Honors &amp; Awards Register</h3>
              <p className="mx-auto mt-2 max-w-[45ch] text-xs sm:text-sm text-zinc-400">
                Contest results, hackathon placements, and technical honors are verified and recorded here.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

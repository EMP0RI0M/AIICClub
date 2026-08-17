import { Nav, Footer } from "@/features/landing";
import { getAchievements } from "@/shared/lib/aiic-data";
import { Trophy, Award, ExternalLink, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Achievements & Honors — AIIC",
  description: "Recognitions, competition placements, and research milestones achieved by AIIC members.",
};

export default async function AchievementsPage() {
  const achievements = await getAchievements().catch(() => []);

  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <Nav />
      <main className="mx-auto max-w-[1080px] px-5 py-16 sm:px-8 sm:py-24">
        {/* Header */}
        <div className="max-w-2xl">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">
            Honors &amp; Results
          </span>
          <h1 className="mt-3 text-[clamp(32px,5vw,52px)] font-bold tracking-tight text-text-primary">
            Achievements &amp; Awards
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
            Recognitions earned by AIIC members across hackathons, algorithmic contests,
            research publications, and innovation challenges.
          </p>
        </div>

        {/* Achievements Grid */}
        <div className="mt-14">
          {achievements.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {achievements.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-xl border border-border/80 bg-surface-raised p-6 hover:border-border-active transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-text-muted">
                        {new Date(item.date).toLocaleDateString()}
                      </span>
                      {item.rankResult && (
                        <span className="font-mono text-xs font-semibold uppercase rounded bg-accent-soft px-2 py-0.5 text-accent border border-accent/20">
                          {item.rankResult}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 text-lg font-semibold text-text-primary">{item.title}</h3>
                    <p className="mt-2 text-sm text-text-muted">{item.description}</p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4 text-xs text-text-secondary">
                    <span>Recipient: {item.recipient}</span>
                    <span>{item.organization}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <Trophy className="mx-auto h-10 w-10 text-text-faint" />
              <h3 className="mt-4 text-sm font-semibold text-text-primary">Official Honors &amp; Awards Register</h3>
              <p className="mx-auto mt-2 max-w-[45ch] text-xs text-text-muted">
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

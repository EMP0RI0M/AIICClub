"use client";

import { useState } from "react";
import { Nav, Footer } from "@/features/landing";
import { submitApplication } from "@/shared/lib/aiic-data";
import { CheckCircle2, Send, Sparkles, AlertCircle, UserPlus, Shield } from "lucide-react";

export default function JoinPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [classYear, setClassYear] = useState("");
  const [section, setSection] = useState("");
  const [interests, setInterests] = useState("");
  const [skills, setSkills] = useState("");
  const [projects, setProjects] = useState("");
  const [whyJoin, setWhyJoin] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !whyJoin.trim()) {
      setError("Please fill in your name, email, and reason for joining.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await submitApplication({
        name: name.trim(),
        email: email.trim(),
        classYear: classYear.trim() || "First Year",
        section: section.trim(),
        interests: interests.split(",").map((i) => i.trim()).filter(Boolean),
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        projects: projects.trim(),
        whyJoin: whyJoin.trim(),
        portfolioUrl: portfolioUrl.trim(),
        githubUrl: githubUrl.trim(),
      });
      setSubmitted(true);
    } catch {
      setError("Failed to submit your application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background text-text-primary">
      <Nav />
      <main className="mx-auto max-w-[880px] px-5 py-14 sm:px-8 sm:py-20 space-y-10">
        {/* Header Hero */}
        <div className="aiic-glass-premium rounded-3xl p-7 sm:p-10 shadow-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs font-semibold text-accent">
            <UserPlus size={14} />
            <span>AIIC Recruitment &amp; Membership · 2026–27</span>
          </div>

          <h1 className="text-[clamp(32px,5vw,52px)] font-bold tracking-tight text-white leading-tight">
            Apply to Join AIIC
          </h1>

          <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-zinc-300">
            AIIC invites passionate student engineers, researchers, algorithmic competitors,
            and software builders to join our research and engineering teams.
          </p>
        </div>

        {/* Application Form */}
        <div className="aiic-glass-default rounded-3xl p-6 sm:p-10 shadow-2xl border border-white/[0.08]">
          {submitted ? (
            <div className="py-12 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-live/10 border border-live/30 text-live shadow-inner">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-2xl font-bold text-white">Application Submitted</h2>
              <p className="mx-auto max-w-[48ch] text-sm text-zinc-300 leading-relaxed">
                Thank you for applying to AIIC. The recruitment board will review your submission
                and contact you via email regarding interview scheduling and team placement.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3.5 text-xs text-danger">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rafi Ullah Khan"
                    className="mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-all"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rafi@example.com"
                    className="mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-all"
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={classYear}
                    onChange={(e) => setClassYear(e.target.value)}
                    placeholder="e.g. 2nd Year / Class 11"
                    className="mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-all"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    GitHub / Portfolio URL
                  </label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Technical Interests (comma separated)
                </label>
                <input
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="e.g. Neural Networks, Robotics, Fullstack Systems, Microcontrollers"
                  className="mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-all"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Why do you want to join AIIC? *
                </label>
                <textarea
                  required
                  rows={4}
                  value={whyJoin}
                  onChange={(e) => setWhyJoin(e.target.value)}
                  placeholder="Tell us what you want to build, research, or learn at AIIC..."
                  className="mt-2 w-full rounded-xl border border-white/[0.08] bg-black/40 p-3.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-all leading-relaxed"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-6 font-mono text-xs font-bold text-on-accent transition-all hover:bg-accent-hover active:scale-95 disabled:opacity-50 shadow-md cursor-pointer"
                >
                  {loading ? "Submitting..." : "Submit Application"} <Send size={14} />
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

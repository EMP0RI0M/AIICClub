"use client";

import { useState } from "react";
import { Nav, Footer } from "@/features/landing";
import { submitApplication } from "@/shared/lib/aiic-data";
import { CheckCircle2, Send, Sparkles, AlertCircle } from "lucide-react";

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
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <Nav />
      <main className="mx-auto max-w-[840px] px-5 py-16 sm:px-8 sm:py-24">
        {/* Header */}
        <div className="max-w-2xl">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">
            Recruitment &amp; Membership
          </span>
          <h1 className="mt-3 text-[clamp(32px,5vw,52px)] font-bold tracking-tight text-text-primary">
            Apply to Join AIIC
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
            AIIC invites passionate student engineers, researchers, algorithmic competitors,
            and builders to join our teams for the upcoming session.
          </p>
        </div>

        {/* Application Form */}
        <div className="mt-12 rounded-xl border border-border/80 bg-surface-raised p-6 sm:p-10 shadow-sm">
          {submitted ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-text-primary">Application Submitted</h2>
              <p className="mx-auto mt-2 max-w-[48ch] text-sm text-text-secondary">
                Thank you for applying to AIIC. The recruitment board will review your submission
                and contact you via email regarding interview scheduling and team placement.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rafi Ullah Khan"
                    className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rafi@example.com"
                    className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={classYear}
                    onChange={(e) => setClassYear(e.target.value)}
                    placeholder="e.g. 2nd Year / Class 11"
                    className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                    GitHub / Profile URL
                  </label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Technical Interests (comma separated)
                </label>
                <input
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="e.g. Neural Networks, Robotics, Fullstack Systems, Microcontrollers"
                  className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Why do you want to join AIIC? *
                </label>
                <textarea
                  required
                  rows={4}
                  value={whyJoin}
                  onChange={(e) => setWhyJoin(e.target.value)}
                  placeholder="Tell us what you want to build, research, or learn at AIIC..."
                  className="mt-2 w-full rounded-md border border-border bg-surface p-3 text-sm text-text-primary outline-none focus:border-accent"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-6 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
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

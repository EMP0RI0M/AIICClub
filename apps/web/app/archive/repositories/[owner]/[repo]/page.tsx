import { Nav, Footer } from "@/features/landing";
import { RepositoryViewer } from "@/features/archive/components/RepositoryViewer";
import { getArchiveRecords } from "@/shared/lib/archive-service";
import { fetchGitHubRepo, fetchGitHubReadme, fetchGitHubBranches, fetchGitHubCommits, fetchGitHubReleases, fetchGitHubContributors, fetchGitHubContents } from "@/shared/lib/github";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { AIICArchiveRepository, AIICGitHubFileItem } from "@/shared/lib/archive-types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}): Promise<Metadata> {
  const { owner, repo } = await params;
  return {
    title: `${owner}/${repo} — AIIC Institutional Archive`,
    description: `Official AIIC GitHub repository index and historical code archive for ${owner}/${repo}.`,
  };
}

export default async function RepositoryArchivePage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;

  // Find linked archive record
  const records = await getArchiveRecords();
  const linkedRecord = records.find(
    (r) =>
      r.repository?.githubOwner.toLowerCase() === owner.toLowerCase() &&
      r.repository?.githubName.toLowerCase() === repo.toLowerCase()
  );

  const archiveId = linkedRecord?.archiveId || `AIIC-2026-GH-${repo.substring(0, 4).toUpperCase()}`;

  // Fetch live repository details from GitHub API
  const [ghRepo, readme, branches, commits, releases, contributors, rootContents] = await Promise.all([
    fetchGitHubRepo(owner, repo),
    fetchGitHubReadme(owner, repo),
    fetchGitHubBranches(owner, repo),
    fetchGitHubCommits(owner, repo),
    fetchGitHubReleases(owner, repo),
    fetchGitHubContributors(owner, repo),
    fetchGitHubContents(owner, repo, ""),
  ]);

  const repository: AIICArchiveRepository = {
    archiveId,
    githubOwner: owner,
    githubName: repo,
    githubUrl: ghRepo?.githubUrl || `https://github.com/${owner}/${repo}`,
    defaultBranch: ghRepo?.defaultBranch || "main",
    description: ghRepo?.description || linkedRecord?.description || "AIIC Indexed Repository",
    language: ghRepo?.language || "TypeScript",
    topics: ghRepo?.topics || linkedRecord?.tags || [],
    starsCount: ghRepo?.starsCount || 0,
    forksCount: ghRepo?.forksCount || 0,
    syncStatus: "synced",
    lastSyncedAt: new Date().toISOString(),
  };

  const initialFiles: AIICGitHubFileItem[] = Array.isArray(rootContents) ? rootContents : [];

  return (
    <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <Nav />
      <main className="mx-auto max-w-[1140px] px-5 py-12 sm:px-8 sm:py-16">
        <RepositoryViewer
          archiveId={archiveId}
          repository={repository}
          initialReadme={readme}
          initialBranches={branches}
          initialCommits={commits}
          initialReleases={releases}
          initialContributors={contributors}
          initialFiles={initialFiles}
        />
      </main>
      <Footer />
    </div>
  );
}

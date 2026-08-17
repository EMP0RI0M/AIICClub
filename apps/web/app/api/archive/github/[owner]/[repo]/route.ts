import { NextRequest, NextResponse } from "next/server";
import { fetchGitHubRepo, fetchGitHubReadme, fetchGitHubCommits, fetchGitHubBranches, fetchGitHubReleases, fetchGitHubContributors, fetchGitHubContents } from "@/shared/lib/github";
import { getArchiveRecordById } from "@/shared/lib/archive-service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ owner: string; repo: string }> }) {
  try {
    const { owner, repo } = await params;
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "overview";
    const path = searchParams.get("path") || "";
    const ref = searchParams.get("ref") || "";

    if (view === "contents") {
      const contents = await fetchGitHubContents(owner, repo, path, ref || undefined);
      return NextResponse.json({ contents });
    }

    if (view === "commits") {
      const commits = await fetchGitHubCommits(owner, repo, ref || undefined);
      return NextResponse.json({ commits });
    }

    if (view === "releases") {
      const releases = await fetchGitHubReleases(owner, repo);
      return NextResponse.json({ releases });
    }

    if (view === "branches") {
      const branches = await fetchGitHubBranches(owner, repo);
      return NextResponse.json({ branches });
    }

    if (view === "contributors") {
      const contributors = await fetchGitHubContributors(owner, repo);
      return NextResponse.json({ contributors });
    }

    // Default: full repository bundle
    const [repository, readme, branches, recentCommits, releases, contributors] = await Promise.all([
      fetchGitHubRepo(owner, repo),
      fetchGitHubReadme(owner, repo, ref || undefined),
      fetchGitHubBranches(owner, repo),
      fetchGitHubCommits(owner, repo, ref || undefined, 10),
      fetchGitHubReleases(owner, repo),
      fetchGitHubContributors(owner, repo),
    ]);

    return NextResponse.json({
      repository,
      readme,
      branches,
      recentCommits,
      releases,
      contributors,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch GitHub repository details" }, { status: 500 });
  }
}

import type {
  AIICGitHubCommit,
  AIICGitHubRelease,
  AIICGitHubContributor,
  AIICGitHubFileItem,
  AIICArchiveRepository,
} from "./archive-types";

const GITHUB_API_BASE = "https://api.github.com";

/**
 * Returns GitHub headers. Uses server-only GITHUB_TOKEN or GITHUB_PAT if configured.
 * Never leaks token to client side.
 */
function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "AIIC-Institutional-Archive/1.0",
  };

  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || process.env.GITHUB_API_KEY;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Parses a GitHub URL or string into owner and repo
 */
export function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  if (!input) return null;
  const clean = input.trim();
  
  // Format: https://github.com/owner/repo or github.com/owner/repo
  const urlMatch = clean.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)/);
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2].replace(/\.git$/, ""),
    };
  }

  // Format: owner/repo
  const slashMatch = clean.match(/^([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)$/);
  if (slashMatch) {
    return {
      owner: slashMatch[1],
      repo: slashMatch[2].replace(/\.git$/, ""),
    };
  }

  return null;
}

/**
 * Fetches repository metadata from GitHub API
 */
export async function fetchGitHubRepo(owner: string, repo: string): Promise<Partial<AIICArchiveRepository> | null> {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
      headers: getHeaders(),
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`GitHub API error: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      githubRepositoryId: data.id,
      githubOwner: data.owner.login,
      githubName: data.name,
      githubUrl: data.html_url,
      defaultBranch: data.default_branch || "main",
      description: data.description || "No description provided.",
      language: data.language || "TypeScript",
      topics: data.topics || [],
      starsCount: data.stargazers_count,
      forksCount: data.forks_count,
      openIssuesCount: data.open_issues_count,
      syncStatus: "synced",
      lastSyncedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error("Error fetching GitHub repo:", err);
    return null;
  }
}

/**
 * Fetches repository README from GitHub API
 */
export async function fetchGitHubReadme(owner: string, repo: string, branch?: string): Promise<string | null> {
  try {
    const query = branch ? `?ref=${encodeURIComponent(branch)}` : "";
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/readme${query}`, {
      headers: getHeaders(),
      next: { revalidate: 300 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.content && data.encoding === "base64") {
      const decoded = Buffer.from(data.content, "base64").toString("utf-8");
      return decoded;
    }
    return null;
  } catch (err) {
    console.error("Error fetching README:", err);
    return null;
  }
}

/**
 * Fetches repository contents at path
 */
export async function fetchGitHubContents(
  owner: string,
  repo: string,
  path: string = "",
  ref?: string
): Promise<AIICGitHubFileItem[] | AIICGitHubFileItem | null> {
  try {
    const cleanPath = path.replace(/^\/+/, "");
    const queryParams = new URLSearchParams();
    if (ref) queryParams.set("ref", ref);
    const qs = queryParams.toString() ? `?${queryParams.toString()}` : "";

    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${cleanPath}${qs}`, {
      headers: getHeaders(),
      next: { revalidate: 180 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (Array.isArray(data)) {
      // Directory listing
      return data
        .map((item: any) => ({
          name: item.name,
          path: item.path,
          sha: item.sha,
          size: item.size,
          url: item.url,
          htmlUrl: item.html_url,
          type: item.type as "file" | "dir" | "symlink" | "submodule",
        }))
        .sort((a, b) => {
          // Directories first, then alphabetical
          if (a.type === "dir" && b.type !== "dir") return -1;
          if (a.type !== "dir" && b.type === "dir") return 1;
          return a.name.localeCompare(b.name);
        });
    } else {
      // Single file
      let content = "";
      if (data.content && data.encoding === "base64") {
        content = Buffer.from(data.content, "base64").toString("utf-8");
      }
      return {
        name: data.name,
        path: data.path,
        sha: data.sha,
        size: data.size,
        url: data.url,
        htmlUrl: data.html_url,
        type: data.type,
        content,
        encoding: data.encoding,
      };
    }
  } catch (err) {
    console.error("Error fetching GitHub contents:", err);
    return null;
  }
}

/**
 * Fetches repository commits
 */
export async function fetchGitHubCommits(
  owner: string,
  repo: string,
  sha?: string,
  perPage: number = 30
): Promise<AIICGitHubCommit[]> {
  try {
    const params = new URLSearchParams({ per_page: String(perPage) });
    if (sha) params.set("sha", sha);

    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?${params.toString()}`, {
      headers: getHeaders(),
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    return data.map((c: any) => ({
      sha: c.sha,
      shortSha: c.sha.substring(0, 7),
      message: c.commit.message,
      authorName: c.commit.author?.name || c.author?.login || "AIIC Contributor",
      authorAvatar: c.author?.avatar_url,
      authorLogin: c.author?.login,
      date: c.commit.author?.date || new Date().toISOString(),
      url: c.html_url,
    }));
  } catch (err) {
    console.error("Error fetching commits:", err);
    return [];
  }
}

/**
 * Fetches repository branches
 */
export async function fetchGitHubBranches(owner: string, repo: string): Promise<string[]> {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/branches`, {
      headers: getHeaders(),
      next: { revalidate: 600 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    return data.map((b: any) => b.name);
  } catch (err) {
    console.error("Error fetching branches:", err);
    return [];
  }
}

/**
 * Fetches repository releases
 */
export async function fetchGitHubReleases(owner: string, repo: string): Promise<AIICGitHubRelease[]> {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/releases`, {
      headers: getHeaders(),
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    return data.map((r: any) => ({
      id: r.id,
      tagName: r.tag_name,
      name: r.name || r.tag_name,
      description: r.body || "",
      publishedAt: r.published_at || r.created_at,
      authorLogin: r.author?.login || "aiic-admin",
      authorAvatar: r.author?.avatar_url,
      htmlUrl: r.html_url,
      tarballUrl: r.tarball_url,
      zipballUrl: r.zipball_url,
      assets: r.assets?.map((a: any) => ({
        name: a.name,
        size: a.size,
        downloadUrl: a.browser_download_url,
      })),
    }));
  } catch (err) {
    console.error("Error fetching releases:", err);
    return [];
  }
}

/**
 * Fetches repository contributors
 */
export async function fetchGitHubContributors(owner: string, repo: string): Promise<AIICGitHubContributor[]> {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contributors?per_page=20`, {
      headers: getHeaders(),
      next: { revalidate: 600 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((u: any) => ({
      login: u.login,
      avatarUrl: u.avatar_url,
      htmlUrl: u.html_url,
      contributions: u.contributions,
    }));
  } catch (err) {
    console.error("Error fetching contributors:", err);
    return [];
  }
}

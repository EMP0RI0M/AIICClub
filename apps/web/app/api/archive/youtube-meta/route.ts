import { NextRequest, NextResponse } from "next/server";
import { extractYouTubeId, fetchYouTubeMetadata } from "@/shared/lib/archive-service";

export const dynamic = "force-dynamic";

/**
 * Parses seconds or ISO 8601 into clean human-readable MM:SS or HH:MM:SS
 */
function formatSeconds(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds <= 0) return "";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Strips raw promotional links, social media boilerplate, and trims YouTube description into clean summary
 */
function cleanYouTubeDescription(raw?: string): string {
  if (!raw) return "";
  let clean = raw
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\r/g, "")
    .replace(/\\t/g, " ")
    .trim();

  // Filter noisy promotional lines
  const lines = clean.split("\n");
  const filtered: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (filtered.length > 0 && filtered[filtered.length - 1] !== "") filtered.push("");
      continue;
    }
    if (/^(follow (me|us)|listen to|stream now|merch:|subscribe to|connect with|socials:|music video by|copyright|licensed to|all rights reserved|\(c\)|\(p\)|buy tickets|tour dates)/i.test(trimmed)) {
      continue;
    }
    if (/^https?:\/\/[^\s]+$/i.test(trimmed)) {
      continue;
    }
    filtered.push(trimmed);
  }

  clean = filtered.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (clean.length > 450) {
    const truncated = clean.slice(0, 450);
    const lastDot = truncated.lastIndexOf(".");
    if (lastDot > 180) {
      clean = truncated.slice(0, lastDot + 1);
    } else {
      clean = truncated.trim() + "...";
    }
  }
  return clean;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const urlParam = searchParams.get("url") || searchParams.get("link") || "";
    const idParam = searchParams.get("videoId") || searchParams.get("id") || "";

    const videoId = (idParam ? idParam.trim() : null) || (urlParam ? extractYouTubeId(urlParam) : null);

    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL or video ID provided." },
        { status: 400 }
      );
    }

    let title = "";
    let description = "";
    let speaker = "AIIC Bal Bhawan";
    let duration = "";
    let tags: string[] = ["lecture", "video", "aiic"];
    let thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    // Strategy 1: Official Data API v3 (if key present)
    const apiData = await fetchYouTubeMetadata(videoId).catch(() => null);
    if (apiData) {
      if (apiData.title) title = apiData.title;
      if (apiData.description) description = apiData.description;
      if (apiData.channelTitle) speaker = apiData.channelTitle;
      if (apiData.duration) duration = apiData.duration;
      if (apiData.thumbnailUrl) thumbnailUrl = apiData.thumbnailUrl;
      if (apiData.tags && apiData.tags.length > 0) {
        tags = Array.from(new Set([...tags, ...apiData.tags]));
      }
    }

    // Strategy 2: Official YouTube oEmbed API
    if (!title || !speaker) {
      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
          { headers: { "User-Agent": "AIIC-Archive/1.0" } }
        );
        if (oembedRes.ok) {
          const oembed = await oembedRes.json();
          if (oembed.title && !title) title = oembed.title;
          if (oembed.author_name && (speaker === "AIIC Bal Bhawan" || !speaker)) {
            speaker = oembed.author_name;
          }
          if (oembed.thumbnail_url && !thumbnailUrl) {
            thumbnailUrl = oembed.thumbnail_url;
          }
        }
      } catch (err) {
        console.warn("[YOUTUBE_OEMBED_FETCH_WARN]", err);
      }
    }

    // Strategy 3: YouTube HTML Scraper for Description, Keywords, & Duration
    if (!description || !duration || tags.length <= 3) {
      try {
        const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });

        if (pageRes.ok) {
          const html = await pageRes.text();

          // Title fallback
          if (!title) {
            const titleMatch =
              html.match(/<meta name="title" content="([^"]*)"/i) ||
              html.match(/<title>([^<]*)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
              title = titleMatch[1].replace(/ - YouTube$/i, "").trim();
            }
          }

          // Description fallback
          if (!description) {
            const descMatch =
              html.match(/<meta name="description" content="([^"]*)"/i) ||
              html.match(/"shortDescription":"([^"]*)"/i);
            if (descMatch && descMatch[1]) {
              description = descMatch[1]
                .replace(/\\n/g, "\n")
                .replace(/\\"/g, '"')
                .trim();
            }
          }

          // Duration fallback
          if (!duration) {
            const durMsMatch = html.match(/"approxDurationMs":"(\d+)"/i);
            const durSecMatch = html.match(/"lengthSeconds":"(\d+)"/i);
            if (durMsMatch && durMsMatch[1]) {
              duration = formatSeconds(Math.floor(parseInt(durMsMatch[1], 10) / 1000));
            } else if (durSecMatch && durSecMatch[1]) {
              duration = formatSeconds(parseInt(durSecMatch[1], 10));
            }
          }

          // Tags / Keywords fallback
          const kwMatch = html.match(/<meta name="keywords" content="([^"]*)"/i);
          if (kwMatch && kwMatch[1]) {
            const parsedTags = kwMatch[1]
              .split(",")
              .map((t) => t.trim().toLowerCase())
              .filter(Boolean);
            tags = Array.from(new Set([...tags, ...parsedTags]));
          }
        }
      } catch (err) {
        console.warn("[YOUTUBE_SCRAPER_WARN]", err);
      }
    }

    // Default clean fallback title if none resolved
    if (!title) {
      title = `YouTube Lecture Recording (${videoId})`;
    }
    const cleanedDesc = cleanYouTubeDescription(description) || `Official AIIC institutional video lecture and workshop recording (${videoId}).`;

    return NextResponse.json({
      success: true,
      videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      title,
      description: cleanedDesc,
      speaker,
      duration,
      tags: tags.slice(0, 8),
      thumbnailUrl,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch YouTube metadata" },
      { status: 500 }
    );
  }
}

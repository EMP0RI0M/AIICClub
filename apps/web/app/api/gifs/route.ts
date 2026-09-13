import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface KlipyMediaItem {
  id: number | string;
  title?: string;
  slug?: string;
  file?: {
    hd?: { gif?: { url: string }; webp?: { url: string }; png?: { url: string }; jpg?: { url: string }; jpeg?: { url: string } };
    md?: { gif?: { url: string }; webp?: { url: string }; png?: { url: string }; jpg?: { url: string }; jpeg?: { url: string } };
    sm?: { gif?: { url: string }; webp?: { url: string }; png?: { url: string }; jpg?: { url: string }; jpeg?: { url: string } };
    xs?: { gif?: { url: string }; webp?: { url: string }; png?: { url: string }; jpg?: { url: string }; jpeg?: { url: string } };
  };
}

const FALLBACK_GIFS = [
  { id: "g1", title: "Celebration Confetti", url: "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif" },
  { id: "g2", title: "Thumbs Up", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif" },
  { id: "g3", title: "Ship It Dev", url: "https://media.giphy.com/media/l41lFw057lAJQMwg0/giphy.gif" },
  { id: "g4", title: "Hacking & Coding", url: "https://media.giphy.com/media/YQitE4YNQNahy/giphy.gif" },
  { id: "g5", title: "Mind Blown Galaxy", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
  { id: "g6", title: "Robot Dance", url: "https://media.giphy.com/media/mIZ9rPeMKefm0/giphy.gif" },
  { id: "g7", title: "Happy Cheers", url: "https://media.giphy.com/media/Zw3oBUuIg231S/giphy.gif" },
  { id: "g8", title: "Popcorn Watching", url: "https://media.giphy.com/media/tFK8urY6KalURUGTta/giphy.gif" },
  { id: "g9", title: "Clapping Ovation", url: "https://media.giphy.com/media/nbvFVPiEiJH6Q/giphy.gif" },
  { id: "g10", title: "Thinking Meme", url: "https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif" },
  { id: "g11", title: "It Works!", url: "https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif" },
  { id: "g12", title: "Fast Typing", url: "https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif" },
];

const FALLBACK_STICKERS = [
  { id: "s1", title: "Pepe Cool", url: "https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif" },
  { id: "s2", title: "Sparkle Heart", url: "https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif" },
  { id: "s3", title: "Cat Vibe", url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" },
  { id: "s4", title: "Party Parrot", url: "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif" },
  { id: "s5", title: "Fire Flame", url: "https://media.giphy.com/media/26tP4gFBQewkLnMv6/giphy.gif" },
  { id: "s6", title: "Rocket Blast", url: "https://media.giphy.com/media/mi6DsSSNKDbUY/giphy.gif" },
  { id: "s7", title: "Doge Wow", url: "https://media.giphy.com/media/oBQZIgNobc7ew/giphy.gif" },
  { id: "s8", title: "GG Shield", url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif" },
];

const FALLBACK_MEMES = [
  { id: "m1", title: "Distracted Boyfriend", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80" },
  { id: "m2", title: "Drake Hotline", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80" },
  { id: "m3", title: "Woman Yelling at Cat", url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80" },
  { id: "m4", title: "Roll Safe Think", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80" },
  { id: "m5", title: "Success Kid", url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80" },
  { id: "m6", title: "This is Fine Dog", url: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80" },
];

function extractMediaUrl(item: KlipyMediaItem): { url: string; previewUrl: string } {
  const f = item.file;
  if (!f) return { url: "", previewUrl: "" };

  const url =
    f.hd?.gif?.url ||
    f.hd?.webp?.url ||
    f.hd?.png?.url ||
    f.hd?.jpg?.url ||
    f.hd?.jpeg?.url ||
    f.md?.gif?.url ||
    f.md?.webp?.url ||
    f.md?.png?.url ||
    f.md?.jpg?.url ||
    f.md?.jpeg?.url ||
    f.sm?.gif?.url ||
    f.sm?.webp?.url ||
    f.sm?.png?.url ||
    f.sm?.jpg?.url ||
    "";

  const previewUrl =
    f.sm?.gif?.url ||
    f.sm?.webp?.url ||
    f.sm?.png?.url ||
    f.sm?.jpg?.url ||
    f.xs?.gif?.url ||
    f.xs?.webp?.url ||
    f.xs?.png?.url ||
    f.xs?.jpg?.url ||
    url;

  return { url, previewUrl };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const category = searchParams.get("category")?.trim() || "";
  const typeParam = searchParams.get("type")?.trim().toLowerCase() || "gifs";
  const limit = Math.min(50, Math.max(10, parseInt(searchParams.get("limit") || "24", 10)));

  const mediaType = typeParam === "stickers" ? "stickers" : typeParam === "memes" ? "memes" : "gifs";

  const apiKey =
    process.env.KLIPY_API_KEY ||
    process.env.CLIPY_API_KEY ||
    "8EqiwewCJG3bRCjQFYWDsyVQGQ1JoH8d0O05TOrODLiymNArG3RS2kPvKjRLSdG7";

  const effectiveQuery = q || (category !== "Trending" && category !== "All" ? category : "");

  const fallbackList =
    mediaType === "stickers"
      ? FALLBACK_STICKERS
      : mediaType === "memes"
      ? FALLBACK_MEMES
      : FALLBACK_GIFS;

  try {
    const url = effectiveQuery
      ? `https://api.klipy.com/api/v1/${apiKey}/${mediaType}/search?q=${encodeURIComponent(effectiveQuery)}&per_page=${limit}`
      : `https://api.klipy.com/api/v1/${apiKey}/${mediaType}/trending?per_page=${limit}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Klipy responded with ${res.status}`);
    }

    const json = (await res.json()) as {
      result?: boolean;
      data?: { data?: KlipyMediaItem[] };
    };

    const results = json.data?.data;
    if (results && results.length > 0) {
      const formatted = results
        .map((item) => {
          const { url, previewUrl } = extractMediaUrl(item);
          return {
            id: String(item.id),
            title: item.title || (mediaType === "stickers" ? "Sticker" : mediaType === "memes" ? "Meme" : "GIF"),
            url,
            previewUrl,
          };
        })
        .filter((g) => !!g.url);

      if (formatted.length > 0) {
        return NextResponse.json({
          gifs: formatted,
          items: formatted,
          mediaType,
          source: "klipy",
        });
      }
    }

    const filteredFallback = effectiveQuery
      ? fallbackList.filter((g) =>
          g.title.toLowerCase().includes(effectiveQuery.toLowerCase())
        )
      : fallbackList;

    const listToReturn = filteredFallback.length > 0 ? filteredFallback : fallbackList;

    return NextResponse.json({
      gifs: listToReturn,
      items: listToReturn,
      mediaType,
      source: "fallback",
    });
  } catch (err: any) {
    console.warn(`[${mediaType.toUpperCase()}_API_PROXY_WARN]`, err?.message || err);

    const filteredFallback = effectiveQuery
      ? fallbackList.filter((g) =>
          g.title.toLowerCase().includes(effectiveQuery.toLowerCase())
        )
      : fallbackList;

    const listToReturn = filteredFallback.length > 0 ? filteredFallback : fallbackList;

    return NextResponse.json({
      gifs: listToReturn,
      items: listToReturn,
      mediaType,
      source: "fallback",
      warning: err?.message,
    });
  }
}

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface KlipyGif {
  id: number | string;
  title: string;
  slug?: string;
  file?: {
    hd?: { gif?: { url: string } };
    md?: { gif?: { url: string } };
    sm?: { gif?: { url: string } };
    xs?: { gif?: { url: string } };
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const category = searchParams.get("category")?.trim() || "";
  const limit = Math.min(50, Math.max(10, parseInt(searchParams.get("limit") || "24", 10)));

  const apiKey =
    process.env.KLIPY_API_KEY ||
    process.env.CLIPY_API_KEY ||
    "8EqiwewCJG3bRCjQFYWDsyVQGQ1JoH8d0O05TOrODLiymNArG3RS2kPvKjRLSdG7";

  const effectiveQuery = q || (category !== "Trending" ? category : "");

  try {
    const url = effectiveQuery
      ? `https://api.klipy.com/api/v1/${apiKey}/gifs/search?q=${encodeURIComponent(effectiveQuery)}&per_page=${limit}`
      : `https://api.klipy.com/api/v1/${apiKey}/gifs/trending?per_page=${limit}`;

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
      data?: { data?: KlipyGif[] };
    };

    const results = json.data?.data;
    if (results && results.length > 0) {
      const formatted = results.map((item) => ({
        id: String(item.id),
        title: item.title || "GIF",
        url:
          item.file?.hd?.gif?.url ||
          item.file?.md?.gif?.url ||
          item.file?.sm?.gif?.url ||
          "",
        previewUrl:
          item.file?.sm?.gif?.url ||
          item.file?.xs?.gif?.url ||
          item.file?.md?.gif?.url ||
          "",
      })).filter((g) => !!g.url);

      if (formatted.length > 0) {
        return NextResponse.json({ gifs: formatted, source: "klipy" });
      }
    }

    // Filter fallback if search was performed
    const filteredFallback = effectiveQuery
      ? FALLBACK_GIFS.filter((g) =>
          g.title.toLowerCase().includes(effectiveQuery.toLowerCase())
        )
      : FALLBACK_GIFS;

    return NextResponse.json({
      gifs: filteredFallback.length > 0 ? filteredFallback : FALLBACK_GIFS,
      source: "fallback",
    });
  } catch (err: any) {
    console.warn("[GIF_API_PROXY_WARN]", err?.message || err);

    // Graceful fallback so client UI never hangs
    const filteredFallback = effectiveQuery
      ? FALLBACK_GIFS.filter((g) =>
          g.title.toLowerCase().includes(effectiveQuery.toLowerCase())
        )
      : FALLBACK_GIFS;

    return NextResponse.json({
      gifs: filteredFallback.length > 0 ? filteredFallback : FALLBACK_GIFS,
      source: "fallback",
      warning: err?.message,
    });
  }
}

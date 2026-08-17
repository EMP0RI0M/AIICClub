import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const urlStr = searchParams.get("url");

    if (!urlStr) {
        return NextResponse.json({ embed: null });
    }

    try {
        const parsed = new URL(urlStr);
        const host = parsed.hostname;

        // Basic fast heuristic for title & site
        return NextResponse.json({
            embed: {
                url: urlStr,
                siteName: host.replace(/^www\./, ""),
                title: `${host.replace(/^www\./, "")} link`,
                description: urlStr,
                imageUrl: null,
                faviconUrl: `https://www.google.com/s2/favicons?domain=${host}&sz=64`,
            },
        });
    } catch {
        return NextResponse.json({ embed: null });
    }
}

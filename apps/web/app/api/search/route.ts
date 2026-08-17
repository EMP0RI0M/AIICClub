import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim();
    const type = (searchParams.get("type") || "all").toLowerCase();
    const spaceId = searchParams.get("spaceId");

    if (!query) {
        return NextResponse.json({
            messages: [],
            cards: [],
            docs: [],
            files: [],
            prs: [],
        });
    }

    const supabase = getSupabaseAdmin();
    const results: {
        messages: any[];
        cards: any[];
        docs: any[];
        files: any[];
        prs: any[];
    } = {
        messages: [],
        cards: [],
        docs: [],
        files: [],
        prs: [],
    };

    try {
        // 1. Search Messages in public.messages
        if (type === "all" || type === "messages" || type === "files") {
            let msgQuery = supabase
                .from("messages")
                .select(`
                    id,
                    content,
                    channel_id,
                    author_id,
                    created_at,
                    type,
                    author:users!author_id (
                        id,
                        username,
                        display_name,
                        avatar_url
                    ),
                    channel:channels!channel_id (
                        id,
                        name,
                        server_id
                    )
                `)
                .ilike("content", `%${query}%`)
                .order("created_at", { ascending: false })
                .limit(40);

            const { data: rawMessages, error: msgError } = await msgQuery;
            if (msgError) {
                console.error("[SEARCH] Messages error:", msgError);
            } else if (rawMessages) {
                // Filter by spaceId if provided
                const filtered = spaceId
                    ? rawMessages.filter((m: any) => m.channel?.server_id === spaceId || !m.channel?.server_id)
                    : rawMessages;

                results.messages = filtered.map((m: any) => ({
                    id: m.id,
                    text: m.content || "",
                    content: m.content || "",
                    channelId: m.channel_id,
                    channel: m.channel?.name || "general",
                    at: m.created_at,
                    createdAt: m.created_at,
                    author: {
                        id: m.author?.id || m.author_id,
                        name: m.author?.display_name || m.author?.username || "Member",
                        avatar: m.author?.avatar_url || null,
                    },
                }));

                // If type is files, also search messages with file/image indicators
                if (type === "files" || type === "all") {
                    results.files = filtered
                        .filter((m: any) => m.content?.includes("http") || m.type === "file" || m.content?.match(/\.(png|jpg|jpeg|gif|pdf|docx|zip)/i))
                        .map((m: any) => ({
                            id: m.id,
                            name: m.content.split("/").pop() || "File",
                            url: m.content,
                            channel: m.channel?.name || "general",
                            author: m.author?.display_name || m.author?.username || "Member",
                            createdAt: m.created_at,
                        }));
                }
            }
        }

        // 2. Search Kanban Cards
        if (type === "all" || type === "cards") {
            try {
                const { data: cardsData } = await supabase
                    .from("kanban_cards")
                    .select("id, title, description, column_id, created_at")
                    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
                    .limit(20);

                if (cardsData) {
                    results.cards = cardsData.map((c: any) => ({
                        id: c.id,
                        title: c.title || "Card",
                        description: c.description || "",
                        column: c.column_id || "Tasks",
                        createdAt: c.created_at,
                    }));
                }
            } catch {
                // Table might not exist or be empty
            }
        }

        // 3. Search Docs
        if (type === "all" || type === "docs") {
            try {
                const { data: docsData } = await supabase
                    .from("channel_docs")
                    .select("id, title, content, channel_id, created_at")
                    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
                    .limit(20);

                if (docsData) {
                    results.docs = docsData.map((d: any) => ({
                        id: d.id,
                        title: d.title || "Document",
                        preview: typeof d.content === "string" ? d.content.slice(0, 150) : "",
                        channelId: d.channel_id,
                        createdAt: d.created_at,
                    }));
                }
            } catch {
                // Table might not exist or be empty
            }
        }

        return NextResponse.json(results);
    } catch (err: any) {
        console.error("[SEARCH] Unexpected error:", err);
        return NextResponse.json({ error: err?.message || "Search failed" }, { status: 500 });
    }
}

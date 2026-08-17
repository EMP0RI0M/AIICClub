import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: channelId } = await context.params;
        const supabase = getSupabaseAdmin();

        // 1. Query public.pinned_messages
        const { data: rawPins, error } = await supabase
            .from("pinned_messages")
            .select(`
                id,
                channel_id,
                message_id,
                pinned_by_id,
                pinned_at,
                message:messages!message_id (
                    id,
                    channel_id,
                    content,
                    type,
                    created_at,
                    edited_at,
                    author:users!author_id (
                        id,
                        username,
                        display_name,
                        avatar_url
                    )
                ),
                pinned_by:users!pinned_by_id (
                    id,
                    username,
                    display_name,
                    avatar_url
                )
            `)
            .eq("channel_id", channelId)
            .order("pinned_at", { ascending: false });

        if (error) {
            console.error("[PINNED] Query error:", error);
            // Fallback: If foreign key alias differed, query pinned_messages directly then query messages
            const { data: basicPins } = await supabase
                .from("pinned_messages")
                .select("id, channel_id, message_id, pinned_by_id, pinned_at")
                .eq("channel_id", channelId);

            if (basicPins && basicPins.length > 0) {
                const msgIds = basicPins.map((p: any) => p.message_id);
                const { data: msgs } = await supabase
                    .from("messages")
                    .select("id, channel_id, content, type, created_at, edited_at, author:users!author_id(id, username, display_name, avatar_url)")
                    .in("id", msgIds);

                const msgMap = new Map((msgs || []).map((m: any) => [m.id, m]));
                const fallbackPins = basicPins.map((p: any) => {
                    const msg: any = msgMap.get(p.message_id);
                    return {
                        id: p.id,
                        pinnedAt: p.pinned_at,
                        pinnedBy: {
                            id: p.pinned_by_id,
                            username: "user",
                            displayName: "User",
                            avatarUrl: null,
                        },
                        message: {
                            id: p.message_id,
                            channelId: p.channel_id,
                            content: msg?.content || "Message unavailable",
                            type: msg?.type || "DEFAULT",
                            createdAt: msg?.created_at || p.pinned_at,
                            editedAt: msg?.edited_at || null,
                            author: {
                                id: msg?.author?.id || "unknown",
                                username: msg?.author?.username || "unknown",
                                displayName: msg?.author?.display_name || msg?.author?.username || "Member",
                                avatarUrl: msg?.author?.avatar_url || null,
                            },
                        },
                    };
                });
                return NextResponse.json({ pins: fallbackPins });
            }

            return NextResponse.json({ pins: [] });
        }

        const formattedPins = (rawPins || []).map((p: any) => ({
            id: p.id,
            pinnedAt: p.pinned_at,
            pinnedBy: {
                id: p.pinned_by?.id || p.pinned_by_id,
                username: p.pinned_by?.username || "user",
                displayName: p.pinned_by?.display_name || p.pinned_by?.username || "User",
                avatarUrl: p.pinned_by?.avatar_url || null,
            },
            message: {
                id: p.message?.id || p.message_id,
                channelId: p.message?.channel_id || p.channel_id,
                content: p.message?.content || "Message unavailable",
                type: p.message?.type || "DEFAULT",
                createdAt: p.message?.created_at || p.pinned_at,
                editedAt: p.message?.edited_at || null,
                author: {
                    id: p.message?.author?.id || "unknown",
                    username: p.message?.author?.username || "unknown",
                    displayName: p.message?.author?.display_name || p.message?.author?.username || "Member",
                    avatarUrl: p.message?.author?.avatar_url || null,
                },
            },
        }));

        return NextResponse.json({ pins: formattedPins });
    } catch (err: any) {
        console.error("[PINNED] Unexpected error:", err);
        return NextResponse.json({ pins: [] });
    }
}

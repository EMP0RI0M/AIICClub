import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * Vercel Streaming SSE Endpoint for Channel Messages
 * Streams new messages, edits, and deletions via HTTP Server-Sent Events (SSE).
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: rawChannelId } = await context.params;
    const supabase = getSupabaseAdmin();

    // Resolve channel ID if slug passed
    let channelId = rawChannelId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawChannelId);
    if (!isUuid) {
        const { data: chan } = await supabase
            .from("channels")
            .select("id")
            .ilike("name", rawChannelId)
            .maybeSingle();
        if (chan?.id) channelId = chan.id;
    }

    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    const writeEvent = async (event: string, data: any) => {
        try {
            await writer.write(
                encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            );
        } catch {}
    };

    // 1. Send initial connected event
    await writeEvent("connected", {
        channelId,
        connectedAt: new Date().toISOString(),
    });

    let lastKnownTimestamp = new Date().toISOString();

    // 2. Continuous real-time edge stream polling & heartbeat loop
    let isStreamActive = true;

    request.signal.addEventListener("abort", () => {
        isStreamActive = false;
        try {
            writer.close();
        } catch {}
    });

    const streamLoop = async () => {
        while (isStreamActive) {
            try {
                // Heartbeat to keep HTTP connection alive
                await writeEvent("ping", { t: Date.now() });

                // Query for any messages created or edited since last poll
                const { data: newMessages } = await supabase
                    .from("messages")
                    .select(`
                        id,
                        channel_id,
                        author_id,
                        content,
                        type,
                        reply_to_id,
                        created_at,
                        author:users!author_id (
                            id,
                            username,
                            display_name,
                            avatar_url,
                            status
                        )
                    `)
                    .eq("channel_id", channelId)
                    .gt("created_at", lastKnownTimestamp)
                    .order("created_at", { ascending: true })
                    .limit(20);

                if (newMessages && newMessages.length > 0) {
                    for (const row of newMessages) {
                        lastKnownTimestamp = row.created_at;
                        const formatted = {
                            id: row.id,
                            channelId: row.channel_id,
                            content: row.content,
                            type: row.type || "default",
                            createdAt: row.created_at,
                            editedAt: null,
                            reactions: [],
                            attachments: [],
                            embeds: [],
                            author: {
                                id: (row.author as any)?.id || row.author_id,
                                username: (row.author as any)?.username || "User",
                                displayName: (row.author as any)?.display_name || (row.author as any)?.username || "User",
                                avatarUrl: (row.author as any)?.avatar_url || null,
                                status: (row.author as any)?.status || "online",
                            },
                        };

                        await writeEvent("new_message", { message: formatted });
                    }
                }
            } catch (err) {
                console.warn("[EDGE_STREAM_LOOP_WARN]", err);
            }

            // Wait 1.0 second between streaming polls
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    };

    // Run streaming in background
    void streamLoop();

    return new Response(responseStream.readable, {
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}

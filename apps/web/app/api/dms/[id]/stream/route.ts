import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * Vercel Streaming SSE Endpoint for DM Messages
 * Streams new messages, edits, and deletions via HTTP Server-Sent Events (SSE).
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: rawDmId } = await context.params;
    const supabase = getSupabaseAdmin();

    const conversationId = rawDmId;

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

    // Send initial connected event
    await writeEvent("connected", {
        conversationId,
        connectedAt: new Date().toISOString(),
    });

    let lastKnownTimestamp = new Date().toISOString();
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
                // Heartbeat
                await writeEvent("ping", { t: Date.now() });

                const { data: newMessages } = await supabase
                    .from("dm_messages")
                    .select(`
                        id,
                        conversation_id,
                        author_id,
                        content,
                        type,
                        created_at,
                        author:users!dm_messages_author_id_fkey (
                            id,
                            username,
                            display_name,
                            avatar_url,
                            status
                        )
                    `)
                    .eq("conversation_id", conversationId)
                    .gt("created_at", lastKnownTimestamp)
                    .order("created_at", { ascending: true })
                    .limit(20);

                if (newMessages && newMessages.length > 0) {
                    for (const row of newMessages) {
                        lastKnownTimestamp = row.created_at;
                        const formatted = {
                            id: row.id,
                            channelId: row.conversation_id,
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

                        await writeEvent("new_dm_message", { message: formatted, conversationId });
                    }
                }
            } catch (err) {
                console.warn("[EDGE_DM_STREAM_LOOP_WARN]", err);
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    };

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

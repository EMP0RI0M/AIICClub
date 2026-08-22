import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: conversationId } = await context.params;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const cursor = searchParams.get("cursor");

    const supabase = getSupabaseAdmin();

    // 1. Enforce strict participant isolation (DMs are 100% private to conversation members)
    let actualUserId = user.id;
    const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
        .maybeSingle();

    if (userRow?.id) actualUserId = userRow.id;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId);
    if (!isUUID) {
        return NextResponse.json({ messages: [], nextCursor: null, hasMore: false });
    }

    const { data: isParticipant } = await supabase
        .from("dm_participants")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .eq("user_id", actualUserId)
        .maybeSingle();

    if (!isParticipant) {
        // Check if conversation exists at all
        const { data: convo } = await supabase.from("dm_conversations").select("id").eq("id", conversationId).maybeSingle();
        if (!convo) {
            return NextResponse.json({ messages: [], nextCursor: null, hasMore: false });
        }
        return NextResponse.json({ error: "Access denied. Private DM." }, { status: 403 });
    }


    let query = supabase
        .from("dm_messages")
        .select(`
            id,
            conversation_id,
            content,
            type,
            edited_at,
            created_at,
            reply_to_id,
            author:users!dm_messages_author_id_fkey (
                id,
                username,
                display_name,
                avatar_url,
                status
            )
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(limit + 1);

    if (cursor) {
        query = query.lt("created_at", cursor);
    }

    const { data: rawMessages, error } = await query;
    if (error) {
        return NextResponse.json({ messages: [], nextCursor: null, hasMore: false });
    }

    const hasMore = (rawMessages || []).length > limit;
    const sliced = hasMore ? rawMessages.slice(0, limit) : (rawMessages || []);
    const nextCursor = hasMore && sliced.length > 0 ? sliced[sliced.length - 1].created_at : null;

    // Fetch reply authors if any
    const replyIds = sliced.map((m: any) => m.reply_to_id).filter(Boolean);
    const replyMap = new Map<string, any>();
    if (replyIds.length > 0) {
        const { data: replyMessages } = await supabase
            .from("dm_messages")
            .select("id, content, author:users!dm_messages_author_id_fkey(id, username, display_name)")
            .in("id", replyIds);

        (replyMessages || []).forEach((rm: any) => {
            replyMap.set(rm.id, {
                id: rm.id,
                content: rm.content,
                author: {
                    id: rm.author?.id,
                    username: rm.author?.username,
                    displayName: rm.author?.display_name,
                },
            });
        });
    }

        // Fetch reactions from public.reactions for these DM messages
        const messageIds = sliced.map((m: any) => m.id);
        const reactionsMap = new Map<string, Array<{ emoji: string; count: number; reacted?: boolean }>>();

        if (messageIds.length > 0) {
            const { data: dbReactions } = await supabase
                .from("reactions")
                .select("message_id, emoji, user_id")
                .in("message_id", messageIds);

            if (dbReactions && dbReactions.length > 0) {
                const byMsg = new Map<string, Map<string, { count: number; reacted: boolean }>>();
                for (const r of dbReactions) {
                    if (!byMsg.has(r.message_id)) byMsg.set(r.message_id, new Map());
                    const msgMap = byMsg.get(r.message_id)!;
                    const existing = msgMap.get(r.emoji) || { count: 0, reacted: false };
                    existing.count += 1;
                    if (r.user_id === user.id || (user.authUserId && r.user_id === user.authUserId)) {
                        existing.reacted = true;
                    }
                    msgMap.set(r.emoji, existing);
                }

                for (const [msgId, emojiMap] of byMsg.entries()) {
                    const list: Array<{ emoji: string; count: number; reacted?: boolean }> = [];
                    for (const [emoji, item] of emojiMap.entries()) {
                        list.push({ emoji, count: item.count, reacted: item.reacted });
                    }
                    reactionsMap.set(msgId, list);
                }
            }
        }

        // Format messages in ascending chronological order for chat view
        const messages = sliced.reverse().map((m: any) => ({
            id: m.id,
            conversationId: m.conversation_id,
            content: m.content,
            type: m.type || "default",
            editedAt: m.edited_at,
            createdAt: m.created_at,
            author: {
                id: m.author?.id || "unknown",
                username: m.author?.username || "user",
                displayName: m.author?.display_name || "User",
                avatarUrl: m.author?.avatar_url,
                status: m.author?.status || "offline",
            },
            replyTo: m.reply_to_id ? replyMap.get(m.reply_to_id) || null : null,
            reactions: reactionsMap.get(m.id) || [],
            embeds: [],
        }));


    return NextResponse.json({ messages, nextCursor, hasMore });
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: conversationId } = await context.params;

    try {
        const body = await req.json();
        const content = (body.content || "").trim();
        const replyToId = body.replyToId || null;

        if (!content) {
            return NextResponse.json({ error: "Content cannot be empty" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // 1. Resolve author_id in public.users
        let actualAuthorId = user.id;
        const { data: userRow } = await supabase
            .from("users")
            .select("id")
            .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
            .maybeSingle();

        if (userRow?.id) {
            actualAuthorId = userRow.id;
        }

        // 2. Resolve or provision dm_conversation
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId);
        let actualConversationId = conversationId;

        let existingConvo: { id: string } | null = null;
        if (isUUID) {
            const { data } = await supabase.from("dm_conversations").select("id").eq("id", conversationId).maybeSingle();
            existingConvo = data;
        }

        if (!existingConvo) {
            const { data: createdConvo } = await supabase
                .from("dm_conversations")
                .insert({
                    id: isUUID ? conversationId : undefined,
                    type: "direct",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .select("id")
                .maybeSingle();

            if (createdConvo?.id) {
                actualConversationId = createdConvo.id;
                await supabase.from("dm_participants").insert({
                    conversation_id: actualConversationId,
                    user_id: actualAuthorId,
                });
            }
        }

        // 3. Validate reply_to_id in public.dm_messages
        let actualReplyToId: string | null = null;
        if (replyToId && typeof replyToId === "string") {
            const { data: parentMsg } = await supabase
                .from("dm_messages")
                .select("id")
                .eq("id", replyToId)
                .maybeSingle();

            if (parentMsg?.id) {
                actualReplyToId = parentMsg.id;
            }
        }

        const { data: message, error } = await supabase
            .from("dm_messages")
            .insert({
                conversation_id: actualConversationId,
                author_id: actualAuthorId,
                content,
                reply_to_id: actualReplyToId,
                type: "default",
            })
            .select(`
                id,
                conversation_id,
                content,
                type,
                edited_at,
                created_at,
                reply_to_id,
                author:users!dm_messages_author_id_fkey (
                    id,
                    username,
                    display_name,
                    avatar_url,
                    status
                )
            `)
            .single();

        if (error || !message) {
            console.error("[DM_MESSAGE_INSERT_FAILED]", { error, conversationId, author_id: actualAuthorId });
            return NextResponse.json({ error: error?.message || "Failed to send message" }, { status: 500 });
        }

        // Update conversation's updated_at timestamp
        await supabase
            .from("dm_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId);

        // If reply, fetch parent info
        let replyTo = null;
        if (message.reply_to_id) {
            const { data: parentMsg } = await supabase
                .from("dm_messages")
                .select("id, content, author:users!dm_messages_author_id_fkey(id, username, display_name)")
                .eq("id", message.reply_to_id)
                .maybeSingle();

            if (parentMsg) {
                replyTo = {
                    id: parentMsg.id,
                    content: parentMsg.content,
                    author: {
                        id: (parentMsg.author as any)?.id,
                        username: (parentMsg.author as any)?.username,
                        displayName: (parentMsg.author as any)?.display_name,
                    },
                };
            }
        }

        return NextResponse.json({
            message: {
                id: message.id,
                conversationId: message.conversation_id,
                content: message.content,
                type: message.type,
                editedAt: message.edited_at,
                createdAt: message.created_at,
                author: {
                    id: (message.author as any)?.id || actualAuthorId,
                    username: (message.author as any)?.username || user.username,
                    displayName: (message.author as any)?.display_name || user.displayName,
                    avatarUrl: (message.author as any)?.avatar_url,
                    status: (message.author as any)?.status || "offline",
                },
                replyTo,
                reactions: [],
                embeds: [],
            },
        });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
    }
}

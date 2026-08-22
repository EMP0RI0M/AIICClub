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
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "50", 10);
        const cursor = searchParams.get("cursor");

        const supabase = getSupabaseAdmin();

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(channelId);
        let targetChannelId = channelId;
        let matchedChannel: { id: string } | null = null;
        if (isUUID) {
            const { data } = await supabase.from("channels").select("id").eq("id", channelId).maybeSingle();
            matchedChannel = data;
        }
        if (!matchedChannel) {
            const { data } = await supabase.from("channels").select("id").ilike("name", channelId).maybeSingle();
            matchedChannel = data;
        }

        if (matchedChannel?.id) {
            targetChannelId = matchedChannel.id;
        }

        let query = supabase
            .from("messages")
            .select(`
                id,
                channel_id,
                author_id,
                content,
                type,
                reply_to_id,
                edited_at,
                created_at,
                author:users!author_id (
                    id,
                    username,
                    display_name,
                    avatar_url
                )
            `)
            .eq("channel_id", targetChannelId)
            .order("created_at", { ascending: false })
            .limit(limit + 1);

        if (cursor) {
            query = query.lt("created_at", cursor);
        }

        const { data: rawMessages, error } = await query;

        if (error) {
            console.error("Error fetching messages:", error);
            return NextResponse.json({ messages: [], nextCursor: null, hasMore: false });
        }

        const hasMore = (rawMessages?.length ?? 0) > limit;
        const messagesSlice = hasMore ? rawMessages.slice(0, limit) : rawMessages || [];

        // Fetch parent reply info if any
        const replyIds = messagesSlice.map((m: any) => m.reply_to_id).filter(Boolean);
        const replyMap = new Map<string, any>();
        if (replyIds.length > 0) {
            const { data: parentMsgs } = await supabase
                .from("messages")
                .select("id, content, author:users!author_id(id, username, display_name)")
                .in("id", replyIds);

            (parentMsgs || []).forEach((pm: any) => {
                replyMap.set(pm.id, {
                    id: pm.id,
                    content: pm.content,
                    author: {
                        id: pm.author?.id,
                        username: pm.author?.username,
                        displayName: pm.author?.display_name,
                    },
                });
            });
        }

        // Fetch reactions from public.reactions for these messages
        const messageIds = messagesSlice.map((m: any) => m.id);
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

        // Fetch pinned messages for this channel
        const { data: channelPins } = await supabase
            .from("pinned_messages")
            .select("message_id")
            .eq("channel_id", targetChannelId);

        const pinnedSet = new Set((channelPins || []).map((p: any) => p.message_id));

        const formattedMessages = messagesSlice.map((m: any) => ({
            id: m.id,
            channelId: m.channel_id,
            authorId: m.author_id,
            content: m.content,
            type: m.type || "default",
            replyTo: m.reply_to_id ? replyMap.get(m.reply_to_id) || null : null,
            pinned: pinnedSet.has(m.id),
            createdAt: m.created_at,
            updatedAt: m.edited_at || m.created_at,
            reactions: reactionsMap.get(m.id) || [],
            attachments: [],
            author: {
                id: m.author?.id || m.author_id,
                username: m.author?.username || "unknown",
                displayName: m.author?.display_name || m.author?.username || "User",
                avatarUrl: m.author?.avatar_url || null,
            },
        }));



        const nextCursor = hasMore && messagesSlice.length > 0
            ? messagesSlice[messagesSlice.length - 1].created_at
            : null;

        return NextResponse.json({
            messages: formattedMessages.reverse(),
            nextCursor,
            hasMore,
        });
    } catch (err: any) {
        console.error("GET /api/channels/[id]/messages error:", err);
        return NextResponse.json({ error: err.message || "Failed to fetch messages" }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: channelId } = await context.params;
        const body = await req.json();
        const { content, replyToId } = body;

        if (!content || typeof content !== "string" || !content.trim()) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // 1. Resolve author_id -> Must exist in public.users.id
        let actualAuthorId = user.id;
        const { data: userRow } = await supabase
            .from("users")
            .select("id")
            .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
            .maybeSingle();

        if (userRow?.id) {
            actualAuthorId = userRow.id;
        } else {
            // Ensure public.users row exists
            const fallbackUsername = (user.email.split("@")[0] || "user").replace(/[^a-zA-Z0-9_]/g, "_");
            const { data: createdUser } = await supabase
                .from("users")
                .upsert({
                    id: user.id,
                    auth_user_id: user.authUserId || user.id,
                    email: user.email,
                    username: user.username || fallbackUsername,
                    display_name: user.displayName || fallbackUsername,
                    status: "online",
                    onboarding_completed: true,
                    email_verified: true,
                }, { onConflict: "id" })
                .select("id")
                .single();

            if (createdUser?.id) {
                actualAuthorId = createdUser.id;
            }
        }

        // 2. Resolve channel_id -> Must exist in public.channels.id
        let actualChannelId = channelId;
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(channelId);

        let channelRow: { id: string } | null = null;
        if (isUUID) {
            const { data } = await supabase.from("channels").select("id").eq("id", channelId).maybeSingle();
            channelRow = data;
        }
        if (!channelRow) {
            const { data } = await supabase.from("channels").select("id").ilike("name", channelId).maybeSingle();
            channelRow = data;
        }

        if (channelRow?.id) {
            actualChannelId = channelRow.id;
        } else {
            // Check if any default channel exists
            const { data: defaultChannel } = await supabase
                .from("channels")
                .select("id")
                .order("position", { ascending: true })
                .limit(1)
                .maybeSingle();

            if (defaultChannel?.id) {
                actualChannelId = defaultChannel.id;
            } else {
                let serverId: string | null = null;
                const { data: server } = await supabase.from("servers").select("id").limit(1).maybeSingle();
                serverId = server?.id || null;
                if (!serverId) {
                    const { data: newServer } = await supabase.from("servers").insert({
                        name: "Main Space",
                        owner_id: actualAuthorId,
                    }).select("id").maybeSingle();
                    serverId = newServer?.id || null;
                }

                if (serverId) {
                    const cleanName = channelId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 30) || "general";
                    const { data: newChan } = await supabase.from("channels").insert({
                        server_id: serverId,
                        name: cleanName,
                        type: "text",
                        category: "General",
                        position: 0,
                    }).select("id").maybeSingle();
                    if (newChan?.id) {
                        actualChannelId = newChan.id;
                    }
                }
            }
        }

        // 3. Resolve reply_to_id -> Must exist in public.messages.id if provided
        let actualReplyToId: string | null = null;
        if (replyToId && typeof replyToId === "string") {
            const { data: parentMsg } = await supabase
                .from("messages")
                .select("id")
                .eq("id", replyToId)
                .maybeSingle();

            if (parentMsg?.id) {
                actualReplyToId = parentMsg.id;
            } else {
                console.warn("[MESSAGE_INSERT_REPLY_NOT_FOUND]", {
                    replyToId,
                    note: "Parent message was a local or mock ID; inserting message as a root message",
                });
                actualReplyToId = null;
            }
        }

        // Diagnostic log before insert
        console.log("[MESSAGE_INSERT]", {
            channel_id: actualChannelId,
            author_id: actualAuthorId,
            reply_to_id: actualReplyToId,
            type: "default",
            contentLength: content.trim().length,
        });

        const { data: inserted, error } = await supabase
            .from("messages")
            .insert({
                channel_id: actualChannelId,
                author_id: actualAuthorId,
                content: content.trim(),
                reply_to_id: actualReplyToId,
            })
            .select(`
                id,
                channel_id,
                author_id,
                content,
                type,
                reply_to_id,
                edited_at,
                created_at,
                author:users!author_id (
                    id,
                    username,
                    display_name,
                    avatar_url
                )
            `)
            .single();

        if (error || !inserted) {
            console.error("[MESSAGE_INSERT_FAILED]", {
                error: {
                    code: error?.code,
                    message: error?.message,
                    details: error?.details,
                    hint: error?.hint,
                },
                payload: {
                    channel_id: actualChannelId,
                    author_id: actualAuthorId,
                    reply_to_id: actualReplyToId,
                    type: "default",
                },
            });
            return NextResponse.json({ error: error?.message || "Failed to save message" }, { status: 500 });
        }

        let replyTo = null;
        if (inserted.reply_to_id) {
            const { data: parentMsg } = await supabase
                .from("messages")
                .select("id, content, author:users!author_id(id, username, display_name)")
                .eq("id", inserted.reply_to_id)
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

        const messageData = {
            id: inserted.id,
            channelId: inserted.channel_id,
            authorId: inserted.author_id,
            content: inserted.content,
            type: inserted.type || "default",
            replyTo,
            pinned: false,
            createdAt: inserted.created_at,
            updatedAt: inserted.edited_at || inserted.created_at,
            reactions: [],
            attachments: [],
            author: {
                id: (inserted.author as any)?.id || actualAuthorId,
                username: (inserted.author as any)?.username || user.username,
                displayName: (inserted.author as any)?.display_name || user.displayName,
                avatarUrl: (inserted.author as any)?.avatar_url || null,
            },
        };

        return NextResponse.json({ message: messageData }, { status: 201 });
    } catch (err: any) {
        console.error("POST /api/channels/[id]/messages error:", err);
        return NextResponse.json({ error: err.message || "Failed to send message" }, { status: 500 });
    }
}

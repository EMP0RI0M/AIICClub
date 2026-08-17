import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseAdmin();

    // 1. Fetch conversations for user
    const { data: convos, error } = await supabase
        .from("dm_participants")
        .select(`
            conversation_id,
            dm_conversations (
                id,
                name,
                type,
                updated_at,
                dm_participants (
                    user_id,
                    users (
                        id,
                        username,
                        display_name,
                        avatar_url,
                        status
                    )
                )
            )
        `)
        .eq("user_id", user.id);

    if (error) {
        return NextResponse.json({ conversations: [] });
    }

    const rawList = (convos || []).filter((c: any) => c.dm_conversations);
    const convoIds = rawList.map((c: any) => c.dm_conversations.id);

    // 2. Fetch the latest message for each conversation
    const lastMessageMap = new Map<string, { content: string; created_at: string; author_id: string }>();
    if (convoIds.length > 0) {
        const { data: latestMsgs } = await supabase
            .from("dm_messages")
            .select("conversation_id, content, created_at, author_id")
            .in("conversation_id", convoIds)
            .order("created_at", { ascending: false });

        (latestMsgs || []).forEach((m: any) => {
            if (!lastMessageMap.has(m.conversation_id)) {
                lastMessageMap.set(m.conversation_id, {
                    content: m.content,
                    created_at: m.created_at,
                    author_id: m.author_id,
                });
            }
        });
    }

    // 3. Deduplicate conversations by direct_key / peer_id
    const seenPeerMap = new Map<string, any>();

    for (const c of rawList) {
        const convo: any = Array.isArray(c.dm_conversations) ? c.dm_conversations[0] : c.dm_conversations;
        if (!convo) continue;

        const participants = (convo.dm_participants || [])
            .map((p: any) => p.users)
            .filter(Boolean)
            .map((u: any) => ({
                id: u.id,
                username: u.username,
                displayName: u.display_name,
                avatarUrl: u.avatar_url,
                status: u.status || "offline",
            }));

        const otherUser = participants.find((p: any) => p.id !== user.id) || participants[0];
        const peerKey = convo.type === "group" ? convo.id : (otherUser?.id || convo.id);
        const lastMsg = lastMessageMap.get(convo.id);

        const entry = {
            id: convo.id,
            name: convo.name,
            type: convo.type || (participants.length > 2 ? "group" : "direct"),
            participants,
            lastMessage: lastMsg ? {
                content: lastMsg.content,
                createdAt: lastMsg.created_at,
                isMe: lastMsg.author_id === user.id,
            } : null,
            updatedAt: lastMsg?.created_at || convo.updated_at,
        };

        if (!seenPeerMap.has(peerKey) || new Date(entry.updatedAt) > new Date(seenPeerMap.get(peerKey).updatedAt)) {
            seenPeerMap.set(peerKey, entry);
        }
    }

    const conversations = Array.from(seenPeerMap.values()).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json().catch(() => ({}));
        const { participantIds = [], name } = body;

        const allParticipantIds = Array.from(new Set([user.id, ...participantIds]));
        if (allParticipantIds.length < 2) {
            return NextResponse.json({ error: "At least one other participant is required" }, { status: 400 });
        }

        const isDirect = allParticipantIds.length === 2 && !name;
        const directKey = isDirect ? [...allParticipantIds].sort().join(":") : null;

        const supabase = getSupabaseAdmin();

        // If direct 1:1, check if already exists
        if (isDirect && directKey) {
            const { data: existing } = await supabase
                .from("dm_conversations")
                .select(`
                    id,
                    name,
                    type,
                    updated_at,
                    dm_participants (
                        user_id,
                        users (
                            id,
                            username,
                            display_name,
                            avatar_url,
                            status
                        )
                    )
                `)
                .eq("direct_key", directKey)
                .maybeSingle();

            if (existing) {
                const participants = (existing.dm_participants || [])
                    .map((p: any) => p.users)
                    .filter(Boolean)
                    .map((u: any) => ({
                        id: u.id,
                        username: u.username,
                        displayName: u.display_name,
                        avatarUrl: u.avatar_url,
                        status: u.status || "offline",
                    }));

                return NextResponse.json({
                    conversation: {
                        id: existing.id,
                        name: existing.name,
                        type: existing.type || "direct",
                        participants,
                        updatedAt: existing.updated_at,
                    },
                    created: false,
                });
            }
        }

        // Create new DM conversation
        const { data: convo, error } = await supabase
            .from("dm_conversations")
            .insert({
                name: name ?? null,
                type: isDirect ? "direct" : "group",
                direct_key: directKey,
                created_by_id: user.id,
            })
            .select()
            .single();

        if (error || !convo) {
            return NextResponse.json({ error: error?.message || "Could not create conversation" }, { status: 500 });
        }

        const inserts = allParticipantIds.map((uid) => ({
            conversation_id: convo.id,
            user_id: uid,
        }));
        await supabase.from("dm_participants").insert(inserts);

        // Fetch participant user objects
        const { data: participantUsers } = await supabase
            .from("users")
            .select("id, username, display_name, avatar_url, status")
            .in("id", allParticipantIds);

        const participants = (participantUsers || []).map((u) => ({
            id: u.id,
            username: u.username,
            displayName: u.display_name,
            avatarUrl: u.avatar_url,
            status: u.status || "offline",
        }));

        return NextResponse.json(
            {
                conversation: {
                    id: convo.id,
                    name: convo.name,
                    type: convo.type || (isDirect ? "direct" : "group"),
                    participants,
                    updatedAt: convo.updated_at,
                },
                created: true,
            },
            { status: 201 }
        );
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
    }
}

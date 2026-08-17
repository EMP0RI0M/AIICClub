import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string; messageId: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: conversationId, messageId } = await context.params;

    try {
        const body = await req.json();
        const content = (body.content || "").trim();
        if (!content) return NextResponse.json({ error: "Content cannot be empty" }, { status: 400 });

        const supabase = getSupabaseAdmin();

        const { data: message, error } = await supabase
            .from("dm_messages")
            .update({
                content,
                edited_at: new Date().toISOString(),
            })
            .eq("id", messageId)
            .eq("author_id", user.id)
            .eq("conversation_id", conversationId)
            .select(`
                id,
                conversation_id,
                content,
                type,
                edited_at,
                created_at,
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
            return NextResponse.json({ error: "Could not edit message" }, { status: 403 });
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
                    id: (message.author as any)?.id || user.id,
                    username: (message.author as any)?.username || user.username,
                    displayName: (message.author as any)?.display_name || user.displayName,
                    avatarUrl: (message.author as any)?.avatar_url,
                    status: (message.author as any)?.status || "offline",
                },
                replyTo: null,
                reactions: [],
                embeds: [],
            },
        });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string; messageId: string }> }
) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: conversationId, messageId } = await context.params;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
        .from("dm_messages")
        .delete()
        .eq("id", messageId)
        .eq("author_id", user.id)
        .eq("conversation_id", conversationId);

    if (error) {
        return NextResponse.json({ error: "Could not delete message" }, { status: 403 });
    }

    return NextResponse.json({ message: "Message deleted." });
}

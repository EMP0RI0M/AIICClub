import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: conversationId } = await params;

    const supabase = getSupabaseAdmin();
    const { data: pins } = await supabase
        .from("direct_messages")
        .select("id, content, created_at, sender:users!sender_id(id, display_name, username, avatar_url)")
        .eq("conversation_id", conversationId)
        .eq("is_pinned", true)
        .order("created_at", { ascending: false });

    return NextResponse.json({
        pins: (pins || []).map((p: any) => ({
            id: p.id,
            messageId: p.id,
            content: p.content,
            createdAt: p.created_at,
            author: p.sender ? {
                id: p.sender.id,
                displayName: p.sender.display_name,
                username: p.sender.username,
                avatarUrl: p.sender.avatar_url,
            } : null,
        }))
    });
}

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

        const { data: channel } = await supabase
            .from("channels")
            .select("id, name, server_id, type")
            .or(`id.eq.${channelId},name.eq.${channelId}`)
            .maybeSingle();

        const targetId = channel?.id || channelId;

        const { data: moduleRecord } = await supabase
            .from("channel_modules")
            .select("data")
            .eq("channel_id", targetId)
            .eq("type", "board")
            .maybeSingle();

        const defaultBoard = {
            id: `board_${targetId}`,
            name: channel?.name ? `${channel.name} Board` : "Project Board",
            columns: [
                { id: "c_todo", title: "To do", cards: [] },
                { id: "c_inprog", title: "In progress", cards: [] },
                { id: "c_done", title: "Done", cards: [] },
            ],
        };

        return NextResponse.json({
            board: moduleRecord?.data?.board || defaultBoard,
            channelId: targetId,
        });
    } catch (err: any) {
        console.error("[API GET /channels/[id]/board] error:", err);
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(
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
        const board = body.board || body.data?.board || body;

        const supabase = getSupabaseAdmin();

        const { data: channel } = await supabase
            .from("channels")
            .select("id")
            .or(`id.eq.${channelId},name.eq.${channelId}`)
            .maybeSingle();

        const targetId = channel?.id || channelId;

        try {
            await supabase
                .from("channel_modules")
                .upsert(
                    {
                        channel_id: targetId,
                        type: "board",
                        data: { board, updated_at: new Date().toISOString(), updated_by: user.id },
                    },
                    { onConflict: "channel_id,type" }
                );
        } catch {}

        return NextResponse.json({
            success: true,
            board,
            updatedAt: new Date().toISOString(),
        });
    } catch (err: any) {
        console.error("[API PUT /channels/[id]/board] error:", err);
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}

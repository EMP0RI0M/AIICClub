import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; messageId: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { messageId } = await params;

    const supabase = getSupabaseAdmin();
    await supabase.from("direct_messages").update({ is_pinned: true }).eq("id", messageId);
    return NextResponse.json({ message: "Pinned" });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; messageId: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { messageId } = await params;

    const supabase = getSupabaseAdmin();
    await supabase.from("direct_messages").update({ is_pinned: false }).eq("id", messageId);
    return NextResponse.json({ message: "Unpinned" });
}

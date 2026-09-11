import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const supabase = getSupabaseAdmin();
    const { data: sticker } = await supabase.from("stickers").select("*").eq("id", id).maybeSingle();
    if (!sticker) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ sticker });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const supabase = getSupabaseAdmin();
    await supabase.from("stickers").delete().eq("id", id);
    return NextResponse.json({ message: "Sticker deleted" });
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: list } = await supabase.from("stickers").select("*").order("created_at", { ascending: false });
    return NextResponse.json({ stickers: list || [] });
}

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();

    const supabase = getSupabaseAdmin();
    const { data: sticker, error } = await supabase.from("stickers").insert({
        name: body.name || "Sticker",
        url: body.url,
        creator_id: user.id,
    }).select().maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ sticker });
}

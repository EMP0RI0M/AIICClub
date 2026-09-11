import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: serverId } = await params;

    const supabase = getSupabaseAdmin();
    const { data: roles } = await supabase.from("roles").select("*").eq("server_id", serverId).order("position", { ascending: true });
    return NextResponse.json({ roles: roles || [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: serverId } = await params;
    const body = await req.json();

    const supabase = getSupabaseAdmin();
    const { data: role, error } = await supabase.from("roles").insert({
        server_id: serverId,
        name: body.name || "new role",
        color: body.color || "#99aab5",
        permissions: body.permissions || "0",
        position: body.position || 0,
    }).select().maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ role }, { status: 201 });
}

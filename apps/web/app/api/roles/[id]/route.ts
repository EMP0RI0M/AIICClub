import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: roleId } = await params;
    const body = await req.json();

    const supabase = getSupabaseAdmin();
    const { data: role, error } = await supabase.from("roles").update(body).eq("id", roleId).select().maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ role });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: roleId } = await params;

    const supabase = getSupabaseAdmin();
    await supabase.from("roles").delete().eq("id", roleId);
    return NextResponse.json({ message: "Role deleted" });
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: roleId, userId } = await params;

    const supabase = getSupabaseAdmin();
    await supabase.from("member_roles").upsert({ role_id: roleId, user_id: userId }, { onConflict: "role_id,user_id" });
    return NextResponse.json({ message: "Role assigned" });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: roleId, userId } = await params;

    const supabase = getSupabaseAdmin();
    await supabase.from("member_roles").delete().eq("role_id", roleId).eq("user_id", userId);
    return NextResponse.json({ message: "Role removed" });
}

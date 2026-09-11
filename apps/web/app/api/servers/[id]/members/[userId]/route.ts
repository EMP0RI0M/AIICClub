import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: serverId, userId: targetUserId } = await params;
    const body = await req.json();

    const supabase = getSupabaseAdmin();
    const { data: member, error } = await supabase
        .from("server_members")
        .update({ nickname: body.nickname, role: body.role })
        .eq("server_id", serverId)
        .eq("user_id", targetUserId)
        .select()
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ member });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: serverId, userId: targetUserId } = await params;

    const supabase = getSupabaseAdmin();
    await supabase
        .from("server_members")
        .delete()
        .eq("server_id", serverId)
        .eq("user_id", targetUserId);

    return NextResponse.json({ message: "Member removed" });
}

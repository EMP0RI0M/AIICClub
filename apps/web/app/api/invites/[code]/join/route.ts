import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function POST(req: NextRequest, context: { params: Promise<{ code: string }> }) {
    const user = await getAuthUser(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized. Please sign in to accept this invite.", reason: "unauthorized" }, { status: 401 });
    }

    const rawCode = (await context.params).code;
    const code = (rawCode || "").replace(/\/+$/, "").trim();

    if (!code) {
        return NextResponse.json({ error: "Invite code is required", reason: "invalid_code" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. First fetch invite details
    const { data: invite, error: fetchErr } = await supabase
        .from("invites")
        .select(`
            id,
            code,
            server_id,
            expires_at,
            max_uses,
            uses,
            server:servers!invites_server_id_fkey (
                id,
                name,
                icon_url,
                description
            )
        `)
        .eq("code", code)
        .maybeSingle();

    if (fetchErr) {
        console.error("[INVITE_JOIN_FETCH_ERROR]", { code, fetchErr });
        return NextResponse.json({ error: "Database error resolving invite.", reason: "db_error" }, { status: 500 });
    }

    if (!invite || !invite.server) {
        console.warn("[INVITE_JOIN_NOT_FOUND]", { code });
        return NextResponse.json({ error: "Invalid or expired invite code.", reason: "not_found" }, { status: 404 });
    }

    const serverId = (invite.server as any).id;
    const now = new Date();

    if (invite.expires_at && new Date(invite.expires_at) <= now) {
        return NextResponse.json({ error: "This invite has expired.", reason: "expired" }, { status: 410 });
    }

    if (invite.max_uses && invite.uses >= invite.max_uses) {
        return NextResponse.json({ error: "This invite has reached its maximum uses.", reason: "maxed" }, { status: 410 });
    }

    // 2. Check if already a member
    const { data: existingMember } = await supabase
        .from("server_members")
        .select("id, role")
        .eq("server_id", serverId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (existingMember) {
        return NextResponse.json({
            message: "You are already a member of this space.",
            alreadyMember: true,
            server: {
                id: serverId,
                name: (invite.server as any).name,
                iconUrl: (invite.server as any).icon_url,
            },
        });
    }

    // 3. Add user to server_members and increment uses count atomically
    const { error: insertMemberErr } = await supabase.from("server_members").insert({
        server_id: serverId,
        user_id: user.id,
        role: "member",
        joined_at: new Date().toISOString(),
    });

    if (insertMemberErr) {
        // If unique constraint collided, they are already a member
        if (insertMemberErr.code === "23505") {
            return NextResponse.json({
                message: "You are already a member of this space.",
                alreadyMember: true,
                server: {
                    id: serverId,
                    name: (invite.server as any).name,
                    iconUrl: (invite.server as any).icon_url,
                },
            });
        }

        console.error("[INVITE_JOIN_INSERT_ERROR]", { serverId, userId: user.id, insertMemberErr });
        return NextResponse.json({ error: "Failed to join space. Please try again.", reason: "insert_error" }, { status: 500 });
    }

    // Increment invite uses
    await supabase
        .from("invites")
        .update({ uses: (invite.uses || 0) + 1 })
        .eq("id", invite.id);

    return NextResponse.json({
        message: "Successfully joined space!",
        alreadyMember: false,
        server: {
            id: serverId,
            name: (invite.server as any).name,
            iconUrl: (invite.server as any).icon_url,
        },
    });
}

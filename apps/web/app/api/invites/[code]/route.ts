import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function GET(req: NextRequest, context: { params: Promise<{ code: string }> }) {
    const rawCode = (await context.params).code;
    const code = (rawCode || "").replace(/\/+$/, "").trim();

    if (!code) {
        return NextResponse.json({ error: "Invite code is required", reason: "invalid_code" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const user = await getAuthUser(req).catch(() => null);

    // 1. Fetch invite from public.invites
    const { data: invite, error } = await supabase
        .from("invites")
        .select(`
            id,
            code,
            server_id,
            expires_at,
            max_uses,
            uses,
            created_at,
            creator:users!invites_creator_id_fkey (
                id,
                username,
                display_name,
                avatar_url
            ),
            server:servers!invites_server_id_fkey (
                id,
                name,
                icon_url,
                description
            )
        `)
        .eq("code", code)
        .maybeSingle();

    if (error) {
        console.error("[INVITE_LOOKUP_DB_ERROR]", { code, error });
        return NextResponse.json({ error: "Database error resolving invite.", reason: "db_error" }, { status: 500 });
    }

    if (!invite || !invite.server) {
        console.warn("[INVITE_NOT_FOUND]", { code });
        return NextResponse.json({ error: "Invite not found. The link may be incorrect.", reason: "not_found" }, { status: 404 });
    }

    const serverId = (invite.server as any).id;
    const now = new Date();

    // Check expiration
    if (invite.expires_at && new Date(invite.expires_at) <= now) {
        return NextResponse.json({
            error: "This invite has expired.",
            reason: "expired",
            serverName: (invite.server as any).name,
        }, { status: 410 });
    }

    // Check max uses
    if (invite.max_uses && invite.uses >= invite.max_uses) {
        return NextResponse.json({
            error: "This invite has reached its maximum usage limit.",
            reason: "maxed",
            serverName: (invite.server as any).name,
        }, { status: 410 });
    }

    // Check member count
    const { count: memberCount } = await supabase
        .from("server_members")
        .select("*", { count: "exact", head: true })
        .eq("server_id", serverId);

    // Check if authenticated user is already a member
    let isMember = false;
    if (user) {
        const { data: member } = await supabase
            .from("server_members")
            .select("id")
            .eq("server_id", serverId)
            .eq("user_id", user.id)
            .maybeSingle();

        isMember = Boolean(member);
    }

    return NextResponse.json({
        invite: {
            id: invite.id,
            code: invite.code,
            serverId,
            serverName: (invite.server as any).name,
            serverIcon: (invite.server as any).icon_url,
            serverDescription: (invite.server as any).description,
            memberCount: memberCount || 1,
            inviterName: (invite.creator as any)?.display_name || (invite.creator as any)?.username || "AIIC Member",
            expiresAt: invite.expires_at,
            maxUses: invite.max_uses,
            uses: invite.uses,
            isMember,
        },
    });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ code: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rawCode = (await context.params).code;
    const code = (rawCode || "").replace(/\/+$/, "").trim();

    const supabase = getSupabaseAdmin();

    // Check authorization: creator of invite or space owner
    const { data: invite, error } = await supabase
        .from("invites")
        .select(`
            id,
            creator_id,
            server_id,
            server:servers!invites_server_id_fkey(owner_id)
        `)
        .eq("code", code)
        .maybeSingle();

    if (error || !invite) {
        return NextResponse.json({ error: "Invite not found." }, { status: 404 });
    }

    const isOwner = (invite.server as any)?.owner_id === user.id;
    const isCreator = invite.creator_id === user.id;

    if (!isOwner && !isCreator) {
        return NextResponse.json({ error: "Unauthorized to revoke this invite." }, { status: 403 });
    }

    // Delete or revoke the invite record
    const { error: deleteError } = await supabase
        .from("invites")
        .delete()
        .eq("code", code);

    if (deleteError) {
        console.error("[INVITE_REVOKE_ERROR]", { code, deleteError });
        return NextResponse.json({ error: "Failed to revoke invite." }, { status: 500 });
    }

    return NextResponse.json({ message: "Invite successfully revoked." });
}

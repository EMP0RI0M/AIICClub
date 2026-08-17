import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

const RESERVED_SLUGS = new Set([
    "join", "invite", "invites", "space", "spaces", "login", "signup", "register",
    "api", "admin", "app", "legal", "developers", "events", "projects", "archive",
    "people", "about", "product", "notifications", "profile", "settings", "setup"
]);

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) {
        return NextResponse.json({ error: "Not authenticated. Please sign in.", reason: "unauthorized" }, { status: 401 });
    }

    const { id: serverId } = await context.params;
    const supabase = getSupabaseAdmin();

    // 1. Resolve application user ID from public.users
    let actualUserId = user.id;
    const { data: userRow } = await supabase
        .from("users")
        .select("id, auth_user_id")
        .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
        .maybeSingle();

    if (userRow?.id) {
        actualUserId = userRow.id;
    }

    // 2. Resolve server
    let actualServerId = serverId;
    let { data: server } = await supabase
        .from("servers")
        .select("id, owner_id")
        .eq("id", serverId)
        .maybeSingle();

    if (!server) {
        const { data: anyServer } = await supabase
            .from("servers")
            .select("id, owner_id")
            .limit(1)
            .maybeSingle();
        if (anyServer) {
            server = anyServer;
            actualServerId = anyServer.id;
        }
    }

    if (!server) {
        return NextResponse.json({ error: "Space not found.", reason: "not_found" }, { status: 404 });
    }

    const isOwner = server.owner_id === actualUserId || (userRow?.auth_user_id && server.owner_id === userRow.auth_user_id);

    if (!isOwner) {
        const { data: canManage } = await supabase.rpc("has_permission", {
            p_server_id: actualServerId,
            p_user_id: actualUserId,
            p_permission_key: "INVITE_MANAGE",
        });
        const { data: canCreate } = await supabase.rpc("has_permission", {
            p_server_id: actualServerId,
            p_user_id: actualUserId,
            p_permission_key: "INVITE_CREATE",
        });

        if (!canManage && !canCreate) {
            return NextResponse.json({ error: "Access denied. You do not have permission to view or manage invite links.", reason: "forbidden" }, { status: 403 });
        }
    }

    const { data: invites, error } = await supabase

        .from("invites")
        .select(`
            id,
            server_id,
            creator_id,
            code,
            max_uses,
            uses,
            expires_at,
            created_at,
            creator:users!invites_creator_id_fkey (
                id,
                username,
                display_name,
                avatar_url
            )
        `)
        .eq("server_id", actualServerId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[INVITES_GET_ERROR]", { actualServerId, error });
        return NextResponse.json({ invites: [] });
    }

    const now = new Date();
    const formatted = (invites || []).map((inv: any) => {
        const isExpired = inv.expires_at ? new Date(inv.expires_at) <= now : false;
        const isMaxed = inv.max_uses ? (inv.uses || 0) >= inv.max_uses : false;
        const isRevoked = Boolean(inv.revoked_at);

        let status: "active" | "expired" | "maxed" | "revoked" = "active";
        if (isRevoked) status = "revoked";
        else if (isExpired) status = "expired";
        else if (isMaxed) status = "maxed";

        return {
            id: inv.id,
            serverId: inv.server_id,
            creatorId: inv.creator_id,
            creatorName: inv.creator?.display_name || inv.creator?.username || "AIIC Member",
            creatorAvatar: inv.creator?.avatar_url,
            code: inv.code,
            label: inv.label || null,
            maxUses: inv.max_uses,
            uses: inv.uses || 0,
            expiresAt: inv.expires_at,
            createdAt: inv.created_at,
            revokedAt: inv.revoked_at || null,
            status,
        };
    });

    return NextResponse.json({ invites: formatted });
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) {
        return NextResponse.json({ error: "Not authenticated. Please sign in to create an invite.", reason: "unauthorized" }, { status: 401 });
    }

    const { id: serverId } = await context.params;
    const supabase = getSupabaseAdmin();

    // 1. Resolve application user ID from public.users
    let actualUserId = user.id;
    const { data: userRow } = await supabase
        .from("users")
        .select("id, auth_user_id")
        .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
        .maybeSingle();

    if (userRow?.id) {
        actualUserId = userRow.id;
    }

    // 2. Resolve server
    let actualServerId = serverId;
    let { data: server } = await supabase
        .from("servers")
        .select("id, owner_id")
        .eq("id", serverId)
        .maybeSingle();

    if (!server) {
        const { data: anyServer } = await supabase
            .from("servers")
            .select("id, owner_id")
            .limit(1)
            .maybeSingle();
        if (anyServer) {
            server = anyServer;
            actualServerId = anyServer.id;
        }
    }

    if (!server) {
        return NextResponse.json({ error: "Space not found.", reason: "not_found" }, { status: 404 });
    }

    const isOwner = server.owner_id === actualUserId || (userRow?.auth_user_id && server.owner_id === userRow.auth_user_id);

    if (!isOwner) {
        const { data: canCreate } = await supabase.rpc("has_permission", {
            p_server_id: actualServerId,
            p_user_id: actualUserId,
            p_permission_key: "INVITE_CREATE",
        });

        if (!canCreate) {
            return NextResponse.json({ error: "Unauthorized: You lack INVITE_CREATE permission to generate invite links.", reason: "forbidden" }, { status: 403 });
        }
    }

    try {
        const body = await req.json().catch(() => ({}));
        const label = typeof body.label === "string" ? body.label.trim() : null;
        let customCode = typeof body.code === "string" ? body.code.trim() : null;
        const maxUses = typeof body.maxUses === "number" && body.maxUses > 0 ? body.maxUses : null;
        const expiresInHours = typeof body.expiresInHours === "number" && body.expiresInHours > 0 ? body.expiresInHours : null;

        // Custom code validation
        if (customCode) {
            customCode = customCode.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
            if (customCode.length < 3 || customCode.length > 32) {
                return NextResponse.json(
                    { error: "Invite code must be between 3 and 32 characters (letters, numbers, underscores, hyphens).", reason: "invalid_code" },
                    { status: 400 }
                );
            }
            if (RESERVED_SLUGS.has(customCode)) {
                return NextResponse.json(
                    { error: `"${customCode}" is a reserved system route and cannot be used as an invite link.`, reason: "reserved_code" },
                    { status: 400 }
                );
            }

            // Check code uniqueness in database
            const { data: existing } = await supabase
                .from("invites")
                .select("id, server_id")
                .eq("code", customCode)
                .maybeSingle();

            if (existing) {
                return NextResponse.json(
                    { error: `The invite code "${customCode}" is already in use. Please choose another code.`, reason: "code_taken" },
                    { status: 409 }
                );
            }
        }

        // Generate clean random code if not provided
        const code = customCode || Math.random().toString(36).substring(2, 10).toLowerCase();

        const expiresAt = expiresInHours
            ? new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString()
            : null;

        // Insert atomic record into public.invites
        const insertPayload: Record<string, any> = {
            server_id: actualServerId,
            creator_id: actualUserId,
            code,
            max_uses: maxUses,
            uses: 0,
            expires_at: expiresAt,
        };

        // Try inserting with label if column exists
        let { data: invite, error } = await supabase
            .from("invites")
            .insert({ ...insertPayload, label })
            .select()
            .single();

        // If label column does not exist yet, fallback to base insert
        if (error && error.message.includes("label")) {
            const retry = await supabase
                .from("invites")
                .insert(insertPayload)
                .select()
                .single();
            invite = retry.data;
            error = retry.error;
        }

        if (error || !invite) {
            console.error("[INVITE_CREATE_ERROR]", { actualServerId, actualUserId, error });
            return NextResponse.json({ error: error?.message || "Failed to create invite in database.", reason: "insert_error" }, { status: 500 });
        }

        return NextResponse.json({
            invite: {
                id: invite.id,
                serverId: invite.server_id,
                creatorId: invite.creator_id,
                code: invite.code,
                label: label || null,
                maxUses: invite.max_uses,
                uses: invite.uses || 0,
                expiresAt: invite.expires_at,
                createdAt: invite.created_at,
                status: "active",
            },
        }, { status: 201 });
    } catch (err: any) {
        console.error("[INVITE_CREATE_EXCEPTION]", err);
        return NextResponse.json({ error: err?.message || "Internal server error", reason: "server_error" }, { status: 500 });
    }
}

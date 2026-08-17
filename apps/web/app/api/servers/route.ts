import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { z } from "zod";

const createServerSchema = z.object({
    name: z.string().min(1, "Server name is required").max(100),
    iconUrl: z.string().url().nullable().optional(),
    description: z.string().max(500).nullable().optional(),
    channels: z
        .array(
            z.object({
                name: z.string().min(1).max(50),
                type: z.enum([
                    "text",
                    "voice",
                    "stage",
                    "announcement",
                    "board",
                    "docs",
                    "doc",
                    "canvas",
                    "github",
                    "incident",
                    "code"
                ]).default("text"),
                category: z.string().min(1).max(50).default("General"),
            })
        )
        .optional(),
});


// GET /api/servers — list user's servers with Global Governance oversight
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    let actualUserId = user.id;
    const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
        .maybeSingle();
    if (userRow?.id) actualUserId = userRow.id;

    // Check if user is an organizational global governor (President / Admin)
    const { data: globalGov } = await supabase
        .from("organization_role_assignments")
        .select("role:organization_roles(key)")
        .eq("user_id", actualUserId)
        .eq("is_active", true);

    const isGlobalGovernor = (globalGov || []).some((g: any) =>
        ["president_admin", "admin", "president"].includes(g.role?.key)
    );

    if (isGlobalGovernor) {
        // Global Governors automatically discover and oversee all spaces
        const { data: allServers, error: allErr } = await supabase
            .from("servers")
            .select(`
                id,
                name,
                icon_url,
                description,
                owner_id,
                created_at,
                owner:users!servers_owner_id_fkey(id, username, display_name)
            `)
            .order("created_at", { ascending: true });

        if (allErr) {
            console.error("[GET /api/servers] Governor error:", allErr);
            return NextResponse.json({ servers: [] });
        }

        const serverList = (allServers || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            iconUrl: s.icon_url,
            description: s.description,
            ownerId: s.owner_id,
            ownerName: s.owner?.display_name || s.owner?.username || "Leader",
            memberCount: 1,
            role: s.owner_id === actualUserId ? "owner" : "governor",
            isGovernor: s.owner_id !== actualUserId,
        }));

        return NextResponse.json({ servers: serverList });
    }

    // Regular members see only their joined / owned spaces
    const { data: memberships, error } = await supabase
        .from("server_members")
        .select(`
            role,
            joined_at,
            servers (
                id,
                name,
                icon_url,
                description,
                owner_id
            )
        `)
        .eq("user_id", actualUserId)
        .order("joined_at", { ascending: true });

    if (error) {
        console.error("[GET /api/servers] Error:", error);
        return NextResponse.json({ servers: [] });
    }

    const serverList = (memberships || [])
        .filter((m: any) => m.servers)
        .map((m: any) => ({
            id: m.servers.id,
            name: m.servers.name,
            iconUrl: m.servers.icon_url,
            description: m.servers.description,
            ownerId: m.servers.owner_id,
            memberCount: 1,
            role: m.role,
        }));

    return NextResponse.json({ servers: serverList });
}

// POST /api/servers — create unofficial space (strictly restricted to Team Leaders & Executive Leadership)
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    let actualUserId = user.id;
    const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
        .maybeSingle();
    if (userRow?.id) actualUserId = userRow.id;

    // 1. Authorize: Check if user is Executive Leadership or active Team Leader
    const { data: globalGov } = await supabase
        .from("organization_role_assignments")
        .select("role:organization_roles(key)")
        .eq("user_id", actualUserId)
        .eq("is_active", true);

    const isExec = (globalGov || []).some((g: any) =>
        ["president_admin", "admin", "president", "vice_president"].includes(g.role?.key)
    );

    const { data: teamLeaderRows } = await supabase
        .from("aiic_teams")
        .select("id, name")
        .eq("leader_user_id", actualUserId)
        .eq("is_active", true);

    const isTeamLeader = (teamLeaderRows && teamLeaderRows.length > 0);

    if (!isExec && !isTeamLeader) {
        return NextResponse.json({
            error: "Unauthorized: Only appointed Team Leaders and Executive Leadership can create unofficial spaces.",
            reason: "unauthorized_space_creation",
        }, { status: 403 });
    }

    // 2. Enforce hard limit of 2 unofficial spaces per Team Leader
    if (isTeamLeader && !isExec) {
        const { count, error: countErr } = await supabase
            .from("servers")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", actualUserId);

        if (count !== null && count >= 2) {
            return NextResponse.json({
                error: "Maximum limit reached: Each Team Leader can create a maximum of 2 unofficial spaces (2/2 used).",
                reason: "limit_reached",
            }, { status: 400 });
        }
    }


    const body = await req.json().catch(() => ({}));
    const parsed = createServerSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, iconUrl, description, channels: templateChannels } = parsed.data;
    const channelsToCreate = templateChannels && templateChannels.length > 0
        ? templateChannels.map((ch, i) => ({
            name: ch.name,
            type: ch.type,
            category: ch.category,
            position: i,
        }))
        : [{ name: "general", type: "text" as const, category: "General", position: 0 }];

    // 3. Insert unofficial space
    const { data: serverRecord, error: serverErr } = await supabase
        .from("servers")
        .insert({
            name,
            icon_url: iconUrl ?? null,
            description: description ?? null,
            owner_id: actualUserId,
        })
        .select()
        .single();

    if (serverErr || !serverRecord) {
        console.error("CREATE_SPACE_SERVER_INSERT_ERROR:", serverErr);
        return NextResponse.json({ error: "Could not create the space." }, { status: 500 });
    }

    const serverId = serverRecord.id;

    // 4. Add owner membership
    await supabase.from("server_members").insert({
        server_id: serverId,
        user_id: actualUserId,
        role: "owner",
    });

    // 5. Insert channels
    const channelInserts = channelsToCreate.map((ch) => ({
        server_id: serverId,
        name: ch.name,
        type: ch.type,
        category: ch.category,
        position: ch.position,
    }));

    const { data: insertedChs } = await supabase
        .from("channels")
        .insert(channelInserts)
        .select();

    // 6. Audit log
    await supabase.from("aiic_audit_logs").insert({
        server_id: serverId,
        actor_user_id: actualUserId,
        action: "UNOFFICIAL_SPACE_CREATED",
        category: "organization",
        entity_type: "servers",
        entity_id: serverId,
        metadata: {
            name,
            creator_user_id: actualUserId,
            is_team_leader: isTeamLeader,
        },
    });

    const createdChannels = (insertedChs || []).map((ch: any) => ({
        id: ch.id,
        serverId: ch.server_id,
        name: ch.name,
        type: ch.type,
        category: ch.category,
        position: ch.position,
    }));

    return NextResponse.json({
        server: {
            id: serverRecord.id,
            name: serverRecord.name,
            iconUrl: serverRecord.icon_url,
            description: serverRecord.description,
            ownerId: serverRecord.owner_id,
            memberCount: 1,
            role: "owner",
            channels: createdChannels,
        },
    }, { status: 201 });
}


import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { DEFAULT_MEMBER_PERMISSIONS, ADMIN_PERMISSIONS } from "../lib/permissions.js";
import { CHANNEL_TYPES, ensureChannelModuleStates } from "../lib/module-state.js";

const servers = new Hono<AuthEnv>();

servers.use("*", authMiddleware);

// ─── Validation Schemas ─────────────────────────────────────────

const channelTemplateSchema = z.object({
    name: z.string().min(1).max(100),
    type: z.enum(CHANNEL_TYPES),
    category: z.string().min(1).max(100),
});

const createServerSchema = z.object({
    name: z.string().min(1, "Server name is required").max(100),
    iconUrl: z.string().url().optional(),
    description: z.string().max(500).optional(),
    channels: z.array(channelTemplateSchema).max(20).optional(),
});

const updateServerSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    iconUrl: z.string().url().nullable().optional(),
    description: z.string().max(500).nullable().optional(),
});

// ─── POST /servers — Create server ──────────────────────────────

servers.post("/", async (c) => {
    const userId = c.get("userId");

    let body: unknown;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: "Invalid JSON in request body." }, 400);
    }

    const parsed = createServerSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: parsed.error.issues[0].message }, 400);
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

    // Step 1: Verify authenticated user exists in database
    const supabase = (await import("../lib/supabase.js")).getSupabaseAdmin();
    const { data: userExists, error: userCheckErr } = await supabase
        .from("users")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

    if (userCheckErr || !userExists) {
        console.error("CREATE_SPACE_ERROR: User does not exist or auth failed:", { userId, error: userCheckErr });
        return c.json({ error: "User authentication record not found. Please log in again." }, 401);
    }

    // Step 2: Create the server record
    let serverRecord;
    try {
        const { data, error } = await supabase
            .from("servers")
            .insert({
                name,
                icon_url: iconUrl ?? null,
                description: description ?? null,
                owner_id: userId,
            })
            .select()
            .single();

        if (error) {
            console.error("CREATE_SPACE_SERVER_INSERT_ERROR:", error);
            return c.json({ error: "Could not create the space. Database constraint or permission issue." }, 500);
        }
        serverRecord = data;
    } catch (err: any) {
        console.error("CREATE_SPACE_SERVER_INSERT_ERROR (Exception):", err);
        return c.json({ error: "Could not create the space." }, 500);
    }

    const serverId = serverRecord.id;

    // Step 3: Add owner membership
    try {
        const { error: memberError } = await supabase.from("server_members").insert({
            server_id: serverId,
            user_id: userId,
            role: "owner",
        });
        if (memberError) {
            console.error("CREATE_SPACE_MEMBERSHIP_ERROR:", memberError);
        }
    } catch (err) {
        console.error("CREATE_SPACE_MEMBERSHIP_ERROR (Exception):", err);
    }

    // Step 4: Insert initial channels
    let createdChannels: any[] = [];
    try {
        const channelInserts = channelsToCreate.map((ch) => ({
            server_id: serverId,
            name: ch.name,
            type: ch.type,
            category: ch.category,
            position: ch.position,
        }));
        const { data: insertedChs, error: channelError } = await supabase
            .from("channels")
            .insert(channelInserts)
            .select();

        if (channelError) {
            console.error("CREATE_SPACE_CHANNEL_ERROR:", channelError);
        }

        createdChannels = (insertedChs || []).map((ch: any) => ({
            id: ch.id,
            serverId: ch.server_id,
            name: ch.name,
            type: ch.type,
            category: ch.category,
            topic: ch.topic,
            position: ch.position,
            createdAt: ch.created_at,
        }));
    } catch (err) {
        console.error("CREATE_SPACE_CHANNEL_ERROR (Exception):", err);
    }

    // Step 4: Create default roles
    try {
        await Promise.all([
            supabase.from("roles").insert({
                server_id: serverId,
                name: "@everyone",
                permissions: DEFAULT_MEMBER_PERMISSIONS,
                position: 0,
                is_default: true,
            }),
            supabase.from("roles").insert({
                server_id: serverId,
                name: "Admin",
                color: "#7C3AED",
                permissions: ADMIN_PERMISSIONS,
                position: 100,
                is_default: false,
            }),
        ]);
    } catch (err) {
        console.error("[POST /servers] Failed to create roles:", err);
    }

    return c.json({
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
    }, 201);
});

// ─── GET /servers — List user's servers ─────────────────────────

servers.get("/", async (c) => {
    const userId = c.get("userId");
    const supabase = (await import("../lib/supabase.js")).getSupabaseAdmin();

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
        .eq("user_id", userId)
        .order("joined_at", { ascending: true });

    if (error) {
        console.error("[GET /servers] Error fetching memberships:", error);
        return c.json({ servers: [] });
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

    return c.json({ servers: serverList });
});

// ─── GET /servers/:id — Get server details ──────────────────────

servers.get("/:id", async (c) => {
    const userId = c.get("userId");
    const serverId = c.req.param("id");

    // Verify membership
    const membership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId } },
    });

    if (!membership) {
        return c.json({ error: "Server not found or you are not a member." }, 404);
    }

    const server = await prisma.server.findUnique({
        where: { id: serverId },
        include: {
            channels: { orderBy: [{ category: "asc" }, { position: "asc" }] },
            _count: { select: { members: true } },
        },
    });

    if (!server) {
        return c.json({ error: "Server not found." }, 404);
    }

    // Compute unread counts per channel
    const channelIds = server.channels.filter((ch) => ch.type === "text").map((ch) => ch.id);
    const reads = await prisma.channelRead.findMany({
        where: { userId, channelId: { in: channelIds } },
        select: { channelId: true, lastReadAt: true },
    });
    const readMap = new Map(reads.map((r) => [r.channelId, r.lastReadAt]));

    // Count unread messages per channel (messages after lastReadAt, not authored by current user)
    const unreadCounts: Record<string, number> = {};
    if (channelIds.length > 0) {
        const countResults = await Promise.all(
            channelIds.map(async (chId) => {
                const lastRead = readMap.get(chId);
                const count = await prisma.message.count({
                    where: {
                        channelId: chId,
                        authorId: { not: userId },
                        ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
                    },
                });
                return { channelId: chId, count };
            })
        );
        for (const { channelId: chId, count } of countResults) {
            if (count > 0) unreadCounts[chId] = count;
        }
    }

    return c.json({
        server: {
            ...server,
            memberCount: server._count.members,
            role: membership.role,
        },
        unreadCounts,
    });
});

// ─── PATCH /servers/:id — Update server ─────────────────────────

servers.patch("/:id", async (c) => {
    const userId = c.get("userId");
    const serverId = c.req.param("id");

    const membership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId } },
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
        return c.json({ error: "You do not have permission to update this server." }, 403);
    }

    const body = await c.req.json();
    const result = updateServerSchema.safeParse(body);

    if (!result.success) {
        return c.json({ error: result.error.issues[0].message }, 400);
    }

    const updateData: Record<string, unknown> = {};
    if (result.data.name !== undefined) updateData.name = result.data.name;
    if (result.data.iconUrl !== undefined) updateData.iconUrl = result.data.iconUrl;
    if (result.data.description !== undefined) updateData.description = result.data.description;

    const server = await prisma.server.update({
        where: { id: serverId },
        data: updateData,
    });

    return c.json({ server });
});

// ─── DELETE /servers/:id — Delete server ────────────────────────

servers.delete("/:id", async (c) => {
    const userId = c.get("userId");
    const serverId = c.req.param("id");

    const server = await prisma.server.findUnique({
        where: { id: serverId },
    });

    if (!server) {
        return c.json({ error: "Server not found." }, 404);
    }

    if (server.ownerId !== userId) {
        return c.json({ error: "Only the server owner can delete the server." }, 403);
    }

    await prisma.server.delete({ where: { id: serverId } });

    return c.json({ message: "Server deleted." });
});

export default servers;

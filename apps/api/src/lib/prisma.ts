import { getSupabaseAdmin } from "./supabase.js";

/**
 * Adapter that provides the database API using Supabase (@supabase/supabase-js)
 * replacing Prisma with full support for filtering and relations.
 */

function camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function mapObjectKeys(obj: any, mapper: (k: string) => string): any {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map((item) => mapObjectKeys(item, mapper));
    if (obj instanceof Date) return obj;
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
        result[mapper(key)] = mapObjectKeys(value, mapper);
    }
    return result;
}

function applyWhereFilters(query: any, where: Record<string, any>) {
    for (const [key, val] of Object.entries(where)) {
        if (val === undefined) continue;
        const column = camelToSnake(key);

        if (val !== null && typeof val === "object") {
            if ("in" in val && Array.isArray(val.in)) {
                query = query.in(column, val.in);
            } else if ("equals" in val) {
                if (val.mode === "insensitive") {
                    query = query.ilike(column, val.equals);
                } else {
                    query = query.eq(column, val.equals);
                }
            } else if ("not" in val) {
                query = query.neq(column, val.not);
            } else if ("contains" in val) {
                query = query.ilike(column, `%${val.contains}%`);
            } else if ("gt" in val) {
                query = query.gt(column, val.gt);
            } else if ("gte" in val) {
                query = query.gte(column, val.gte);
            } else if ("lt" in val) {
                query = query.lt(column, val.lt);
            } else if ("lte" in val) {
                query = query.lte(column, val.lte);
            }
        } else if (val === null) {
            query = query.is(column, null);
        } else {
            query = query.eq(column, val);
        }
    }
    return query;
}

function createTableProxy(tableName: string) {
    const supabase = getSupabaseAdmin();

    return {
        async findUnique(args: { where: Record<string, any>; select?: any; include?: any }) {
            let query = supabase.from(tableName).select("*");
            query = applyWhereFilters(query, args.where);
            const { data, error } = await query.limit(1).maybeSingle();
            if (error) console.error(`[Supabase DB error: ${tableName}.findUnique]`, error);
            return data ? mapObjectKeys(data, snakeToCamel) : null;
        },

        async findFirst(args: { where?: Record<string, any>; orderBy?: any; select?: any; include?: any }) {
            let query = supabase.from(tableName).select("*");
            if (args.where) {
                query = applyWhereFilters(query, args.where);
            }
            if (args.orderBy) {
                for (const [col, order] of Object.entries(args.orderBy)) {
                    query = query.order(camelToSnake(col), { ascending: order === "asc" });
                }
            }
            const { data, error } = await query.limit(1).maybeSingle();
            if (error) console.error(`[Supabase DB error: ${tableName}.findFirst]`, error);
            return data ? mapObjectKeys(data, snakeToCamel) : null;
        },

        async findMany(args?: { where?: Record<string, any>; orderBy?: any; take?: number; skip?: number; select?: any; include?: any }) {
            let query = supabase.from(tableName).select("*");
            if (args?.where) {
                query = applyWhereFilters(query, args.where);
            }
            if (args?.orderBy) {
                if (Array.isArray(args.orderBy)) {
                    for (const orderItem of args.orderBy) {
                        for (const [col, order] of Object.entries(orderItem)) {
                            query = query.order(camelToSnake(col), { ascending: order === "asc" });
                        }
                    }
                } else {
                    for (const [col, order] of Object.entries(args.orderBy)) {
                        query = query.order(camelToSnake(col), { ascending: order === "asc" });
                    }
                }
            }
            if (args?.take) query = query.limit(args.take);
            const { data, error } = await query;
            if (error) console.error(`[Supabase DB error: ${tableName}.findMany]`, error);
            return (data || []).map((row) => mapObjectKeys(row, snakeToCamel));
        },

        async create(args: { data: Record<string, any>; select?: any; include?: any }) {
            const dbData = mapObjectKeys(args.data, camelToSnake);
            const { data, error } = await supabase.from(tableName).insert(dbData).select().single();
            if (error) {
                console.error(`[Supabase DB error: ${tableName}.create]`, error);
                throw error;
            }
            return mapObjectKeys(data, snakeToCamel);
        },

        async update(args: { where: Record<string, any>; data: Record<string, any>; select?: any; include?: any }) {
            const dbData = mapObjectKeys(args.data, camelToSnake);
            let query = supabase.from(tableName).update(dbData);
            query = applyWhereFilters(query, args.where);
            const { data, error } = await query.select().single();
            if (error) {
                console.error(`[Supabase DB error: ${tableName}.update]`, error);
                throw error;
            }
            return mapObjectKeys(data, snakeToCamel);
        },

        async upsert(args: { where: Record<string, any>; create: Record<string, any>; update: Record<string, any> }) {
            const existing = await this.findUnique({ where: args.where });
            if (existing) {
                return this.update({ where: args.where, data: args.update });
            }
            return this.create({ data: args.create });
        },

        async delete(args: { where: Record<string, any> }) {
            let query = supabase.from(tableName).delete();
            query = applyWhereFilters(query, args.where);
            const { data, error } = await query.select().single();
            if (error) {
                console.error(`[Supabase DB error: ${tableName}.delete]`, error);
                throw error;
            }
            return mapObjectKeys(data, snakeToCamel);
        },

        async count(args?: { where?: Record<string, any> }) {
            let query = supabase.from(tableName).select("*", { count: "exact", head: true });
            if (args?.where) {
                query = applyWhereFilters(query, args.where);
            }
            const { count, error } = await query;
            if (error) console.error(`[Supabase DB error: ${tableName}.count]`, error);
            return count ?? 0;
        },
    };
}

const tableMapping: Record<string, string> = {
    user: "users",
    server: "servers",
    channel: "channels",
    message: "messages",
    messageEmbed: "message_embeds",
    reaction: "reactions",
    invite: "invites",
    friendRequest: "friend_requests",
    friend: "friends",
    userBlock: "user_blocks",
    sticker: "stickers",
    dmConversation: "dm_conversations",
    dMConversation: "dm_conversations",
    dmParticipant: "dm_participants",
    dMParticipant: "dm_participants",
    dmMessage: "dm_messages",
    dMMessage: "dm_messages",
    pinnedDmMessage: "pinned_dm_messages",
    pinnedDMMessage: "pinned_dm_messages",
    pinnedMessage: "pinned_messages",
    role: "roles",
    serverMember: "server_members",
    serverMemberRole: "server_member_roles",
    voiceParticipant: "voice_participants",
    stageParticipant: "stage_participants",
    callRoom: "call_rooms",
    callParticipant: "call_participants",
    channelPermissionOverride: "channel_permission_overrides",
    channelBoard: "channel_boards",
    channelDocs: "channel_docs",
    channelIncident: "channel_incidents",
    channelCanvas: "channel_canvases",
    channelGitHub: "channel_github",
    userSettings: "user_settings",
    serverSettings: "server_settings",
    waitlistEntry: "waitlist_entries",
    channelRead: "channel_reads",
};

export const prisma = new Proxy(
    {},
    {
        get(_, prop: string) {
            if (prop === "$transaction") {
                return async (callback: (tx: any) => Promise<any>) => callback(prisma);
            }
            const tableName = tableMapping[prop] || camelToSnake(prop);
            return createTableProxy(tableName);
        },
    },
) as any;

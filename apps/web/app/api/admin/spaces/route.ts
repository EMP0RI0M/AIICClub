import { NextRequest, NextResponse } from "next/server";
import { verifyAdminBoardAccess } from "@/shared/lib/admin-auth";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function GET(req: NextRequest) {
    const auth = await verifyAdminBoardAccess(req);
    if (!auth.authorized || !auth.user) {
        return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 403 });
    }

    const supabase = getSupabaseAdmin();

    try {
        // Fetch all spaces
        const { data: spaces, error } = await supabase
            .from("servers")
            .select("id, name, icon_url, description, owner_id, created_at, owner:users!owner_id(id, username, display_name, email)")
            .order("created_at", { ascending: false });

        if (error) throw error;

        const spaceIds = (spaces || []).map((s) => s.id);

        // Fetch channel counts
        const { data: channels } = await supabase
            .from("channels")
            .select("id, server_id, type")
            .in("server_id", spaceIds);

        const channelCountMap = new Map<string, number>();
        const channelTypeMap = new Map<string, string[]>();
        (channels || []).forEach((ch: any) => {
            channelCountMap.set(ch.server_id, (channelCountMap.get(ch.server_id) || 0) + 1);
            const types = channelTypeMap.get(ch.server_id) || [];
            if (!types.includes(ch.type)) types.push(ch.type);
            channelTypeMap.set(ch.server_id, types);
        });

        // Fetch member counts
        const { data: members } = await supabase
            .from("server_members")
            .select("server_id, user_id")
            .in("server_id", spaceIds);

        const memberCountMap = new Map<string, number>();
        (members || []).forEach((m: any) => {
            memberCountMap.set(m.server_id, (memberCountMap.get(m.server_id) || 0) + 1);
        });

        const list = (spaces || []).map((s: any) => {
            // Determine if official or unofficial
            const isOfficial = s.name.toLowerCase().includes("aiic club") || s.name.toLowerCase().includes("official");
            return {
                id: s.id,
                name: s.name,
                iconUrl: s.icon_url,
                description: s.description,
                ownerId: s.owner_id,
                owner: s.owner
                    ? {
                          id: s.owner.id,
                          username: s.owner.username,
                          displayName: s.owner.display_name || s.owner.username,
                          email: s.owner.email,
                      }
                    : null,
                isOfficial,
                channelCount: channelCountMap.get(s.id) || 0,
                channelTypes: channelTypeMap.get(s.id) || [],
                memberCount: memberCountMap.get(s.id) || 0,
                createdAt: s.created_at,
            };
        });

        return NextResponse.json({ spaces: list });
    } catch (err: any) {
        console.error("[ADMIN_SPACES_GET_ERROR]", err);
        return NextResponse.json({ error: "Failed to fetch spaces." }, { status: 500 });
    }
}

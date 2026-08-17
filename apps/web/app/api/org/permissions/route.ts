import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const spaceId = searchParams.get("spaceId");
    if (!spaceId) {
        return NextResponse.json({ error: "spaceId is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    try {
        // Resolve actual public.users ID
        let actualUserId = user.id;
        const { data: userRow } = await supabase
            .from("users")
            .select("id")
            .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
            .maybeSingle();

        if (userRow?.id) actualUserId = userRow.id;

        // 1. Get effective permissions from RPC
        const { data: permsData, error: permsError } = await supabase
            .rpc("get_user_effective_permissions", {
                p_server_id: spaceId,
                p_user_id: actualUserId,
            });

        const permissions = (permsData || []).map((p: any) => p.permission_key);

        // 2. Get active role in space
        const { data: roleData } = await supabase
            .from("organization_role_assignments")
            .select("role:organization_roles(id, key, name, hierarchy_level)")
            .eq("server_id", spaceId)
            .eq("user_id", actualUserId)
            .eq("is_active", true)
            .order("starts_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        // 3. Check if team leader
        const { data: teamLead } = await supabase
            .from("aiic_teams")
            .select("id")
            .eq("server_id", spaceId)
            .eq("leader_user_id", actualUserId)
            .eq("is_active", true)
            .limit(1)
            .maybeSingle();

        let role = (roleData as any)?.role?.key;
        let roleName = (roleData as any)?.role?.name;
        let hierarchyLevel = (roleData as any)?.role?.hierarchy_level;

        if (!role) {
            // Check global organizational leadership
            const { data: globalGov } = await supabase
                .from("organization_role_assignments")
                .select("role:organization_roles(id, key, name, hierarchy_level)")
                .eq("user_id", actualUserId)
                .eq("is_active", true)
                .order("starts_at", { ascending: false });

            const govRole: any = (globalGov || []).find((g: any) =>
                ["president_admin", "admin", "president"].includes(g.role?.key)
            )?.role;

            if (govRole) {
                role = govRole.key;
                roleName = govRole.name;
                hierarchyLevel = govRole.hierarchy_level;
            } else {

                // Check if user is space owner
                const { data: spaceRow } = await supabase
                    .from("servers")
                    .select("owner_id")
                    .eq("id", spaceId)
                    .maybeSingle();

                if (spaceRow?.owner_id === actualUserId) {
                    role = "owner";
                    roleName = "Space Owner";
                    hierarchyLevel = 95;
                } else {
                    role = "visitor";
                    roleName = "Visitor";
                    hierarchyLevel = 10;
                }
            }
        }

        let effectivePerms = permissions;
        if (["president", "president_admin", "admin"].includes(role)) {
            const { data: allPerms } = await supabase.from("permissions").select("key");
            effectivePerms = (allPerms || []).map((p: any) => p.key);
        } else if (role === "owner") {
            // Space Owners get local space management permissions, NOT organizational governance
            const { data: spacePerms } = await supabase
                .from("permissions")
                .select("key")
                .not("category", "in", '("organization","leadership","governance")')
                .not("key", "ilike", "ORG_%");
            effectivePerms = (spacePerms || []).map((p: any) => p.key);
        }

        return NextResponse.json({
            role,
            roleName,
            hierarchyLevel,
            permissions: effectivePerms,
            isTeamLeader: Boolean(teamLead?.id),
        });


    } catch (err: any) {
        console.error("[PERMISSIONS_API_ERROR]", err);
        return NextResponse.json({
            role: "visitor",
            roleName: "Visitor",
            hierarchyLevel: 10,
            permissions: ["MESSAGE_SEND", "REACTION_ADD", "BOARD_VIEW", "DOCS_VIEW"],
            isTeamLeader: false,
        });
    }

}

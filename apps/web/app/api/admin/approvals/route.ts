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
        // Fetch all users with status "pending", or recently registered visitor users
        const { data: users, error } = await supabase
            .from("users")
            .select("id, email, username, display_name, avatar_url, bio, status, role, created_at, interests, skills, leadership_title")
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Fetch their active role assignments
        const userIds = (users || []).map((u) => u.id);
        const { data: assignments } = await supabase
            .from("organization_role_assignments")
            .select("user_id, is_active, role:organization_roles(id, key, name, hierarchy_level)")
            .in("user_id", userIds)
            .eq("is_active", true);

        const assignmentMap = new Map<string, any>();
        (assignments || []).forEach((a: any) => {
            assignmentMap.set(a.user_id, a.role);
        });

        // Get approval audit history
        const { data: audits } = await supabase
            .from("aiic_audit_logs")
            .select("target_user_id, action, metadata, created_at, actor:users!actor_user_id(username, display_name)")
            .in("target_user_id", userIds)
            .in("action", ["USER_APPROVED", "USER_REJECTED", "USER_SUSPENDED", "USER_RESTORED"])
            .order("created_at", { ascending: false });

        const auditMap = new Map<string, any[]>();
        (audits || []).forEach((aud: any) => {
            const list = auditMap.get(aud.target_user_id) || [];
            list.push(aud);
            auditMap.set(aud.target_user_id, list);
        });

        const queue = (users || []).map((u) => {
            const activeRole = assignmentMap.get(u.id);
            return {
                id: u.id,
                email: u.email,
                username: u.username,
                displayName: u.display_name || u.username,
                avatarUrl: u.avatar_url,
                bio: u.bio,
                status: u.status || "active",
                roleKey: activeRole?.key || u.role || "visitor",
                roleName: activeRole?.name || "Visitor",
                hierarchyLevel: activeRole?.hierarchy_level || 10,
                createdAt: u.created_at,
                interests: u.interests,
                skills: u.skills,
                leadershipTitle: u.leadership_title,
                history: auditMap.get(u.id) || [],
            };
        });

        return NextResponse.json({ queue });
    } catch (err: any) {
        console.error("[ADMIN_APPROVALS_GET_ERROR]", err);
        return NextResponse.json({ error: "Failed to fetch approval queue." }, { status: 500 });
    }
}

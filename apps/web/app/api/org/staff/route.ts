import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const spaceId = searchParams.get("spaceId");
    if (!spaceId) return NextResponse.json({ error: "spaceId is required" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    try {
        // Ensure default staff positions exist
        let { data: positions } = await supabase
            .from("aiic_staff_positions")
            .select("id, name, key, description")
            .eq("server_id", spaceId);

        if (!positions || positions.length === 0) {
            const seedPositions = [
                { server_id: spaceId, key: "technical", name: "Technical Operations", description: "Architecture, engineering, bot management, and systems infrastructure" },
                { server_id: spaceId, key: "operations", name: "Executive Operations", description: "Scheduling, event coordination, project management, and workspace administration" },
                { server_id: spaceId, key: "education", name: "Education & Mentorship", description: "Curriculum oversight, tutoring, doc authoring, and student support" },
                { server_id: spaceId, key: "community", name: "Community & Moderation", description: "Member onboarding, community safety, announcements, and incident reporting" },
            ];

            for (const sp of seedPositions) {
                await supabase.from("aiic_staff_positions").upsert(sp, { onConflict: "server_id,key" });
            }

            const { data: updatedPos } = await supabase
                .from("aiic_staff_positions")
                .select("id, name, key, description")
                .eq("server_id", spaceId);

            positions = updatedPos || [];
        }

        // Fetch active assignments
        const { data: assignments } = await supabase
            .from("aiic_staff_assignments")
            .select(`
                id,
                position_id,
                user_id,
                starts_at,
                user:users!user_id (
                    id,
                    username,
                    display_name,
                    avatar_url
                )
            `)
            .eq("server_id", spaceId)
            .eq("is_active", true);

        const assignmentsByPos: Record<string, any[]> = {};
        (assignments || []).forEach((a: any) => {
            if (!assignmentsByPos[a.position_id]) assignmentsByPos[a.position_id] = [];
            assignmentsByPos[a.position_id].push({
                id: a.user?.id || a.user_id,
                displayName: a.user?.display_name || a.user?.username || "Staff",
                username: a.user?.username || "staff",
                avatarUrl: a.user?.avatar_url || null,
                startsAt: a.starts_at,
            });
        });

        const formattedPositions = (positions || []).map((p: any) => ({
            ...p,
            staff: assignmentsByPos[p.id] || [],
            staffCount: (assignmentsByPos[p.id] || []).length,
        }));

        return NextResponse.json({ positions: formattedPositions });
    } catch (err: any) {
        console.error("[STAFF_API_ERROR]", err);
        return NextResponse.json({ error: err?.message || "Failed to load staff positions" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { spaceId, positionId, targetUserId, action } = body; // action: 'assign' | 'remove'

        if (!spaceId || !positionId || !targetUserId) {
            return NextResponse.json({ error: "spaceId, positionId, and targetUserId are required" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        let actorId = user.id;
        const { data: actorRow } = await supabase.from("users").select("id").or(`id.eq.${user.id},auth_user_id.eq.${user.id}`).maybeSingle();
        if (actorRow?.id) actorId = actorRow.id;

        let targetId = targetUserId;
        const { data: targetRow } = await supabase.from("users").select("id").or(`id.eq.${targetUserId},auth_user_id.eq.${targetUserId}`).maybeSingle();
        if (targetRow?.id) targetId = targetRow.id;

        if (action === "remove") {
            await supabase
                .from("aiic_staff_assignments")
                .update({ is_active: false, ends_at: new Date().toISOString() })
                .eq("server_id", spaceId)
                .eq("position_id", positionId)
                .eq("user_id", targetId);

            await supabase.from("aiic_audit_logs").insert({
                server_id: spaceId,
                actor_user_id: actorId,
                target_user_id: targetId,
                action: "STAFF_ASSIGNMENT_REMOVED",
                category: "organization",
                entity_type: "aiic_staff_positions",
                entity_id: positionId,
                metadata: { position_id: positionId },
            });

            return NextResponse.json({ success: true, action: "removed" });
        }

        // Deactivate previous staff assignments in this space
        await supabase
            .from("aiic_staff_assignments")
            .update({ is_active: false, ends_at: new Date().toISOString() })
            .eq("server_id", spaceId)
            .eq("user_id", targetId);

        // Assign new staff position
        const { data: assignment, error: assignErr } = await supabase
            .from("aiic_staff_assignments")
            .insert({
                server_id: spaceId,
                position_id: positionId,
                user_id: targetId,
                assigned_by: actorId,
                starts_at: new Date().toISOString(),
                is_active: true,
            })
            .select()
            .single();

        if (assignErr) throw assignErr;

        await supabase.from("aiic_audit_logs").insert({
            server_id: spaceId,
            actor_user_id: actorId,
            target_user_id: targetId,
            action: "STAFF_ASSIGNMENT_CREATED",
            category: "organization",
            entity_type: "aiic_staff_positions",
            entity_id: positionId,
            metadata: { position_id: positionId },
        });

        return NextResponse.json({ success: true, assignment });
    } catch (err: any) {
        console.error("[STAFF_ASSIGN_ERROR]", err);
        return NextResponse.json({ error: err?.message || "Failed to update staff assignment" }, { status: 500 });
    }
}

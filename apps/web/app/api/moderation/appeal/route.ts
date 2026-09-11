import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { logId, reason } = body;

        if (!logId || !reason) {
            return NextResponse.json({ error: "Missing logId or appeal reason" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const { data: log, error } = await supabase
            .from("aiic_audit_logs")
            .select("*")
            .eq("id", logId)
            .single();

        if (error || !log) {
            return NextResponse.json({ error: "Incident not found" }, { status: 404 });
        }

        const updatedMetadata = {
            ...(log.metadata || {}),
            appeal: {
                user_id: user.id,
                user_name: user.displayName || user.username,
                reason,
                status: "pending",
                submitted_at: new Date().toISOString(),
            },
        };

        await supabase
            .from("aiic_audit_logs")
            .update({ metadata: updatedMetadata })
            .eq("id", logId);

        return NextResponse.json({
            success: true,
            message: "Appeal submitted successfully. A moderator will review this incident shortly.",
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to submit appeal" }, { status: 500 });
    }
}

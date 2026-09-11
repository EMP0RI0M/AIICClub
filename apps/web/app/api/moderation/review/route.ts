import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req);
        if (!user || !["admin", "owner", "lead", "team_lead"].includes(user.role?.toLowerCase() || "")) {
            return NextResponse.json({ error: "Unauthorized. Moderator permissions required." }, { status: 403 });
        }

        const body = await req.json();
        const { logId, decision, notes } = body; // decision: "overturn" | "confirm" | "dismiss"

        if (!logId || !decision) {
            return NextResponse.json({ error: "Missing logId or decision" }, { status: 400 });
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
            moderator_review: {
                reviewer_id: user.id,
                reviewer_name: user.displayName || user.username,
                decision,
                notes: notes || "",
                reviewed_at: new Date().toISOString(),
                overturned: decision === "overturn",
            },
        };

        await supabase
            .from("aiic_audit_logs")
            .update({ metadata: updatedMetadata })
            .eq("id", logId);

        return NextResponse.json({
            success: true,
            message: `Incident ${decision === "overturn" ? "overturned" : "reviewed"} successfully.`,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to process review" }, { status: 500 });
    }
}

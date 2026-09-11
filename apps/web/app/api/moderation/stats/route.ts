import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { NVIDIA_MODELS } from "@/shared/lib/bot-sentinel";

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req);
        if (!user || !["admin", "owner", "lead", "team_lead"].includes(user.role?.toLowerCase() || "")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const supabase = getSupabaseAdmin();

        // 1. Fetch total audit logs for security
        const { data: logs } = await supabase
            .from("aiic_audit_logs")
            .select("id, actor_user_id, action, category, entity_type, entity_id, metadata, created_at")
            .eq("action", "ABUSIVE_COMMENT_FLAGGED")
            .order("created_at", { ascending: false })
            .limit(100);

        const totalIncidents = logs?.length || 0;
        const warningsIssued = (logs || []).filter((l: any) => l.metadata?.severity >= 1).length;
        const escalations = (logs || []).filter((l: any) => l.metadata?.severity >= 3).length;
        const appeals = (logs || []).filter((l: any) => l.metadata?.appeal).length;
        const overturned = (logs || []).filter((l: any) => l.metadata?.moderator_review?.overturned).length;

        // Language breakdown
        const languageCounts: Record<string, number> = {};
        for (const log of logs || []) {
            const lang = (log.metadata as any)?.language || "en";
            languageCounts[lang] = (languageCounts[lang] || 0) + 1;
        }

        return NextResponse.json({
            metrics: {
                totalIncidents,
                warningsIssued,
                escalations,
                appeals,
                overturned,
                falsePositiveRate: totalIncidents > 0 ? `${((overturned / totalIncidents) * 100).toFixed(1)}%` : "0.0%",
            },
            models: NVIDIA_MODELS,
            languageCounts,
            recentIncidents: (logs || []).slice(0, 25),
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to fetch stats" }, { status: 500 });
    }
}

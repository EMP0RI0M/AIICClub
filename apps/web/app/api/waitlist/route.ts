import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const email = (body.email || "").trim().toLowerCase();
        if (!email || !/^[^s@]+@[^s@]+.[^s@]+$/.test(email)) {
            return NextResponse.json({ error: "Valid email required" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const { data: existing } = await supabase
            .from("waitlist")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (existing) {
            const { count } = await supabase.from("waitlist").select("*", { count: "exact", head: true });
            return NextResponse.json({
                alreadyJoined: true,
                position: count || 1,
                count: count || 1,
            });
        }

        await supabase.from("waitlist").insert({
            email,
            name: body.name || null,
            source: body.source || "web",
        });

        const { count } = await supabase.from("waitlist").select("*", { count: "exact", head: true });

        return NextResponse.json({
            alreadyJoined: false,
            position: count || 1,
            count: count || 1,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to join waitlist" }, { status: 500 });
    }
}

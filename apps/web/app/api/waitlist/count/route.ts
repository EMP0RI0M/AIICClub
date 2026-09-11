import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const supabase = getSupabaseAdmin();
        const { count } = await supabase.from("waitlist").select("*", { count: "exact", head: true });
        return NextResponse.json({ count: count || 0 });
    } catch {
        return NextResponse.json({ count: 0 });
    }
}

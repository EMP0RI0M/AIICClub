import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = file.name.split(".").pop() || "webp";
        const filePath = `icons/${user.id}_${Date.now()}.${ext}`;

        await supabase.storage.from("icons").upload(filePath, buffer, {
            contentType: file.type || "image/webp",
            upsert: true,
        });

        const { data } = supabase.storage.from("icons").getPublicUrl(filePath);
        const url = data.publicUrl || `https://tgbjgyhcfhqvwayvvwkl.supabase.co/storage/v1/object/public/icons/${filePath}`;

        return NextResponse.json({ url });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Icon upload failed" }, { status: 500 });
    }
}

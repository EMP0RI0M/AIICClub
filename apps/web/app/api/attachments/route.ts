import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const messageId = (formData.get("messageId") as string) || null;
        const isDm = formData.get("isDm") === "true";

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const buffer = Buffer.from(await file.arrayBuffer());

        // Format filename and sanitize
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${user.id}/${Date.now()}_${cleanName}`;

        const { error: uploadError } = await supabase.storage
            .from("attachments")
            .upload(storagePath, buffer, {
                contentType: file.type || "application/octet-stream",
                upsert: true,
            });

        if (uploadError) {
            console.warn("[ATTACHMENTS] Storage upload notice:", uploadError.message);
        }

        // Generate signed URL (1 year) as primary, with public URL fallback
        const { data: signedData } = await supabase.storage
            .from("attachments")
            .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

        const { data: pubData } = supabase.storage
            .from("attachments")
            .getPublicUrl(storagePath);

        const accessibleUrl = signedData?.signedUrl || pubData?.publicUrl || "";

        let kind: "image" | "video" | "audio" | "file" | "gif" = "file";
        if (file.type.startsWith("image/")) kind = file.type === "image/gif" ? "gif" : "image";
        else if (file.type.startsWith("video/")) kind = "video";
        else if (file.type.startsWith("audio/")) kind = "audio";

        // If messageId is provided, persist into message_attachments or dm_attachments table
        if (messageId) {
            const table = isDm ? "dm_attachments" : "message_attachments";
            try {
                await supabase.from(table).insert({
                    message_id: messageId,
                    bucket_id: "attachments",
                    storage_path: storagePath,
                    file_name: file.name,
                    mime_type: file.type || "application/octet-stream",
                    file_size: file.size,
                });
            } catch (attErr: any) {
                console.warn(`[ATTACHMENTS] Error inserting into ${table}:`, attErr?.message);
            }
        }

        return NextResponse.json({
            attachment: {
                id: `att_${Date.now()}`,
                url: accessibleUrl,
                name: file.name,
                size: file.size,
                mimeType: file.type || "application/octet-stream",
                kind,
            },
        });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Attachment upload failed" }, { status: 500 });
    }
}

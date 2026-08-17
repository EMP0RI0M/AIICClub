import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { generateNextArchiveId } from "@/shared/lib/archive-service";
import { getAuthUser } from "@/app/api/auth-helper";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || "";
    const description = (formData.get("description") as string) || "";
    const category = (formData.get("category") as string) || "Official Record";
    const session = (formData.get("session") as string) || "2026–27";
    const tagsString = (formData.get("tags") as string) || "document, official";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    const supabase = getSupabaseAdmin();
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${Date.now()}_${cleanName}`;
    const storagePath = `archive/${fileName}`;

    // Try uploading to 'attachments' or 'archive-documents'
    let fileUrl = "";
    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (!uploadError) {
      const { data: pub } = supabase.storage.from("attachments").getPublicUrl(storagePath);
      fileUrl = pub?.publicUrl || "";
    } else {
      // Try fallback to archive-documents
      const { error: fErr } = await supabase.storage
        .from("archive-documents")
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        });
      if (!fErr) {
        const { data: pub2 } = supabase.storage.from("archive-documents").getPublicUrl(storagePath);
        fileUrl = pub2?.publicUrl || "";
      }
    }

    const archiveId = await generateNextArchiveId();
    const tags = tagsString.split(",").map((t) => t.trim()).filter(Boolean);
    const slug = `${(title || file.name).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString().slice(-4)}`.replace(/^-|-$/g, "");

    const documentPayload = {
      archiveId,
      category,
      author: user?.displayName || user?.username || "AIIC Executive Board",
      currentVersion: "v1.0",
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/pdf",
      fileUrl: fileUrl || `/uploads/${cleanName}`,
      sha256,
      summary: description,
      versions: [
        {
          version: "v1.0",
          uploadedAt: new Date().toISOString(),
          uploaderName: user?.displayName || user?.username || "AIIC Archivist",
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || "application/pdf",
          fileUrl: fileUrl || `/uploads/${cleanName}`,
          sha256,
          changeNote: "Initial archive deposit.",
        },
      ],
    };

    const newRecord = {
      archive_id: archiveId,
      title: (title || file.name).trim(),
      slug,
      description: description?.trim() || `Archived institutional document: ${file.name}`,
      type: "document",
      session,
      year: new Date().getFullYear(),
      status: "Active",
      visibility: "public",
      tags,
      history_notes: JSON.stringify({ type: "document", document: documentPayload }),
      created_by: user?.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("archive_records")
      .insert(newRecord)
      .select()
      .single();

    if (insertErr) {
      console.error("[ARCHIVE_DOC_INSERT_ERROR]", insertErr);
      throw insertErr;
    }

    return NextResponse.json({
      success: true,
      archiveId,
      fileUrl: documentPayload.fileUrl,
      record: {
        archiveId,
        title: newRecord.title,
        description: newRecord.description,
        type: "document",
        session,
        year: newRecord.year,
        status: "Active",
        tags,
        createdAt: inserted.created_at,
        updatedAt: inserted.updated_at,
        document: documentPayload,
      },
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Document upload failed" }, { status: 500 });
  }
}

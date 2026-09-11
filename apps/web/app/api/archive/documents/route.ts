import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { generateNextArchiveId } from "@/shared/lib/archive-service";
import { getAuthUser } from "@/app/api/auth-helper";
import { ingestKnowledgeDocument } from "@/shared/lib/knowledge/engine";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req).catch(() => null);
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || "";
    const description = (formData.get("description") as string) || "";
    const category = (formData.get("category") as string) || "Official Study Notes";
    const session = (formData.get("session") as string) || "2026–27";
    const tagsString = (formData.get("tags") as string) || "document, notes, official";

    if (!file) {
      return NextResponse.json({ error: "No file provided for upload" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    const supabase = getSupabaseAdmin();
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${Date.now()}_${cleanName}`;
    const storagePath = `documents/${fileName}`;

    // 1. Upload to Supabase Storage ('archive-documents' bucket with fallback to 'attachments')
    let fileUrl = "";
    let uploadBucket = "archive-documents";

    const { error: uploadError } = await supabase.storage
      .from("archive-documents")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/pdf",
        upsert: true,
      });

    if (!uploadError) {
      const { data: pub } = supabase.storage.from("archive-documents").getPublicUrl(storagePath);
      fileUrl = pub?.publicUrl || "";
    } else {
      console.warn("[STORAGE_UPLOAD_PRIMARY_WARN]", uploadError.message, "Falling back to attachments bucket...");
      uploadBucket = "attachments";
      const { error: fallbackError } = await supabase.storage
        .from("attachments")
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        });

      if (!fallbackError) {
        const { data: pubFallback } = supabase.storage.from("attachments").getPublicUrl(storagePath);
        fileUrl = pubFallback?.publicUrl || "";
      } else {
        console.error("[STORAGE_UPLOAD_FAILED]", fallbackError);
      }
    }

    // 2. Extract Text from PDF or Text Document
    let extractedText = "";
    let totalPages = 1;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      try {
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: new Uint8Array(buffer), verbosity: 0 });
        const parseResult = await parser.getText();
        const pages = parseResult.pages || [];
        totalPages = parseResult.total || (pages.length > 0 ? pages.length : 1);
        if (pages.length > 0) {
          extractedText = pages
            .map((p) => `### Page ${p.num}\n\n${p.text.trim()}`)
            .join("\n\n---\n\n");
        } else if (parseResult.text) {
          extractedText = parseResult.text.trim();
        }
      } catch (pdfErr: any) {
        console.warn("[PDF_PARSE_WARNING]", pdfErr?.message || pdfErr);
      }
    } else if (
      file.type.startsWith("text/") ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".json") ||
      file.name.endsWith(".csv") ||
      file.name.endsWith(".tex") ||
      file.name.endsWith(".py") ||
      file.name.endsWith(".ts") ||
      file.name.endsWith(".js")
    ) {
      extractedText = buffer.toString("utf-8");
    }

    const archiveId = await generateNextArchiveId();
    const tags = Array.from(
      new Set([
        "document",
        ...(tagsString || "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
      ])
    );
    const cleanTitle = (title || file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ")).trim();
    const slug = `${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString().slice(-4)}`.replace(/^-|-$/g, "");

    const documentPayload = {
      archiveId,
      category,
      author: user?.displayName || user?.username || "AIIC Faculty / Curator",
      currentVersion: "v1.0",
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || (isPdf ? "application/pdf" : "application/octet-stream"),
      fileUrl: fileUrl || `/uploads/${cleanName}`,
      bucket: uploadBucket,
      storagePath,
      sha256,
      totalPages,
      summary: description || (extractedText ? extractedText.slice(0, 300).trim() + "..." : `Archived study note asset: ${file.name}`),
      versions: [
        {
          version: "v1.0",
          uploadedAt: new Date().toISOString(),
          uploaderName: user?.displayName || user?.username || "AIIC Curator",
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || (isPdf ? "application/pdf" : "application/octet-stream"),
          fileUrl: fileUrl || `/uploads/${cleanName}`,
          sha256,
          changeNote: "Initial document upload to storage bucket.",
        },
      ],
    };

    const finalDescription = description?.trim() || (extractedText ? extractedText.slice(0, 200).trim() + "..." : `Archived institutional document: ${file.name}`);

    const newRecord = {
      archive_id: archiveId,
      title: cleanTitle,
      slug,
      description: finalDescription,
      type: "document",
      session,
      year: new Date().getFullYear(),
      status: "Active",
      visibility: "public",
      tags,
      history_notes: JSON.stringify({
        type: "document",
        document: documentPayload,
        content: extractedText || finalDescription,
        pageCount: totalPages,
      }),
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

    // 3. Trigger Asynchronous Knowledge Engine Page & Chunk Vectorization
    const fullKnowledgeContent = [
      `# ${cleanTitle}`,
      `**Category:** ${category} | **Session:** ${session} | **File:** ${file.name} | **Pages:** ${totalPages}`,
      finalDescription ? `**Summary:** ${finalDescription}` : "",
      extractedText ? `\n## Extracted Document Content\n\n${extractedText}` : "",
    ].filter(Boolean).join("\n\n");

    void ingestKnowledgeDocument({
      sourceId: archiveId,
      sourceType: "archive_document",
      archiveId,
      title: cleanTitle,
      description: finalDescription,
      content: fullKnowledgeContent,
      url: documentPayload.fileUrl,
      visibility: "public",
      metadata: {
        category,
        session,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        totalPages,
        bucket: uploadBucket,
        storagePath,
        fileUrl: documentPayload.fileUrl,
      },
    }).catch((kErr) => console.warn("[KNOWLEDGE_AUTO_INDEX_WARN]", kErr));

    return NextResponse.json(
      {
        success: true,
        archiveId,
        fileUrl: documentPayload.fileUrl,
        totalPages,
        extractedTextLength: extractedText.length,
        record: {
          archiveId,
          title: cleanTitle,
          description: finalDescription,
          type: "document",
          session,
          year: newRecord.year,
          status: "Active",
          tags,
          createdAt: inserted.created_at,
          updatedAt: inserted.updated_at,
          document: documentPayload,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[DOCUMENT_UPLOAD_ERROR]", err);
    return NextResponse.json({ error: err.message || "Document upload failed" }, { status: 500 });
  }
}

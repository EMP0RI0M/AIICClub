import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getArchiveRecords } from "@/shared/lib/archive-service";
import { ingestKnowledgeDocument, extractPdfTextAsync } from "@/shared/lib/knowledge/engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    // Allow elevated users or admin role check, fallback to system session
    const isElevated = user ? ["president_admin", "admin", "president", "vice_president", "teacher", "staff", "owner", "member"].includes((user as any).role || "") : true;

    const records = await getArchiveRecords();
    if (!records || records.length === 0) {
      return NextResponse.json({ success: true, message: "No archive records found to vectorize.", count: 0 });
    }

    const results: any[] = [];

    for (const rec of records) {
      let content = `${rec.title}\n\nSession: ${rec.session || "2026–27"}\nType: ${rec.type}\nDescription: ${rec.description || ""}\nTags: ${(rec.tags || []).join(", ")}`;
      let url = `https://aiic-bbs.vercel.app/archive/${rec.archiveId}`;
      let sourceType = "archive_document" as const;

      // Extract full text from attached PDF if available
      if (rec.type === "document" && rec.document?.fileUrl) {
        url = rec.document.fileUrl;
        try {
          const pdfRes = await fetch(rec.document.fileUrl);
          if (pdfRes.ok) {
            const buf = Buffer.from(await pdfRes.arrayBuffer());
            const extractedPages = await extractPdfTextAsync(buf);
            if (extractedPages.length > 0) {
              const fullPdfText = extractedPages
                .map((p) => `--- PAGE ${p.pageNumber} ---\n${p.text}`)
                .join("\n\n");
              content = `${rec.title}\n\nSession: ${rec.session || "2026–27"}\nCategory: ${rec.document.category || "Official Document"}\nFile: ${rec.document.fileName}\n\n${fullPdfText}`;
            }
          }
        } catch (pdfErr) {
          console.warn(`[PDF_EXTRACTION_WARN] Failed extracting PDF for ${rec.archiveId}:`, pdfErr);
        }
      } else if (rec.type === "video" && rec.video) {
        sourceType = "youtube_lecture" as any;
        url = rec.video.youtubeUrl || url;
        content += `\n\nSpeaker: ${rec.video.speaker || "AIIC Speaker"}\nDuration: ${rec.video.duration || ""}\nYouTube URL: ${rec.video.youtubeUrl}`;
      } else if (rec.type === "repository" && rec.repository) {
        sourceType = "repository" as any;
        url = rec.repository.githubUrl || url;
        content += `\n\nGitHub: ${rec.repository.githubUrl}\nLanguage: ${rec.repository.language || ""}\nTopics: ${(rec.repository.topics || []).join(", ")}`;
      } else if (rec.type === "build" && rec.build) {
        sourceType = "archive_document" as any;
        content += `\n\nVersion: ${rec.build.version}\nEnvironment: ${rec.build.environment}\nRelease Notes: ${rec.build.releaseNotes || ""}`;
      }

      const res = await ingestKnowledgeDocument({
        sourceId: rec.archiveId,
        sourceType,
        archiveId: rec.archiveId,
        title: rec.title,
        description: rec.description,
        content,
        url,
        visibility: "public",
        metadata: {
          session: rec.session,
          year: rec.year,
          tags: rec.tags,
          status: rec.status,
          type: rec.type,
          fileName: rec.document?.fileName,
          category: rec.document?.category,
        },
      });

      results.push({
        archiveId: rec.archiveId,
        title: rec.title,
        type: rec.type,
        chunksIndexed: res.chunksIndexed || 0,
        success: res.success,
        error: res.error,
      });
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success);
    const failureSummary = failed.length > 0 ? ` (${failed.map((f) => `${f.archiveId}: ${f.error}`).join(", ")})` : "";

    return NextResponse.json({
      success: succeeded > 0,
      message: `Vectorized ${succeeded} of ${records.length} archive records.${failureSummary}`,
      processed: results,
    });
  } catch (err: any) {
    console.error("[SYNC_ARCHIVE_ERROR]", err);
    return NextResponse.json({ error: err.message || "Failed to vectorize archive." }, { status: 500 });
  }
}

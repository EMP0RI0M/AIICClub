import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { AUTHORITATIVE_CORPUS } from "@/shared/lib/knowledge/engine";
import { callNvidiaModel, NVIDIA_MODELS } from "@/shared/lib/bot-sentinel";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req).catch(() => null);
    const body = await req.json().catch(() => ({}));
    const {
      sourceId,
      query,
      messages = [],
      sourceTitle,
      sourceCategory,
      sourceSession,
      sourceDescription,
    } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Query is required." }, { status: 400 });
    }

    if (!sourceId || typeof sourceId !== "string") {
      return NextResponse.json({ error: "Source ID is required." }, { status: 400 });
    }

    const cleanSourceId = sourceId.trim();

    // 1. Resolve source content from Authoritative Corpus or Database
    let resolvedTitle = sourceTitle || cleanSourceId;
    let resolvedCategory = sourceCategory || "Official Archive Record";
    let resolvedSession = sourceSession || "2026–27";
    let resolvedContent = "";

    const authDoc = AUTHORITATIVE_CORPUS.find(
      (d) => d.sourceId.toLowerCase() === cleanSourceId.toLowerCase()
    );

    if (authDoc) {
      resolvedTitle = authDoc.title;
      resolvedCategory = authDoc.category;
      resolvedSession = authDoc.session;
      resolvedContent = authDoc.fullText || authDoc.description;
    }

    // Also check database record for full extracted notes or latest uploaded text
    try {
      const supabase = getSupabaseAdmin();
      const { data: rec } = await supabase
        .from("archive_records")
        .select("*")
        .eq("archive_id", cleanSourceId)
        .single();

      if (rec) {
        resolvedTitle = rec.title || resolvedTitle;
        resolvedSession = rec.session || resolvedSession;

        let parsedHistory: any = null;
        if (typeof rec.history_notes === "string") {
          try {
            parsedHistory = JSON.parse(rec.history_notes);
          } catch {
            parsedHistory = { content: rec.history_notes };
          }
        } else if (rec.history_notes && typeof rec.history_notes === "object") {
          parsedHistory = rec.history_notes;
        }

        let dbExtracted =
          parsedHistory?.content ||
          parsedHistory?.document?.summary ||
          rec.description ||
          "";

        // Auto-extract text from PDF if not already extracted
        const fileUrl = parsedHistory?.document?.fileUrl || (rec as any).file_url;
        if (
          (!dbExtracted || dbExtracted.length < 300 || dbExtracted.includes("Official study note asset:")) &&
          fileUrl &&
          (fileUrl.includes(".pdf") || parsedHistory?.document?.mimeType?.includes("pdf"))
        ) {
          try {
            const pdfRes = await fetch(fileUrl);
            if (pdfRes.ok) {
              const pdfBuf = await pdfRes.arrayBuffer();
              const { PDFParse } = await import("pdf-parse");
              const parser = new PDFParse({ data: new Uint8Array(pdfBuf), verbosity: 0 });
              const parseResult = await parser.getText();
              const pages = parseResult.pages || [];
              let pdfText = "";
              if (pages.length > 0) {
                pdfText = pages
                  .map((p: any) => `### Page ${p.num}\n\n${p.text.trim()}`)
                  .join("\n\n---\n\n");
              } else if (parseResult.text) {
                pdfText = parseResult.text.trim();
              }

              if (pdfText && pdfText.length > 50) {
                dbExtracted = pdfText;
                // Update record cache asynchronously
                if (parsedHistory) {
                  parsedHistory.content = pdfText;
                  parsedHistory.pageCount = parseResult.total || pages.length || 1;
                  supabase
                    .from("archive_records")
                    .update({ history_notes: JSON.stringify(parsedHistory) })
                    .eq("archive_id", cleanSourceId)
                    .then(() => {});
                }
              }
            }
          } catch (pdfFetchErr) {
            console.warn("[PDF_RUNTIME_PARSE_WARN]", pdfFetchErr);
          }
        }

        if (dbExtracted && (!resolvedContent || dbExtracted.length > resolvedContent.length)) {
          resolvedContent = dbExtracted;
        }
        if (parsedHistory?.document?.category) {
          resolvedCategory = parsedHistory.document.category;
        }
      }
    } catch (dbErr) {
      console.warn("[SOURCE_CHAT_DB_FETCH_WARN]", dbErr);
    }

    if (!resolvedContent && sourceDescription) {
      resolvedContent = sourceDescription;
    }

    if (!resolvedContent) {
      resolvedContent = `Record Title: ${resolvedTitle}\nCategory: ${resolvedCategory}\nSession: ${resolvedSession}\n(No extended text is archived for this record).`;
    }

    // 2. Build single-source system prompt & context
    const systemPrompt = `You are Corvus, the dedicated AI Study Assistant for Bal Bhawan School's AI & Innovation Club (AIIC).
You are having a conversation with a student focused EXCLUSIVELY on this single archive record:
Title: "${resolvedTitle}"
ID: ${cleanSourceId}
Category: ${resolvedCategory}
Session: ${resolvedSession}

STRICT SINGLE-SOURCE SCOPE & GROUNDING RULES:
1. Ground your answers ONLY in the provided source record text below.
2. Do NOT import outside topics, unverified curriculum details, or content from other lectures unless the user explicitly requests an analogy.
3. If the answer is not present in this document, politely explain that this specific source does not cover that topic.
4. Format your response clearly with Markdown headers, bullet points, code blocks, and LaTeX ($...$ or $$...$$) where applicable.
5. Provide helpful, student-friendly, and precise explanations.
6. Begin your response with a brief <think>...</think> reasoning trace detailing how you verified the answer against this source document.`;

    const sourceContextBlock = `[DOCUMENT CONTENT FOR ${cleanSourceId} - ${resolvedTitle}]\n${resolvedContent.slice(0, 15000)}`;

    const promptMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `SOURCE CONTEXT:\n${sourceContextBlock}\n\nPlease acknowledge and prepare to answer questions regarding this document.` },
      { role: "assistant", content: `Understood. I am ready to answer any questions strictly grounded in "${resolvedTitle}" (ID: ${cleanSourceId}).` },
    ];

    // Append previous conversational history (last 6 messages)
    if (Array.isArray(messages) && messages.length > 0) {
      const sanitizedHistory = messages
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-6);

      for (const msg of sanitizedHistory) {
        // Strip any existing <think> blocks from previous assistant turns to prevent token bloat
        const cleanContent =
          msg.role === "assistant"
            ? msg.content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim()
            : msg.content.trim();
        promptMessages.push({ role: msg.role, content: cleanContent });
      }
    }

    // Add current user query
    promptMessages.push({ role: "user", content: query.trim() });

    // 3. Call AI Model
    let rawResponse: string | null = null;
    try {
      rawResponse = await callNvidiaModel(NVIDIA_MODELS.BRAIN, promptMessages, {
        temperature: 0.2,
        max_tokens: 1200,
      });
    } catch (aiErr) {
      console.warn("[SOURCE_CHAT_MODEL_CALL_WARN]", aiErr);
    }

    let finalAnswer = rawResponse || "";

    // 4. Fallback if AI call didn't yield text
    if (!finalAnswer || finalAnswer.trim().length < 20) {
      const thinking = `1. Source Scoping: Query locked to ${cleanSourceId} (${resolvedTitle}).\n2. Direct Extraction: Summarized matching sections from official record text.`;
      finalAnswer = `<think>\n${thinking}\n</think>\n\n### ${resolvedTitle}\n\n${resolvedContent.slice(0, 1000)}\n\n*(Grounded directly from archive record ${cleanSourceId})*`;
    }

    return NextResponse.json({
      success: true,
      answer: finalAnswer,
      sourceId: cleanSourceId,
      sourceTitle: resolvedTitle,
    });
  } catch (err: any) {
    console.error("[SOURCE_CHAT_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to process source chat query" },
      { status: 500 }
    );
  }
}

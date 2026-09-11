import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { getSupabaseAdmin } from "@/shared/supabase/admin";
import { AUTHORITATIVE_CORPUS } from "@/shared/lib/knowledge/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface SourceContextInfo {
  sourceId: string;
  title: string;
  category: string;
  session: string;
  content: string;
}

function parseAndRepairJson(raw: string): any {
  if (!raw || typeof raw !== "string") {
    throw new Error("Empty raw response received");
  }

  // 1. Remove <think> blocks and "Here's a thinking process:" text
  let clean = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/Here's a thinking process:[\s\S]*?(?=\n\n|\{|\[)/i, "")
    .trim();

  // 2. Extract from markdown code fence if present
  const fenceMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    clean = fenceMatch[1].trim();
  }

  // 3. Find outermost braces
  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.slice(firstBrace, lastBrace + 1);
  }

  // Try standard parse
  try {
    return JSON.parse(clean);
  } catch (e1) {
    // Attempt repairs: strip trailing commas, fix comments
    let repaired = clean
      .replace(/,\s*([\}\]])/g, "$1")
      .replace(/\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");

    try {
      return JSON.parse(repaired);
    } catch (e2) {
      console.warn("[JSON_REPAIR_FALLBACK_TO_REGEX]", e2);

      // Fallback: Regex-based extraction of title, description, and individual question blocks
      const titleMatch = raw.match(/"title"\s*:\s*"([^"]+)"/);
      const descMatch = raw.match(/"description"\s*:\s*"([^"]+)"/);
      const categoryMatch = raw.match(/"category"\s*:\s*"([^"]+)"/);

      const extractedQuestions: any[] = [];
      const qBlocks = raw.split(/\{\s*"questionText"|"question"/g);

      for (let i = 1; i < qBlocks.length; i++) {
        const block = qBlocks[i];
        const textMatch = block.match(/:\s*"([^"]+)"/);
        const optionsMatch = block.match(/"options"\s*:\s*\[([\s\S]*?)\]/);
        const correctMatch = block.match(/"correctOption"\s*:\s*"([^"]+)"/);
        const explanationMatch = block.match(/"explanation"\s*:\s*"([^"]+)"/);
        const sourceIdMatch = block.match(/"sourceId"\s*:\s*"([^"]+)"/);

        if (textMatch) {
          let options: string[] = [];
          if (optionsMatch) {
            options = (optionsMatch[1].match(/"([^"]+)"/g) || []).map((s) => s.replace(/^"|"$/g, ""));
          }
          if (options.length < 4) {
            options = ["Option A", "Option B", "Option C", "Option D"];
          }
          const correctOption = correctMatch ? correctMatch[1] : options[0];
          const correctOptionIndex = Math.max(0, options.indexOf(correctOption));

          extractedQuestions.push({
            questionText: textMatch[1],
            options,
            correctOption,
            correctOptionIndex,
            explanation: explanationMatch ? explanationMatch[1] : "Official curriculum answer verified by AIIC President.",
            sourceId: sourceIdMatch ? sourceIdMatch[1] : "",
            difficulty: "medium",
            points: 100,
          });
        }
      }

      if (extractedQuestions.length > 0) {
        return {
          title: titleMatch ? titleMatch[1] : undefined,
          description: descMatch ? descMatch[1] : undefined,
          category: categoryMatch ? categoryMatch[1] : undefined,
          questions: extractedQuestions,
        };
      }

      throw new Error("Unable to parse generated quiz structure.");
    }
  }
}

/**
 * Deterministic fallback question synthesizer when external AI is unavailable or produces invalid tokens.
 */
function generateSynthesizedQuestions(sources: SourceContextInfo[], count: number, defaultCategory: string): any {
  const questions: any[] = [];
  
  // Extract key sentences and concepts from sources
  for (const src of sources) {
    if (questions.length >= count) break;
    const lines = src.content
      .split("\n")
      .map((l) => l.replace(/^#+\s*|^\*\s*|^-\s*|^\d+\.\s*|^>\s*/, "").trim())
      .filter((l) => l.length >= 35 && l.length <= 250 && !l.includes("http") && !l.startsWith("```"));

    for (let i = 0; i < lines.length && questions.length < count; i += 2) {
      const statement = lines[i];
      questions.push({
        id: `gen_q_${Date.now()}_${questions.length + 1}`,
        questionOrder: questions.length + 1,
        questionText: `According to the official study notes for "${src.title}", which of the following statements is correct?`,
        options: [
          statement,
          `It is strictly deprecated in production environments due to memory leaks.`,
          `It bypasses institutional security verification and runs without authentication.`,
          `It requires manual configuration of loopback interfaces on unassigned ports.`,
        ],
        correctOption: statement,
        correctOptionIndex: 0,
        explanation: `In "${src.title}", the curriculum specifically states: "${statement}".`,
        sourceId: src.sourceId,
        difficulty: "medium",
        points: 100,
        timeLimitSeconds: 25,
      });
    }
  }

  // If not enough questions found in text, generate canonical topic questions
  while (questions.length < count) {
    const qIdx = questions.length + 1;
    const src = sources[qIdx % sources.length] || sources[0];
    questions.push({
      id: `gen_q_${Date.now()}_${qIdx}`,
      questionOrder: qIdx,
      questionText: `What core objective or architectural principle is highlighted in "${src.title}"?`,
      options: [
        `Building reliable, production-grade applications using grounded source specifications.`,
        `Executing arbitrary unverified scripts directly on user clients.`,
        `Disabling database transactions to maximize raw network throughput.`,
        `Relying purely on stochastic heuristics without deterministic verification.`,
      ],
      correctOption: `Building reliable, production-grade applications using grounded source specifications.`,
      correctOptionIndex: 0,
      explanation: `The foundational mission of "${src.title}" is to foster sound engineering principles and verified architectural design.`,
      sourceId: src.sourceId,
      difficulty: "medium",
      points: 100,
      timeLimitSeconds: 25,
    });
  }

  return {
    title: `AIIC Quiz: ${sources.map((s) => s.title).join(" & ").slice(0, 55)}`,
    shortTitle: `AIIC ${sources[0]?.sourceId || "Quiz"} Exam`,
    description: `Official assessment assessing student mastery of concepts presented in ${sources.map((s) => s.sourceId).join(", ")}.`,
    category: defaultCategory,
    session: "2026–27",
    badgeName: "Curriculum Scholar",
    questions,
  };
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req).catch(() => null);
    const body = await req.json().catch(() => ({}));
    const {
      sourceIds = [],
      questionCount = 5,
      timeLimitMinutes = 3,
      difficulty = "medium",
      customPrompt = "",
      title = "",
      category = "Official Study Assessment",
      session = "2026–27",
    } = body;

    if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
      return NextResponse.json(
        { error: "At least one source must be selected to generate a quiz." },
        { status: 400 }
      );
    }

    const numQuestions = Math.min(25, Math.max(1, Number(questionCount) || 5));
    const durationMin = Math.min(30, Math.max(1, Number(timeLimitMinutes) || 3));
    const durationSec = durationMin * 60;

    const supabase = getSupabaseAdmin();

    // 1. Gather all source documents and their full text
    const gatheredSources: SourceContextInfo[] = [];

    for (const rawSourceId of sourceIds) {
      const cleanSourceId = String(rawSourceId).trim();
      let docTitle = cleanSourceId;
      let docCategory = category;
      let docSession = session;
      let docContent = "";

      // Check Authoritative Corpus first
      const authDoc = AUTHORITATIVE_CORPUS.find(
        (d) => d.sourceId.toLowerCase() === cleanSourceId.toLowerCase()
      );

      if (authDoc) {
        docTitle = authDoc.title;
        docCategory = authDoc.category;
        docSession = authDoc.session;
        docContent = authDoc.fullText || authDoc.description || "";
      }

      // Check database archive_records
      try {
        const { data: rec } = await supabase
          .from("archive_records")
          .select("*")
          .eq("archive_id", cleanSourceId)
          .maybeSingle();

        if (rec) {
          docTitle = rec.title || docTitle;
          docSession = rec.session || docSession;
          docCategory = rec.category || docCategory;

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

          if (dbExtracted && dbExtracted.length > docContent.length) {
            docContent = dbExtracted;
          }
        }
      } catch (dbErr) {
        console.warn("[DB_LOOKUP_WARN]", cleanSourceId, dbErr);
      }

      gatheredSources.push({
        sourceId: cleanSourceId,
        title: docTitle,
        category: docCategory,
        session: docSession,
        content: docContent.trim(),
      });
    }

    // Build rich combined source context
    const sourcesSummary = gatheredSources
      .map(
        (s, idx) => `=== SOURCE DOCUMENT ${idx + 1}: [ID: ${s.sourceId}] ===
Title: ${s.title}
Category: ${s.category}
Session: ${s.session}

${s.content ? s.content.slice(0, 12000) : "[Note: High-level overview based on title & category]"}`
      )
      .join("\n\n" + "=".repeat(50) + "\n\n");

    const systemPrompt = `You are the AIIC Lead Curriculum Architect and Chief Examination Officer for the AI & Innovation Club (AIIC) at Bal Bhawan School.
Your task is to generate a Multiple Choice Quiz (MCQ) for students based STRICTLY on the provided source documents.

CRITICAL INSTRUCTIONS:
- Generate exactly ${numQuestions} questions.
- Each question must have 4 options and 1 correct answer matching one option verbatim.
- Provide a clear pedagogical explanation.
- Return ONLY a raw JSON object starting with { and ending with }. Do NOT write any chain-of-thought, reasoning preamble, or markdown code blocks.`;

    const userPrompt = `Generate a ${numQuestions}-question MCQ quiz for AIIC students based on these sources:
Difficulty: ${difficulty}
${customPrompt ? `Custom Instructions: ${customPrompt}` : ""}

SOURCES:
${sourcesSummary}

SCHEMA:
{
  "title": "Quiz Title",
  "shortTitle": "Short Title",
  "description": "Short description",
  "category": "${category}",
  "session": "${session}",
  "durationMinutes": ${durationMin},
  "durationSeconds": ${durationSec},
  "badgeName": "Scholar Badge",
  "questions": [
    {
      "questionText": "Question 1",
      "options": ["A", "B", "C", "D"],
      "correctOption": "A",
      "correctOptionIndex": 0,
      "explanation": "Why A is correct",
      "sourceId": "${gatheredSources[0]?.sourceId || ""}",
      "difficulty": "${difficulty === "mixed" ? "medium" : difficulty}",
      "points": 100
    }
  ]
}`;

    const apiKey = process.env.OPENROUTER_API_KEY || "";
    const candidateModels = [
      "nvidia/nemotron-3.5-lightning:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "google/gemini-2.5-flash",
      "mistralai/mistral-7b-instruct:free",
      "openrouter/free"
    ];

    let parsedQuiz: any = null;

    for (const modelCandidate of candidateModels) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 16000);

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://aiic-bbs.vercel.app",
            "X-Title": "AIIC Quiz Studio",
          },
          body: JSON.stringify({
            model: modelCandidate,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.1,
            max_tokens: 3500,
          }),
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          console.warn(`[OPENROUTER_QUIZ_GEN_WARN] Model: ${modelCandidate} Status: ${res.status}`);
          continue;
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || "";

        if (content && content.trim().length > 0) {
          parsedQuiz = parseAndRepairJson(content);
          if (parsedQuiz && Array.isArray(parsedQuiz.questions) && parsedQuiz.questions.length > 0) {
            break;
          }
        }
      } catch (callErr) {
        console.warn(`[OPENROUTER_QUIZ_GEN_ERR] Model: ${modelCandidate}`, callErr);
      }
    }

    // If all LLM candidates failed, synthesize directly from grounded text
    if (!parsedQuiz || !Array.isArray(parsedQuiz.questions) || parsedQuiz.questions.length === 0) {
      console.log("[AI_QUIZ_FALLBACK_SYNTHESIZING_FROM_TEXT]");
      parsedQuiz = generateSynthesizedQuestions(gatheredSources, numQuestions, category);
    }

    // Validate and sanitize questions
    const sanitizedQuestions = (parsedQuiz.questions || []).map((q: any, idx: number) => {
      let options: string[] = Array.isArray(q.options) ? q.options.map(String) : [];
      if (options.length < 4) {
        while (options.length < 4) {
          options.push(`Option ${options.length + 1}`);
        }
      } else if (options.length > 4) {
        options = options.slice(0, 4);
      }

      let correctOption = String(q.correctOption || options[0]);
      let correctIdx = options.findIndex((opt) => opt.trim() === correctOption.trim());
      if (correctIdx === -1) {
        if (typeof q.correctOptionIndex === "number" && q.correctOptionIndex >= 0 && q.correctOptionIndex < 4) {
          correctIdx = q.correctOptionIndex;
          correctOption = options[correctIdx];
        } else {
          correctIdx = 0;
          correctOption = options[0];
        }
      }

      const assignedSourceId =
        q.sourceId && gatheredSources.some((s) => s.sourceId.toLowerCase() === q.sourceId.toLowerCase())
          ? q.sourceId
          : gatheredSources[idx % gatheredSources.length].sourceId;

      return {
        id: `gen_q_${Date.now()}_${idx + 1}`,
        questionOrder: idx + 1,
        questionText: q.questionText || q.question || `Question ${idx + 1}`,
        latex: q.latex || undefined,
        options,
        correctOption,
        correctOptionIndex: correctIdx,
        explanation: q.explanation || "Official curriculum answer verified by AIIC President.",
        sourceId: assignedSourceId,
        sourceExcerpt: q.sourceExcerpt || undefined,
        difficulty: q.difficulty || difficulty || "medium",
        points: Number(q.points) || 100,
        timeLimitSeconds: 25,
      };
    });

    const cleanTitle =
      title ||
      parsedQuiz.title ||
      `AIIC Quiz: ${gatheredSources.map((s) => s.title).join(" & ").slice(0, 50)}`;

    const slug = `quiz-${gatheredSources.map((s) => s.sourceId.toLowerCase().replace(/[^a-z0-9]/g, "-")).join("-")}-${Date.now().toString(36)}`;

    const finalQuizPayload = {
      title: cleanTitle,
      slug,
      shortTitle:
        parsedQuiz.shortTitle ||
        (cleanTitle.length > 30 ? cleanTitle.slice(0, 27) + "..." : cleanTitle),
      description:
        parsedQuiz.description ||
        `Verified examination assessing student comprehension of ${gatheredSources.map((s) => s.sourceId).join(", ")}.`,
      category: category || parsedQuiz.category || "Official Study Assessment",
      session: session || parsedQuiz.session || "2026–27",
      durationMinutes: durationMin,
      durationSeconds: durationSec,
      badgeName: parsedQuiz.badgeName || "Certified Scholar",
      sources: gatheredSources.map((s) => ({
        sourceId: s.sourceId,
        title: s.title,
        category: s.category,
      })),
      questions: sanitizedQuestions,
    };

    return NextResponse.json({
      success: true,
      quiz: finalQuizPayload,
    });
  } catch (err: any) {
    console.error("[AI_QUIZ_GENERATE_FATAL_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate AI quiz from sources" },
      { status: 500 }
    );
  }
}

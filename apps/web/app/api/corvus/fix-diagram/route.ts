import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { callNvidiaModel, NVIDIA_MODELS } from "@/shared/lib/bot-sentinel";

// Allowed Mermaid diagram headers
const VALID_MERMAID_TYPES = [
  "flowchart",
  "graph",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram-v2",
  "stateDiagram",
  "erDiagram",
  "journey",
  "gantt",
  "pie",
  "mindmap",
  "timeline",
  "gitGraph",
  "quadrantChart",
  "requirementDiagram",
  "c4Context",
  "sankey-beta",
  "xychart-beta",
  "block-beta",
];

function extractAndValidateMermaid(rawText: string): { valid: boolean; code: string; type?: string; error?: string } {
  if (!rawText || typeof rawText !== "string") {
    return { valid: false, code: "", error: "No diagram content provided." };
  }

  let code = rawText.trim();

  // Strip Markdown fences
  code = code.replace(/^```(?:mermaid)?/i, "").replace(/```$/i, "").trim();

  // Remove thinking blocks
  code = code.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  if (/Here's a thinking process:/i.test(code)) {
    const parts = code.split(/Here's a thinking process:/i);
    if (parts.length > 1) {
      const splitBody = parts[1].split(/\n\n(?=flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap|timeline)/i);
      code = splitBody.slice(1).join("\n\n").trim() || splitBody[0].trim();
    }
  }

  // Find where the actual diagram keyword starts
  const lines = code.split("\n");
  let startIndex = -1;
  let detectedType = "";

  for (let i = 0; i < lines.length; i++) {
    const lineTrimmed = lines[i].trim();
    if (!lineTrimmed || lineTrimmed.startsWith("%%") || lineTrimmed.startsWith("#")) continue;

    for (const validPrefix of VALID_MERMAID_TYPES) {
      if (lineTrimmed.startsWith(validPrefix)) {
        startIndex = i;
        detectedType = validPrefix;
        break;
      }
    }
    if (startIndex !== -1) break;
  }

  // If no standard header line found, check if it contains flowchart edges and prepend
  if (startIndex === -1) {
    if (/-->|---|==>|\.->/.test(code)) {
      code = `flowchart TD\n${code}`;
      detectedType = "flowchart";
      startIndex = 0;
    } else {
      return {
        valid: false,
        code,
        error: "No valid Mermaid diagram type detected (must start with flowchart, graph, sequenceDiagram, etc.)",
      };
    }
  }

  // Extract from the valid keyword onward
  const validLines = code.split("\n").slice(startIndex);
  
  // Also trim any trailing non-mermaid prose
  const cleanLines: string[] = [];
  for (const line of validLines) {
    const l = line.trim();
    if (/^(?:Explanation|Note|Summary|Here is|In this|This diagram|The above)\b/i.test(l) && !l.includes("-->") && !l.includes("[") && !l.includes("{") && !l.includes("(")) {
      break;
    }
    cleanLines.push(line);
  }

  const finalCode = cleanLines.join("\n").trim();

  if (!finalCode) {
    return { valid: false, code: "", error: "Extracted diagram definition is empty." };
  }

  return { valid: true, code: finalCode, type: detectedType };
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { chart, error: clientError, prompt } = body;

  if (!chart && !prompt) {
    return NextResponse.json({ error: "No diagram code or prompt supplied." }, { status: 400 });
  }

  const systemPrompt = `You are a Mermaid.js diagram expert and compiler.
Your task is to fix and return ONLY valid, strictly compliant Mermaid.js syntax.
RULES:
1. Return ONLY the raw Mermaid diagram definition.
2. DO NOT wrap with Markdown code fences (never output \`\`\` or \`\`\`mermaid).
3. DO NOT include explanations, greetings, or conversational remarks before or after the code.
4. The first line MUST be a valid diagram header like 'flowchart TD', 'sequenceDiagram', 'graph LR', 'erDiagram', etc.
5. Fix all syntax errors, edge labels (use [text] or |label| correctly), and special characters.`;

  const userPrompt = `Fix and generate clean, valid Mermaid syntax for the following:
Original Code:
${chart || prompt}

Reported Error:
${clientError || "Syntax error or no diagram type detected."}

Provide ONLY the valid Mermaid code:`;

  const aiResult = await callNvidiaModel(
    NVIDIA_MODELS.BRAIN,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.1, max_tokens: 1000 }
  );

  if (!aiResult) {
    return NextResponse.json({ error: "AI failed to generate fix." }, { status: 500 });
  }

  // Validate AI output
  const validation = extractAndValidateMermaid(aiResult);
  if (!validation.valid) {
    // If AI missed the header, attempt to prepend flowchart TD
    const fallbackCode = `flowchart TD\n${aiResult.replace(/^```(?:mermaid)?/i, "").replace(/```$/i, "").trim()}`;
    const fallbackVal = extractAndValidateMermaid(fallbackCode);
    if (fallbackVal.valid) {
      return NextResponse.json({
        success: true,
        chart: fallbackVal.code,
        type: fallbackVal.type,
      });
    }

    return NextResponse.json({
      success: false,
      error: validation.error || "Unable to produce valid Mermaid syntax.",
      raw: aiResult,
    }, { status: 422 });
  }

  return NextResponse.json({
    success: true,
    chart: validation.code,
    type: validation.type,
  });
}

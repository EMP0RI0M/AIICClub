import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { CredentialVault, type AIProvider } from "@/features/studio/vault/credential-vault";
import { StudioVmManager } from "@/features/studio/lib/studio-vm-manager";
import { createStudioTools } from "@/features/studio/lib/studio-tools";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from "ai";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `
You are the Corvus Studio AI Engineer, an expert fullstack Next.js developer building and running applications inside a dedicated Linux MicroVM.
A Next.js (App Router, Tailwind CSS, Lucide icons) application is running live in /workdir/app on port 3000.

## Execution Safeguards & Runtime Self-Healing
1. Always read files first before editing to get the current state and revision.
2. Edit with minimal targeted modifications (use replaceInFile or writeFile).
3. Concurrency Protection: If you receive a 'conflict: true' error, re-read the file immediately and re-apply changes on top of the newer revision.
4. Autonomous Repair Loop: Always invoke 'checkApp' before declaring a task finished.
5. If 'checkApp' reports non-200 or compile errors:
   - Call 'devServerLogs' to inspect stack trace.
   - Inspect the faulty file.
   - Make the targeted fix.
   - Re-run 'checkApp' up to 3 repair iterations.
`;

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const userId = user?.id || "guest-studio-user";

    const body = await req.json();
    const { 
      projectId, 
      messages, 
      credentialId, 
      provider = "openrouter",
      modelId = "anthropic/claude-3.7-sonnet"
    } = body;

    if (!projectId || !Array.isArray(messages)) {
      return NextResponse.json({ error: "projectId and messages are required." }, { status: 400 });
    }

    // 1. Authorize project access
    const isAuthorized = await StudioVmManager.authorizeProjectAccess(projectId, userId);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: Not your studio project." }, { status: 403 });
    }

    // 2. Resolve credentials via CredentialVault (In-Memory Decryption Only)
    const { apiKey, provider: resolvedProvider } = await CredentialVault.resolveApiKey({
      userId,
      credentialId,
      provider: provider as AIProvider,
    });

    // 3. Configure AI SDK model router
    let model;
    if (resolvedProvider === "openrouter") {
      const openrouter = createOpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey,
      });
      model = openrouter(modelId || "anthropic/claude-3.7-sonnet");
    } else if (resolvedProvider === "anthropic") {
      const anthropic = createAnthropic({ apiKey });
      model = anthropic(modelId || "claude-3-7-sonnet-20250219");
    } else {
      const openai = createOpenAI({ apiKey });
      model = openai(modelId || "gpt-4o");
    }

    // 4. Attach MicroVM tools with project revision tracking & user identity
    const vm = StudioVmManager.getDevVm(projectId);
    const tools = createStudioTools(vm, projectId, userId);
    const modelMessages = await convertToModelMessages(messages as UIMessage[]);

    // 5. Stream text response
    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(25),
    });

    return result.toTextStreamResponse();
  } catch (err: any) {
    console.error("[STUDIO_CHAT_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Studio agent execution failed" },
      { status: 500 }
    );
  }
}

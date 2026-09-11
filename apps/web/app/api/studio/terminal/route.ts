import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { StudioVmManager } from "@/features/studio/lib/studio-vm-manager";
import {
  subscribeToTerminal,
  writeToTerminal,
  resizeTerminal,
} from "@/features/studio/lib/terminal-bridge";
import { APP_SESSION, WORKDIR } from "@/features/studio/lib/freestyle-client";

export const dynamic = "force-dynamic";

/**
 * GET /api/studio/terminal?projectId=...&session=...
 * Streams PTY terminal output over Server-Sent Events (SSE).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const session = searchParams.get("session") || APP_SESSION;

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const isAuthorized = await StudioVmManager.authorizeProjectAccess(projectId, user.id);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const encoder = new TextEncoder();
    const command = session === APP_SESSION ? undefined : `cd ${WORKDIR} && exec bash -l`;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (chunk: Uint8Array) => {
          try {
            const payload = Buffer.from(chunk).toString("base64");
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          } catch {}
        };

        const unsubscribe = await subscribeToTerminal(projectId, session, command, send);

        req.signal.addEventListener("abort", () => {
          unsubscribe();
          try {
            controller.close();
          } catch {}
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Terminal error" }, { status: 500 });
  }
}

/**
 * POST /api/studio/terminal
 * Sends keystroke stdin or window resize events to the MicroVM PTY session.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, session = APP_SESSION, data, cols, rows } = body;

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const isAuthorized = await StudioVmManager.authorizeProjectAccess(projectId, user.id);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (cols && rows) {
      await resizeTerminal(projectId, session, cols, rows).catch(() => {});
    }

    if (data) {
      await writeToTerminal(projectId, session, data).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Terminal input error" }, { status: 500 });
  }
}

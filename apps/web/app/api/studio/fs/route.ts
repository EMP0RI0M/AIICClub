import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { authorizeStudioAccess } from "@/features/studio/lib/studio-auth";
import { StudioVmManager } from "@/features/studio/lib/studio-vm-manager";
import { RevisionManager } from "@/features/studio/lib/revision-manager";
import { WORKDIR } from "@/features/studio/lib/freestyle-client";

export const dynamic = "force-dynamic";

const resolvePath = (rawPath: string): string | null => {
  const value = rawPath.trim();
  if (!value || value.includes("\0")) return null;
  const normalized = value.replace(/^\.\//, "").replace(/^\/+/, "");
  const segments = normalized.split("/").filter((s) => s && s !== ".");
  if (segments.some((segment) => segment === "..")) return null;
  return segments.length ? `${WORKDIR}/${segments.join("/")}` : WORKDIR;
};

/**
 * GET /api/studio/fs?projectId=...&action=tree|read&path=...
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const action = searchParams.get("action") || "tree";
    const rawPath = searchParams.get("path") || ".";

    if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

    const auth = await authorizeStudioAccess(projectId, user.id, "viewer");
    if (!auth.authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const vm = StudioVmManager.getDevVm(projectId);

    if (action === "read") {
      const fullPath = resolvePath(rawPath);
      if (!fullPath) return NextResponse.json({ error: "Invalid path" }, { status: 400 });

      const content = await vm.fs.readTextFile(fullPath);
      const revision = await RevisionManager.getFileRevision(projectId, rawPath);

      return NextResponse.json({ content, path: rawPath, revision });
    }

    // Recursive file tree discovery
    const target = resolvePath(rawPath) || WORKDIR;
    const cmd = `find '${target}' -maxdepth 5 -not -path '*/node_modules/*' -not -path '*/.next/*' -not -path '*/.git/*' | sed 's#^${WORKDIR}/##'`;
    const { stdout, statusCode } = await vm.exec({ command: cmd });

    const entries = (stdout || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => s !== WORKDIR && s !== ".");

    return NextResponse.json({ entries, statusCode });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Filesystem error" }, { status: 500 });
  }
}

/**
 * POST /api/studio/fs
 * Performs write, delete, mkdir, rename with Optimistic Concurrency Protection.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { projectId, action, path: rawPath, content, newPath, expectedRevision } = body;

    if (!projectId || !rawPath || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const auth = await authorizeStudioAccess(projectId, user.id, "editor");
    if (!auth.authorized) {
      return NextResponse.json({ error: "Forbidden: Editor role required" }, { status: 403 });
    }

    const vm = StudioVmManager.getDevVm(projectId);
    const fullPath = resolvePath(rawPath);
    if (!fullPath) return NextResponse.json({ error: "Invalid file path" }, { status: 400 });

    if (action === "write") {
      // 1. Concurrency Check
      const check = await RevisionManager.validateWrite(projectId, rawPath, expectedRevision);
      if (!check.allowed) {
        return NextResponse.json(
          {
            error: "Conflict detected: File has been modified by another operation.",
            conflict: true,
            path: rawPath,
            expectedRevision: check.expectedRevision,
            currentRevision: check.currentRevision,
          },
          { status: 409 }
        );
      }

      // 2. Write to MicroVM disk
      await vm.fs.writeTextFile(fullPath, content ?? "");

      // 3. Increment revision atomically
      const newRev = await RevisionManager.commitWrite(projectId, rawPath, content ?? "", user.id);

      return NextResponse.json({ ok: true, path: rawPath, revision: newRev });
    }

    if (action === "delete") {
      await vm.fs.remove(fullPath);
      return NextResponse.json({ ok: true, path: rawPath });
    }

    if (action === "mkdir") {
      await vm.exec({ command: `mkdir -p '${fullPath}'` });
      return NextResponse.json({ ok: true, path: rawPath });
    }

    if (action === "rename" && newPath) {
      const destPath = resolvePath(newPath);
      if (!destPath) return NextResponse.json({ error: "Invalid destination path" }, { status: 400 });
      await vm.exec({ command: `mv '${fullPath}' '${destPath}'` });
      return NextResponse.json({ ok: true, oldPath: rawPath, newPath });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to modify file" }, { status: 500 });
  }
}

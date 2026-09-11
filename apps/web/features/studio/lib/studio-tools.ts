/**
 * 13 Specialized MicroVM Development Tools for the Corvus AI Studio Agent.
 * With Built-in Revision Concurrency Protection & Runtime Diagnostic Self-Healing.
 */

import { tool } from "ai";
import type { Vm } from "freestyle";
import { z } from "zod";
import { WORKDIR, VM_PORT, APP_SESSION } from "./freestyle-client";
import { RevisionManager } from "./revision-manager";

const resolveInWorkdir = (rawPath: string): string | null => {
  const value = rawPath.trim();
  if (!value || value.includes("\0") || value.startsWith("/")) return null;

  const normalized = value.replace(/^\.\//, "");
  const segments = normalized.split("/").filter((s) => s && s !== ".");
  if (segments.some((segment) => segment === "..")) return null;

  return segments.length ? `${WORKDIR}/${segments.join("/")}` : WORKDIR;
};

const shellQuote = (value: string): string =>
  `'${value.replace(/'/g, `'\\''`)}'`;

const ANSI_ESCAPE = /\u001b\[[0-?]*[ -/]*[@-~]/g;

export const createStudioTools = (vm: Vm, projectId?: string, userId?: string) => {
  const run = async (command: string) => {
    const { stdout, stderr, statusCode } = await vm.exec({ command });
    return {
      ok: statusCode === 0,
      stdout: stdout ?? "",
      stderr: stderr ?? "",
      exitCode: statusCode ?? null,
      command,
    };
  };

  const readDevServerLogs = async (): Promise<string> => {
    const chunks: string[] = [];
    const decoder = new TextDecoder();

    const session = await vm.pty.attach({
      session: APP_SESSION,
      onData: (data) => chunks.push(decoder.decode(data, { stream: true })),
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));
    session.detach();

    return chunks.join("").replace(ANSI_ESCAPE, "").replace(/\r/g, "");
  };

  const bashTool = tool({
    description: "Run a bash command inside the project VM and return its output.",
    inputSchema: z.object({
      command: z.string().min(1).describe("The bash command to execute."),
    }),
    execute: ({ command }) => run(`cd ${shellQuote(WORKDIR)} && ${command}`),
  });

  const readFileTool = tool({
    description: "Read the content of a file in the project VM. Returns content and revision id.",
    inputSchema: z.object({
      file: z.string().min(1).describe("Path of the file to read."),
    }),
    execute: async ({ file }) => {
      const path = resolveInWorkdir(file);
      if (!path) return { ok: false, error: "Invalid file path." };
      const content = await vm.fs.readTextFile(path);
      const revision = projectId ? await RevisionManager.getFileRevision(projectId, file) : 1;
      return { ok: true, content, revision };
    },
  });

  const writeFileTool = tool({
    description: "Write content to a file in the project VM with concurrency protection.",
    inputSchema: z.object({
      file: z.string().min(1).describe("Path of the file to write."),
      content: z.string().describe("Content to write to the file."),
      expectedRevision: z.number().optional().describe("Expected file revision from prior read."),
    }),
    execute: async ({ file, content, expectedRevision }) => {
      const path = resolveInWorkdir(file);
      if (!path) return { ok: false, error: "Invalid file path." };

      if (projectId) {
        const check = await RevisionManager.validateWrite(projectId, file, expectedRevision);
        if (!check.allowed) {
          return {
            ok: false,
            conflict: true,
            error: "File revision conflict: file was modified concurrently.",
            currentRevision: check.currentRevision,
          };
        }
      }

      await vm.fs.writeTextFile(path, content);
      const newRev = projectId ? await RevisionManager.commitWrite(projectId, file, content, userId) : 1;
      return { ok: true, file, revision: newRev };
    },
  });

  const listFilesTool = tool({
    description: "List files or directories from a given path.",
    inputSchema: z.object({
      path: z.string().default(".").describe("Path to list."),
      recursive: z.boolean().default(false).describe("Whether to list recursively."),
      maxDepth: z.number().int().min(1).max(8).default(3),
    }),
    execute: async ({ path, recursive, maxDepth }) => {
      const target = resolveInWorkdir(path ?? ".");
      if (!target) return { ok: false, error: "Invalid path." };

      if (!recursive) {
        return { ok: true, path, entries: await vm.fs.readDir(target) };
      }

      return {
        ...(await run(
          `find ${shellQuote(target)} -maxdepth ${maxDepth} -not -path '*/node_modules/*' -not -path '*/.next/*' -not -path '*/.git/*' | sed 's#^${WORKDIR}/##'`
        )),
        path,
        recursive,
        maxDepth,
      };
    },
  });

  const searchFilesTool = tool({
    description: "Search for text within project files.",
    inputSchema: z.object({
      query: z.string().min(1).describe("Text to search for."),
      path: z.string().default(".").describe("Path to search under."),
      maxResults: z.number().int().min(1).max(500).default(100),
    }),
    execute: async ({ query, path, maxResults }) => {
      const target = resolveInWorkdir(path ?? ".");
      if (!target) return { ok: false, error: "Invalid path." };

      return {
        ...(await run(
          `grep -RIn --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git -- ${shellQuote(query)} ${shellQuote(target)} | head -n ${maxResults}`
        )),
        query,
        path,
      };
    },
  });

  const replaceInFileTool = tool({
    description: "Replace targeted text in a file without using bash.",
    inputSchema: z.object({
      file: z.string().min(1).describe("Path of the file to edit."),
      search: z.string().min(1).describe("Text to find."),
      replace: z.string().describe("Replacement text."),
      all: z.boolean().default(true),
    }),
    execute: async ({ file, search, replace, all }) => {
      const path = resolveInWorkdir(file);
      if (!path) return { ok: false, error: "Invalid file path." };

      const content = await vm.fs.readTextFile(path);
      if (!content.includes(search)) {
        return { ok: false, file, replacements: 0, error: "No matches found." };
      }

      const next = all ? content.split(search).join(replace) : content.replace(search, replace);
      const replacements = all ? content.split(search).length - 1 : 1;

      await vm.fs.writeTextFile(path, next);
      if (projectId) await RevisionManager.commitWrite(projectId, file, next, userId);

      return { ok: true, file, replacements };
    },
  });

  const appendToFileTool = tool({
    description: "Append text to an existing file.",
    inputSchema: z.object({
      file: z.string().min(1).describe("Path of the file to append to."),
      content: z.string().describe("Text content to append."),
    }),
    execute: async ({ file, content }) => {
      const path = resolveInWorkdir(file);
      if (!path) return { ok: false, error: "Invalid file path." };

      const existing = (await vm.fs.exists(path)) ? await vm.fs.readTextFile(path) : "";
      const updated = `${existing}${content}`;
      await vm.fs.writeTextFile(path, updated);
      if (projectId) await RevisionManager.commitWrite(projectId, file, updated, userId);

      return { ok: true, file, appendedBytes: content.length };
    },
  });

  const makeDirectoryTool = tool({
    description: "Create a directory with mkdir -p semantics.",
    inputSchema: z.object({
      path: z.string().min(1).describe("Directory path to create."),
    }),
    execute: async ({ path }) => {
      const target = resolveInWorkdir(path);
      if (!target) return { ok: false, error: "Invalid path." };
      return run(`mkdir -p ${shellQuote(target)}`);
    },
  });

  const movePathTool = tool({
    description: "Move or rename a file or directory.",
    inputSchema: z.object({
      from: z.string().min(1).describe("Source path."),
      to: z.string().min(1).describe("Destination path."),
    }),
    execute: async ({ from, to }) => {
      const source = resolveInWorkdir(from);
      const destination = resolveInWorkdir(to);
      if (!source || !destination) return { ok: false, error: "Invalid source or destination path." };
      return run(`mv ${shellQuote(source)} ${shellQuote(destination)}`);
    },
  });

  const deletePathTool = tool({
    description: "Delete a file or directory.",
    inputSchema: z.object({
      path: z.string().min(1).describe("Path to delete."),
    }),
    execute: async ({ path }) => {
      const target = resolveInWorkdir(path);
      if (!target || target === WORKDIR) return { ok: false, error: "Invalid path." };
      await vm.fs.remove(target);
      return { ok: true, path };
    },
  });

  const checkAppTool = tool({
    description:
      "Check that the app is running correctly by querying the dev server and scanning logs for compile errors. MUST call this before declaring task completion.",
    inputSchema: z.object({
      path: z.string().default("/").describe("URL path to check (e.g. '/' or '/dashboard')."),
    }),
    execute: async ({ path }) => {
      const urlPath = path?.startsWith("/") ? path : `/${path ?? ""}`;
      const result = await run(
        `curl -s -o /dev/null -w '%{http_code}' http://localhost:${VM_PORT}${urlPath}`
      );
      const statusCode = Number.parseInt(result.stdout.trim(), 10);

      const logs = await readDevServerLogs();
      const issueRegex =
        /(error -|failed to compile|module not found|unhandled runtime error|referenceerror|typeerror|syntaxerror|cannot find module)/i;
      const issues = logs.split("\n").filter((line) => issueRegex.test(line)).slice(-20);

      const httpOk = statusCode >= 200 && statusCode < 400;
      const ok = httpOk && issues.length === 0;

      return {
        ok,
        statusCode: Number.isNaN(statusCode) ? null : statusCode,
        url: `http://localhost:${VM_PORT}${urlPath}`,
        issues,
      };
    },
  });

  const devServerLogsTool = tool({
    description: "Fetch recent dev server logs to debug compile or runtime errors.",
    inputSchema: z.object({
      maxLines: z.number().int().min(1).max(1000).default(200),
    }),
    execute: async ({ maxLines }) => {
      const lines = (await readDevServerLogs()).split("\n");
      return {
        ok: true,
        logs: lines.slice(-maxLines).join("\n"),
        totalLines: lines.length,
      };
    },
  });

  const restartDevServerTool = tool({
    description: "Restart the Next.js dev server.",
    inputSchema: z.object({}),
    execute: async () => {
      await vm.pty.close(APP_SESSION).catch(() => {});
      const session = await vm.pty.open({
        slug: APP_SESSION,
        exec: `cd ${WORKDIR} && npm run dev`,
        replaceOnExit: true,
        cols: 120,
        rows: 30,
      });
      session.detach();
      return { ok: true };
    },
  });

  return {
    bashTool,
    readFileTool,
    writeFileTool,
    listFilesTool,
    searchFilesTool,
    replaceInFileTool,
    appendToFileTool,
    makeDirectoryTool,
    movePathTool,
    deletePathTool,
    checkAppTool,
    devServerLogsTool,
    restartDevServerTool,
  };
};

/**
 * PTY Terminal Bridge for Corvus Studio MicroVMs.
 * Maintains persistent PTY sessions and fans out terminal output to browser tabs over SSE.
 */

import type { PtySession } from "freestyle";
import { StudioVmManager } from "./studio-vm-manager";
import { APP_SESSION, WORKDIR } from "./freestyle-client";

type BridgedSession = {
  session: PtySession;
  subscribers: Set<(chunk: Uint8Array) => void>;
  history: Uint8Array[];
  historyBytes: number;
};

const REPLAY_LIMIT = 256 * 1024;

const registry: Map<string, Promise<BridgedSession>> = ((
  globalThis as Record<string, unknown>
)["__corvusStudioTerminals"] as Map<string, Promise<BridgedSession>>) ??
((globalThis as Record<string, unknown>)["__corvusStudioTerminals"] = new Map());

const key = (vmId: string, slug: string) => `${vmId}:${slug}`;

const bridge = (vmId: string, slug: string, command?: string) => {
  const id = key(vmId, slug);
  const existing = registry.get(id);
  if (existing) return existing;

  const opening = (async (): Promise<BridgedSession> => {
    const subscribers = new Set<(chunk: Uint8Array) => void>();
    const history: Uint8Array[] = [];
    let historyBytes = 0;

    const events = {
      onData: (chunk: Uint8Array) => {
        history.push(chunk);
        historyBytes += chunk.byteLength;
        while (historyBytes > REPLAY_LIMIT && history.length > 1) {
          historyBytes -= history.shift()!.byteLength;
        }
        for (const subscriber of subscribers) subscriber(chunk);
      },
      onClose: () => registry.delete(id),
      onError: () => registry.delete(id),
    };

    const vm = StudioVmManager.getDevVm(vmId);
    const pty = vm.pty;

    const session = await pty.attach({ session: slug, ...events }).catch(() =>
      pty.open({
        slug,
        ...(command ? { exec: command } : {}),
        replaceOnExit: true,
        cols: 120,
        rows: 30,
        ...events,
      })
    );

    return {
      session,
      subscribers,
      get history() {
        return history;
      },
      get historyBytes() {
        return historyBytes;
      },
    };
  })();

  registry.set(id, opening);
  opening.catch(() => registry.delete(id));
  return opening;
};

export const subscribeToTerminal = async (
  vmId: string,
  slug: string,
  command: string | undefined,
  onChunk: (chunk: Uint8Array) => void
) => {
  const connection = await bridge(vmId, slug, command);
  for (const chunk of connection.history) onChunk(chunk);
  connection.subscribers.add(onChunk);
  return () => connection.subscribers.delete(onChunk);
};

export const writeToTerminal = async (vmId: string, slug: string, data: string) => {
  const { session } = await bridge(vmId, slug);
  session.write(data);
};

export const resizeTerminal = async (
  vmId: string,
  slug: string,
  cols: number,
  rows: number
) => {
  const { session } = await bridge(vmId, slug);
  session.resize({ cols, rows });
};

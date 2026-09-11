"use client";

import { useEffect, useRef } from "react";
import "@xterm/xterm/css/xterm.css";

const decodeChunk = (payload: string) =>
  Uint8Array.from(atob(payload), (character) => character.charCodeAt(0));

export function VmTerminal({
  projectId,
  session,
  className,
}: {
  projectId: string;
  session: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    const endpoint = `/api/studio/terminal`;
    const cleanups: Array<() => void> = [];

    const post = (body: Record<string, unknown>) =>
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, session, ...body }),
        keepalive: true,
      }).catch(() => {});

    void (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);
      if (disposed) return;

      const terminal = new Terminal({
        fontSize: 12,
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        cursorBlink: true,
        convertEol: true,
        theme: {
          background: "#090b0f",
          foreground: "#d4d4d4",
          cursor: "#38bdf8",
        },
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(container);
      cleanups.push(() => terminal.dispose());

      let resizeTimer: number | undefined;
      const syncSize = () => {
        fitAddon.fit();
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(
          () => void post({ cols: terminal.cols, rows: terminal.rows }),
          150
        );
      };

      syncSize();

      const observer = new ResizeObserver(syncSize);
      observer.observe(container);
      cleanups.push(() => {
        observer.disconnect();
        window.clearTimeout(resizeTimer);
      });

      terminal.onData((data) => void post({ data }));

      const events = new EventSource(
        `${endpoint}?projectId=${encodeURIComponent(projectId)}&session=${encodeURIComponent(session)}`
      );
      events.onmessage = (event) => terminal.write(decodeChunk(event.data));
      cleanups.push(() => events.close());
    })();

    return () => {
      disposed = true;
      for (const cleanup of cleanups) cleanup();
    };
  }, [projectId, session]);

  return <div ref={containerRef} className={`h-full w-full overflow-hidden ${className || ""}`} />;
}

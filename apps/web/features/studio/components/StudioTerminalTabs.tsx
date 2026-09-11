"use client";

import { useState } from "react";
import { cn } from "@corvus/ui";
import { Terminal, Plus, X, Server, RefreshCw } from "lucide-react";
import { VmTerminal } from "./VmTerminal";

interface TerminalTab {
  id: string;
  label: string;
  session: string;
  closable: boolean;
}

export function StudioTerminalTabs({ projectId }: { projectId: string }) {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: "dev-server", label: "Dev Server", session: "dev", closable: false },
    { id: "shell-1", label: "Shell 1", session: "shell-1", closable: true },
  ]);
  const [activeTabId, setActiveTabId] = useState("dev-server");
  const [shellCounter, setShellCounter] = useState(2);

  const addShellTab = () => {
    const newId = `shell-${shellCounter}`;
    setTabs((prev) => [
      ...prev,
      {
        id: newId,
        label: `Shell ${shellCounter}`,
        session: newId,
        closable: true,
      },
    ]);
    setActiveTabId(newId);
    setShellCounter((c) => c + 1);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs((prev) => prev.filter((t) => t.id !== id));
    if (activeTabId === id) {
      setActiveTabId("dev-server");
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#0a0c10] border-t border-white/[0.08]">
      {/* Terminal Tab Bar */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0d1017] px-2">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={cn(
                  "flex h-6 items-center gap-1.5 rounded px-2.5 font-mono text-[11px] transition-all",
                  isActive
                    ? "bg-accent/15 text-accent font-semibold border-b-2 border-accent"
                    : "text-text-muted hover:bg-white/[0.04] hover:text-white"
                )}
              >
                {tab.id === "dev-server" ? <Server size={12} /> : <Terminal size={12} />}
                <span>{tab.label}</span>
                {tab.closable && (
                  <span
                    onClick={(e) => closeTab(tab.id, e)}
                    className="ml-1 hover:text-rose-400 p-0.5 rounded"
                  >
                    <X size={10} />
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            title="New Terminal Shell"
            onClick={addShellTab}
            className="flex h-5 w-5 items-center justify-center rounded text-text-muted hover:bg-white/10 hover:text-white ml-1"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="relative flex-1 min-h-0 bg-[#090b0f]">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn("h-full w-full", tab.id === activeTabId ? "block" : "hidden")}
          >
            <VmTerminal projectId={projectId} session={tab.session} />
          </div>
        ))}
      </div>
    </div>
  );
}

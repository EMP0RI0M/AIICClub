"use client";

import { useState, useEffect } from "react";
import { cn } from "@corvus/ui";
import { 
  Menu, CloudUpload, Settings, RefreshCw, CheckCircle2,
  FolderOpen, Code2, Monitor, Terminal as TerminalIcon,
  Bot, Eye, Sparkles, X, ChevronRight, Play, MessageSquare,
  Rocket, Key
} from "lucide-react";
import Link from "next/link";
import { StudioFileTree } from "./StudioFileTree";
import { MonacoVMEditor } from "./MonacoVMEditor";
import { StudioAppPreview } from "./StudioAppPreview";
import { StudioTerminalTabs } from "./StudioTerminalTabs";
import { StudioAIChat } from "./StudioAIChat";
import { StudioSettingsModal } from "./StudioSettingsModal";
import { StudioChangeReviewModal, ChangeSetDetail } from "./StudioChangeReviewModal";

interface StudioWorkspaceShellProps {
  projectId: string;
  projectName?: string;
  previewUrl: string;
}

export function StudioWorkspaceShell({
  projectId,
  projectName = "Corvus Next.js App",
  previewUrl,
}: StudioWorkspaceShellProps) {
  const [activeFilePath, setActiveFilePath] = useState<string | null>("app/page.tsx");
  const [openFilePaths, setOpenFilePaths] = useState<string[]>(["app/page.tsx"]);
  
  // Tab Navigation for Mobile & Desktop
  // Primary default view is "chat" (Lovable AI Conversation)
  const [activeView, setActiveView] = useState<"chat" | "editor" | "preview" | "files" | "terminal">("chat");

  // Mobile viewport detection (< 768px)
  const [isMobile, setIsMobile] = useState(false);

  // Settings & Key Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Deploying visual state
  const [deployVisualState, setDeployVisualState] = useState<"normal" | "deploying" | "success">("normal");

  // Change Set Diff review state
  const [activeChangeSet, setActiveChangeSet] = useState<ChangeSetDetail | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleSelectFile = (path: string) => {
    if (!openFilePaths.includes(path)) {
      setOpenFilePaths((prev) => [...prev, path]);
    }
    setActiveFilePath(path);
    setActiveView("editor");
  };

  const handleCloseFile = (path: string) => {
    const nextOpen = openFilePaths.filter((p) => p !== path);
    setOpenFilePaths(nextOpen);
    if (activeFilePath === path) {
      setActiveFilePath(nextOpen.length > 0 ? nextOpen[nextOpen.length - 1] : null);
    }
  };

  const handleDeployClick = () => {
    setDeployVisualState("deploying");
    setTimeout(() => {
      setDeployVisualState("success");
      setTimeout(() => setDeployVisualState("normal"), 3500);
    }, 2000);
  };

  return (
    <div className="h-[100dvh] w-screen flex flex-col bg-[#07080c] text-white select-none overflow-hidden font-sans">
      {/* ─── Top Premium Sticky Header (Corvus / AIIC Branding) ─────────────── */}
      <header className="shrink-0 px-2 sm:px-4 pt-2 pb-1 z-30">
        <div className="h-12 sm:h-14 border border-white/10 rounded-full bg-[#11131c]/90 backdrop-blur-2xl px-3 sm:px-4 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_rgba(255,255,255,0.08)]">
          {/* Left: Corvus / AIIC Logo + Home */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/spaces"
              title="Corvus Spaces"
              className="flex items-center justify-center size-8 sm:size-9 shrink-0 rounded-full bg-gradient-to-tr from-orange-500/20 to-amber-500/20 border border-orange-500/30 text-orange-400 hover:scale-105 active:scale-95 transition-all"
            >
              <Sparkles className="size-4 text-orange-400" />
            </Link>

            {/* Center Project Name Button */}
            <button 
              type="button"
              className="flex items-center gap-2 bg-transparent hover:bg-white/5 rounded-full px-2 py-1 transition-colors min-w-0 group"
            >
              <span className="text-xs sm:text-sm font-semibold text-white tracking-tight truncate max-w-[130px] sm:max-w-[200px]">
                {projectName}
              </span>
            </button>
          </div>

          {/* Center (Desktop Only): Quick Mode Navigation */}
          {!isMobile && (
            <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-full p-1 shadow-inner">
              {[
                { id: "chat", label: "AI Co-Pilot", icon: Sparkles },
                { id: "preview", label: "Live Preview", icon: Eye },
                { id: "editor", label: "Code Editor", icon: Code2 },
                { id: "files", label: "Files", icon: FolderOpen },
                { id: "terminal", label: "Terminal", icon: TerminalIcon },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeView === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id as any)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all",
                      isActive
                        ? "bg-white/15 text-orange-400 font-semibold shadow-sm"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon size={13} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Right: MicroVM Badge + API Keys + Publish */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* API Keys Vault Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1 h-8 sm:h-9 px-2.5 sm:px-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-mono transition-all active:scale-95"
              title="Configure AI Provider Keys"
            >
              <Key size={13} className="text-orange-400" />
              <span className="hidden md:inline">Keys</span>
            </button>

            {/* Green glowing MicroVM indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25">
              <div className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
              <span className="hidden sm:inline font-mono text-[10.5px] text-emerald-300 font-medium">
                MicroVM Running
              </span>
            </div>

            {/* Premium Golden/Orange Publish Button */}
            <button
              onClick={handleDeployClick}
              disabled={deployVisualState === "deploying"}
              className="flex items-center gap-1.5 h-8 sm:h-9 px-3 sm:px-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium text-xs shadow-[0_0_18px_rgba(249,115,22,0.35)] hover:brightness-110 active:scale-95 disabled:opacity-80 transition-all"
              title="Publish application"
            >
              {deployVisualState === "deploying" ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : deployVisualState === "success" ? (
                <CheckCircle2 className="size-3.5 text-white" />
              ) : (
                <Rocket className="size-3.5" />
              )}
              <span className="font-semibold">
                {deployVisualState === "deploying"
                  ? "Publishing..."
                  : deployVisualState === "success"
                  ? "Published"
                  : "Publish"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main Viewport Area ─────────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 px-2 pb-2 sm:px-4 sm:pb-3 flex gap-3 overflow-hidden">
        {/* MOBILE MODE (< 768px): Single Focused Screen Experience */}
        {isMobile ? (
          <div className="flex-1 h-full rounded-2xl border border-white/10 bg-[#0f111a]/95 backdrop-blur-xl overflow-hidden shadow-2xl flex flex-col min-h-0">
            {/* 1. Default Primary View: AI Chat */}
            {activeView === "chat" && (
              <div className="flex-1 min-h-0">
                <StudioAIChat 
                  projectId={projectId} 
                  onOpenPreview={() => setActiveView("preview")}
                  onOpenFiles={() => setActiveView("files")}
                />
              </div>
            )}

            {/* 2. Full-Screen Preview */}
            {activeView === "preview" && (
              <div className="flex-1 min-h-0">
                <StudioAppPreview 
                  previewUrl={previewUrl} 
                  onBack={() => setActiveView("chat")} 
                />
              </div>
            )}

            {/* 3. Full-Screen File Tree */}
            {activeView === "files" && (
              <div className="flex-1 min-h-0">
                <StudioFileTree
                  projectId={projectId}
                  activeFilePath={activeFilePath}
                  onSelectFile={handleSelectFile}
                />
              </div>
            )}

            {/* 4. Full-Screen Monaco Code Editor */}
            {activeView === "editor" && (
              <div className="flex-1 min-h-0">
                <MonacoVMEditor
                  projectId={projectId}
                  activeFilePath={activeFilePath}
                  openFilePaths={openFilePaths}
                  onSelectFile={handleSelectFile}
                  onCloseFile={handleCloseFile}
                />
              </div>
            )}

            {/* 5. Terminal */}
            {activeView === "terminal" && (
              <div className="flex-1 min-h-0">
                <StudioTerminalTabs projectId={projectId} />
              </div>
            )}
          </div>
        ) : (
          /* DESKTOP MODE (>= 768px): Professional Multi-Pane IDE Layout */
          <>
            {/* Pane 1: Files Sidebar */}
            <div className="w-56 shrink-0 rounded-2xl border border-white/10 bg-[#0f111a]/90 backdrop-blur-xl overflow-hidden shadow-xl flex flex-col">
              <StudioFileTree
                projectId={projectId}
                activeFilePath={activeFilePath}
                onSelectFile={handleSelectFile}
              />
            </div>

            {/* Pane 2: Center Editor / Terminal */}
            <div className="flex-1 flex flex-col rounded-2xl border border-white/10 bg-[#0f111a]/90 backdrop-blur-xl overflow-hidden shadow-xl min-w-0">
              {activeView === "terminal" ? (
                <div className="flex-1 min-h-0">
                  <StudioTerminalTabs projectId={projectId} />
                </div>
              ) : (
                <div className="flex-1 min-h-0">
                  <MonacoVMEditor
                    projectId={projectId}
                    activeFilePath={activeFilePath}
                    openFilePaths={openFilePaths}
                    onSelectFile={handleSelectFile}
                    onCloseFile={handleCloseFile}
                  />
                </div>
              )}
            </div>

            {/* Pane 3: Right (Interactive Lovable AI Chat OR Live Preview) */}
            <div className="w-[450px] xl:w-[500px] shrink-0 rounded-2xl border border-white/10 bg-[#0f111a]/90 backdrop-blur-xl overflow-hidden shadow-xl flex flex-col">
              {activeView === "preview" ? (
                <div className="flex-1 min-h-0">
                  <StudioAppPreview previewUrl={previewUrl} />
                </div>
              ) : (
                <div className="flex-1 min-h-0">
                  <StudioAIChat 
                    projectId={projectId} 
                    onOpenPreview={() => setActiveView("preview")}
                    onOpenFiles={() => setActiveView("files")}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* ─── Mobile Bottom Navigation Dock ──────────────────────────────────── */}
      {isMobile && (
        <nav className="shrink-0 px-3 pb-3 pt-0.5 z-30">
          <div className="h-14 bg-[#121420]/90 backdrop-blur-2xl border border-white/15 rounded-full px-2 shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_rgba(255,255,255,0.1)] flex items-center justify-around">
            {[
              { id: "chat", icon: MessageSquare, label: "AI Chat" },
              { id: "preview", icon: Eye, label: "Preview" },
              { id: "editor", icon: Code2, label: "Code" },
              { id: "files", icon: FolderOpen, label: "Files" },
              { id: "terminal", icon: TerminalIcon, label: "Terminal" },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.vibrate) {
                      navigator.vibrate(15);
                    }
                    setActiveView(item.id as any);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-full transition-all duration-200 active:scale-95",
                    isActive
                      ? "text-orange-400 bg-white/10 font-semibold shadow-[0_0_12px_rgba(249,115,22,0.25)]"
                      : "text-white/50 hover:text-white"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 transition-transform duration-200",
                      isActive ? "scale-110 text-orange-400" : "scale-100"
                    )}
                  />
                  <span className="text-[10px] font-medium tracking-tight">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Settings & BYOK Keys Modal */}
      <StudioSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Diff Review Modal */}
      {activeChangeSet && (
        <StudioChangeReviewModal
          changeSet={activeChangeSet}
          onClose={() => setActiveChangeSet(null)}
          onApply={async (ids) => {
            await fetch("/api/studio/changesets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "apply",
                projectId,
                changeSetId: activeChangeSet.id,
                changeIds: ids,
              }),
            });
            setActiveChangeSet(null);
          }}
          onReject={async () => {
            await fetch("/api/studio/changesets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "reject",
                projectId,
                changeSetId: activeChangeSet.id,
              }),
            });
            setActiveChangeSet(null);
          }}
        />
      )}
    </div>
  );
}

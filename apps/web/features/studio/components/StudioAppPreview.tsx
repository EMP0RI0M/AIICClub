"use client";

import { useState } from "react";
import { RefreshCw, ExternalLink, Globe, Smartphone, Monitor, AlertCircle, ArrowLeft } from "lucide-react";

interface StudioAppPreviewProps {
  previewUrl: string;
  onBack?: () => void;
}

export function StudioAppPreview({ previewUrl, onBack }: StudioAppPreviewProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [deviceMode, setDeviceMode] = useState<"responsive" | "mobile">("responsive");

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
    setTimeout(() => setIsLoading(false), 800);
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#07090e] select-none">
      {/* Top Address & Navigation Bar */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#0d1017] px-3 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              title="Back to Chat"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
            >
              <ArrowLeft size={13} />
            </button>
          )}

          <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 border border-white/10 text-[11px] font-mono text-white/70 max-w-[180px] sm:max-w-xs truncate">
            <Globe size={11} className="text-emerald-400 shrink-0" />
            <span className="truncate">{previewUrl}</span>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-1">
          <div className="hidden sm:flex items-center bg-black/30 rounded-full p-0.5 border border-white/10">
            <button
              type="button"
              onClick={() => setDeviceMode("responsive")}
              className={`p-1 rounded-full text-xs ${deviceMode === "responsive" ? "bg-white/10 text-white" : "text-white/40"}`}
              title="Desktop View"
            >
              <Monitor size={12} />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode("mobile")}
              className={`p-1 rounded-full text-xs ${deviceMode === "mobile" ? "bg-white/10 text-white" : "text-white/40"}`}
              title="Mobile Device View"
            >
              <Smartphone size={12} />
            </button>
          </div>

          <button
            type="button"
            title="Reload Preview"
            onClick={handleRefresh}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin text-orange-400" : ""} />
          </button>

          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            title="Open in new tab"
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
          >
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Sandboxed Live Running Preview Canvas */}
      <div className="flex-1 min-h-0 relative bg-neutral-950 flex items-center justify-center overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            deviceMode === "mobile" ? "w-[375px] my-auto border-x border-white/10 shadow-2xl" : "w-full"
          }`}
        >
          <iframe
            key={iframeKey}
            src={previewUrl}
            title="Studio Live App Preview"
            className="h-full w-full border-none bg-white"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  );
}

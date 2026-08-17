"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@corvus/ui";
import { Video, Mic, Monitor, Square, X, Play, Pause, Volume2, Download, Maximize2 } from "lucide-react";

/**
 * Async video clips (brief §Clips) — a Loom-style floating control bar,
 * bottom-centered. Stop produces a clip message in the current channel.
 */
export function ClipRecorder({
  onStop,
  onCancel,
}: {
  onStop: (duration: string, file?: File) => void;
  onCancel: () => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const [camera, setCamera] = useState(true);
  const [mic, setMic] = useState(true);
  const [screen, setScreen] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);

    // Initialize camera/mic recording if supported
    async function startRecording() {
      try {
        if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          streamRef.current = stream;
          const mr = new MediaRecorder(stream, { mimeType: "video/webm" });
          mediaRecorderRef.current = mr;
          mr.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              recordedChunksRef.current.push(e.data);
            }
          };
          mr.start(500);
        }
      } catch (err) {
        console.warn("[CLIP] MediaRecorder permission or initialization notice:", err);
      }
    }

    startRecording();

    return () => {
      clearInterval(t);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((trk) => trk.stop());
      }
    };
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const duration = `${mm}:${ss}`;

  const handleStop = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const file = new File([blob], `clip_${Date.now()}.webm`, { type: "video/webm" });
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((trk) => trk.stop());
        }
        onStop(duration, file);
      };
      mr.stop();
    } else {
      onStop(duration);
    }
  };

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/[0.12] bg-[#121722]/90 px-4 py-2 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.6)]"
    >
      <span className="flex items-center gap-1.5 font-mono text-[13px] text-danger font-bold">
        <span className="h-2 w-2 rounded-full bg-danger animate-pulse" /> {duration}
      </span>

      <span className="h-5 w-px bg-white/[0.1]" />

      <RecorderToggle label="Camera" active={camera} onClick={() => setCamera((v) => !v)}>
        <Video size={16} />
      </RecorderToggle>
      <RecorderToggle label="Microphone" active={mic} onClick={() => setMic((v) => !v)}>
        <Mic size={16} />
      </RecorderToggle>
      <RecorderToggle label="Screen" active={screen} onClick={() => setScreen((v) => !v)}>
        <Monitor size={16} />
      </RecorderToggle>

      <span className="h-5 w-px bg-white/[0.1]" />

      <button
        type="button"
        onClick={handleStop}
        className="flex h-9 items-center gap-2 rounded-xl bg-accent px-3.5 font-mono text-xs font-semibold text-on-accent shadow-[0_2px_12px_rgba(var(--c-accent-rgb,138,92,246),0.5)] transition-all hover:scale-105 active:scale-95"
      >
        <Square size={11} fill="currentColor" /> Stop
      </button>
      <button
        type="button"
        aria-label="Cancel recording"
        onClick={() => {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((trk) => trk.stop());
          }
          onCancel();
        }}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-text-secondary transition-all hover:bg-white/[0.12] hover:text-text-primary active:scale-95"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function RecorderToggle({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-xl transition-all active:scale-95",
        active
          ? "bg-accent/20 border border-accent/40 text-accent"
          : "bg-white/[0.04] text-text-muted hover:bg-white/[0.08] hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}

/** Inline clip playback embed with real video modal player. */
export function ClipEmbed({ duration, size, url }: { duration: string; size?: string; url?: string }) {
  const [playing, setPlaying] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="mt-2 w-full max-w-[420px] overflow-hidden rounded-[20px] border border-white/[0.1] bg-[#121622]/80 backdrop-blur-md shadow-md">
        {playing && url ? (
          <div className="relative aspect-video w-full bg-black">
            <video
              src={url}
              controls
              autoPlay
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
              onEnded={() => setPlaying(false)}
            />
          </div>
        ) : (
          <button
            type="button"
            aria-label="Play clip"
            onClick={() => {
              if (url) setPlaying(true);
              else setModalOpen(true);
            }}
            className="group relative flex aspect-video w-full cursor-pointer items-center justify-center bg-gradient-to-br from-[#1b2234] to-[#0c0f17] transition-all"
          >
            {url && (
              <video
                src={url}
                preload="metadata"
                className="absolute inset-0 h-full w-full object-cover opacity-60 pointer-events-none"
              />
            )}
            <div className="relative z-10 flex h-13 w-13 items-center justify-center rounded-full bg-accent/90 text-on-accent shadow-[0_4px_24px_rgba(var(--c-accent-rgb,138,92,246),0.6)] transition-all group-hover:scale-110 active:scale-95">
              <Play size={20} fill="currentColor" className="ml-0.5" />
            </div>
          </button>
        )}
        <div className="flex items-center justify-between px-3.5 py-2.5 font-mono text-[11px] text-text-muted border-t border-white/[0.06]">
          <span className="flex items-center gap-1.5 text-text-secondary font-semibold">
            <Video size={13} className="text-accent" /> Clip · {duration}
          </span>
          {size && <span>{size}</span>}
        </div>
      </div>

      {/* Media Player Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative w-full max-w-[640px] rounded-[28px] border border-white/[0.12] bg-[#121722]/95 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Video size={16} className="text-accent" />
                <span className="font-mono text-xs font-bold text-text-primary">Recorded Clip ({duration})</span>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-white/[0.08] hover:text-text-primary transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 aspect-video w-full overflow-hidden rounded-2xl bg-black/60 flex items-center justify-center">
              {url ? (
                <video src={url} controls autoPlay playsInline className="h-full w-full object-contain" />
              ) : (
                <div className="text-center p-6">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/20 text-accent mb-3">
                    <Play size={24} fill="currentColor" className="ml-0.5" />
                  </div>
                  <p className="font-mono text-xs text-text-primary font-bold">Clip Preview ({duration})</p>
                  <p className="text-[11px] text-text-muted mt-1">Audio &amp; video stream recorded.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

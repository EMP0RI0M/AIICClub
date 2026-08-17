"use client";

import { useEffect, useRef, useState } from "react";
import { ChannelGlyph } from "@/shared/components/ui";
import { ArrowLeft, Mic } from "lucide-react";
import type { VoiceParticipant } from "./types";
import { Room, RoomEvent, Track, RemoteParticipant, RemoteTrack } from "livekit-client";
import { joinVoiceChannel, leaveVoiceChannel } from "@/shared/lib/api";
import { useToastStore } from "@/shared/stores/toast-store";
import {
  CallControls,
  ConnectionPill,
  ParticipantTile,
  ScreenShareStage,
  WhiteboardLayer,
  useCallControls,
} from "./CallSurface";

/**
 * Voice & Video channel view (Multi-user WebRTC room via LiveKit).
 */
export function VoiceView({
  channelId,
  channelName,
  participants: initialParticipants = [],
  onLeave,
  onBack,
  previewEnabled = true,
}: {
  channelId?: string;
  channelName: string;
  participants?: VoiceParticipant[];
  onLeave?: () => void;
  onBack?: () => void;
  previewEnabled?: boolean;
}) {
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState<VoiceParticipant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const roomRef = useRef<Room | null>(null);
  const audioHostRef = useRef<HTMLDivElement | null>(null);

  const { state, toggle, camStream, screenStream } = useCallControls(undefined, joined);

  // Connect to the shared voice room when joined
  useEffect(() => {
    if (!joined || !channelId) return;

    let disposed = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    const audioHost = audioHostRef.current;
    roomRef.current = room;
    setConnecting(true);

    const updateParticipantList = () => {
      if (disposed) return;
      const peers: VoiceParticipant[] = Array.from(room.remoteParticipants.values()).map((p) => ({
        id: p.identity,
        name: p.name || p.identity,
        speaking: p.isSpeaking,
        muted: !p.isMicrophoneEnabled,
      }));
      setRemoteParticipants(peers);
    };

    room.on(RoomEvent.ParticipantConnected, () => updateParticipantList());
    room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      updateParticipantList();
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(participant.identity);
        return next;
      });
    });

    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, pub, participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach();
        el.autoplay = true;
        audioHost?.appendChild(el);
      }
      if (track.kind === Track.Kind.Video && track.mediaStreamTrack) {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(participant.identity, new MediaStream([track.mediaStreamTrack]));
          return next;
        });
      }
      updateParticipantList();
    });

    room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, pub, participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Audio) {
        for (const el of track.detach()) el.remove();
      }
      if (track.kind === Track.Kind.Video) {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.delete(participant.identity);
          return next;
        });
      }
      updateParticipantList();
    });

    room.on(RoomEvent.ActiveSpeakersChanged, () => updateParticipantList());

    void (async () => {
      try {
        const transport = await joinVoiceChannel(channelId);
        if (disposed) return;

        await room.connect(transport.url, transport.token);
        await room.startAudio().catch(() => undefined);
        await room.localParticipant.setMicrophoneEnabled(!state.muted);
        if (state.camera) await room.localParticipant.setCameraEnabled(true);

        updateParticipantList();
        setConnecting(false);
      } catch (err: any) {
        if (!disposed) {
          console.error("[VOICE_ROOM_CONNECT_ERROR]", err);
          setConnecting(false);
          useToastStore.getState().addToast({
            title: "Could not join voice room",
            body: err?.message || "Check your network connection and try again.",
            variant: "error",
          });
        }
      }
    })();

    return () => {
      disposed = true;
      if (channelId) void leaveVoiceChannel(channelId).catch(() => undefined);
      room.disconnect();
      roomRef.current = null;
      audioHost?.replaceChildren();
      setRemoteParticipants([]);
      setRemoteStreams(new Map());
    };
  }, [joined, channelId]);

  useEffect(() => {
    const room = roomRef.current;
    if (room?.state === "connected") {
      void room.localParticipant.setMicrophoneEnabled(!state.muted);
    }
  }, [state.muted]);

  useEffect(() => {
    const room = roomRef.current;
    if (room?.state === "connected") {
      void room.localParticipant.setCameraEnabled(state.camera);
    }
  }, [state.camera]);

  if (!joined) {
    return (
      <section className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-center bg-[#0b0e14] px-6 text-center overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[450px] w-[500px] -translate-x-1/2 rounded-full bg-accent/5 blur-[120px]" />

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to channels"
            className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary hover:bg-white/[0.06] hover:text-text-primary active:scale-95 transition-all md:hidden"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent/15 border border-accent/30 text-accent shadow-[0_0_30px_rgba(var(--c-accent-rgb,138,92,246),0.2)]">
          <ChannelGlyph type="voice" size={30} />
        </div>

        <h1 className="mt-5 text-xl font-bold tracking-tight text-text-primary">{channelName}</h1>
        <p className="mt-2 max-w-sm text-xs sm:text-sm text-text-muted leading-relaxed">
          Connect your microphone and join your teammates in shared real-time spatial audio and video.
        </p>

        <button
          type="button"
          onClick={() => setJoined(true)}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-2xl bg-accent px-6 font-mono text-xs font-semibold text-on-accent shadow-[0_4px_20px_rgba(var(--c-accent-rgb,138,92,246),0.4)] transition-all hover:scale-105 active:scale-95"
        >
          <Mic size={15} /> Join Voice Channel
        </button>
      </section>
    );
  }

  // Combined participant list (remote participants + local user)
  const everyone: VoiceParticipant[] = [
    ...remoteParticipants,
    { id: "local-me", name: "you", muted: state.muted, deafened: state.deafened },
  ];

  const presenter = state.sharing
    ? { name: "you", self: true }
    : (() => {
        const p = remoteParticipants.find((x) => x.sharing);
        return p ? { name: p.name, self: false } : null;
      })();

  return (
    <section className="relative flex h-full min-w-0 flex-1 flex-col bg-[#0b0e14] overflow-hidden">
      <div ref={audioHostRef} className="hidden" aria-hidden />

      {/* ─── Floating Glass Header ─── */}
      <div className="relative z-10 px-3 pt-3 sm:px-4 sm:pt-4">
        <header className="flex h-13 shrink-0 items-center justify-between rounded-[20px] border border-white/[0.08] bg-[#121722]/75 px-4 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back to channels"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-white/[0.06] hover:text-text-primary active:scale-95 transition-all md:hidden"
              >
                <ArrowLeft size={17} />
              </button>
            )}
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 border border-accent/25 text-accent shrink-0">
              <ChannelGlyph type="voice" size={15} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[14.5px] font-bold text-text-primary truncate">{channelName}</h1>
              <span className="font-mono text-[10px] text-accent uppercase tracking-wider">
                {connecting ? "Connecting..." : `${everyone.length} in Voice`}
              </span>
            </div>
          </div>

          <div className="ml-auto">
            <ConnectionPill />
          </div>
        </header>
      </div>

      {/* ─── Stage & Participant Tiles ─── */}
      <div className="relative min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {presenter ? (
          <div className="flex h-full flex-col gap-3">
            <ScreenShareStage
              presenterName={presenter.name}
              self={presenter.self}
              stream={presenter.self ? screenStream : undefined}
              onStop={presenter.self ? () => toggle("sharing") : undefined}
            />
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
              {everyone.map((p) => (
                <ParticipantTile
                  key={p.id}
                  participant={p}
                  size={36}
                  stream={
                    p.id === "local-me" && state.camera
                      ? camStream
                      : remoteStreams.get(p.id) || undefined
                  }
                  className="w-[190px] shrink-0 rounded-[22px] border border-white/[0.08] bg-[#131824]/80 backdrop-blur-md"
                />
              ))}
            </div>
          </div>
        ) : (
          <div
            className="grid h-full content-start gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
          >
            {everyone.map((p) => (
              <ParticipantTile
                key={p.id}
                participant={p}
                stream={
                  p.id === "local-me" && state.camera
                    ? camStream
                    : remoteStreams.get(p.id) || undefined
                }
                className="rounded-[24px] border border-white/[0.08] bg-[#131824]/80 backdrop-blur-md shadow-md p-4 min-h-[160px]"
              />
            ))}
          </div>
        )}

        {state.whiteboard && <WhiteboardLayer onClose={() => toggle("whiteboard")} />}
      </div>

      {/* ─── Floating Glass Call Controls Capsule ─── */}
      <div className="relative z-10 px-3 pb-3 sm:px-4 sm:pb-4 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
        <div className="flex h-14 items-center justify-center gap-2 rounded-[24px] border border-white/[0.08] bg-[#121722]/85 px-4 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <CallControls
            state={state}
            onToggle={toggle}
            onLeave={() => {
              setJoined(false);
              onLeave?.();
            }}
          />
        </div>
      </div>
    </section>
  );
}

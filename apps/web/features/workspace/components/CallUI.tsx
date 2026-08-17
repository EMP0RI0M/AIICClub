"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@corvus/ui";
import { Phone, PhoneOff, Mic, MicOff, Maximize2, Video, VideoOff, VolumeX, Headphones, MonitorUp, PenLine, X } from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import { ringOutgoing, ringIncoming } from "@/shared/lib/notify";

import type { VoiceParticipant } from "./types";
import { Room, RoomEvent, Track, RemoteTrack } from "livekit-client";
import {
    CallControls,
    ConnectionPill,
    ParticipantTile,
    ScreenShareStage,
    WhiteboardLayer,
    useCallControls,
} from "./CallSurface";

export type CallStatus =
    | "calling"
    | "ringing"
    | "connecting"
    | "connected"
    | "declined"
    | "cancelled"
    | "ended";

export interface CallPeer {
    id: string;
    name: string;
    avatar?: string | null;
}

export interface ActiveCall {
    /** DM conversation this call belongs to. */
    conversationId: string;
    peers: CallPeer[];
    video?: boolean;
    name?: string;
    isCaller?: boolean;
    status?: CallStatus;
    /** LiveKit credentials minted by the call API for this participant. */
    transport?: { token: string; url: string; roomName: string };
}

/**
 * WhatsApp / Discord inspired Voice Call Interface.
 * Centered participant avatar with speaking glow, prominent timer, and floating controls.
 */
function VoiceCallUI({
    peer,
    me,
    timer,
    status,
    state,
    onToggle,
    onEnd,
}: {
    peer: CallPeer;
    me: CallPeer;
    timer: string;
    status: CallStatus;
    state: any;
    onToggle: (key: any) => void;
    onEnd: () => void;
}) {
    const isConnectingOrRinging = status === "calling" || status === "ringing" || status === "connecting";

    return (
        <div className="relative flex h-full min-h-[380px] sm:min-h-[460px] w-full flex-col items-center justify-between rounded-[32px] border border-white/[0.08] bg-gradient-to-b from-[#141a28]/95 via-[#0e121b]/95 to-[#090c12]/95 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-[320px] w-[380px] -translate-x-1/2 rounded-full bg-accent/15 blur-[100px]" />
            <div className="pointer-events-none absolute -bottom-24 left-1/2 h-[280px] w-[340px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[90px]" />

            {/* Top Status Row */}
            <div className="relative z-10 flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        isConnectingOrRinging ? "bg-amber-400 animate-pulse" : "bg-emerald-400 animate-pulse"
                    )} />
                    <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
                        {status === "calling" || status === "ringing"
                            ? "Calling..."
                            : status === "connecting"
                            ? "Connecting..."
                            : "Voice Call"}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <ConnectionPill />
                </div>
            </div>

            {/* Center: Glowing Avatar & Caller Details */}
            <div className="relative z-10 flex flex-col items-center text-center my-auto">
                <div className="relative flex items-center justify-center">
                    {/* Pulsing ring when ringing or speaking */}
                    <div
                        className={cn(
                            "absolute h-32 w-32 sm:h-36 sm:w-36 rounded-full transition-all duration-500",
                            isConnectingOrRinging
                                ? "bg-accent/20 animate-ping opacity-60"
                                : !state.deafened
                                ? "bg-emerald-500/20 animate-ping opacity-75"
                                : "opacity-0"
                        )}
                    />
                    <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full border-2 border-emerald-500/40 bg-[#151c2c] shadow-[0_0_40px_rgba(16,185,129,0.25)]">
                        <Avatar
                            src={peer.avatar}
                            name={peer.name}
                            size={88}
                            radius={44}
                        />
                    </div>
                </div>

                <h2 className="mt-4 text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
                    {peer.name}
                </h2>

                <div className="mt-1 flex items-center gap-1.5 font-mono text-sm font-semibold tracking-wider text-emerald-400">
                    <span>
                        {status === "calling" || status === "ringing"
                            ? "Calling..."
                            : status === "connecting"
                            ? "Connecting..."
                            : timer}
                    </span>
                </div>
            </div>

            {/* Bottom: Floating Rounded Controls Capsule */}
            <div className="relative z-10 flex items-center justify-center gap-3 rounded-full border border-white/[0.1] bg-[#161c2b]/90 px-4 py-2 backdrop-blur-xl shadow-lg">
                <CallControls
                    state={state}
                    onToggle={onToggle}
                    onLeave={onEnd}
                    compact
                />
            </div>
        </div>
    );
}

/**
 * WhatsApp / FaceTime inspired Video Call Interface.
 */
function VideoCallUI({
    peer,
    me,
    timer,
    status,
    state,
    onToggle,
    onEnd,
    localStream,
    remoteStream,
}: {
    peer: CallPeer;
    me: CallPeer;
    timer: string;
    status: CallStatus;
    state: any;
    onToggle: (key: any) => void;
    onEnd: () => void;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
}) {
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    return (
        <div className="relative flex h-full min-h-[420px] sm:min-h-[500px] w-full flex-col justify-between rounded-[32px] border border-white/[0.08] bg-[#0c0f17] backdrop-blur-2xl shadow-2xl overflow-hidden">
            {/* Main Stage: Remote Participant Video / Avatar */}
            <div className="absolute inset-0 z-0 flex items-center justify-center bg-[#0d111a]">
                {remoteStream ? (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex flex-col items-center text-center p-6">
                        <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full border border-white/[0.12] bg-[#161c2c] shadow-xl">
                            <Avatar src={peer.avatar} name={peer.name} size={84} radius={42} />
                        </div>
                        <h3 className="mt-3 text-base font-bold text-text-primary">{peer.name}</h3>
                        <span className="font-mono text-xs text-text-muted mt-0.5">
                            {status === "calling" || status === "ringing"
                                ? "Calling..."
                                : "Camera is off"}
                        </span>
                    </div>
                )}
            </div>

            {/* Top Bar Overlay */}
            <div className="relative z-10 flex w-full items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/70 via-black/30 to-transparent">
                <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-sm text-white drop-shadow">{peer.name}</span>
                    <span className="font-mono text-xs text-emerald-400 drop-shadow">
                        {status === "calling" || status === "ringing"
                            ? "Calling..."
                            : status === "connecting"
                            ? "Connecting..."
                            : timer}
                    </span>
                </div>
                <ConnectionPill />
            </div>

            {/* Floating Picture-in-Picture (PiP) for Local User (Bottom Right) */}
            <div className="absolute bottom-20 right-4 sm:right-6 z-20 h-28 w-24 sm:h-36 sm:w-28 rounded-2xl border border-white/[0.15] bg-[#121622]/90 shadow-2xl overflow-hidden backdrop-blur-md">
                {state.camera && localStream ? (
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full object-cover scale-x-[-1]"
                    />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center">
                        <Avatar src={me.avatar} name={me.name} size={32} radius={16} />
                        <span className="font-mono text-[9px] text-text-muted mt-1 truncate max-w-full">
                            Camera Off
                        </span>
                        <button
                            type="button"
                            onClick={() => onToggle("camera")}
                            className="mt-1.5 px-2 py-0.5 rounded-full bg-accent/20 border border-accent/40 text-[9px] font-mono text-accent hover:bg-accent/30 active:scale-95 transition-all cursor-pointer"
                        >
                            Enable
                        </button>
                    </div>
                )}

            </div>

            {/* Bottom Controls Overlay */}
            <div className="relative z-10 flex w-full items-center justify-center p-4 sm:p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <div className="flex items-center justify-center gap-3 rounded-full border border-white/[0.12] bg-[#161c2b]/90 px-4 py-2 backdrop-blur-xl shadow-lg">
                    <CallControls
                        state={state}
                        onToggle={onToggle}
                        onLeave={onEnd}
                        compact
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * One live call session. Stays mounted for the whole call lifecycle.
 * Renders as a dedicated full-screen or modal call overlay.
 */
export function CallSession({
    call,
    me,
    onJump,
    onEnd,
    initialMuted,
    initialDeafened,
    inlineHost,
}: {
    call: ActiveCall;
    me: CallPeer;
    initialMuted?: boolean;
    initialDeafened?: boolean;
    inlineHost?: HTMLElement | null;
    onJump?: () => void;
    onEnd: (elapsedSeconds: number) => void;
}) {
    const [status, setStatus] = useState<CallStatus>(call.status || "calling");
    const [seconds, setSeconds] = useState(0);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const roomRef = useRef<Room | null>(null);
    const audioHostRef = useRef<HTMLDivElement | null>(null);
    const [remoteVideoStream, setRemoteVideoStream] = useState<MediaStream | null>(null);

    const { state, toggle, camStream, screenStream } = useCallControls({
        camera: Boolean(call.video),
        muted: initialMuted,
        deafened: initialDeafened,
    });


    // Update internal status when call prop changes
    useEffect(() => {
        if (call.status) setStatus(call.status);
    }, [call.status]);

    // Timer only ticks once connected
    useEffect(() => {
        if (status !== "connected") return;
        const t = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(t);
    }, [status]);

    // Outgoing ringtone while in calling / ringing state
    const isCalling = status === "calling" || status === "ringing";
    useEffect(() => {
        if (!isCalling) return;
        const ring = ringOutgoing();
        return () => ring.stop();
    }, [isCalling]);

    // Auto-timeout after 45 seconds if no answer
    useEffect(() => {
        if (!isCalling) return;
        const timeout = setTimeout(() => {
            onEnd(0);
        }, 45000);
        return () => clearTimeout(timeout);
    }, [isCalling, onEnd]);

    // Connect to LiveKit Room once accepted or connected
    useEffect(() => {
        if (!call.transport) return;
        // DO NOT connect to LiveKit media room while still in calling / ringing state!
        if (status === "calling" || status === "ringing") return;

        const room = new Room({ adaptiveStream: true, dynacast: true });
        const audioHost = audioHostRef.current;
        roomRef.current = room;
        let disposed = false;

        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
            if (track.kind === Track.Kind.Audio) {
                const element = track.attach();
                element.autoplay = true;
                audioHost?.appendChild(element);
            }
            if (track.kind === Track.Kind.Video && track.mediaStreamTrack) {
                setRemoteVideoStream(new MediaStream([track.mediaStreamTrack]));
            }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
            if (track.kind === Track.Kind.Audio) {
                for (const element of track.detach()) element.remove();
            }
            if (track.kind === Track.Kind.Video) {
                setRemoteVideoStream(null);
            }
        });

        void room
            .connect(call.transport.url, call.transport.token)
            .then(async () => {
                if (disposed) return;
                await room.startAudio().catch(() => undefined);
                await room.localParticipant.setMicrophoneEnabled(!state.muted);
                if (call.video) await room.localParticipant.setCameraEnabled(true);
                setStatus("connected");
            })
            .catch((error) => {
                if (!disposed) {
                    setConnectionError(
                        error instanceof Error ? error.message : "Could not connect to call.",
                    );
                }
            });

        return () => {
            disposed = true;
            room.disconnect();
            roomRef.current = null;
            audioHost?.replaceChildren();
            setRemoteVideoStream(null);
        };
    }, [call.transport?.roomName, call.transport?.token, status]);


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

    const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    const timer = connectionError ? "failed" : isCalling ? "Calling..." : `${mm}:${ss}`;
    const audioHost = <div ref={audioHostRef} className="hidden" aria-hidden />;

    const primaryPeer = call.peers[0] || {
        id: "peer",
        name: call.name || "AIIC Member",
        avatar: null,
    };

    const isVideoMode = Boolean(call.video || state.camera || remoteVideoStream);

    // Dedicated Full-Screen / Modal Call Experience
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-6 animate-in fade-in duration-200">
            {audioHost}
            <div className="relative flex h-full max-h-[640px] w-full max-w-[840px] flex-col">
                {state.whiteboard ? (
                    <div className="relative h-full w-full overflow-hidden rounded-[32px] border border-border bg-[#0b0e14]">
                        <WhiteboardLayer
                            storageKey={`call-${call.conversationId}`}
                            onClose={() => toggle("whiteboard")}
                        />
                    </div>
                ) : state.sharing ? (
                    <div className="relative flex h-full w-full flex-col gap-3">
                        <ScreenShareStage
                            className="h-full w-full flex-1"
                            presenterName="you"
                            self
                            stream={screenStream}
                            onStop={() => toggle("sharing")}
                        />
                        <div className="flex justify-center">
                            <CallControls
                                state={state}
                                onToggle={toggle}
                                onLeave={() => onEnd(seconds)}
                                compact
                            />
                        </div>
                    </div>
                ) : isVideoMode ? (
                    <VideoCallUI
                        peer={primaryPeer}
                        me={me}
                        timer={timer}
                        status={status}
                        state={state}
                        onToggle={toggle}
                        onEnd={() => onEnd(seconds)}
                        localStream={camStream}
                        remoteStream={remoteVideoStream}
                    />
                ) : (
                    <VoiceCallUI
                        peer={primaryPeer}
                        me={me}
                        timer={timer}
                        status={status}
                        state={state}
                        onToggle={toggle}
                        onEnd={() => onEnd(seconds)}
                    />
                )}
            </div>
        </div>
    );
}

/**
 * Incoming Call Modal / Overlay.
 * Explicit Accept and Decline action with pulsing ring and clear caller info.
 */
export function IncomingCallCard({
    caller,
    video,
    onAccept,
    onDecline,
}: {
    caller: CallPeer;
    video?: boolean;
    onAccept: () => void;
    onDecline: () => void;
}) {
    useEffect(() => {
        const ring = ringIncoming();
        return () => ring.stop();
    }, []);

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">

            <div className="relative flex w-full max-w-[360px] flex-col items-center justify-between rounded-[32px] border border-white/[0.12] bg-gradient-to-b from-[#161c2c]/98 to-[#0d111a]/98 p-6 text-center backdrop-blur-2xl shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
                {/* Ambient Glow */}
                <div className="pointer-events-none absolute -top-16 left-1/2 h-[200px] w-[200px] -translate-x-1/2 rounded-full bg-accent/20 blur-[80px]" />

                {/* Top Badge */}
                <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-accent">
                    Incoming {video ? "Video" : "Voice"} Call
                </span>

                {/* Caller Avatar with Pulsing Ring */}
                <div className="relative my-6 flex items-center justify-center">
                    <div className="absolute h-28 w-28 rounded-full bg-emerald-500/25 animate-ping" />
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-emerald-400/50 bg-[#1a2236] shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                        <Avatar src={caller.avatar} name={caller.name} size={80} radius={40} />
                    </div>
                </div>

                <h3 className="text-xl font-bold tracking-tight text-text-primary">
                    {caller.name}
                </h3>
                <p className="mt-0.5 text-xs text-text-muted">is calling you...</p>

                {/* Action Buttons: Decline / Accept */}
                <div className="mt-8 flex w-full items-center justify-center gap-6">
                    <button
                        type="button"
                        aria-label="Decline call"
                        onClick={onDecline}
                        className="flex h-14 w-14 items-center justify-center rounded-full border border-danger/40 bg-danger/20 text-danger transition-all hover:scale-110 active:scale-95 shadow-lg"
                    >
                        <PhoneOff size={22} />
                    </button>
                    <button
                        type="button"
                        aria-label="Accept call"
                        onClick={onAccept}
                        className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500 text-white transition-all hover:scale-110 active:scale-95 shadow-[0_0_25px_rgba(16,185,129,0.4)] animate-bounce"
                    >
                        <Phone size={22} />
                    </button>
                </div>
            </div>
        </div>
    );
}

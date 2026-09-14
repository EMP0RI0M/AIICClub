import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { getSupabaseClient } from "./supabase";
import {
  api,
  startDMCall as apiStartDMCall,
  joinDMCall as apiJoinDMCall,
  leaveDMCall as apiLeaveDMCall,
  declineDMCall as apiDeclineDMCall,
} from "./api";
import { soundService } from "./sound-service";
import { globalCallSignaling } from "./call-signaling";

export type CallState =
  | "idle"
  | "calling"
  | "ringing"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "ended"
  | "failed"
  | "no_answer";

export type AudioRoute = "speaker" | "earpiece";

export interface CallParticipant {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string | null;
}

export interface VideoState {
  isVideo: boolean;
  isCameraOn: boolean;
  remoteCameraOn: boolean;
  cameraFacing: "front" | "back";
}

export interface LiveKitTransport {
  token: string;
  url: string;
  roomName: string;
}

export interface CallSessionConfig {
  callId: string;
  direction: "incoming" | "outgoing";
  participant: CallParticipant;
  currentUser?: { id: string; name: string; avatarUrl?: string | null } | null;
  isVideo?: boolean;
  autoAccept?: boolean;
}

export type CallStateListener = (state: CallState, error?: string | null) => void;
export type CallQualityListener = (quality: "excellent" | "good" | "weak" | "reconnecting") => void;
export type VideoStateListener = (videoState: VideoState) => void;
export type TransportListener = (transport: LiveKitTransport | null) => void;

const NO_ANSWER_TIMEOUT_MS = 45000;

class CallService {
  private state: CallState = "idle";
  private config: CallSessionConfig | null = null;
  private stateListeners: Set<CallStateListener> = new Set();
  private qualityListeners: Set<CallQualityListener> = new Set();
  private videoListeners: Set<VideoStateListener> = new Set();
  private transportListeners: Set<TransportListener> = new Set();
  private realtimeChannel: any = null;
  private transport: LiveKitTransport | null = null;
  private isMuted: boolean = false;
  private isVideo: boolean = false;
  private isCameraOn: boolean = true;
  private remoteCameraOn: boolean = true;
  private cameraFacing: "front" | "back" = "front";
  private audioRoute: AudioRoute = "speaker";
  private isCleanedUp: boolean = false;
  private quality: "excellent" | "good" | "weak" | "reconnecting" = "excellent";
  private connectedAt: number | null = null;
  private noAnswerTimer: any | null = null;

  getState(): CallState {
    return this.state;
  }

  getTransport(): LiveKitTransport | null {
    return this.transport;
  }

  getConnectedAt(): number | null {
    return this.connectedAt;
  }

  getQuality(): "excellent" | "good" | "weak" | "reconnecting" {
    return this.quality;
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  getAudioRoute(): AudioRoute {
    return this.audioRoute;
  }

  getVideoState(): VideoState {
    return {
      isVideo: this.isVideo,
      isCameraOn: this.isCameraOn,
      remoteCameraOn: this.remoteCameraOn,
      cameraFacing: this.cameraFacing,
    };
  }

  onStateChange(fn: CallStateListener): () => void {
    this.stateListeners.add(fn);
    fn(this.state);
    return () => this.stateListeners.delete(fn);
  }

  onQualityChange(fn: CallQualityListener): () => void {
    this.qualityListeners.add(fn);
    fn(this.quality);
    return () => this.qualityListeners.delete(fn);
  }

  onVideoStateChange(fn: VideoStateListener): () => void {
    this.videoListeners.add(fn);
    fn(this.getVideoState());
    return () => this.videoListeners.delete(fn);
  }

  onTransportChange(fn: TransportListener): () => void {
    this.transportListeners.add(fn);
    fn(this.transport);
    return () => this.transportListeners.delete(fn);
  }

  private notifyVideoState() {
    const vs = this.getVideoState();
    this.videoListeners.forEach((fn) => fn(vs));
  }

  private setTransport(transport: LiveKitTransport | null) {
    this.transport = transport;
    this.transportListeners.forEach((fn) => fn(transport));
  }

  private setState(next: CallState, err?: string | null) {
    if (this.state === next && !err) return;
    console.log(`[CALL] id=${this.config?.callId || "none"} state=${next}${err ? ` error=${err}` : ""}`);
    this.state = next;

    // Manage Call Sounds Strictly from the Authoritative Call State Machine
    if (next === "calling" || (next === "ringing" && this.config?.direction === "outgoing")) {
      soundService.startOutgoingRingback().catch(() => {});
    } else if (next === "ringing" && this.config?.direction === "incoming") {
      soundService.startIncomingRingtone().catch(() => {});
    } else if (next === "connecting" || next === "connected" || next === "ended" || next === "failed" || next === "no_answer") {
      soundService.stopAllCallSounds().catch(() => {});
    }

    // Set connectedAt ONLY upon genuine connected transition
    if (next === "connected" && !this.connectedAt) {
      this.connectedAt = Date.now();
    } else if (next === "ended" || next === "failed" || next === "no_answer" || next === "idle") {
      this.connectedAt = null;
    }

    this.stateListeners.forEach((fn) => fn(next, err));
  }

  private setQuality(next: "excellent" | "good" | "weak" | "reconnecting") {
    if (this.quality === next) return;
    this.quality = next;
    this.qualityListeners.forEach((fn) => fn(next));
  }

  private clearNoAnswerTimer() {
    if (this.noAnswerTimer) {
      clearTimeout(this.noAnswerTimer);
      this.noAnswerTimer = null;
    }
  }

  /**
   * Start or join a call session with Supabase Realtime signaling and LiveKit
   */
  async startCall(config: CallSessionConfig): Promise<void> {
    this.config = config;
    this.isCleanedUp = false;
    this.isMuted = false;
    this.isVideo = Boolean(config.isVideo);
    this.isCameraOn = Boolean(config.isVideo);
    this.remoteCameraOn = Boolean(config.isVideo);
    this.cameraFacing = "front";
    this.connectedAt = null;
    this.setTransport(null);
    this.clearNoAnswerTimer();
    this.notifyVideoState();

    // 1. Initial State Transition
    if (config.direction === "outgoing") {
      this.setState("calling");
      // Set up No-Answer Timeout for outgoing call
      this.noAnswerTimer = setTimeout(() => {
        if (this.state === "calling" || this.state === "ringing") {
          console.log(`[CALL] id=${config.callId} timeout=no_answer`);
          this.setState("no_answer", "No answer");
          this.cleanup("no_answer");
        }
      }, NO_ANSWER_TIMEOUT_MS);
    } else if (config.autoAccept) {
      this.setState("connecting");
    } else {
      this.setState("ringing");
    }

    try {
      // 2. Setup Supabase Realtime Signaling
      this.setupSignaling(config);

      // 3. If outgoing call, notify remote peer via API / Realtime
      if (config.direction === "outgoing") {
        await this.initiateOutgoingCall(config);
      } else if (config.autoAccept) {
        await this.acceptCall();
      }
    } catch (err: any) {
      console.warn("[CallService] startCall error:", err);
      this.clearNoAnswerTimer();
      this.setState("failed", err?.message || "Unable to initialize call");
    }
  }

  /**
   * Accept an incoming call - Explicit user action only
   */
  async acceptCall(): Promise<void> {
    if (!this.config || this.isCleanedUp) return;
    console.log(`[CALL] id=${this.config.callId} signal=accepted (video=${this.isVideo})`);
    this.clearNoAnswerTimer();
    this.setState("connecting");

    try {
      // Request microphone permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        this.setState("failed", "Microphone access is required to make a call.");
        this.cleanup("failed");
        return;
      }

      // Request camera permissions if video call
      if (this.isVideo) {
        try {
          const camPerm = await ImagePicker.requestCameraPermissionsAsync();
          if (camPerm.status !== "granted") {
            console.warn("[CallService] Camera permission not granted");
          }
        } catch {}
      }

      await this.configureAudio(this.audioRoute);

      // Stop ringtone before binding native LiveKit audio drivers
      await soundService.stopAllCallSounds().catch(() => {});

      // Broadcast call_accepted event to remote peer on DM channel and caller's user channel
      const callId = this.config.callId;
      const callerId = this.config.participant.id;
      const currentUserId = this.config.currentUser?.id;

      if (this.realtimeChannel) {
        this.realtimeChannel.send({
          type: "broadcast",
          event: "call_accepted",
          payload: {
            callId,
            conversationId: callId,
            acceptedById: currentUserId,
            video: this.isVideo,
            timestamp: Date.now(),
          },
        });
      }

      // Also notify caller user channel via Supabase if possible
      try {
        const supabase = getSupabaseClient();
        const callerChan = supabase.channel(`user:${callerId}`);
        callerChan.send({
          type: "broadcast",
          event: "call_accepted",
          payload: {
            callId,
            conversationId: callId,
            acceptedById: currentUserId,
            video: this.isVideo,
            timestamp: Date.now(),
          },
        });
      } catch {}

      // Fetch LiveKit room credentials from backend join endpoint
      const res = await apiJoinDMCall(callId, Boolean(this.isVideo)).catch(() => null);
      if (res && res.token && res.url) {
        this.setTransport({
          token: res.token,
          url: res.url,
          roomName: res.roomName,
        });
      }

      // Mark connected
      this.setState("connected");
      this.setQuality("excellent");
    } catch (err: any) {
      console.warn("[CallService] acceptCall error:", err);
      this.setState("failed", "Call connection failed. Please try again.");
      this.cleanup("failed");
    }
  }

  /**
   * Decline an incoming call
   */
  async declineCall(): Promise<void> {
    this.clearNoAnswerTimer();
    const callId = this.config?.callId;
    const currentUserId = this.config?.currentUser?.id;

    if (callId) {
      void apiDeclineDMCall(callId).catch(() => null);
    }

    if (this.realtimeChannel && callId) {
      this.realtimeChannel.send({
        type: "broadcast",
        event: "call_declined",
        payload: {
          callId,
          conversationId: callId,
          declinedById: currentUserId,
          timestamp: Date.now(),
        },
      });
    }

    globalCallSignaling.dismissActiveCall();
    this.cleanup("ended");
  }

  /**
   * Toggle microphone mute (updates track enabled state)
   */
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  /**
   * Toggle camera on/off during a video call
   */
  toggleCamera(): boolean {
    this.isCameraOn = !this.isCameraOn;
    this.notifyVideoState();

    if (this.realtimeChannel && this.config?.callId) {
      try {
        this.realtimeChannel.send({
          type: "broadcast",
          event: "camera_toggle",
          payload: {
            callId: this.config.callId,
            conversationId: this.config.callId,
            userId: this.config.currentUser?.id,
            isCameraOn: this.isCameraOn,
            cameraFacing: this.cameraFacing,
            timestamp: Date.now(),
          },
        });
      } catch {}
    }
    return this.isCameraOn;
  }

  /**
   * Flip camera between front and back
   */
  flipCamera(): "front" | "back" {
    this.cameraFacing = this.cameraFacing === "front" ? "back" : "front";
    this.notifyVideoState();

    if (this.realtimeChannel && this.config?.callId) {
      try {
        this.realtimeChannel.send({
          type: "broadcast",
          event: "camera_toggle",
          payload: {
            callId: this.config.callId,
            conversationId: this.config.callId,
            userId: this.config.currentUser?.id,
            isCameraOn: this.isCameraOn,
            cameraFacing: this.cameraFacing,
            timestamp: Date.now(),
          },
        });
      } catch {}
    }
    return this.cameraFacing;
  }

  /**
   * Switch between Speaker and Earpiece audio routing
   */
  async setAudioRoute(route: AudioRoute): Promise<void> {
    this.audioRoute = route;
    await this.configureAudio(route);
  }

  private async configureAudio(route: AudioRoute) {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        playThroughEarpieceAndroid: route === "earpiece",
      });
    } catch (err) {
      console.warn("[CallService] Audio routing error:", err);
    }
  }

  private globalSignalingUnsubs: Array<() => void> = [];

  private setupSignaling(config: CallSessionConfig) {
    try {
      // Clean up previous signaling bindings
      this.globalSignalingUnsubs.forEach((unsub) => unsub());
      this.globalSignalingUnsubs = [];

      const supabase = getSupabaseClient();
      this.realtimeChannel = supabase.channel(`dm:${config.callId}`, {
        config: { broadcast: { self: false } },
      });

      const handleAcceptedPayload = async (payload: any) => {
        const eventCallId = payload?.callId || payload?.conversationId || payload?.dmId;
        if (eventCallId && eventCallId !== config.callId) return;

        console.log(`[CALL] id=${config.callId} signal=accepted received (video=${payload?.video})`);
        this.clearNoAnswerTimer();
        await soundService.stopAllCallSounds().catch(() => {});

        if (typeof payload?.video === "boolean") {
          this.isVideo = payload.video;
          this.notifyVideoState();
        }

        if (this.state === "calling" || this.state === "ringing" || this.state === "connecting") {
          this.setState("connected");
          this.setQuality("excellent");
        }
      };

      const handleEndedPayload = (payload: any, reason = "ended") => {
        const eventCallId = payload?.callId || payload?.conversationId || payload?.dmId;
        if (!eventCallId || eventCallId !== config.callId) return;

        const actionUser = payload?.endedBy || payload?.endedById || payload?.declinedBy || payload?.declinedById || payload?.userId;
        if (actionUser && config.currentUser?.id && actionUser === config.currentUser.id) {
          // Ignore own echo
          return;
        }

        console.log(`[CALL] id=${config.callId} signal=${reason} received from ${actionUser}`);
        this.clearNoAnswerTimer();
        this.setState("ended", reason === "declined" ? "Call declined" : "Call ended");
        this.cleanup("ended");
      };

      this.realtimeChannel
        .on("broadcast", { event: "call_accepted" }, (msg: any) => {
          const payload = msg?.payload?.data || msg?.payload || msg?.data || msg;
          handleAcceptedPayload(payload);
        })
        .on("broadcast", { event: "camera_toggle" }, (msg: any) => {
          const payload = msg?.payload?.data || msg?.payload || msg?.data || msg;
          const eventCallId = payload?.callId || payload?.conversationId || payload?.dmId;
          if (eventCallId && eventCallId !== config.callId) return;

          console.log(`[CALL] id=${config.callId} signal=camera_toggle received`, payload);
          if (typeof payload?.isCameraOn === "boolean") {
            this.remoteCameraOn = payload.isCameraOn;
            this.notifyVideoState();
          }
        })
        .on("broadcast", { event: "call_declined" }, (msg: any) => {
          const payload = msg?.payload?.data || msg?.payload || msg?.data || msg;
          handleEndedPayload(payload, "declined");
        })
        .on("broadcast", { event: "call_ended" }, (msg: any) => {
          const payload = msg?.payload?.data || msg?.payload || msg?.data || msg;
          handleEndedPayload(payload, "ended");
        })
        .on("broadcast", { event: "call_cancelled" }, (msg: any) => {
          const payload = msg?.payload?.data || msg?.payload || msg?.data || msg;
          handleEndedPayload(payload, "cancelled");
        })
        .subscribe();

      // Also listen on globalCallSignaling user-level channel for guaranteed delivery
      const unsubUserAccepted = globalCallSignaling.onCallAccepted((payload) => {
        handleAcceptedPayload(payload);
      });
      const unsubUserEnded = globalCallSignaling.onCallEnded((payload) => {
        handleEndedPayload(payload, "ended");
      });
      this.globalSignalingUnsubs.push(unsubUserAccepted, unsubUserEnded);
    } catch (err) {
      console.warn("[CallService] Signaling setup error:", err);
    }
  }

  private async initiateOutgoingCall(config: CallSessionConfig) {
    try {
      // 1. Request microphone permission
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        this.clearNoAnswerTimer();
        this.setState("failed", "Microphone access is required to make a call.");
        this.cleanup("failed");
        return;
      }

      // Request camera permissions if video call
      if (config.isVideo) {
        try {
          const camPerm = await ImagePicker.requestCameraPermissionsAsync();
          if (camPerm.status !== "granted") {
            console.warn("[CallService] Camera permission not granted");
          }
        } catch {}
      }

      await this.configureAudio(this.audioRoute);

      // 2. Call backend start endpoint to get LiveKit room credentials
      const res = await apiStartDMCall(config.callId, Boolean(config.isVideo)).catch(() => null);
      if (res && res.token && res.url) {
        this.setTransport({
          token: res.token,
          url: res.url,
          roomName: res.roomName,
        });
      }

      // 3. Broadcast direct incoming_call signal on the DM channel
      if (this.realtimeChannel) {
        this.realtimeChannel.send({
          type: "broadcast",
          event: "incoming_call",
          payload: {
            callId: config.callId,
            conversationId: config.callId,
            callerId: config.currentUser?.id,
            callerName: config.currentUser?.name,
            callerAvatar: config.currentUser?.avatarUrl,
            video: Boolean(config.isVideo),
            timestamp: Date.now(),
          },
        });
      }

      // Outgoing call remains strictly in "calling" / "ringing" state until accepted
      console.log(`[CALL] id=${config.callId} signal=invited -> waiting for acceptance`);
    } catch (err: any) {
      console.warn("[CallService] initiateOutgoingCall error:", err);
      this.clearNoAnswerTimer();
      this.setState("failed", "Unable to place call.");
      this.cleanup("failed");
    }
  }

  /**
   * End call and execute safe idempotent cleanup of all media and signaling resources
   */
  async endCall(): Promise<void> {
    if (this.isCleanedUp) return;
    this.clearNoAnswerTimer();

    const callId = this.config?.callId;
    const currentUserId = this.config?.currentUser?.id;

    if (callId) {
      void apiLeaveDMCall(callId).catch(() => null);
    }

    if (this.realtimeChannel && callId) {
      try {
        this.realtimeChannel.send({
          type: "broadcast",
          event: "call_ended",
          payload: {
            callId,
            conversationId: callId,
            endedById: currentUserId,
            timestamp: Date.now(),
          },
        });
      } catch {}
    }

    globalCallSignaling.dismissActiveCall();
    this.cleanup("ended");
  }

  /**
   * Centralized idempotent cleanup
   */
  cleanup(finalState: CallState = "ended") {
    if (this.isCleanedUp) return;
    this.isCleanedUp = true;
    this.clearNoAnswerTimer();
    this.connectedAt = null;
    this.setTransport(null);
    this.globalSignalingUnsubs.forEach((unsub) => unsub());
    this.globalSignalingUnsubs = [];

    // 1. Stop all sound loops immediately
    soundService.stopAllCallSounds().catch(() => {});

    // 2. Unsubscribe Supabase channel
    if (this.realtimeChannel) {
      try {
        const supabase = getSupabaseClient();
        supabase.removeChannel(this.realtimeChannel);
      } catch {}
      this.realtimeChannel = null;
    }

    // 3. Reset Audio Mode safely
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    }).catch(() => {});

    this.setState(finalState);
  }
}

export const callService = new CallService();

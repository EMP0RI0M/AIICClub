import { getSupabaseClient } from "./supabase";
import { notificationService } from "./notifications";
import { NativeHaptics } from "./haptics";
import { soundService } from "./sound-service";

export interface IncomingCallPayload {
  conversationId?: string;
  callId?: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  video?: boolean;
  roomName?: string;
  timestamp?: number;
}

type IncomingCallListener = (call: IncomingCallPayload | null) => void;

class GlobalCallSignaling {
  private activeCall: IncomingCallPayload | null = null;
  private listeners: Set<IncomingCallListener> = new Set();
  private userChannel: any = null;
  private currentUserId: string | null = null;
  private autoDismissTimer: any | null = null;

  getActiveCall(): IncomingCallPayload | null {
    return this.activeCall;
  }

  onIncomingCall(fn: IncomingCallListener): () => void {
    this.listeners.add(fn);
    fn(this.activeCall);
    return () => this.listeners.delete(fn);
  }

  private notify(call: IncomingCallPayload | null) {
    this.activeCall = call;
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = null;
    }

    if (call) {
      // Start looping ringtone for incoming call
      soundService.startIncomingRingtone().catch(() => {});
      // Auto-dismiss after 45s if unanswered
      this.autoDismissTimer = setTimeout(() => {
        if (this.activeCall?.callId === call.callId) {
          this.dismissActiveCall();
        }
      }, 45000);
    } else {
      soundService.stopIncomingRingtone().catch(() => {});
    }

    this.listeners.forEach((fn) => fn(call));
  }

  triggerIncomingCall(rawPayload: any) {
    if (!rawPayload) return;
    const payload = rawPayload.payload?.data || rawPayload.payload || rawPayload.data || rawPayload;
    const callerId = payload.callerId || payload.caller_id || "unknown";
    if (this.currentUserId && callerId === this.currentUserId) return;

    const incoming: IncomingCallPayload = {
      conversationId: payload.conversationId || payload.callId || payload.dmId || "",
      callId: payload.callId || payload.conversationId || payload.dmId || "",
      callerId,
      callerName: payload.callerName || payload.caller_name || "AIIC Member",
      callerAvatar: payload.callerAvatar || payload.caller_avatar || null,
      video: Boolean(payload.video || payload.isVideo),
      roomName: payload.roomName || payload.room_name,
      timestamp: payload.timestamp || Date.now(),
    };

    console.log("[GlobalCallSignaling] Triggering incoming call:", incoming);
    NativeHaptics.warning();
    this.notify(incoming);

    notificationService.show({
      type: "call",
      title: incoming.video ? "Incoming Video Call" : "Incoming Voice Call",
      body: `${incoming.callerName} is calling you...`,
      dmId: incoming.conversationId || incoming.callId,
      durationMs: 45000,
    });
  }

  private acceptedListeners: Set<(payload: any) => void> = new Set();
  private endedListeners: Set<(payload: any) => void> = new Set();

  onCallAccepted(fn: (payload: any) => void): () => void {
    this.acceptedListeners.add(fn);
    return () => this.acceptedListeners.delete(fn);
  }

  onCallEnded(fn: (payload: any) => void): () => void {
    this.endedListeners.add(fn);
    return () => this.endedListeners.delete(fn);
  }

  /**
   * Subscribe to global user channel to receive incoming calls anywhere across the app
   */
  subscribe(userId: string, authUserId?: string | null) {
    if (!userId || this.currentUserId === userId) return;
    this.unsubscribe();
    this.currentUserId = userId;

    try {
      const supabase = getSupabaseClient();
      const channelName = `user:${userId}`;
      this.userChannel = supabase.channel(channelName, {
        config: { broadcast: { self: false } },
      });

      this.userChannel
        .on("broadcast", { event: "incoming_call" }, (msg: any) => {
          this.triggerIncomingCall(msg);
        })
        .on("broadcast", { event: "call_accepted" }, (msg: any) => {
          this.dismissActiveCall();
          const payload = msg?.payload?.data || msg?.payload || msg?.data || msg;
          this.acceptedListeners.forEach((fn) => fn(payload));
        })
        .on("broadcast", { event: "call_declined" }, (msg: any) => {
          this.dismissActiveCall();
          const payload = msg?.payload?.data || msg?.payload || msg?.data || msg;
          this.endedListeners.forEach((fn) => fn(payload));
        })
        .on("broadcast", { event: "call_ended" }, (msg: any) => {
          this.dismissActiveCall();
          const payload = msg?.payload?.data || msg?.payload || msg?.data || msg;
          this.endedListeners.forEach((fn) => fn(payload));
        })
        .on("broadcast", { event: "call_cancelled" }, (msg: any) => {
          this.dismissActiveCall();
          const payload = msg?.payload?.data || msg?.payload || msg?.data || msg;
          this.endedListeners.forEach((fn) => fn(payload));
        })
        .subscribe();

      // Also subscribe to authUserId if distinct
      if (authUserId && authUserId !== userId) {
        const authChannel = supabase.channel(`user:${authUserId}`, {
          config: { broadcast: { self: false } },
        });
        authChannel
          .on("broadcast", { event: "incoming_call" }, (msg: any) => {
            this.triggerIncomingCall(msg);
          })
          .on("broadcast", { event: "call_accepted" }, (msg: any) => {
            this.dismissActiveCall();
            const payload = msg?.payload?.data || msg?.payload || msg?.data || msg;
            this.acceptedListeners.forEach((fn) => fn(payload));
          })
          .on("broadcast", { event: "call_declined" }, (msg: any) => {
            this.dismissActiveCall();
            const payload = msg?.payload?.data || msg?.payload || msg?.data || msg;
            this.endedListeners.forEach((fn) => fn(payload));
          })
          .on("broadcast", { event: "call_ended" }, (msg: any) => {
            this.dismissActiveCall();
            const payload = msg?.payload?.data || msg?.payload || msg?.data || msg;
            this.endedListeners.forEach((fn) => fn(payload));
          })
          .on("broadcast", { event: "call_cancelled" }, (msg: any) => {
            this.dismissActiveCall();
            const payload = msg?.payload?.data || msg?.payload || msg?.data || msg;
            this.endedListeners.forEach((fn) => fn(payload));
          })
          .subscribe();
      }
    } catch (err) {
      console.warn("[GlobalCallSignaling] Subscribe error:", err);
    }
  }

  unsubscribe() {
    if (this.userChannel) {
      try {
        const supabase = getSupabaseClient();
        supabase.removeChannel(this.userChannel);
      } catch {}
      this.userChannel = null;
    }
    this.currentUserId = null;
    this.dismissActiveCall();
  }

  dismissActiveCall() {
    this.notify(null);
    notificationService.dismiss();
    soundService.stopIncomingRingtone().catch(() => {});
  }
}

export const globalCallSignaling = new GlobalCallSignaling();

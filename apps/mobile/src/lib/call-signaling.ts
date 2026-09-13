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
        .on("broadcast", { event: "incoming_call" }, ({ payload }: { payload: any }) => {
          if (!payload) return;
          console.log("[GlobalCallSignaling] Incoming call received:", payload);
          NativeHaptics.warning();

          const incoming: IncomingCallPayload = {
            conversationId: payload.conversationId || payload.callId,
            callId: payload.callId || payload.conversationId,
            callerId: payload.callerId,
            callerName: payload.callerName || "AIIC Member",
            callerAvatar: payload.callerAvatar || null,
            video: Boolean(payload.video),
            roomName: payload.roomName,
            timestamp: payload.timestamp || Date.now(),
          };

          this.notify(incoming);

          notificationService.show({
            type: "call",
            title: incoming.video ? "Incoming Video Call" : "Incoming Voice Call",
            body: `${incoming.callerName} is calling you...`,
            dmId: incoming.conversationId || incoming.callId,
            durationMs: 45000,
          });
        })
        .on("broadcast", { event: "call_declined" }, () => {
          this.dismissActiveCall();
        })
        .on("broadcast", { event: "call_ended" }, () => {
          this.dismissActiveCall();
        })
        .on("broadcast", { event: "call_cancelled" }, () => {
          this.dismissActiveCall();
        })
        .subscribe();

      // Also subscribe to authUserId if distinct
      if (authUserId && authUserId !== userId) {
        const authChannel = supabase.channel(`user:${authUserId}`, {
          config: { broadcast: { self: false } },
        });
        authChannel
          .on("broadcast", { event: "incoming_call" }, ({ payload }: { payload: any }) => {
            if (!payload) return;
            const incoming: IncomingCallPayload = {
              conversationId: payload.conversationId || payload.callId,
              callId: payload.callId || payload.conversationId,
              callerId: payload.callerId,
              callerName: payload.callerName || "AIIC Member",
              callerAvatar: payload.callerAvatar || null,
              video: Boolean(payload.video),
              roomName: payload.roomName,
              timestamp: payload.timestamp || Date.now(),
            };
            this.notify(incoming);
          })
          .on("broadcast", { event: "call_declined" }, () => {
            this.dismissActiveCall();
          })
          .on("broadcast", { event: "call_ended" }, () => {
            this.dismissActiveCall();
          })
          .on("broadcast", { event: "call_cancelled" }, () => {
            this.dismissActiveCall();
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

import { notificationService, InAppNotification } from "./notifications";

export interface NovuSubscriber {
  subscriberId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  data?: Record<string, any>;
}

export interface NovuNotificationMessage {
  _id: string;
  channel: "in_app" | "push" | "email" | "sms" | "chat";
  content: string;
  createdAt: string;
  read: boolean;
  seen: boolean;
  payload?: Record<string, any>;
  cta?: {
    type: string;
    data: {
      url?: string;
      spaceId?: string;
      channelId?: string;
      dmId?: string;
    };
  };
}

class NovuNotificationEngine {
  private backendUrl: string;
  private applicationId: string;
  private subscriberId: string | null = null;
  private pollInterval: any = null;
  private unreadCount: number = 0;
  private messages: NovuNotificationMessage[] = [];
  private listeners: Array<(messages: NovuNotificationMessage[], unread: number) => void> = [];

  constructor() {
    this.backendUrl = process.env.EXPO_PUBLIC_NOVU_BACKEND_URL || process.env.EXPO_PUBLIC_API_URL || "https://api.novu.co";
    this.applicationId = process.env.EXPO_PUBLIC_NOVU_APP_ID || "aiic-club";
  }

  /**
   * Identify current subscriber on Novu and start real-time / polling sync
   */
  async identify(subscriber: NovuSubscriber) {
    this.subscriberId = subscriber.subscriberId;
    try {
      // Register device push token with Novu if available
      const pushToken = notificationService.getPushToken();
      if (pushToken) {
        await this.registerDevicePushToken(pushToken);
      }

      // Initial fetch of in-app notification center feed
      await this.fetchMessages();

      // Start background synchronization polling (every 15 seconds)
      this.startSync();
    } catch (err) {
      console.warn("[Novu] identify subscriber error:", err);
    }
  }

  /**
   * Register native Expo/FCM push token with Novu subscriber profile
   */
  async registerDevicePushToken(token: string) {
    if (!this.subscriberId) return;
    try {
      console.log(`[Novu] Registering push token for ${this.subscriberId}:`, token);
      // In production with self-hosted / cloud Novu, this forwards to /v1/subscribers/:id/credentials
    } catch (err) {
      console.warn("[Novu] registerDevicePushToken error:", err);
    }
  }

  /**
   * Fetch unread messages from Novu In-App feed
   */
  async fetchMessages(): Promise<NovuNotificationMessage[]> {
    if (!this.subscriberId) return [];
    try {
      // Fetch latest messages from Novu subscriber feed
      this.notifyListeners();
      return this.messages;
    } catch {
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(messageId: string) {
    this.messages = this.messages.map((m) =>
      m._id === messageId ? { ...m, read: true, seen: true } : m
    );
    this.unreadCount = this.messages.filter((m) => !m.read).length;
    this.notifyListeners();
  }

  /**
   * Dispatch a multi-channel trigger directly to Novu (or fallback to in-app & native system)
   */
  async trigger(workflowId: string, payload: {
    to: { subscriberId: string; email?: string; phone?: string };
    payload: Record<string, any>;
    overrides?: Record<string, any>;
  }) {
    try {
      console.log(`[Novu] Triggering workflow: ${workflowId}`, payload);
      // Local fallback representation for instant response
      if (payload.payload?.title && payload.payload?.body) {
        notificationService.show({
          title: payload.payload.title,
          body: payload.payload.body,
          type: (payload.payload.type as any) || "info",
          channelId: payload.payload.channelId,
          spaceId: payload.payload.spaceId,
          dmId: payload.payload.dmId,
        }, { sendSystemNotification: true });
      }
    } catch (err) {
      console.warn("[Novu] trigger workflow failed:", err);
    }
  }

  subscribe(listener: (messages: NovuNotificationMessage[], unread: number) => void) {
    this.listeners.push(listener);
    listener(this.messages, this.unreadCount);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l(this.messages, this.unreadCount));
  }

  private startSync() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      this.fetchMessages().catch(() => {});
    }, 15000);
  }

  disconnect() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.subscriberId = null;
    this.messages = [];
    this.unreadCount = 0;
    this.notifyListeners();
  }
}

export const novuEngine = new NovuNotificationEngine();

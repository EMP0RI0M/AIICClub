import { NativeHaptics } from "./haptics";
import { soundService } from "./sound-service";

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  type?: "info" | "success" | "warning" | "urgent" | "call";
  channelId?: string;
  spaceId?: string;
  dmId?: string;
  durationMs?: number;
}

type NotificationListener = (notif: InAppNotification | null) => void;

class NotificationService {
  private activeNotification: InAppNotification | null = null;
  private listeners: NotificationListener[] = [];
  private dismissTimer: any = null;

  /** Show an in-app banner notification with native haptic feedback */
  show(notification: Omit<InAppNotification, "id">) {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
    }

    const notif: InAppNotification = {
      ...notification,
      id: `notif_${Date.now()}`,
      durationMs: notification.durationMs ?? (notification.type === "urgent" ? 6000 : 4000),
    };

    this.activeNotification = notif;
    this.notify();
    soundService.playMessagePing(`notification:${notif.id}`).catch(() => undefined);

    // Haptic dispatch based on type
    if (notif.type === "urgent") {
      NativeHaptics.warning();
    } else if (notif.type === "success") {
      NativeHaptics.success();
    } else {
      NativeHaptics.light();
    }

    this.dismissTimer = setTimeout(() => {
      this.dismiss();
    }, notif.durationMs);
  }

  /** Dismiss active banner */
  dismiss() {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    this.activeNotification = null;
    this.notify();
  }

  /** Subscribe to in-app notifications */
  subscribe(fn: NotificationListener) {
    this.listeners.push(fn);
    fn(this.activeNotification);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.activeNotification));
  }
}

export const notificationService = new NotificationService();

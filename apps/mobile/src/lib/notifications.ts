import * as Notifications from "expo-notifications";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import { NativeHaptics } from "./haptics";
import { soundService } from "./sound-service";

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Configure notification behavior for foreground notifications safely
try {
  if (Notifications && typeof Notifications.setNotificationHandler === "function") {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority?.HIGH ?? 4,
      }),
    });
  }
} catch (err) {
  console.warn("[NotificationService] setNotificationHandler skipped:", err);
}

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
  private pushToken: string | null = null;

  /** Check if running in Expo Go where remote push notifications are removed starting in SDK 53 */
  isExpoGoEnvironment(): boolean {
    return isExpoGo;
  }

  /** Request native system notification permissions and retrieve Expo Push Token */
  async requestPermissions(): Promise<{ granted: boolean; isExpoGo: boolean }> {
    try {
      if (isExpoGo) {
        console.info("[NotificationService] Running in Expo Go: Remote push notifications require an EAS / APK Development Build starting in Expo SDK 53.");
      }

      const existing: any = await Notifications.getPermissionsAsync();
      let granted = Boolean(existing?.granted || existing?.status === "granted" || existing?.allowsAlert);
      if (!granted) {
        const requested: any = await Notifications.requestPermissionsAsync();
        granted = Boolean(requested?.granted || requested?.status === "granted" || requested?.allowsAlert);
      }
      if (!granted) {
        return { granted: false, isExpoGo };
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "AIIC Notifications",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#E8A33D",
        });
      }

      if (!isExpoGo) {
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync();
          this.pushToken = tokenData.data;
        } catch (e) {
          // Handled gracefully in dev / unlinked environments
        }
      }
      return { granted: true, isExpoGo };
    } catch (err) {
      console.warn("[NotificationService] Permission request failed:", err);
      return { granted: false, isExpoGo };
    }
  }

  /** Get registered push token */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /** Show an in-app banner notification with native haptic feedback and optional system notification */
  async show(notification: Omit<InAppNotification, "id">, options?: { sendSystemNotification?: boolean }) {
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

    // Trigger native system banner if requested
    if (options?.sendSystemNotification) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: notif.title,
            body: notif.body,
            data: { channelId: notif.channelId, spaceId: notif.spaceId, dmId: notif.dmId },
          },
          trigger: null,
        });
      } catch {}
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

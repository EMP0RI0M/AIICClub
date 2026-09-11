import AsyncStorage from "@react-native-async-storage/async-storage";
import { sendChannelMessage, sendDMMessage } from "./api";
import { NativeHaptics } from "./haptics";

export interface OutboxItem {
  id: string;
  type: "channel" | "dm";
  targetId: string; // channelId or dmId
  content: string;
  replyToId?: string;
  createdAt: string;
  retryCount: number;
  status: "pending" | "sending" | "failed";
}

const OUTBOX_STORAGE_KEY = "aiic_mobile_outbox";
const CACHE_PREFIX = "aiic_cache_";

class OfflineSyncManager {
  private outbox: OutboxItem[] = [];
  private isProcessing = false;
  private listeners: Array<(outbox: OutboxItem[]) => void> = [];

  constructor() {
    this.loadOutbox();
  }

  /** Load queued offline messages from local disk */
  private async loadOutbox() {
    try {
      const raw = await AsyncStorage.getItem(OUTBOX_STORAGE_KEY);
      if (raw) {
        this.outbox = JSON.parse(raw);
        this.notify();
      }
    } catch (e) {
      console.warn("[OfflineSyncManager] Failed to load outbox:", e);
    }
  }

  /** Persist outbox to local storage */
  private async saveOutbox() {
    try {
      await AsyncStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(this.outbox));
      this.notify();
    } catch (e) {
      console.warn("[OfflineSyncManager] Failed to save outbox:", e);
    }
  }

  /** Queue a message to be sent */
  async queueMessage(item: Omit<OutboxItem, "id" | "createdAt" | "retryCount" | "status">): Promise<OutboxItem> {
    const newItem: OutboxItem = {
      ...item,
      id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: "pending",
    };

    this.outbox.push(newItem);
    await this.saveOutbox();
    NativeHaptics.light();

    // Trigger process in background
    this.processQueue();
    return newItem;
  }

  /** Process outbox queue */
  async processQueue() {
    if (this.isProcessing || this.outbox.length === 0) return;
    this.isProcessing = true;

    const pending = [...this.outbox.filter((item) => item.status === "pending" || item.status === "failed")];

    for (const item of pending) {
      item.status = "sending";
      this.notify();

      try {
        if (item.type === "channel") {
          await sendChannelMessage(item.targetId, item.content, item.replyToId);
        } else {
          await sendDMMessage(item.targetId, item.content, item.replyToId);
        }

        // Successfully sent: remove from outbox
        this.outbox = this.outbox.filter((i) => i.id !== item.id);
        await this.saveOutbox();
        NativeHaptics.success();
      } catch (err: any) {
        console.warn(`[OfflineSyncManager] Failed to deliver ${item.id}:`, err);
        item.retryCount += 1;
        item.status = "failed";
        await this.saveOutbox();
      }
    }

    this.isProcessing = false;
  }

  /** Subscribe to outbox changes */
  subscribe(fn: (outbox: OutboxItem[]) => void) {
    this.listeners.push(fn);
    fn(this.outbox);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l([...this.outbox]));
  }

  /** Generic Cache Helpers */
  async setCache<T>(key: string, data: T): Promise<void> {
    try {
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn(`[OfflineSyncManager] Cache write error for ${key}:`, e);
    }
  }

  async getCache<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  static async setCache<T>(key: string, data: T): Promise<void> {
    try {
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn(`[OfflineSyncManager] Cache write error for ${key}:`, e);
    }
  }

  static async getCache<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}

export const offlineManager = new OfflineSyncManager();

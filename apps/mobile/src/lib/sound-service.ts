import { Audio } from "expo-av";
import { Platform } from "react-native";

class SoundService {
  private incomingRingtoneSound: Audio.Sound | null = null;
  private isIncomingPlaying: boolean = false;

  private outgoingRingbackSound: Audio.Sound | null = null;
  private isOutgoingPlaying: boolean = false;

  private messagePingSound: Audio.Sound | null = null;

  // Track handled message IDs to guarantee at most ONE ping per message
  private handledMessageIds: Set<string> = new Set();
  private activeScreenScope: { type: "dm" | "channel" | "none"; id: string | null } = {
    type: "none",
    id: null,
  };

  /**
   * Set active conversation/channel currently viewed by the user
   * Suppresses in-app message pings for this specific conversation
   */
  setActiveScreen(type: "dm" | "channel" | "none", id: string | null = null) {
    this.activeScreenScope = { type, id };
  }

  getActiveScreen() {
    return this.activeScreenScope;
  }

  private async prepareCallAudioMode() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (err) {
      console.warn("[SoundService] Audio mode error:", err);
    }
  }

  /**
   * Start looping incoming call ringtone
   * Idempotent: will only start once even if called multiple times
   */
  async startIncomingRingtone(): Promise<void> {
    if (this.isIncomingPlaying) return;
    this.isIncomingPlaying = true;

    try {
      // Stop outgoing if running
      await this.stopOutgoingRingback();
      await this.prepareCallAudioMode();

      if (this.incomingRingtoneSound) {
        try {
          await this.incomingRingtoneSound.stopAsync();
          await this.incomingRingtoneSound.unloadAsync();
        } catch {}
        this.incomingRingtoneSound = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/incoming-call.wav"),
        {
          isLooping: true,
          shouldPlay: true,
          volume: 0.9,
        }
      );

      this.incomingRingtoneSound = sound;
      // In case stopped while loading
      if (!this.isIncomingPlaying) {
        await sound.stopAsync().catch(() => {});
        await sound.unloadAsync().catch(() => {});
        this.incomingRingtoneSound = null;
      }
    } catch (err) {
      console.warn("[SoundService] Failed to play incoming ringtone:", err);
      this.isIncomingPlaying = false;
    }
  }

  /**
   * Stop incoming call ringtone immediately
   * Safe to call repeatedly
   */
  async stopIncomingRingtone(): Promise<void> {
    this.isIncomingPlaying = false;
    if (this.incomingRingtoneSound) {
      const sound = this.incomingRingtoneSound;
      this.incomingRingtoneSound = null;
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch {}
    }
  }

  /**
   * Start looping outgoing call ringback tone
   * Idempotent
   */
  async startOutgoingRingback(): Promise<void> {
    if (this.isOutgoingPlaying) return;
    this.isOutgoingPlaying = true;

    try {
      // Stop incoming if running
      await this.stopIncomingRingtone();
      await this.prepareCallAudioMode();

      if (this.outgoingRingbackSound) {
        try {
          await this.outgoingRingbackSound.stopAsync();
          await this.outgoingRingbackSound.unloadAsync();
        } catch {}
        this.outgoingRingbackSound = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/outgoing-call.wav"),
        {
          isLooping: true,
          shouldPlay: true,
          volume: 0.75,
        }
      );

      this.outgoingRingbackSound = sound;
      if (!this.isOutgoingPlaying) {
        await sound.stopAsync().catch(() => {});
        await sound.unloadAsync().catch(() => {});
        this.outgoingRingbackSound = null;
      }
    } catch (err) {
      console.warn("[SoundService] Failed to play outgoing ringback:", err);
      this.isOutgoingPlaying = false;
    }
  }

  /**
   * Stop outgoing call ringback immediately
   */
  async stopOutgoingRingback(): Promise<void> {
    this.isOutgoingPlaying = false;
    if (this.outgoingRingbackSound) {
      const sound = this.outgoingRingbackSound;
      this.outgoingRingbackSound = null;
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch {}
    }
  }

  /**
   * Play short, subtle message ping
   * Deduplicates by messageId and suppresses if active on that screen
   */
  async playMessagePing(messageId?: string, scope?: { type: "dm" | "channel"; id: string }): Promise<void> {
    // 1. Message deduplication
    if (messageId) {
      if (this.handledMessageIds.has(messageId)) return;
      this.handledMessageIds.add(messageId);
      // Bound the cache size to 500 IDs
      if (this.handledMessageIds.size > 500) {
        const first = this.handledMessageIds.values().next().value;
        if (first) this.handledMessageIds.delete(first);
      }
    }

    // 2. Chat screen suppression: if currently viewing the conversation, don't ping
    if (
      scope &&
      this.activeScreenScope.type === scope.type &&
      this.activeScreenScope.id === scope.id
    ) {
      return;
    }

    // 3. Do not play if a call is actively ringing or in-progress
    if (this.isIncomingPlaying || this.isOutgoingPlaying) {
      return;
    }

    try {
      if (this.messagePingSound) {
        try {
          await this.messagePingSound.replayAsync();
          return;
        } catch {
          try {
            await this.messagePingSound.unloadAsync();
          } catch {}
          this.messagePingSound = null;
        }
      }

      const { sound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/message-ping.wav"),
        {
          shouldPlay: true,
          volume: 0.65,
        }
      );

      this.messagePingSound = sound;
    } catch (err) {
      console.warn("[SoundService] Failed to play message ping:", err);
    }
  }

  /**
   * Stop all call ringtones and release call audio locks
   */
  async stopAllCallSounds(): Promise<void> {
    await Promise.allSettled([
      this.stopIncomingRingtone(),
      this.stopOutgoingRingback(),
    ]);
  }

  /**
   * Full cleanup on app unload
   */
  async cleanup(): Promise<void> {
    await this.stopAllCallSounds();
    if (this.messagePingSound) {
      try {
        await this.messagePingSound.unloadAsync();
      } catch {}
      this.messagePingSound = null;
    }
  }
}

export const soundService = new SoundService();

import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Standardized Haptic Feedback Utilities for AIIC Mobile.
 */
export const NativeHaptics = {
  /** Light impact for subtle taps, tab switches, and pill selections */
  light: async () => {
    if (Platform.OS === "web") return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  },

  /** Medium impact for button presses, sends, and modal opens */
  medium: async () => {
    if (Platform.OS === "web") return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  },

  /** Heavy impact for destructive actions (delete, kick, ban, leave) */
  heavy: async () => {
    if (Platform.OS === "web") return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
  },

  /** Selection click for scrolling lists, pickers, and sliders */
  selection: async () => {
    if (Platform.OS === "web") return;
    try {
      await Haptics.selectionAsync();
    } catch {}
  },

  /** Success notification haptic pattern */
  success: async () => {
    if (Platform.OS === "web") return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  },

  /** Warning notification haptic pattern */
  warning: async () => {
    if (Platform.OS === "web") return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
  },

  /** Error notification haptic pattern */
  error: async () => {
    if (Platform.OS === "web") return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}
  },
};

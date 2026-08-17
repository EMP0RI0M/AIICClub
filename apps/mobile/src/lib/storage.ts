import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

/**
 * Storage adapter for Supabase client & Zustand stores in React Native:
 * Uses Expo SecureStore when possible, falling back to AsyncStorage.
 */
export const NativeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS !== "web") {
        return await SecureStore.getItemAsync(key);
      }
      return await AsyncStorage.getItem(key);
    } catch {
      return await AsyncStorage.getItem(key);
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS !== "web") {
        await SecureStore.setItemAsync(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch {
      await AsyncStorage.setItem(key, value);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS !== "web") {
        await SecureStore.deleteItemAsync(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch {
      await AsyncStorage.removeItem(key);
    }
  },
};

/**
 * Synchronous state storage wrapper for Zustand createJSONStorage
 */
export const ZustandNativeStorage = {
  getItem: (key: string): string | null => {
    // Note: AsyncStorage is async; Zustand persist supports async storage automatically
    return null;
  },
  setItem: (_key: string, _value: string): void => {},
  removeItem: (_key: string): void => {},
};

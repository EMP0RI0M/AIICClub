import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type GradientDirection = "vertical" | "horizontal" | "diagonal";
export type WallpaperMode = "gradient" | "image" | "solid";

export interface IconColorOption {
  id: string;
  name: string;
  color: string;
  glow: string;
  badgeBg: string;
}

export const ICON_COLOR_PALETTE: IconColorOption[] = [
  {
    id: "amber",
    name: "Obsidian Amber",
    color: "#E8A33D",
    glow: "rgba(232, 163, 61, 0.25)",
    badgeBg: "rgba(232, 163, 61, 0.15)",
  },
  {
    id: "blue",
    name: "Cyber Azure",
    color: "#3B82F6",
    glow: "rgba(59, 130, 246, 0.25)",
    badgeBg: "rgba(59, 130, 246, 0.15)",
  },
  {
    id: "red",
    name: "Crimson Blood",
    color: "#EF4444",
    glow: "rgba(239, 68, 68, 0.25)",
    badgeBg: "rgba(239, 68, 68, 0.15)",
  },
  {
    id: "yellow",
    name: "Laser Yellow",
    color: "#FACC15",
    glow: "rgba(250, 204, 21, 0.25)",
    badgeBg: "rgba(250, 204, 21, 0.15)",
  },
  {
    id: "green",
    name: "Neon Emerald",
    color: "#10B981",
    glow: "rgba(16, 185, 129, 0.25)",
    badgeBg: "rgba(16, 185, 129, 0.15)",
  },
  {
    id: "violet",
    name: "Hyper Violet",
    color: "#A855F7",
    glow: "rgba(168, 85, 247, 0.25)",
    badgeBg: "rgba(168, 85, 247, 0.15)",
  },
  {
    id: "cyan",
    name: "Luminous Cyan",
    color: "#06B6D4",
    glow: "rgba(6, 182, 212, 0.25)",
    badgeBg: "rgba(6, 182, 212, 0.15)",
  },
  {
    id: "pink",
    name: "Neon Rose",
    color: "#F43F5E",
    glow: "rgba(244, 63, 94, 0.25)",
    badgeBg: "rgba(244, 63, 94, 0.15)",
  },
  {
    id: "white",
    name: "Pure Platinum",
    color: "#FFFFFF",
    glow: "rgba(255, 255, 255, 0.25)",
    badgeBg: "rgba(255, 255, 255, 0.15)",
  },
];

export interface ThemePreset {
  id: string;
  name: string;
  subtitle: string;
  gradientColors: [string, string, string];
  direction: GradientDirection;
  accentColor: string;
  ambientOrb1: string;
  ambientOrb2: string;
  wallpaperUrl?: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "obsidian-gold",
    name: "Obsidian Amber",
    subtitle: "Classic AIIC Deep Glass",
    gradientColors: ["#08090E", "#161108", "#05060A"],
    direction: "diagonal",
    accentColor: "#E8A33D",
    ambientOrb1: "rgba(232, 163, 61, 0.08)",
    ambientOrb2: "rgba(168, 85, 247, 0.05)",
  },
  {
    id: "cyber-azure",
    name: "Cyber Azure",
    subtitle: "Electric Blue Deep Space",
    gradientColors: ["#040914", "#09172B", "#03060E"],
    direction: "vertical",
    accentColor: "#3B82F6",
    ambientOrb1: "rgba(59, 130, 246, 0.10)",
    ambientOrb2: "rgba(6, 182, 212, 0.06)",
  },
  {
    id: "crimson-sunset",
    name: "Crimson Blood",
    subtitle: "Vibrant Scarlet & Ember",
    gradientColors: ["#140508", "#240A10", "#080204"],
    direction: "diagonal",
    accentColor: "#EF4444",
    ambientOrb1: "rgba(239, 68, 68, 0.10)",
    ambientOrb2: "rgba(245, 158, 11, 0.05)",
  },
  {
    id: "laser-yellow",
    name: "Solar Flare",
    subtitle: "High-Voltage Gold & Onyx",
    gradientColors: ["#120D04", "#261906", "#090602"],
    direction: "vertical",
    accentColor: "#FACC15",
    ambientOrb1: "rgba(250, 204, 21, 0.09)",
    ambientOrb2: "rgba(232, 163, 61, 0.06)",
  },
  {
    id: "emerald-matrix",
    name: "Emerald Matrix",
    subtitle: "Terminal Hacker Green",
    gradientColors: ["#040F0A", "#081E15", "#020805"],
    direction: "diagonal",
    accentColor: "#10B981",
    ambientOrb1: "rgba(16, 185, 129, 0.10)",
    ambientOrb2: "rgba(6, 182, 212, 0.05)",
  },
  {
    id: "hyper-violet",
    name: "Hyper Violet",
    subtitle: "Royal Nebula Amethyst",
    gradientColors: ["#090514", "#180A28", "#05030A"],
    direction: "diagonal",
    accentColor: "#A855F7",
    ambientOrb1: "rgba(168, 85, 247, 0.10)",
    ambientOrb2: "rgba(244, 63, 94, 0.06)",
  },
  {
    id: "luminous-cyan",
    name: "Luminous Cyan",
    subtitle: "Ocean Abyssal Glass",
    gradientColors: ["#030E14", "#07202B", "#02070A"],
    direction: "vertical",
    accentColor: "#06B6D4",
    ambientOrb1: "rgba(6, 182, 212, 0.10)",
    ambientOrb2: "rgba(45, 212, 191, 0.06)",
  },
  {
    id: "neon-rose",
    name: "Neon Cyberpunk",
    subtitle: "Tokyo Night Magenta",
    gradientColors: ["#14040F", "#26061C", "#090207"],
    direction: "diagonal",
    accentColor: "#F43F5E",
    ambientOrb1: "rgba(244, 63, 94, 0.10)",
    ambientOrb2: "rgba(168, 85, 247, 0.06)",
  },
  {
    id: "monochrome-pure",
    name: "Monochrome Platinum",
    subtitle: "Minimalist OLED Steel",
    gradientColors: ["#060606", "#141414", "#030303"],
    direction: "vertical",
    accentColor: "#FFFFFF",
    ambientOrb1: "rgba(255, 255, 255, 0.06)",
    ambientOrb2: "rgba(255, 255, 255, 0.03)",
  },
];

interface ThemeState {
  presetId: string;
  wallpaperMode: WallpaperMode;
  gradientColors: [string, string, string];
  gradientDirection: GradientDirection;
  accentColor: string;
  ambientOrb1: string;
  ambientOrb2: string;
  wallpaperUrl: string;
  customWallpaperLibrary: string[];
  overlayOpacity: number;
  isLoaded: boolean;

  // Actions
  loadTheme: () => Promise<void>;
  applyPreset: (presetId: string) => Promise<void>;
  setAccentColor: (color: string) => Promise<void>;
  setGradientColors: (colors: [string, string, string]) => Promise<void>;
  setGradientDirection: (dir: GradientDirection) => Promise<void>;
  setWallpaperUrl: (url: string) => Promise<void>;
  addCustomWallpaper: (url: string) => Promise<void>;
  removeCustomWallpaper: (url: string) => Promise<void>;
  setWallpaperMode: (mode: WallpaperMode) => Promise<void>;
  setOverlayOpacity: (opacity: number) => Promise<void>;
  resetTheme: () => Promise<void>;
}

const STORAGE_KEY = "@corvus/user_theme_config";

const DEFAULT_THEME = {
  presetId: "obsidian-gold",
  wallpaperMode: "gradient" as WallpaperMode,
  gradientColors: ["#08090E", "#161108", "#05060A"] as [string, string, string],
  gradientDirection: "diagonal" as GradientDirection,
  accentColor: "#E8A33D",
  ambientOrb1: "rgba(232, 163, 61, 0.08)",
  ambientOrb2: "rgba(168, 85, 247, 0.05)",
  wallpaperUrl: "",
  customWallpaperLibrary: [] as string[],
  overlayOpacity: 0.35,
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  ...DEFAULT_THEME,
  isLoaded: false,

  loadTheme: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          ...parsed,
          customWallpaperLibrary: Array.isArray(parsed.customWallpaperLibrary)
            ? parsed.customWallpaperLibrary
            : parsed.wallpaperUrl ? [parsed.wallpaperUrl] : [],
          isLoaded: true,
        });
        return;
      }
    } catch (e) {
      console.warn("[ThemeStore] Load failed:", e);
    }
    set({ isLoaded: true });
  },

  applyPreset: async (presetId: string) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const newState = {
      presetId: preset.id,
      wallpaperMode: "gradient" as WallpaperMode,
      gradientColors: preset.gradientColors,
      gradientDirection: preset.direction,
      accentColor: preset.accentColor,
      ambientOrb1: preset.ambientOrb1,
      ambientOrb2: preset.ambientOrb2,
      wallpaperUrl: preset.wallpaperUrl || "",
    };
    set(newState);
    try {
      const full = { ...get(), ...newState };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    } catch {}
  },

  setAccentColor: async (accentColor: string) => {
    const hex = accentColor.toUpperCase();
    const orb = hex.startsWith("#") ? `${hex}18` : "rgba(232, 163, 61, 0.08)";
    const newState = {
      accentColor,
      ambientOrb1: orb,
    };
    set(newState);
    try {
      const full = { ...get(), ...newState };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    } catch {}
  },

  setGradientColors: async (gradientColors: [string, string, string]) => {
    const newState = { gradientColors, wallpaperMode: "gradient" as WallpaperMode };
    set(newState);
    try {
      const full = { ...get(), ...newState };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    } catch {}
  },

  setGradientDirection: async (gradientDirection: GradientDirection) => {
    const newState = { gradientDirection };
    set(newState);
    try {
      const full = { ...get(), ...newState };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    } catch {}
  },

  setWallpaperUrl: async (wallpaperUrl: string) => {
    const trimmed = wallpaperUrl.trim();
    const currentLib = get().customWallpaperLibrary || [];
    const newLib = trimmed && !currentLib.includes(trimmed)
      ? [trimmed, ...currentLib]
      : currentLib;

    const newState = {
      wallpaperUrl: trimmed,
      customWallpaperLibrary: newLib,
      wallpaperMode: (trimmed ? "image" : "gradient") as WallpaperMode,
    };
    set(newState);
    try {
      const full = { ...get(), ...newState };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    } catch {}
  },

  addCustomWallpaper: async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const currentLib = get().customWallpaperLibrary || [];
    const newLib = currentLib.includes(trimmed)
      ? currentLib
      : [trimmed, ...currentLib];

    const newState = {
      wallpaperUrl: trimmed,
      customWallpaperLibrary: newLib,
      wallpaperMode: "image" as WallpaperMode,
    };
    set(newState);
    try {
      const full = { ...get(), ...newState };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    } catch {}
  },

  removeCustomWallpaper: async (url: string) => {
    const currentLib = get().customWallpaperLibrary || [];
    const newLib = currentLib.filter((u) => u !== url);
    const isCurrentActive = get().wallpaperUrl === url;

    const newState = {
      customWallpaperLibrary: newLib,
      wallpaperUrl: isCurrentActive ? (newLib[0] || "") : get().wallpaperUrl,
      wallpaperMode: isCurrentActive
        ? (newLib[0] ? "image" : "gradient")
        : get().wallpaperMode,
    };
    set(newState);
    try {
      const full = { ...get(), ...newState };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    } catch {}
  },

  setWallpaperMode: async (wallpaperMode: WallpaperMode) => {
    const newState = { wallpaperMode };
    set(newState);
    try {
      const full = { ...get(), ...newState };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    } catch {}
  },

  setOverlayOpacity: async (overlayOpacity: number) => {
    const newState = { overlayOpacity };
    set(newState);
    try {
      const full = { ...get(), ...newState };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    } catch {}
  },

  resetTheme: async () => {
    set(DEFAULT_THEME);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {}
  },
}));

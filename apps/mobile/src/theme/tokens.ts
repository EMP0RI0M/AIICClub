/**
 * AIIC & Corvus Semantic Design Tokens (Iridescent Obsidian Glassmora Palette)
 * Translated into Native styling primitives.
 */

export const colors = {
  // Surfaces
  background: "#080A0F",
  bgDeep: "#0D1016",
  surface: "#0D1016",
  surfaceRaised: "#12161E",
  surfaceOverlay: "#181C26",
  surfaceGlass: "rgba(21, 25, 34, 0.72)",
  surfaceGlassElevated: "rgba(18, 22, 30, 0.82)",
  surfaceInput: "rgba(21, 25, 34, 0.65)",

  // Brand Accent (Corvus Amber)
  accent: "#F2AA3B",
  accentHover: "#FFC15A",
  accentPressed: "#D99128",
  accentSoft: "rgba(242, 170, 59, 0.12)",
  accentMuted: "rgba(242, 170, 59, 0.45)",
  accentContrast: "#150F05",
  textOnAccent: "#150F05",

  // Accent Secondary & System States
  accentTeal: "#32D6C5",
  accentTealDim: "#22B5A5",
  accentTealSoft: "rgba(50, 214, 197, 0.10)",
  accentWarm: "#F2AA3B",
  live: "#32D6C5",
  liveSoft: "rgba(50, 214, 197, 0.10)",

  // Presence / Status
  statusOnline: "#3DDC84",
  statusIdle: "#F2AA3B",
  statusDnd: "#E45B61",
  statusOffline: "#5F6675",

  // Text Hierarchy
  textPrimary: "#F4F5F8",
  textSecondary: "#8B92A3",
  textMuted: "#5F6675",
  textFaint: "#3D4452",

  // Semantic Status
  success: "#3DDC84",
  successDim: "#2DBB6E",
  successSoft: "rgba(61, 220, 132, 0.10)",
  danger: "#E45B61",
  dangerDim: "#C54349",
  dangerSoft: "rgba(228, 91, 97, 0.10)",
  warning: "#F2AA3B",
  warningSoft: "rgba(242, 170, 59, 0.10)",
  info: "#5B9CFF",
  infoSoft: "rgba(91, 156, 255, 0.10)",

  // Borders & Dividers
  border: "#272D38",
  borderSubtle: "rgba(39, 45, 56, 0.6)",
  borderHighlight: "rgba(255, 255, 255, 0.12)",
  borderActive: "rgba(242, 170, 59, 0.35)",
  borderGlass: "rgba(39, 45, 56, 0.8)",
  borderAccent: "rgba(242, 170, 59, 0.28)",

  // Row States
  hoverRow: "rgba(255, 255, 255, 0.04)",
  activeRow: "rgba(242, 170, 59, 0.08)",
  activeRowTeal: "rgba(50, 214, 197, 0.08)",
  reactionOwn: "rgba(242, 170, 59, 0.12)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 26,
  xl: 32,
  card: 22,
  container: 28,
  sheet: 32,
  input: 18,
  button: 16,
  full: 9999,
  pill: 9999,
};

export const typography = {
  micro: { fontSize: 11, lineHeight: 15, letterSpacing: 0.1 },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  bodySm: { fontSize: 13, lineHeight: 18 },
  body: { fontSize: 14, lineHeight: 20 },
  emphasis: { fontSize: 15, lineHeight: 22, fontWeight: "600" as const },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: "700" as const, letterSpacing: -0.2 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "700" as const, letterSpacing: -0.3 },
  display: { fontSize: 28, lineHeight: 34, fontWeight: "800" as const, letterSpacing: -0.5 },
  mono: { fontFamily: "monospace" },
};

export const glassStyles = {
  container: {
    backgroundColor: "rgba(10, 12, 18, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderRadius: radius.container,
  },
  elevated: {
    backgroundColor: colors.surfaceGlassElevated,
    borderColor: colors.borderHighlight,
    borderWidth: 1,
    borderRadius: radius.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderRadius: radius.card,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.10)",
    borderWidth: 1,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.textPrimary,
  },
};

import { useThemeStore } from "../stores/theme-store";

export function getAppTheme(accentHex: string = colors.accent) {
  const hex = accentHex || colors.accent;
  const isHex = hex.startsWith("#");
  return {
    colors: {
      ...colors,
      accent: hex,
      accentHover: hex,
      accentPressed: hex,
      accentSoft: isHex ? `${hex}1F` : "rgba(242, 170, 59, 0.12)",
      accentMuted: isHex ? `${hex}66` : "rgba(242, 170, 59, 0.45)",
      accentBorder: isHex ? `${hex}4D` : "rgba(242, 170, 59, 0.30)",
      accentGlow: isHex ? `${hex}33` : "rgba(242, 170, 59, 0.20)",
      accentText: colors.accentContrast,
      bg: colors.background,
      surface: colors.surface,
      glass: colors.surfaceGlass,
      glassElevated: colors.surfaceGlassElevated,
      border: colors.border,
      textPrimary: colors.textPrimary,
      textSecondary: colors.textSecondary,
      textMuted: colors.textMuted,
      danger: colors.danger,
      secondary: colors.accentTeal,
      info: colors.info,
    },
    radius,
    spacing,
    typography,
    glassStyles,
  };
}

export type AppTheme = ReturnType<typeof getAppTheme>;

export function useAppTheme(): AppTheme {
  const accentColor = useThemeStore((s) => s.accentColor);
  return getAppTheme(accentColor || colors.accent);
}

/**
 * AIIC & Corvus Semantic Design Tokens (Iridescent Obsidian Glassmora Palette)
 * Translated into Native styling primitives.
 */

export const colors = {
  // Surfaces
  background: "#08090E",
  bgDeep: "#05060A",
  surface: "#0F1017",
  surfaceRaised: "#141620",
  surfaceOverlay: "#1A1C28",
  surfaceGlass: "rgba(255, 255, 255, 0.035)",
  surfaceGlassElevated: "rgba(255, 255, 255, 0.06)",
  surfaceInput: "rgba(255, 255, 255, 0.04)",

  // Brand Accent (Corvus Amber / Ochre)
  accent: "#E8A33D",
  accentHover: "#F2B557",
  accentPressed: "#C9862B",
  accentSoft: "rgba(232, 163, 61, 0.10)",
  accentMuted: "rgba(232, 163, 61, 0.45)",
  accentContrast: "#1A1206",
  textOnAccent: "#1A1206",

  // Accent Secondary & Highlights
  accentTeal: "#2DD4BF",
  accentTealDim: "#1E9E8E",
  accentTealSoft: "rgba(45, 212, 191, 0.10)",
  accentWarm: "#F5A623",
  live: "#22E0D6",
  liveSoft: "rgba(34, 224, 214, 0.10)",

  // Presence / Status
  statusOnline: "#3DDC84",
  statusIdle: "#F5A623",
  statusDnd: "#E05252",
  statusOffline: "#656A7E",

  // Text Hierarchy
  textPrimary: "#ECEDF5",
  textSecondary: "#AEB3C8",
  textMuted: "#656A7E",
  textFaint: "#3D4057",

  // Semantic Status
  success: "#22C55E",
  successDim: "#16A34A",
  successSoft: "rgba(34, 197, 94, 0.10)",
  danger: "#EF4444",
  dangerDim: "#B91C1C",
  dangerSoft: "rgba(239, 68, 68, 0.10)",
  warning: "#F59E0B",
  warningSoft: "rgba(245, 158, 11, 0.10)",
  info: "#3B82F6",
  infoSoft: "rgba(59, 130, 246, 0.10)",

  // Borders & Dividers
  border: "rgba(255, 255, 255, 0.08)",
  borderSubtle: "rgba(255, 255, 255, 0.05)",
  borderHighlight: "rgba(255, 255, 255, 0.12)",
  borderActive: "rgba(232, 163, 61, 0.30)",
  borderGlass: "rgba(255, 255, 255, 0.07)",
  borderAccent: "rgba(232, 163, 61, 0.25)",

  // Row States
  hoverRow: "rgba(255, 255, 255, 0.04)",
  activeRow: "rgba(232, 163, 61, 0.08)",
  activeRowTeal: "rgba(45, 212, 191, 0.08)",
  reactionOwn: "rgba(232, 163, 61, 0.12)",
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
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 22,
  full: 9999,
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
    backgroundColor: colors.surfaceGlass,
    borderColor: colors.borderGlass,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  elevated: {
    backgroundColor: colors.surfaceGlassElevated,
    borderColor: colors.borderHighlight,
    borderWidth: 1,
    borderRadius: radius.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: radius.md,
  },
};

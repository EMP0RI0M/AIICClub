/**
 * AIIC & Corvus Semantic Design Tokens (Iridescent Obsidian Glassmora Palette)
 * Translated into Native styling primitives.
 */

export const colors = {
  // Surfaces
  background: "#0A0B11",
  bgDeep: "#07080D",
  surface: "#111219",
  surfaceRaised: "#171821",
  surfaceOverlay: "#1D1E2C",
  surfaceGlass: "rgba(17, 18, 25, 0.85)",
  surfaceGlassElevated: "rgba(23, 24, 33, 0.88)",
  surfaceInput: "#13141C",

  // Brand Accent (Corvus Amber / Ochre)
  accent: "#E8A33D",
  accentHover: "#F2B557",
  accentPressed: "#C9862B",
  accentSoft: "rgba(232, 163, 61, 0.14)",
  accentMuted: "rgba(232, 163, 61, 0.5)",
  accentContrast: "#1A1206",
  textOnAccent: "#1A1206",

  // Accent Secondary & Highlights
  accentTeal: "#2DD4BF",
  accentTealDim: "#1E9E8E",
  accentTealSoft: "rgba(45, 212, 191, 0.14)",
  accentWarm: "#F5A623",
  live: "#22E0D6",
  liveSoft: "rgba(34, 224, 214, 0.14)",

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
  successSoft: "rgba(34, 197, 94, 0.14)",
  danger: "#EF4444",
  dangerDim: "#B91C1C",
  dangerSoft: "rgba(239, 68, 68, 0.14)",
  warning: "#F59E0B",
  warningSoft: "rgba(245, 158, 11, 0.14)",
  info: "#3B82F6",
  infoSoft: "rgba(59, 130, 246, 0.14)",

  // Borders & Dividers
  border: "#1E2030",
  borderSubtle: "#161724",
  borderHighlight: "#272A40",
  borderActive: "#3D3F60",
  borderGlass: "rgba(255, 255, 255, 0.08)",
  borderAccent: "rgba(232, 163, 61, 0.3)",

  // Row States
  hoverRow: "#14151F",
  activeRow: "#1E2035",
  activeRowTeal: "#0D2520",
  reactionOwn: "#231A52",
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
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
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
    borderRadius: radius.lg,
  },
  elevated: {
    backgroundColor: colors.surfaceGlassElevated,
    borderColor: colors.borderHighlight,
    borderWidth: 1,
    borderRadius: radius.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
};

import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import {
  X,
  Sparkles,
  Palette,
  Image as ImageIcon,
  RotateCcw,
  Check,
  Compass,
  Layers,
  Sun,
} from "lucide-react-native";
import {
  useThemeStore,
  THEME_PRESETS,
  ICON_COLOR_PALETTE,
  GradientDirection,
  WallpaperMode,
} from "../../stores/theme-store";
import { NativeHaptics } from "../../lib/haptics";

interface ThemeCustomizerModalProps {
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CURATED_WALLPAPERS = [
  {
    name: "Obsidian Void",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop",
  },
  {
    name: "Cyber Nebula",
    url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop",
  },
  {
    name: "Tokyo Night",
    url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop",
  },
  {
    name: "Deep Fluid",
    url: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1200&auto=format&fit=crop",
  },
];

export function ThemeCustomizerModal({ visible, onClose }: ThemeCustomizerModalProps) {
  const {
    presetId,
    wallpaperMode,
    gradientColors,
    gradientDirection,
    accentColor,
    wallpaperUrl,
    overlayOpacity,
    applyPreset,
    setAccentColor,
    setGradientColors,
    setGradientDirection,
    setWallpaperUrl,
    setWallpaperMode,
    setOverlayOpacity,
    resetTheme,
  } = useThemeStore();

  const [customInputUrl, setCustomInputUrl] = useState(wallpaperUrl || "");
  const [customHex, setCustomHex] = useState(accentColor || "");

  const handleSelectPreset = (id: string) => {
    NativeHaptics.medium();
    applyPreset(id);
  };

  const handleSelectIconColor = (color: string) => {
    NativeHaptics.light();
    setAccentColor(color);
  };

  const handleSetDirection = (dir: GradientDirection) => {
    NativeHaptics.light();
    setGradientDirection(dir);
  };

  const handleApplyWallpaperUrl = (url: string) => {
    NativeHaptics.medium();
    setCustomInputUrl(url);
    setWallpaperUrl(url);
  };

  const handleReset = () => {
    NativeHaptics.medium();
    resetTheme();
    setCustomInputUrl("");
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <BlurView intensity={Platform.OS === "ios" ? 50 : 35} tint="dark" style={StyleSheet.absoluteFillObject} />
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.14)", "rgba(10, 12, 18, 0.96)"]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconOrb, { backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40` }]}>
                <Palette size={18} color={accentColor} />
              </View>
              <View>
                <Text style={styles.title}>Theme & Wallpaper Studio</Text>
                <Text style={[styles.subtitle, { color: accentColor }]}>CUSTOMIZE GRADIENTS & ICON COLORS</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <X size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Live Interactive Preview Card */}
            <View style={styles.previewCardWrap}>
              <LinearGradient
                colors={gradientColors}
                start={gradientDirection === "horizontal" ? { x: 0, y: 0.5 } : gradientDirection === "diagonal" ? { x: 0, y: 0 } : { x: 0.5, y: 0 }}
                end={gradientDirection === "horizontal" ? { x: 1, y: 0.5 } : gradientDirection === "diagonal" ? { x: 1, y: 1 } : { x: 0.5, y: 1 }}
                style={styles.previewCard}
              >
                <View style={[styles.previewOrb, { backgroundColor: `${accentColor}25` }]} />
                <View style={styles.previewContent}>
                  <View style={styles.previewTopRow}>
                    <View style={[styles.previewBadge, { backgroundColor: `${accentColor}25`, borderColor: `${accentColor}50` }]}>
                      <Sparkles size={11} color={accentColor} />
                      <Text style={[styles.previewBadgeText, { color: accentColor }]}>LIVE PREVIEW</Text>
                    </View>
                    <Text style={styles.previewDimText}>{gradientDirection.toUpperCase()}</Text>
                  </View>

                  <View style={styles.previewDemoBar}>
                    <View style={[styles.previewIconOrb, { backgroundColor: `${accentColor}22`, borderColor: `${accentColor}45` }]}>
                      <Palette size={14} color={accentColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.previewDemoTitle}>Corvus Obsidian UI</Text>
                      <Text style={styles.previewDemoSubtitle}>Dynamic bright icon & gradient styling</Text>
                    </View>
                    <View style={[styles.previewActionBtn, { backgroundColor: accentColor }]}>
                      <Text style={styles.previewActionBtnText}>Active</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* SECTION 1: ICON & ACCENT COLOR SELECTOR */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>1. CHOOSE ICON & ACCENT COLOR</Text>
              <Text style={styles.sectionHint}>Icons, badges, and glows adopt this vibrant color</Text>
            </View>

            <View style={styles.paletteGrid}>
              {ICON_COLOR_PALETTE.map((pal) => {
                const isSelected = accentColor.toLowerCase() === pal.color.toLowerCase();
                return (
                  <TouchableOpacity
                    key={pal.id}
                    style={[
                      styles.paletteCard,
                      isSelected && { borderColor: pal.color, backgroundColor: `${pal.color}15` },
                    ]}
                    onPress={() => handleSelectIconColor(pal.color)}
                  >
                    <View style={[styles.colorDot, { backgroundColor: pal.color, shadowColor: pal.color }]}>
                      {isSelected && <Check size={12} color={pal.color === "#FFFFFF" || pal.color === "#FACC15" ? "#000" : "#FFF"} />}
                    </View>
                    <Text style={[styles.colorName, isSelected && { color: "#FFF", fontWeight: "700" }]}>
                      {pal.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Hex Input */}
            <View style={styles.customHexRow}>
              <TextInput
                placeholder="Custom Hex (e.g. #FF007F)..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={customHex}
                onChangeText={setCustomHex}
                style={styles.customHexInput}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[styles.applyHexBtn, { backgroundColor: customHex.startsWith("#") ? customHex : accentColor }]}
                onPress={() => {
                  if (customHex.trim()) handleSelectIconColor(customHex.trim());
                }}
              >
                <Text style={styles.applyHexBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>

            {/* SECTION 2: CURATED PRESETS */}
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <Text style={styles.sectionTitle}>2. CURATED THEME & GRADIENT PRESETS</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScroll}>
              {THEME_PRESETS.map((preset) => {
                const isSelected = presetId === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.presetCardWrap,
                      isSelected && { borderColor: preset.accentColor, borderWidth: 2 },
                    ]}
                    onPress={() => handleSelectPreset(preset.id)}
                  >
                    <LinearGradient
                      colors={preset.gradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.presetCardInner}
                    >
                      <View style={[styles.presetDot, { backgroundColor: preset.accentColor }]} />
                      <Text style={styles.presetName}>{preset.name}</Text>
                      <Text style={styles.presetSubtitle}>{preset.subtitle}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* SECTION 3: GRADIENT DIRECTION */}
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <Text style={styles.sectionTitle}>3. GRADIENT DIRECTION</Text>
            </View>

            <View style={styles.directionRow}>
              {(
                [
                  { id: "vertical", label: "Vertical (Top-Bottom)" },
                  { id: "diagonal", label: "Diagonal" },
                  { id: "horizontal", label: "Horizontal (Left-Right)" },
                ] as const
              ).map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={[
                    styles.directionBtn,
                    gradientDirection === d.id && { borderColor: accentColor, backgroundColor: `${accentColor}18` },
                  ]}
                  onPress={() => handleSetDirection(d.id)}
                >
                  <Compass size={13} color={gradientDirection === d.id ? accentColor : "#888"} />
                  <Text style={[styles.directionBtnText, gradientDirection === d.id && { color: accentColor, fontWeight: "700" }]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* SECTION 4: IMAGE WALLPAPERS */}
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <Text style={styles.sectionTitle}>4. WALLPAPER IMAGES & OVERLAY</Text>
              <Text style={styles.sectionHint}>Layer a custom image behind with darkened glass</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScroll}>
              {CURATED_WALLPAPERS.map((wp, idx) => (
                <TouchableOpacity
                  key={`wp-${idx}`}
                  style={[
                    styles.curatedWpCard,
                    wallpaperUrl === wp.url && { borderColor: accentColor, borderWidth: 2 },
                  ]}
                  onPress={() => handleApplyWallpaperUrl(wp.url)}
                >
                  <Text style={styles.curatedWpText}>{wp.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.customHexRow}>
              <TextInput
                placeholder="Custom image URL (https://...)..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={customInputUrl}
                onChangeText={setCustomInputUrl}
                style={styles.customHexInput}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.applyHexBtn, { backgroundColor: accentColor }]}
                onPress={() => handleApplyWallpaperUrl(customInputUrl)}
              >
                <Text style={styles.applyHexBtnText}>Set</Text>
              </TouchableOpacity>
            </View>

            {/* Reset & Done Buttons */}
            <View style={styles.footerRow}>
              <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                <RotateCcw size={14} color="#AAA" />
                <Text style={styles.resetBtnText}>Reset Defaults</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: accentColor }]} onPress={onClose}>
                <Text style={styles.doneBtnText}>Save & Apply</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    height: "88%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    overflow: "hidden",
    paddingTop: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconOrb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 9,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  previewCardWrap: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    marginBottom: 16,
  },
  previewCard: {
    padding: 16,
    minHeight: 110,
    justifyContent: "space-between",
  },
  previewOrb: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -20,
    right: -20,
  },
  previewContent: {
    gap: 12,
  },
  previewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  previewBadgeText: {
    fontSize: 9,
    fontFamily: "monospace",
    fontWeight: "800",
  },
  previewDimText: {
    fontSize: 10,
    fontFamily: "monospace",
    color: "rgba(255, 255, 255, 0.5)",
  },
  previewDemoBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  previewIconOrb: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  previewDemoTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  previewDemoSubtitle: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 10.5,
  },
  previewActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  previewActionBtnText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "800",
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  sectionHint: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 11,
    marginTop: 2,
  },
  paletteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  paletteCard: {
    width: (SCREEN_WIDTH - 48) / 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 3,
  },
  colorName: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
    flex: 1,
  },
  customHexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  customHexInput: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "monospace",
  },
  applyHexBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  applyHexBtnText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "800",
  },
  presetScroll: {
    gap: 10,
  },
  presetCardWrap: {
    width: 140,
    height: 90,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  presetCardInner: {
    flex: 1,
    padding: 10,
    justifyContent: "flex-end",
  },
  presetDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  presetName: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  presetSubtitle: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 9.5,
  },
  directionRow: {
    flexDirection: "row",
    gap: 8,
  },
  directionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  directionBtnText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 11,
  },
  curatedWpCard: {
    width: 120,
    height: 60,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  curatedWpText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  resetBtnText: {
    color: "#AAA",
    fontSize: 12,
    fontWeight: "600",
  },
  doneBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
  },
  doneBtnText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "800",
  },
});

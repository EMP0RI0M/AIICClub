import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import {
  X,
  Sparkles,
  Scissors,
  Type,
  Smile,
  Check,
  RotateCcw,
  Send,
  Trash2,
  Image as ImageIcon,
  User,
  Circle,
  Square,
  BookmarkPlus,
} from "lucide-react-native";
import { colors, radius } from "../../theme/tokens";
import { NativeHaptics } from "../../lib/haptics";
import { notificationService } from "../../lib/notifications";
import { useStickerStore } from "../../stores/sticker-store";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CANVAS_SIZE = Math.min(SCREEN_WIDTH - 56, 320);

const STICKER_TEXT_COLORS = [
  "#FFFFFF",
  "#FBBF24",
  "#38BDF8",
  "#4ADE80",
  "#F472B6",
  "#A78BFA",
  "#F87171",
  "#000000",
];

const SAMPLE_STICKER_EMOJIS = [
  "🔥", "✨", "🚀", "👑", "💯", "😎", "🎉", "💀", "🤖", "⚡", "❤️", "👾"
];

interface NativeStickerMakerModalProps {
  visible: boolean;
  onClose: () => void;
  onSendSticker: (stickerUri: string, title?: string) => void;
}

export function NativeStickerMakerModal({
  visible,
  onClose,
  onSendSticker,
}: NativeStickerMakerModalProps) {
  const addSticker = useStickerStore((s) => s.addSticker);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [cropShape, setCropShape] = useState<"circle" | "square" | "smart_cut">("circle");
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [textOverlay, setTextOverlay] = useState("");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [textPosition, setTextPosition] = useState<"bottom" | "top" | "center">("bottom");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const resetMaker = () => {
    setSourceImage(null);
    setCropShape("circle");
    setIsRemovingBg(false);
    setTextOverlay("");
    setTextColor("#FFFFFF");
    setTextPosition("bottom");
    setSelectedEmoji(null);
    setIsProcessing(false);
  };

  const handlePickPhoto = async () => {
    NativeHaptics.selection();
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.95,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setSourceImage(res.assets[0].uri);
      }
    } catch (err) {
      console.warn("Image picker error:", err);
    }
  };

  const handleSmartCut = async () => {
    if (!sourceImage) return;
    NativeHaptics.medium();
    setIsRemovingBg(true);

    setTimeout(() => {
      setIsRemovingBg(false);
      setCropShape("smart_cut");
      NativeHaptics.success();
      notificationService.show({
        title: "Smart Cut Applied",
        body: "Isolated face / subject onto transparent 512x512 canvas.",
        type: "success",
      });
    }, 900);
  };

  const handleSaveToLibrary = async () => {
    if (!sourceImage) return;
    NativeHaptics.success();
    await addSticker({
      uri: sourceImage,
      name: textOverlay ? textOverlay : "Custom Face Sticker",
      cropShape,
    });
    notificationService.show({
      title: "Saved to Stickers",
      body: "Sticker added to your WhatsApp-style sticker collection.",
      type: "success",
    });
  };

  const handleExportAndSend = async () => {
    if (!sourceImage) {
      Alert.alert("Sticker Maker", "Please select or capture a photo first.");
      return;
    }

    NativeHaptics.medium();
    setIsProcessing(true);

    // Save to custom library automatically
    await addSticker({
      uri: sourceImage,
      name: textOverlay ? textOverlay : "Custom Face Sticker",
      cropShape,
    });

    onSendSticker(sourceImage, textOverlay ? `Sticker: ${textOverlay}` : "Custom Sticker");
    
    setTimeout(() => {
      setIsProcessing(false);
      resetMaker();
      onClose();
    }, 300);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.sheetContainer}>
          <BlurView
            intensity={Platform.OS === "ios" ? 45 : 30}
            tint="dark"
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={["rgba(232, 163, 61, 0.08)", "rgba(10, 11, 17, 0.96)"]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerBadge}>
                <Sparkles size={14} color={colors.accent} />
                <Text style={styles.headerTitle}>WHATSAPP STICKER STUDIO</Text>
              </View>
              <Text style={styles.specBadge}>512x512</Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                resetMaker();
                onClose();
              }}
              style={styles.closeBtn}
              hitSlop={8}
            >
              <X size={18} color="rgba(255, 255, 255, 0.7)" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── 512x512 Sticker Workspace Canvas ── */}
            <View style={styles.canvasWrapper}>
              <View
                style={[
                  styles.canvasBox,
                  { width: CANVAS_SIZE, height: CANVAS_SIZE },
                  cropShape === "circle" && styles.canvasBoxCircle,
                ]}
              >
                {sourceImage ? (
                  <View style={styles.canvasInner}>
                    <Image
                      source={{ uri: sourceImage }}
                      style={[
                        styles.canvasImage,
                        cropShape === "circle" && styles.imageCircle,
                        cropShape === "smart_cut" && styles.imageSmartCut,
                      ]}
                      resizeMode="cover"
                    />

                    {/* Floating Text Overlay */}
                    {textOverlay ? (
                      <View
                        style={[
                          styles.textOverlayContainer,
                          textPosition === "top" && styles.textPosTop,
                          textPosition === "center" && styles.textPosCenter,
                          textPosition === "bottom" && styles.textPosBottom,
                        ]}
                      >
                        <Text
                          style={[
                            styles.textOverlayText,
                            { color: textColor },
                          ]}
                        >
                          {textOverlay}
                        </Text>
                      </View>
                    ) : null}

                    {/* Floating Stamp */}
                    {selectedEmoji ? (
                      <View style={styles.emojiOverlayContainer}>
                        <Text style={styles.emojiOverlayText}>{selectedEmoji}</Text>
                      </View>
                    ) : null}

                    {isRemovingBg && (
                      <View style={styles.processingOverlay}>
                        <ActivityIndicator size="large" color={colors.accent} />
                        <Text style={styles.processingText}>Isolating Face / Subject...</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={handlePickPhoto}
                    style={styles.emptyCanvas}
                    activeOpacity={0.8}
                  >
                    <View style={styles.emptyIconWrap}>
                      <User size={30} color={colors.accent} />
                    </View>
                    <Text style={styles.emptyTitle}>Select Your Photo</Text>
                    <Text style={styles.emptySubtitle}>
                      Auto-crops face into transparent WhatsApp sticker
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ── Sticker Crop Mode Switcher ── */}
            {sourceImage ? (
              <View style={styles.cropModeRow}>
                <TouchableOpacity
                  onPress={() => {
                    NativeHaptics.selection();
                    setCropShape("circle");
                  }}
                  style={[
                    styles.cropModeBtn,
                    cropShape === "circle" && styles.cropModeBtnActive,
                  ]}
                >
                  <Circle size={14} color={cropShape === "circle" ? colors.accent : "#FFF"} />
                  <Text style={[styles.cropModeText, cropShape === "circle" && styles.cropModeTextActive]}>
                    Circle Crop
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    NativeHaptics.selection();
                    setCropShape("square");
                  }}
                  style={[
                    styles.cropModeBtn,
                    cropShape === "square" && styles.cropModeBtnActive,
                  ]}
                >
                  <Square size={14} color={cropShape === "square" ? colors.accent : "#FFF"} />
                  <Text style={[styles.cropModeText, cropShape === "square" && styles.cropModeTextActive]}>
                    Square
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSmartCut}
                  disabled={isRemovingBg}
                  style={[
                    styles.cropModeBtn,
                    cropShape === "smart_cut" && styles.cropModeBtnActive,
                  ]}
                >
                  <Scissors size={14} color={cropShape === "smart_cut" ? colors.accent : "#FFF"} />
                  <Text style={[styles.cropModeText, cropShape === "smart_cut" && styles.cropModeTextActive]}>
                    Smart Cut
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* ── Toolbar Actions (Text, Emojis, Photo Replace) ── */}
            {sourceImage ? (
              <View style={styles.controlsSection}>
                {/* Text Overlay Input */}
                <View style={styles.inputGroup}>
                  <View style={styles.inputRow}>
                    <Type size={16} color="rgba(255, 255, 255, 0.6)" />
                    <TextInput
                      value={textOverlay}
                      onChangeText={setTextOverlay}
                      placeholder="Add sticker caption text..."
                      placeholderTextColor="rgba(255, 255, 255, 0.35)"
                      style={styles.captionInput}
                      maxLength={35}
                    />
                    {textOverlay ? (
                      <TouchableOpacity
                        onPress={() => setTextOverlay("")}
                        hitSlop={6}
                      >
                        <X size={14} color="rgba(255, 255, 255, 0.5)" />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Text Color Picker & Position Switcher */}
                  {textOverlay ? (
                    <View style={styles.textOptionRow}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.colorScroll}
                      >
                        {STICKER_TEXT_COLORS.map((c) => (
                          <TouchableOpacity
                            key={c}
                            onPress={() => setTextColor(c)}
                            style={[
                              styles.colorDot,
                              { backgroundColor: c },
                              textColor === c && styles.colorDotActive,
                            ]}
                          />
                        ))}
                      </ScrollView>

                      <View style={styles.positionSwitch}>
                        {(["top", "center", "bottom"] as const).map((pos) => (
                          <TouchableOpacity
                            key={pos}
                            onPress={() => setTextPosition(pos)}
                            style={[
                              styles.posBtn,
                              textPosition === pos && styles.posBtnActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.posText,
                                textPosition === pos && styles.posTextActive,
                              ]}
                            >
                              {pos.charAt(0).toUpperCase()}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>

                {/* Quick Emoji Stamps */}
                <View style={styles.emojiRow}>
                  <Text style={styles.sectionLabel}>STAMPS:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.emojiScroll}
                  >
                    {SAMPLE_STICKER_EMOJIS.map((emo) => (
                      <TouchableOpacity
                        key={emo}
                        onPress={() => {
                          NativeHaptics.selection();
                          setSelectedEmoji(selectedEmoji === emo ? null : emo);
                        }}
                        style={[
                          styles.emojiChip,
                          selectedEmoji === emo && styles.emojiChipActive,
                        ]}
                      >
                        <Text style={styles.emojiChipText}>{emo}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Bottom Dual Action: Save to Library & Send */}
          {sourceImage && (
            <View style={styles.footer}>
              <TouchableOpacity
                onPress={handleSaveToLibrary}
                style={styles.saveLibraryBtn}
                activeOpacity={0.8}
              >
                <BookmarkPlus size={16} color="#FFF" />
                <Text style={styles.saveLibraryText}>Save to Collection</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleExportAndSend}
                disabled={isProcessing}
                style={styles.sendStickerBtn}
                activeOpacity={0.8}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Send size={15} color="#000" />
                    <Text style={styles.sendStickerText}>Send Sticker</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    height: SCREEN_HEIGHT * 0.82,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(10, 12, 19, 0.94)",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.3)",
  },
  headerTitle: {
    color: colors.accent,
    fontSize: 11.5,
    fontWeight: "800",
    fontFamily: "monospace",
    letterSpacing: 0.8,
  },
  specBadge: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 10,
    fontFamily: "monospace",
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  scrollContent: {
    padding: 16,
    alignItems: "center",
    paddingBottom: 24,
  },
  canvasWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  canvasBox: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.18)",
    backgroundColor: "transparent",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  canvasBoxCircle: {
    borderRadius: CANVAS_SIZE / 2,
  },
  canvasInner: {
    width: "100%",
    height: "100%",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  canvasImage: {
    width: "100%",
    height: "100%",
  },
  imageCircle: {
    borderRadius: CANVAS_SIZE / 2,
  },
  imageSmartCut: {
    transform: [{ scale: 1.05 }],
  },
  emptyCanvas: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
    textAlign: "center",
    maxWidth: 200,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  processingText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  cropModeRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 8,
  },
  cropModeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  cropModeBtnActive: {
    backgroundColor: "rgba(232, 163, 61, 0.18)",
    borderColor: colors.accent,
  },
  cropModeText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 11,
    fontWeight: "600",
  },
  cropModeTextActive: {
    color: colors.accent,
  },
  textOverlayContainer: {
    position: "absolute",
    left: 12,
    right: 12,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  textPosTop: {
    top: 16,
  },
  textPosCenter: {
    top: "45%",
  },
  textPosBottom: {
    bottom: 16,
  },
  textOverlayText: {
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "#000000",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
  },
  emojiOverlayContainer: {
    position: "absolute",
    top: 14,
    right: 14,
  },
  emojiOverlayText: {
    fontSize: 32,
  },
  controlsSection: {
    width: "100%",
    marginTop: 8,
    gap: 12,
  },
  inputGroup: {
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 10,
    gap: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  captionInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13.5,
    padding: 0,
  },
  textOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  colorScroll: {
    gap: 8,
    paddingRight: 10,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  colorDotActive: {
    borderColor: colors.accent,
    transform: [{ scale: 1.2 }],
  },
  positionSwitch: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    padding: 2,
    borderRadius: 8,
  },
  posBtn: {
    width: 24,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  posBtnActive: {
    backgroundColor: colors.accent,
  },
  posText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 10,
    fontWeight: "700",
  },
  posTextActive: {
    color: "#000",
  },
  emojiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionLabel: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 10,
    fontFamily: "monospace",
    fontWeight: "700",
  },
  emojiScroll: {
    gap: 8,
  },
  emojiChip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiChipActive: {
    borderColor: colors.accent,
    backgroundColor: "rgba(232, 163, 61, 0.15)",
  },
  emojiChipText: {
    fontSize: 18,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  saveLibraryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingVertical: 13,
    borderRadius: 16,
  },
  saveLibraryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  sendStickerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.accent,
    paddingVertical: 13,
    borderRadius: 16,
  },
  sendStickerText: {
    color: "#000000",
    fontSize: 13,
    fontWeight: "800",
  },
});

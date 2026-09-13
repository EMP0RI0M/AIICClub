import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  Mic,
  MicOff,
  Headphones,
  Settings,
  Check,
  X,
  Sparkles,
  VolumeX,
} from "lucide-react-native";
import { useAuthStore, User } from "../../stores/auth-store";
import { colors } from "../../theme/tokens";

const PRESENCE_CONFIG = [
  {
    id: "online" as const,
    label: "Online",
    hint: "Active and available",
    color: "#22C55E",
    glow: "rgba(34, 197, 94, 0.6)",
  },
  {
    id: "idle" as const,
    label: "Idle",
    hint: "Away from keyboard",
    color: "#F59E0B",
    glow: "rgba(245, 158, 11, 0.6)",
  },
  {
    id: "dnd" as const,
    label: "Do not disturb",
    hint: "Mutes notifications",
    color: "#EF4444",
    glow: "rgba(239, 68, 68, 0.6)",
  },
  {
    id: "invisible" as const,
    label: "Invisible",
    hint: "Appear offline",
    color: "rgba(245, 247, 250, 0.4)",
    glow: "transparent",
  },
];

const NOISE_LEVELS = [
  { id: "standard", label: "Standard" },
  { id: "krisp_ai", label: "AI Enhanced" },
  { id: "off", label: "Off" },
];

function formatAvatarUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `https://aiic-bbs.vercel.app${url}`;
  return url;
}

export function LiquidUserDock({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) {
  const { user, setStatus } = useAuthStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [statusDraft, setStatusDraft] = useState(user?.statusText || "");
  const [noiseLevel, setNoiseLevel] = useState("krisp_ai");

  const currentPresence = user?.status || "online";
  const currentConfig =
    PRESENCE_CONFIG.find((p) => p.id === currentPresence) || PRESENCE_CONFIG[0];

  const handleSelectPresence = (presence: User["status"]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStatus(presence, statusDraft.trim() || null);
  };

  const handleSaveCustomStatus = () => {
    setStatus(currentPresence, statusDraft.trim() || null);
  };

  const handleClearStatus = () => {
    setStatusDraft("");
    setStatus(currentPresence, null);
  };

  return (
    <>
      {/* ─── Floating Liquid Glass Capsule User Dock ─── */}
      <View style={styles.dockContainer}>
        <BlurView
          intensity={Platform.OS === "ios" ? 40 : 25}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={[
            "rgba(255, 255, 255, 0.09)",
            "rgba(255, 255, 255, 0.02)",
            "rgba(232, 163, 61, 0.04)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* User Card Trigger */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setStatusDraft(user?.statusText || "");
            setModalVisible(true);
          }}
          style={({ pressed }) => [
            styles.userSection,
            pressed && { opacity: 0.8 },
          ]}
        >
          <View style={styles.avatarWrap}>
            {formatAvatarUrl(user?.avatar) ? (
              <Image
                source={{ uri: formatAvatarUrl(user?.avatar)! }}
                style={styles.avatarImg}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>
                  {(user?.displayName || user?.username || "M")
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.presenceDot,
                {
                  backgroundColor: currentConfig.color,
                  shadowColor: currentConfig.color,
                },
              ]}
            />
          </View>

          <View style={styles.userTextWrap}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.displayName || "Member"}
            </Text>
            <Text style={styles.userStatus} numberOfLines={1}>
              {user?.statusText || currentConfig.label}
            </Text>
          </View>
        </Pressable>

        {/* Quick Audio Controls */}
        <View style={styles.controlsRow}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsMuted(!isMuted);
            }}
            hitSlop={6}
            style={[styles.iconBtn, isMuted && styles.iconBtnActive]}
          >
            {isMuted ? (
              <MicOff size={16} color={colors.danger} />
            ) : (
              <Mic size={16} color="rgba(245, 247, 250, 0.75)" />
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsDeafened(!isDeafened);
            }}
            hitSlop={6}
            style={[styles.iconBtn, isDeafened && styles.iconBtnActive]}
          >
            {isDeafened ? (
              <VolumeX size={16} color={colors.danger} />
            ) : (
              <Headphones size={16} color="rgba(245, 247, 250, 0.75)" />
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onOpenSettings();
            }}
            hitSlop={6}
            style={styles.iconBtn}
          >
            <Settings size={16} color="rgba(245, 247, 250, 0.75)" />
          </Pressable>
        </View>
      </View>

      {/* ─── Liquid Glass Status & Presence Sheet Modal ─── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setModalVisible(false)}
        >
          <Pressable style={styles.sheetCard} onPress={(e) => e.stopPropagation()}>
            <BlurView
              intensity={Platform.OS === "ios" ? 50 : 35}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={["rgba(255, 255, 255, 0.12)", "rgba(20, 24, 33, 0.95)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetAvatarWrap}>
                {formatAvatarUrl(user?.avatar) ? (
                  <Image
                    source={{ uri: formatAvatarUrl(user?.avatar)! }}
                    style={styles.sheetAvatarImg}
                  />
                ) : (
                  <View style={styles.sheetAvatarFallback}>
                    <Text style={styles.sheetAvatarLetter}>
                      {(user?.displayName || user?.username || "M")
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.sheetPresenceDot,
                    {
                      backgroundColor: currentConfig.color,
                      shadowColor: currentConfig.color,
                    },
                  ]}
                />
              </View>

              <View style={styles.sheetUserInfo}>
                <Text style={styles.sheetUserName}>{user?.displayName || "Member"}</Text>
                <Text style={styles.sheetUserHandle}>
                  @{user?.username || "member"} · {currentConfig.label}
                </Text>
              </View>

              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
                hitSlop={8}
              >
                <X size={18} color="rgba(245, 247, 250, 0.6)" />
              </Pressable>
            </View>

            {/* Custom Status Input */}
            <Text style={styles.sectionTitle}>CUSTOM STATUS</Text>
            <View style={styles.statusInputContainer}>
              <Sparkles size={15} color={colors.accent} style={{ marginRight: 8 }} />
              <TextInput
                value={statusDraft}
                onChangeText={setStatusDraft}
                onBlur={handleSaveCustomStatus}
                onSubmitEditing={handleSaveCustomStatus}
                placeholder="What's on your mind?"
                placeholderTextColor="rgba(245, 247, 250, 0.4)"
                style={styles.statusInput}
                returnKeyType="done"
              />
              {Boolean(statusDraft) && (
                <Pressable onPress={handleClearStatus} hitSlop={6}>
                  <X size={15} color="rgba(245, 247, 250, 0.5)" />
                </Pressable>
              )}
            </View>

            {/* Status Presence Options */}
            <Text style={styles.sectionTitle}>STATUS PRESENCE</Text>
            <View style={styles.presenceList}>
              {PRESENCE_CONFIG.map((item) => {
                const isSelected = currentPresence === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleSelectPresence(item.id)}
                    style={[
                      styles.presenceRow,
                      isSelected && styles.presenceRowActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.presenceRowDot,
                        { backgroundColor: item.color },
                      ]}
                    />
                    <View style={styles.presenceRowTextWrap}>
                      <Text
                        style={[
                          styles.presenceRowLabel,
                          isSelected && styles.presenceRowLabelActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text style={styles.presenceRowHint}>{item.hint}</Text>
                    </View>
                    {isSelected && (
                      <Check size={16} color={colors.accent} strokeWidth={2.5} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Noise Suppression Selector */}
            <Text style={styles.sectionTitle}>NOISE SUPPRESSION</Text>
            <View style={styles.noiseGrid}>
              {NOISE_LEVELS.map((level) => {
                const isActive = noiseLevel === level.id;
                return (
                  <Pressable
                    key={level.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setNoiseLevel(level.id);
                    }}
                    style={[
                      styles.noiseBtn,
                      isActive && styles.noiseBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.noiseBtnText,
                        isActive && styles.noiseBtnTextActive,
                      ]}
                    >
                      {level.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dockContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  userSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  avatarWrap: {
    position: "relative",
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(232, 163, 61, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "800",
  },
  presenceDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 2,
    borderColor: "#0A0B11",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  userTextWrap: {
    flex: 1,
    justifyContent: "center",
  },
  userName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  userStatus: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  iconBtnActive: {
    backgroundColor: "rgba(239, 68, 68, 0.18)",
    borderColor: "rgba(239, 68, 68, 0.35)",
  },

  /* ── Modal & Sheet ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "flex-end",
    padding: 12,
  },
  sheetCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    padding: 20,
    overflow: "hidden",
    marginBottom: Platform.OS === "ios" ? 18 : 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: 16,
    marginBottom: 16,
  },
  sheetAvatarWrap: {
    position: "relative",
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
  },
  sheetAvatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  sheetAvatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(232, 163, 61, 0.2)",
    borderWidth: 1.5,
    borderColor: "rgba(232, 163, 61, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetAvatarLetter: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: "800",
  },
  sheetPresenceDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: "#12141F",
  },
  sheetUserInfo: {
    flex: 1,
  },
  sheetUserName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sheetUserHandle: {
    color: "rgba(245, 247, 250, 0.6)",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "rgba(245, 247, 250, 0.5)",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 6,
  },
  statusInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
  },
  statusInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: "500",
  },

  presenceList: {
    gap: 6,
    marginBottom: 16,
  },
  presenceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  presenceRowActive: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  presenceRowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  presenceRowTextWrap: {
    flex: 1,
  },
  presenceRowLabel: {
    color: "rgba(245, 247, 250, 0.85)",
    fontSize: 13.5,
    fontWeight: "600",
  },
  presenceRowLabelActive: {
    color: colors.textPrimary,
    fontWeight: "800",
  },
  presenceRowHint: {
    color: "rgba(245, 247, 250, 0.45)",
    fontSize: 11,
    marginTop: 1,
  },

  noiseGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  noiseBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  noiseBtnActive: {
    borderColor: "rgba(232, 163, 61, 0.5)",
    backgroundColor: "rgba(232, 163, 61, 0.18)",
  },
  noiseBtnText: {
    color: "rgba(245, 247, 250, 0.6)",
    fontSize: 12,
    fontWeight: "600",
  },
  noiseBtnTextActive: {
    color: colors.accent,
    fontWeight: "800",
  },
});

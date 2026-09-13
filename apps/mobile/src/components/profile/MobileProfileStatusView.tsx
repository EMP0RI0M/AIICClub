import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  TextInput,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import {
  Shield,
  Check,
  X,
  Volume2,
  AudioLines,
  Settings,
  LogOut,
  Sparkles,
  Edit3,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { colors, radius, useAppTheme } from "../../theme/tokens";
import { useAuthStore, type User } from "../../stores/auth-store";
import { formatAvatarUrl } from "../../lib/avatar";
import { NativeHaptics } from "../../lib/haptics";

const PRESENCE_OPTIONS: {
  id: User["status"];
  label: string;
  dotColor: string;
  hint?: string;
}[] = [
  { id: "online", label: "Online", dotColor: colors.statusOnline },
  { id: "idle", label: "Idle", dotColor: colors.statusIdle },
  { id: "dnd", label: "Do not disturb", dotColor: colors.statusDnd, hint: "Mutes notifications" },
  { id: "invisible", label: "Invisible", dotColor: colors.statusOffline, hint: "Appear offline" },
];

export function MobileProfileStatusView() {
  const theme = useAppTheme();
  const router = useRouter();
  const { user, setStatus, updateUser, logout } = useAuthStore();
  const [avatarError, setAvatarError] = useState(false);
  const [customStatus, setCustomStatus] = useState(user?.bio || "");
  const [noiseLevel, setNoiseLevel] = useState<"off" | "standard" | "high">("standard");

  const avatarUrl = formatAvatarUrl(user?.avatar);
  const currentPresence = user?.status || "online";

  const handleSelectPresence = (presence: User["status"]) => {
    NativeHaptics.light();
    setStatus(presence);
  };

  const handleSaveCustomStatus = () => {
    updateUser({ bio: customStatus.trim() || null });
  };

  const handleSignOut = async () => {
    NativeHaptics.medium();
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── SINGLE CLEAR PROFILE IDENTITY HEADER ─── */}
      <View style={styles.headerCard}>
        <LinearGradient
          colors={["rgba(255, 255, 255, 0.06)", "rgba(255, 255, 255, 0.01)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.headerRow}>
          {/* Avatar with working URL resolution & error fallback */}
          <View style={styles.avatarContainer}>
            {avatarUrl && !avatarError ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImg}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>
                  {(user?.displayName || user?.username || "U").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.presenceBadge,
                {
                  backgroundColor:
                    currentPresence === "online"
                      ? colors.statusOnline
                      : currentPresence === "idle"
                      ? colors.statusIdle
                      : currentPresence === "dnd"
                      ? colors.statusDnd
                      : colors.statusOffline,
                },
              ]}
            />
          </View>

          {/* User Details */}
          <View style={styles.userMeta}>
            <Text style={styles.displayName} numberOfLines={1}>
              {user?.displayName || "AIIC Member"}
            </Text>
            <View style={styles.usernameRow}>
              <Text style={styles.usernameText}>@{user?.username || "member"}</Text>
              <View style={[styles.rolePill, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentBorder }]}>
                <Shield size={10} color={theme.colors.accent} />
                <Text style={[styles.rolePillText, { color: theme.colors.accent }]}>
                  {(user?.role || "MEMBER").replace(/_/g, " ").toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Edit Button */}
          <Pressable
            onPress={() => router.push("/(app)/profile/settings" as any)}
            style={styles.headerEditBtn}
            hitSlop={8}
          >
            <Edit3 size={14} color={theme.colors.accent} />
          </Pressable>
        </View>
      </View>

      {/* ─── STATUS PRESENCE ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>STATUS PRESENCE</Text>
        <View style={styles.presenceList}>
          {PRESENCE_OPTIONS.map((item) => {
            const isActive = currentPresence === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => handleSelectPresence(item.id)}
                style={({ pressed }) => [
                  styles.presenceOption,
                  isActive && [styles.presenceOptionActive, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentBorder }],
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={[styles.presenceDot, { backgroundColor: item.dotColor }]} />
                <View style={styles.presenceTextWrap}>
                  <Text style={[styles.presenceLabel, isActive && [styles.presenceLabelActive, { color: theme.colors.accent }]]}>
                    {item.label}
                  </Text>
                  {item.hint ? (
                    <Text style={styles.presenceHint}>{item.hint}</Text>
                  ) : null}
                </View>
                {isActive && <Check size={14} color={theme.colors.accent} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ─── CUSTOM STATUS ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CUSTOM STATUS</Text>
        <View style={styles.customStatusCard}>
          <TextInput
            placeholder="What's happening?"
            placeholderTextColor={colors.textMuted}
            value={customStatus}
            onChangeText={setCustomStatus}
            onEndEditing={handleSaveCustomStatus}
            style={styles.customStatusInput}
          />
          {customStatus.length > 0 && (
            <Pressable
              onPress={() => {
                setCustomStatus("");
                updateUser({ bio: null });
              }}
              hitSlop={8}
            >
              <X size={13} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* ─── NOISE SUPPRESSION (VISUALLY SECONDARY) ─── */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <AudioLines size={12} color={theme.colors.accent} />
          <Text style={styles.sectionTitle}>NOISE SUPPRESSION</Text>
        </View>
        <View style={styles.noiseRow}>
          {(["off", "standard", "high"] as const).map((level) => {
            const isActive = noiseLevel === level;
            return (
              <Pressable
                key={level}
                onPress={() => {
                  NativeHaptics.light();
                  setNoiseLevel(level);
                }}
                style={[styles.noisePill, isActive && [styles.noisePillActive, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentBorder }]]}
              >
                <Text style={[styles.noisePillText, isActive && [styles.noisePillTextActive, { color: theme.colors.accent }]]}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ─── ACADEMIC & SQUAD INFO (IF PRESENT) ─── */}
      {(user?.classYear || user?.section) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACADEMIC AFFILIATION</Text>
          <View style={styles.affilRow}>
            {user.classYear && (
              <View style={styles.affilPill}>
                <Text style={styles.affilText}>Class of {user.classYear}</Text>
              </View>
            )}
            {user.section && (
              <View style={styles.affilPill}>
                <Text style={styles.affilText}>Squad: {user.section}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ─── SKILLS & TOPICS ─── */}
      {user?.skills && user.skills.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SKILLS & EXPERTISE</Text>
          <View style={styles.chipWrap}>
            {user.skills.map((s, idx) => (
              <View key={idx} style={styles.skillChip}>
                <Text style={styles.skillText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ─── ACCOUNT ACTIONS ─── */}
      <View style={styles.actionSection}>
        <Pressable
          onPress={() => router.push("/(app)/profile/settings" as any)}
          style={styles.settingsBtn}
        >
          <Settings size={15} color={colors.textPrimary} />
          <Text style={styles.settingsBtnText}>Edit Profile & Settings</Text>
        </Pressable>

        <Pressable onPress={handleSignOut} style={styles.logoutBtn}>
          <LogOut size={15} color={colors.danger} />
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
    gap: 12,
  },

  // Single Header Card
  headerCard: {
    borderRadius: radius.md,
    backgroundColor: "rgba(18, 22, 34, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 12,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(232, 163, 61, 0.3)",
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.accent,
  },
  presenceBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 2,
    borderColor: "#0E111B",
  },
  userMeta: {
    flex: 1,
    minWidth: 0,
  },
  displayName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  usernameText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: "rgba(232, 163, 61, 0.1)",
    borderWidth: 0.5,
    borderColor: "rgba(232, 163, 61, 0.2)",
  },
  rolePillText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 0.4,
  },
  headerEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Sections
  section: {
    gap: 6,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.8,
  },

  // Presence Options
  presenceList: {
    gap: 4,
  },
  presenceOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    gap: 10,
  },
  presenceOptionActive: {
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    borderColor: "rgba(232, 163, 61, 0.3)",
  },
  presenceDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  presenceTextWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  presenceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  presenceLabelActive: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  presenceHint: {
    fontSize: 10.5,
    color: colors.textMuted,
  },

  // Custom Status
  customStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 10,
    height: 38,
  },
  customStatusInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 12.5,
    padding: 0,
  },

  // Noise Suppression
  noiseRow: {
    flexDirection: "row",
    gap: 6,
  },
  noisePill: {
    flex: 1,
    height: 30,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  noisePillActive: {
    backgroundColor: "rgba(232, 163, 61, 0.15)",
    borderColor: "rgba(232, 163, 61, 0.35)",
  },
  noisePillText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
  },
  noisePillTextActive: {
    color: colors.accent,
    fontWeight: "700",
  },

  // Affiliation & Chips
  affilRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  affilPill: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  affilText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
  },
  chipWrap: {
    flexDirection: "row",
    gap: 5,
    flexWrap: "wrap",
  },
  skillChip: {
    backgroundColor: "rgba(45, 212, 191, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.2)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  skillText: {
    color: colors.accentTeal,
    fontSize: 10.5,
    fontWeight: "600",
  },

  // Account Actions
  actionSection: {
    gap: 6,
    marginTop: 6,
  },
  settingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  settingsBtnText: {
    color: colors.textPrimary,
    fontSize: 12.5,
    fontWeight: "600",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255, 77, 79, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 77, 79, 0.2)",
  },
  logoutBtnText: {
    color: colors.danger,
    fontSize: 12.5,
    fontWeight: "600",
  },
});

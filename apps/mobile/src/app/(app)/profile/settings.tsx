import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  User,
  Shield,
  Bell,
  Sliders,
  LogOut,
  Sparkles,
  Key,
  Globe,
  Github,
  Linkedin,
  Save,
  Check,
} from "lucide-react-native";
import { colors } from "@/theme/tokens";
import { useAuthStore } from "@/stores/auth-store";
import { useThemeStore, THEME_PRESETS } from "@/stores/theme-store";
import { ThemeCustomizerModal } from "@/components/theme/ThemeCustomizerModal";
import { fetchCurrentProfile, updateProfile } from "@/lib/api";
import { notificationService } from "@/lib/notifications";

export type SettingsTab =
  | "profile"
  | "privacy"
  | "notifications"
  | "appearance"
  | "advanced";

export default function UserSettingsScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [themeStudioOpen, setThemeStudioOpen] = useState(false);

  const {
    presetId,
    wallpaperMode,
    gradientColors,
    gradientDirection,
    accentColor: themeAccent,
  } = useThemeStore();

  const activePreset = THEME_PRESETS.find((p) => p.id === presetId);

  // Profile Form States
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [classYear, setClassYear] = useState(user?.classYear || "");
  const [section, setSection] = useState(user?.section || "");
  const [githubUrl, setGithubUrl] = useState(user?.githubUrl || "");
  const [websiteUrl, setWebsiteUrl] = useState(user?.websiteUrl || "");
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedinUrl || "");
  const [skillsStr, setSkillsStr] = useState((user?.skills || []).join(", "));
  const [interestsStr, setInterestsStr] = useState((user?.interests || []).join(", "));

  // Preference Toggles
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [directMessagesFromAll, setDirectMessagesFromAll] = useState(true);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCurrentProfile()
      .then((res) => {
        if (res?.user) {
          updateUser(res.user);
          setDisplayName(res.user.displayName || "");
          setUsername(res.user.username || "");
          setBio(res.user.bio || "");
          setClassYear(res.user.classYear || "");
          setSection(res.user.section || "");
          setGithubUrl(res.user.githubUrl || "");
          setWebsiteUrl(res.user.websiteUrl || "");
          setLinkedinUrl(res.user.linkedinUrl || "");
          setSkillsStr((res.user.skills || []).join(", "));
          setInterestsStr((res.user.interests || []).join(", "));
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const skills = skillsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const interests = interestsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await updateProfile({
        displayName,
        username,
        bio,
        classYear,
        section,
        githubUrl,
        websiteUrl,
        linkedinUrl,
        skills,
        interests,
      });

      if (res?.user) {
        updateUser(res.user);
        Alert.alert("Success", "Account settings saved successfully.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Sign Out?", "Are you sure you want to log out of AIIC?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerSubtitle}>ACCOUNT & PREFERENCES</Text>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, saving && styles.btnDisabled]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.accentContrast} />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </Pressable>
        </View>

        {/* Horizontal Navigation Pills */}
        <View style={styles.navBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navScroll}
          >
            <NavPill
              label="Public Profile"
              active={activeTab === "profile"}
              onPress={() => setActiveTab("profile")}
            />
            <NavPill
              label="Privacy"
              active={activeTab === "privacy"}
              onPress={() => setActiveTab("privacy")}
            />
            <NavPill
              label="Notifications"
              active={activeTab === "notifications"}
              onPress={() => setActiveTab("notifications")}
            />
            <NavPill
              label="Appearance"
              active={activeTab === "appearance"}
              onPress={() => setActiveTab("appearance")}
            />
            <NavPill
              label="Advanced"
              active={activeTab === "advanced"}
              onPress={() => setActiveTab("advanced")}
            />
          </ScrollView>
        </View>

        {/* Body Content */}
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === "profile" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Public Identity</Text>
              <Text style={styles.sectionSubtitle}>
                Information visible to AIIC club members, mentors, and space collaborators.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>DISPLAY NAME</Text>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Your full name"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>USERNAME</Text>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="handle"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>BIOGRAPHY</Text>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell the community about what you are building..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                />
              </View>

              <View style={styles.rowTwoCols}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CLASS YEAR</Text>
                  <TextInput
                    value={classYear}
                    onChangeText={setClassYear}
                    placeholder="e.g. 2026"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>SECTION / SQUAD</Text>
                  <TextInput
                    value={section}
                    onChangeText={setSection}
                    placeholder="e.g. Core AI"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Social & Code Links</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>GITHUB PROFILE</Text>
                <TextInput
                  value={githubUrl}
                  onChangeText={setGithubUrl}
                  placeholder="https://github.com/..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PORTFOLIO / WEBSITE</Text>
                <TextInput
                  value={websiteUrl}
                  onChangeText={setWebsiteUrl}
                  placeholder="https://..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>LINKEDIN PROFILE</Text>
                <TextInput
                  value={linkedinUrl}
                  onChangeText={setLinkedinUrl}
                  placeholder="https://linkedin.com/in/..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Skills & Interests</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>SKILLS (COMMA SEPARATED)</Text>
                <TextInput
                  value={skillsStr}
                  onChangeText={setSkillsStr}
                  placeholder="PyTorch, TypeScript, Next.js, Rust"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>INTERESTS (COMMA SEPARATED)</Text>
                <TextInput
                  value={interestsStr}
                  onChangeText={setInterestsStr}
                  placeholder="Agentic Systems, LLM Eval, Robotics"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>
            </View>
          )}

          {activeTab === "privacy" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Privacy & Direct Messages</Text>
              <Text style={styles.sectionSubtitle}>
                Manage who can connect and initiate direct communications with you.
              </Text>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Allow Direct Messages</Text>
                  <Text style={styles.toggleDesc}>
                    Receive message requests from members across all joined Spaces.
                  </Text>
                </View>
                <Switch
                  value={directMessagesFromAll}
                  onValueChange={setDirectMessagesFromAll}
                  thumbColor={directMessagesFromAll ? colors.accent : colors.textMuted}
                  trackColor={{ false: "rgba(255,255,255,0.1)", true: "rgba(232,163,61,0.3)" }}
                />
              </View>
            </View>
          )}

          {activeTab === "notifications" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Push & Channel Alerts</Text>
              <Text style={styles.sectionSubtitle}>
                Realtime notification streams for channel mentions, incident alerts, and PR reviews.
              </Text>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>In-App & Push Notifications</Text>
                  <Text style={styles.toggleDesc}>
                    Receive native push alerts and banners for incoming calls, mentions, and urgent incidents.
                  </Text>
                </View>
                <Switch
                  value={pushNotifs}
                  onValueChange={async (val) => {
                    setPushNotifs(val);
                    if (val) {
                      const granted = await notificationService.requestPermissions();
                      if (!granted) {
                        Alert.alert("Permission Required", "Please enable notification permissions in your device settings to receive real-time push alerts.");
                      }
                    }
                  }}
                  thumbColor={pushNotifs ? colors.accent : colors.textMuted}
                  trackColor={{ false: "rgba(255,255,255,0.1)", true: "rgba(232,163,61,0.3)" }}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Haptic Feedback</Text>
                  <Text style={styles.toggleDesc}>
                    Vibrate on reactions, messages, and canvas tool selections.
                  </Text>
                </View>
                <Switch
                  value={hapticFeedback}
                  onValueChange={setHapticFeedback}
                  thumbColor={hapticFeedback ? colors.accent : colors.textMuted}
                  trackColor={{ false: "rgba(255,255,255,0.1)", true: "rgba(232,163,61,0.3)" }}
                />
              </View>
            </View>
          )}

          {activeTab === "appearance" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Appearance & Wallpaper Studio</Text>
              <Text style={styles.sectionSubtitle}>
                Customize background gradients, wallpaper images, and vibrant icon colors across Corvus Mobile.
              </Text>

              {/* Theme Studio Launcher Card */}
              <Pressable
                onPress={() => setThemeStudioOpen(true)}
                style={[
                  styles.cardBox,
                  {
                    borderColor: `${themeAccent}40`,
                    backgroundColor: `${themeAccent}12`,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  },
                ]}
              >
                <View style={{ gap: 4 }}>
                  <Text style={[styles.cardBoxLabel, { color: themeAccent }]}>ACTIVE THEME</Text>
                  <Text style={[styles.cardBoxValue, { color: "#FFFFFF", fontWeight: "800" }]}>
                    {activePreset?.name || "Custom Wallpaper Theme"}
                  </Text>
                  <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
                    Icon Color: {themeAccent}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: themeAccent,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: "#000", fontWeight: "800", fontSize: 12 }}>Customize</Text>
                </View>
              </Pressable>

              <View style={styles.cardBox}>
                <Text style={styles.cardBoxLabel}>GRADIENT STOPS</Text>
                <Text style={styles.cardBoxValue}>
                  {gradientColors.join("  →  ")}
                </Text>
              </View>

              <View style={styles.cardBox}>
                <Text style={styles.cardBoxLabel}>WALLPAPER MODE</Text>
                <Text style={styles.cardBoxValue}>
                  {wallpaperMode.toUpperCase()} ({gradientDirection.toUpperCase()})
                </Text>
              </View>
            </View>
          )}

          {activeTab === "advanced" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Developer & System Telemetry</Text>
              <Text style={styles.sectionSubtitle}>
                Runtime client parameters and native connection status.
              </Text>

              <View style={styles.cardBox}>
                <Text style={styles.cardBoxLabel}>APP VERSION</Text>
                <Text style={styles.cardBoxValue}>AIIC Mobile 1.0.0 (Build 2026)</Text>
              </View>

              <View style={styles.cardBox}>
                <Text style={styles.cardBoxLabel}>BACKEND ENDPOINT</Text>
                <Text style={styles.cardBoxValue}>https://aiic-api.vercel.app</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Theme & Wallpaper Customization Studio Modal */}
      <ThemeCustomizerModal
        visible={themeStudioOpen}
        onClose={() => setThemeStudioOpen(false)}
      />
    </SafeAreaView>
  );
}

function NavPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.navPill, active && styles.navPillActive]}
    >
      <Text style={[styles.navPillText, active && styles.navPillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSubtitle: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: "800",
    fontFamily: "monospace",
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  saveBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: colors.accentContrast,
    fontSize: 13,
    fontWeight: "700",
  },
  navBar: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  navScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  navPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  navPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  navPillText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  navPillTextActive: {
    color: colors.accentContrast,
    fontWeight: "700",
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "monospace",
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
  },
  rowTwoCols: {
    flexDirection: "row",
    gap: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 12,
  },
  cardBox: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  cardBoxLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  cardBoxValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
  },
  logoutBtnText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    gap: 12,
  },
  toggleTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  toggleDesc: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
});

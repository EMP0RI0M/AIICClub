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
import { fetchCurrentProfile, updateProfile } from "@/lib/api";

export type SettingsTab =
  | "account"
  | "profile"
  | "privacy"
  | "notifications"
  | "appearance"
  | "advanced";

export default function UserSettingsScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

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
              label="My Account"
              active={activeTab === "account"}
              onPress={() => setActiveTab("account")}
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

          {activeTab === "account" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Credentials</Text>
              <Text style={styles.sectionSubtitle}>
                Authentication details and active session management.
              </Text>

              <View style={styles.cardBox}>
                <Text style={styles.cardBoxLabel}>EMAIL ADDRESS</Text>
                <Text style={styles.cardBoxValue}>{user?.email || "internal@aiic.club"}</Text>
              </View>

              <View style={styles.cardBox}>
                <Text style={styles.cardBoxLabel}>ACCOUNT ROLE</Text>
                <Text style={styles.cardBoxValue}>{(user?.role || "MEMBER").toUpperCase()}</Text>
              </View>

              <Pressable onPress={handleLogout} style={styles.logoutBtn}>
                <LogOut size={16} color={colors.danger} />
                <Text style={styles.logoutBtnText}>Sign Out of AIIC</Text>
              </Pressable>
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
                    Receive alerts when mentioned or when an incident response begins.
                  </Text>
                </View>
                <Switch
                  value={pushNotifs}
                  onValueChange={setPushNotifs}
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
              <Text style={styles.sectionTitle}>Appearance & Theme</Text>
              <Text style={styles.sectionSubtitle}>
                AIIC Dark Glassmorphism is enabled across all platforms for optimal contrast.
              </Text>

              <View style={styles.cardBox}>
                <Text style={styles.cardBoxLabel}>CURRENT THEME</Text>
                <Text style={styles.cardBoxValue}>AIIC Obsidian Gold (Dark OLED)</Text>
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
                <Text style={styles.cardBoxValue}>https://aiic-bbs.vercel.app/api</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
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
    backgroundColor: "#090C12",
  },
  container: {
    flex: 1,
    backgroundColor: "#090C12",
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

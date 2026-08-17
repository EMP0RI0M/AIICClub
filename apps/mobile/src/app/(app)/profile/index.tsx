import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "../../../theme/tokens";
import { GlassCard } from "../../../components/ui/GlassCard";
import { Avatar } from "../../../components/ui/Avatar";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { useAuthStore } from "../../../stores/auth-store";
import { fetchCurrentProfile, updateProfile } from "../../../lib/api";
import {
  User as UserIcon,
  Shield,
  Bell,
  Award,
  Archive,
  LogOut,
  ChevronRight,
  Sparkles,
  Save,
  Github,
  Globe,
  Linkedin,
} from "lucide-react-native";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, setStatus, updateUser } = useAuthStore();

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

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

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
      .catch((err) => console.warn("Failed to load profile:", err));
  }, []);

  const handleSaveProfile = async () => {
    setIsSaving(true);
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
        setIsEditing(false);
        Alert.alert("Success", "Profile updated successfully.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card Header */}
        <GlassCard elevated style={styles.profileCard}>
          <View style={styles.profileTop}>
            <Avatar
              name={user?.displayName || "Member"}
              presence={user?.status === "invisible" ? "offline" : (user?.status || "online")}
              size={64}
            />
            <View style={styles.profileMeta}>
              <Text style={styles.displayName}>
                {user?.displayName || "AIIC Member"}
              </Text>
              <Text style={styles.username}>
                @{user?.username || "member"}
              </Text>
              <View style={styles.rolesRow}>
                <Badge label={user?.role || "Member"} variant="teal" />
                <Badge label="AIIC Verified" variant="primary" />
              </View>
            </View>
          </View>

          {/* Quick Presence Status Selector */}
          <View style={styles.presenceSelector}>
            {(["online", "idle", "dnd", "offline"] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.presenceBtn,
                  user?.status === s && styles.presenceBtnActive,
                ]}
                onPress={() => setStatus(s)}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        s === "online"
                          ? colors.statusOnline
                          : s === "idle"
                          ? colors.statusIdle
                          : s === "dnd"
                          ? colors.statusDnd
                          : colors.statusOffline,
                    },
                  ]}
                />
                <Text style={styles.presenceText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        {/* Profile Editing Form */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>PROFILE INFORMATION</Text>
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
            <Text style={styles.editToggleText}>{isEditing ? "Cancel" : "Edit"}</Text>
          </TouchableOpacity>
        </View>

        <GlassCard style={styles.formCard}>
          <Text style={styles.inputLabel}>Display Name</Text>
          <TextInput
            style={[styles.inputField, !isEditing && styles.inputDisabled]}
            value={displayName}
            onChangeText={setDisplayName}
            editable={isEditing}
            placeholder="Your full name"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.inputLabel}>Username</Text>
          <TextInput
            style={[styles.inputField, !isEditing && styles.inputDisabled]}
            value={username}
            onChangeText={setUsername}
            editable={isEditing}
            autoCapitalize="none"
            placeholder="username"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.inputLabel}>Bio</Text>
          <TextInput
            style={[styles.inputField, styles.bioInput, !isEditing && styles.inputDisabled]}
            value={bio}
            onChangeText={setBio}
            editable={isEditing}
            multiline
            placeholder="Tell us about your research, interests, or projects..."
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Class Year</Text>
              <TextInput
                style={[styles.inputField, !isEditing && styles.inputDisabled]}
                value={classYear}
                onChangeText={setClassYear}
                editable={isEditing}
                placeholder="2026"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Section</Text>
              <TextInput
                style={[styles.inputField, !isEditing && styles.inputDisabled]}
                value={section}
                onChangeText={setSection}
                editable={isEditing}
                placeholder="A / B / C"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Skills (comma separated)</Text>
          <TextInput
            style={[styles.inputField, !isEditing && styles.inputDisabled]}
            value={skillsStr}
            onChangeText={setSkillsStr}
            editable={isEditing}
            placeholder="PyTorch, Triton, Rust, C++"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.inputLabel}>GitHub Profile URL</Text>
          <TextInput
            style={[styles.inputField, !isEditing && styles.inputDisabled]}
            value={githubUrl}
            onChangeText={setGithubUrl}
            editable={isEditing}
            autoCapitalize="none"
            placeholder="https://github.com/username"
            placeholderTextColor={colors.textMuted}
          />

          {isEditing && (
            <Button
              title={isSaving ? "Saving..." : "Save Profile Changes"}
              size="md"
              icon={<Save size={16} color={colors.accentContrast} />}
              onPress={handleSaveProfile}
              disabled={isSaving}
              style={{ marginTop: 12 }}
            />
          )}
        </GlassCard>

        {/* Club Sections Navigation */}
        <Text style={styles.sectionHeader}>CLUB SECTIONS & DIRECTORY</Text>
        <GlassCard style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(app)/people")}
          >
            <View style={styles.menuItemLeft}>
              <UserIcon size={18} color={colors.accent} />
              <Text style={styles.menuItemText}>Member Directory & Leadership</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(app)/achievements")}
          >
            <View style={styles.menuItemLeft}>
              <Award size={18} color={colors.accentTeal} />
              <Text style={styles.menuItemText}>Club Achievements & Awards</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(app)/archive")}
          >
            <View style={styles.menuItemLeft}>
              <Archive size={18} color={colors.warning} />
              <Text style={styles.menuItemText}>Historical Archive & Repos</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={() => router.push("/(app)/notices")}
          >
            <View style={styles.menuItemLeft}>
              <Bell size={18} color={colors.live} />
              <Text style={styles.menuItemText}>Notice Board & Announcements</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </GlassCard>

        {/* Preferences */}
        <Text style={styles.sectionHeader}>APP PREFERENCES</Text>
        <GlassCard style={styles.menuCard}>
          <View style={styles.toggleRow}>
            <View style={styles.menuItemLeft}>
              <Bell size={18} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Push Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.surfaceInput, true: colors.accent }}
              thumbColor={colors.textPrimary}
            />
          </View>

          <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
            <View style={styles.menuItemLeft}>
              <Sparkles size={18} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Haptic Feedback</Text>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
              trackColor={{ false: colors.surfaceInput, true: colors.accent }}
              thumbColor={colors.textPrimary}
            />
          </View>
        </GlassCard>

        {/* Administration */}
        <Text style={styles.sectionHeader}>ADMINISTRATION</Text>
        <GlassCard style={styles.menuCard}>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={() => router.push("/(admin)")}
          >
            <View style={styles.menuItemLeft}>
              <Shield size={18} color={colors.accentTeal} />
              <Text style={styles.menuItemText}>Club Governance & Admin</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </GlassCard>

        {/* Logout */}
        <Button
          title="Sign Out"
          variant="danger"
          size="lg"
          icon={<LogOut size={18} color="#FFFFFF" />}
          onPress={handleLogout}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    padding: 16,
    marginBottom: 20,
  },
  profileTop: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  profileMeta: {
    flex: 1,
  },
  displayName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  username: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 6,
  },
  rolesRow: {
    flexDirection: "row",
    gap: 6,
  },
  presenceSelector: {
    flexDirection: "row",
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  presenceBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: radius.sm,
    gap: 4,
  },
  presenceBtnActive: {
    backgroundColor: colors.surfaceRaised,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  presenceText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  editToggleText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  formCard: {
    padding: 16,
    gap: 8,
    marginBottom: 16,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  inputField: {
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputDisabled: {
    opacity: 0.8,
    borderColor: "transparent",
  },
  bioInput: {
    minHeight: 60,
  },
  rowInputs: {
    flexDirection: "row",
    gap: 12,
  },
  menuCard: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuItemText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "500",
  },
});

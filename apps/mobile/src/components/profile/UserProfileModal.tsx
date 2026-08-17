import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Image,
  Linking,
} from "react-native";
import {
  X,
  Shield,
  MessageSquare,
  Phone,
  Video,
  Github,
  Linkedin,
  Globe,
  Sparkles,
  BookOpen,
} from "lucide-react-native";
import { colors } from "@/theme/tokens";

export interface UserProfileData {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  avatar?: string | null;
  status?: "online" | "idle" | "dnd" | "invisible" | "offline";
  role?: string;
  roleName?: string;
  bio?: string | null;
  classYear?: string | null;
  section?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  websiteUrl?: string | null;
  skills?: string[];
  interests?: string[];
  email?: string | null;
}

export function UserProfileModal({
  visible,
  onClose,
  user,
  onMessage,
  onCall,
}: {
  visible: boolean;
  onClose: () => void;
  user: UserProfileData | null;
  onMessage?: () => void;
  onCall?: (video: boolean) => void;
}) {
  if (!user) return null;

  const avatar = user.avatarUrl || user.avatar;
  const roleKey = (user.role || "member").toLowerCase();
  const roleDisplay =
    user.roleName ||
    roleKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const handleOpenUrl = (url?: string | null) => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "online": return colors.statusOnline;
      case "idle": return colors.statusIdle;
      case "dnd": return colors.statusDnd;
      default: return colors.statusOffline;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          {/* Header Bar */}
          <View style={styles.sheetHeader}>
            <View style={styles.dragPill} />
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile Banner & Identity Header */}
            <View style={styles.identityCard}>
              <View style={styles.avatarWrap}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarLetter}>
                      {(user.displayName || user.username || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(user.status) },
                  ]}
                />
              </View>

              <Text style={styles.displayName}>{user.displayName || "AIIC Member"}</Text>
              <Text style={styles.username}>@{user.username || "member"}</Text>

              {/* Authoritative Role Badge */}
              <View style={styles.roleBadge}>
                <Shield size={12} color={colors.accent} />
                <Text style={styles.roleBadgeText}>{roleDisplay.toUpperCase()}</Text>
              </View>

              {/* Action Buttons: Message, Voice, Video */}
              <View style={styles.actionRow}>
                {onMessage && (
                  <Pressable onPress={onMessage} style={styles.actionBtnPrimary}>
                    <MessageSquare size={16} color={colors.accentContrast} />
                    <Text style={styles.actionBtnPrimaryText}>Message</Text>
                  </Pressable>
                )}
                {onCall && (
                  <Pressable
                    onPress={() => onCall(false)}
                    style={styles.actionBtnSecondary}
                  >
                    <Phone size={16} color={colors.textPrimary} />
                  </Pressable>
                )}
                {onCall && (
                  <Pressable
                    onPress={() => onCall(true)}
                    style={styles.actionBtnSecondary}
                  >
                    <Video size={16} color={colors.textPrimary} />
                  </Pressable>
                )}
              </View>
            </View>

            {/* About / Bio Section */}
            {user.bio ? (
              <View style={styles.sectionBox}>
                <Text style={styles.sectionLabel}>ABOUT</Text>
                <Text style={styles.bioText}>{user.bio}</Text>
              </View>
            ) : null}

            {/* Academic Information */}
            {(user.classYear || user.section) ? (
              <View style={styles.sectionBox}>
                <Text style={styles.sectionLabel}>ACADEMIC AFFILIATION</Text>
                <View style={styles.academicRow}>
                  {user.classYear && (
                    <View style={styles.academicPill}>
                      <BookOpen size={13} color={colors.accentTeal} />
                      <Text style={styles.academicText}>Class of {user.classYear}</Text>
                    </View>
                  )}
                  {user.section && (
                    <View style={styles.academicPill}>
                      <Sparkles size={13} color={colors.accent} />
                      <Text style={styles.academicText}>Squad: {user.section}</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : null}

            {/* Skills */}
            {user.skills && user.skills.length > 0 ? (
              <View style={styles.sectionBox}>
                <Text style={styles.sectionLabel}>SKILLS & EXPERTISE</Text>
                <View style={styles.tagWrap}>
                  {user.skills.map((skill, idx) => (
                    <View key={idx} style={styles.skillChip}>
                      <Text style={styles.skillText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Interests */}
            {user.interests && user.interests.length > 0 ? (
              <View style={styles.sectionBox}>
                <Text style={styles.sectionLabel}>RESEARCH & TOPIC INTERESTS</Text>
                <View style={styles.tagWrap}>
                  {user.interests.map((interest, idx) => (
                    <View key={idx} style={styles.interestChip}>
                      <Text style={styles.interestText}>#{interest}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Social & Code Links */}
            {(user.githubUrl || user.linkedinUrl || user.websiteUrl) ? (
              <View style={styles.sectionBox}>
                <Text style={styles.sectionLabel}>LINKS & PROFILES</Text>
                <View style={{ gap: 8 }}>
                  {user.githubUrl && (
                    <Pressable
                      onPress={() => handleOpenUrl(user.githubUrl)}
                      style={styles.linkRow}
                    >
                      <Github size={15} color={colors.accentTeal} />
                      <Text style={styles.linkText} numberOfLines={1}>
                        {user.githubUrl.replace("https://github.com/", "@")}
                      </Text>
                    </Pressable>
                  )}
                  {user.linkedinUrl && (
                    <Pressable
                      onPress={() => handleOpenUrl(user.linkedinUrl)}
                      style={styles.linkRow}
                    >
                      <Linkedin size={15} color="#0A66C2" />
                      <Text style={styles.linkText} numberOfLines={1}>
                        LinkedIn Profile
                      </Text>
                    </Pressable>
                  )}
                  {user.websiteUrl && (
                    <Pressable
                      onPress={() => handleOpenUrl(user.websiteUrl)}
                      style={styles.linkRow}
                    >
                      <Globe size={15} color={colors.accent} />
                      <Text style={styles.linkText} numberOfLines={1}>
                        {user.websiteUrl}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    height: "82%",
    backgroundColor: "#0D0F17",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingTop: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    marginLeft: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 14,
  },
  identityCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 12,
  },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(232, 163, 61, 0.15)",
    borderWidth: 2,
    borderColor: "rgba(232, 163, 61, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: colors.accent,
    fontSize: 32,
    fontWeight: "800",
  },
  statusDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: "#0D0F17",
  },
  displayName: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  username: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: "monospace",
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.25)",
    marginTop: 10,
  },
  roleBadgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    width: "100%",
    justifyContent: "center",
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnPrimaryText: {
    color: colors.accentContrast,
    fontSize: 13,
    fontWeight: "700",
  },
  actionBtnSecondary: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionBox: {
    backgroundColor: "rgba(255, 255, 255, 0.025)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    gap: 8,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "monospace",
    letterSpacing: 0.8,
  },
  bioText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  academicRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  academicPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  academicText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  skillChip: {
    backgroundColor: "rgba(45, 212, 191, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  skillText: {
    color: colors.accentTeal,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  interestChip: {
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  interestText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  linkText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: "monospace",
  },
});
